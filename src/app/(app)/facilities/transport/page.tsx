'use client'

import { useState } from 'react'
import { ResourceScreen } from '@/components/resource/resource-screen'
import { TabSwitcher } from '@/components/resource/tab-switcher'
import {
  TRANSPORT_ROUTES,
  TRANSPORT_STOPS,
  TRANSPORT_VEHICLES,
} from '@/components/resource/defs-more'

const TABS = ['Routes', 'Vehicles', 'Stops'] as const

/**
 * The three things transport is made of, in the order they get set up: the
 * vehicles a school owns, the routes they run, and the stops along them.
 */
export default function Screen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Routes')
  const prefix = <TabSwitcher tabs={TABS} active={tab} onChange={setTab} />
  const def =
    tab === 'Vehicles' ? TRANSPORT_VEHICLES : tab === 'Stops' ? TRANSPORT_STOPS : TRANSPORT_ROUTES

  return <ResourceScreen key={tab} def={def} prefix={prefix} />
}
