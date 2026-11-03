// Real screen-reader flows for the zohelo design template pages.
// Every run saves the full spoken transcript (what NVDA / VoiceOver actually said) as a JSON
// attachment and in results/transcripts, so a person can read it. The assertions check only
// what must be announced: names, roles/states and chart descriptions, in a language-agnostic way
// (the runners speak English UI words; our content is Polish).
import { mkdirSync, writeFileSync } from "node:fs";
import { nvdaTest, voiceOverTest } from "@guidepup/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import type { ScreenReader } from "@guidepup/guidepup";

type SR = ScreenReader & { navigateToWebContent(): Promise<void> };

// One fixture name ("screenReader") for both platforms: VoiceOver on macOS, NVDA on Windows.
const test =
  process.platform === "darwin"
    ? voiceOverTest.extend<{ screenReader: SR }>({
        screenReader: async ({ voiceOver }, provide) => provide(voiceOver as unknown as SR),
      })
    : nvdaTest.extend<{ screenReader: SR }>({
        screenReader: async ({ nvda }, provide) => provide(nvda as unknown as SR),
      });

async function open(page: Page, sr: SR, path: string, clear = true) {
  await page.goto(path, { waitUntil: "load" });
  await page.waitForSelector('body[data-ready="1"]');
  await sr.navigateToWebContent();
  if (clear) await sr.clearSpokenPhraseLog();
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

/** Jump by headings (NVDA "h", VoiceOver VO+Cmd+H) until a heading matches. */
async function headingUntil(sr: SR, match: RegExp, max = 40) {
  const cmds = (sr as unknown as { keyboardCommands: Record<string, unknown> }).keyboardCommands;
  for (let i = 0; i < max; i++) {
    // NVDA browse mode: quick-navigation key "h"; VoiceOver: VO+Cmd+H.
    if (process.platform === "darwin") await sr.perform(cmds.findNextHeading);
    else await sr.press("h");
    if (match.test(await sr.lastSpokenPhrase())) return true;
  }
  return false;
}

async function saveTranscript(sr: SR, info: TestInfo) {
  const log = (await sr.spokenPhraseLog()).filter((p) => p.trim() !== "");
  // Printed so the transcript is readable straight from the CI log.
  console.log(`\n--- transcript: ${info.project.name} › ${info.title}\n${log.join("\n")}\n---`);
  const name = `${info.project.name}-${info.title.replace(/\W+/g, "-").toLowerCase()}`;
  mkdirSync("results/transcripts", { recursive: true });
  writeFileSync(`results/transcripts/${name}.json`, JSON.stringify(log, null, 2));
  await info.attach("spoken-transcript", { body: JSON.stringify(log, null, 2), contentType: "application/json" });
  return log.join(" | ");
}

test.describe("Pulpit z menu bocznym (Shell)", () => {
  test("skip link is the first thing in reading order", async ({ page, screenReader }, info) => {
    // Keep what was spoken while entering the page: the first item is announced on arrival.
    await open(page, screenReader, "/mockups/Shell.html", false);
    await readUntil(screenReader, /Przejdź do treści/i, 3);
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

test("KPI tiles read as separate facts with words, not symbols", async ({ page, screenReader }, info) => {
  await open(page, screenReader, "/mockups/Shell.html");
  const found = await readUntil(screenReader, /spadek o 0,1 punktu procentowego/i, 140);
  const said = await saveTranscript(screenReader, info);
  expect(found, said).toBe(true);
  expect(said).not.toMatch(/trójkąt|triangle|slesz|slash/i);
});

test.describe("Katalog wykresów (Charts)", () => {
  test("chart cards read title then description", async ({ page, screenReader }, info) => {
    // Known issue (2026-11-03): under automation NVDA speaks nothing on this long documentation
    // board (no focusable element; VoiceOver reads it fine). Investigate before the board becomes
    // a product page; tracked in docs/design-template.md "Known issues".
    test.fixme(process.platform !== "darwin", "NVDA silent on the Charts documentation board");
    await open(page, screenReader, "/mockups/Charts.html");
    const found = await headingUntil(screenReader, /Inflacja w paśmie celu NBP/i, 12);
    const said = await saveTranscript(screenReader, info);
    expect(found, said).toBe(true);
  });
});

// --- The template portal itself (built with sample data) -------------------------------------------------

async function openApp(page: Page, sr: SR, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.waitForSelector("main h1");
  await sr.navigateToWebContent();
  await sr.clearSpokenPhraseLog();
}

test.describe("Portal szablonu (template app)", () => {
  test("home page (Strona główna) KPI tiles read as words", async ({ page, screenReader }, info) => {
    await openApp(page, screenReader, "/?lang=pl");
    const found = await readUntil(screenReader, /(wzrost|spadek|bez zmian) o?/i, 160);
    const said = await saveTranscript(screenReader, info);
    expect(found, said).toBe(true);
    expect(said).not.toMatch(/trójkąt|triangle|slesz|slash/i);
  });

  test("sidebar domain chevron announces collapsed state", async ({ page, screenReader }, info) => {
    // Under Dashboardy each domain is a link to its overview ("Gospodarka") followed by a chevron button
    // "Rozwiń: Gospodarka" (aria-expanded); the chevron carries the state.
    await openApp(page, screenReader, "/?lang=pl");
    const found = await tabUntil(screenReader, /Rozwiń: Gospodarka/i, 30);
    const said = await saveTranscript(screenReader, info);
    expect(found, said).toBe(true);
    expect(said).toMatch(/(button|przycisk)/i);
    expect(said).toMatch(/(collapsed|zwinięt)/i);
  });

  test("domain dashboard chart is described and has a table toggle", async ({ page, screenReader }, info) => {
    // Known issue (2026-11-03): under automation VoiceOver goes silent after the dashboard's lead sentence
    // (NVDA passes this flow). Seen when a sample tag and the page period control followed the lead; both are
    // gone since the owner review (periods are per chart), so the filter bar now follows it. Re-check.
    test.fixme(process.platform === "darwin", "VoiceOver silent after the dashboard lead");
    await openApp(page, screenReader, "/d/economy/prices?lang=pl");
    const found = await headingUntil(screenReader, /Inflacja|Ceny/i, 12);
    // Safari only tabs to form controls by default: read on to the chart/table toggle instead.
    await readUntil(screenReader, /Wykres/i, 120);
    const said = await saveTranscript(screenReader, info);
    expect(found, said).toBe(true);
    expect(said).toMatch(/(pressed|wciśnięt|toggle|przełącz)/i);
  });
});
