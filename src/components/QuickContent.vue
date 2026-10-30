<script setup>
import { computed } from 'vue'
import { useProjectStore } from '../stores/project'
import { useScheduleStore } from '../stores/schedule'
import { useEditorStore } from '../stores/editor'
import { BUILT_IN_CONTENT, CONTENT_SOURCE } from '../lib/content'
import { LIMITS, shortDate } from '../lib/model'
import Icon from './Icon.vue'
const project = useProjectStore(), schedule = useScheduleStore(), editor = useEditorStore()
const saved = computed(() => project.data.contentPresets || [])
const full = computed(() => schedule.day.events.length >= LIMITS.events)
function add(preset) {
  if (!schedule.addContent(preset)) return editor.notify('하루 최대 6개까지 등록할 수 있어요.', 'error')
  editor.notify(`${shortDate(schedule.day.date)}에 ‘${preset.label}’ 일정을 추가했어요.`, 'success')
}
function remove(preset) { schedule.removeContent(preset.id); editor.notify('내 콘텐츠에서 삭제했어요. 실행 취소로 되돌릴 수 있어요.') }
</script>

<template>
  <details class="quick-content" open>
    <summary><Icon name="sparkle" :size="15" /><strong>콘텐츠 간편 입력</strong><span>{{ schedule.day.events.length }}/{{ LIMITS.events }}</span><Icon name="down" :size="13" /></summary>
    <div class="quick-content-body">
      <label class="quick-content-time"><span>추가할 시작 시간</span><input aria-label="간편 입력 시작 시간" type="time" v-model="schedule.quickStart" /></label>
      <div class="content-chip-grid" role="group" aria-label="기본 콘텐츠">
        <button v-for="preset in BUILT_IN_CONTENT" :key="preset.id" :aria-label="`${preset.label} 간편 추가`" :class="{ 'day-off-chip': preset.status === 'off' }" :disabled="full" @click="add(preset)">{{ preset.label }}</button>
      </div>
      <template v-if="saved.length">
        <div class="saved-content-heading"><strong>내 콘텐츠</strong><span>{{ saved.length }}/{{ LIMITS.contentPresets }}</span></div>
        <div class="saved-content-list" role="group" aria-label="내 콘텐츠">
          <div v-for="preset in saved" :key="preset.id" class="saved-content-item">
            <button :disabled="full" :aria-label="`${preset.label} 내 콘텐츠 추가`" :title="preset.title" @click="add(preset)"><Icon name="plus" :size="12" /><span>{{ preset.label }}</span></button>
            <button class="icon-button" :aria-label="`${preset.label} 내 콘텐츠 삭제`" @click="remove(preset)"><Icon name="close" :size="12" /></button>
          </div>
        </div>
      </template>
      <p class="quick-content-hint">{{ full ? '하루 최대 6개예요. 다른 날짜를 선택하거나 일정을 정리해 주세요.' : '선택한 날짜에 새 일정으로 추가해요. 휴방에는 시간이 들어가지 않아요.' }}</p>
      <a class="content-source" :href="CONTENT_SOURCE" target="_blank" rel="noopener noreferrer">시현 SOOP 방송국 참고<Icon name="external" :size="11" /></a>
    </div>
  </details>
</template>
