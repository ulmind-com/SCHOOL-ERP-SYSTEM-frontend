'use client'

import { LottieSvg } from 'lottie-react'
import animation from '@/assets/Books.json'

/**
 * Isolated so `next/dynamic` can put the player and the 77 KB animation in
 * their own chunk. Neither belongs in the bundle that has to arrive before the
 * app can paint — a loader that makes the wait longer is not a loader.
 *
 * `LottieSvg` rather than the full build: the animation is plain shape layers,
 * so the canvas and HTML renderers have nothing to add. Not `LottieLight`,
 * which is smaller again but throws "n is not a constructor" once minified —
 * it works in development and fails in production, which is the worst way for
 * a loader to fail.
 */
export default function LottiePlayer({ size }: { size: number }) {
  return (
    <LottieSvg
      src={animation}
      loop
      autoplay
      // The source is 126 × 200 and an animation fills whatever box it is given,
      // so height leads and width follows to keep it from stretching.
      style={{ height: size, width: (size * 126) / 200 }}
      aria-hidden
    />
  )
}
