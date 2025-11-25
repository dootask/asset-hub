import { useEffect } from "react"
import { interceptBack } from "@dootask/tools"

let interceptCount = 0
let interceptRegistered = false

function ensureInterceptRegistration() {
  if (typeof window === "undefined" || interceptRegistered) {
    return
  }

  try {
    interceptBack(() => interceptCount > 0)
    interceptRegistered = true
  } catch (error) {
    console.error("Failed to register back interception", error)
  }
}

export function useInterceptBack(active: boolean = true) {
  useEffect(() => {
    if (!active) {
      return
    }

    ensureInterceptRegistration()
    interceptCount += 1

    return () => {
      interceptCount = Math.max(0, interceptCount - 1)
    }
  }, [active])
}

