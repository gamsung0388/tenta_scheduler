<script setup>
import { useProjectStore } from '../stores/project'
import { FONT_OPTIONS } from '../lib/model'
const project = useProjectStore()
</script>

<template>
  <label class="field">
    <span>글꼴</span>
    <select aria-label="일정표 폰트" :value="project.data.design.scheduleSettings.fontFamily || 'template'" @change="project.updateScheduleSettings({ fontFamily: $event.target.value })">
      <option value="template">템플릿 기본</option>
      <option v-for="font in FONT_OPTIONS" :key="font.value" :value="font.value">{{ font.label }}</option>
    </select>
  </label>
  <p class="muted-copy schedule-font-note">요일·날짜·시간·제목·설명에 함께 적용돼요. PC에 없는 글꼴은 대체 글꼴로 표시됩니다.</p>
</template>
