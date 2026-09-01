export type PeriodType = 'month' | 'quarter' | 'year';

export interface Period {
  type: PeriodType;
  /** année */
  year: number;
  /** mois 1-12 (type month) ou trimestre 1-4 (type quarter) */
  index: number;
  start: string; // YYYY-MM-DD inclus
  end: string; // YYYY-MM-DD inclus
  label: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function makePeriod(type: PeriodType, year: number, index: number): Period {
  if (type === 'year') {
    return {
      type, year, index: 1,
      start: iso(year, 1, 1),
      end: iso(year, 12, 31),
      label: `Année ${year}`,
    };
  }
  if (type === 'quarter') {
    const q = Math.min(Math.max(index, 1), 4);
    const m1 = (q - 1) * 3 + 1;
    return {
      type, year, index: q,
      start: iso(year, m1, 1),
      end: iso(year, m1 + 2, lastDay(year, m1 + 2)),
      label: `T${q} ${year}`,
    };
  }
  const m = Math.min(Math.max(index, 1), 12);
  return {
    type, year, index: m,
    start: iso(year, m, 1),
    end: iso(year, m, lastDay(year, m)),
    label: `${MONTHS[m - 1]} ${year}`,
  };
}

export function currentPeriod(type: PeriodType, now = new Date()): Period {
  const y = now.getFullYear();
  if (type === 'year') return makePeriod('year', y, 1);
  if (type === 'quarter') return makePeriod('quarter', y, Math.floor(now.getMonth() / 3) + 1);
  return makePeriod('month', y, now.getMonth() + 1);
}

export function shiftPeriod(p: Period, delta: number): Period {
  if (p.type === 'year') return makePeriod('year', p.year + delta, 1);
  if (p.type === 'quarter') {
    let q = p.index + delta;
    let y = p.year;
    while (q < 1) { q += 4; y -= 1; }
    while (q > 4) { q -= 4; y += 1; }
    return makePeriod('quarter', y, q);
  }
  let m = p.index + delta;
  let y = p.year;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return makePeriod('month', y, m);
}

export const inPeriod = (dateISO: string, p: Period) => dateISO >= p.start && dateISO <= p.end;
