'use client'

import { createContext, useContext } from 'react'

/**
 * Lets a page open the mobile navigation drawer that the app layout owns.
 * It lives here rather than in layout.tsx because Next.js only permits a
 * layout file to export the layout itself.
 */
const MenuContext = createContext<() => void>(() => {})

export const MenuProvider = MenuContext.Provider
export const useOpenMenu = () => useContext(MenuContext)
