'use client'

import { NotBuiltYet } from '@/components/layout/not-built'

export default function Screen() {
  return (
    <div className="space-y-6">
      <h1 className="text-[28px] font-extrabold tracking-tight text-white">Billing</h1>
      <NotBuiltYet
        dark
        icon="receipt"
        title="Billing"
        description="Platform invoices raised against institutions. The data model and collection exist; this screen is not built yet."
        endpoints={['GET /platform/tenants/{id}']}
      />
    </div>
  )
}
