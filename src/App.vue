<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useProjectStore } from './stores/project'
import { useEditorStore } from './stores/editor'
import { useScheduleStore } from './stores/schedule'
import { usePersistence } from './composables/usePersistence'
import { addDays, monday, shortDate, createProject, clone, storageMessage, uid } from './lib/model'
import { db, saveProject, readProject, listSnapshots, cleanUnusedAssets } from './lib/storage'
import { assetCache, decodeAsset, registerAsset, clearAssets, loadProjectAssets, markAssetsSaved, dirtyAssets, releaseAsset } from './lib/assets'
import { createArchive, readArchive, downloadBlob } from './lib/archive'
import { exportPng, inspectProject, projectThumbnail } from './lib/renderer'
import { REFERENCE_IMAGES, referenceUrl } from './lib/references'
import Icon from './components/Icon.vue'
import CanvasEditor from './components/CanvasEditor.vue'
import SchedulePanel from './components/SchedulePanel.vue'
import ToolsPanel from './components/ToolsPanel.vue'
import Inspector from './components/Inspector.vue'
import BackupGuide from './components/BackupGuide.vue'
const p = useProjectStore(), editor = useEditorStore(), schedule = useScheduleStore()
const persistence = usePersistence()
const canvas = ref(), uploadInput = ref(), restoreInput = ref(), menu = ref(false), modal = ref(''), pendingWeek = ref(''), copyWeek = ref(false), pendingImport = ref(null), recent = ref([])
const snapshots = ref([]), selectedSnapshot = ref(null), snapshotPreview = ref('')
const replaceId = ref(null)
const errors = computed(() => editor.issues.filter(i=>i.severity==='error'))
const tabs = [{ id: 'schedule', name: '일정', icon: 'calendar' }, { id: 'template', name: '템플릿', icon: 'template' }, { id: 'image', name: '이미지', icon: 'image' }, { id: 'text', name: '텍스트', icon: 'text' }, { id: 'layers', name: '레이어', icon: 'layers' }]
const saveLabel = computed(() => ({ loading: '불러오는 중', pending: '저장 대기 중', saving: '저장 중', saved: '모든 변경 사항 저장됨', error: '저장 실패', conflict:'다른 탭의 변경 감지' })[editor.saveStatus])
const saveIcon = computed(() => ['loading', 'saving', 'pending'].includes(editor.saveStatus) ? 'loading' : ['error','conflict'].includes(editor.saveStatus) ? 'alert' : 'saved')
const weekLabel = computed(() => `${shortDate(p.data.activeWeek)} — ${shortDate(addDays(p.data.activeWeek, 6))}`)
async function run(label, action) { if (editor.busy) return; editor.busy = label; try { await action() } catch (error) { editor.notify(error.message || '작업을 완료하지 못했습니다.', 'error') } finally { editor.busy = '' } }
function week(value) {
  let start
  try { start = typeof value === 'number' ? addDays(p.data.activeWeek, value * 7) : monday(value) } catch (e) { editor.notify(e.message, 'error'); return }
  if (p.data.weeks[start]) { p.goWeek(start); schedule.selectedDay = 0 }
  else { pendingWeek.value = start; copyWeek.value = false; modal.value = 'week' }
}
function confirmWeek() { p.goWeek(pendingWeek.value, copyWeek.value); schedule.selectedDay = 0; modal.value = ''; editor.selection = null; editor.notify(copyWeek.value ? '디자인과 일정을 복사해 새 주를 만들었어요.' : '디자인을 유지한 빈 주간을 만들었어요.') }
function addText() { if (p.elements.length >= 100) return editor.notify('디자인 요소는 최대 100개까지 추가할 수 있어요.', 'error'); editor.mode = 'design'; editor.selection = p.addText() }
async function upload(event) {
  const replacing=replaceId.value,files = [...event.target.files].slice(0,replacing?1:undefined); event.target.value = '';replaceId.value=null
  await run('이미지 준비 중', async () => { for (const file of files) { if (!replacing&&p.elements.length >= 100) throw new Error('디자인 요소는 최대 100개까지 추가할 수 있어요.'); const asset = await decodeAsset(file, file.name); registerAsset(asset); if(replacing){p.replaceImage(replacing,asset);editor.selection=replacing}else editor.selection = p.addImage(asset); editor.setTab('image') } if (files.length) editor.notify(replacing?'이미지를 교체했어요.':`${files.length}개의 이미지를 추가했어요.`) })
}
function chooseUpload(id=null){replaceId.value=id;uploadInput.value.click()}
function addReference(id) {
  run('시현 이미지를 준비하고 있어요', async () => {
    if (p.elements.length >= 100) throw new Error('디자인 요소는 최대 100개까지 추가할 수 있어요.')
    const reference = REFERENCE_IMAGES.find(r => r.id === id)
    if (!reference) return
    const response = await fetch(referenceUrl(reference))
    if (!response.ok) throw new Error('참고 이미지를 불러오지 못했습니다. 원본 파일을 직접 업로드해 주세요.')
    const asset = await decodeAsset(await response.blob(), reference.name)
    registerAsset(asset); editor.selection = p.addImage(asset); editor.mode = 'design'
    editor.notify('제공하신 시현 이미지를 캔버스에 추가했어요.')
  })
}
function png() { run('PNG를 렌더링하고 있어요', async () => { const data = clone(p.data); editor.issues = inspectProject(data); if (errors.value.length) { modal.value='preflight'; return } const blob = await exportPng(data); if (!blob) throw new Error('PNG 파일 생성에 실패했습니다.'); downloadBlob(blob, `SIHYEON_${data.activeWeek}_${addDays(data.activeWeek, 6)}.png`); editor.notify('1920 × 1080 PNG를 내려받았어요.', 'success') }) }
function jumpToIssue(issue) { modal.value=''; const element=p.elements.find(e=>e.id===issue.elementId); if(element?.type==='schedule'&&issue.dayIndex!==undefined){editor.setTab('schedule');schedule.selectedDay=issue.dayIndex}else{editor.setTab('layers');editor.selection=issue.elementId} }
async function showSnapshots() { menu.value=false; await run('최근 저장을 확인하고 있어요',async()=>{snapshots.value=(await listSnapshots()).slice(0,50);selectedSnapshot.value=null;snapshotPreview.value='';modal.value='snapshots'}) }
async function previewSnapshot(entry) { await run('복구 미리보기 준비 중',async()=>{const before=new Set(assetCache.keys());try{await loadProjectAssets(entry.data);selectedSnapshot.value=entry;snapshotPreview.value=projectThumbnail(entry.data)}finally{for(const id of assetCache.keys())if(!before.has(id))releaseAsset(id)}}) }
async function restoreSnapshot() { await run('복구 사본을 여는 중',async()=>{
  if(editor.conflict) throw new Error('현재 탭 작업을 먼저 사본으로 저장하거나 최신 버전을 열어 주세요.')
  if(!editor.loadError && !await persistence.save()) throw new Error('현재 작업을 먼저 백업해 주세요.')
  const data=clone(selectedSnapshot.value.data);data.id=uid();data.name=`${data.name} 복구`;data.updatedAt=Date.now();const missing=await loadProjectAssets(data)
  const assets=dirtyAssets(),version=await saveProject(data,assets);markAssetsSaved(assets);p.load({...data,storageVersion:version});const used=new Set(data.design.elements.filter(e=>e.type==='image').map(e=>e.assetId));for(const id of assetCache.keys())if(!used.has(id))releaseAsset(id);editor.loadError=false;editor.error='';editor.selection=null;modal.value='';persistence.adoptSaved(version);editor.notify(missing.length?'복구 사본을 열었어요. 누락된 이미지는 다시 업로드해 주세요.':'최근 저장을 새 사본으로 복구했어요.',missing.length?'error':'success')
}) }
function cleanupImages() { run('미사용 이미지를 확인하고 있어요',async()=>{const removed=await cleanUnusedAssets(p.protectedHistory());removed.forEach(releaseAsset);editor.notify(`${removed.length}개의 미사용 이미지를 정리했어요. 프로젝트·복구 기록·실행 취소에 쓰는 이미지는 보관해요.`)}) }
function resolveConflict(copy) { run(copy?'현재 작업을 사본으로 저장 중':'최신 버전을 여는 중',async()=>{if(copy){if(!await persistence.saveCopy())throw new Error('사본 저장에 실패했습니다. 백업 파일을 내려받아 주세요.')}else await persistence.reloadLatest();editor.selection=null}) }
function backup() { menu.value = false; run('프로젝트를 묶고 있어요', async () => { const blob = await createArchive(clone(p.data)); downloadBlob(blob, `SIHYEON_${p.data.activeWeek}.tssproj`); editor.notify('이미지를 포함한 프로젝트 백업을 내려받았어요.', 'success') }) }
function showBackupGuide() { menu.value = false; modal.value = 'backupGuide' }
async function prepareImport(event) { const file = event.target.files[0]; event.target.value = ''; if (!file) return; await run('프로젝트 파일을 확인하고 있어요', async () => { releaseImport(); pendingImport.value = await readArchive(file); modal.value = 'restore' }) }
function releaseImport() { pendingImport.value?.assets.forEach(a => URL.revokeObjectURL(a.url)); pendingImport.value = null }
async function confirmImport() {
  await run('프로젝트를 복원하고 있어요', async () => {
    if (!editor.loadError && !await persistence.save()) throw new Error('현재 작업을 저장하지 못해 복원을 중단했습니다. 먼저 백업 파일을 내려받아 주세요.')
    const data = pendingImport.value
    let version
    try { version=await saveProject(data.project, data.assets) } catch (e) { throw new Error(storageMessage(e)) }
    clearAssets(); data.assets.forEach(registerAsset); markAssetsSaved(data.assets); p.load({...data.project,storageVersion:version}); pendingImport.value = null;editor.loadError=false;editor.error=''
    schedule.selectedDay = 0; editor.selection = null; modal.value = ''; persistence.adoptSaved(version)
    editor.notify('프로젝트를 새 사본으로 복원했어요. 이전 작업은 프로젝트 목록에 보관돼요.', 'success')
  })
}
async function projectList() { menu.value = false; try { recent.value = await db.projects.orderBy('updatedAt').reverse().toArray(); modal.value = 'projects' } catch (e) { editor.notify(storageMessage(e), 'error') } }
async function openProject(raw) { await run('프로젝트 여는 중', async () => { const data = await readProject(raw.id); if (!editor.loadError && !await persistence.save()) throw new Error('현재 프로젝트를 저장하지 못했습니다. 백업 후 다시 시도해 주세요.'); clearAssets(); p.load(data);editor.loadError=false;editor.error=''; editor.selection = null; schedule.selectedDay = 0; const missing = await loadProjectAssets(data);await db.preferences.put({key:'lastProject',value:data.id}); modal.value = '';persistence.adoptSaved(data.storageVersion); if (missing.length) editor.notify('일부 이미지가 누락되었습니다. 다시 업로드해 주세요.', 'error') }) }
async function newProject() { await run('새 프로젝트 만드는 중', async () => { if (!editor.loadError && !await persistence.save()) throw new Error('현재 작업을 먼저 백업해 주세요. 저장이 실패했습니다.'); clearAssets(); p.load(createProject());editor.loadError=false;editor.conflict=null;editor.error=''; modal.value = ''; editor.selection = null; schedule.selectedDay = 0; await persistence.save() }) }
async function dismissOnboarding() { editor.onboarding = false; try { await db.preferences.put({ key: 'onboarding', value: true }) } catch {} }
function closeModal() { if (editor.busy) return; modal.value = ''; releaseImport() }
function zoom(value) { editor.fit = false; editor.zoom = Math.max(.1, Math.min(1.5, Number(value))) }
function fit() { editor.fit = true; canvas.value?.fit() }
function keydown(e) {
  if ((modal.value || editor.onboarding) && e.key === 'Tab') {
    const focusable = [...document.querySelectorAll('.modal button:not(:disabled), .modal input:not(:disabled)')]
    if (e.shiftKey && document.activeElement === focusable[0]) { e.preventDefault(); focusable.at(-1)?.focus() }
    else if (!e.shiftKey && document.activeElement === focusable.at(-1)) { e.preventDefault(); focusable[0]?.focus() }
    return
  }
  if (e.isComposing || editor.busy) return
  if (!editor.ready || editor.loadError || editor.conflict) return
  if (e.key === 'Escape') { if (editor.onboarding) dismissOnboarding(); else closeModal(); editor.selection = null; menu.value = false; return }
  if (modal.value || editor.onboarding) return
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? p.redo() : p.undo(); return }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); persistence.save(); return }
  const editing = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable
  if (!editing && editor.mode==='design') {
    const selected=p.elements.find(element=>element.id===editor.selection)
    if(selected&&!selected.locked&&selected.visible&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const step=e.shiftKey?10:1;p.updateElement(selected.id,{x:selected.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),y:selected.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)});return}
    if(selected&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();const id=p.duplicateElement(selected.id);if(id)editor.selection=id;return}
  }
  if (e.key === 'Delete' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && editor.mode === 'design') { p.removeElement(editor.selection); editor.selection = null }
}
function outside(e) { if (!e.target.closest('.project-dropdown')) menu.value = false }
let previousFocus
watch([modal, () => editor.onboarding], async ([currentModal, onboarding], [previousModal, wasOnboarding]) => {
  if (currentModal || onboarding) {
    if (!previousModal && !wasOnboarding) previousFocus = document.activeElement
    await nextTick(); document.querySelector('.modal button:not(:disabled)')?.focus()
  } else (previousFocus?.isConnected ? previousFocus : document.querySelector('.project-button'))?.focus?.()
})
onMounted(async () => { window.addEventListener('keydown', keydown); window.addEventListener('pointerdown', outside); await persistence.init() })
onBeforeUnmount(() => { window.removeEventListener('keydown', keydown); window.removeEventListener('pointerdown', outside); releaseImport() })
</script>

