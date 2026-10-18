# SIHYEON STUDIO architecture

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
