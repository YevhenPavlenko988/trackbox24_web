import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

type Props = Omit<ComponentProps<typeof Button>, 'render' | 'nativeButton'> & { to: string }

export function LinkButton({ to, ...props }: Props) {
  return <Button nativeButton={false} render={<Link to={to} />} {...props} />
}
