'use client'

import { useState } from 'react'
import { ResourceScreen } from '@/components/resource/resource-screen'
import { TabSwitcher } from '@/components/resource/tab-switcher'
import { CLASSES, SECTIONS } from '@/components/resource/defs'

const TABS = ['Classes', 'Sections'] as const

/**
 * One screen for both, because a class without its sections is only half the
 * answer — and the sections list was otherwise unreachable from the sidebar.
 */
export default function Screen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Classes')
  const tabs = <TabSwitcher tabs={TABS} active={tab} onChange={setTab} />

  return tab === 'Classes' ? (
    <ResourceScreen def={CLASSES} prefix={tabs} />
  ) : (
    <ResourceScreen def={SECTIONS} prefix={tabs} />
  )
}
