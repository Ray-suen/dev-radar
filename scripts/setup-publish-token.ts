import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const token = randomBytes(32).toString('hex')
const result = spawnSync('npx', ['wrangler', 'secret', 'put', 'PUBLISH_TOKEN'], {
  input: token,
  encoding: 'utf8',
  stdio: ['pipe', 'inherit', 'inherit'],
})
if (result.status !== 0) process.exit(result.status ?? 1)
const path = join(import.meta.dirname, '../.publish-token')
writeFileSync(path, token, { mode: 0o600 })
console.log('Publish token stored locally in .publish-token (ignored by Git).')
