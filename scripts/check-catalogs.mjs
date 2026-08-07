import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(join(root, p), 'utf8')

const service = read('backend/PlanningPoker.Application/Services/RoomService.cs')
const locales = read('frontend/src/i18n/locales.ts')
const catalogues = {
  reaction: {
    allowlist: 'AllowedReactions',
    source: read('frontend/src/constants/reactions.ts'),
  },
  throw: {
    allowlist: 'AllowedThrowItems',
    source: read('frontend/src/constants/throwables.tsx'),
  },
}

const problems = []
const report = (label, detail) => problems.push(`${label}\n    ${detail}`)

function serverKeys(name) {
  const match = service.match(
    new RegExp(`${name} = new\\(StringComparer\\.Ordinal\\)\\s*\\{([^}]*)\\}`, 's'),
  )
  if (!match) throw new Error(`allowlist ${name} not found in RoomService.cs`)
  return [...match[1].matchAll(/"([^"]+)"/g)].map(m => m[1])
}

function localeNames() {
  const body = locales.slice(locales.indexOf('const locales = {'))
  return [...body.matchAll(/^ {2}'?([a-zA-Z-]+)'?: \{$/gm)].map(m => m[1])
}

const languages = localeNames()
if (languages.length === 0) throw new Error('no locale blocks found in locales.ts')

for (const [kind, { allowlist, source }] of Object.entries(catalogues)) {
  const server = serverKeys(allowlist)
  const client = [...source.matchAll(/key: '([^']+)'/g)].map(m => m[1])

  if (client.length === 0) throw new Error(`no keys found in the ${kind} catalogue`)

  const unaccepted = client.filter(k => !server.includes(k))
  if (unaccepted.length) {
    report(
      `${kind}: offered by the client but rejected by the server`,
      `${unaccepted.join(', ')} — clicking these does nothing. Add them to ${allowlist}.`,
    )
  }

  const unreachable = server.filter(k => !client.includes(k))
  if (unreachable.length) {
    report(
      `${kind}: accepted by the server but absent from the client`,
      `${unreachable.join(', ')} — dead surface. Remove from ${allowlist} or add to the catalogue.`,
    )
  }

  for (const key of client) {
    const missing = languages.filter(
      lang => !new RegExp(`'${kind}\\.${key}':`).test(localeBlock(lang)),
    )
    if (missing.length) {
      report(`${kind}.${key}: missing translation`, `not in ${missing.join(', ')}`)
    }
  }
}

function localeBlock(lang) {
  const start = locales.search(new RegExp(`^ {2}'?${lang}'?: \\{$`, 'm'))
  if (start < 0) return ''
  const end = locales.indexOf('\n  },', start)
  return locales.slice(start, end < 0 ? undefined : end)
}

if (problems.length) {
  console.error(`\ncheck-catalogs: ${problems.length} problem(s)\n`)
  for (const p of problems) console.error(`  ✗ ${p}\n`)
  process.exit(1)
}

const counts = Object.entries(catalogues)
  .map(([kind, { allowlist }]) => `${serverKeys(allowlist).length} ${kind}s`)
  .join(', ')
console.log(`check-catalogs: ${counts} in step across server, client and ${languages.length} locales`)