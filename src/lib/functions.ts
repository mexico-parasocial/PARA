export function choose<U, T extends Record<string, U>>(
  value: keyof T,
  choices: T,
): U {
  return choices[value]
}

export function dedupArray<T>(arr: T[]): T[] {
  const s = new Set(arr)
  return [...s]
}

/**
 * Taken from @tanstack/query-core utils.ts
 * Modified to support Date object comparisons
 *
 * This function returns `a` if `b` is deeply equal.
 * If not, it will replace any deeply equal children of `b` with those of `a`.
 * This can be used for structural sharing between JSON values for example.
 */
export function replaceEqualDeep(a: unknown, b: unknown): unknown {
  if (a === b) {
    return a
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime() ? a : b
  }

  if (isPlainArray(a) && isPlainArray(b)) {
    const aSize = a.length
    const bSize = b.length
    const copy: unknown[] = []

    let equalItems = 0

    for (let i = 0; i < bSize; i++) {
      copy[i] = replaceEqualDeep(a[i], b[i])
      if (copy[i] === a[i] && a[i] !== undefined) {
        equalItems++
      }
    }

    return aSize === bSize && equalItems === aSize ? a : copy
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aObj = a
    const bObj = b
    const aItems = Object.keys(aObj)
    const aSize = aItems.length
    const bItems = Object.keys(bObj)
    const bSize = bItems.length
    const copy: Record<string | number, unknown> = {}

    let equalItems = 0

    for (let i = 0; i < bSize; i++) {
      const key = bItems[i]
      if (
        aObj[key] === undefined &&
        bObj[key] === undefined &&
        aItems.includes(key)
      ) {
        copy[key] = undefined
        equalItems++
      } else {
        copy[key] = replaceEqualDeep(aObj[key], bObj[key])
        if (copy[key] === aObj[key] && aObj[key] !== undefined) {
          equalItems++
        }
      }
    }

    return aSize === bSize && equalItems === aSize ? a : copy
  }

  return b
}

export function isPlainArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length === Object.keys(value).length
}

// Copied from: https://github.com/jonschlinkert/is-plain-object
export function isPlainObject(
  o: unknown,
): o is Record<string | number, unknown> {
  if (!hasObjectPrototype(o)) {
    return false
  }

  // If has no constructor
  const obj = o as Record<string | number, unknown>
  const ctor = obj.constructor
  if (ctor === undefined) {
    return true
  }

  // If has modified prototype
  const prot = (ctor as {prototype?: unknown}).prototype
  if (!prot || !hasObjectPrototype(prot)) {
    return false
  }

  // If constructor does not have an Object-specific method
  if (!Object.prototype.hasOwnProperty.call(prot, 'isPrototypeOf')) {
    return false
  }

  // Most likely a plain Object
  return true
}

function hasObjectPrototype(o: unknown): boolean {
  return Object.prototype.toString.call(o) === '[object Object]'
}
