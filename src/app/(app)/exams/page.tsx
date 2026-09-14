'use client'

import { useState } from 'react'
import { ResourceScreen } from '@/components/resource/resource-screen'
import { TabSwitcher } from '@/components/resource/tab-switcher'
import { GradeScalesScreen } from '@/components/exams/grade-scales'
import { EXAMS } from '@/components/resource/defs-more'

const TABS = ['Exams', 'Grade Scales'] as const

export default function Screen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Exams')
  const tabs = <TabSwitcher tabs={TABS} active={tab} onChange={setTab} />

  return tab === 'Exams' ? (
    <ResourceScreen def={EXAMS} prefix={tabs} />
  ) : (
    <GradeScalesScreen prefix={tabs} />
  )
}
