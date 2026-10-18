import { defineStore } from 'pinia'
import { useProjectStore } from './project'
import { newEvent, LIMITS, clone, uid } from '../lib/model'
export const useScheduleStore = defineStore('schedule', {
  state: () => ({ selectedDay: 0, clipboard: null }),
  getters: { days: () => useProjectStore().days, day() { return this.days[this.selectedDay] } },
  actions: {
    add() { const p = useProjectStore(); if (this.day.events.length >= LIMITS.events) return; p.mutate(d => d.weeks[d.activeWeek][this.selectedDay].events.push(newEvent())) },
    update(id, patch) { const p = useProjectStore(); p.mutate(d => { const e = d.weeks[d.activeWeek][this.selectedDay].events.find(e => e.id === id); if (e) Object.assign(e, patch) }, `event:${id}:${Object.keys(patch).join(',')}`) },
    remove(id) { const p = useProjectStore(); p.mutate(d => { const day = d.weeks[d.activeWeek][this.selectedDay]; day.events = day.events.filter(e => e.id !== id) }) },
    duplicate(id) { if (this.day.events.length >= LIMITS.events) return false; const event = this.day.events.find(e => e.id === id); if (!event) return false; const p = useProjectStore(); p.mutate(d => { const events = d.weeks[d.activeWeek][this.selectedDay].events; events.splice(events.findIndex(e => e.id === id) + 1, 0, { ...clone(event), id: uid() }) }); return true },
    reorder(id, delta) { const p = useProjectStore(); p.mutate(d => { const events = d.weeks[d.activeWeek][this.selectedDay].events, from = events.findIndex(e => e.id === id), to = from + delta; if (from >= 0 && to >= 0 && to < events.length) [events[from],events[to]] = [events[to],events[from]] }) },
    copyDay() { this.clipboard = clone(this.day.events) },
    pasteDay() { if (!this.clipboard || this.day.events.length + this.clipboard.length > LIMITS.events) return false; const p = useProjectStore(); p.mutate(d => d.weeks[d.activeWeek][this.selectedDay].events.push(...this.clipboard.map(e => ({ ...clone(e), id: uid() })))); return true }
  }
})
