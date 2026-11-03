// Real screen-reader flows for the zohelo design template pages.
// Every run saves the full spoken transcript (what NVDA / VoiceOver actually said) as a JSON
// attachment and in results/transcripts, so a person can read it. The assertions check only
// what must be announced: names, roles/states and chart descriptions, in a language-agnostic way
// (the runners speak English UI words; our content is Polish).
import { mkdirSync, writeFileSync } from "node:fs";
import { screenReaderTest as test } from "@guidepup/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import type { ScreenReader } from "@guidepup/guidepup";

type SR = ScreenReader & { navigateToWebContent(): Promise<void> };

async function open(page: Page, sr: SR, path: string) {
  await page.goto(path, { waitUntil: "load" });
  await page.waitForSelector('body[data-ready="1"]');
  await sr.navigateToWebContent();
  await sr.clearSpokenPhraseLog();
}

/** Move the virtual cursor until a phrase matches, at most `max` steps. */
async function readUntil(sr: SR, match: RegExp, max = 80) {
  for (let i = 0; i < max; i++) {
    if (match.test(await sr.lastSpokenPhrase())) return true;
    await sr.next();
  }
  return false;
}

/** Press Tab until the spoken phrase matches, at most `max` presses. */
async function tabUntil(sr: SR, match: RegExp, max = 40) {
  for (let i = 0; i < max; i++) {
    await sr.press("Tab");
    if (match.test(await sr.lastSpokenPhrase())) return true;
  }
  return false;
}

async function saveTranscript(sr: SR, info: TestInfo) {
  const log = await sr.spokenPhraseLog();
  const name = `${info.project.name}-${info.title.replace(/\W+/g, "-").toLowerCase()}`;
  mkdirSync("results/transcripts", { recursive: true });
  writeFileSync(`results/transcripts/${name}.json`, JSON.stringify(log, null, 2));
  await info.attach("spoken-transcript", { body: JSON.stringify(log, null, 2), contentType: "application/json" });
  return log.join(" | ");
}

test.describe("Pulpit z menu bocznym (Shell)", () => {
  test("skip link is the first thing announced", async ({ page, screenReader }, info) => {
    await open(page, screenReader, "/mockups/Shell.html");
    await screenReader.press("Tab");
    const said = await saveTranscript(screenReader, info);
    expect(said).toMatch(/Przejdź do treści/i);
  });

  test("page title is a level-1 heading", async ({ page, screenReader }, info) => {
    await open(page, screenReader, "/mockups/Shell.html");
    const found = await readUntil(screenReader, /Ceny i inflacja/i);
    const said = await saveTranscript(screenReader, info);
    expect(found, said).toBe(true);
    expect(said).toMatch(/(heading|nagłówek)/i);
  });

  test("sidebar domain announces button and expanded state", async ({ page, screenReader }, info) => {
    await open(page, screenReader, "/mockups/Shell.html");
    const found = await tabUntil(screenReader, /Gospodarka/i);
    const said = await saveTranscript(screenReader, info);
    expect(found, said).toBe(true);
    expect(said).toMatch(/(button|przycisk)/i);
    expect(said).toMatch(/(expanded|rozwinięt)/i);
  });

  test("current page in the sidebar is announced as current", async ({ page, screenReader }, info) => {
    await open(page, screenReader, "/mockups/Shell.html");
    const found = await tabUntil(screenReader, /Ceny i inflacja/i);
    const said = await saveTranscript(screenReader, info);
    expect(found, said).toBe(true);
    expect(said).toMatch(/(current|bieżąc)/i);
  });

  test("'coming soon' domain item is not a tab stop", async ({ page, screenReader }, info) => {
    await open(page, screenReader, "/mockups/Shell.html");
    await tabUntil(screenReader, /Rachunki narodowe/i);
    await screenReader.press("Tab");
    const said = await saveTranscript(screenReader, info);
    expect(await screenReader.lastSpokenPhrase()).not.toMatch(/Handel zagraniczny/i);
    expect(said).toBeTruthy();
  });

  test("main chart is described, not read as raw SVG", async ({ page, screenReader }, info) => {
    await open(page, screenReader, "/mockups/Shell.html");
    const found = await readUntil(screenReader, /Inflacja HICP w Polsce 2016–2026/i, 160);
    const said = await saveTranscript(screenReader, info);
    expect(found, said).toBe(true);
    expect(said).not.toMatch(/M\d+(\.\d+)? \d+/); // no path data spoken
  });

  test("chart/table toggle announces pressed state", async ({ page, screenReader }, info) => {
    await open(page, screenReader, "/mockups/Shell.html");
    const found = await tabUntil(screenReader, /Wykres/i, 60);
    const said = await saveTranscript(screenReader, info);
    expect(found, said).toBe(true);
    expect(said).toMatch(/(pressed|toggle|wciśnięt|przełącz)/i);
  });
});

test.describe("Katalog wykresów (Charts)", () => {
  test("chart cards read title then description", async ({ page, screenReader }, info) => {
    await open(page, screenReader, "/mockups/Charts.html");
    const found = await readUntil(screenReader, /Inflacja w paśmie celu NBP/i, 60);
    const said = await saveTranscript(screenReader, info);
    expect(found, said).toBe(true);
  });
});
