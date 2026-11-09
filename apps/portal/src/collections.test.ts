import { describe, expect, it } from "vitest";
import {
  MAX_ITEMS,
  addItem,
  createCollection,
  loadCollections,
  moveItem,
  removeCollection,
  removeItem,
  renameCollection,
  updateItem,
} from "./collections";

function memory(): Pick<Storage, "getItem" | "setItem"> {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe("collections (pin, order, title and comment)", () => {
  it("creates, renames and removes a collection", () => {
    const s = memory();
    const { created } = createCollection(s, "  Rynek pracy  ");
    expect(created.name).toBe("Rynek pracy");
    expect(loadCollections(s)).toHaveLength(1);
    expect(renameCollection(s, created.id, "Praca 2026")[0]!.name).toBe("Praca 2026");
    expect(removeCollection(s, created.id)).toEqual([]);
  });

  it("pins views in order, never the same link twice, and caps the size", () => {
    const s = memory();
    const { created: c } = createCollection(s, "A");
    addItem(s, c.id, { url: "/explore?i=a", title: "Pierwszy" });
    addItem(s, c.id, { url: "/explore?i=b" });
    const list = addItem(s, c.id, { url: "/explore?i=a" });
    expect(list[0]!.items.map((i) => i.url)).toEqual(["/explore?i=a", "/explore?i=b"]);
    expect(list[0]!.items[0]!.title).toBe("Pierwszy");
    for (let k = 0; k < MAX_ITEMS + 5; k++) addItem(s, c.id, { url: `/explore?i=x${k}` });
    expect(loadCollections(s)[0]!.items).toHaveLength(MAX_ITEMS);
  });

  it("moves, annotates and removes a view", () => {
    const s = memory();
    const { created: c } = createCollection(s, "A");
    addItem(s, c.id, { url: "/explore?i=a" });
    addItem(s, c.id, { url: "/explore?i=b" });
    const [a, b] = loadCollections(s)[0]!.items;
    expect(moveItem(s, c.id, a!.id, 1)[0]!.items.map((i) => i.url)).toEqual(["/explore?i=b", "/explore?i=a"]);
    // At the edge nothing moves.
    expect(moveItem(s, c.id, a!.id, 1)[0]!.items.map((i) => i.url)).toEqual(["/explore?i=b", "/explore?i=a"]);
    const noted = updateItem(s, c.id, b!.id, { title: "Płace", comment: "Do omówienia" })[0]!.items[0]!;
    expect(noted).toMatchObject({ title: "Płace", comment: "Do omówienia" });
    expect(removeItem(s, c.id, b!.id)[0]!.items.map((i) => i.url)).toEqual(["/explore?i=a"]);
  });

  it("survives broken or missing storage", () => {
    expect(loadCollections(null)).toEqual([]);
    const s = memory();
    s.setItem("zohelo-bi.collections.v1", "{not json");
    expect(loadCollections(s)).toEqual([]);
    s.setItem("zohelo-bi.collections.v1", JSON.stringify([{ id: 1 }, { id: "ok", name: "N", updated_at: "x", items: [{ id: "i" }] }]));
    expect(loadCollections(s)).toEqual([]);
  });
});
