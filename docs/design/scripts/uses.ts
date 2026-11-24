// Derives the Uses page state for a given year from an append-only event log.
// Event: [YYYY-MM, '+' | '-', category, itemName]. See reference/data.js for the full log.
import { EV, SPEC, CATS, MON } from '../reference/data.js';

export type Item = { name: string; isNew: boolean; spec?: string };
export type Change = { month: string; op: '+' | '-'; name: string };

export function usesAt(year: number, currentYear = new Date().getFullYear()) {
  const cut = year >= currentYear ? '9999' : `${year}-12`;
  const inv: Record<string, Item[]> = {};
  for (const [date, op, cat, name] of EV) {
    if (date > cut) continue;
    inv[cat] ??= [];
    if (op === '+') inv[cat].push({ name, isNew: date.startsWith(String(year)), spec: SPEC[name] });
    else inv[cat] = inv[cat].filter(i => i.name !== name);
  }
  const categories = CATS.map(([key, label]) => ({ key, label, items: (inv[key] ?? []).slice().reverse() }));
  const changes: Change[] = EV.filter(e => e[0].startsWith(String(year)))
    .map(([d, op, , name]) => ({ month: MON[+d.slice(5) - 1], op, name }));
  return { categories, changes };
}

// Recommended: replace EV with a CMS / JSON / markdown source; the shape above is all the UI needs.
