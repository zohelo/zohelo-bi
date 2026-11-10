// "3 wskaźniki", "5 wskaźników", "1 indicator": a number with its Polish or English plural form.

export function count(n: number, plForms: [string, string, string], enForms: [string, string], pl: boolean): string {
  if (!pl) return `${n} ${n === 1 ? enForms[0] : enForms[1]}`;
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return `${n} ${n === 1 ? plForms[0] : few ? plForms[1] : plForms[2]}`;
}
