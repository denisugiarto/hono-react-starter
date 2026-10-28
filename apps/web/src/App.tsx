import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { getJwtToken, signIn, signOut, signUp, useSession } from '@/lib/auth-client'
import {
  notesKeys,
  useCreateNote,
  useDeleteNote,
  useNotes,
  useToggleNote,
} from '@/lib/api/notes'
import { useAdminUsers } from '@/lib/api/admin'
import { describeError, request } from '@/lib/api/request'
import {
  can,
  healthResponseSchema,
  helloResponseSchema,
  noteCreateSchema,
  signInSchema,
  signUpSchema,
  type NoteCreateInput,
  type SignUpInput,
} from '@hono-react-starter/shared'

const STACK = [
  'Hono',
  'React',
  'Vite',
  'Bun',
  'Tailwind CSS',
  'shadcn/ui',
  'TypeScript',
  'PostgreSQL',
  'Drizzle',
  'TanStack Query',
  'React Hook Form',
  'Zod',
]

function App() {
  // ------------------------------------------------------------------
  // Sesi & RBAC
  // ------------------------------------------------------------------
  const { data: session, isPending: sessionPending } = useSession()
  const role = session?.user.role
  const isAdmin = role === 'admin'
  // RBAC berbasis permission (shared dengan server): tampilkan panel admin
  // hanya bila role punya permission user:list.
  const canListUsers = can(role, { user: ['list'] })
  const queryClient = useQueryClient()

  // Data per-user (notes, admin) dibuang dari cache saat keluar agar tidak
  // bocor ke sesi berikutnya di browser yang sama.
  const doSignOut = async () => {
    await signOut()
    queryClient.removeQueries({ queryKey: notesKeys.all })
    queryClient.removeQueries({ queryKey: ['admin'] })
    setJwt(null)
  }

  // JWT untuk API client (GET /api/auth/token) — demo
  const [jwt, setJwt] = useState<string | null>(null)
  const [jwtError, setJwtError] = useState<string | null>(null)
  const issueJwt = async () => {
    setJwtError(null)
    try {
      setJwt(await getJwtToken())
    } catch (err) {
      setJwtError(err instanceof Error ? err.message : 'Gagal membuat token')
    }
  }

  // ------------------------------------------------------------------
  // Form autentikasi (React Hook Form + Zod)
  // ------------------------------------------------------------------
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authError, setAuthError] = useState<string | null>(null)

  const authSchema = authMode === 'signin' ? signInSchema : signUpSchema
  // Form selalu berisi field name; saat mode 'signin' schema mengabaikannya.
  // Cast resolver karena tipe schema berubah mengikuti mode.
  const authForm = useForm<SignUpInput>({
    resolver: zodResolver(authSchema) as unknown as Resolver<SignUpInput>,
    defaultValues: { name: '', email: '', password: '' },
  })

  const switchAuthMode = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setAuthError(null)
    authForm.clearErrors()
  }

  const doAuth = async (values: SignUpInput) => {
    setAuthError(null)
    const res =
      authMode === 'signup'
        ? await signUp.email({
            email: values.email,
            password: values.password,
            name: values.name,
          })
        : await signIn.email({ email: values.email, password: values.password })
    if (res.error) {
      setAuthError(res.error.message ?? 'Gagal autentikasi')
      return
    }
    authForm.reset()
    queryClient.invalidateQueries({ queryKey: notesKeys.all })
  }

  // ------------------------------------------------------------------
  // Notes (TanStack Query)
  // ------------------------------------------------------------------
  const notesQuery = useNotes(Boolean(session))
  const createNote = useCreateNote()
  const toggleNote = useToggleNote()
  const deleteNote = useDeleteNote()

  // useForm generik 3 param: input (field form) → output (hasil parse zod,
  // content selalu string karena default ''). Ini pola resmi zodResolver + RHF.
  const noteForm = useForm<
    z.input<typeof noteCreateSchema>,
    any,
    z.output<typeof noteCreateSchema>
  >({
    resolver: zodResolver(noteCreateSchema),
    defaultValues: { title: '', content: '' },
  })

  const onCreateNote = (values: NoteCreateInput) => {
    createNote.mutate(values, { onSuccess: () => noteForm.reset() })
  }

  // ------------------------------------------------------------------
  // Panel admin (TanStack Query, aktif hanya untuk admin)
  // ------------------------------------------------------------------
  const adminQuery = useAdminUsers(canListUsers)

  // ------------------------------------------------------------------
  // Health (TanStack Query) & Hello (demo manual)
  // ------------------------------------------------------------------
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: async () => healthResponseSchema.parse(await request<unknown>('/api/health')),
  })
  const [hello, setHello] = useState<string | null>(null)
  const [helloName, setHelloName] = useState('')

  const sayHello = async () => {
    try {
      const data = helloResponseSchema.parse(
        await request<unknown>(`/api/hello?name=${encodeURIComponent(helloName || 'World')}`),
      )
      setHello(`${data.greeting} — ${data.from}`)
    } catch {
      setHello('Gagal memanggil /api/hello')
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {STACK.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Hono + React Fullstack Starter
        </h1>
        <p className="max-w-xl text-muted-foreground text-pretty">
          Satu dev server untuk React (Vite) dan API (Hono), dijalankan dengan Bun.
          Data dari PostgreSQL via Drizzle, state server pakai TanStack Query,
          form pakai React Hook Form + Zod.
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              API Health
              <Badge
                variant={
                  healthQuery.data?.status === 'ok' ? 'default' : 'outline'
                }
              >
                {healthQuery.data?.status ?? '…'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Query via TanStack Query:{' '}
              <code className="rounded bg-muted px-1">useQuery</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {healthQuery.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : healthQuery.isError ? (
              <p className="text-destructive">{describeError(healthQuery.error)}</p>
            ) : healthQuery.data ? (
              <>
                <p>
                  <span className="text-muted-foreground">Uptime:</span>{' '}
                  {healthQuery.data.uptime.toFixed(1)}s
                </p>
                <p>
                  <span className="text-muted-foreground">Server time:</span>{' '}
                  {new Date(healthQuery.data.timestamp).toLocaleString()}
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hello API</CardTitle>
            <CardDescription>
              Panggil <code className="rounded bg-muted px-1">GET /api/hello?name=…</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                placeholder="World"
                value={helloName}
                onChange={(e) => setHelloName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sayHello()}
              />
            </div>
            {hello && (
              <p className="rounded-md border bg-muted/40 p-3 text-sm">{hello}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={sayHello} className="w-full">
              Kirim
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Autentikasi — React Hook Form + Zod + Better Auth */}
      {/* ------------------------------------------------------------------ */}
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Autentikasi
            <Badge variant={session ? 'default' : 'outline'}>
              {session ? 'Masuk' : 'Belum masuk'}
            </Badge>
            {session && (
              <Badge variant={isAdmin ? 'destructive' : 'secondary'}>
                {isAdmin ? 'Admin' : 'User'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            React Hook Form + Zod (validasi) · Better Auth (sesi cookie + JWT) · RBAC permission
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionPending ? (
            <Skeleton className="h-8 w-full" />
          ) : session ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{session.user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
                <Button variant="outline" onClick={doSignOut}>
                  Keluar
                </Button>
              </div>

              <div className="space-y-2 rounded-md border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    JWT untuk API client —{' '}
                    <span className="text-muted-foreground">GET /api/auth/token</span>
                  </p>
                  <Button variant="outline" size="sm" onClick={issueJwt}>
                    {jwt ? 'Perbarui token' : 'Buat token'}
                  </Button>
                </div>
                {jwtError && <p className="text-sm text-destructive">{jwtError}</p>}
                {jwt && (
                  <>
                    <code className="block truncate rounded bg-muted px-2 py-1 text-xs">
                      {jwt}
                    </code>
                    <p className="text-xs text-muted-foreground">
                      Berlaku 15 menit. Contoh:{' '}
                      <code className="rounded bg-muted px-1">
                        curl -H "Authorization: Bearer …" /api/notes
                      </code>
                    </p>
                  </>
                )}
              </div>

              {canListUsers && (
                <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                  <p className="text-sm font-medium">
                    Panel Admin —{' '}
                    <span className="text-muted-foreground">GET /api/admin/users</span>
                  </p>
                  {adminQuery.isPending ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : adminQuery.isError ? (
                    <p className="text-sm text-destructive">
                      {describeError(adminQuery.error)}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {adminQuery.data?.map((u) => (
                        <li
                          key={u.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="truncate">
                            {u.name}{' '}
                            <span className="text-muted-foreground">({u.email})</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <Badge
                              variant={
                                u.role === 'admin' ? 'destructive' : 'secondary'
                              }
                            >
                              {u.role ?? 'user'}
                            </Badge>
                            {u.banned && (
                              <Badge variant="outline" className="text-destructive">
                                banned
                              </Badge>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          ) : (
            <form
              onSubmit={authForm.handleSubmit(doAuth)}
              className="space-y-4"
              noValidate
            >
              {authMode === 'signup' && (
                <div className="grid gap-2">
                  <Label htmlFor="auth-name">Nama</Label>
                  <Input
                    id="auth-name"
                    placeholder="Budi"
                    {...authForm.register('name')}
                  />
                  {authForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {authForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="budi@example.com"
                  {...authForm.register('email')}
                />
                {authForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {authForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  {...authForm.register('password')}
                />
                {authForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {authForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {authError && <p className="text-sm text-destructive">{authError}</p>}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={authForm.formState.isSubmitting}
                >
                  {authMode === 'signin' ? 'Masuk' : 'Daftar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    switchAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                  }
                >
                  {authMode === 'signin' ? 'Daftar akun baru' : 'Sudah punya akun'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Notes — TanStack Query + React Hook Form + Zod */}
      {/* ------------------------------------------------------------------ */}
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Notes (Drizzle + PostgreSQL)</CardTitle>
          <CardDescription>
            Per-user · query & mutation TanStack Query · form React Hook Form + Zod ·
            tabel <code className="rounded bg-muted px-1">notes</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionPending ? (
            <Skeleton className="h-24 w-full" />
          ) : !session ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Masuk terlebih dahulu untuk melihat dan membuat catatan.
            </p>
          ) : (
          <>
          <form
            onSubmit={noteForm.handleSubmit(onCreateNote)}
            className="grid gap-2 sm:grid-cols-[1fr_auto]"
            noValidate
          >
            <div className="grid gap-2">
              <Label htmlFor="note-title">Judul</Label>
              <Input
                id="note-title"
                placeholder="Mis. Belajar Drizzle"
                {...noteForm.register('title')}
              />
              {noteForm.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {noteForm.formState.errors.title.message}
                </p>
              )}
              <Label htmlFor="note-content">Isi (opsional)</Label>
              <Textarea
                id="note-content"
                placeholder="Catatan singkat…"
                {...noteForm.register('content')}
              />
            </div>
            <Button
              type="submit"
              className="self-end"
              disabled={createNote.isPending || noteForm.formState.isSubmitting}
            >
              Tambah
            </Button>
          </form>

          {createNote.isError && (
            <p className="text-sm text-destructive">{describeError(createNote.error)}</p>
          )}
          {createNote.isSuccess && createNote.data.message && (
            <p className="text-sm text-muted-foreground" role="status">
              {createNote.data.message}
            </p>
          )}

          {notesQuery.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : notesQuery.isError ? (
            <p className="text-sm text-destructive">{describeError(notesQuery.error)}</p>
          ) : notesQuery.data.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Belum ada catatan. Tambahkan satu di atas!
            </p>
          ) : (
            <ul className="space-y-2">
              {notesQuery.data.map((note) => (
                <li
                  key={note.id}
                  className="flex items-start gap-3 rounded-md border bg-muted/30 p-3"
                >
                  <Checkbox
                    checked={note.done}
                    onCheckedChange={() => toggleNote.mutate({ id: note.id, done: !note.done })}
                    aria-label={`Tandai "${note.title}" selesai`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        note.done
                          ? 'text-muted-foreground line-through'
                          : 'font-medium'
                      }
                    >
                      {note.title}
                    </p>
                    {note.content && (
                      <p className="truncate text-sm text-muted-foreground">
                        {note.content}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleteNote.isPending}
                    onClick={() => deleteNote.mutate(note.id)}
                    aria-label={`Hapus "${note.title}"`}
                  >
                    Hapus
                  </Button>
                </li>
              ))}
            </ul>
          )}
          </>
          )}
        </CardContent>
      </Card>

      <Separator className="max-w-3xl" />

      <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
        <p>
          API di <code className="rounded bg-muted px-1">apps/api/</code> · UI di{' '}
          <code className="rounded bg-muted px-1">apps/web/</code> · schema shared di{' '}
          <code className="rounded bg-muted px-1">packages/shared/</code> · hooks API di{' '}
          <code className="rounded bg-muted px-1">apps/web/src/lib/api/</code>
        </p>
        <p>Jalankan dengan <code className="rounded bg-muted px-1">bun run dev</code></p>
      </div>
    </main>
  )
}

export default App
