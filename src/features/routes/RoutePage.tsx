import { Navigate, useParams } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { NotFoundPage } from '@/routes/ErrorPages'
import { useRoute } from './queries'

/**
 * Old links to a route (bookmarks, the trash): a route is shown as its trip with legs now, so this opens the leg that
 * is on now, or the first one.
 */
export function RoutePage() {
  const { id } = useParams()
  const query = useRoute(Number(id))
  if (query.isPending) return <Skeleton className="h-60 w-full" />
  const legs = query.data?.legs ?? []
  const leg = legs.find((l) => l.status === 'PREPARING' || l.status === 'IN_PROGRESS') ?? legs.find((l) => l.status === 'PLANNED') ?? legs[0]
  if (query.isError || !leg) return <NotFoundPage />
  return <Navigate to={`/trips/${leg.id}`} replace />
}
