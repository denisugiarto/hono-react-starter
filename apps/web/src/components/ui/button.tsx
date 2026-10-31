import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Button = warna semantik × tampilan × ukuran.
 *
 *   <Button>Simpan</Button>                                   // primary · fill · md
 *   <Button color="danger" appearance="outline">Hapus</Button>
 *   <Button color="success" appearance="soft" size="sm">Selesai</Button>
 *   <Button color="neutral" appearance="ghost" size="icon-sm" aria-label="Tutup"><XIcon /></Button>
 *
 * Warna hanya mengisi CSS variable (--btn-color / --btn-contrast / --btn-text); tampilan
 * yang memakainya, sehingga setiap kombinasi valid tanpa daftar compound per pasangan.
 * Tidak ada prop `variant` — padanan shadcn lama: outline → neutral+outline, ghost →
 * neutral+ghost, destructive → danger+soft, secondary → secondary+fill, link → appearance link.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      color: {
        primary: "[--btn-color:var(--primary)] [--btn-contrast:var(--primary-foreground)] [--btn-text:var(--primary)]",
        secondary:
          "[--btn-color:var(--secondary)] [--btn-contrast:var(--secondary-foreground)] [--btn-text:var(--secondary-foreground)]",
        neutral: "[--btn-color:var(--foreground)] [--btn-contrast:var(--background)] [--btn-text:var(--foreground)]",
        success: "[--btn-color:var(--success)] [--btn-contrast:var(--success-foreground)] [--btn-text:var(--success)]",
        warning: "[--btn-color:var(--warning)] [--btn-contrast:var(--warning-foreground)] [--btn-text:var(--warning)]",
        danger:
          "[--btn-color:var(--destructive)] [--btn-contrast:var(--destructive-foreground)] [--btn-text:var(--destructive)]",
        info: "[--btn-color:var(--info)] [--btn-contrast:var(--info-foreground)] [--btn-text:var(--info)]",
      },
      appearance: {
        fill: "bg-(--btn-color) text-(--btn-contrast) hover:bg-(--btn-color)/85 aria-expanded:bg-(--btn-color)/85",
        soft: "bg-(--btn-color)/10 text-(--btn-text) hover:bg-(--btn-color)/20 aria-expanded:bg-(--btn-color)/20 dark:bg-(--btn-color)/20 dark:hover:bg-(--btn-color)/30",
        outline:
          "border-(--btn-color)/40 bg-background text-(--btn-text) hover:bg-(--btn-color)/10 aria-expanded:bg-(--btn-color)/10 dark:bg-input/30 dark:hover:bg-(--btn-color)/15",
        ghost: "text-(--btn-text) hover:bg-(--btn-color)/10 aria-expanded:bg-(--btn-color)/10 dark:hover:bg-(--btn-color)/15",
        link: "h-auto px-0 text-(--btn-text) underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xl: "h-10 gap-2 rounded-xl px-4 text-base has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-5",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        icon: "size-8",
        "icon-lg": "size-9",
        "icon-xl": "size-10 rounded-xl [&_svg:not([class*='size-'])]:size-5",
      },
    },
    compoundVariants: [
      // Neutral outline/ghost mempertahankan tampilan shadcn asli (border-border, hover muted)
      {
        color: "neutral",
        appearance: "outline",
        class:
          "border-border text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
      },
      {
        color: "neutral",
        appearance: "ghost",
        class: "text-inherit hover:bg-muted hover:text-foreground aria-expanded:bg-muted dark:hover:bg-muted/50",
      },
      {
        color: "secondary",
        appearance: "fill",
        class: "hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary",
      },
      // Warna berwarna: ring fokus mengikuti warnanya agar tidak abu-abu di tombol merah/hijau
      {
        color: ["success", "warning", "danger", "info"],
        class: "focus-visible:border-(--btn-color)/50 focus-visible:ring-(--btn-color)/25",
      },
    ],
    defaultVariants: {
      color: "primary",
      appearance: "fill",
      size: "md",
    },
  }
)

type ButtonColor = NonNullable<VariantProps<typeof buttonVariants>["color"]>
type ButtonAppearance = NonNullable<VariantProps<typeof buttonVariants>["appearance"]>
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>

type ButtonProps = Omit<ButtonPrimitive.Props, "color"> & {
  /** Warna semantik. Default `primary`. */
  color?: ButtonColor
  /** Tampilan: isi penuh, lembut, garis, tanpa latar, atau tautan. Default `fill`. */
  appearance?: ButtonAppearance
  /** Ukuran teks (xs–xl) atau ikon persegi (icon-xs–icon-xl). Default `md`. */
  size?: ButtonSize
}

function Button({ className, color = "primary", appearance = "fill", size = "md", ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ color, appearance, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
export type { ButtonAppearance, ButtonColor, ButtonProps, ButtonSize }
