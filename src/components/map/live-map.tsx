'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapVehicle {
  id: string
  label: string
  lat: number
  lng: number
  type?: string
  heading?: number
  speed_kmh?: number
  signal?: 'live' | 'delayed' | 'lost' | 'no-fix'
  caption?: string
}

export interface MapStop {
  id: string
  name: string
  lat: number
  lng: number
  order?: number
  reached?: boolean
  mine?: boolean
  caption?: string
}

/** One second is the refresh floor upstream, so ease across a little longer. */
const GLIDE_MS = 1400

const VEHICLE_GLYPH: Record<string, string> = {
  bus: '🚌',
  mini_bus: '🚐',
  van: '🚐',
  tempo: '🚚',
  car: '🚗',
  auto: '🛺',
}

const SIGNAL_RING: Record<string, string> = {
  live: 'rgb(23 178 106)',
  delayed: 'rgb(214 158 46)',
  lost: 'rgb(217 63 63)',
  'no-fix': 'rgb(140 144 150)',
}

function vehicleIcon(vehicle: MapVehicle) {
  const ring = SIGNAL_RING[vehicle.signal ?? 'live'] ?? SIGNAL_RING.live
  return L.divIcon({
    className: 'scholarly-vehicle',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `
      <span class="sv-wrap" style="--ring:${ring}">
        ${vehicle.signal === 'live' ? '<span class="sv-pulse"></span>' : ''}
        <span class="sv-dot">${VEHICLE_GLYPH[vehicle.type ?? 'bus'] ?? '🚌'}</span>
      </span>`,
  })
}

function stopIcon(stop: MapStop) {
  const tone = stop.mine
    ? 'background:rgb(17 18 20);color:#fff'
    : stop.reached
      ? 'background:rgb(23 178 106);color:#fff'
      : 'background:#fff;color:rgb(74 77 82)'
  return L.divIcon({
    className: 'scholarly-stop',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<span class="sv-stop" style="${tone}">${stop.order ?? '•'}</span>`,
  })
}

/**
 * A real basemap, drawn from OpenStreetMap.
 *
 * No key to manage and no quota to run out of, which is the whole reason a
 * school can leave this screen open on the office wall all morning. The vehicle
 * marker eases between fixes rather than teleporting — a bus that jumps every
 * ten seconds reads as a bug, and the smooth version is also the honest one,
 * since the vehicle really was somewhere between the two points.
 */
export function LiveMap({
  vehicles,
  stops = [],
  path = [],
  height = 420,
  follow = true,
}: {
  vehicles: MapVehicle[]
  stops?: MapStop[]
  path?: { lat: number; lng: number }[]
  height?: number
  follow?: boolean
}) {
  const host = useRef<HTMLDivElement | null>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<Map<string, L.Marker>>(new Map())
  const glides = useRef<Map<string, number>>(new Map())
  const layers = useRef<L.LayerGroup | null>(null)
  const fitted = useRef(false)

  // ── the map itself, created once ────────────────────────────────────────
  useEffect(() => {
    if (!host.current || map.current) return
    const instance = L.map(host.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView([22.5726, 88.3639], 12) // Kolkata, until something real arrives

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(instance)

    // Wheel zoom only once the map has been clicked, so the page still scrolls.
    instance.on('click', () => instance.scrollWheelZoom.enable())
    instance.on('mouseout', () => instance.scrollWheelZoom.disable())

    layers.current = L.layerGroup().addTo(instance)
    map.current = instance

    return () => {
      instance.remove()
      map.current = null
      markers.current.clear()
    }
  }, [])

  // ── the static half: route line and stops ───────────────────────────────
  useEffect(() => {
    const group = layers.current
    if (!group) return
    group.clearLayers()

    const shape = stops.filter((s) => s.lat != null && s.lng != null)
    if (shape.length > 1) {
      L.polyline(
        shape.map((s) => [s.lat, s.lng] as [number, number]),
        { color: 'rgb(17 18 20)', weight: 3, opacity: 0.35, dashArray: '7 7' },
      ).addTo(group)
    }
    for (const stop of shape) {
      L.marker([stop.lat, stop.lng], { icon: stopIcon(stop) })
        .bindTooltip(`<b>${stop.name}</b>${stop.caption ? `<br>${stop.caption}` : ''}`, {
          direction: 'top',
          offset: [0, -12],
        })
        .addTo(group)
    }

    const travelled = path.filter((p) => p.lat != null && p.lng != null)
    if (travelled.length > 1) {
      L.polyline(
        travelled.map((p) => [p.lat, p.lng] as [number, number]),
        { color: 'rgb(23 178 106)', weight: 4, opacity: 0.9, lineJoin: 'round' },
      ).addTo(group)
    }
  }, [stops, path])

  // ── the moving half ─────────────────────────────────────────────────────
  useEffect(() => {
    const instance = map.current
    if (!instance) return

    const seen = new Set<string>()
    for (const vehicle of vehicles) {
      if (vehicle.lat == null || vehicle.lng == null) continue
      seen.add(vehicle.id)
      const target = L.latLng(vehicle.lat, vehicle.lng)
      const tooltip = `<b>${vehicle.label}</b>${vehicle.caption ? `<br>${vehicle.caption}` : ''}`

      let marker = markers.current.get(vehicle.id)
      if (!marker) {
        marker = L.marker(target, { icon: vehicleIcon(vehicle), zIndexOffset: 500 })
          .bindTooltip(tooltip, { direction: 'top', offset: [0, -18] })
          .addTo(instance)
        markers.current.set(vehicle.id, marker)
        continue
      }

      marker.setIcon(vehicleIcon(vehicle))
      marker.setTooltipContent(tooltip)

      const from = marker.getLatLng()
      if (from.equals(target)) continue

      // Ease from the last fix to this one.
      cancelAnimationFrame(glides.current.get(vehicle.id) ?? 0)
      const started = performance.now()
      const step = (now: number) => {
        const t = Math.min((now - started) / GLIDE_MS, 1)
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
        marker!.setLatLng(
          L.latLng(
            from.lat + (target.lat - from.lat) * eased,
            from.lng + (target.lng - from.lng) * eased,
          ),
        )
        if (t < 1) glides.current.set(vehicle.id, requestAnimationFrame(step))
      }
      glides.current.set(vehicle.id, requestAnimationFrame(step))
    }

    for (const [id, marker] of markers.current) {
      if (seen.has(id)) continue
      marker.remove()
      markers.current.delete(id)
    }

    // Frame everything once, then leave the view alone — a map that re-centres
    // every ten seconds cannot be panned.
    if (!follow || fitted.current) return
    const points: L.LatLngExpression[] = [
      ...vehicles
        .filter((v) => v.lat != null)
        .map((v) => [v.lat, v.lng] as [number, number]),
      ...stops
        .filter((s) => s.lat != null)
        .map((s) => [s.lat, s.lng] as [number, number]),
    ]
    if (points.length === 0) return
    if (points.length === 1) instance.setView(points[0], 15)
    else instance.fitBounds(L.latLngBounds(points).pad(0.25))
    fitted.current = true
  }, [vehicles, stops, follow])

  return (
    <div
      ref={host}
      style={{ height }}
      className="w-full overflow-hidden rounded-field bg-surface-sunken"
      role="application"
      aria-label="Live vehicle map"
    />
  )
}
