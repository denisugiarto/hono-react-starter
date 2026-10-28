import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { fetchHello } from '../api/health.ts'

export function HelloCard() {
  const [name, setName] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const sayHello = async () => {
    try {
      const data = await fetchHello(name)
      setResult(`${data.greeting} — ${data.from}`)
    } catch {
      setResult('Gagal memanggil /api/hello')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello API</CardTitle>
        <CardDescription>
          Panggil <code className="rounded bg-muted px-1">GET /api/hello?name=…</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field>
          <FieldLabel htmlFor="hello-name">Nama</FieldLabel>
          <Input
            id="hello-name"
            placeholder="World"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sayHello()}
          />
        </Field>
        {result && <p className="rounded-md border bg-muted/40 p-3 text-sm">{result}</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={sayHello} className="w-full">
          Kirim
        </Button>
      </CardFooter>
    </Card>
  )
}
