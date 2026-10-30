<script setup>
import { useProjectStore } from '../stores/project'
import { useScheduleStore } from '../stores/schedule'
import { useEditorStore } from '../stores/editor'
import { DAYS, shortDate, LIMITS, isOvernight } from '../lib/model'
import Icon from './Icon.vue'
import QuickContent from './QuickContent.vue'
const project = useProjectStore(), schedule = useScheduleStore()
const editor = useEditorStore()
function paste() { if (!schedule.pasteDay()) editor.notify('하루 최대 6개까지 등록할 수 있어요.','error') }
function saveContent(event) {
  const result = schedule.saveContent(event)
  const messages = { saved: '내 콘텐츠에 저장했어요. 이 프로젝트의 백업에도 함께 담겨요.', duplicate: '이미 같은 콘텐츠가 저장되어 있어요.', empty: '먼저 방송 제목을 입력해 주세요.', full: '내 콘텐츠는 프로젝트마다 24개까지 저장할 수 있어요.' }
  editor.notify(messages[result], result === 'saved' ? 'success' : 'error')
}
const emit = defineEmits(['week'])
const statuses = [{ id: 'broadcast', label: '방송' }, { id: 'off', label: '휴방' }, { id: 'tbd', label: '미정' }]
</script>
<template>
  <div class="panel-title"><div><span class="eyebrow">WEEKLY PLANNER</span><h2>일정 편집</h2></div><span class="small-tag">KST</span></div>
  <div class="week-picker"><button class="icon-button" title="이전 주" aria-label="이전 주" @click="emit('week', -1)"><Icon name="left" :size="16" /></button><label class="date-control"><span>{{ project.data.activeWeek.replaceAll('-', '.') }}</span><input aria-label="주간 날짜 선택" type="date" :value="project.data.activeWeek" @change="emit('week', $event.target.value)" /></label><button class="icon-button" title="다음 주" aria-label="다음 주" @click="emit('week', 1)"><Icon name="right" :size="16" /></button></div>
  <div class="day-strip"><button v-for="(day, i) in schedule.days" :key="day.date" :class="{ active: schedule.selectedDay === i, weekend: i > 4 }" :aria-label="`${DAYS[i]}요일 ${day.date}`" :aria-pressed="schedule.selectedDay === i" @click="schedule.selectedDay = i"><span>{{ DAYS[i] }}</span><strong>{{ Number(day.date.slice(-2)) }}</strong><i :class="{ filled: day.events.length }"></i></button></div>
  <div class="day-heading"><h3>{{ shortDate(schedule.day.date) }} <span>{{ DAYS[schedule.selectedDay] }}요일</span></h3><span>{{ schedule.day.events.length }}개의 일정</span></div>
  <div class="day-copy"><button class="quiet-button" :disabled="!schedule.day.events.length" @click="schedule.copyDay(); editor.notify('하루 일정을 복사했어요. 다른 요일에 붙여넣어 보세요.')"><Icon name="copy" :size="13" />하루 복사</button><button class="quiet-button" :disabled="!schedule.clipboard?.length" @click="paste">붙여넣기 · 추가</button></div>
  <QuickContent />
  <div v-if="!schedule.day.events.length" class="empty-day"><div class="empty-icon"><Icon name="calendar" :size="24" /></div><strong>아직 정해진 일정이 없어요</strong><p>방송이나 쉬어가는 날을 기록해 보세요.<br>변경 사항은 캔버스에 바로 반영돼요.</p></div>
  <article v-for="(event, i) in schedule.day.events" :key="event.id" class="event-card" :data-testid="`event-${i}`">
    <div class="event-top"><span><i :class="event.status"></i> 일정 {{ String(i + 1).padStart(2, '0') }}</span><div class="event-tools"><button class="icon-button subtle" aria-label="일정 위로" :disabled="i===0" @click="schedule.reorder(event.id,-1)"><Icon name="up" :size="13" /></button><button class="icon-button subtle" aria-label="일정 아래로" :disabled="i===schedule.day.events.length-1" @click="schedule.reorder(event.id,1)"><Icon name="lower" :size="13" /></button><button class="icon-button subtle" aria-label="일정 복제" :disabled="schedule.day.events.length>=LIMITS.events" @click="schedule.duplicate(event.id)"><Icon name="copy" :size="13" /></button><button class="icon-button subtle danger" title="일정 삭제" aria-label="일정 삭제" @click="schedule.remove(event.id)"><Icon name="trash" :size="15" /></button></div></div>
    <div class="segmented status-selector"><button v-for="state in statuses" :key="state.id" :class="{ active: event.status === state.id }" :aria-pressed="event.status === state.id" @click="schedule.update(event.id, { status: state.id })">{{ state.label }}</button></div>
    <label class="field"><span>{{ event.status === 'off' ? '휴방 메시지' : '방송 제목' }}</span><textarea rows="2" :maxlength="LIMITS.title" :placeholder="event.status === 'off' ? '오늘은 쉬어갑니다' : '어떤 이야기를 들려주실 건가요?'" :value="event.title" aria-label="방송 제목" @input="schedule.update(event.id, { title: $event.target.value })"></textarea></label>
    <div v-if="event.status === 'broadcast'" class="field-row"><label class="field"><span>시작 시간</span><input type="time" aria-label="시작 시간" :value="event.start" @input="schedule.update(event.id, { start: $event.target.value })" /></label><label class="field"><span>종료 시간 <small>선택</small></span><input type="time" aria-label="종료 시간" :value="event.end" @input="schedule.update(event.id, { end: $event.target.value })" /></label></div>
    <p v-if="event.status==='broadcast'&&isOvernight(event)" class="overnight-note">종료 시간은 다음 날 (+1일)로 표시돼요.</p>
    <label class="field"><span>설명 <small>선택</small></span><textarea rows="2" :maxlength="LIMITS.description" :value="event.description" placeholder="게임 이름, 함께하는 사람, 짧은 한마디" aria-label="일정 설명" @input="schedule.update(event.id, { description: $event.target.value })"></textarea></label>
    <button class="quiet-button wide save-content-button" :aria-label="`일정 ${i + 1} 내 콘텐츠로 저장`" :disabled="!event.title.trim()" @click="saveContent(event)"><Icon name="archive" :size="13" />내 콘텐츠로 저장<Icon name="plus" :size="12" /></button>
  </article>
  <button class="add-event" :disabled="schedule.day.events.length >= LIMITS.events" @click="schedule.add()"><Icon name="plus" :size="17" /> {{ schedule.day.events.length >= LIMITS.events ? '하루 최대 6개까지 등록할 수 있어요' : '일정 추가' }}</button>
  <div class="panel-note"><Icon name="lock" :size="15" /><p>일정 편집 중에는 디자인이 고정돼요.<br>마음 편히 이번 주를 채워보세요.</p></div>
  <details class="schedule-options"><summary>일정표 표시 설정</summary><label class="field"><span>한 줄의 일정 열 수</span><select aria-label="일정 열 수" :value="project.data.design.scheduleSettings.columns" @change="project.updateScheduleSettings({columns:Number($event.target.value)})"><option :value="0">자동 · 최대 3열</option><option :value="1">1열</option><option :value="2">2열</option><option :value="3">3열</option></select></label><label class="check-field"><input aria-label="일정 설명 표시" type="checkbox" :checked="project.data.design.scheduleSettings.showDescriptions" @change="project.updateScheduleSettings({showDescriptions:$event.target.checked})" />설명 표시</label><label class="check-field"><input aria-label="넘치는 글 요약 허용" type="checkbox" :checked="project.data.design.scheduleSettings.allowSummary" @change="project.updateScheduleSettings({allowSummary:$event.target.checked})" />넘치는 글 요약 허용</label><p>최소 글자 크기는 제목 18 px, 설명 12 px예요. 공간이 부족하면 출력 점검에서 알려드려요. 요약을 허용해도 입력한 원문은 보관돼요.</p></details>
</template>
