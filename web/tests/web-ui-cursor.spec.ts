import { execFile, spawn } from "node:child_process";
import { existsSync, promises as fsPromises } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import wcwidth from "wcwidth";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..");
const tmpDir = process.env.TMPDIR ?? "/tmp";
const vtrBinary = path.join(tmpDir, `vtr-playwright-${process.pid}`);
const port = 20080 + (process.pid % 1000);
const baseURL = `http://127.0.0.1:${port}`;
const hubAddr = `127.0.0.1:${port}`;
let configDir = "";
const sessionName = "web-cursor";
const bootTimeoutMs = Number.parseInt(process.env.E2E_BOOT_TIMEOUT_MS ?? "10000", 10);
const outputTimeoutMs = Number.parseInt(process.env.E2E_OUTPUT_TIMEOUT_MS ?? "3000", 10);
const skipWebBuild = process.env.E2E_SKIP_WEB_BUILD === "1";

type ManagedProcess = ReturnType<typeof spawn>;

type ScreenCell = {
  char: string;
  fg_color: number;
  bg_color: number;
  attributes: number;
};

type ScreenEnvelope = {
  screen: {
    cursor_x: number;
    cursor_y: number;
    cols: number;
    rows: number;
    screen_rows: { cells: ScreenCell[] }[];
  };
};

let hubProc: ManagedProcess | null = null;

async function runCommand(cmd: string, args: string[], cwd: string) {
  await execFileAsync(cmd, args, { cwd, env: process.env, maxBuffer: 1024 * 1024 });
}

async function runCommandOutput(cmd: string, args: string[], cwd: string) {
  return execFileAsync(cmd, args, { cwd, env: process.env, maxBuffer: 1024 * 1024 });
}

function startProcess(cmd: string, args: string[], cwd: string) {
  return spawn(cmd, args, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
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

async function sendKey(key: string) {
  await runCommand(vtrBinary, ["agent", "key", "--hub", hubAddr, sessionName, key], repoRoot);
}

async function sendRaw(text: string) {
  await runCommand(vtrBinary, ["agent", "send", "--hub", hubAddr, sessionName, text], repoRoot);
}

async function sendCommandLine(command: string) {
  await sendRaw(command);
  await sendKey("enter");
}

async function waitForOutput(pattern: string) {
  await runCommand(
    vtrBinary,
    ["agent", "wait", "--hub", hubAddr, "--timeout", `${outputTimeoutMs}ms`, sessionName, pattern],
    repoRoot,
  );
}

async function getScreen() {
  const { stdout } = await runCommandOutput(
    vtrBinary,
    ["agent", "screen", "--json", "--hub", hubAddr, sessionName],
    repoRoot,
  );
  return JSON.parse(stdout.toString()) as ScreenEnvelope;
}

function sameCellStyle(a: ScreenCell, b?: ScreenCell) {
  if (!b) {
    return false;
  }
  return a.fg_color === b.fg_color && a.bg_color === b.bg_color && a.attributes === b.attributes;
}

function textOffsetForCursor(rowCells: ScreenCell[] | undefined, cursorX: number) {
  if (!rowCells || rowCells.length === 0) {
    return cursorX;
  }
  let textIndex = 0;
  for (let col = 0; col < cursorX && col < rowCells.length; col += 1) {
    const cell = rowCells[col];
    const char = cell?.char || " ";
    const width = Math.max(wcwidth(char), 1);
    if (width === 2 && col + 1 < rowCells.length) {
      const next = rowCells[col + 1];
      const nextChar = next?.char || " ";
      if (nextChar === " " && sameCellStyle(cell, next)) {
        textIndex += 1;
        col += 1;
        continue;
      }
    }
    textIndex += 1;
  }
  return textIndex;
}

test.beforeAll(async () => {
  configDir = await fsPromises.mkdtemp(path.join(tmpDir, `vtr-config-${process.pid}-`));
  process.env.VTRPC_CONFIG_DIR = configDir;
  if (!skipWebBuild) {
    await runCommand("bun", ["install"], path.join(repoRoot, "web"));
    await runCommand("bun", ["run", "build"], path.join(repoRoot, "web"));
  }
  await runCommand("go", ["build", "-o", vtrBinary, "./cmd/vtr"], repoRoot);
  hubProc = startProcess(vtrBinary, ["hub", "--addr", hubAddr], repoRoot);
  await waitForHttp(baseURL, bootTimeoutMs);
  await runCommand(
    vtrBinary,
    [
      "agent",
      "spawn",
      "--hub",
      hubAddr,
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
  if (configDir) {
    await fsPromises.rm(configDir, { recursive: true, force: true });
  }
  if (existsSync(vtrBinary)) {
    await fsPromises.unlink(vtrBinary);
  }
});

test("DOM cursor aligns with rendered text width", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 720 });
  await page.goto(baseURL);

  await page
    .getByRole("button", { name: new RegExp(sessionName) })
    .first()
    .click();
  await expect(
    page.locator("header").getByText(/connected(\+receiving)?/, { exact: false }),
  ).toBeVisible();

  await sendCommandLine("export PS1='' ");
  await waitForOutput("export PS1");
  await sendCommandLine("stty -echo; printf '__echo_off__'");
  await waitForOutput("__echo_off__");

  await sendCommandLine("printf $'\\x1b[2J\\x1b[H\\x1b[1mWWWWW\\x1b[0mABCDE'");
  await waitForOutput("ABCDE");

  const screen = await getScreen();
  const rowCells = screen.screen.screen_rows[0]?.cells;
  const textOffset = textOffsetForCursor(rowCells, screen.screen.cursor_x);

  const metrics = await page.evaluate(
    ({ textOffset }) => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>(".terminal-row"));
      const row = rows[0];
      const cursor = document.querySelector<HTMLElement>(".terminal-cursor");
      if (!row || !cursor) {
        return null;
      }
      const rowRect = row.getBoundingClientRect();
      const cursorRect = cursor.getBoundingClientRect();

      if (textOffset === 0) {
        return {
          rowLeft: rowRect.left,
          cursorLeft: cursorRect.left,
          textRight: rowRect.left,
        };
      }

      let remaining = textOffset;
      let firstText: Text | null = null;
      for (const run of row.querySelectorAll<HTMLElement>(".terminal-run")) {
        const textNode = run.firstChild;
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
          continue;
        }
        if (!firstText) {
          firstText = textNode as Text;
        }
        const text = textNode.textContent ?? "";
        if (remaining <= text.length) {
          const range = document.createRange();
          range.setStart(firstText, 0);
          range.setEnd(textNode, remaining);
          const rects = range.getClientRects();
          if (rects.length === 0) {
            return null;
          }
          const last = rects[rects.length - 1];
          return {
            rowLeft: rowRect.left,
            cursorLeft: cursorRect.left,
            textRight: last.right,
          };
        }
        remaining -= text.length;
      }
      return null;
    },
    { textOffset },
  );

  expect(metrics).not.toBeNull();
  if (!metrics) {
    return;
  }
  const diff = Math.abs(metrics.cursorLeft - metrics.textRight);
  expect(diff).toBeLessThan(0.3);

  await sendCommandLine("stty echo; printf '__echo_on__'");
  await waitForOutput("__echo_on__");
});

