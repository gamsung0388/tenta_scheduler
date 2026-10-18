import { clone } from './model.js'
export function changes(before, after, path = []) {
  if (Object.is(before, after)) return []
  if (before && after && typeof before === 'object' && typeof after === 'object' && Array.isArray(before) === Array.isArray(after) && (!Array.isArray(before) || before.length === after.length)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(k => path.length || k !== 'updatedAt').flatMap(key => changes(before[key], after[key], [...path, key]))
  }
  return [{ path, before: before === undefined ? undefined : clone(before), after: after === undefined ? undefined : clone(after) }]
}
export function applyChanges(target, patches, undo = false) {
  for (const patch of undo ? [...patches].reverse() : patches) {
    let object = target
    for (const part of patch.path.slice(0, -1)) object = object[part]
    const value = undo ? patch.before : patch.after, key = patch.path.at(-1)
    if (value === undefined) delete object[key]
    else object[key] = clone(value)
  }
}
export function mergeChanges(first, next) {
  const result = first.map(p => ({ ...p }))
  for (const patch of next) {
    const previous = result.find(p => JSON.stringify(p.path) === JSON.stringify(patch.path))
    if (previous) previous.after = patch.after
    else result.push(patch)
  }
  return result
}
