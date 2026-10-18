import { onBeforeUnmount, watch } from 'vue'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import { db, getCurrentProject, saveProject, readProject } from '../lib/storage'
import { dirtyAssets, markAssetsSaved, loadProjectAssets, clearAssets } from '../lib/assets'
import { clone, storageMessage, uid } from '../lib/model'
export function usePersistence() {
  const project = useProjectStore(), editor = useEditorStore()
  let timer, saving = Promise.resolve(), disposed = false, observedEpoch = project.loadEpoch
  const versions = new Map(), source = uid(), channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('sihyeon-studio-changes') : null
  channel?.addEventListener('message', event => {
    const update = event.data
    if (update?.source !== source && update?.projectId === project.data.id && update.version > (project.storageVersion ?? 0)) {
      clearTimeout(timer); editor.conflict = { projectId: update.projectId }; editor.saveStatus = 'conflict'
    }
  })
  async function save() {
    clearTimeout(timer)
    if (editor.conflict || editor.loadError) return false
    if (editor.saveStatus==='saved' && project.storageVersion!==null && !dirtyAssets().length) return true
    const revision = project.revision, data = clone(project.data), epoch = project.loadEpoch, assets = dirtyAssets(), capturedVersion = project.storageVersion
    editor.saveStatus = 'saving'
    saving = saving.catch(() => {}).then(async () => {
      try {
        if (epoch !== project.loadEpoch) return false
        const known = versions.get(data.id)
        const expected = capturedVersion === null && known === undefined ? null : Math.max(capturedVersion ?? 0, known ?? 0)
        const version = await saveProject(data, assets, expected)
        versions.set(data.id, version); markAssetsSaved(assets)
        channel?.postMessage({ source, projectId: data.id, version })
        if (epoch === project.loadEpoch) {
          project.storageVersion = version
          if (revision === project.revision && !editor.conflict) { editor.saveStatus = 'saved'; editor.error = '' }
        }
        return true
      } catch (error) {
        if (error.name === 'SaveConflictError') { editor.conflict = { projectId: data.id }; editor.saveStatus = 'conflict' }
        else { editor.saveStatus = 'error'; editor.error = storageMessage(error) }
        return false
      }
    })
    return saving
  }
  async function init() {
    try {
      const data = await getCurrentProject()
      if (data) { project.load(data); versions.set(data.id, project.storageVersion) }
      const missing = await loadProjectAssets(project.data)
      if (missing.length) editor.notify('일부 이미지가 누락되었거나 손상되었습니다. 이미지 레이어를 다시 업로드해 주세요.', 'error')
      editor.onboarding = !(await db.preferences.get('onboarding'))
      editor.saveStatus = 'saved'
      editor.ready = true
      if (!data) await save()
    } catch (error) { editor.saveStatus = 'error'; editor.error = `프로젝트를 불러오지 못했습니다. 최근 저장 복구 또는 백업 복원을 이용해 주세요. (${error.message})`; editor.loadError = true; editor.onboarding = false }
    editor.ready = true
  }
  watch(() => project.revision, () => {
    if (observedEpoch !== project.loadEpoch) { observedEpoch=project.loadEpoch; clearTimeout(timer); return }
    if (!editor.ready || disposed || editor.loadError || editor.conflict) return
    editor.saveStatus = 'pending'; clearTimeout(timer); timer = setTimeout(save, 800)
  }, { flush:'sync' })
  function beforeUnload(event) { if (editor.saveStatus !== 'saved') { event.preventDefault(); event.returnValue = '' } }
  function hidden() { if (document.visibilityState === 'hidden' && editor.ready && editor.saveStatus !== 'saved') save() }
  window.addEventListener('beforeunload', beforeUnload)
  document.addEventListener('visibilitychange', hidden)
  async function saveCopy() {
    const copy = clone(project.data); copy.id = uid(); copy.name = `${copy.name} 사본`; copy.updatedAt = Date.now()
    clearTimeout(timer); project.load(copy); editor.conflict = null; editor.loadError = false; editor.error = ''; return save()
  }
  async function reloadLatest() {
    const data = await readProject(project.data.id)
    clearTimeout(timer); clearAssets(); editor.conflict=null; project.load(data); versions.set(data.id, project.storageVersion)
    await loadProjectAssets(data); editor.loadError = false; adoptSaved(data.storageVersion)
  }
  function adoptSaved(version) { clearTimeout(timer); project.storageVersion=version; versions.set(project.data.id,version); if(editor.conflict?.projectId!==project.data.id)editor.conflict=null; editor.saveStatus=editor.conflict?'conflict':'saved'; editor.error='' }
  onBeforeUnmount(() => { disposed = true; clearTimeout(timer); channel?.close(); window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('visibilitychange', hidden); clearAssets() })
  return { init, save, saveCopy, reloadLatest, adoptSaved }
}
