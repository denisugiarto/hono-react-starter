---
name: adding-shadcn-component
description: Use when adding or updating a shadcn/ui component in apps/web, when `bunx shadcn add` writes files to the wrong folder (apps/web/apps/web), or when imports of `cn` / `next-themes` break after generation.
---

# Menambah Komponen shadcn/ui

Style `base-nova` di atas **Base UI** (`@base-ui/react`), konfigurasi `apps/web/components.json`.

## Langkah

```bash
ls apps/web/src/components/ui          # 23 komponen sudah ada (termasuk sidebar) — cek dulu
cd apps/web && bunx shadcn@latest add <komponen>
```

1. CLI mendeteksi root monorepo → file sering ditulis ke `apps/web/apps/web/src/components/ui/`. Pindahkan ke `apps/web/src/components/ui/` dan hapus folder sisa.
2. Ganti `import { cn } from "cn"` → `import { cn } from "@/lib/utils"`; buang dependensi `cn` / `next-themes` bila CLI menambahkannya (`bun remove`). Tema dibaca lewat `useTheme()` internal (lihat `sonner.tsx`).
3. CLI juga menulis ulang komponen yang sudah ada (button, input, sheet, …) ke folder salah itu — JANGAN timpa versi di `src/components/ui`, buang saja; hook ikut ke `src/hooks/` (mis. `use-mobile.ts`).
4. Jalankan `bunx tsc -p tsconfig.json` di `apps/web` dan `bun run lint`; peringatan `only-export-components` dari file ui boleh diabaikan.
5. Tambahkan story `src/components/ui/<komponen>.stories.tsx` (CSF3, `satisfies Meta<typeof X>`; lihat `button.stories.tsx`) dan cek `bun run build-storybook`. Komponen yang butuh context (mis. `Sidebar` butuh `SidebarProvider`, link butuh router) → decorator di story; router/query/tooltip sudah disediakan `.storybook/preview.tsx`.

## Pola pemakaian Base UI

| Kebutuhan | Pola |
| --- | --- |
| Tombol sebagai link | `<Button render={<Link to={paths.x} />}>` — jangan `nativeButton={false}` (role berubah jadi button) |
| Trigger dropdown/sheet | `<DropdownMenuTrigger render={<Button … />}>`; `DropdownMenuLabel` wajib di dalam `DropdownMenuGroup` (error `MenuGroupContext is missing`) |
| Form | `Field` + `FieldLabel htmlFor` + `Input aria-invalid` + `FieldError errors={[errors.x]}`; horizontal: `<Field orientation="horizontal">` untuk `Switch` |
| Select native | `<select>` biasa dipakai di tabel audit; komponen `Select` shadcn butuh item Base UI |
| Sidebar | `SidebarMenuButton render={<span />}` di dalam `NavLink` (render-prop `isActive`) — jangan `render={<NavLink/>}` langsung karena NavLink children bisa fungsi; `collapsible="none"` untuk sidebar statis di dalam container (tidak `fixed`) |
| Tombol | `Button` memakai `color` (primary/secondary/neutral/success/warning/danger/info) + `appearance` (fill/soft/outline/ghost/link) + `size` (xs–xl, icon-*). Tidak ada prop `variant`; komponen shadcn yang di-generate dengan `<Button variant="outline">` harus diubah ke `color="neutral" appearance="outline"` (ghost → neutral+ghost, destructive → danger+soft). Warna semantik baru: tambah token di `globals.css` (`:root` + `.dark` + `@theme inline`) lalu satu entri di `variants.color` |
| Input password | Pakai `PasswordInput` dari `components/common` (bukan `Input type="password"`) agar ada toggle + `data-testid` `<id>-toggle` |

`src/components/ui/**` dikecualikan dari coverage — jangan taruh logika aplikasi di sana.
