export const SCHEMA_VERSION = 1
export const WIDTH = 1920
export const HEIGHT = 1080
export const DAYS = ['월', '화', '수', '목', '금', '토', '일']
export const LIMITS = { events: 6, title: 240, description: 300, elements: 100, weeks: 520, assetBytes: 15 * 1024 * 1024, archiveBytes: 120 * 1024 * 1024, manifestBytes: 3 * 1024 * 1024, exportPixels: 96 * 1024 * 1024 }
export const GEOMETRY = { position: 100000, minSize: 1, maxSize: 32768, rotation: 360 }
export const SCHEDULE_DEFAULTS = { columns: 0, showDescriptions: true, allowSummary: false }
export const uid = () => crypto.randomUUID()
export const clone = value => JSON.parse(JSON.stringify(value))
export function dateKey(date) {
  const d = typeof date === 'string' ? parseDate(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('날짜 형식이 올바르지 않습니다.')
  const [y, m, day] = value.split('-').map(Number)
  const d = new Date(y, m - 1, day, 12)
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) throw new Error('유효하지 않은 날짜입니다.')
  return d
}
export function addDays(value, count) { const d = parseDate(value); d.setDate(d.getDate() + count); return dateKey(d) }
export function monday(value = new Date()) {
  const d = typeof value === 'string' ? parseDate(value) : new Date(value)
  d.setDate(d.getDate() - (d.getDay() + 6) % 7)
  return dateKey(d)
}
export const weekDates = start => Array.from({ length: 7 }, (_, i) => addDays(start, i))
export const displayDate = date => date.replaceAll('-', '.')
export const shortDate = date => date.slice(5).replace('-', '.')
export function emptyWeek(start) { return weekDates(start).map(date => ({ date, events: [] })) }
export function newEvent() { return { id: uid(), status: 'broadcast', title: '', start: '20:00', end: '', description: '' } }
export const THEMES = {
  academy: { name: 'Burgundy Academy', label: '버건디 아카데미', bg: '#1c1018', paper: '#2c1823', ink: '#eeeaf0', muted: '#aca3b0', accent: '#bd526f', line: '#63374b' },
  journal: { name: 'Expelled Magic Journal', label: '추방된 마법사의 기록', bg: '#eee8dc', paper: '#f8f3e8', ink: '#392f32', muted: '#8c7d77', accent: '#a43648', line: '#cbbfb2' }
}
export function defaultElements(template = 'academy') {
  const t = THEMES[template]
  return [
    { id: 'heading', type: 'text', name: '메인 타이틀', x: 84, y: 112, width: 1310, height: 110, rotation: 0, text: 'WEEKLY SCHEDULE', fontFamily: 'Georgia', fontSize: 100, fill: t.ink, align: 'left', bold: false, visible: true, locked: false },
    { id: 'subtitle', type: 'text', name: '서브 타이틀', x: 90, y: 242, width: 1280, height: 42, rotation: 0, text: '텐타시현  /  한 주의 방송 기록', fontFamily: 'Malgun Gothic', fontSize: 25, fill: t.muted, align: 'left', bold: false, visible: true, locked: false },
    { id: 'schedule', type: 'schedule', name: '주간 일정표', x: 84, y: 322, width: 1280, height: 630, rotation: 0, visible: true, locked: false },
    { id: 'signature', type: 'text', name: '하단 서명', x: 1480, y: 936, width: 340, height: 42, rotation: 0, text: 'TENTA SIHYEON', fontFamily: 'Georgia', fontSize: 25, fill: t.ink, align: 'center', bold: false, visible: true, locked: false }
  ]
}
export function createProject(now = new Date()) {
  const start = monday(now)
  return { id: uid(), schemaVersion: SCHEMA_VERSION, name: '시현의 주간 스케줄', activeWeek: start, weeks: { [start]: emptyWeek(start) }, design: { templateId: 'academy', scheduleSettings: { ...SCHEDULE_DEFAULTS }, elements: defaultElements() }, updatedAt: Date.now() }
}
export function changeTemplate(project, templateId) {
  if (!THEMES[templateId]) return
  const before = THEMES[project.design.templateId], next = THEMES[templateId]
  project.design.elements.forEach(e => { if (e.type === 'text') { if (e.fill === before.ink) e.fill = next.ink; else if (e.fill === before.muted) e.fill = next.muted } })
  project.design.templateId = templateId
}
export function createWeek(project, start, copy = false) {
  if (project.weeks[start]) { project.activeWeek = start; return }
  if (Object.keys(project.weeks).length >= LIMITS.weeks) throw new Error('한 프로젝트에는 최대 520주까지 저장할 수 있습니다. 새 프로젝트로 이어서 작성해 주세요.')
  const days = emptyWeek(start)
  if (copy) days.forEach((day, i) => { day.events = project.weeks[project.activeWeek][i].events.map(e => ({ ...clone(e), id: uid() })) })
  project.weeks[start] = days
  project.activeWeek = start
}
const finite = (n, min, max, fallback) => Number.isFinite(Number(n)) ? Math.max(min, Math.min(max, Number(n))) : fallback
const str = (s, max = 500) => typeof s === 'string' ? s.slice(0, max) : ''
const color = c => /^#[0-9a-f]{6}$/i.test(c) ? c : '#f8eff2'
export function normalizeGeometry(element, patch = {}) {
  const merged = { ...element, ...patch }, bounds = GEOMETRY
  let width = finite(merged.width, bounds.minSize, bounds.maxSize, 300)
  let height = finite(merged.height, bounds.minSize, bounds.maxSize, 100)
  if (element.type === 'image' && merged.keepRatio && (Object.hasOwn(patch, 'width') || Object.hasOwn(patch, 'height'))) {
    const ratio = element.width / element.height
    if (Number.isFinite(ratio) && ratio > 0) {
      const proposed = Object.hasOwn(patch, 'width') ? Number(patch.width) : Number(patch.height) * ratio
      width = finite(proposed, Math.max(bounds.minSize, bounds.minSize * ratio), Math.min(bounds.maxSize, bounds.maxSize * ratio), element.width)
      height = width / ratio
    }
  }
  return { ...patch, x: finite(merged.x, -bounds.position, bounds.position, 0), y: finite(merged.y, -bounds.position, bounds.position, 0), width, height, rotation: finite(merged.rotation, -bounds.rotation, bounds.rotation, 0) }
}
export function elementBounds(e) {
  const r = e.rotation * Math.PI / 180, c = Math.cos(r), s = Math.sin(r)
  const points = [[0,0],[e.width,0],[0,e.height],[e.width,e.height]].map(([x,y]) => [x*c-y*s,x*s+y*c])
  const minX = Math.min(...points.map(p => p[0])), minY = Math.min(...points.map(p => p[1]))
  const width = Math.max(...points.map(p => p[0])) - minX, height = Math.max(...points.map(p => p[1])) - minY
  return { x: e.x + minX, y: e.y + minY, width, height, minX, minY }
}
export function fitElementToCanvas(e) {
  const b = elementBounds(e), scale = Math.min(1, (WIDTH-80)/b.width, (HEIGHT-80)/b.height)
  const size = { ...e, width: e.width * scale, height: e.height * scale }
  const fitted = elementBounds(size)
  return { width: size.width, height: size.height, x: (WIDTH-fitted.width)/2-fitted.minX, y: (HEIGHT-fitted.height)/2-fitted.minY }
}
export const isOvernight = event => !!(event.start && event.end && event.end < event.start)
export function validateProject(raw) {
  if (!raw || raw.schemaVersion !== SCHEMA_VERSION) throw new Error('지원하지 않는 프로젝트 버전입니다. (schemaVersion 1 필요)')
  if (!raw.weeks || !raw.design || !THEMES[raw.design.templateId]) throw new Error('프로젝트 구조 또는 템플릿이 손상되었습니다.')
  const keys = Object.keys(raw.weeks)
  if (!keys.length || keys.length > LIMITS.weeks) throw new Error('프로젝트 주간 데이터가 올바르지 않습니다.')
  const weeks = {}, eventIds = new Set()
  for (const key of keys) {
    if (monday(key) !== key || !Array.isArray(raw.weeks[key]) || raw.weeks[key].length !== 7) throw new Error('주간 날짜 데이터가 손상되었습니다.')
    weeks[key] = raw.weeks[key].map((day, i) => {
      if (!day || day.date !== addDays(key, i) || !Array.isArray(day.events) || day.events.length > LIMITS.events) throw new Error('일정 데이터가 손상되었습니다.')
      return { date: day.date, events: day.events.map(e => {
        if (!e || !/^[a-zA-Z0-9-]{1,100}$/.test(e.id) || eventIds.has(e.id)) throw new Error('일정 식별자가 손상되었습니다.')
        eventIds.add(e.id)
        if (!['broadcast', 'off', 'tbd'].includes(e.status)) throw new Error('지원하지 않는 방송 상태입니다.')
        for (const time of [e.start, e.end]) if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('방송 시간 형식이 올바르지 않습니다.')
        return { id: e.id, status: e.status, title: str(e.title, LIMITS.title), description: str(e.description, LIMITS.description), start: str(e.start, 5), end: str(e.end, 5) }
      }) }
    })
  }
  if (!weeks[raw.activeWeek]) throw new Error('선택된 주간 데이터가 없습니다.')
  if (!Array.isArray(raw.design.elements) || raw.design.elements.length > 100) throw new Error('디자인 요소가 손상되었거나 100개를 초과합니다.')
  const ids = new Set()
  const elements = raw.design.elements.map(e => {
    if (!e || !['text', 'image', 'schedule'].includes(e.type) || !/^[a-zA-Z0-9-]{1,100}$/.test(e.id) || ids.has(e.id)) throw new Error('디자인 요소 형식이 올바르지 않습니다.')
    ids.add(e.id)
    const base = { id: str(e.id, 100), type: e.type, name: str(e.name, 80), ...normalizeGeometry(e), locked: !!e.locked, visible: e.visible !== false }
    if (e.type === 'text') Object.assign(base, { text: str(e.text, 2000), fontFamily: ['Georgia', 'Malgun Gothic', 'Segoe UI', 'Arial'].includes(e.fontFamily) ? e.fontFamily : 'Malgun Gothic', fontSize: finite(e.fontSize, 6, 300, 36), fill: color(e.fill), align: ['left', 'center', 'right'].includes(e.align) ? e.align : 'left', bold: !!e.bold })
    if (e.type === 'image') { if (!/^[a-zA-Z0-9-]{1,100}$/.test(e.assetId)) throw new Error('이미지 연결 정보가 잘못되었습니다.'); base.assetId = e.assetId; base.keepRatio = e.keepRatio !== false; base.cropMode=e.cropMode==='cover'?'cover':'contain';base.cropX=finite(e.cropX,0,1,.5);base.cropY=finite(e.cropY,0,1,.5) }
    return base
  })
  const settings = raw.design.scheduleSettings || {}
  return { id: typeof raw.id === 'string' ? str(raw.id, 100) : uid(), schemaVersion: SCHEMA_VERSION, name: str(raw.name, 80) || '시현의 주간 스케줄', activeWeek: raw.activeWeek, weeks, design: { templateId: raw.design.templateId, elements, scheduleSettings: { columns: [0,1,2,3].includes(settings.columns) ? settings.columns : 0, showDescriptions: settings.showDescriptions !== false, allowSummary: !!settings.allowSummary } }, updatedAt: Number(raw.updatedAt) || Date.now() }
}
export function scheduleLayout(days, width = 1280, height = 630, settings = SCHEDULE_DEFAULTS) {
  const weights = days.map(day => !day.events.length ? .35 : Math.min(5, Math.ceil(day.events.length / 3) + Math.max(...day.events.map(e => (e.title?.length || 0) / 120 + (e.description?.length || 0) / 240))))
  const total = weights.reduce((a, b) => a + b, 0), base = 44, remaining = height - base * 7
  let y = 0
  return days.map((day, index) => {
    const rowHeight = base + remaining * weights[index] / total, columns = Math.min(settings.columns || 3, Math.max(1, day.events.length))
    const row = { ...day, index, x: 0, y, width, height: rowHeight - 7, columns, eventRows: Math.max(1, Math.ceil(day.events.length / columns)), eventWidth: (width - 192) / columns }
    y += rowHeight
    return row
  })
}
export function storageMessage(error) {
  return /quota/i.test(`${error?.name} ${error?.inner?.name} ${error?.message}`) ? '브라우저 저장 공간이 부족합니다. 프로젝트 백업 후 불필요한 브라우저 데이터를 정리하고 다시 저장해 주세요.' : `로컬 저장에 실패했습니다. 백업 파일을 내려받아 작업을 보관해 주세요. (${error?.message || '알 수 없는 오류'})`
}
