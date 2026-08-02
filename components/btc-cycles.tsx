"use client"

import { useMemo, useState } from "react"
import { CycleChart, colorFor } from "@/components/cycle-chart"
import {
  buildCycleData,
  CYCLE_START_DAY,
  dateForCycleDay,
  ELECTION_CYCLES,
  formatDate,
  HALVING_CYCLES,
} from "@/lib/cycles"
import { cn } from "@/lib/utils"

type Mode = "election" | "halving"

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

function dayOffsetLabel(day: number, anchor: string): string {
  if (day === 0) return `on ${anchor} day`
  const n = Math.abs(day)
  return `${n} day${n === 1 ? "" : "s"} ${day < 0 ? "before" : "after"} ${anchor}`
}

export function BtcCycles() {
  const [mode, setMode] = useState<Mode>("election")
  const active = MODES.find((m) => m.id === mode)!
  const defs = mode === "election" ? ELECTION_CYCLES : HALVING_CYCLES

  const summary = useMemo(() => {
    const { data, cycles } = buildCycleData(defs)
    return cycles.map((c, i) => {
      let peak = -Infinity
      let peakDay = 0
      let low = Infinity
      let lowDay = 0
      for (let day = CYCLE_START_DAY; day < CYCLE_START_DAY + data.length; day++) {
        const v = data[day - CYCLE_START_DAY][c.key] as number | null
        if (v != null) {
          if (v > peak) {
            peak = v
            peakDay = day
          }
          if (v < low) {
            low = v
            lowDay = day
          }
        }
      }
      return {
        cycle: c,
        color: colorFor(i, cycles.length),
        anchorDate: dateForCycleDay(c, 0),
        peak: isFinite(peak) ? peak : null,
        peakDay,
        peakDate: dateForCycleDay(c, peakDay),
        low: isFinite(low) ? low : null,
        lowDay,
        lowDate: dateForCycleDay(c, lowDay),
      }
    })
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

      {/* Legend / per-cycle summary */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div
            key={s.cycle.key}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
            style={{ borderTop: `3px solid ${s.color}` }}
          >
            {/* Heading: anchor (day 0) date, color matched to the chart line */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold" style={{ color: s.color }}>
                    {formatDate(s.anchorDate)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {active.anchor} day · {s.cycle.label}
                  </span>
                </div>
              </div>
              {s.cycle.current && (
                <span className="rounded-full bg-[#f7931a]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#f7931a]">
                  Current
                </span>
              )}
            </div>

            {/* Peak */}
            <div className="flex flex-col gap-0.5 rounded-md bg-secondary/40 p-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Peak</span>
                <span className="text-base font-semibold tabular-nums" style={{ color: s.color }}>
                  {s.peak != null ? `${s.peak.toFixed(1)}x` : "—"}
                </span>
              </div>
              {s.peak != null && (
                <>
                  <span className="text-[11px] text-muted-foreground">{dayOffsetLabel(s.peakDay, active.anchor)}</span>
                  <span className="text-[11px] tabular-nums text-foreground">{formatDate(s.peakDate)}</span>
                </>
              )}
            </div>

            {/* Lowest */}
            <div className="flex flex-col gap-0.5 rounded-md bg-secondary/40 p-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lowest</span>
                <span className="text-base font-semibold tabular-nums text-foreground">
                  {s.low != null ? `${s.low.toFixed(2)}x` : "—"}
                </span>
              </div>
              {s.low != null && (
                <>
                  <span className="text-[11px] text-muted-foreground">{dayOffsetLabel(s.lowDay, active.anchor)}</span>
                  <span className="text-[11px] tabular-nums text-foreground">{formatDate(s.lowDate)}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
