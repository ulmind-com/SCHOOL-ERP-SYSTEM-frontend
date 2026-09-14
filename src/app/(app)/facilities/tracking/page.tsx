'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import { Gauge, MapPin, Navigation, Route as RouteIcon } from 'lucide-react'
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
                    title={`${active.vehicle_number} — recorded path`}
                    subtitle={
                      path.data?.path?.length
                        ? `${path.data.path.length} points since ${
                            active.started_at
                              ? format(parseISO(active.started_at), 'h:mm a')
                              : '—'
                          }`
                        : 'Waiting for the first position'
                    }
                  />
                  <CardBody className="pt-2">
                    <TrackMap points={path.data?.path ?? []} />
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

/**
 * The recorded path, drawn as SVG against its own bounding box.
 *
 * A real basemap means an API key, a tile budget and a third-party script on
 * every page load. The shape of the route, its stops and the current position
 * are what a school office actually watches — so this draws exactly that, with
 * no key to manage and nothing to break when a quota runs out.
 */
function TrackMap({ points }: { points: { lat: number; lng: number; speed: number }[] }) {
  const geometry = useMemo(() => {
    if (points.length < 2) return null
    const lats = points.map((p) => p.lat)
    const lngs = points.map((p) => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    // Keep a margin so the end markers are never clipped, and guard the
    // degenerate case where a vehicle has not moved.
    const spanLat = Math.max(maxLat - minLat, 0.0008)
    const spanLng = Math.max(maxLng - minLng, 0.0008)
    const project = (p: { lat: number; lng: number }) => ({
      x: 6 + ((p.lng - minLng) / spanLng) * 88,
      // SVG y grows downward; latitude grows upward.
      y: 6 + ((maxLat - p.lat) / spanLat) * 88,
    })
    const projected = points.map(project)
    return {
      d: projected.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
      start: projected[0],
      end: projected[projected.length - 1],
    }
  }, [points])

  if (!geometry) {
    return (
      <div className="grid h-[280px] place-items-center rounded-field bg-surface-sunken">
        <div className="text-center">
          <Navigation className="mx-auto h-6 w-6 text-muted" aria-hidden />
          <p className="mt-2 text-[13px] text-muted">
            {points.length === 1 ? 'Waiting for the vehicle to move' : 'No positions yet'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-field bg-surface-sunken">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-[280px] w-full"
        role="img"
        aria-label={`Route path with ${points.length} recorded positions`}
      >
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0 L0 0 0 10" fill="none" stroke="rgb(234 236 239)" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        <path
          d={geometry.d}
          fill="none"
          stroke="rgb(17 18 20)"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={geometry.start.x} cy={geometry.start.y} r="1.8" fill="rgb(140 144 150)" />
        <circle cx={geometry.end.x} cy={geometry.end.y} r="2.6" fill="rgb(23 178 106)" />
        <circle cx={geometry.end.x} cy={geometry.end.y} r="4.5" fill="rgb(23 178 106)"
                opacity="0.25">
          <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
      <p className="px-3 pb-2 pt-1 text-[11.5px] text-muted">
        Start · current position. Coordinates are recorded by the driver app.
      </p>
    </div>
  )
}
