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
const port = 19080 + (process.pid % 1000);
const baseURL = `http://127.0.0.1:${port}`;
const sessionName = "web-shot";
const bootTimeoutMs = Number.parseInt(process.env.E2E_BOOT_TIMEOUT_MS ?? "10000", 10);
const outputTimeoutMs = Number.parseInt(process.env.E2E_OUTPUT_TIMEOUT_MS ?? "3000", 10);

type ManagedProcess = ReturnType<typeof spawn>;

let serveProc: ManagedProcess | null = null;
let webProc: ManagedProcess | null = null;

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
  await runCommand(vtrBinary, ["resize", "--socket", socketPath, sessionName, "120", "40"], repoRoot);
  await runCommand(vtrBinary, ["send", "--socket", socketPath, sessionName, command], repoRoot);
  await runCommand(vtrBinary, ["key", "--socket", socketPath, sessionName, "enter"], repoRoot);
}

async function waitForOutput(pattern: string) {
  await runCommand(
    vtrBinary,
    ["wait", "--socket", socketPath, "--timeout", `${outputTimeoutMs}ms`, sessionName, pattern],
    repoRoot,
  );
}

test.describe("web UI screenshots", () => {
  test.skip(!process.env.CAPTURE_SCREENSHOTS, "set CAPTURE_SCREENSHOTS=1 to run");

  test.beforeAll(async () => {
    if (existsSync(socketPath)) {
      await fsPromises.unlink(socketPath);
    }
    await runCommand("bun", ["install"], path.join(repoRoot, "web"));
    await runCommand("bun", ["run", "build"], path.join(repoRoot, "web"));
    await runCommand("go", ["build", "-o", vtrBinary, "./cmd/vtr"], repoRoot);
    serveProc = startProcess(vtrBinary, ["serve", "--socket", socketPath], repoRoot);
    await waitForFile(socketPath, bootTimeoutMs);
    webProc = startProcess(
      vtrBinary,
      ["web", "--socket", socketPath, "--listen", `127.0.0.1:${port}`],
      repoRoot,
    );
    await waitForHttp(baseURL, bootTimeoutMs);
    await runCommand(
      vtrBinary,
      [
        "spawn",
        "--socket",
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
    await stopProcess(webProc);
    await stopProcess(serveProc);
    if (existsSync(socketPath)) {
      await fsPromises.unlink(socketPath);
    }
    if (existsSync(vtrBinary)) {
      await fsPromises.unlink(vtrBinary);
    }
  });

  test("capture mobile and desktop screenshots", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 720 });
    await page.goto(baseURL);

    await page.getByPlaceholder("Filter coordinators or sessions").fill(sessionName);
    await page
      .locator("aside")
      .getByRole("button", { name: new RegExp(sessionName) })
      .first()
      .click();
    await expect(page.locator("header").getByText("live", { exact: true })).toBeVisible();
    await runCommand(vtrBinary, ["resize", "--socket", socketPath, sessionName, "120", "40"], repoRoot);

    await sendCommand("printf 'vtr web ui\\n'");
    await sendCommand("printf '\\x1b[31mRED\\x1b[0m \\x1b[32mGREEN\\x1b[0m\\n'");
    await waitForOutput("vtr web ui");
    await expect(page.locator(".terminal-grid")).toContainText("vtr web ui");

    const screenshotsDir = path.join(repoRoot, "docs", "screenshots");
    await fsPromises.mkdir(screenshotsDir, { recursive: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, "web-ui-mobile-390.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, "web-ui-desktop-1280.png"),
      fullPage: true,
    });
  });
});
