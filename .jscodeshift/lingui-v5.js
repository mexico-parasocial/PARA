/**
 * Codemod to update Lingui's useLingui() hook to use v5.
 *
 * Before:
 *   import {msg} from '@lingui/core/macro'
 *   import {useLingui} from '@lingui/react'
 *   const {_} = useLingui()
 *   _(msg`Lorem ipsum`)
 *
 * After:
 *   import {useLingui} from '@lingui/react/macro'
 *   const {t: l} = useLingui()
 *   l`Lorem ipsum`
 *
 * Usage: jscodeshift -t .jscodeshift/lingui-v5.js <file-path>
 * Example: jscodeshift -t .jscodeshift/lingui-v5.js modules/bottom-sheet/src/lib/Portal.tsx
 */

/* eslint-disable */

export const parser = 'tsx'

export default function transformer(file, api) {
  const j = api.jscodeshift

  const root = j(file.source)

  root
    .find(j.ImportDeclaration)
    .filter(path => path.node.source.value === '@lingui/core/macro')
    .forEach(path => {
      const newSpecifiers = path.node.specifiers.filter(specifier => {
        if (j.ImportSpecifier.check(specifier)) {
          const importedName = specifier.imported
            ? specifier.imported.name
            : specifier.local.name
          const localName = specifier.local
            ? specifier.local.name
            : importedName

          return !(
            importedName === 'msg' &&
            (localName === 'msg' || localName === 'msgLingui')
          )
        }
        return true
      })

      if (newSpecifiers.length > 0) {
        path.node.specifiers = newSpecifiers
      } else {
        j(path).remove()
      }
    })

  root
    .find(j.ImportDeclaration)
    .filter(path => path.node.source.value === '@lingui/react')
    .forEach(path => {
      path.node.source = j.stringLiteral('@lingui/react/macro')
    })

  root
    .find(j.VariableDeclarator, {
      init: {
        type: 'CallExpression',
        callee: {name: 'useLingui'},
      },
    })
    .replaceWith(nodePath => {
      const {node} = nodePath
      for (let i = 0; i < node.id.properties.length; i++) {
        if (node.id.properties[i].key.name === '_') {
          node.id.properties[i].key = j.identifier('t')
          node.id.properties[i].shorthand = false
          node.id.properties[i].value = j.identifier('l')
        }
      }
      return node
    })

  root
    .find(j.VariableDeclarator, {
      init: {callee: {name: 'useLingui'}},
      id: {
        properties: properties =>
          properties.some(p => p.key.name === '_' && p.value.name === '_l'),
      },
    })
    .forEach(path => {
      const prop = path.node.id.properties.find(
        p => p.key.name === '_' && p.value.name === '_l',
      )
      if (prop) {
        prop.key.name = 't'
        prop.value.name = 'l'
      }
    })

  root
    .find(j.CallExpression, {
      callee: {name: '_'},
      arguments: [
        {
          type: 'TaggedTemplateExpression',
          tag: {name: 'msg'},
        },
      ],
    })
    .replaceWith(path => {
      const quasis = path.node.arguments[0].quasi

      return j.taggedTemplateExpression(j.identifier('l'), quasis)
    })

  root
    .find(j.CallExpression, {
      callee: {name: '_l'},
      arguments: [
        {
          type: 'TaggedTemplateExpression',
          tag: {name: 'msgLingui'},
        },
      ],
    })
    .replaceWith(path => {
      const quasis = path.node.arguments[0].quasi

      return j.taggedTemplateExpression(j.identifier('l'), quasis)
    })

  root
    .find(j.CallExpression, {
      callee: {name: '_'},
      arguments: [
        {
          type: 'CallExpression',
          callee: {name: 'msg'},
        },
      ],
    })
    .replaceWith(path => {
      return j.callExpression(j.identifier('l'), [
        path.node.arguments[0].arguments[0],
      ])
    })

  root
    .find(j.CallExpression, {
      callee: {name: '_l'},
      arguments: [
        {
          type: 'CallExpression',
          callee: {name: 'msgLingui'},
        },
      ],
    })
    .replaceWith(path => {
      return j.callExpression(j.identifier('l'), [
        path.node.arguments[0].arguments[0],
      ])
    })

  root
    .find(j.CallExpression, {
      callee: {
        type: 'Identifier',
        name: '_',
      },
    })
    .forEach(path => {
      const callExpression = path.node
      if (
        callExpression.arguments.length === 1 &&
        callExpression.arguments[0].type === 'CallExpression'
      ) {
        const innerCall = callExpression.arguments[0]

        if (
          innerCall.callee.type === 'Identifier' &&
          innerCall.callee.name === 'plural'
        ) {
          j(path).replaceWith(innerCall)
        }
      }
    })

  root
    .find(j.CallExpression, {
      callee: callee => {
        if (
          callee.type === 'Identifier' ||
          callee.type === 'MemberExpression'
        ) {
          return true
        }
        if (
          ['useCallback', 'useEffect', 'useMemo'].includes(callee.name) &&
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'React' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'useCallback'
        ) {
          return true
        }
        return false
      },
    })
    .forEach(path => {
      const dependencyArray = path.node.arguments[1]
      if (dependencyArray && dependencyArray.type === 'ArrayExpression') {
        dependencyArray.elements = dependencyArray.elements.map(element => {
          if (
            element.type === 'Identifier' &&
            (element.name === '_' || element.name === '_l')
          ) {
            return j.identifier('l')
          }
          return element
        })
      }
    })

  return root.toSource()
}
