'use client'

import { useOpenMenu } from './menu-context'
import { Topbar } from './topbar'

/** Standard page frame: topbar, then content on the canvas. */
export function Page({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const openMenu = useOpenMenu()
  return (
    <div className="space-y-5">
      <Topbar title={title} subtitle={subtitle} onMenu={openMenu} actions={actions} />
      <div className="animate-fade-up space-y-5">{children}</div>
    </div>
  )
}
