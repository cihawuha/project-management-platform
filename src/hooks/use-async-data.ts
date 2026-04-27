import { useState, useEffect, useCallback, useRef } from "react"

interface AsyncDataResult<T> {
  data: T | undefined
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: any[] = []
): AsyncDataResult<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    fetcherRef
      .current()
      .then((result) => {
        if (mountedRef.current) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    refetch()
    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refetch }
}
