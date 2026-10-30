import { newEvent, uid, LIMITS } from './model.js'

// Public SOOP notices/replays checked on 2026-10-30. These are editable
// scheduling shortcuts, not an import of confirmed future broadcasts.
export const CONTENT_SOURCE = 'https://www.sooplive.com/station/xxxsihyeon'
export const BUILT_IN_CONTENT = [
  ['andutten', '안듣텐'],
  ['tenhaejwo', '텐해줘'],
  ['cinety', '시네티'],
  ['warmup', '예열 소통'],
  ['aftertalk', '후열 소통'],
  ['singing', '노래뱅'],
  ['worldcup', '월드컵'],
  ['games', '종합게임'],
  ['dayoff', '휴방']
].map(([id, label]) => ({ id, label, title: label, description: '', status: id === 'dayoff' ? 'off' : 'broadcast' }))

const clean = (value, limit) => String(value ?? '').trim().slice(0, limit)
const statusOf = value => ['broadcast', 'off', 'tbd'].includes(value) ? value : 'broadcast'

export function eventFromContent(preset, start = '20:00') {
  const status = statusOf(preset.status)
  return { ...newEvent(), status, title: clean(preset.title || preset.label, LIMITS.title), description: clean(preset.description, LIMITS.description), start: status === 'broadcast' && /^([01]\d|2[0-3]):[0-5]\d$/.test(start) ? start : '', end: '' }
}

export function contentFromEvent(event) {
  const title = clean(event.title, LIMITS.title)
  if (!title) return null
  return { id: uid(), label: Array.from(title).slice(0, 32).join(''), title, description: clean(event.description, LIMITS.description), status: statusOf(event.status) }
}

export const sameContent = (a, b) => a.title === b.title && a.description === b.description && a.status === b.status
