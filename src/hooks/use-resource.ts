'use client'

import { useCallback, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, api } from '@/lib/api'
import type { Paged } from '@/lib/types'

export interface ListState {
  page: number
  pageSize: number
  search: string
  sortBy?: string
  sortDir: 'asc' | 'desc'
  filters: Record<string, string>
}

/**
 * The list-screen contract shared by every resource: paging, debounce-free
 * search, sorting and filters, all mapped onto the API's query shape.
 */
export function useResourceList<T>(
  path: string,
  initial: Partial<ListState> = {},
  options: { enabled?: boolean } = {},
) {
  const [state, setState] = useState<ListState>({
    page: 1,
    pageSize: 25,
    search: '',
    sortDir: 'asc',
    filters: {},
    ...initial,
  })

  const query = useQuery({
    queryKey: [path, state],
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.get<Paged<T>>(path, {
        page: state.page,
        page_size: state.pageSize,
        search: state.search,
        sort_by: state.sortBy,
        sort_dir: state.sortDir,
        ...state.filters,
      }),
  })

  const setSearch = useCallback((search: string) => {
    setState((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  const setFilter = useCallback((key: string, value: string) => {
    setState((prev) => ({
      ...prev,
      page: 1,
      filters: { ...prev.filters, [key]: value },
    }))
  }, [])

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page }))
  }, [])

  const toggleSort = useCallback((key: string) => {
    setState((prev) => ({
      ...prev,
      page: 1,
      sortBy: key,
      sortDir: prev.sortBy === key && prev.sortDir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const activeFilters = useMemo(
    () => Object.values(state.filters).filter(Boolean).length,
    [state.filters],
  )

  return { ...query, state, setSearch, setFilter, setPage, toggleSort, activeFilters }
}

export function useCreate<T>(path: string, invalidate: string[] = []) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown) => api.post<T>(path, body),
    onSuccess: () => {
      for (const key of [path, ...invalidate]) {
        void client.invalidateQueries({ queryKey: [key] })
      }
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not save')
    },
  })
}

export function useUpdate<T>(path: string, invalidate: string[] = []) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      api.patch<T>(`${path}/${id}`, body),
    onSuccess: () => {
      for (const key of [path, ...invalidate]) {
        void client.invalidateQueries({ queryKey: [key] })
      }
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not save')
    },
  })
}

export function useRemove(path: string, invalidate: string[] = []) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`${path}/${id}`),
    onSuccess: () => {
      toast.success('Deleted')
      for (const key of [path, ...invalidate]) {
        void client.invalidateQueries({ queryKey: [key] })
      }
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not delete')
    },
  })
}

/** Small helper for dropdowns that need the full list of something. */
export function useOptions<T = any>(path: string, query: Record<string, any> = {}) {
  return useQuery({
    queryKey: ['options', path, query],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const result = await api.get<Paged<T>>(path, { page_size: 200, ...query })
      return result.items
    },
  })
}
