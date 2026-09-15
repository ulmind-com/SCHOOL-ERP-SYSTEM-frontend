'use client'

import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import { Bus, Clock, MapPin, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Loader } from '@/components/ui/loader'
import { Page } from '@/components/layout/page'
import { api } from '@/lib/api'

const LiveMap = dynamic(
  () => import('@/components/map/live-map').then((m) => m.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[380px] place-items-center rounded-field bg-surface-sunken">
        <p className="text-[13px] text-muted">Loading the map…</p>
      </div>
    ),
  },
)

interface Rider {
  student_id: string
  student_name: string
  route_id: string | null
  stop_name: string
  stop_lat: number | null
  stop_lng: number | null
  pickup_time: string
  drop_time: string
  direction: string
}

const SIGNAL_TONE = {
  live: 'success',
  delayed: 'warning',
  lost: 'danger',
  'no-fix': 'neutral',
} as const

/**
 * Where my child's bus is.
 *
 * The office screen is a fleet console; this is one question asked by someone
 * standing at a gate. So the stop they are standing at is on the map too, and
 * the page says plainly when no bus is running rather than showing an empty one.
 */
export default function MyBusPage() {
  const { data, isLoading } = useQuery<{
    vehicles: any[]
    riders: Rider[]
    detail: string
  }>({
    queryKey: ['my-bus'],
    queryFn: () => api.get('/tracking/my-bus'),
    refetchInterval: 10_000,
  })

  const vehicles = data?.vehicles ?? []
  const riders = data?.riders ?? []
  const routeId =
    vehicles[0]?.route_id ?? riders.find((r) => r.route_id)?.route_id ?? null

  const shape = useQuery({
    queryKey: ['route-shape', routeId],
    enabled: Boolean(routeId),
    staleTime: 10 * 60_000,
    queryFn: () => api.get<any>(`/tracking/routes/${routeId}/shape`),
  })

  if (isLoading) {
    return (
      <Page title="My Bus">
        <Loader message="Finding the bus…" />
      </Page>
    )
  }

  const myStops = new Set(riders.map((r) => r.stop_name).filter(Boolean))
  const mapStops = (shape.data?.stops ?? [])
    .filter((s: any) => s.lat != null && s.lng != null)
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      order: s.order,
      mine: myStops.has(s.name),
      caption: [
        myStops.has(s.name) ? 'Your stop' : '',
        s.pickup_time && `Pickup ${s.pickup_time}`,
        s.drop_time && `Drop ${s.drop_time}`,
      ]
        .filter(Boolean)
        .join(' · '),
    }))

  const mapVehicles = vehicles
    .filter((v) => v.latitude != null && v.longitude != null)
    .map((v) => ({
      id: v.trip_id,
      label: v.vehicle_number,
      lat: v.latitude,
      lng: v.longitude,
      type: v.vehicle_type ?? 'bus',
      signal: v.signal,
      caption: `${v.route || ''} · ${Number(v.speed_kmh ?? 0).toFixed(0)} km/h`,
    }))

  return (
    <Page title="My Bus" subtitle="Where the school transport is right now">
      {riders.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="bus"
              title="No transport allocated"
              description="The school office assigns a route and a stop. Ask them if you expected one."
            />
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card>
              <CardHeader
                title={
                  vehicles.length
                    ? `${vehicles[0].vehicle_number} is on the road`
                    : 'Not running'
                }
                subtitle={
                  vehicles.length
                    ? `${vehicles[0].route || 'Route'} · ${vehicles[0].direction === 'drop' ? 'afternoon drop' : 'morning pickup'}`
                    : data?.detail || 'The bus is not out at the moment'
                }
                action={
                  vehicles.length ? (
                    <Badge
                      tone={SIGNAL_TONE[vehicles[0].signal as keyof typeof SIGNAL_TONE]}
                    >
                      {vehicles[0].signal === 'no-fix' ? 'No fix' : vehicles[0].signal}
                    </Badge>
                  ) : undefined
                }
              />
              <CardBody className="px-3 pt-2 sm:px-5">
                <LiveMap vehicles={mapVehicles} stops={mapStops} height={400} />
                <p className="pt-2 text-[11.5px] text-muted">
                  {vehicles.length
                    ? `Position updated ${
                        vehicles[0].last_position_at
                          ? formatDistanceToNowStrict(
                              parseISO(vehicles[0].last_position_at),
                            ) + ' ago'
                          : 'never'
                      }. Your stop is the dark pin.`
                    : 'The route and your stop are shown. The bus appears here as soon as the driver starts the trip.'}
                </p>
              </CardBody>
            </Card>

            <div className="space-y-4">
              {riders.map((rider) => (
                <Card key={rider.student_id}>
                  <CardHeader
                    title={rider.student_name || 'Your child'}
                    subtitle={
                      rider.direction === 'both' ? 'Pickup and drop' : rider.direction
                    }
                  />
                  <CardBody className="space-y-2.5 pt-2">
                    <p className="flex items-center gap-2 text-[13.5px] text-ink">
                      <MapPin className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                      <span className="font-bold">
                        {rider.stop_name || 'No stop set'}
                      </span>
                    </p>
                    {(rider.pickup_time || rider.drop_time) && (
                      <p className="flex flex-wrap items-center gap-x-3 text-[12.5px] text-muted">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {rider.pickup_time && <span>Pickup {rider.pickup_time}</span>}
                        {rider.drop_time && <span>Drop {rider.drop_time}</span>}
                      </p>
                    )}
                  </CardBody>
                </Card>
              ))}

              {vehicles.length > 0 && (
                <Card>
                  <CardHeader title="On board" />
                  <CardBody className="space-y-2.5 pt-2">
                    <p className="flex items-center gap-2 text-[13.5px] text-ink">
                      <Bus className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                      {vehicles[0].vehicle_model || vehicles[0].vehicle_number}
                    </p>
                    {vehicles[0].driver && (
                      <p className="text-[13px] text-ink-soft">
                        Driver:{' '}
                        <span className="font-semibold">{vehicles[0].driver}</span>
                      </p>
                    )}
                    {vehicles[0].driver_phone && (
                      <a
                        href={`tel:${vehicles[0].driver_phone}`}
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline-offset-4 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden />
                        {vehicles[0].driver_phone}
                      </a>
                    )}
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </Page>
  )
}
