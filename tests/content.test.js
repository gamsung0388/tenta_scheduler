import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BUILT_IN_CONTENT, eventFromContent, contentFromEvent, sameContent } from '../src/lib/content.js'
import { createProject, validateProject, LIMITS, clone } from '../src/lib/model.js'

test('content shortcuts create independent events with a chosen time and no time for day off', () => {
  const preset = BUILT_IN_CONTENT.find(item => item.id === 'andutten'), before = clone(preset)
  const first = eventFromContent(preset, '21:30'), second = eventFromContent(preset, '19:00')
  assert.equal(first.title, '안듣텐');assert.equal(first.start, '21:30');assert.notEqual(first.id, second.id)
  first.title = '직접 바꾼 제목';assert.deepEqual(preset, before);assert.equal(second.title, '안듣텐')
  const off=eventFromContent(BUILT_IN_CONTENT.find(item=>item.id==='dayoff'),'21:30')
  assert.equal(off.status,'off');assert.equal(off.start,'');assert.equal(off.end,'')
})

test('personal content copies text and status while discarding the old date and times', () => {
  const original={title:'  함께하는 게임  ',description:'시청자 참여',status:'broadcast',start:'23:30',end:'01:00'}
  const preset=contentFromEvent(original);assert.equal(preset.title,'함께하는 게임');assert.equal(preset.description,original.description)
  assert.equal('start' in preset,false);assert.equal('end' in preset,false);assert.equal(contentFromEvent({title:'  '}),null)
  assert.equal(sameContent(preset,contentFromEvent(original)),true)
  assert.equal(sameContent(preset,{...preset,status:'off'}),false)
  assert.equal(eventFromContent(preset,'bad time').start,'')
  const event=eventFromContent({title:'가'.repeat(300),description:'나'.repeat(400)},'')
  assert.equal(event.title.length,LIMITS.title);assert.equal(event.description.length,LIMITS.description)
})

test('personal content survives validation and older projects receive an empty library', () => {
  const project=createProject(),weeks=clone(project.weeks)
  delete project.contentPresets;assert.deepEqual(validateProject(project).contentPresets,[])
  project.contentPresets=[contentFromEvent({title:'고정 콘텐츠',description:'내용',status:'tbd'})]
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))).contentPresets,project.contentPresets)
  assert.deepEqual(project.weeks,weeks)
})

test('corrupt, duplicate or oversized personal content is rejected without mutating the project', () => {
  const project=createProject(),preset=contentFromEvent({title:'기본',status:'broadcast'})
  for(const invalid of [null,{},[null],[{...preset,title:''}],[{...preset,status:'unknown'}],[preset,preset],Array.from({length:LIMITS.contentPresets+1},()=>contentFromEvent({title:'기본'}))]) {
    const candidate={...project,contentPresets:invalid}
    if(invalid===null)assert.deepEqual(validateProject(candidate).contentPresets,[])
    else assert.throws(()=>validateProject(candidate),/내 콘텐츠/)
  }
  assert.deepEqual(project.contentPresets,[])
})
