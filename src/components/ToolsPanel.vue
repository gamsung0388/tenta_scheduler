<script setup>
import { computed, ref, onMounted } from 'vue'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import { assetCache } from '../lib/assets'
import { THEMES } from '../lib/model'
import { REFERENCE_IMAGES, referenceUrl } from '../lib/references'
import { templateThumbnail } from '../lib/renderer'
import Icon from './Icon.vue'
const emit = defineEmits(['upload', 'text', 'reference', 'cleanup'])
const thumbnails = ref({})
onMounted(async () => { await document.fonts?.ready; for (const id of Object.keys(THEMES)) thumbnails.value[id] = templateThumbnail(id) })
const p = useProjectStore(), editor = useEditorStore()
const assets = computed(() => [...assetCache.values()])
const titles = { template: ['CURATED FOR SIHYEON', '템플릿'], image: ['YOUR OWN COLLECTION', '이미지'], text: ['MAKE IT YOURS', '텍스트'], layers: ['THE LITTLE DETAILS', '레이어'] }
function select(id) { editor.selection = id; editor.mode = 'design' }
</script>
<template>
  <div class="panel-title"><div><span class="eyebrow">{{ titles[editor.tab]?.[0] }}</span><h2>{{ titles[editor.tab]?.[1] }}</h2></div><Icon :name="editor.tab" :size="21" /></div>
  <template v-if="editor.tab === 'template'">
    <p class="panel-intro">시현의 한 주를 담는 두 가지 무드.<br>일정과 배치는 그대로, 분위기만 바뀌어요.</p>
    <button v-for="(theme, id) in THEMES" :key="id" class="template-card" :class="{ selected: p.data.design.templateId === id }" @click="p.setTemplate(id)">
      <div class="template-preview actual-preview"><img v-if="thumbnails[id]" :src="thumbnails[id]" :alt="`${theme.name} 실제 출력 미리보기`" /><span class="template-picked" v-if="p.data.design.templateId === id"><Icon name="check" :size="14" /></span></div>
      <div class="template-label"><strong>{{ theme.name }}</strong><span>{{ theme.label }}</span></div>
    </button>
    <div class="panel-note"><Icon name="info" :size="16" /><p>일러스트가 없어도 완성되는 디자인이에요. 이미지를 더해 나만의 스케줄로 꾸며보세요.</p></div>
  </template>
  <template v-if="editor.tab === 'image'">
    <button class="upload-zone" @click="emit('upload')"><span class="empty-icon"><Icon name="upload" :size="25" /></span><strong>이미지 업로드</strong><span>클릭해서 파일 선택</span><small>PNG · JPG · WEBP / 최대 15 MB</small></button>
    <div class="section-heading"><h3>내 이미지</h3><button class="quiet-button" :disabled="!!editor.busy" @click="emit('cleanup')">미사용 이미지 정리</button></div>
    <div v-if="!assets.length" class="panel-intro">캐릭터 일러스트, 배경, 장식을 올려보세요.<br>이미지는 이 브라우저에만 저장돼요.</div>
    <div class="asset-grid"><button v-for="a in assets" :key="a.id" @click="select(p.addImage(a))" :title="`${a.name} 캔버스에 추가`"><img :src="a.url" :alt="a.name" /><span>{{ a.name }}</span></button></div>
    <div class="section-heading reference-heading"><h3>시현 참고 이미지</h3><span class="small-tag">사용자 제공</span></div>
    <div class="reference-grid"><button v-for="r in REFERENCE_IMAGES" :key="r.id" :title="`${r.name} 추가`" :aria-label="`${r.name} 추가`" :disabled="!!editor.busy" @click="emit('reference', r.id)"><img :src="referenceUrl(r)" :alt="r.name" /><span>{{ r.name.replace('텐타시현 · ', '') }}</span><i><Icon name="plus" :size="14" /></i></button></div>
    <p class="reference-note">제공해 주신 스크린샷 원본이에요.<br>클릭하면 편집 가능한 이미지로 추가돼요.</p>
    <div class="panel-note"><Icon name="info" :size="16" /><p>사용 권한이 있는 이미지를 사용해 주세요. 외부 URL과 SVG는 지원하지 않아요.</p></div>
  </template>
  <template v-if="editor.tab === 'text'">
    <p class="panel-intro">한 줄의 인사, 이번 주의 한마디.<br>텍스트로 스케줄에 온기를 더해보세요.</p>
    <button class="text-preset" @click="emit('text')"><Icon name="plus" :size="20" /><span>텍스트 추가</span></button>
    <div class="type-sample"><span class="eyebrow">A NOTE FOR THIS WEEK</span><p>See you<br>in the next chapter.</p><small>텍스트를 추가한 뒤 오른쪽 패널에서<br>폰트와 색상을 자유롭게 편집하세요.</small></div>
  </template>
  <template v-if="editor.tab === 'layers'">
    <p class="panel-intro">위에 있는 요소가 앞에 표시돼요.<br>선택 후 오른쪽 패널에서 순서를 바꾸세요.</p>
    <div v-if="!p.elements.length" class="empty-day"><Icon name="layers" :size="28" /><p>아직 디자인 요소가 없어요.</p></div>
    <div class="layer-list"><div v-for="e in [...p.elements].reverse()" :key="e.id" class="layer-row" :class="{ selected: editor.selection === e.id, dimmed: !e.visible }"><button class="layer-select" @click="select(e.id)"><Icon :name="e.type === 'schedule' ? 'calendar' : e.type" :size="17" /><span>{{ e.name }}</span></button><button class="icon-button subtle" :aria-label="e.locked ? '요소 잠금 해제' : '요소 잠금'" @click="p.updateElement(e.id, { locked: !e.locked })"><Icon :name="e.locked ? 'lock' : 'unlock'" :size="14" /></button><button class="icon-button subtle" :aria-label="e.visible ? '요소 숨기기' : '요소 표시'" @click="p.updateElement(e.id, { visible: !e.visible })"><Icon :name="e.visible ? 'eye' : 'hidden'" :size="15" /></button></div></div>
    <button v-if="!p.elements.some(e => e.type === 'schedule')" class="add-event" @click="p.restoreSchedule()"><Icon name="plus" />일정표 다시 추가</button>
    <div class="fixed-layers"><span><Icon name="lock" :size="14" /> 템플릿 장식</span><span><Icon name="lock" :size="14" /> 템플릿 배경</span></div>
  </template>
</template>
