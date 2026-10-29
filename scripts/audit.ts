/**
 * Gerbang `bun audit` untuk CI: gagal hanya bila ada advisory tingkat high/critical
 * yang benar-benar mengenai VERSI TERPASANG (bun audit mencetak semua advisory
 * paket, termasuk rentang versi yang sudah tidak dipakai).
 *
 *   bun scripts/audit.ts            # exit 1 bila ada temuan high/critical
 *   bun scripts/audit.ts --level=moderate
 */
import { readFileSync } from 'node:fs'

const LEVELS = ['low', 'moderate', 'high', 'critical'] as const
type Level = (typeof LEVELS)[number]
const minLevel = ((process.argv.find((a) => a.startsWith('--level='))?.split('=')[1] as Level | undefined) ?? 'high')
const minIndex = LEVELS.indexOf(minLevel)
if (minIndex === -1) {
  console.error(`--level harus salah satu dari ${LEVELS.join('|')}`)
  process.exit(2)
}

type Advisory = { severity: Level; title: string; url: string; vulnerable_versions: string }

const proc = Bun.spawnSync(['bun', 'audit', '--json'], { stdout: 'pipe', stderr: 'pipe' })
const raw = proc.stdout.toString().trim()
if (!raw) {
  console.log('bun audit: tidak ada keluaran JSON (tidak ada advisory).')
  process.exit(0)
}
const report = JSON.parse(raw) as Record<string, Advisory[]>

const parse = (v: string) => (v.match(/\d+/g) ?? []).slice(0, 3).map(Number)
const cmp = (a: number[], b: number[]) => {
  for (let i = 0; i < 3; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}
/** Cocokkan versi dengan rentang gaya npm audit ("<1.2.3", ">=1.0.0 <2.0.0", "a || b"). */
function affected(range: string, version: string): boolean {
  return range.split('||').some((part) =>
    part
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .every((tok) => {
        const m = /^(<=|>=|<|>|=)?(.+)$/.exec(tok)!
        const d = cmp(parse(version), parse(m[2]!))
        switch (m[1] ?? '=') {
          case '<': return d < 0
          case '<=': return d <= 0
          case '>': return d > 0
          case '>=': return d >= 0
          default: return d === 0
        }
      }),
  )
}

function installedVersion(pkg: string): string | null {
  try {
    return (JSON.parse(readFileSync(`node_modules/${pkg}/package.json`, 'utf8')) as { version: string }).version
  } catch {
    return null
  }
}

const findings: string[] = []
for (const [pkg, advisories] of Object.entries(report)) {
  const version = installedVersion(pkg)
  for (const adv of advisories) {
    if (LEVELS.indexOf(adv.severity) < minIndex) continue
    // Versi tidak terpasang di root node_modules (hanya salinan bersarang) → tetap dilaporkan.
    if (version && !affected(adv.vulnerable_versions, version)) continue
    findings.push(`${adv.severity.toUpperCase()} ${pkg}@${version ?? '?'} (${adv.vulnerable_versions}): ${adv.title}\n    ${adv.url}`)
  }
}

if (findings.length === 0) {
  console.log(`bun audit: tidak ada advisory ≥ ${minLevel} pada versi terpasang.`)
  process.exit(0)
}
console.error(`bun audit: ${findings.length} advisory ≥ ${minLevel} mengenai versi terpasang:\n`)
for (const f of findings) console.error(`  - ${f}`)
process.exit(1)
