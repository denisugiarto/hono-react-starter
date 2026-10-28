import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/common/loading-state'
import { ErrorMessage } from '@/components/common/error-message'
import { useHealth } from '../api/health.ts'

export function HealthCard() {
  const health = useHealth()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          API Health
          <Badge variant={health.data?.status === 'ok' ? 'default' : 'outline'}>{health.data?.status ?? '…'}</Badge>
        </CardTitle>
        <CardDescription>
          <code className="rounded bg-muted px-1">GET /api/health</code> via TanStack Query
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {health.isPending ? (
          <LoadingState rows={2} />
        ) : health.isError ? (
          <ErrorMessage error={health.error} />
        ) : (
          <>
            <p>
              <span className="text-muted-foreground">Database:</span> {health.data.database}
            </p>
            <p>
              <span className="text-muted-foreground">Uptime:</span> {health.data.uptime.toFixed(1)}s
            </p>
            <p>
              <span className="text-muted-foreground">Server time:</span>{' '}
              {new Date(health.data.timestamp).toLocaleString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
