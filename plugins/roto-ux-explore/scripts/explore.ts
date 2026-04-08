/**
 * UX Explorer — Playwright REPL for AI-driven browser exploration.
 *
 * Launches a headed Chromium browser, takes screenshots,
 * and accepts commands via stdin to interact with the page.
 *
 * Usage:
 *   npx tsx explore.ts --url=http://localhost:3000 --screenshot-dir=/tmp/ux-explore
 *
 * Commands (stdin):
 *   screenshot                    — Capture current screen
 *   click <selector>              — Click element by CSS selector
 *   click-text <text>             — Click element containing text
 *   click-xy <x> <y>             — Click at coordinates
 *   type <selector> <text>        — Type text into input
 *   scroll <up|down>              — Scroll page
 *   navigate <url>                — Navigate to URL
 *   wait <ms>                     — Wait milliseconds
 *   viewport <width> <height>     — Change viewport size
 *   dom                           — Print simplified DOM structure
 *   links                         — Print all visible links
 *   inputs                        — Print all visible inputs/buttons
 *   quit                          — Close browser and exit
 */

import { chromium, type Page, type Browser } from "playwright";
import { createInterface } from "readline";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

// Parse args
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [key, ...val] = a.slice(2).split("=");
      return [key, val.join("=")];
    }),
);

const startUrl = args.url;
if (!startUrl) {
  console.error("Error: --url is required. Example: --url=http://localhost:3000");
  process.exit(1);
}

const screenshotDir = args["screenshot-dir"] || "/tmp/ux-explore-screenshots";
let stepCount = 0;

// Ensure screenshot directory
if (!existsSync(screenshotDir)) {
  mkdirSync(screenshotDir, { recursive: true });
}

function log(tag: string, message: string) {
  console.log(`[${tag}] ${message}`);
}

async function takeScreenshot(page: Page): Promise<string> {
  stepCount++;
  const filename = `step-${String(stepCount).padStart(3, "0")}.png`;
  const filepath = join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  log("SCREENSHOT", filepath);
  log("URL", page.url());
  log("TITLE", await page.title());
  return filepath;
}

async function printDom(page: Page) {
  const structure = await page.evaluate(() => {
    function summarize(el: Element, depth: number): string {
      if (depth > 3) return "";
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      const cls = el.className && typeof el.className === "string"
        ? `.${el.className.split(" ").slice(0, 2).join(".")}`
        : "";
      const text = el.textContent?.trim().slice(0, 40) || "";
      const href = el.getAttribute("href") || "";
      const indent = "  ".repeat(depth);

      let info = `${indent}<${tag}${id}${cls}>`;
      if (href) info += ` href="${href}"`;
      if (text && !el.children.length) info += ` "${text}"`;

      const lines = [info];
      const children = Array.from(el.children).slice(0, 10);
      for (const child of children) {
        const childStr = summarize(child, depth + 1);
        if (childStr) lines.push(childStr);
      }
      return lines.join("\n");
    }
    return summarize(document.body, 0);
  });
  console.log(structure);
}

async function printLinks(page: Page) {
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]"))
      .filter((a) => {
        const rect = a.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .slice(0, 30)
      .map((a) => ({
        href: a.getAttribute("href"),
        text: a.textContent?.trim().slice(0, 50),
      }));
  });
  for (const link of links) {
    console.log(`  ${link.href} — "${link.text}"`);
  }
  log("LINKS", `${links.length} visible links`);
}

async function printInputs(page: Page) {
  const inputs = await page.evaluate(() => {
    const els = [
      ...Array.from(document.querySelectorAll("input, textarea, select, button")),
    ];
    return els
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .slice(0, 20)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || "",
        name: el.getAttribute("name") || "",
        placeholder: el.getAttribute("placeholder") || "",
        text: el.textContent?.trim().slice(0, 30) || "",
        selector: el.id
          ? `#${el.id}`
          : el.getAttribute("name")
            ? `[name="${el.getAttribute("name")}"]`
            : `${el.tagName.toLowerCase()}`,
      }));
  });
  for (const input of inputs) {
    const info =
      input.tag === "button"
        ? `<button> "${input.text}"`
        : `<${input.tag} type="${input.type}" name="${input.name}"> placeholder="${input.placeholder}"`;
    console.log(`  ${input.selector} — ${info}`);
  }
  log("INPUTS", `${inputs.length} visible inputs/buttons`);
}

