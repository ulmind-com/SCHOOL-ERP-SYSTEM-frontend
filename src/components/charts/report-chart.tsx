'use client'

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'

const AXIS = { fontSize: 11.5, fill: 'rgb(140 144 150)', fontWeight: 600 }
const TOOLTIP = {
  borderRadius: 14,
  border: '1px solid rgb(234 236 239)',
  boxShadow: '0 18px 44px -16px rgb(16 24 40 / 0.18)',
  fontSize: 12.5,
  fontWeight: 600,
}

/** Renders whichever chart shape a report declares, from one component. */
export function ReportChart({ chart }: { chart: any }) {
  const data = chart.data ?? []
  if (!data.length) {
    return (
      <div className="grid h-[220px] place-items-center">
        <p className="text-[13px] text-muted">Nothing to chart yet.</p>
      </div>
    )
  }

  if (chart.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="rgb(234 236 239)" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS}
                 interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} />
          <Tooltip contentStyle={TOOLTIP} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="rgb(17 18 20)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'rgb(17 18 20)' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'grouped-bar') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={4} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="rgb(234 236 239)" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} />
          <Tooltip cursor={{ fill: 'rgb(17 18 20 / 0.04)' }} contentStyle={TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
          <Bar dataKey="billed" fill="rgb(250 238 124)" radius={[6, 6, 0, 0]} maxBarSize={26} />
          <Bar dataKey="collected" fill="rgb(17 18 20)" radius={[6, 6, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'funnel') {
    // A real funnel chart adds a dependency for five rows; proportional bars
    // read the same and stay in the design language.
    const top = Math.max(...data.map((d: any) => d.value), 1)
    return (
      <ul className="space-y-3 py-2">
        {data.map((stage: any, index: number) => (
          <li key={stage.name} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-[13px] font-semibold text-ink-soft">
              {stage.name}
            </span>
            <span className="h-8 flex-1 overflow-hidden rounded-field bg-surface-sunken">
              <span
                className="flex h-full items-center rounded-field bg-ink pl-3 text-[12px] font-bold text-white transition-all"
                style={{ width: `${Math.max((stage.value / top) * 100, 8)}%` }}
              >
                {stage.value}
              </span>
            </span>
            <span className="tabular w-14 shrink-0 text-right text-[12px] font-semibold text-muted">
              {index === 0 ? '100%' : `${Math.round((stage.value / top) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid stroke="rgb(234 236 239)" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS}
               interval={0} angle={data.length > 6 ? -30 : 0}
               textAnchor={data.length > 6 ? 'end' : 'middle'}
               height={data.length > 6 ? 62 : 30} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} />
        <Tooltip cursor={{ fill: 'rgb(17 18 20 / 0.04)' }} contentStyle={TOOLTIP} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={34}>
          {data.map((_: any, index: number) => (
            <Cell key={index} fill="rgb(17 18 20)" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
