import { cn } from '../../lib/utils'

function Spinner({ className }) {
  return (
    <div className={cn('animate-spin rounded-full border-2 border-muted border-t-primary h-5 w-5', className)} />
  )
}

function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

export { Spinner, PageSpinner }