<template>
  <div class="studio">
    <header class="topbar" :inert="!editor.ready||!!editor.busy">
      <a class="brand" href="#" aria-label="SIHYEON STUDIO 홈" @click.prevent><span class="brand-mark"><i></i><i></i><i></i></span><span>SIHYEON <b>STUDIO</b><small>WEEKLY DESIGN ATELIER</small></span></a>
      <span class="header-divider"></span>
      <div class="project-dropdown"><button class="project-button" :aria-expanded="menu" @click="menu = !menu"><span>{{ p.data.name }}</span><Icon name="down" :size="14" /></button><div v-if="menu" class="dropdown-menu"><label class="field"><span>프로젝트 이름</span><input maxlength="80" :disabled="editor.loadError||!!editor.conflict" :value="p.data.name" @change="p.mutate(d => d.name = $event.target.value || '이름 없는 프로젝트')" /></label><button @click="projectList"><Icon name="folder" />프로젝트 열기</button><button @click="showSnapshots"><Icon name="reset" />최근 저장 복구</button><button @click="backup"><Icon name="archive" />프로젝트 백업 <span>.tssproj</span></button><button @click="menu = false; restoreInput.click()"><Icon name="upload" />프로젝트 복원</button><button @click="showBackupGuide"><Icon name="help" />백업·복원 가이드</button></div></div>
      <div class="history-controls"><button class="icon-button" title="실행 취소 (Ctrl+Z)" aria-label="실행 취소" :disabled="!p.canUndo || !!editor.busy" @click="p.undo()"><Icon name="undo" /></button><button class="icon-button" title="다시 실행 (Ctrl+Shift+Z)" aria-label="다시 실행" :disabled="!p.canRedo || !!editor.busy" @click="p.redo()"><Icon name="redo" /></button></div>
      <span class="save-state" :class="editor.saveStatus" role="status"><Icon :name="saveIcon" :size="15" :class="{ spin: ['saving','loading'].includes(editor.saveStatus) }" /><span>{{ saveLabel }}</span></span>
      <button class="icon-button help-button" title="사용 안내" aria-label="사용 안내" @click="modal = 'help'"><Icon name="help" /></button><button class="export-button" :disabled="!editor.ready || !!editor.busy" @click="png"><Icon :name="editor.busy ? 'loading' : 'download'" :size="17" :class="{ spin: editor.busy }" />PNG 다운로드</button>
    </header>
    <div v-if="editor.error" class="save-error" role="alert"><Icon name="alert" :size="17" /><span>{{ editor.error }}</span><button v-if="!editor.loadError" @click="persistence.save()">다시 저장</button><button @click="showSnapshots">최근 저장 복구</button><button v-if="editor.loadError" @click="newProject">새 프로젝트</button><button @click="backup">백업</button></div>
    <div v-if="editor.conflict" class="save-error conflict-banner" role="alert"><Icon name="alert" :size="17" /><span>다른 탭에서 프로젝트가 변경되었어요. 현재 작업을 보관하려면 사본으로 저장해 주세요.</span><button :disabled="!!editor.busy" @click="resolveConflict(true)">현재 작업 사본 저장</button><button :disabled="!!editor.busy" @click="resolveConflict(false)">현재 편집 취소 · 최신 버전 열기</button><button @click="backup">백업</button></div>
    <div class="workspace" :inert="!editor.ready||!!editor.busy||editor.loadError||!!editor.conflict">
      <nav class="tool-rail" aria-label="편집 도구"><div class="rail-tools"><button v-for="tab in tabs" :key="tab.id" :class="{ active: editor.tab === tab.id }" :aria-pressed="editor.tab === tab.id" @click="editor.setTab(tab.id)"><Icon :name="tab.icon" :size="21" /><span>{{ tab.name }}</span></button></div><div class="rail-backup-actions"><button class="rail-bottom" title="프로젝트 백업" aria-label="프로젝트 백업" @click="backup"><Icon name="archive" :size="21" /><span>백업</span></button><button class="rail-guide-button" title="백업·복원 가이드" @click="showBackupGuide"><Icon name="help" :size="16" /><span>백업 가이드</span></button></div></nav>
      <aside class="tool-panel"><SchedulePanel v-if="editor.tab === 'schedule'" @week="week" /><ToolsPanel v-else @upload="chooseUpload()" @text="addText" @reference="addReference" @cleanup="cleanupImages" /><div class="panel-end"><span>MADE FOR TENTA SIHYEON</span><i>✦</i></div></aside>
      <main class="canvas-workspace">
        <div class="canvas-toolbar"><div class="canvas-breadcrumb"><span>내 스튜디오</span><Icon name="right" :size="12" /><strong>{{ weekLabel }}</strong><span class="live-pill"><i></i> LIVE PREVIEW</span></div><div class="mode-switch segmented"><button :class="{ active: editor.mode === 'schedule' }" @click="editor.setTab('schedule')"><Icon name="calendar" :size="14" />일정 편집</button><button :class="{ active: editor.mode === 'design' }" @click="editor.mode = 'design'"><Icon name="pointer" :size="14" />디자인 편집</button></div></div>
        <div class="canvas-subbar"><span><Icon :name="editor.mode === 'schedule' ? 'lock' : 'move'" :size="13" />{{ editor.mode === 'schedule' ? '일정을 작성하면 미리보기에 바로 반영돼요.' : '방향키 이동 · Shift 10px · Alt 드래그 스냅 해제' }}</span><div class="canvas-options"><button class="preflight-button" :class="{ 'has-error': errors.length }" @click="modal='preflight'"><Icon :name="errors.length?'alert':'check'" :size="13" />출력 점검 {{ editor.issues.length ? `(${editor.issues.length})` : '' }}</button><button v-if="editor.mode==='design'" :class="{active:editor.snapping}" @click="editor.snapping=!editor.snapping">스냅</button><button :class="{ active: editor.guides }" @click="editor.guides = !editor.guides"><Icon name="fit" :size="13" />안전 영역</button></div></div>
        <CanvasEditor ref="canvas" />
        <div class="canvas-caption"><span>YOUR WEEK. YOUR STORY.</span><span>미리보기의 모든 변경 사항은 자동으로 저장돼요.</span></div>
        <footer class="canvas-footer"><span class="resolution"><i></i>1920 × 1080 <small>px</small></span><span class="footer-mode">{{ editor.mode === 'schedule' ? '일정 편집 모드' : `${p.elements.length}개의 디자인 요소` }}</span><div class="zoom-controls"><button class="icon-button" aria-label="축소" @click="zoom(editor.zoom - .05)"><Icon name="zoomOut" :size="16" /></button><input aria-label="캔버스 확대 배율" type="range" min="0.1" max="1.5" step="0.01" :value="editor.zoom" @input="zoom($event.target.value)" /><span>{{ Math.round(editor.zoom * 100) }}%</span><button class="icon-button" aria-label="확대" @click="zoom(editor.zoom + .05)"><Icon name="zoomIn" :size="16" /></button><button class="fit-button" title="화면에 맞춤" @click="fit"><Icon name="fit" :size="15" /><span>맞춤</span></button></div></footer>
      </main>
      <aside class="inspector"><Inspector @replace="chooseUpload" /><div class="local-note"><Icon name="lock" :size="12" />이 브라우저에 안전하게 저장됩니다</div></aside>
    </div>
    <input ref="uploadInput" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple @change="upload" />
    <input ref="restoreInput" class="sr-only" type="file" accept=".tssproj" @change="prepareImport" />
    <div class="toast-stack" aria-live="polite"><div v-for="n in editor.notices" :key="n.id" class="toast" :class="n.type"><Icon :name="n.type === 'error' ? 'alert' : 'success'" :size="19" /><span>{{ n.message }}</span><button class="icon-button" aria-label="알림 닫기" @click="editor.notices = editor.notices.filter(x => x.id !== n.id)"><Icon name="close" :size="15" /></button></div></div>
    <div v-if="editor.busy" class="busy-badge" role="status"><Icon name="loading" :size="17" class="spin" />{{ editor.busy }}</div>
    <div v-if="!editor.ready" class="loading-screen" role="status"><Icon name="loading" :size="28" class="spin" /><strong>저장된 스튜디오를 불러오고 있어요</strong><span>준비가 끝나면 편집을 시작할 수 있어요.</span></div>
    <div v-if="modal || editor.onboarding" class="modal-backdrop" @mousedown.self="editor.onboarding ? dismissOnboarding() : closeModal()">
      <section class="modal" :class="{ 'backup-guide-modal': modal === 'backupGuide' }" role="dialog" aria-modal="true" :aria-label="editor.onboarding ? '스튜디오에 오신 것을 환영해요' : modal === 'backupGuide' ? '백업·복원 가이드' : '프로젝트 작업'">
        <button class="modal-close icon-button" aria-label="닫기" :disabled="!!editor.busy" @click="editor.onboarding ? dismissOnboarding() : closeModal()"><Icon name="close" /></button>
        <template v-if="editor.onboarding || modal === 'help'"><span class="modal-emblem"><Icon name="book" :size="29" /></span><span class="eyebrow">WELCOME TO YOUR ATELIER</span><h2>매주의 이야기를, 한 장에.</h2><p>텐타시현을 위한 작은 디자인 스튜디오.<br>일정을 채우고, 나만의 무드로 완성해 보세요.</p><div class="onboarding-steps"><div><b>01</b><span><strong>이번 주의 일정 채우기</strong>요일을 선택하고 방송·휴방·미정을 기록해요.</span></div><div><b>02</b><span><strong>시현다운 디자인 만들기</strong>템플릿, 이미지와 텍스트를 자유롭게 편집해요.</span></div><div><b>03</b><span><strong>한 장으로 나누기</strong>원본 크기 PNG로 저장하고 프로젝트도 백업해요.</span></div></div><button class="primary-button wide" @click="editor.onboarding ? dismissOnboarding() : closeModal()">{{ editor.onboarding ? '이번 주 만들기' : '편집으로 돌아가기' }}<Icon name="right" :size="17" /></button><button v-if="!editor.onboarding" class="quiet-button wide help-backup-guide" @click="showBackupGuide"><Icon name="archive" :size="15" />백업·복원 가이드<Icon name="right" :size="15" /></button><small class="modal-footnote">로그인 없이, 이 브라우저에 자동 저장됩니다.</small></template>
        <BackupGuide v-else-if="modal === 'backupGuide'" :busy="!!editor.busy" @backup="backup" @restore="restoreInput.click()" @close="closeModal" />
        <template v-else-if="modal === 'week'"><span class="modal-emblem"><Icon name="calendar" :size="28" /></span><span class="eyebrow">A NEW CHAPTER</span><h2>새로운 한 주를 열어요</h2><p>{{ pendingWeek }} — {{ addDays(pendingWeek, 6) }}<br>지금의 디자인을 그대로 이어서 시작해요.</p><label class="copy-option"><input v-model="copyWeek" type="checkbox" /><span><strong>방송 일정도 함께 복사</strong><small>선택하지 않으면 빈 일정으로 시작해요.</small></span></label><div class="modal-actions"><button class="secondary-button" @click="closeModal">취소</button><button class="primary-button" @click="confirmWeek">새 주 만들기<Icon name="right" :size="16" /></button></div></template>
        <template v-else-if="modal === 'restore' && pendingImport"><span class="modal-emblem"><Icon name="archive" :size="28" /></span><h2>프로젝트를 복원할까요?</h2><p><strong>{{ pendingImport.project.name }}</strong><br>{{ pendingImport.project.activeWeek }} · 이미지 {{ pendingImport.assets.length }}개</p><div class="inline-hint"><Icon name="info" :size="18" />현재 작업은 저장하고, 백업을 새 프로젝트로 열어요. 이전 프로젝트도 다시 열 수 있어요.</div><div class="modal-actions"><button class="secondary-button" :disabled="!!editor.busy" @click="closeModal">취소</button><button class="primary-button" :disabled="!!editor.busy" @click="confirmImport">복원하기</button></div></template>
        <template v-else-if="modal === 'projects'"><span class="eyebrow">YOUR COLLECTION</span><h2>내 프로젝트</h2><div class="recent-projects"><button v-for="data in recent" :key="data.id" :disabled="data.id === p.data.id || !!editor.busy" @click="openProject(data)"><Icon name="book" :size="23" /><span><strong>{{ data.name }}</strong><small>{{ data.activeWeek }} · {{ data.id === p.data.id ? '현재 프로젝트' : '이 브라우저에 저장됨' }}</small></span><Icon name="right" :size="16" /></button></div><button class="primary-button wide" :disabled="!!editor.busy" @click="newProject"><Icon name="plus" :size="17" />새 프로젝트</button></template>
        <template v-else-if="modal==='snapshots'"><span class="eyebrow">RECOVER YOUR WORK</span><h2>최근 저장 복구</h2><p>프로젝트마다 최대 10개, 30초 간격의 저장 상태를 보관해요. 선택한 상태는 새 사본으로 복구해요.</p><div class="snapshot-list"><button v-for="entry in snapshots" :key="entry.id" :class="{active:selectedSnapshot?.id===entry.id}" :disabled="!!editor.busy" @click="previewSnapshot(entry)"><strong>{{entry.data.name}}</strong><span>{{new Date(entry.createdAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}} · {{entry.data.activeWeek}}</span></button><p v-if="!snapshots.length" class="muted-copy">복구할 저장 상태가 없어요. .tssproj 백업을 가져올 수 있어요.</p></div><img v-if="snapshotPreview" class="snapshot-preview" :src="snapshotPreview" alt="선택한 저장 상태 미리보기" /><button class="primary-button wide" :disabled="!selectedSnapshot||!!editor.busy" @click="restoreSnapshot">선택한 상태 사본 복구<Icon name="reset" :size="16" /></button></template>
        <template v-else-if="modal==='preflight'"><span class="eyebrow">BEFORE YOU SHARE</span><h2>출력 전 점검</h2><p>{{errors.length?`${errors.length}개 항목을 수정하거나 요약 표시를 허용해 주세요.`:'원본 1920 × 1080 해상도로 내보낼 수 있어요.'}}</p><div class="issue-list"><button v-for="(issue,i) in editor.issues" :key="i" :class="issue.severity" @click="jumpToIssue(issue)"><Icon :name="issue.severity==='error'?'alert':'info'" :size="16" /><span>{{issue.message}}</span><Icon name="right" :size="13" /></button><p v-if="!editor.issues.length" class="preflight-ok"><Icon name="success" />확인된 문제가 없어요.</p></div><label class="check-field"><input aria-label="출력 설명 표시" type="checkbox" :checked="p.data.design.scheduleSettings.showDescriptions" @change="p.updateScheduleSettings({showDescriptions:$event.target.checked})" />일정 설명 표시</label><label class="check-field"><input aria-label="출력 요약 허용" type="checkbox" :checked="p.data.design.scheduleSettings.allowSummary" @change="p.updateScheduleSettings({allowSummary:$event.target.checked})" />공간을 넘는 글 요약 허용 · 원문은 보관</label><p class="font-note">Windows 기본 폰트를 사용합니다. 다른 OS에서는 대체 폰트로 줄바꿈이 달라질 수 있어요.</p><div class="modal-actions"><button class="secondary-button" @click="closeModal">편집으로 돌아가기</button><button class="primary-button" :disabled="!!errors.length||!!editor.busy" @click="modal='';png()">점검 후 PNG 다운로드</button></div></template>
      </section>
    </div>
  </div>
</template>
