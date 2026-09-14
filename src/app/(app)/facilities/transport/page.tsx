'use client'

import { ResourceScreen } from '@/components/resource/resource-screen'
import { TRANSPORT_ROUTES } from '@/components/resource/defs-more'

export default function Screen() {
  return <ResourceScreen def={TRANSPORT_ROUTES} />
}
