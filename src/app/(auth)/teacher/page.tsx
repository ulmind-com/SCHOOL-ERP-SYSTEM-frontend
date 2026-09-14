'use client'

import { PortalSignIn } from '@/components/layout/portal-sign-in'

export default function TeacherSignInPage() {
  return (
    <PortalSignIn
      copy={{
        heading: 'Teacher & staff sign-in',
        intro: 'Registers, marks, assignments and your own record.',
        identifierLabel: 'Email or phone',
        identifierHint: 'The address the institution issued you.',
        home: '/dashboard',
        bullets: [
          'Take the register and enter marks for your classes',
          'Set homework and grade what comes back',
          'Only the screens your role includes — nothing else',
        ],
      }}
    />
  )
}
