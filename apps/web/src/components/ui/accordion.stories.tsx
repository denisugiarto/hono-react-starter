import type { Meta, StoryObj } from '@storybook/react-vite'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion'

const meta = { title: 'UI/Accordion', component: Accordion, parameters: { layout: 'padded' } } satisfies Meta<typeof Accordion>
export default meta
type Story = StoryObj<typeof meta>

const faq = [
  { q: 'Apakah data saya aman?', a: 'Semua koneksi memakai HTTPS, password di-hash, dan 2FA tersedia.' },
  { q: 'Bisakah mengekspor catatan?', a: 'Ya, lewat API dengan token JWT. Lihat halaman Token API.' },
  { q: 'Bagaimana menghapus akun?', a: 'Buka Keamanan → Hapus akun. Data dihapus permanen.' },
]

export const Single: Story = {
  render: () => (
    <Accordion className="w-96" defaultValue={[faq[0]!.q]}>
      {faq.map((f) => (
        <AccordionItem key={f.q} value={f.q}>
          <AccordionTrigger>{f.q}</AccordionTrigger>
          <AccordionContent>{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
}
export const Multiple: Story = {
  render: () => (
    <Accordion className="w-96" multiple defaultValue={[faq[0]!.q, faq[1]!.q]}>
      {faq.map((f) => (
        <AccordionItem key={f.q} value={f.q}>
          <AccordionTrigger>{f.q}</AccordionTrigger>
          <AccordionContent>{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
}
