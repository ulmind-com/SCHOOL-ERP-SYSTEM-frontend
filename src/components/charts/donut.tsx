'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export interface Slice {
  name: string
  value: number
  color: string
}

/** The "Assignment Completion" ring from the reference: thick arc, label inside. */
export function Donut({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: Slice[]
  centerLabel: string
  centerValue?: string
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)

  if (!total) {
    return (
      <div className="grid h-[220px] place-items-center">
        <p className="text-[13px] text-muted">Nothing to summarise yet.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            innerRadius={62}
            outerRadius={95}
            paddingAngle={3}
            cornerRadius={9}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 14,
              border: '1px solid rgb(234 236 239)',
              boxShadow: '0 18px 44px -16px rgb(16 24 40 / 0.18)',
              fontSize: 12.5,
              fontWeight: 600,
            }}
            formatter={(value: number, name) => [
              `${value} (${Math.round((value / total) * 100)}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          {centerValue && (
            <p className="tabular text-[26px] font-extrabold leading-none text-ink">
              {centerValue}
            </p>
          )}
          <p className="mt-1 max-w-[92px] text-[12.5px] font-semibold leading-tight text-muted">
            {centerLabel}
          </p>
        </div>
      </div>
    </div>
  )
}

export function DonutLegend({ slices }: { slices: Slice[] }) {
  return (
    <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {slices.map((slice) => (
        <li key={slice.name} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: slice.color }}
            aria-hidden
          />
          {slice.name}
        </li>
      ))}
    </ul>
  )
}
