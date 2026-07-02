import { useState, useCallback, useRef, useEffect } from 'react'

export function useDebouncedCallback(fn, delay = 300) {
  const timer = useRef(null)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return useCallback((...args) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => fnRef.current(...args), delay)
  }, [delay])
}

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
