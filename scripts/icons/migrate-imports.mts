import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import {format, resolveConfig} from 'prettier'
import ts from 'typescript'

import {buildIconSet, iconModulePath, normalizeExportName} from './lib.mts'

type Migration = {
  modulePath: string
  exportName: string
  targetModule: string
  targetExport: string
}

// Rewrite declarations, never references: aliases and local component names stay intact.
export async function migrateImports(source: string, filename: string, migrations: Migration[]) {
  const mapping = new Map(migrations.map(item => [`${item.modulePath}:${item.exportName}`, item]))
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true)
  const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed})
  const prefix = '#/components/icons/'
  const outputRoot = fileURLToPath(new URL('../../src/components/icons/', import.meta.url))
  const edits: {start: number; end: number; text: string}[] = []
  let count = 0
  for (const node of ast.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue
    const originalModule = iconModulePath(node.moduleSpecifier.text, filename, outputRoot)
    if (!originalModule) continue
    const clause = node.importClause
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue
    const groups = new Map<string, ts.ImportSpecifier[]>()
    // A default import, if present, still belongs to the original module.
    if (clause.name) groups.set(originalModule, [])
    let changed = false
    for (const specifier of clause.namedBindings.elements) {
      const imported = (specifier.propertyName ?? specifier.name).text
      const migration = mapping.get(`${originalModule}:${imported}`)
      const target = migration?.targetModule ?? originalModule
      const exported = migration?.targetExport ?? imported
      if (!groups.has(target)) groups.set(target, [])
      const newSpecifier = exported === imported ? specifier : ts.factory.updateImportSpecifier(
        specifier,
        specifier.isTypeOnly,
        exported === specifier.name.text ? undefined : ts.factory.createIdentifier(exported),
        specifier.name,
      )
      groups.get(target)!.push(newSpecifier)
      if (target !== originalModule || exported !== imported) {
        changed = true
        count++
      }
    }
    if (!changed) continue
    const declarations = [...groups].map(([modulePath, specifiers]) => {
      const declaration = ts.factory.createImportDeclaration(
        node.modifiers,
        ts.factory.createImportClause(
          clause.isTypeOnly,
          modulePath === originalModule ? clause.name : undefined,
          specifiers.length ? ts.factory.createNamedImports(specifiers) : undefined,
        ),
        ts.factory.createStringLiteral(prefix + modulePath),
        node.attributes,
      )
      return printer.printNode(ts.EmitHint.Unspecified, declaration, ast)
    })
    edits.push({start: node.getStart(ast), end: node.end, text: declarations.join('\n')})
  }
  if (!edits.length) return {source, count}
  let result = source
  for (const edit of edits.reverse()) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end)
  }
  result = await format(result, {
    ...(await resolveConfig(filename)),
    filepath: filename,
  })
  return {source: result, count}
}

async function main() {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const scanRoot = path.join(root, 'src')
  const result = await buildIconSet({
    outputRoot: path.join(scanRoot, 'components/icons'),
    scanRoot,
    sourceRoot: path.join(root, 'assets/icons'),
  })
  const icons = new Map(result.icons.map(icon => [normalizeExportName(icon.exportName), icon]))
  const holdouts = new Set(result.holdouts.map(item => `${item.sourceFile}:${item.modulePath}:${item.exportName}`))
  const importsToMigrate = result.deprecatedImports.filter(item =>
    process.argv.includes('--include-handwritten') ||
    !holdouts.has(`${item.sourceFile}:${item.modulePath}:${item.exportName}`),
  )
  const skipped = result.deprecatedImports.length - importsToMigrate.length
  if (skipped) console.log(`Skipping ${skipped} handwritten imports; review artwork before using --include-handwritten`)
  const byFile = Map.groupBy(importsToMigrate, item => item.sourceFile)
  const changes: {filename: string; original: string; updated: string}[] = []
  let count = 0
  for (const [file, imports] of byFile) {
    const filename = path.join(scanRoot, file)
    const original = await fs.readFile(filename, 'utf8')
    const migrations = imports.map(item => {
      const icon = icons.get(normalizeExportName(item.exportName))!
      return {...item, targetExport: icon.exportName}
    })
    const updated = await migrateImports(original, filename, migrations)
    count += updated.count
    if (updated.source !== original) changes.push({filename, original, updated: updated.source})
  }
  if (count !== importsToMigrate.length) {
    throw new Error(`Expected ${importsToMigrate.length} import changes, found ${count}; no files written`)
  }
  // Check the whole plan before writing anything.
  for (const change of changes) {
    if (await fs.readFile(change.filename, 'utf8') !== change.original) {
      throw new Error(`File changed during migration: ${change.filename}; no files written`)
    }
  }
  const write = process.argv.includes('--write')
  if (write) for (const change of changes) await fs.writeFile(change.filename, change.updated)
  console.log(`${write ? 'Updated' : 'Would update'} ${count} imports in ${changes.length} files`)
  if (!write && count) console.log('Run with --write to apply, then run pnpm icons:generate and pnpm icons:check')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1 })
}
