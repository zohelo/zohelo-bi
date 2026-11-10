import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import type { TopicEntry } from "../../data";
import { tplPageFor } from "../routes";
import {
  daysBetween,
  headlineTime,
  hotFirst,
  hotKpiKeys,
  isTopicKey,
  linkedKpis,
  periodFromParam,
  periodParam,
  releasePhrase,
  topicView,
  trendWords,
  whyHot,
} from "./topics";

const signals = (news: number | null, volume: number | null, attention: number | null) => ({ signals: { news, volume, attention } });

describe("period parameter", () => {
  it("reads Polish slugs and contract keys, and falls back", () => {
    expect(periodFromParam("tydzien")).toBe("week");
    expect(periodFromParam("quarter")).toBe("quarter");
    expect(periodFromParam(null)).toBe("day");
    expect(periodFromParam("<script>", "week")).toBe("week");
    expect(periodParam("month")).toBe("miesiac");
  });
});

describe("topic keys and routes", () => {
  it("accepts only contract keys", () => {
    expect(isTopicKey("stopy_procentowe")).toBe(true);
    expect(isTopicKey("Bad-Key")).toBe(false);
    expect(isTopicKey("a".repeat(65))).toBe(false);
    expect(tplPageFor("/temat/inflacja")).toEqual({ kind: "topic", key: "inflacja" });
    expect(tplPageFor("/temat/inflacja/")).toEqual({ kind: "topic", key: "inflacja" });
    expect(tplPageFor("/temat/../kpi").kind).toBe("not-found");
    expect(tplPageFor("/temat/%3Cx%3E").kind).toBe("not-found");
    expect(tplPageFor(`/temat/${"a".repeat(65)}`).kind).toBe("not-found");
  });
});

describe("why a topic is hot", () => {
  it("names the two strongest signals, strongest first, then a release within a week", () => {
    const t = { ...signals(2.6, 1.9, 1.4), next_release: { date: "2026-11-11", source_key: "gus", title_pl: "", title_en: "" } };
    expect(whyHot(t, "2026-11-10", "pl")).toBe("dużo publikacji · więcej w mediach · premiera danych jutro");
    expect(whyHot(t, "2026-11-10", "en")).toBe("many articles · more media coverage · data out tomorrow");
  });
  it("skips missing and weak signals, and far or past releases", () => {
    const t = { ...signals(null, 0.4, 2.3), next_release: { date: "2026-12-02", source_key: "nbp", title_pl: "", title_en: "" } };
    expect(whyHot(t, "2026-11-10", "pl")).toBe("duże zainteresowanie czytelników");
    expect(whyHot({ ...signals(0.2, null, null), next_release: null }, "2026-11-10", "pl")).toBe("stale obecny w mediach");
  });
  it("words the release date relative to the ranking day", () => {
    const r = (date: string) => ({ date, source_key: "gus", title_pl: "", title_en: "" });
    expect(releasePhrase(r("2026-11-10"), "2026-11-10", "pl")).toBe("premiera danych dziś");
    expect(releasePhrase(r("2026-11-13"), "2026-11-10", "pl")).toBe("premiera danych za 3 dni");
    expect(releasePhrase(r("2026-11-09"), "2026-11-10", "pl")).toBeNull();
    expect(releasePhrase(r("2026-11-18"), "2026-11-10", "pl")).toBeNull();
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("trend words", () => {
  it("gives an arrow and words for screen readers", () => {
    expect(trendWords("up", "pl")).toEqual({ arrow: "↑", word: "rośnie", spoken: "zainteresowanie rośnie" });
    expect(trendWords("down", "en").spoken).toBe("attention cooling");
    expect(trendWords("flat", "pl").arrow).toBe("→");
  });
});

describe("hot KPIs first", () => {
  it("lists a period's KPI keys in rank order without repeats", async () => {
    const topics = (await dummy.topics())!;
    const keys = hotKpiKeys(topics, "week");
    expect(keys[0]).toBe(topics.periods.week.topics.find((t) => t.kpi_keys.length)!.kpi_keys[0]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(hotKpiKeys(null)).toEqual([]);
  });
  it("puts hot KPIs first and keeps the order of the rest", () => {
    const ks = ["a", "b", "c", "d"].map((kpi_key) => ({ kpi_key }));
    expect(hotFirst(ks, ["d", "x", "b"]).map((k) => k.kpi_key)).toEqual(["d", "b", "a", "c"]);
    expect(hotFirst(ks, [])).toBe(ks);
  });
});

describe("topic view", () => {
  it("collects rank per period and every headline once, newest first", async () => {
    const topics = (await dummy.topics())!;
    const v = topicView(topics, "inflacja")!;
    expect(v.entry).toBe(topics.periods.day.topics.find((t) => t.topic_key === "inflacja"));
    expect(v.history.map((h) => h.period)).toEqual(["day", "week", "month", "quarter", "year"]);
    expect(new Set(v.headlines.map((h) => h.url)).size).toBe(v.headlines.length);
    expect(v.headlines.length).toBe(5);
    const times = v.headlines.map((h) => h.published_at);
    expect([...times].sort().reverse()).toEqual(times);
  });
  it("takes a topic listed only in longer periods from the first period that lists it", async () => {
    const topics = (await dummy.topics())!;
    const v = topicView(topics, "demografia")!;
    expect(v.history.find((h) => h.period === "day")!.entry).toBeNull();
    expect(v.entry).toBe(topics.periods.year.topics.find((t) => t.topic_key === "demografia"));
    expect(topicView(topics, "nie_ma_takiego")).toBeNull();
  });
  it("keeps only linked KPIs the catalogue has", async () => {
    const cat = await dummy.catalog();
    const entry: Pick<TopicEntry, "kpi_keys"> = { kpi_keys: ["cpi_annual_rate", "not_in_catalogue", "core_inflation"] };
    expect(linkedKpis(cat, entry).map((k) => k.kpi_key)).toEqual(["cpi_annual_rate", "core_inflation"]);
  });
});

describe("headline time", () => {
  it("shows the time in Polish time, with the day for older headlines", () => {
    expect(headlineTime("2026-11-10T07:40:00Z", "2026-11-10", "pl")).toBe("dziś, 08:40");
    expect(headlineTime("2026-11-09T18:20:00Z", "2026-11-10", "en")).toMatch(/^9 Nov, 19:20$/);
    expect(headlineTime("2026-08-01T10:00:00Z", "2026-11-10", "pl")).toBe("1 sie");
    expect(headlineTime("not a date", "2026-11-10", "pl")).toBe("not a date");
  });
});
