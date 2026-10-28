import { describe, expect, it } from "vitest";
import { MAX_VIEWS, VIEWS_KEY, browserStorage, loadViews, removeView, saveView } from "./savedViews";

function memoryStore() {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
}
const throwingStore = {
  getItem: (): string | null => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};
const at = (n: number) => new Date(Date.UTC(2026, 9, 28, 12, 0, n));

describe("saved views", () => {
  it("keeps the newest first and moves a re-saved url to the top", () => {
    const store = memoryStore();
    saveView(store, { name: "Population", url: "/explore?metric=population" }, at(1));
    let views = saveView(store, { name: " ", url: "/explore?metric=fx_rate" }, at(2));
    expect(views.map((v) => v.url)).toEqual(["/explore?metric=fx_rate", "/explore?metric=population"]);
    expect(views[0]?.name).toBe("/explore?metric=fx_rate");
    views = saveView(store, { name: "Population again", url: "/explore?metric=population" }, at(3));
    expect(views.map((v) => v.name)).toEqual(["Population again", "/explore?metric=fx_rate"]);
    expect(loadViews(store)).toEqual(views);
  });

  it("keeps at most 50 views", () => {
    const store = memoryStore();
    for (let i = 0; i < 51; i++) saveView(store, { name: `v${i}`, url: `/explore?metric=m${i}` }, at(i));
    const views = loadViews(store);
    expect(views.length).toBe(MAX_VIEWS);
    expect(views[0]?.name).toBe("v50");
  });

  it("removes only the given id", () => {
    const store = memoryStore();
    saveView(store, { name: "a", url: "/a" }, at(1));
    const id = saveView(store, { name: "b", url: "/b" }, at(2))[0]!.id;
    expect(removeView(store, id).map((v) => v.name)).toEqual(["a"]);
    expect(loadViews(store).map((v) => v.name)).toEqual(["a"]);
  });

  it("loads invalid JSON, a non-array and malformed items as []", () => {
    const store = memoryStore();
    store.setItem(VIEWS_KEY, "{not json");
    expect(loadViews(store)).toEqual([]);
    store.setItem(VIEWS_KEY, '{"id":"x"}');
    expect(loadViews(store)).toEqual([]);
    store.setItem(VIEWS_KEY, '[{"id":"x","name":"n","url":1,"saved_at":"t"}]');
    expect(loadViews(store)).toEqual([]);
  });

  it("works without storage or with a throwing one", () => {
    for (const store of [throwingStore, null]) {
      expect(loadViews(store)).toEqual([]);
      expect(saveView(store, { name: "a", url: "/a" }, at(1)).map((v) => v.url)).toEqual(["/a"]);
      expect(removeView(store, "nope")).toEqual([]);
    }
  });

  it("has no browser storage in node", () => {
    expect(browserStorage()).toBeNull();
  });
});
