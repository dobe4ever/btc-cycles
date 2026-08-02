import { BTC_START, BTC_PRICES } from "./btc-data"

// A cycle spans from the anchor (election / halving day = 0)
// to the day before the next anchor, ~4 years later.
export const CYCLE_START_DAY = 0
export const CYCLE_END_DAY = 1460
export const CYCLE_LENGTH = CYCLE_END_DAY - CYCLE_START_DAY + 1 // 1461

const MS_PER_DAY = 86_400_000

function toUTCDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

const BTC_START_MS = toUTCDate(BTC_START)
// The most recent day for which we have real price data.
export const LAST_DATA_MS = BTC_START_MS + (BTC_PRICES.length - 1) * MS_PER_DAY

/** Add `days` to a base date (ms) and return ms. */
export function addDays(baseMs: number, days: number): number {
  return baseMs + days * MS_PER_DAY
}

/** Price on a given day (ms), or null if outside the recorded range. */
export function priceAtMs(ms: number): number | null {
  const idx = Math.round((ms - BTC_START_MS) / MS_PER_DAY)
  if (idx < 0 || idx >= BTC_PRICES.length) return null
  const p = BTC_PRICES[idx]
  return p > 0 ? p : null
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function formatDate(ms: number): string {
  const d = new Date(ms)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

export type CycleKind = "election" | "halving"

export interface CycleDef {
  key: string
  label: string
  /** anchor day (day 0) as YYYY-MM-DD */
  anchor: string
}

// US presidential election days (first Tuesday after first Monday of November).
export const ELECTION_CYCLES: CycleDef[] = [
  { key: "e2012", label: "2012", anchor: "2012-11-06" },
  { key: "e2016", label: "2016", anchor: "2016-11-08" },
  { key: "e2020", label: "2020", anchor: "2020-11-03" },
  { key: "e2024", label: "2024", anchor: "2024-11-05" },
]

// Bitcoin block-reward halving days.
export const HALVING_CYCLES: CycleDef[] = [
  { key: "h2012", label: "2012", anchor: "2012-11-28" },
  { key: "h2016", label: "2016", anchor: "2016-07-09" },
  { key: "h2020", label: "2020", anchor: "2020-05-11" },
  { key: "h2024", label: "2024", anchor: "2024-04-20" },
]

export interface ResolvedCycle extends CycleDef {
  anchorMs: number
  baseline: number
  /** true when the cycle window still extends past the last data point */
  current: boolean
  /** day offset at which real data ends (for the current cycle) */
  lastDataDay: number | null
}

export interface CycleChartResult {
  data: Array<Record<string, number | null>>
  cycles: ResolvedCycle[]
  yDomain: [number, number]
  yTicks: number[]
}

/** Resolve cycle defs into anchor timestamps + baselines. */
export function resolveCycles(defs: CycleDef[]): ResolvedCycle[] {
  return defs.map((def) => {
    const anchorMs = toUTCDate(def.anchor)
    const startMs = addDays(anchorMs, CYCLE_START_DAY)
    // Baseline = price on the anchor day (start of the cycle). Fall back to the
    // earliest available price inside the window if the exact start is missing.
    let baseline = priceAtMs(startMs)
    if (baseline == null) {
      for (let day = CYCLE_START_DAY + 1; day <= CYCLE_END_DAY; day++) {
        const p = priceAtMs(addDays(anchorMs, day))
        if (p != null) {
          baseline = p
          break
        }
      }
    }
    const endMs = addDays(anchorMs, CYCLE_END_DAY)
    const current = endMs > LAST_DATA_MS
    let lastDataDay: number | null = null
    if (current) {
      lastDataDay = Math.min(CYCLE_END_DAY, Math.round((LAST_DATA_MS - anchorMs) / MS_PER_DAY))
    }
    return { ...def, anchorMs, baseline: baseline ?? 1, current, lastDataDay }
  })
}

function niceLogTicks(min: number, max: number): { domain: [number, number]; ticks: number[] } {
  const low = Math.pow(10, Math.floor(Math.log10(min)))
  const high = Math.pow(10, Math.ceil(Math.log10(max)))
  const ticks: number[] = []
  for (let exp = Math.log10(low); exp <= Math.log10(high) + 1e-9; exp++) {
    const base = Math.pow(10, exp)
    for (const mult of [1, 2, 5]) {
      const t = base * mult
      if (t >= low - 1e-9 && t <= high + 1e-9) ticks.push(Number(t.toPrecision(2)))
    }
  }
  return { domain: [low, high], ticks }
}

/** Build the overlaid multiplier series for a set of cycles. */
export function buildCycleData(defs: CycleDef[]): CycleChartResult {
  const cycles = resolveCycles(defs)
  const data: Array<Record<string, number | null>> = []
  let minMult = Infinity
  let maxMult = -Infinity

  for (let day = CYCLE_START_DAY; day <= CYCLE_END_DAY; day++) {
    const row: Record<string, number | null> = { day }
    for (const c of cycles) {
      const price = priceAtMs(addDays(c.anchorMs, day))
      if (price != null && c.baseline > 0) {
        const mult = price / c.baseline
        row[c.key] = Number(mult.toFixed(4))
        if (mult < minMult) minMult = mult
        if (mult > maxMult) maxMult = mult
      } else {
        row[c.key] = null
      }
    }
    data.push(row)
  }

  if (!isFinite(minMult)) minMult = 0.5
  if (!isFinite(maxMult)) maxMult = 10
  const { domain, ticks } = niceLogTicks(minMult, maxMult)
  return { data, cycles, yDomain: domain, yTicks: ticks }
}

/** Absolute date (ms) for a given cycle + day offset. */
export function dateForCycleDay(cycle: ResolvedCycle, day: number): number {
  return addDays(cycle.anchorMs, day)
}
