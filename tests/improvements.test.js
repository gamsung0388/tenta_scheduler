import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createProject, validateProject, normalizeGeometry, fitElementToCanvas, elementBounds, isOvernight, newEvent, scheduleLayout, SCHEDULE_DEFAULTS, GEOMETRY, clone } from '../src/lib/model.js'
import { changes, applyChanges, mergeChanges } from '../src/lib/history.js'
test('geometry survives validation including former out-of-range and tiny images', () => {
  const project=createProject(),e=project.design.elements[0];Object.assign(e,normalizeGeometry(e,{x:5000,y:3000,width:5000,height:1,rotation:360}))
  assert.deepEqual(validateProject(project).design.elements[0],e)
  const image={id:'tiny',type:'image',name:'tiny',assetId:'tiny',x:0,y:0,width:2,height:1,rotation:0,visible:true,locked:false,keepRatio:true,cropMode:'cover',cropX:.2,cropY:.7}
  project.design.elements.push(image);assert.deepEqual(validateProject(project).design.elements.at(-1),image)
})
test('ratio-preserving limits apply together to both dimensions', () => {
  const e={type:'image',x:0,y:0,width:200,height:300,keepRatio:true,rotation:0}
  for(const patch of [{width:1e9},{width:.01},{height:1e9},{height:.01}]) { const result=normalizeGeometry(e,patch);assert.ok(result.width>=GEOMETRY.minSize&&result.height>=GEOMETRY.minSize);assert.ok(result.width<=GEOMETRY.maxSize&&result.height<=GEOMETRY.maxSize);assert.ok(Math.abs(result.height/result.width-1.5)<1e-9) }
})
test('fitting a rotated large element preserves its angle and brings its bounds inside canvas', () => {
  const original={type:'image',x:-5000,y:3000,width:5000,height:3000,rotation:42,keepRatio:true}
  const result={...original,...fitElementToCanvas(original)},bounds=elementBounds(result)
  assert.equal(result.rotation,42);assert.ok(bounds.x>=39&&bounds.y>=39);assert.ok(bounds.x+bounds.width<=1881&&bounds.y+bounds.height<=1041)
})
test('layout settings switch between one and three columns without mutating data', () => {
  const project=createProject();project.weeks[project.activeWeek][0].events=Array.from({length:6},()=>newEvent());const before=clone(project.weeks)
  assert.equal(scheduleLayout(project.weeks[project.activeWeek],1280,630,{...SCHEDULE_DEFAULTS,columns:1})[0].eventRows,6)
  assert.equal(scheduleLayout(project.weeks[project.activeWeek])[0].eventRows,2);assert.deepEqual(project.weeks,before)
})
test('legacy projects receive backward-compatible display settings', () => { const project=createProject();delete project.design.scheduleSettings;assert.deepEqual(validateProject(project).design.scheduleSettings,SCHEDULE_DEFAULTS) })
test('overnight broadcast end time is distinguished from same-day end', () => { assert.equal(isOvernight({start:'21:00',end:'01:00'}),true);assert.equal(isOvernight({start:'20:00',end:'22:00'}),false);assert.equal(isOvernight({start:'20:00',end:''}),false) })
test('patch history reverses object additions, removals and array changes', () => {
  const before=createProject(),after=clone(before);after.weeks[after.activeWeek][0].events.push(newEvent());after.design.elements.splice(1,1);after.weeks['2026-12-28']=[]
  const patches=changes(before,after),state=clone(after);applyChanges(state,patches,true);assert.deepEqual(state,before);applyChanges(state,patches);assert.deepEqual(state,after)
})
test('coalesced history keeps original text and latest text without whole-project copies', () => {
  const a=createProject(),b=clone(a),c=clone(a);b.design.elements[0].text='중간';c.design.elements[0].text='최종'
  const patches=mergeChanges(changes(a,b),changes(b,c));assert.equal(patches.length,1);assert.ok(JSON.stringify(patches).length<1000)
  const state=clone(c);applyChanges(state,patches,true);assert.deepEqual(state,a);applyChanges(state,patches);assert.deepEqual(state,c)
})
