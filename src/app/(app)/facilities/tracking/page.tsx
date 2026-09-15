'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import { Gauge, MapPin, Route as RouteIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Page } from '@/components/layout/page'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface LiveVehicle {
  trip_id: string
  vehicle_number: string
  route: string
  route_id: string | null
  vehicle_type?: string
  direction: string
  driver: string
  latitude: number | null
  longitude: number | null
  speed_kmh: number
  distance_km: number
  started_at: string | null
  last_position_at: string | null
  seconds_since_update: number | null
  signal: 'live' | 'delayed' | 'lost' | 'no-fix'
  stops_reached: { stop_id: string; name: string; reached_at: string }[]
}

const SIGNAL_TONE = {
  live: 'success',
  delayed: 'warning',
  lost: 'danger',
  'no-fix': 'neutral',
} as const

/**
 * Leaflet touches `window` on import, so it can never be part of the server
 * bundle. Isolating it in its own chunk also keeps it out of every other page.
 */
const LiveMap = dynamic(() => import('@/components/map/live-map').then((m) => m.LiveMap), {
  ssr: false,
  loading: () => (
    <div className="grid h-[420px] place-items-center rounded-field bg-surface-sunken">
      <p className="text-[13px] text-muted">Loading the map…</p>
    </div>
  ),
})

export default function TrackingPage() {
  const [selected, setSelected] = useState<string | null>(null)

  const live = useQuery({
    queryKey: ['tracking-live'],
    queryFn: () => api.get<LiveVehicle[]>('/tracking/live'),
    refetchInterval: 10_000,
  })

  const vehicles = live.data ?? []
  // The first vehicle is shown without the user picking one, so the path has to
  // follow whatever is *actually* on screen — keying it off `selected` alone
  // leaves the auto-selected vehicle with an empty map.
  const active = vehicles.find((v) => v.trip_id === selected) ?? vehicles[0]

  const path = useQuery({
    queryKey: ['trip-path', active?.trip_id],
    enabled: Boolean(active?.trip_id),
    queryFn: () => api.get<any>(`/tracking/trips/${active!.trip_id}/path`),
    refetchInterval: 15_000,
  })

  // The planned line and its stops — the half of the picture that does not
  // move, and the half that is there before any bus has left the depot.
  const shape = useQuery({
    queryKey: ['route-shape', active?.route_id],
    enabled: Boolean(active?.route_id),
    staleTime: 10 * 60_000,
    queryFn: () => api.get<any>(`/tracking/routes/${active!.route_id}/shape`),
  })

  const reached = new Set((active?.stops_reached ?? []).map((s) => s.stop_id))
  const mapStops = (shape.data?.stops ?? [])
    .filter((s: any) => s.lat != null && s.lng != null)
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      order: s.order,
      reached: reached.has(s.id),
      caption: [s.pickup_time && `Pickup ${s.pickup_time}`, s.landmark]
        .filter(Boolean)
        .join(' · '),
    }))

  const mapVehicles = vehicles
    .filter((v) => v.latitude != null && v.longitude != null)
    .map((v) => ({
      id: v.trip_id,
      label: v.vehicle_number,
      lat: v.latitude as number,
      lng: v.longitude as number,
      type: (v as any).vehicle_type ?? 'bus',
      signal: v.signal,
      caption: `${v.route || 'No route'} · ${v.speed_kmh.toFixed(0)} km/h${
        v.driver ? ` · ${v.driver}` : ''
      }`,
    }))

  return (
    <Page
      title="Live Tracking"
      subtitle={
        vehicles.length
          ? `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} on the road`
          : 'Vehicles appear here once a driver starts a trip'
      }
    >
      {vehicles.length === 0 ? (
        <Card>
          <EmptyState
            icon="bus"
            title="Nothing on the road"
            description="A vehicle appears here as soon as its driver starts a trip in the driver app."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="flex max-h-[calc(100dvh-14rem)] flex-col overflow-hidden">
            <CardHeader title="On the road" subtitle="Updates every 10 seconds" />
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1">
              <ul className="space-y-2">
                {vehicles.map((vehicle) => (
                  <li key={vehicle.trip_id}>
                    <button
                      type="button"
                      onClick={() => setSelected(vehicle.trip_id)}
                      className={cn(
                        'w-full rounded-field border px-3.5 py-3 text-left transition',
                        vehicle.trip_id === (active?.trip_id ?? '')
                          ? 'border-ink/20 bg-surface-sunken'
                          : 'border-line hover:border-ink/15',
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="tabular truncate text-[14px] font-bold text-ink">
                          {vehicle.vehicle_number}
                        </span>
                        <Badge tone={SIGNAL_TONE[vehicle.signal]}>
                          {vehicle.signal === 'no-fix' ? 'No fix' : vehicle.signal}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-muted">
                        {vehicle.route || 'No route'} · {vehicle.direction}
                      </span>
                      <span className="mt-2 flex items-center gap-4 text-[12px] text-ink-soft">
                        <span className="tabular flex items-center gap-1">
                          <Gauge className="h-3 w-3 text-muted" aria-hidden />
                          {vehicle.speed_kmh.toFixed(0)} km/h
                        </span>
                        <span className="tabular flex items-center gap-1">
                          <RouteIcon className="h-3 w-3 text-muted" aria-hidden />
                          {vehicle.distance_km.toFixed(1)} km
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <div className="space-y-4">
            {active && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Stat label="Driver" value={active.driver || '—'} />
                  <Stat label="Speed" value={`${active.speed_kmh.toFixed(0)} km/h`} />
                  <Stat label="Distance" value={`${active.distance_km.toFixed(1)} km`} />
                  <Stat
                    label="Last update"
                    value={
                      active.last_position_at
                        ? `${formatDistanceToNowStrict(parseISO(active.last_position_at))} ago`
                        : 'never'
                    }
                    tone={active.signal === 'lost' ? 'danger' : undefined}
                  />
                </div>

                <Card>
                  <CardHeader
                    title={`${active.vehicle_number} — on the map`}
                    subtitle={
                      path.data?.path?.length
                        ? `${path.data.path.length} positions since ${
                            active.started_at
                              ? format(parseISO(active.started_at), 'h:mm a')
                              : '—'
                          }`
                        : 'Waiting for the first position'
                    }
                  />
                  <CardBody className="px-3 pt-2 sm:px-5">
                    <LiveMap
                      vehicles={mapVehicles}
                      stops={mapStops}
                      path={path.data?.path ?? []}
                      height={440}
                    />
                    <p className="pt-2 text-[11.5px] text-muted">
                      Dashed line and numbered pins are the planned route; the solid
                      green line is where the vehicle has actually been today.
                    </p>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Stops reached" />
                  <CardBody className="pt-2">
                    {active.stops_reached.length === 0 ? (
                      <p className="py-4 text-center text-[13px] text-muted">
                        No stop reached yet on this trip.
                      </p>
                    ) : (
                      <ol className="space-y-2">
                        {active.stops_reached.map((stop) => (
                          <li key={stop.stop_id} className="flex items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mint">
                              <MapPin className="h-4 w-4 text-ink" aria-hidden />
                            </span>
                            <span className="flex-1 text-[13.5px] font-semibold text-ink">
                              {stop.name}
                            </span>
                            <span className="tabular text-[12px] text-muted">
                              {format(parseISO(stop.reached_at), 'h:mm a')}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardBody>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </Page>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'danger'
}) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <p className="text-[12px] font-semibold text-muted">{label}</p>
      <p
        className={cn(
          'tabular mt-1 truncate text-[17px] font-extrabold',
          tone === 'danger' ? 'text-danger' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  )
}
