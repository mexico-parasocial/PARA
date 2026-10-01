import {execFileSync} from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

/**
 * @param {string} directory
 * @param {string} [prefix]
 * @returns {Promise<string[]>}
 */
async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, {withFileTypes: true}).catch(error => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return []
    }
    throw error
  })
  /** @type {string[]} */
  const files = []
  for (const entry of entries) {
    const relative = join(prefix, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFiles(join(directory, entry.name), relative)))
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(relative)
    }
  }
  return files
}

// Metro can lose directory watches when --clear removes the generated tree.
// Generate elsewhere, then publish new files before updating existing imports.
// Keep unchanged files and all directories in place, including empty ones.
/**
 * @param {string} staging
 * @param {string} output
 * @returns {Promise<void>}
 */
export async function publishLexicons(staging, output) {
  const generated = await listFiles(staging)
  const existing = new Set(await listFiles(output))
  const current = new Set(generated)
  const ordered = [
    ...generated.filter(file => !existing.has(file)),
    ...generated.filter(file => existing.has(file)),
  ]
  for (const file of ordered) {
    const target = join(output, file)
    const content = await readFile(join(staging, file))
    const previous = existing.has(file) ? await readFile(target) : undefined
    if (previous?.equals(content)) continue

    await mkdir(dirname(target), {recursive: true})
    const temporary = `${target}.${process.pid}.tmp`
    try {
      await writeFile(temporary, content)
      await rename(temporary, target)
    } finally {
      await rm(temporary, {force: true})
    }
  }
  for (const file of existing) {
    if (!current.has(file)) await rm(join(output, file))
  }
}

async function generateLexicons() {
  const staging = await mkdtemp(join(tmpdir(), 'para-lexicons-'))
  try {
    execFileSync(
      process.execPath,
      [
        join(projectRoot, 'node_modules/@atproto/lex/bin/lex'),
        'build',
        '--lexicons',
        join(projectRoot, 'lexicons'),
        '--out',
        staging,
        '--index-file',
        '--import-ext',
        '',
      ],
      {cwd: projectRoot, stdio: 'inherit'},
    )
    await publishLexicons(staging, join(projectRoot, 'src/lexicons'))
  } finally {
    await rm(staging, {recursive: true, force: true})
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateLexicons()
}
