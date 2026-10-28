import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const resultsDir = 'test-results'
const outDir = 'e2e-videos'

if (!existsSync(resultsDir)) {
  console.error(`no ${resultsDir} directory; run the suite first`)
  process.exit(1)
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

let copied = 0
for (const entry of readdirSync(resultsDir)) {
  const dir = join(resultsDir, entry)
  if (!statSync(dir).isDirectory()) continue
  const module = entry.match(/^(\d{2}-[a-z-]+?)-/)?.[1] ?? 'misc'
  const videos = readdirSync(dir).filter(f => f.endsWith('.webm'))
  for (const video of videos) {
    const target = join(outDir, module)
    mkdirSync(target, { recursive: true })
    cpSync(join(dir, video), join(target, `${entry}.webm`))
    copied++
  }
}
console.log(`copied ${copied} video(s) into ${outDir}/<module>/`)
