'use client'

import { PortalSignIn } from '@/components/layout/portal-sign-in'

export default function StudentSignInPage() {
  return (
    <PortalSignIn
      copy={{
        heading: 'Student sign-in',
        intro: 'Your attendance, marks, homework and fees, in one place.',
        identifierLabel: 'Email or phone',
        identifierHint: 'Whatever your school has on your record.',
        home: '/portal/me',
        bullets: [
          'See your attendance day by day and your marks as they are entered',
          'Hand in homework and read your teacher’s notes',
          'Check what fees are due and pay them',
        ],
      }}
    />
  )
}
