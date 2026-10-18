import { defineStore } from 'pinia'
import { createProject, clone, createWeek, changeTemplate, uid, normalizeGeometry, fitElementToCanvas, LIMITS } from '../lib/model'
import { changes, applyChanges, mergeChanges } from '../lib/history'
export const useProjectStore = defineStore('project', {
  state: () => ({ data: createProject(), storageVersion: null, loadEpoch: 0, undoStack: [], redoStack: [], revision: 0, lastKey: '', lastTime: 0 }),
  getters: { elements: s => s.data.design.elements, days: s => s.data.weeks[s.data.activeWeek], canUndo: s => !!s.undoStack.length, canRedo: s => !!s.redoStack.length },
  actions: {
    load(data) { this.storageVersion = data.storageVersion ?? null; this.loadEpoch++; this.data = clone(data); delete this.data.storageVersion; this.undoStack = []; this.redoStack = []; this.lastKey = ''; this.revision++ },
    mutate(fn, key = '') {
      const now = Date.now()
      const before = clone(this.data)
      try { fn(this.data) } catch (error) { this.data = before; throw error }
      const patches = changes(before, this.data)
      if (!patches.length) return
      if (key && key === this.lastKey && now - this.lastTime <= 700 && this.undoStack.length) this.undoStack.at(-1).patches = mergeChanges(this.undoStack.at(-1).patches, patches)
      else { this.undoStack.push({ patches }); if (this.undoStack.length > 70) this.undoStack.shift() }
      this.data.updatedAt = now; this.redoStack = []; this.lastKey = key; this.lastTime = now; this.revision++
    },
    undo() { if (!this.canUndo) return; const entry = this.undoStack.pop(); applyChanges(this.data, entry.patches, true); this.redoStack.push(entry); this.data.updatedAt = Date.now(); this.lastKey = ''; this.revision++ },
    redo() { if (!this.canRedo) return; const entry = this.redoStack.pop(); applyChanges(this.data, entry.patches); this.undoStack.push(entry); this.data.updatedAt = Date.now(); this.lastKey = ''; this.revision++ },
    updateElement(id, patch) { this.mutate(p => { const e = p.design.elements.find(e => e.id === id); if (e) Object.assign(e, normalizeGeometry(e, patch)) }, `element:${id}:${Object.keys(patch).join(',')}`) },
    updateScheduleSettings(patch) { this.mutate(p => Object.assign(p.design.scheduleSettings, patch)) },
    duplicateElement(id) { const element = this.elements.find(e => e.id === id); if (!element || this.elements.length >= LIMITS.elements) return null; const copy = { ...clone(element), id: uid(), name: `${element.name} 사본`, locked: false, x: element.x + 24, y: element.y + 24 }; this.mutate(p => p.design.elements.push({ ...copy, ...normalizeGeometry(copy) })); return copy.id },
    fitElement(id) { const element = this.elements.find(e => e.id === id); if (element && !element.locked) this.updateElement(id, fitElementToCanvas(element)) },
    protectedHistory() { const ids=new Set(); const visit=value=>{if(value&&typeof value==='object'){if(typeof value.assetId==='string')ids.add(value.assetId);Object.values(value).forEach(visit)}}; for(const entry of [...this.undoStack,...this.redoStack])for(const patch of entry.patches){visit(patch.before);visit(patch.after);if(patch.path.at(-1)==='assetId'){if(patch.before)ids.add(patch.before);if(patch.after)ids.add(patch.after)}} return [this.data,{design:{elements:[...ids].map(assetId=>({type:'image',assetId}))}}] },
    addText() {
      if (this.elements.length >= LIMITS.elements) return null
      const id = uid()
      this.mutate(p => p.design.elements.push({ id, type: 'text', name: '새 텍스트', text: '나만의 이야기를 적어보세요', x: 300, y: 400, width: 850, height: 100, fontFamily: 'Malgun Gothic', fontSize: 48, fill: '#f8eff2', align: 'left', bold: false, rotation: 0, visible: true, locked: false }))
      return id
    },
    addImage(asset) { if (this.elements.length >= 100) return null; const id = uid(); const scale = Math.min(380 / asset.width, 580 / asset.height, 1); this.mutate(p => p.design.elements.push({ id, type: 'image', name: asset.name, assetId: asset.id, x: 1450, y: 330, width: asset.width * scale, height: asset.height * scale, rotation: 0, visible: true, locked: false, keepRatio: true, cropMode:'contain',cropX:.5,cropY:.5 })); return id },
    replaceImage(id,asset) { const e=this.elements.find(e=>e.id===id); if(!e||e.type!=='image'||e.locked)return; this.mutate(()=>{const geometry=normalizeGeometry({...e,width:asset.width,height:asset.height},{width:e.width,height:e.height,keepRatio:e.keepRatio});Object.assign(e,geometry,{assetId:asset.id})}) },
    removeElement(id) { const e = this.elements.find(e => e.id === id); if (!e || e.locked) return; this.mutate(p => { p.design.elements = p.design.elements.filter(e => e.id !== id) }) },
    reorder(id, delta) { this.mutate(p => { const a = p.design.elements; const i = a.findIndex(e => e.id === id); const j = Math.max(0, Math.min(a.length - 1, i + delta)); if (i >= 0 && i !== j) [a[i], a[j]] = [a[j], a[i]] }) },
    setTemplate(id) { this.mutate(p => changeTemplate(p, id)) },
    goWeek(start, copy = false) { this.mutate(p => createWeek(p, start, copy)) },
    restoreSchedule() { if (!this.elements.some(e => e.type === 'schedule')) this.mutate(p => p.design.elements.push({ id: uid(), type: 'schedule', name: '주간 일정표', x: 84, y: 322, width: 1280, height: 630, rotation: 0, visible: true, locked: false })) }
  }
})
