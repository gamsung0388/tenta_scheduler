# Test plan

Automated model tests: Monday start including Sunday; month/year rollover; empty next week and copied week; source-data preservation on template switch; multiple broadcasts; validation; long title layout; upload signatures; archive corruption/missing images.

Browser integration: edit statuses and multiple broadcasts, undo/redo, long text, template preservation, text selection and properties, image transform/save/reload, ZIP roundtrip including image, PNG dimensions and selection exclusion. Exercise failed image decoding, font load failure and IndexedDB quota rejection. Inspect layouts at 1366×768 and 1440×900.

Build with `npm run build`. Results and remaining limitations will be recorded in `docs/test-results.md` after implementation.

v1.1 adds regression checks for geometry and crop roundtrips, patch history, minimum-readable-text preflight, explicit summaries retaining original text, recovery after corrupt project records, delayed initial loading, BroadcastChannel and database-only save conflicts, dirty Blob writes, node reuse, preview pixel budgets, asset cleanup protection, backup capacity and hidden missing images. A representative 100-element workload compares old and new main-thread task duration; results are measurements for that fixture rather than a general speed guarantee.
