'use client'

import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface Point {
  date: string
  total: number
  present: number
  percentage: number
}

/**
 * Paired bars per day: attendance taken vs. present. Mirrors the reference's
 * grouped-bar treatment — solid dark for the actual figure, a soft hatch-tone
 * for the comparison, no gridline clutter.
 */
export function AttendanceTrend({ data }: { data: Point[] }) {
  if (!data.length) {
    return (
      <div className="grid h-[240px] place-items-center">
        <p className="text-[13px] text-muted">No attendance taken yet.</p>
      </div>
    )
  }

  const rows = data.map((point) => ({
    ...point,
    absent: Math.max(point.total - point.present, 0),
    label: format(parseISO(point.date), 'EEE d'),
  }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={rows} barGap={4} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="rgb(234 236 239)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11.5, fill: 'rgb(140 144 150)', fontWeight: 600 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11.5, fill: 'rgb(140 144 150)' }}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'rgb(17 18 20 / 0.04)' }}
          contentStyle={{
            borderRadius: 14,
            border: '1px solid rgb(234 236 239)',
            boxShadow: '0 18px 44px -16px rgb(16 24 40 / 0.18)',
            fontSize: 12.5,
            fontWeight: 600,
          }}
          formatter={(value: number, name) => [
            value,
            name === 'present' ? 'Present' : 'Absent',
          ]}
        />
        <Bar dataKey="present" radius={[6, 6, 0, 0]} maxBarSize={16}>
          {rows.map((row) => (
            <Cell key={row.date} fill="rgb(17 18 20)" />
          ))}
        </Bar>
        <Bar dataKey="absent" radius={[6, 6, 0, 0]} maxBarSize={16}>
          {rows.map((row) => (
            <Cell key={row.date} fill="rgb(251 222 222)" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
