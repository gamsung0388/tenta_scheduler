import { defineStore } from 'pinia'
export const useEditorStore = defineStore('editor', {
  state: () => ({ mode: 'schedule', tab: 'schedule', selection: null, zoom: .45, fit: true, guides: false, snapping: true, issues: [], conflict: null, loadError: false, saveStatus: 'loading', error: '', notices: [], busy: '', ready: false, onboarding: false }),
  actions: {
    notify(message, type = 'info') { const id = Date.now() + Math.random(); this.notices.push({ id, message, type }); setTimeout(() => { this.notices = this.notices.filter(n => n.id !== id) }, type === 'error' ? 14000 : 4500) },
    setTab(tab) { this.tab = tab; if (tab === 'schedule') { this.mode = 'schedule'; this.selection = null } else this.mode = 'design' }
  }
})
