# SIHYEON STUDIO v1.0 requirements

Windows PC browser, Vue 3 + Vite + Pinia + Konva/vue-konva + Dexie + JSZip + Lucide; JavaScript only. Static hosting; no auth or backend.

Create a Monday-based weekly broadcast schedule. Each date supports multiple broadcasts with title, start/end, description and broadcast/off/tbd state. Schedule mode prevents canvas movement. Design mode supports selection, drag, resize, rotation, numeric properties, text styles, image aspect ratio, lock, visibility and layer order.

Two original abstract templates: Burgundy Academy and Expelled Magic Journal. No fabricated official illustration or logo. Local PNG/JPEG/WEBP uploads only. First launch displays current week and onboarding guidance.

Store projects/schemaVersion, image Blobs, snapshots and preferences in IndexedDB. Debounce writes 800 ms. Ctrl+Z/Ctrl+Shift+Z/Delete/Esc, fit and zoom. Next week retains design, defaults to empty schedules and offers copying.

Export 1920×1080 PNG regardless of view zoom, without selection/guides, after images/fonts load. Export/import `.tssproj` ZIP including images and manifest schemaVersion. Validate corrupted, unsupported, unsafe and missing files. Handle quota, loading and decode errors with visible messages.

Primary desktop sizes: 1440×900 and 1366×768. Document installation, architecture, design system, test plan and actual verification outcomes.
