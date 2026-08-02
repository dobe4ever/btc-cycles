"use client"

import { useMemo } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  buildCycleData,
  CYCLE_END_DAY,
  CYCLE_START_DAY,
  type CycleDef,
  dateForCycleDay,
  formatDate,
  type ResolvedCycle,
} from "@/lib/cycles"

// Muted-to-bright palette; the final (current) cycle is Bitcoin orange.
const COLORS = ["#8b949e", "#58a6ff", "#3fb950", "#f7931a"]

function colorFor(index: number, total: number): string {
  // Always give the last (current) cycle the orange emphasis color.
  if (index === total - 1) return COLORS[COLORS.length - 1]
  return COLORS[index % (COLORS.length - 1)]
}

function xTickLabel(day: number): string {
  if (day === 0) return "0"
  const years = day / 365
  const sign = day > 0 ? "+" : "\u2212"
  if (Number.isInteger(years)) return `${sign}${Math.abs(years)}y`
  return `${day > 0 ? "+" : "\u2212"}${Math.abs(day)}d`
}

interface TooltipRowProps {
  cycle: ResolvedCycle
  color: string
  value: number | null
  day: number
}

function CycleTooltip({
  active,
  label,
  data,
  cycles,
  total,
  anchorName,
}: {
  active?: boolean
  label?: number
  data: Array<Record<string, number | null>>
  cycles: ResolvedCycle[]
  total: number
  anchorName: string
}) {
  if (!active || label == null) return null
  const day = label as number
  const index = day - CYCLE_START_DAY
  const row = data[index] ?? {}

  const rows: TooltipRowProps[] = cycles.map((c, i) => ({
    cycle: c,
    color: colorFor(i, total),
    value: (row[c.key] as number | null) ?? null,
    day,
  }))

  const relLabel =
    day === 0
      ? `${anchorName} day`
      : day > 0
        ? `${day} days after ${anchorName}`
        : `${Math.abs(day)} days before ${anchorName}`

  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-2 font-medium text-popover-foreground">{relLabel}</div>
      <div className="flex flex-col gap-1.5">
        {rows.map(({ cycle, color, value }) => {
          const dateMs = dateForCycleDay(cycle, day)
          const projected = value == null
          return (
            <div key={cycle.key} className="flex items-center gap-2 tabular-nums">
              <span
                className="inline-block size-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span className="w-10 font-medium" style={{ color }}>
                {cycle.label}
              </span>
              <span className="w-28 text-muted-foreground">{formatDate(dateMs)}</span>
              <span className={projected ? "text-muted-foreground italic" : "font-semibold text-popover-foreground"}>
                {projected ? "projected" : `${value.toFixed(2)}x`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export interface CycleChartProps {
  defs: CycleDef[]
  /** e.g. "election" or "halving" — used in labels */
  anchorName: string
}

export function CycleChart({ defs, anchorName }: CycleChartProps) {
  const { data, cycles, yDomain, yTicks } = useMemo(() => buildCycleData(defs), [defs])
  const total = cycles.length
  const currentCycle = cycles.find((c) => c.current)

  return (
    <div className="h-110 w-full sm:h-130">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            type="number"
            dataKey="day"
            domain={[CYCLE_START_DAY, CYCLE_END_DAY]}
            ticks={[0, 365, 730, 1095, CYCLE_END_DAY]}
            tickFormatter={xTickLabel}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={{ stroke: "var(--border)" }}
            axisLine={{ stroke: "var(--border)" }}
            allowDataOverflow
          />
          <YAxis
            scale="log"
            domain={yDomain}
            ticks={yTicks}
            tickFormatter={(v: number) => (v >= 1 ? `${v}x` : `${v}x`)}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={{ stroke: "var(--border)" }}
            axisLine={{ stroke: "var(--border)" }}
            allowDataOverflow
            width={52}
          />
          {/* baseline (1x = price on the anchor day) */}
          <ReferenceLine
            y={1}
            stroke="var(--muted-foreground)"
            strokeDasharray="2 4"
            strokeOpacity={0.5}
          />
          {/* day 0 = the anchor event */}
          <ReferenceLine
            x={0}
            stroke="#f7931a"
            strokeOpacity={0.6}
            label={{
              value: anchorName,
              position: "insideTopRight",
              fill: "#f7931a",
              fontSize: 11,
            }}
          />
          {/* where real data ends for the current cycle */}
          {currentCycle?.lastDataDay != null && (
            <ReferenceLine
              x={currentCycle.lastDataDay}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{
                value: "now",
                position: "insideTopLeft",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
          )}
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: "var(--foreground)", strokeOpacity: 0.35, strokeWidth: 1 }}
            content={(props) => (
              <CycleTooltip
                active={props.active}
                label={props.label as number}
                data={data}
                cycles={cycles}
                total={total}
                anchorName={anchorName}
              />
            )}
          />
          {cycles.map((c, i) => {
            const isCurrent = c.current
            return (
              <Line
                key={c.key}
                type="monotone"
                dataKey={c.key}
                stroke={colorFor(i, total)}
                strokeWidth={isCurrent ? 2.75 : 1.5}
                strokeOpacity={isCurrent ? 1 : 0.85}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export { colorFor }
