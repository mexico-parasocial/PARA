import assert from 'node:assert/strict'
import test from 'node:test'
import {fileURLToPath} from 'node:url'

import ts from 'typescript'

import {migrateImports} from './migrate-imports.mts'
import {iconModulePath} from './lib.mts'

const migrations = [
  {modulePath: 'Old', exportName: 'Icon', targetModule: 'New', targetExport: 'Icon'},
  {modulePath: 'Old', exportName: 'Typo', targetModule: 'New', targetExport: 'Correct'},
]

function bindings(source: string) {
  const ast = ts.createSourceFile('example.tsx', source, ts.ScriptTarget.Latest, true)
  return ast.statements.filter(ts.isImportDeclaration).map(node => ({
    module: (node.moduleSpecifier as ts.StringLiteral).text,
    typeOnly: node.importClause?.isTypeOnly,
    default: node.importClause?.name?.text,
    names: node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
      ? node.importClause.namedBindings.elements.map(s => ({
        imported: (s.propertyName ?? s.name).text, local: s.name.text, typeOnly: s.isTypeOnly,
      })) : [],
  }))
}

test('splits mixed imports without changing aliases or component references', async () => {
  const result = await migrateImports(`// keep this comment\nimport {Icon as ButtonIcon, Typo, Unchanged} from '#/components/icons/Old'\nconst element = <><ButtonIcon /><Typo /></>\n`, 'example.tsx', migrations)
  assert.equal(result.count, 2)
  assert.deepEqual(bindings(result.source), [
    {module: '#/components/icons/New', typeOnly: false, default: undefined, names: [
      {imported: 'Icon', local: 'ButtonIcon', typeOnly: false},
      {imported: 'Correct', local: 'Typo', typeOnly: false},
    ]},
    {module: '#/components/icons/Old', typeOnly: false, default: undefined, names: [
      {imported: 'Unchanged', local: 'Unchanged', typeOnly: false},
    ]},
  ])
  assert.match(result.source, /keep this comment/)
  assert.match(result.source, /<ButtonIcon\s*\/>/)
  assert.match(result.source, /<Typo\s*\/>/)
})

test('preserves declaration and specifier type imports and leaves default imports in place', async () => {
  const result = await migrateImports(`import Default, {type Icon} from '#/components/icons/Old'\nimport type {Typo as LocalType} from '#/components/icons/Old'\n`, 'example.tsx', migrations)
  const imports = bindings(result.source)
  assert.equal(imports[0].default, 'Default')
  assert.equal(imports[0].module, '#/components/icons/Old')
  assert.equal(imports[1].names[0].typeOnly, true)
  assert.equal(imports[2].typeOnly, true)
  assert.equal(imports[2].names[0].local, 'LocalType')
  assert.equal(imports[2].names[0].imported, 'Correct')
})

test('is idempotent and leaves unrelated imports untouched', async () => {
  const source = `import {Icon} from '#/components/icons/Old'\nimport {Icon as OtherIcon} from './other'\n`
  const first = await migrateImports(source, 'example.tsx', migrations)
  const second = await migrateImports(first.source, 'example.tsx', migrations)
  assert.equal(second.count, 0)
  assert.equal(second.source, first.source)
  assert.equal(bindings(second.source)[1].module, './other')
})

test('resolves relative icon paths and excludes sibling components', async () => {
  const filename = fileURLToPath(new URL('../../src/components/example.tsx', import.meta.url))
  const outputRoot = fileURLToPath(new URL('../../src/components/icons/', import.meta.url))
  const result = await migrateImports("import {Icon as Local} from './icons/Old'\n", filename, migrations)
  assert.equal(result.count, 1)
  assert.equal(bindings(result.source)[0].module, '#/components/icons/New')
  assert.equal(bindings(result.source)[0].names[0].local, 'Local')
  assert.equal(iconModulePath('./other', filename, outputRoot), undefined)
  assert.equal(iconModulePath('./icons/Old.tsx', filename, outputRoot), 'Old')
})
