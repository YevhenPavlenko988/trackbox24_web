import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const KEY = 'tb24.companyView'

type Stored = { id: number; name: string }

function read(): Stored | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}

let current: Stored | null = read()

/** Read by the API client (outside React) to add the X-Company-Id header for platform admins. */
export function getViewCompanyId(): number | null {
  return current?.id ?? null
}

type CompanyViewValue = {
  company: Stored | null
  enter: (company: Stored) => void
  exit: () => void
}

const CompanyViewContext = createContext<CompanyViewValue | null>(null)

export function CompanyViewProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [company, setCompany] = useState<Stored | null>(current)

  const persist = useCallback(
    (value: Stored | null) => {
      current = value
      try {
        if (value) sessionStorage.setItem(KEY, JSON.stringify(value))
        else sessionStorage.removeItem(KEY)
      } catch {
        // ignore
      }
      setCompany(value)
      queryClient.clear()
    },
    [queryClient],
  )

  const value = useMemo<CompanyViewValue>(
    () => ({ company, enter: (c) => persist(c), exit: () => persist(null) }),
    [company, persist],
  )

  return <CompanyViewContext.Provider value={value}>{children}</CompanyViewContext.Provider>
}

export function useCompanyView(): CompanyViewValue {
  const ctx = useContext(CompanyViewContext)
  if (!ctx) throw new Error('useCompanyView must be used inside CompanyViewProvider')
  return ctx
}
