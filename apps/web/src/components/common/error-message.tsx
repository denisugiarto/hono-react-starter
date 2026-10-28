import { OctagonXIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { describeError } from '@/lib/api/request'

type Props = { error: unknown; title?: string; className?: string }

/** Tampilkan error API/umum secara konsisten (pesan + ref requestId untuk 500). */
export function ErrorMessage({ error, title, className }: Props) {
  return (
    <Alert variant="destructive" className={className}>
      <OctagonXIcon />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{describeError(error)}</AlertDescription>
    </Alert>
  )
}