async function handleCommand(
  page: Page,
  command: string,
): Promise<boolean> {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0];

  try {
    switch (cmd) {
      case "screenshot":
        await takeScreenshot(page);
        break;

      case "click": {
        const selector = parts.slice(1).join(" ");
        await page.locator(selector).first().click({ timeout: 5000 });
        await page.waitForTimeout(500);
        log("OK", `click ${selector}`);
        await takeScreenshot(page);
        break;
      }

      case "click-text": {
        const text = parts.slice(1).join(" ");
        await page.getByText(text, { exact: false }).first().click({ timeout: 5000 });
        await page.waitForTimeout(500);
        log("OK", `click-text "${text}"`);
        await takeScreenshot(page);
        break;
      }

      case "click-xy": {
        const x = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        await page.mouse.click(x, y);
        await page.waitForTimeout(500);
        log("OK", `click-xy ${x} ${y}`);
        await takeScreenshot(page);
        break;
      }

      case "type": {
        const selector = parts[1];
        const text = parts.slice(2).join(" ");
        await page.locator(selector).first().fill(text);
        await page.waitForTimeout(300);
        log("OK", `type ${selector} "${text}"`);
        await takeScreenshot(page);
        break;
      }

      case "scroll": {
        const direction = parts[1] || "down";
        const amount = direction === "down" ? 500 : -500;
        await page.evaluate((y) => window.scrollBy(0, y), amount);
        await page.waitForTimeout(300);
        log("OK", `scroll ${direction}`);
        await takeScreenshot(page);
        break;
      }

      case "navigate": {
        const url = parts[1];
        const fullUrl = url.startsWith("http") ? url : `${new URL(page.url()).origin}${url}`;
        await page.goto(fullUrl, { waitUntil: "networkidle" });
        log("OK", `navigate ${fullUrl}`);
        await takeScreenshot(page);
        break;
      }

      case "wait": {
        const ms = parseInt(parts[1]) || 1000;
        await page.waitForTimeout(ms);
        log("OK", `wait ${ms}ms`);
        break;
      }

      case "viewport": {
        const width = parseInt(parts[1]) || 1280;
        const height = parseInt(parts[2]) || 720;
        await page.setViewportSize({ width, height });
        log("OK", `viewport ${width}x${height}`);
        await takeScreenshot(page);
        break;
      }

      case "dom":
        await printDom(page);
        break;

      case "links":
        await printLinks(page);
        break;

      case "inputs":
        await printInputs(page);
        break;

      case "quit":
        log("OK", "quit");
        return false;

      default:
        log("ERROR", `Unknown command: ${cmd}`);
    }
  } catch (err) {
    log("ERROR", `${cmd} failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return true;
}

async function main() {
  log("INIT", `Starting browser at ${startUrl}`);
  log("INIT", `Screenshots: ${screenshotDir}`);

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: args.headless === "true",
      args: ["--window-size=1280,900"],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: "ko-KR",
    });
    const page = await context.newPage();

    await page.goto(startUrl, { waitUntil: "networkidle" });
    await takeScreenshot(page);

    log("READY", "Browser ready. Waiting for commands...");

    const rl = createInterface({ input: process.stdin });

    for await (const line of rl) {
      if (!line.trim()) continue;
      const shouldContinue = await handleCommand(page, line);
      if (!shouldContinue) break;
    }
  } finally {
    if (browser) await browser.close();
    log("DONE", `Total steps: ${stepCount}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
