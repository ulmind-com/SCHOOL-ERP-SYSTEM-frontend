'use client'

import { NotBuiltYet } from '@/components/layout/not-built'
import { Page } from '@/components/layout/page'

export default function Screen() {
  return (
    <Page title="Help Center">
      <NotBuiltYet icon="life-buoy" title="Help Center" description="Guides and support for your team. In the meantime, the interactive API reference documents every endpoint." endpoints={['GET /docs']} />
    </Page>
  )
}
