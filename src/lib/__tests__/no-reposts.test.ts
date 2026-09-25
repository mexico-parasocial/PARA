/**
 * PARA has no reposts: a post is shared by quoting it or by highlighting part
 * of it (the pencil QuoteButton). The backend refuses repost records too
 * (WatZappa `@atproto/common` para-repost-policy.ts).
 *
 * Upstream syncs from Bluesky's social-app bring reposts back without anyone
 * choosing to: the August 2026 SDK sync silently swapped the pencil for
 * Bluesky's RepostButton. This test fails when that happens again.
 */
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.join(__dirname, '..', '..')

const IGNORED_DIRS = new Set(['locale', 'lexicons', 'node_modules'])

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return IGNORED_DIRS.has(entry.name) ? [] : sourceFiles(full)
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

const files = sourceFiles(SRC)
const relative = (file: string) => path.relative(SRC, file)

describe('PARA has no reposts', () => {
  it('has no repost screens or buttons', () => {
    const repostModules = files
      .map(relative)
      .filter(file =>
        /RepostButton|PostRepostedBy|Repost\w*NotificationSettings|post-reposted-by|icons\/Repost\./.test(
          file,
        ),
      )
    expect(repostModules).toEqual([])
  })

  it('never writes or deletes a repost record', () => {
    const writers = files.filter(file => {
      const source = fs.readFileSync(file, 'utf8')
      return (
        /import\s*\{[^}]*\b(repost|deleteRepost)\b[^}]*\}\s*from\s*'@bsky\/sdk'/.test(
          source,
        ) || /app\.bsky\.feed\.repost\.create\b/.test(source)
      )
    })
    expect(writers.map(relative)).toEqual([])
  })

  it('offers highlight and quote in the post controls', () => {
    const controls = fs.readFileSync(
      path.join(SRC, 'components', 'PostControls', 'index.tsx'),
      'utf8',
    )
    expect(controls).toMatch(/<QuoteButton\b/)
    expect(controls).toMatch(/onHighlight=\{onHighlight\}/)
  })
})
