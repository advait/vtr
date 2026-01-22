import { execFile, spawn } from "node:child_process";
import { existsSync, promises as fsPromises } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..");
const tmpDir = process.env.TMPDIR ?? "/tmp";
const socketPath = path.join(tmpDir, `vtr-playwright-${process.pid}.sock`);
const vtrBinary = path.join(tmpDir, `vtr-playwright-${process.pid}`);
const port = 18080 + (process.pid % 1000);
const grpcPort = 17080 + (process.pid % 1000);
const baseURL = `http://127.0.0.1:${port}`;
const sessionName = "web-smoke";
const bootTimeoutMs = Number.parseInt(process.env.E2E_BOOT_TIMEOUT_MS ?? "10000", 10);
const outputTimeoutMs = Number.parseInt(process.env.E2E_OUTPUT_TIMEOUT_MS ?? "3000", 10);
const skipWebBuild = process.env.E2E_SKIP_WEB_BUILD === "1";

type ManagedProcess = ReturnType<typeof spawn>;

let hubProc: ManagedProcess | null = null;

async function runCommand(cmd: string, args: string[], cwd: string) {
  await execFileAsync(cmd, args, { cwd, env: process.env, maxBuffer: 1024 * 1024 });
}

function startProcess(cmd: string, args: string[], cwd: string) {
  return spawn(cmd, args, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForFile(filePath: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(filePath)) {
      return;
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

async function waitForHttp(url: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        return;
      }
    } catch {
      // ignore until timeout
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function stopProcess(proc: ManagedProcess | null) {
  if (!proc) {
    return;
  }
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
    }, 5_000);
    proc.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    proc.kill("SIGTERM");
  });
}

async function sendCommand(command: string) {
  await runCommand(
    vtrBinary,
    ["agent", "resize", "--hub", socketPath, sessionName, "120", "40"],
    repoRoot,
  );
  await runCommand(vtrBinary, ["agent", "send", "--hub", socketPath, sessionName, command], repoRoot);
  await runCommand(vtrBinary, ["agent", "key", "--hub", socketPath, sessionName, "enter"], repoRoot);
}

async function waitForOutput(pattern: string) {
  await runCommand(
    vtrBinary,
    ["agent", "wait", "--hub", socketPath, "--timeout", `${outputTimeoutMs}ms`, sessionName, pattern],
    repoRoot,
  );
}

test.beforeAll(async () => {
  if (existsSync(socketPath)) {
    await fsPromises.unlink(socketPath);
  }
  if (!skipWebBuild) {
    await runCommand("bun", ["install"], path.join(repoRoot, "web"));
    await runCommand("bun", ["run", "build"], path.join(repoRoot, "web"));
  }
  await runCommand("go", ["build", "-o", vtrBinary, "./cmd/vtr"], repoRoot);
  hubProc = startProcess(
    vtrBinary,
    [
      "hub",
      "--socket",
      socketPath,
      "--grpc-addr",
      `127.0.0.1:${grpcPort}`,
      "--web-addr",
      `127.0.0.1:${port}`,
    ],
    repoRoot,
  );
  await waitForFile(socketPath, bootTimeoutMs);
  await waitForHttp(baseURL, bootTimeoutMs);
  await runCommand(
    vtrBinary,
    [
      "agent",
      "spawn",
      "--hub",
      socketPath,
      "--cols",
      "120",
      "--rows",
      "40",
      "--cmd",
      "bash --noprofile --norc",
      sessionName,
    ],
    repoRoot,
  );
});

test.afterAll(async () => {
  await stopProcess(hubProc);
  if (existsSync(socketPath)) {
    await fsPromises.unlink(socketPath);
  }
  if (existsSync(vtrBinary)) {
    await fsPromises.unlink(vtrBinary);
  }
});

test("streams ANSI output, attributes, and recovers after offline", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 720 });
  await page.goto(baseURL);

  await page.getByRole("button", { name: new RegExp(sessionName) }).first().click();
  await expect(page.locator("header").getByText("live", { exact: true })).toBeVisible();
  await runCommand(
    vtrBinary,
    ["agent", "resize", "--hub", socketPath, sessionName, "120", "40"],
    repoRoot,
  );

  await sendCommand('echo "hello from vtr"');
  await waitForOutput("hello from vtr");
  await expect(page.locator(".terminal-grid")).toContainText("hello from vtr");

  await sendCommand("printf '\\x1b[38;2;255;0;0mRED\\x1b[0m normal\\n'");
  await waitForOutput("RED");
  const redRun = page.locator(".terminal-run").filter({ hasText: /^RED$/ });
  await expect(redRun).toHaveCount(1);
  const redStyle = await redRun.first().evaluate((node) => getComputedStyle(node).color);
  expect(redStyle).toBe("rgb(255, 0, 0)");

  await sendCommand("printf '\\x1b[48;2;10;20;30mBG\\x1b[0m\\n'");
  await waitForOutput("BG");
  const bgRun = page.locator(".terminal-run").filter({ hasText: /^BG$/ });
  const bgStyle = await bgRun.first().evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(bgStyle).toBe("rgb(10, 20, 30)");

  await sendCommand(
    "printf '\\x1b[1mBOLD\\x1b[0m \\x1b[4mUNDER\\x1b[0m \\x1b[3mITALIC\\x1b[0m\\n'",
  );
  await waitForOutput("BOLD");
  const boldRun = page
    .locator(".terminal-run")
    .filter({ hasText: /^BOLD$/ })
    .first();
  const boldWeight = await boldRun.evaluate((node) => getComputedStyle(node).fontWeight);
  expect(Number.parseInt(boldWeight, 10)).toBeGreaterThanOrEqual(600);

  const underlineRun = page
    .locator(".terminal-run")
    .filter({ hasText: /^UNDER$/ })
    .first();
  const underlineStyle = await underlineRun.evaluate(
    (node) => getComputedStyle(node).textDecorationLine,
  );
  expect(underlineStyle).toContain("underline");

  const italicRun = page
    .locator(".terminal-run")
    .filter({ hasText: /^ITALIC$/ })
    .first();
  const italicStyle = await italicRun.evaluate((node) => getComputedStyle(node).fontStyle);
  expect(italicStyle).toBe("italic");

  await page.context().setOffline(true);
  await page.waitForTimeout(1000);
  await page.context().setOffline(false);
  await waitForHttp(baseURL, 20_000);
  await expect(page.locator("header").getByText("live", { exact: true })).toBeVisible();

  await sendCommand('echo "after reconnect"');
  await waitForOutput("after reconnect");
  await expect(page.locator(".terminal-grid")).toContainText("after reconnect");
});
