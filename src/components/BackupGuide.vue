<script setup>
import Icon from './Icon.vue'
defineProps({ busy: Boolean })
defineEmits(['backup', 'restore', 'close'])
</script>

<template>
  <div class="backup-guide-content">
    <span class="eyebrow">KEEP YOUR WORK</span>
    <h2>백업·복원 가이드</h2>
    <p class="backup-guide-intro">이미지와 일정을 파일 하나에 보관하고, 필요할 때 다시 이어서 작업하세요.</p>

    <div class="backup-guide-storage">
      <Icon name="info" :size="19" />
      <p><strong>자동 저장은 지금 사용하는 브라우저에만 남아요.</strong><br>사이트 데이터를 지우거나 다른 PC·브라우저·주소로 옮기기 전에 백업 파일을 저장해 주세요. 최근 저장 복구도 같은 브라우저에 보관됩니다.</p>
    </div>

    <div class="backup-guide-steps">
      <section class="backup-guide-card">
        <h3><Icon name="archive" :size="19" />백업 파일 저장하기</h3>
        <ol>
          <li>왼쪽 아래 <strong>백업</strong> 또는 상단 프로젝트 이름 <strong>⌄ → 프로젝트 백업</strong>을 누르세요.</li>
          <li><strong>SIHYEON_날짜.tssproj</strong> 파일이 다운로드됩니다. 저장 위치는 브라우저의 다운로드 목록에서 확인하세요.</li>
          <li>다운로드가 끝난 파일을 PC의 보관 폴더에 넣어 두세요. 수정 후에는 새 백업을 받아 주세요.</li>
        </ol>
        <button class="primary-button" :disabled="busy" @click="$emit('backup')"><Icon name="download" :size="16" />지금 백업 저장</button>
      </section>

      <section class="backup-guide-card">
        <h3><Icon name="upload" :size="19" />백업 파일 불러오기</h3>
        <ol>
          <li>사용할 사이트에서 상단 <strong>프로젝트 이름 ⌄ → 프로젝트 복원</strong>을 누르세요.</li>
          <li>PC에 보관한 <strong>.tssproj</strong> 파일을 선택하세요. 압축을 풀 필요는 없어요.</li>
          <li>프로젝트 이름과 이미지 수를 확인하고 <strong>복원하기</strong>를 누르면 새 사본으로 열립니다. 이전 작업도 유지됩니다.</li>
        </ol>
        <button class="secondary-button" :disabled="busy" @click="$emit('restore')"><Icon name="folder" :size="16" />복원 파일 선택</button>
      </section>
    </div>

    <div class="backup-guide-filetypes">
      <p><strong>.tssproj</strong><span>현재 프로젝트의 일정·이미지·디자인을 함께 담은 편집용 백업</span></p>
      <p><strong>.png</strong><span>공유용 완성 이미지 · 편집 가능한 프로젝트로 복원할 수 없어요.</span></p>
    </div>
    <button class="quiet-button backup-guide-close" :disabled="busy" @click="$emit('close')">편집으로 돌아가기<Icon name="right" :size="15" /></button>
  </div>
</template>
