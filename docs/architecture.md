# SIHYEON STUDIO architecture

`src/lib/content.js`는 SOOP 참고 기본 콘텐츠와 콘텐츠→방송 데이터 변환을 제공합니다. 개인화 항목은 프로젝트 루트의 선택 필드 `contentPresets`에 저장하며 최대 24개, ID·제목·설명·상태를 검증합니다. 이전 프로젝트에서는 빈 배열로 복구합니다. 추가·보관·삭제는 기존 Pinia 변경분 기록을 사용하므로 Undo와 백업/복원에 포함됩니다. 기본 목록과 입력을 연결하는 `QuickContent.vue`는 외부 사이트를 자동 호출하지 않습니다.

일정표 폰트는 `design.scheduleSettings.fontFamily`에 저장합니다. `template`은 기존 날짜/본문의 글꼴 조합을 유지하고, 지정된 글꼴은 일정표 안의 요일·날짜·시간·제목·설명에 함께 적용합니다. 일정 원문에는 디자인 정보를 중복 저장하지 않습니다. 동일한 렌더러와 글꼴 준비 과정이 미리보기·썸네일·출력 전 점검·PNG에 적용됩니다. 이전 백업에서 필드가 없으면 `template`으로 보완합니다.

Vue 3 Composition API / JavaScript / Vite. No application server, account, external image URL, or cloud database.

- `stores/project.js`: schema-versioned project, design elements, history, project operations.
- `stores/schedule.js`: weekly data access and schedule mutations; data lives only in `project.weeks`.
- `stores/editor.js`: transient selection, mode, zoom, save status and notices.
- `lib/model.js`: dates, schema validation, layout and factory functions.
- `lib/storage.js`: Dexie projects/assets/snapshots/preferences and atomic saves.
- `lib/archive.js`: ZIP `.tssproj` validation and import/export.
- `lib/renderer.js`: shared Konva rendering, independent full-resolution PNG export.
- `components/CanvasEditor.vue`: vue-konva stage, original-coordinate transforms and selection UI.

The canvas always uses 1920×1080 coordinates. View scale is transient. The export stage uses scale 1 and contains only output layers. Schedule nodes are generated from weekly source data and never serialized as duplicate text objects. Images are Blobs addressed by assetId. Object URLs are owned and revoked by the asset loader.

Editing creates bounded path-based before/after patches; typing coalesces changes for 700 ms. Undo/Redo keeps 70 entries without retaining full projects in each entry. New weeks preserve all design elements and offer an explicit schedule-copy choice. Autosave is debounced 800 ms. A compare-and-swap version inside the same IndexedDB transaction prevents stale writes; BroadcastChannel provides immediate cross-tab notification. Conflicts require a copy save or explicit reload.

Scene nodes and schedule rows are reused. Background and decoration update only when their dependencies change. Text fitting uses a bounded measurement cache and binary search, with 18 px title and 12 px description targets. Overflow is surfaced before output; explicit summary permission preserves source data while using ellipsis. The same renderer supplies thumbnails, preflight and full-resolution output.

Assets retain original Blobs plus at-most-768 px previews. Full-resolution images are decoded only for export with a total pixel budget and released afterwards. Only dirty assets are written. Garbage collection protects all project/snapshot/live/history references. Snapshot previews release temporary assets. ZIP creation and restoration share byte limits and validate CRC, version and references. Restoration creates a new project and asset identities. IndexedDB snapshots retain up to ten states, first save plus changes at least 30 seconds apart, with a preview/copy-recovery UI.

Geometry constraints are centralized in model.js for numeric edits, transforms and validation. schemaVersion remains 1 with backward-compatible optional schedule and crop settings. Cloudflare hosting remains static; no cloud project API is included.
