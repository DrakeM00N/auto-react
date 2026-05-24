import { useEffect, useRef, useState } from 'react'

// Animates from 0 to `target` over `duration` ms with an ease-out cubic.
// Returns the rounded current value, suitable for direct rendering.
// Respects prefers-reduced-motion (snaps to target immediately).
export function useCountUp(target, duration = 900) {
  const numericTarget = typeof target === 'number' ? target : Number(target) || 0
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const [value, setValue] = useState(() => (prefersReduced ? numericTarget : 0))
  const rafRef = useRef(null)

  // Syncing external value -> internal animated state. setValue calls inside
  // the effect body are the documented sync pattern for this case; the lint
  // rule is a false positive here, same as for DataContext.loadData.
  useEffect(() => {
    if (prefersReduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(numericTarget)
      return
    }
    if (numericTarget === 0) {
      setValue(0)
      return
    }

    let start = null
    const tick = (now) => {
      if (start === null) start = now
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setValue(Math.round(numericTarget * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [numericTarget, duration, prefersReduced])

  return value
}
