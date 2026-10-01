import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import '@/lib/i18n'
import './index.css'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { CompanyViewProvider } from '@/features/auth/companyView'
import { router } from '@/routes/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CompanyViewProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </CompanyViewProvider>
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
)
