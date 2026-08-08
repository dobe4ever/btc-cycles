"use client"

import { useMemo, useState } from "react"
import { CycleChart, colorFor } from "@/components/cycle-chart"
import {
  buildCycleData,
  CYCLE_START_DAY,
  dateForCycleDay,
  ELECTION_CYCLES,
  formatDate,
  getCycleStats,
  HALVING_CYCLES,
} from "@/lib/cycles"
import { cn } from "@/lib/utils"
type Mode = "election" | "halving"

function formatPrice(value: number): string {
  const abs = Math.abs(value)

  if (abs >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`
  }

  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }

  if (abs >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}k`
  }

  return `$${Math.round(value).toLocaleString("en-US")}`
}

function formatMultiplier(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k×`
  if (value >= 100) return `${Math.round(value)}×`
  if (value >= 10) return `${Math.round(value)}×`
  return `${Math.round(value)}×`
}

function formatShortDate(ms: number): string {
  const d = new Date(ms)

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]

  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

// Every historical bull market peak has occurred well within the first 800 days of a
// cycle (2012 election: day 394, 2016 election: day 404, 2020 election: day 377,
// 2016 halving: day 526, 2020 halving: day 553). Capping the peak search here prevents
// the tail-end recovery — where the price creeps back up toward the NEXT cycle's bull
// run — from being misidentified as the cycle's boom peak. The cap is only applied to
// completed (non-current) cycles; the live cycle searches all available data.
const PEAK_SEARCH_MAX_DAYS = 800

const MODES: { id: Mode; label: string; anchor: string; blurb: string }[] = [
  {
    id: "election",
    label: "US Election Cycle",
    anchor: "election",
    blurb: "Every cycle is anchored to US presidential election day (day 0), from 1 year before to 3 years after.",
  },
  {
    id: "halving",
    label: "Bitcoin Halving Cycle",
    anchor: "halving",
    blurb: "Every cycle is anchored to a Bitcoin halving (day 0), from 1 year before to 3 years after.",
  },
]

export function BtcCycles() {
  const [mode, setMode] = useState<Mode>("election")
  const active = MODES.find((m) => m.id === mode)!
  const defs = mode === "election" ? ELECTION_CYCLES : HALVING_CYCLES

  const summary = useMemo(() => {
    const { cycles } = buildCycleData(defs)

    return cycles.map((cycle, i) => ({
      cycle,
      color: colorFor(i, cycles.length),
      stats: getCycleStats(cycle, cycles[i - 1] ?? null),
      startDate: dateForCycleDay(cycle, CYCLE_START_DAY),
    }))
  }, [defs])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#f7931a] font-bold text-black">
            ₿
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
              Bitcoin 4-Year Cycles
            </h1>
            <p className="text-sm text-muted-foreground">
              Full BTC/USD history overlaid on 4-year cycles · logarithmic multiplier scale
            </p>
          </div>
        </div>
      </header>

      {/* Segmented control */}
      <div
        role="tablist"
        aria-label="Cycle type"
        className="inline-flex w-full max-w-md items-center gap-1 rounded-lg border border-border bg-card p-1"
      >
        {MODES.map((m) => {
          const selected = m.id === mode
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                selected
                  ? "bg-[#f7931a] text-black"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-medium">{active.label}</h2>
          <p className="text-sm text-muted-foreground text-pretty">{active.blurb}</p>
        </div>

        <CycleChart defs={defs} anchorName={active.anchor} />

        <p className="mt-3 text-xs text-muted-foreground">
          X axis: days relative to {active.anchor} day (0). Y axis: price multiplier vs. 1 year before the {active.anchor}
          {" "}(log scale). Hover to compare every cycle at the same point — the current cycle shows projected calendar
          dates even where price data does not yet exist.
        </p>
      </section>

      {/* Compact cycle summaries */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => {
          const { cycle, color, stats } = s

          return (
            <div
              key={cycle.key}
              className="min-w-0 rounded-lg border border-border bg-card px-3.5 py-3"
            >
              {/* Cycle date / identity */}
              <div className="mb-2.5 flex items-center justify-between">
                <span
                  className="text-[13px] font-semibold tracking-tight tabular-nums"
                  style={{ color }}
                >
                  {formatShortDate(cycle.anchorMs)}
                </span>

                {cycle.current && (
                  <span className="rounded-full bg-[#f7931a]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#f7931a]">
                    Current
                  </span>
                )}
              </div>

              {/* Statistics */}
              <div className="flex flex-col gap-1.5 text-[11px] leading-4 tabular-nums">
                {/* Breakout */}
                <div className="flex min-w-0 items-baseline">
                  <span className="w-[54px] shrink-0 text-muted-foreground">
                    Breakout
                  </span>

                  {stats.breakout ? (
                    <span className="min-w-0 truncate text-foreground">
                      {formatShortDate(stats.breakout.date)}
                      <span className="text-muted-foreground">
                        {" · "}day {stats.breakout.day}
                        {" · "}{formatPrice(stats.breakout.price)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                {/* Peak */}
                <div className="flex min-w-0 items-baseline">
                  <span className="w-[54px] shrink-0 text-muted-foreground">
                    Peak
                  </span>

                  {stats.peak ? (
                    <span className="min-w-0 truncate text-foreground">
                      {formatShortDate(stats.peak.date)}
                      <span className="text-muted-foreground">
                        {" · "}day {stats.peak.day}
                        {" · "}{formatPrice(stats.peak.price)}
                        {" · "}
                      </span>
                      <span className="font-medium">
                        {formatMultiplier(stats.peak.multiplier)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                {/* Bottom */}
                <div className="flex min-w-0 items-baseline">
                  <span className="w-[54px] shrink-0 text-muted-foreground">
                    Bottom
                  </span>

                  {stats.bottom ? (
                    <span className="min-w-0 truncate text-foreground">
                      {formatShortDate(stats.bottom.date)}
                      <span className="text-muted-foreground">
                        {" · "}day {stats.bottom.day}
                        {" · "}{formatPrice(stats.bottom.price)}
                        {" · "}
                      </span>
                      <span className="font-medium">
                        {Math.round(stats.bottom.drawdown)}%
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                {/* End */}
                <div className="flex min-w-0 items-baseline">
                  <span className="w-[54px] shrink-0 text-muted-foreground">
                    End
                  </span>

                  {stats.end ? (
                    <span className="min-w-0 truncate text-foreground">
                      <span className="font-medium">
                        {formatPrice(stats.end.price)}
                      </span>
                      <span className="text-muted-foreground">
                        {" · "}{formatMultiplier(stats.end.multiplier)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}