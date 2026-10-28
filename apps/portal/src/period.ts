// The explorer's period limit (from/to in the URL, set by the dashboard period slicer): inclusive
// date_key prefixes such as 2015, 2015-01 or 2015-01-31, applied in the browser to the fetched rows.

const PERIOD = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/** True when dateKey (YYYY, YYYY-MM or YYYY-MM-DD) lies within the inclusive from/to prefixes. */
export function inPeriod(dateKey: string, from?: string, to?: string): boolean {
  return (!from || dateKey.slice(0, from.length) >= from) && (!to || dateKey.slice(0, to.length) <= to);
}

/** from and to from the URL, each kept only when it is a valid date_key prefix. */
export function parsePeriod(params: URLSearchParams): { from?: string; to?: string } {
  const out: { from?: string; to?: string } = {};
  for (const k of ["from", "to"] as const) {
    const v = params.get(k);
    if (v && PERIOD.test(v)) out[k] = v;
  }
  return out;
}
