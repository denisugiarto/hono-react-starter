---
name: adding-shadcn-component
description: Use when adding or updating a shadcn/ui component in apps/web, when `bunx shadcn add` writes files to the wrong folder (apps/web/apps/web), or when imports of `cn` / `next-themes` break after generation.
---

# Menambah Komponen shadcn/ui

Style `base-nova` di atas **Base UI** (`@base-ui/react`), konfigurasi `apps/web/components.json`.

## Langkah

```bash
ls apps/web/src/components/ui          # 22 komponen sudah ada — cek dulu
cd apps/web && bunx shadcn@latest add <komponen>
```

1. CLI mendeteksi root monorepo → file sering ditulis ke `apps/web/apps/web/src/components/ui/`. Pindahkan ke `apps/web/src/components/ui/` dan hapus folder sisa.
2. Ganti `import { cn } from "cn"` → `import { cn } from "@/lib/utils"`; buang dependensi `cn` / `next-themes` bila CLI menambahkannya (`bun remove`). Tema dibaca lewat `useTheme()` internal (lihat `sonner.tsx`).
3. Jalankan `bunx tsc -p tsconfig.json` di `apps/web` dan `bun run lint`; peringatan `only-export-components` dari file ui boleh diabaikan.

## Pola pemakaian Base UI

| Kebutuhan | Pola |
| --- | --- |
| Tombol sebagai link | `<Button render={<Link to={paths.x} />}>` — jangan `nativeButton={false}` (role berubah jadi button) |
| Trigger dropdown/sheet | `<DropdownMenuTrigger render={<Button … />}>`; `DropdownMenuLabel` wajib di dalam `DropdownMenuGroup` (error `MenuGroupContext is missing`) |
| Form | `Field` + `FieldLabel htmlFor` + `Input aria-invalid` + `FieldError errors={[errors.x]}`; horizontal: `<Field orientation="horizontal">` untuk `Switch` |
| Select native | `<select>` biasa dipakai di tabel audit; komponen `Select` shadcn butuh item Base UI |

`src/components/ui/**` dikecualikan dari coverage — jangan taruh logika aplikasi di sana.
