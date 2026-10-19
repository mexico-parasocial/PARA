import {readdir, rename} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

// Dry run by default. --write applies the validated, collision-free plan.
const root = fileURLToPath(new URL('../../assets/icons/ui/', import.meta.url))
const files = (await readdir(root)).filter(name => name.endsWith('.svg'))
const semanticNames = {
  bulletlist: 'BulletList',
  editbig: 'EditBig',
  peopleremove2: 'PeopleRemove2',
  videoclip: 'VideoClip',
  hashtagwide: 'HashtagWide',
  raisinghand4finger: 'RaisingHand4Finger',
  cc: 'CC',
  ufo: 'UFO',
}
const capitalize = value => semanticNames[value.toLowerCase()] ?? value[0].toUpperCase() + value.slice(1)
const plan = files.map(from => {
  const parts = from.slice(0, -4).split('_').map(capitalize)
  const styleIndex = parts.findIndex(part => /^(Filled|St[r]?oke\d*|Corner\d+|Rounded|Large)$/.test(part))
  const semantic = parts.slice(0, styleIndex < 0 ? parts.length : styleIndex).join('')
  const styles = styleIndex < 0 ? [] : parts.slice(styleIndex).map(part => part.replace(/^Stoke/, 'Stroke'))
  return {from, to: [semantic, ...styles].join('_') + '.svg'}
})
const targets = new Map()
for (const {from, to} of plan) {
  const key = to.toLowerCase()
  if (targets.has(key)) throw new Error(`Collision: ${targets.get(key)} and ${from} -> ${to}`)
  targets.set(key, from)
}
let count = 0
for (const {from, to} of plan) {
  if (from === to) continue
  console.log(`${from} -> ${to}`)
  if (process.argv.includes('--write')) {
    // A temporary name also handles case-only changes on macOS.
    const temporary = path.join(root, `${from}.${process.pid}.rename`)
    await rename(path.join(root, from), temporary)
    try {
      await rename(temporary, path.join(root, to))
    } catch (error) {
      await rename(temporary, path.join(root, from))
      throw error
    }
  }
  count++
}
console.log(`${process.argv.includes('--write') ? 'Renamed' : 'Would rename'} ${count} SVG files`)
