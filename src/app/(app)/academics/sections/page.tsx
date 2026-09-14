'use client'

import { ResourceScreen } from '@/components/resource/resource-screen'
import { SECTIONS } from '@/components/resource/defs'

export default function Screen() {
  return <ResourceScreen def={SECTIONS} />
}
