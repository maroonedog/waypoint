// ===========================================================================
// statistics.ts — the four things this lane is allowed to compute.
//
// Quantiles rather than min and max, because a min-max band widens with N: a
// harness that reported its own resolution as a min-max range would make the
// sample count the cheapest knob in the design — run fewer pairs, get a
// tighter null band, declare more wins.
//
// `relativeSpread` is an upper bound on disturbance and NOT a confidence
// interval, and every place it is printed says so.
// ===========================================================================

export const median = (values: readonly number[]): number =>
  quantile(values, 0.5);

export function quantile(values: readonly number[], at: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((one, other) => one - other);
  const position = (sorted.length - 1) * at;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  const lower = sorted[low] ?? 0;
  if (low === high) return lower;
  const upper = sorted[high] ?? lower;
  return lower + (upper - lower) * (position - low);
}

export const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

/** Peak-to-peak as a percentage of the middle. Never a confidence interval. */
export function relativeSpreadPercent(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const middle = median(values);
  if (middle === 0) return Number.NaN;
  const low = Math.min(...values);
  const high = Math.max(...values);
  return Math.round(((high - low) / middle) * 1000) / 10;
}

export interface Band {
  readonly low: number;
  readonly middle: number;
  readonly high: number;
}

/** The 10th / 50th / 90th of a set of pair ratios. */
export const bandOf = (values: readonly number[]): Band => ({
  low: quantile(values, 0.1),
  middle: quantile(values, 0.5),
  high: quantile(values, 0.9),
});

export const bandsOverlap = (one: Band, other: Band): boolean =>
  one.low <= other.high && other.low <= one.high;

export const round = (value: number, places = 3): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};
