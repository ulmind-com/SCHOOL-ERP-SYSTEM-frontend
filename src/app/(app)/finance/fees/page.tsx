'use client'

import { useState } from 'react'
import { ResourceScreen } from '@/components/resource/resource-screen'
import { TabSwitcher } from '@/components/resource/tab-switcher'
import { FeeStructuresScreen } from '@/components/finance/fee-structures'
import { FEE_HEADS } from '@/components/resource/defs'

const TABS = ['Structures', 'Fee Heads'] as const

/**
 * Structures first: a fee head on its own charges nobody, and the structure is
 * what an invoice run reads.
 */
export default function Screen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Structures')
  const tabs = <TabSwitcher tabs={TABS} active={tab} onChange={setTab} />

  return tab === 'Structures' ? (
    <FeeStructuresScreen prefix={tabs} />
  ) : (
    <ResourceScreen def={FEE_HEADS} prefix={tabs} />
  )
}
