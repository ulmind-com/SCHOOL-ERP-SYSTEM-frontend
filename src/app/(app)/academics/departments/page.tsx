'use client'

import { ResourceScreen } from '@/components/resource/resource-screen'
import { DEPARTMENTS } from '@/components/resource/defs'

export default function Screen() {
  return <ResourceScreen def={DEPARTMENTS} />
}
