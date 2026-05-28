/**
 * Codemod to replace namespaced React calls with named imports
 *
 * Before:
 *   import React from 'react'
 *   React.useEffect(() => {}, [])
 *
 * After:
 *   import { useEffect } from 'react'
 *   useEffect(() => {}, [])
 *
 * Usage: jscodeshift -t .jscodeshift/react-import.js <file-path>
 * Example: jscodeshift -t .jscodeshift/react-import.js src/App.native.tsx
 */

/* eslint-disable */

export const parser = 'tsx'

export default function transformer(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)

  let reactImportPath = null
  const reactMembers = new Set()

  root.find(j.ImportDeclaration).forEach(path => {
    const node = path.value
    if (node.source.value === 'react') {
      node.specifiers.forEach(spec => {
        if (
          spec.type === 'ImportDefaultSpecifier' &&
          spec.local.name === 'React'
        ) {
          reactImportPath = path
        }
      })
    }
  })

  if (!reactImportPath) {
    return file.source
  }

  root
    .find(j.MemberExpression)
    .filter(path => {
      const node = path.value
      return (
        node.object.type === 'Identifier' &&
        node.object.name === 'React' &&
        node.property.type === 'Identifier'
      )
    })
    .forEach(path => {
      const propertyName = path.value.property.name
      reactMembers.add(propertyName)
    })

  root
    .find(j.JSXMemberExpression)
    .filter(path => {
      const node = path.value
      return node.object.name === 'React' && node.property.name
    })
    .forEach(path => {
      const propertyName = path.value.property.name
      reactMembers.add(propertyName)
    })

  if (reactMembers.size === 0) {
    reactImportPath.prune()
    return root.toSource()
  }

  const sortedMembers = Array.from(reactMembers).sort()

  const newSpecifiers = sortedMembers.map(name =>
    j.importSpecifier(j.identifier(name), j.identifier(name)),
  )

  reactImportPath.value.specifiers = newSpecifiers

  root
    .find(j.MemberExpression)
    .filter(path => {
      const node = path.value
      return (
        node.object.type === 'Identifier' &&
        node.object.name === 'React' &&
        node.property.type === 'Identifier'
      )
    })
    .replaceWith(path => {
      return j.identifier(path.value.property.name)
    })

  root
    .find(j.JSXMemberExpression)
    .filter(path => {
      const node = path.value
      return node.object.name === 'React' && node.property.name
    })
    .replaceWith(path => {
      return j.jsxIdentifier(path.value.property.name)
    })

  return root.toSource()
}
