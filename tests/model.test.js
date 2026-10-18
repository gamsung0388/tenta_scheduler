import { test } from 'node:test'
import assert from 'node:assert/strict'
import { monday, weekDates, createProject, createWeek, changeTemplate, validateProject, newEvent, scheduleLayout, storageMessage } from '../src/lib/model.js'
test('Monday-based weeks include Sunday in the preceding week', () => {
  assert.equal(monday('2026-10-18'), '2026-10-12')
  assert.equal(monday('2026-10-19'), '2026-10-19')
})
test('month and year boundaries use calendar dates', () => {
  assert.deepEqual(weekDates('2026-12-28'), ['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03'])
  assert.equal(weekDates('2028-02-28')[1], '2028-02-29')
})
test('new weeks preserve design and are empty unless explicitly copied', () => {
  const p = createProject('2026-10-18'), e = newEvent()
  e.title = '테스트 방송'; p.weeks[p.activeWeek][0].events.push(e)
  const design = JSON.stringify(p.design)
  createWeek(p, '2026-10-19', true)
  assert.equal(p.weeks[p.activeWeek][0].events[0].title, e.title)
  assert.notEqual(p.weeks[p.activeWeek][0].events[0].id, e.id)
  createWeek(p, '2026-10-26')
  assert.equal(p.weeks[p.activeWeek][0].events.length, 0)
  assert.equal(JSON.stringify(p.design), design)
})
test('template changes preserve schedules and element transforms', () => {
  const p = createProject(); p.weeks[p.activeWeek][0].events.push({ ...newEvent(), status: 'off' })
  const weeks = JSON.stringify(p.weeks); p.design.elements[0].x = 321
  changeTemplate(p, 'journal')
  assert.equal(JSON.stringify(p.weeks), weeks); assert.equal(p.design.elements[0].x, 321)
})
test('multiple broadcasts and long titles stay in separate layout cells', () => {
  const p = createProject(), day = p.weeks[p.activeWeek][0]
  day.events = Array.from({ length: 6 }, () => ({ ...newEvent(), title: '매우 긴 방송 제목 '.repeat(20) }))
  const rows = scheduleLayout(p.weeks[p.activeWeek])
  assert.ok(rows[0].eventWidth * rows[0].columns <= rows[0].width - 192)
  assert.equal(rows[0].eventRows, 2)
  assert.ok(rows[0].height > rows[1].height)
  for (let i = 0; i < 6; i++) assert.ok(rows[i].y + rows[i].height < rows[i + 1].y)
  assert.equal(validateProject(p).weeks[p.activeWeek][0].events.length, 6)
})
test('validation rejects incompatible and corrupt data', () => {
  const p = createProject(); assert.throws(() => validateProject({ ...p, schemaVersion: 2 }))
  p.weeks[p.activeWeek][0].date = '2026-02-31'; assert.throws(() => validateProject(p))
})
test('quota errors have actionable messages', () => {
  assert.match(storageMessage({ name: 'QuotaExceededError' }), /저장 공간/)
})
