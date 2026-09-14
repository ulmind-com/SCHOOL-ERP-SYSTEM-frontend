'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { tokens } from '@/lib/api'

/**
 * Downloads an authenticated file.
 *
 * Every document endpoint needs a bearer token, so a plain `<a href>` cannot
 * fetch it — the browser sends no Authorization header. This does the fetch,
 * turns the response into a blob and clicks a synthetic link.
 */
export function useDownload() {
  const [pending, setPending] = useState<string | null>(null)

  async function download(path: string, filename: string, options: { open?: boolean } = {}) {
    setPending(path)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? ''
      const response = await fetch(`${base}/api/v1${path}`, {
        headers: {
          Authorization: `Bearer ${tokens.access()}`,
          ...(tokens.tenant() ? { 'X-Tenant': tokens.tenant()! } : {}),
        },
      })
      if (!response.ok) {
        let detail = 'Could not produce that document'
        try {
          detail = (await response.json()).detail ?? detail
        } catch {
          /* a non-JSON error body is not worth surfacing raw */
        }
        throw new Error(detail)
      }

      const url = URL.createObjectURL(await response.blob())
      if (options.open) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
      }
      // Give the tab a moment to take the blob before it is revoked.
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setPending(null)
    }
  }

  return { download, pending }
}
