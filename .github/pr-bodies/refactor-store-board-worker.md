Refactor: Zustand `useMatrixStore` cleanup, optimistic `boardService` notifications, and service-worker background-sync removal

Summary
- Move toward more deterministic resource cleanup and safer offline behavior:
  - `src/stores/useMatrixStore.ts`: ensure a single parked-task interval and deterministic realtime unsubscribe capture; add `cleanup()` to clear interval and unsubscribe safely.
  - `src/services/boardService.ts`: add optimistic notifications around create/update/delete board operations and safer error reporting.
  - `src/service-worker.ts`: remove partially-implemented cache-based background-sync replay and add guidance to implement an IndexedDB-backed queue instead.

Files changed
- `src/stores/useMatrixStore.ts`  deterministic interval/unsubscribe handling and cleanup logic.
- `src/services/boardService.ts`  optimistic notifications for board CRUD flows; non-fatal notification errors logged.
- `src/service-worker.ts`  removed fragile background-sync replay; added implementation notes.

Why
- These changes reduce resource-leak risk (multiple intervals/subscriptions) and give users clearer feedback for board operations. The service-worker change avoids unreliable cache-replay logic and documents a safer approach.

Testing / How to validate
- Start the app locally and verify:
  - Parked-task behavior: ensure only one interval is active (reload and confirm no duplicate timers).
  - Board create/update/delete flows: notifications appear showing progress and success/failure.
  - Service worker build: no background-sync replay code remains; PWA still registers successfully.

Reviewer notes
- I focused only on deterministic cleanup and notification UX; I intentionally avoided broad refactors. If you want, I can split the store changes into a dedicated slice-per-responsibility PR next.

Rollback
- Revert this branch; the commits are limited to the three files above.

Related issues
- (optional) Link any issue IDs or tickets.

Signed-off-by: Neurotype Planner automated changes
