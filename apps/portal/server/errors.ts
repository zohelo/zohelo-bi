// Error answers of the query API: 4xx keep their message (the caller's mistake), 5xx say only
// "upstream error" (502) or "internal error" (500); the detail is for the server log only.

import { HttpError } from "./query";

export function errorBody(error: unknown): { status: number; body: { error: string }; detail: string } {
  const status = error instanceof HttpError ? error.status : 500;
  const detail = error instanceof Error ? error.message : String(error);
  const message = status < 500 ? detail : status === 502 ? "upstream error" : "internal error";
  return { status, body: { error: message }, detail };
}
