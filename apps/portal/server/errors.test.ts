import { describe, expect, it } from "vitest";
import { errorBody } from "./errors";
import { HttpError } from "./query";

describe("errorBody", () => {
  it("keeps the message of a 404", () => {
    const e = errorBody(new HttpError(404, "unknown metric: x"));
    expect(e.status).toBe(404);
    expect(e.body.error).toBe("unknown metric: x");
  });

  it("keeps the message of a 400", () => {
    const e = errorBody(new HttpError(400, "unsupported filter value: a"));
    expect(e.status).toBe(400);
    expect(e.body.error).toBe("unsupported filter value: a");
  });

  it("hides the R2 SQL detail of a 502", () => {
    const e = errorBody(new HttpError(502, "R2 SQL 500: secret detail"));
    expect(e.status).toBe(502);
    expect(e.body.error).toBe("upstream error");
    expect(e.detail).toContain("secret detail");
  });

  it("answers an unexpected error with 500 internal error", () => {
    const e = errorBody(new Error("boom"));
    expect(e.status).toBe(500);
    expect(e.body.error).toBe("internal error");
  });

  it("answers a thrown string with 500 internal error", () => {
    const e = errorBody("x");
    expect(e.status).toBe(500);
    expect(e.body.error).toBe("internal error");
  });
});
