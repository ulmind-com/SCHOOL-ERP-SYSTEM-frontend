'use client'

import { ResourceScreen } from '@/components/resource/resource-screen'
import { HOSTELS } from '@/components/resource/defs-more'

export default function Screen() {
  return <ResourceScreen def={HOSTELS} />
}
