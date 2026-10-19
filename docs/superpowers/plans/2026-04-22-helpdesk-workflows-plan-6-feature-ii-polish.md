# Helpdesk Workflows — Plan 6: Frontend Feature II + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Round out the frontend workflow editor — approval-step UI inside transitions, timer trigger UI (cron + business-hours preview), visual diff between draft and published versions, bulk clone, principal name lookup, wire `useDeletePrincipalDefinition` with confirmation, confirm dialog for Apply Migration, mock fidelity (archive on publish), polish (BaseRadioGroup, useLogger, ownerScope template-literal type).

**Architecture:** Extends `helpdesk-mf/src/workflow-editor/` subsystem. New components + hooks + small mock client tweaks. No new external dependencies (leverages existing HeroUI / `@brainforgeau/components` / `@brainforgeau/observability`). Module boundary preserved — single barrel.

**Tech Stack:** Same as Plans 3 + 4.

**Branch:** `feature/workflows-editor-plan6` stacked on `feature/workflows-editor-plan4` (Plan 4 PR #9).

---

## Prerequisites / Assumptions

- Plans 3 + 4 merged-in-stack.
- `IWorkflowApiClient` already has full surface; mock client supports tenant + principal + migration.
- Real client adapter still stubbed (Plan 7 wires it after backend merge).
- `usePrincipal(principalId)` hook may not exist yet — check; if absent, just display "Principal • {id-short}" as a stop-gap until proper integration.

---

## File Structure (additions)

```
src/workflow-editor/
├── components/
│   ├── TransitionInspector.tsx               # MODIFY: approval + timer sub-editors integrated
│   ├── ApprovalStepEditor.tsx                # NEW: configure approval requirement on a transition
│   ├── TimerTriggerEditor.tsx                # NEW: cron picker + business-hours preview
│   ├── ParallelSpecEditor.tsx                # MODIFY: BaseRadioGroup instead of native radio
│   ├── ConfirmActionModal.tsx                # NEW: reusable confirm modal
│   ├── VersionDiffViewer.tsx                 # NEW: side-by-side diff of draft vs published states/transitions
│   └── BulkCloneModal.tsx                    # NEW: clone workflow definition into new name
├── pages/
│   ├── WorkflowDetailPage.tsx                # MODIFY: bulk clone button, version diff viewer
│   ├── WorkflowListPage.tsx                  # MODIFY: useLogger usage; clone shortcut row action
│   ├── PrincipalWorkflowDetailPage.tsx       # MODIFY: same as tenant
│   ├── PrincipalWorkflowListPage.tsx         # MODIFY: useDeletePrincipalDefinition wired with confirm modal
│   ├── RuleMigrationReportPage.tsx           # MODIFY: confirm modal for Apply
│   └── PrincipalLookup.tsx                   # NEW: small inline lookup that shows name (or short id fallback)
├── api/
│   ├── MockWorkflowApiClient.ts              # MODIFY: archives previous version on publish; cloneDefinition method
│   └── (RealWorkflowApiClient stays — Plan 7)
├── canvas/
│   └── WorkflowCanvas.tsx                    # MODIFY: useLogger over console.warn
├── state/
│   ├── workflowQueries.ts                    # MODIFY: useCloneDefinition mutation
│   └── (no other changes)
└── types/
    └── workflow.ts                           # MODIFY: ownerScope template-literal type
```

---

## Task 1: ownerScope template-literal type + mock fidelity

**Files:**
- Modify: `src/workflow-editor/types/workflow.ts`
- Modify: `src/workflow-editor/api/MockWorkflowApiClient.ts`

- [ ] **Step 1: Tighten `ownerScope` typing**

```ts
export type SystemOwnerScope = `system:${string}`;
export type TenantOwnerScope = `tenant:${string}`;
export type PrincipalOwnerScope = `principal:${string}`;
export type WorkflowOwnerScope = SystemOwnerScope | TenantOwnerScope | PrincipalOwnerScope;

export interface WorkflowDefinitionDto {
  // ... existing
  ownerScope: WorkflowOwnerScope;
}
```

Update mock client and any consumer to use the typed value. Existing literal strings (e.g. `'tenant:11111111111111111111111111111111'`) typecheck against `TenantOwnerScope` automatically.

- [ ] **Step 2: Mock archives previous published version on publish**

In `MockWorkflowApiClient.publishDraft`:
- Before pushing the new published version into `versions[]`, find any other version with `status === Published` and flip it to `Archived`.
- This mirrors backend Plan 2d behavior.

```ts
const previousPublished = d.versions.filter(v => v.status === VersionStatus.Published);
for (const prev of previousPublished) {
  prev.status = VersionStatus.Archived;
}
```

- [ ] **Step 3: Build + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(workflows): typed owner scope + mock archives previous published version"
```

---

## Task 2: Reusable `ConfirmActionModal`

**Files:**
- Create: `src/workflow-editor/components/ConfirmActionModal.tsx`

- [ ] **Step 1: Component**

```tsx
// src/workflow-editor/components/ConfirmActionModal.tsx
import { BaseButton, BaseModal, BaseModalBody, BaseModalContent, BaseModalFooter, BaseModalHeader } from '@brainforgeau/components';
import { ReactNode } from 'react';

export interface ConfirmActionModalProps {
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmActionModal({
  isOpen, onOpenChange, title, description, confirmLabel = 'Confirm',
  cancelLabel = 'Cancel', destructive, isLoading, onConfirm,
}: ConfirmActionModalProps) {
  return (
    <BaseModal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
      <BaseModalContent>
        {(onClose) => (
          <>
            <BaseModalHeader>{title}</BaseModalHeader>
            <BaseModalBody>{description}</BaseModalBody>
            <BaseModalFooter>
              <BaseButton variant="light" onPress={onClose}>{cancelLabel}</BaseButton>
              <BaseButton
                color={destructive ? 'danger' : 'primary'}
                isLoading={isLoading}
                onPress={async () => {
                  await onConfirm();
                  onClose();
                }}
              >{confirmLabel}</BaseButton>
            </BaseModalFooter>
          </>
        )}
      </BaseModalContent>
    </BaseModal>
  );
}
```

If `BaseModal*` exports differ, match the actual API.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(workflows): reusable ConfirmActionModal component"
```

---

## Task 3: Wire `useDeletePrincipalDefinition` + Apply Migration confirm

**Files:**
- Modify: `src/workflow-editor/pages/PrincipalWorkflowListPage.tsx`
- Modify: `src/workflow-editor/pages/RuleMigrationReportPage.tsx`
- Modify: `src/workflow-editor/state/workflowQueries.ts` — re-add `useDeleteDefinition` (was removed in Plan 3 cleanup; add it back)

- [ ] **Step 1: Re-add `useDeleteDefinition`**

Plan 3 removed it. Add back:
```ts
export function useDeleteDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDefinition(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.list() }),
  });
}
```

- [ ] **Step 2: Wire delete buttons on list pages with confirm modal**

In `WorkflowListPage` and `PrincipalWorkflowListPage`:
- Add a small icon button (trash icon) on each card.
- Track `pendingDeleteId` state; open `ConfirmActionModal` when set.
- On confirm, call the delete mutation.

- [ ] **Step 3: Apply Migration confirm**

`RuleMigrationReportPage` currently fires Apply on click. Add `ConfirmActionModal`:
```tsx
<ConfirmActionModal
  title="Apply legacy rule migration?"
  description={`This will convert ${data.length} legacy rule(s) to workflow-aware types. The change is irreversible.`}
  confirmLabel="Apply"
  destructive
  ...
/>
```

- [ ] **Step 4: Build + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(workflows): delete confirmation + apply-migration confirmation modals"
```

---

## Task 4: `ParallelSpecEditor` BaseRadioGroup + canvas useLogger

**Files:**
- Modify: `src/workflow-editor/components/ParallelSpecEditor.tsx`
- Modify: `src/workflow-editor/canvas/WorkflowCanvas.tsx`

- [ ] **Step 1: Native radios → BaseRadioGroup**

Replace the native `<input type="radio">` JSX with:
```tsx
<BaseRadioGroup
  label="Join mode"
  value={spec.joinMode}
  onValueChange={(value) => onChange({ ...spec, joinMode: value as ParallelSpecDto['joinMode'] })}
>
  <BaseRadio value="AllMustComplete">All must complete</BaseRadio>
  <BaseRadio value="AnyBranch">Any branch</BaseRadio>
</BaseRadioGroup>
```

If `@brainforgeau/components` doesn't export BaseRadioGroup, fall back to HeroUI's `RadioGroup` and `Radio`.

- [ ] **Step 2: useLogger over console.warn**

`WorkflowCanvas.tsx` line ~141 has `console.warn(...)`. Replace with `useLogger` from `@brainforgeau/observability`:
```tsx
import { useLogger } from '@brainforgeau/observability';
// inside component:
const logger = useLogger('WorkflowCanvas');
// later:
logger.warn(`Edge ${e.id} not found in transitions map — skipping`);
```

If `useLogger` requires a different shape, adapt.

- [ ] **Step 3: Build + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "refactor(workflows): BaseRadioGroup + useLogger in canvas/parallel-spec"
```

---

## Task 5: Bulk clone

**Files:**
- Create: `src/workflow-editor/components/BulkCloneModal.tsx`
- Modify: `src/workflow-editor/types/api.ts` — add `cloneDefinition` to interface
- Modify: `src/workflow-editor/api/MockWorkflowApiClient.ts` — implement `cloneDefinition`
- Modify: `src/workflow-editor/api/RealWorkflowApiClient.ts` — add stub
- Modify: `src/workflow-editor/state/workflowQueries.ts` — `useCloneDefinition` mutation
- Modify: `src/workflow-editor/pages/WorkflowDetailPage.tsx` + `PrincipalWorkflowDetailPage.tsx` — Clone button

- [ ] **Step 1: API contract**

```ts
// types/api.ts
cloneDefinition(input: CloneDefinitionInput): Promise<WorkflowDefinitionDto>;

export interface CloneDefinitionInput {
  sourceDefinitionId: string;
  newName: string;
  newDescription?: string;
  // For principal-scoped: pass the new principalId; otherwise it's tenant-scoped
  principalId?: string;
}
```

- [ ] **Step 2: Mock implementation**

In `MockWorkflowApiClient.cloneDefinition`:
- Load source via `getDefinition(input.sourceDefinitionId)`.
- Determine new ownerScope: if `input.principalId` provided → `principal:{id}`; else if source was principal → keep its principal scope (caller-driven); else tenant scope.
- Create new definition with `latestVersion = null`, `draftVersion` cloned from source's latest published version (states + transitions, with new IDs).
- Return cloned DTO.

- [ ] **Step 3: Real client stub**

Add `cloneDefinition` method to `RealWorkflowApiClient.ts` with `// PLAN-7-PENDING-CLIENT-REGEN:` comment. The real backend doesn't have a clone endpoint yet — Plan 7 will either add one OR implement it as `createDefinition` + `createDraft` + `updateDraft` chain.

- [ ] **Step 4: Hook**

```ts
export function useCloneDefinition() {
  const api = useWorkflowApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CloneDefinitionInput) => api.cloneDefinition(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}
```

- [ ] **Step 5: Modal**

`BulkCloneModal` — name input + optional description + Clone button. Calls `useCloneDefinition` then navigates to the new definition's detail page.

- [ ] **Step 6: Detail page integration**

Add "Clone" button to header. Opens `BulkCloneModal`.

- [ ] **Step 7: Build + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(workflows): bulk clone definition (mock + UI; real adapter stub for Plan 7)"
```

---

## Task 6: Principal name lookup

**Files:**
- Create: `src/workflow-editor/pages/PrincipalLookup.tsx`
- Modify: `src/workflow-editor/pages/PrincipalWorkflowListPage.tsx`
- Modify: `src/workflow-editor/pages/PrincipalWorkflowDetailPage.tsx`

- [ ] **Step 1: PrincipalLookup component**

Look for `usePrincipal(principalId)` hook in helpdesk-mf — there are existing principal-scoped pages (per Plan 4 research) that already display principal names. Reuse whatever lookup mechanism they use.

If no such hook exists yet, create a stub:
```tsx
export function PrincipalLookup({ principalId }: { principalId: string }) {
  // TODO(plan-7): wire to real principal lookup hook when available.
  const shortId = principalId.replace(/-/g, '').substring(0, 8);
  return <span className="font-mono text-sm">Principal • {shortId}</span>;
}
```

If `usePrincipal` exists, use it:
```tsx
const { data: principal } = usePrincipal(principalId);
return <span>{principal?.name ?? `Principal • ${shortId}`}</span>;
```

- [ ] **Step 2: Use in pages**

Replace the raw principal ID display in `PrincipalWorkflowListPage` and `PrincipalWorkflowDetailPage` with `<PrincipalLookup principalId={principalId} />`.

- [ ] **Step 3: Build + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(workflows): principal name lookup component"
```

---

## Task 7: Approval-step editor

**Files:**
- Create: `src/workflow-editor/components/ApprovalStepEditor.tsx`
- Modify: `src/workflow-editor/components/TransitionInspector.tsx`
- Modify: `src/workflow-editor/types/workflow.ts` — add `ApprovalSpec` to transition

The backend (`Services.Core.Workflows`) has `WorkflowApproval` aggregate. A transition can require an approval before it fires. UI: an editor inside `TransitionInspector` that lets the user mark the transition as requiring an approval, optionally with an approver group / role specifier.

- [ ] **Step 1: Add `approvalSpec` to transition DTO**

```ts
export interface WorkflowTransitionDto {
  // ... existing
  approvalSpec?: ApprovalSpecDto | null;
}

export interface ApprovalSpecDto {
  required: boolean;
  approverRoles?: string[]; // role names that can approve
  approverUserIds?: string[]; // OR specific users
  description?: string;
}
```

- [ ] **Step 2: Editor**

`ApprovalStepEditor.tsx` — simple form:
- Toggle: `required` (switch)
- If required:
  - Multi-input for `approverRoles` (comma-separated input, parsed into array)
  - Description textarea
- Calls `onChange(approvalSpec)` upward.

- [ ] **Step 3: Wire into `TransitionInspector`**

After the existing trigger/guard/actions sections, add a collapsible "Approval" section. Pass `approvalSpec` and an updater.

- [ ] **Step 4: Mock honors `approvalSpec`**

No backend behavior change in mock — just preserves the spec on save/load. (Real backend already has `WorkflowApproval` aggregate; Plan 7 wires it.)

- [ ] **Step 5: Build + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(workflows): approval-step editor on transitions"
```

---

## Task 8: Timer trigger editor

**Files:**
- Create: `src/workflow-editor/components/TimerTriggerEditor.tsx`
- Modify: `src/workflow-editor/components/TransitionInspector.tsx`

For transitions with `triggerType === Timer`, show a duration picker (or cron expression input) + business-hours toggle.

- [ ] **Step 1: Editor**

`TimerTriggerEditor.tsx`:
- Input: ISO-8601 duration ("PT1H30M") OR a friendly hours/minutes picker
- Toggle: "Use business hours" (sets schedule reference; mock just stores boolean)
- Preview: "Approximately fires at: ..." text computed from duration + business-hours flag (very rough)

Wire to `transition.triggerSpec`:
```ts
{
  duration: "PT1H30M",
  useBusinessHours: true,
  businessHoursScheduleId: "..."  // Plan 7 wires this
}
```

- [ ] **Step 2: Wire into `TransitionInspector`**

Conditional render: if `transition.triggerType === TriggerType.Timer`, show `TimerTriggerEditor`. Otherwise hide.

- [ ] **Step 3: Build + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(workflows): timer trigger editor with duration + business-hours preview"
```

---

## Task 9: Visual diff (draft vs published)

**Files:**
- Create: `src/workflow-editor/components/VersionDiffViewer.tsx`
- Modify: `src/workflow-editor/pages/WorkflowDetailPage.tsx` + `PrincipalWorkflowDetailPage.tsx`

- [ ] **Step 1: Diff component**

`VersionDiffViewer.tsx`:
- Takes `published: WorkflowDefinitionVersionDto | null` + `draft: WorkflowDefinitionVersionDto | null`.
- Computes added/removed/modified states (by id):
  - **Added** in draft but not published.
  - **Removed** in published but not draft.
  - **Modified** in both, but `name`/`category`/`type`/`metadata` differ.
- Same for transitions (by `id`): added/removed/modified (different `fromState`/`toState`/`triggerType`/`guardExpression`).
- Renders 3 sections (states + transitions + summary): each section a list of items with HeroUI Chip indicating Added/Removed/Modified color (success/danger/warning).

Keep it simple — text-based diff display. Side-by-side canvas would be massive scope; defer.

- [ ] **Step 2: Integration**

Add to `WorkflowDetailPage` (and principal variant): if both `latestVersion` (published) and `draftVersion` (draft) exist, render a "Compare draft vs published" collapsible section with `VersionDiffViewer`.

- [ ] **Step 3: Build + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(workflows): version diff viewer (text-based draft vs published comparison)"
```

---

## Task 10: Verify + push + PR

- [ ] **Step 1: Final build + lint + module boundary check**

```bash
cd /Users/ivanbernatovic/Projects/bf-github/.worktrees/helpdesk-mf-plan6-feature-ii
pnpm typecheck
pnpm build
pnpm lint  # workflow-editor scope only
grep -rn "from '@/workflow-editor/" --include="*.ts" --include="*.tsx" src/ | grep -v "^src/workflow-editor"
```
0 errors. Module boundary clean (only providers/index.tsx + route files).

- [ ] **Step 2: Browser smoke test**

Run `pnpm dev`. Verify:
- Tenant flow (Plans 3+4 still work).
- Delete confirmation modal on list pages.
- Apply Migration confirmation on report page.
- Bulk clone from detail page.
- Approval section appears in TransitionInspector.
- Timer editor appears when triggerType=Timer.
- Version diff shows added/removed/modified states+transitions when both versions exist.

- [ ] **Step 3: Push + PR**

```bash
git push -u origin feature/workflows-editor-plan6
unset GITHUB_TOKEN && gh pr create --draft \
  --base feature/workflows-editor-plan4 \
  --title "feat(helpdesk): workflows Plan 6 — feature II + polish" \
  --body "..."
```

---

## Self-Review

- **Module boundary preserved**: all new components inside subsystem, exported via barrel where applicable.
- **No new external deps**: BaseRadioGroup + useLogger should already exist in the monorepo.
- **Mock fidelity improved**: archives previous published version on publish, mirroring backend Plan 2d.
- **Real adapter unchanged**: Plan 7 still fills it in. New `cloneDefinition` method has stub.
- **Approval/timer specs are mock-only data**: backend wiring follows in Plan 7 once client regenerates.
- **Visual diff is text-based**: side-by-side canvas diff would be a separate large task; this gives users the essential "what changed" view.
