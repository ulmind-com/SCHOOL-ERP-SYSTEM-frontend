'use client'

import { ResourceScreen } from '@/components/resource/resource-screen'
import { LEAVE_REQUESTS } from '@/components/resource/defs-more'

export default function Screen() {
  return <ResourceScreen def={LEAVE_REQUESTS} />
}
