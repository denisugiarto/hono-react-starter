import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Props = Omit<React.ComponentProps<typeof Input>, 'type'> & {
  /** Awal tampil sebagai teks (default tersembunyi). */
  defaultVisible?: boolean
}

/**
 * Input password dengan tombol tampil/sembunyikan. Semua prop `Input` diteruskan
 * (termasuk `ref`/`register` React Hook Form, `id`, `data-testid`, `aria-invalid`).
 * Tombol memakai `aria-pressed` dan label yang berubah; `data-testid` tombol =
 * `${data-testid input}-toggle` (default `password-toggle`).
 */
export function PasswordInput({ className, defaultVisible = false, disabled, ...props }: Props) {
  const [visible, setVisible] = useState(defaultVisible)
  const testId = (props as { 'data-testid'?: string })['data-testid'] ?? 'password'
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} disabled={disabled} className={cn('pr-9', className)} />
      <Button
        type="button"
        color="neutral" appearance="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-0.5 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
        aria-pressed={visible}
        data-testid={`${testId}-toggle`}
        disabled={disabled}
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </div>
  )
}