test("Canvas cursor aligns with vertically centered glyphs", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "vtr.preferences",
      JSON.stringify({ version: 1, terminalRenderer: "canvas" }),
    );
  });

  await page.setViewportSize({ width: 900, height: 720 });
  await page.goto(baseURL);

  await page
    .getByRole("button", { name: new RegExp(sessionName) })
    .first()
    .click();
  await expect(
    page.locator("header").getByText(/connected(\+receiving)?/, { exact: false }),
  ).toBeVisible();

  await sendCommandLine("export PS1='' ");
  await waitForOutput("export PS1");

  const inputText = "H";
  await sendRaw(inputText);
  await waitForOutput(inputText);

  const screen = await getScreen();

  const metrics = await page.evaluate(
    ({ cursorY }) => {
      const canvas = document.querySelector<HTMLCanvasElement>("canvas");
      const cursor = document.querySelector<HTMLElement>(".terminal-cursor");
      if (!canvas || !cursor) {
        return null;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return null;
      }
      const dpr = window.devicePixelRatio || 1;
      const cursorStyle = getComputedStyle(cursor);
      const cellHeight = Number.parseFloat(cursorStyle.height || "0");
      const cellWidth = Number.parseFloat(cursorStyle.width || "0");
      if (!cellHeight || !cellWidth) {
        return null;
      }

      const parent = canvas.closest<HTMLElement>(".terminal-surface");
      const parentStyle = getComputedStyle(parent ?? document.documentElement);
      const fontSize = Number.parseFloat(parentStyle.fontSize || "0");
      if (!fontSize) {
        return null;
      }

      const bgVar = parentStyle.getPropertyValue("--tn-bg-alt").trim();
      const bg = bgVar.startsWith("#")
        ? bgVar
        : window.getComputedStyle(document.body).backgroundColor;
      const parseHex = (value: string) => {
        const hex = value.replace("#", "");
        if (hex.length !== 6) {
          return null;
        }
        return {
          r: Number.parseInt(hex.slice(0, 2), 16),
          g: Number.parseInt(hex.slice(2, 4), 16),
          b: Number.parseInt(hex.slice(4, 6), 16),
        };
      };
      const bgRgb = parseHex(bg);
      if (!bgRgb) {
        return null;
      }

      const rowTop = cursorY * cellHeight;
      const data = ctx.getImageData(
        Math.max(0, Math.floor(0 * dpr)),
        Math.max(0, Math.floor(rowTop * dpr)),
        Math.max(1, Math.ceil(cellWidth * dpr)),
        Math.max(1, Math.ceil(cellHeight * dpr)),
      );

      const matchesBg = (r: number, g: number, b: number) => {
        const tol = 6;
        return (
          Math.abs(r - bgRgb.r) <= tol &&
          Math.abs(g - bgRgb.g) <= tol &&
          Math.abs(b - bgRgb.b) <= tol
        );
      };

      let firstRow = -1;
      for (let y = 0; y < data.height; y += 1) {
        for (let x = 0; x < data.width; x += 1) {
          const idx = (y * data.width + x) * 4;
          const r = data.data[idx];
          const g = data.data[idx + 1];
          const b = data.data[idx + 2];
          const a = data.data[idx + 3];
          if (a > 0 && !matchesBg(r, g, b)) {
            firstRow = y;
            break;
          }
        }
        if (firstRow >= 0) {
          break;
        }
      }

      if (firstRow < 0) {
        return null;
      }

      const leading = Math.max(0, cellHeight - fontSize);
      const expectedTop = leading / 2;
      return {
        actualTop: firstRow / dpr,
        expectedTop,
      };
    },
    { cursorY: screen.screen.cursor_y },
  );

  expect(metrics).not.toBeNull();
  if (!metrics) {
    return;
  }
  const diff = Math.abs(metrics.actualTop - metrics.expectedTop);
  expect(diff).toBeLessThan(0.5);
});
