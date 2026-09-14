'use client'

import { PortalSignIn } from '@/components/layout/portal-sign-in'

export default function ParentSignInPage() {
  return (
    <PortalSignIn
      copy={{
        heading: 'Parent sign-in',
        intro: 'Follow your child’s progress and settle their fees.',
        identifierLabel: 'Email or phone',
        identifierHint: 'The number or address the school has for you.',
        home: '/portal/me',
        bullets: [
          'Attendance, marks and homework for each of your children',
          'Every invoice and receipt, with the year ahead laid out',
          'Pay online, or see the receipt for what you paid at the office',
        ],
      }}
    />
  )
}
