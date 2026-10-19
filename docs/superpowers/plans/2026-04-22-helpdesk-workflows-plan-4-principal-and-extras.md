# Helpdesk Workflows — Plan 4: Principal Mirror + Rule-Migration View + Parallel UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Round out the workflow editor — principal-scoped pages, admin rule-migration report viewer, parallel state authoring (re-enable + spec form + sourceHandle wiring), and a real API adapter stub fully implemented (waits for client regeneration).

**Architecture:** Extends `helpdesk-mf/src/workflow-editor/` subsystem. Mock client gets new methods (principal CRUD + rule-migration). New pages mirror the tenant pattern but switch the API surface to principal endpoints. Parallel state authoring re-enables the `Parallel` Type option, adds `ParallelSpecEditor` to `StateInspector`, threads `sourceHandle` through the DTO + canvas. `RealWorkflowApiClient` is filled in end-to-end against `@brainforgeau/helpdesk-client` — guarded so the swap from mock can happen with one constant flip when the client regenerates.

**Tech Stack:** Same as Plan 3 (React, TS, Modern.js, xyflow v12, HeroUI, TanStack Query).

**Branch:** `feature/workflows-editor-plan4` stacked on `feature/workflows-editor` (Plan 3 PR #8).

---

## Prerequisites / Assumptions

- Plan 3 merged-in-stack.
- `@brainforgeau/helpdesk-client` may NOT yet have workflow endpoints (backend PR stack #31–#37 stacked-draft). When client regenerates, Plan 4's real adapter compiles against it — but until then the implementation is type-checked against a hand-written interface mirror.
- Strategy:
  - All UI work proceeds against the mock (no backend dependency).
  - Real adapter is implemented but switched off behind a `USE_REAL_CLIENT` boolean flag (default `false`). When the client regenerates: flip to `true`, drop the mock provider, ship.
- DTOs added: principal-specific commands carry `principalId`. Rule-migration response carries `rulesScanned`, `conditionsMigrated`, `actionsMigrated`, `warnings`.

---

## Module Boundary (preserved)

`src/workflow-editor/index.ts` — additions only. New exports:
- `PrincipalWorkflowListPage`, `PrincipalWorkflowDetailPage`, `PrincipalWorkflowEditorPage`
- `RuleMigrationReportPage`
- (No new types exported — internal additions to existing barrels.)

`src/workflow-editor/testing.ts` — unchanged.

---

## File Structure (additions)

```
src/workflow-editor/
├── types/
│   └── workflow.ts                         # ADD: PrincipalWorkflow* DTOs, RuleMigrationReportItem, MigrationResult
├── api/
│   ├── MockWorkflowApiClient.ts            # MODIFY: add principal CRUD + rule-migration methods + seed
│   └── RealWorkflowApiClient.ts            # REWRITE: full implementation against generated client (guarded)
├── state/
│   ├── workflowQueries.ts                  # ADD: principal query keys + hooks; rule-migration query
│   └── clientSwitch.ts                     # NEW: USE_REAL_CLIENT flag + factory selector
├── canvas/
│   └── nodes/
│       └── ParallelStateNode.tsx           # MODIFY: re-enable + multi-handle wiring
├── components/
│   ├── StateInspector.tsx                  # MODIFY: re-enable Parallel option + ParallelSpecEditor
│   ├── ParallelSpecEditor.tsx              # NEW: branch start picker + join state picker + join mode
│   └── TransitionInspector.tsx             # MODIFY: show sourceHandle field if from-state is Parallel
├── pages/
│   ├── PrincipalWorkflowListPage.tsx       # NEW
│   ├── PrincipalWorkflowDetailPage.tsx    # NEW
│   ├── PrincipalWorkflowEditorPage.tsx     # NEW
│   └── RuleMigrationReportPage.tsx         # NEW
└── routes/
    └── (added under src/routes/)

src/routes/principal/[principalId]/workflows/
├── page.tsx                                # PrincipalWorkflowListPage
├── [id]/page.tsx                           # PrincipalWorkflowDetailPage
└── [id]/editor/page.tsx                    # PrincipalWorkflowEditorPage

src/routes/configuration/workflows/_admin/rule-migration-report/
└── page.tsx                                # RuleMigrationReportPage
```

---

## Task 1: Extend types — principal + migration report

**Files:**
- Modify: `src/workflow-editor/types/workflow.ts`
- Modify: `src/workflow-editor/types/api.ts`

- [ ] **Step 1: New DTOs**

```typescript
// Append to types/workflow.ts
export interface RuleMigrationReportItem {
  ruleId: string;
  name: string;
  isEnabled: boolean;
  statusConditionCount: number;
  statusMutatingActionCount: number;
  mutatingActionTypes: string[];
  categoryId: string | null;
  categoryName: string | null;
}

export interface MigrationResult {
  rulesScanned: number;
  conditionsMigrated: number;
  actionsMigrated: number;
  warnings: string[];
}
```

`WorkflowTransitionDto` additions:
```ts
// Add optional sourceHandleId for parallel branch wiring
export interface WorkflowTransitionDto {
  // ...existing fields
  sourceHandleId?: string | null;
}
```

- [ ] **Step 2: Extend API interface**

```typescript
// Append to types/api.ts
export interface IWorkflowApiClient {
  // ...existing
  // Principal-scoped (caller's PrincipalId must match)
  listPrincipalDefinitions(principalId: string): Promise<WorkflowDefinitionDto[]>;
  getPrincipalDefinition(principalId: string, id: string): Promise<WorkflowDefinitionDto>;
  createPrincipalDefinition(input: CreatePrincipalDefinitionInput): Promise<WorkflowDefinitionDto>;
  deletePrincipalDefinition(principalId: string, id: string): Promise<void>;
  createPrincipalDraft(principalId: string, definitionId: string): Promise<WorkflowDefinitionVersionDto>;
  updatePrincipalDraft(input: UpdatePrincipalDraftInput): Promise<WorkflowDefinitionVersionDto>;
  publishPrincipalDraft(input: PublishPrincipalDraftInput): Promise<WorkflowDefinitionVersionDto>;
  // Admin
  getRuleMigrationReport(): Promise<RuleMigrationReportItem[]>;
  applyRuleMigration(dryRun: boolean): Promise<MigrationResult>;
}

export interface CreatePrincipalDefinitionInput {
  principalId: string;
  name: string;
  description?: string;
}
export interface UpdatePrincipalDraftInput extends UpdateDraftInput {
  principalId: string;
}
export interface PublishPrincipalDraftInput extends PublishDraftInput {
  principalId: string;
}
```

- [ ] **Step 3: typecheck + commit**

```bash
pnpm typecheck
git add -A
git commit -m "feat(workflows): types for principal CRUD + rule-migration report"
```

---

## Task 2: Mock client — principal + migration

**Files:**
- Modify: `src/workflow-editor/api/MockWorkflowApiClient.ts`

- [ ] **Step 1: Seed a principal-owned workflow**

In `seed()`, add a third entry:
```ts
const principalId = '22222222222222222222222222222222';
const principalDefId = uuid();
// ...build similar to standard but with ownerScope: `principal:${principalId}`
store.set(principalDefId, { /* fields */, ownerScope: `principal:${principalId}`, ... });
```

Also seed sample legacy automation rules so the migration report has rows. Add a separate `legacyRules` store if needed:
```ts
const legacyRules: RuleMigrationReportItem[] = [
  { ruleId: uuid(), name: 'Auto-close stale tickets', isEnabled: true, statusConditionCount: 1, statusMutatingActionCount: 1, mutatingActionTypes: ['SetStatus'], categoryId: null, categoryName: null },
  { ruleId: uuid(), name: 'Reopen on customer reply', isEnabled: true, statusConditionCount: 0, statusMutatingActionCount: 1, mutatingActionTypes: ['ReopenTicket'], categoryId: null, categoryName: null },
];
```

- [ ] **Step 2: Implement principal methods**

```ts
async listPrincipalDefinitions(principalId: string): Promise<WorkflowDefinitionDto[]> {
  const expected = `principal:${principalId}`;
  return Array.from(this.store.values())
    .filter(d => d.ownerScope === expected)
    .map(d => structuredClone(d));
}
async getPrincipalDefinition(principalId: string, id: string) {
  const d = this.store.get(id);
  const expected = `principal:${principalId}`;
  if (!d || d.ownerScope !== expected) throw new Error(`Workflow ${id} not found`);
  return structuredClone(d);
}
async createPrincipalDefinition(input: CreatePrincipalDefinitionInput) {
  const id = uuid();
  const def: WorkflowDefinitionDto = {
    id, name: input.name, description: input.description ?? null,
    ownerScope: `principal:${input.principalId}`,
    latestVersion: null, draftVersion: null, versions: [],
  };
  this.store.set(id, def);
  return structuredClone(def);
}
async deletePrincipalDefinition(principalId: string, id: string) {
  const d = this.store.get(id);
  if (!d || d.ownerScope !== `principal:${principalId}`) throw new Error('Not found');
  this.store.delete(id);
}
// createPrincipalDraft / updatePrincipalDraft / publishPrincipalDraft delegate to existing logic after ownership check
async createPrincipalDraft(principalId: string, definitionId: string) {
  await this.getPrincipalDefinition(principalId, definitionId); // throws if mismatch
  return this.createDraft(definitionId);
}
async updatePrincipalDraft(input: UpdatePrincipalDraftInput) {
  await this.getPrincipalDefinition(input.principalId, input.definitionId);
  return this.updateDraft(input);
}
async publishPrincipalDraft(input: PublishPrincipalDraftInput) {
  await this.getPrincipalDefinition(input.principalId, input.definitionId);
  return this.publishDraft(input);
}
```

- [ ] **Step 3: Implement migration methods**

```ts
async getRuleMigrationReport() {
  return structuredClone(this.legacyRules);
}
async applyRuleMigration(dryRun: boolean): Promise<MigrationResult> {
  const counts = this.legacyRules.reduce(
    (acc, r) => ({
      conditions: acc.conditions + r.statusConditionCount,
      actions: acc.actions + r.statusMutatingActionCount,
    }),
    { conditions: 0, actions: 0 },
  );
  if (!dryRun) this.legacyRules = []; // simulate cleanup
  return {
    rulesScanned: this.legacyRules.length, // 0 after apply
    conditionsMigrated: counts.conditions,
    actionsMigrated: counts.actions,
    warnings: [],
  };
}
```

(Adjust `rulesScanned` semantics — backend counts pre-migration; mirror that.)

- [ ] **Step 4: typecheck + commit**

```bash
pnpm typecheck
git add -A
git commit -m "feat(workflows): mock client supports principal CRUD + rule-migration"
```

---

## Task 3: Query hooks — principal + migration

**Files:**
- Modify: `src/workflow-editor/state/workflowQueries.ts`

- [ ] **Step 1: New keys**

```ts
export const workflowKeys = {
  // ...existing
  principalAll: ['workflows', 'principal'] as const,
  principalList: (principalId: string) => [...workflowKeys.principalAll, principalId, 'list'] as const,
  principalDetail: (principalId: string, id: string) => [...workflowKeys.principalAll, principalId, 'detail', id] as const,
  ruleMigrationReport: () => ['workflows', 'admin', 'rule-migration-report'] as const,
};
```

- [ ] **Step 2: Hooks**

```ts
export function usePrincipalWorkflowList(principalId: string) { /* useQuery */ }
export function usePrincipalWorkflowDefinition(principalId: string, id: string | null) { /* useQuery + enabled */ }
export function useCreatePrincipalDefinition() { /* useMutation */ }
export function useDeletePrincipalDefinition() { /* useMutation */ }
export function useCreatePrincipalDraft() { /* useMutation */ }
export function useUpdatePrincipalDraft() { /* useMutation */ }
export function usePublishPrincipalDraft() { /* useMutation */ }
export function useRuleMigrationReport() { /* useQuery */ }
export function useApplyRuleMigration() { /* useMutation, invalidates report */ }
```

Follow the exact pattern of existing tenant hooks. Each mutation invalidates the relevant principalDetail or report.

- [ ] **Step 3: typecheck + commit**

```bash
pnpm typecheck
git add -A
git commit -m "feat(workflows): TanStack Query hooks for principal + rule-migration"
```

---

## Task 4: Principal pages

**Files:**
- Create: `src/workflow-editor/pages/PrincipalWorkflowListPage.tsx`
- Create: `src/workflow-editor/pages/PrincipalWorkflowDetailPage.tsx`
- Create: `src/workflow-editor/pages/PrincipalWorkflowEditorPage.tsx`
- Create: `src/routes/principal/[principalId]/workflows/page.tsx`
- Create: `src/routes/principal/[principalId]/workflows/[id]/page.tsx`
- Create: `src/routes/principal/[principalId]/workflows/[id]/editor/page.tsx`

- [ ] **Step 1: List page**

Mirror `WorkflowListPage` structurally. Differences:
- Read `principalId` from `useParams<{ principalId: string }>()`.
- Use `usePrincipalWorkflowList(principalId)`.
- Header shows "Principal Workflows" + the principal ID (or name if available — for now display ID).
- Card click → `/principal/{principalId}/workflows/{id}`.
- Create button calls `useCreatePrincipalDefinition` with `{ principalId, name }`.

- [ ] **Step 2: Detail page**

Mirror `WorkflowDetailPage`. Same shape; uses principal hooks; "Edit Draft" → `/principal/{principalId}/workflows/{id}/editor`.

- [ ] **Step 3: Editor page**

Mirror `WorkflowEditorPage`. Same shape with principal mutation hooks. Reuses `<WorkflowEditor>` unchanged — the editor doesn't know or care about scope.

- [ ] **Step 4: Route files**

Each route file: ~5 lines. Imports the page component + applies `withAuthenticationRequired`. Match existing route style.

- [ ] **Step 5: Export from barrel**

Add to `src/workflow-editor/index.ts`:
```ts
export { PrincipalWorkflowListPage } from './pages/PrincipalWorkflowListPage';
export { PrincipalWorkflowDetailPage } from './pages/PrincipalWorkflowDetailPage';
export { PrincipalWorkflowEditorPage } from './pages/PrincipalWorkflowEditorPage';
```

- [ ] **Step 6: Dev test**

`pnpm dev` → navigate to `/principal/22222222-2222-2222-2222-222222222222/workflows`. Expect list page with one seeded principal-owned workflow. Create draft → editor opens → save → publish flow works end-to-end against mock.

- [ ] **Step 7: typecheck + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(workflows): principal-scoped list/detail/editor pages + routes"
```

---

## Task 5: Rule-migration report page

**Files:**
- Create: `src/workflow-editor/pages/RuleMigrationReportPage.tsx`
- Create: `src/routes/configuration/workflows/_admin/rule-migration-report/page.tsx`

- [ ] **Step 1: Report page**

```tsx
// src/workflow-editor/pages/RuleMigrationReportPage.tsx
import { Card, Button, Spinner, Chip, addToast } from '@heroui/react';
import { useRuleMigrationReport, useApplyRuleMigration } from '../state/workflowQueries';

export function RuleMigrationReportPage() {
  const { data, isLoading } = useRuleMigrationReport();
  const apply = useApplyRuleMigration();

  if (isLoading) return <Spinner />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rule Migration Report</h1>
          <p className="text-sm text-gray-500">Legacy automation rules using StatusCondition or status-mutating actions.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="bordered"
            isDisabled={!data?.length || apply.isPending}
            onPress={async () => {
              const r = await apply.mutateAsync(true);
              addToast({ title: `Dry run: ${r.rulesScanned} rules, ${r.conditionsMigrated} conditions, ${r.actionsMigrated} actions`, severity: 'success' });
            }}
          >Dry Run</Button>
          <Button
            color="primary"
            isDisabled={!data?.length || apply.isPending}
            onPress={async () => {
              const r = await apply.mutateAsync(false);
              addToast({ title: `Migrated ${r.conditionsMigrated} conditions and ${r.actionsMigrated} actions`, severity: 'success' });
            }}
          >Apply Migration</Button>
        </div>
      </div>

      {!data?.length && (
        <BaseCard className="p-6 text-center text-gray-500">
          No legacy rules found. All automation rules are using workflow-aware types.
        </BaseCard>
      )}

      <div className="space-y-2">
        {data?.map(r => (
          <BaseCard key={r.ruleId} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-sm text-gray-500">
                  {r.statusConditionCount > 0 && <Chip size="sm" color="warning" variant="flat" className="mr-2">{r.statusConditionCount} status condition(s)</Chip>}
                  {r.mutatingActionTypes.map(t => <Chip key={t} size="sm" color="warning" variant="flat" className="mr-2">{t}</Chip>)}
                </div>
              </div>
              <Chip size="sm" color={r.isEnabled ? 'success' : 'default'} variant="flat">{r.isEnabled ? 'Enabled' : 'Disabled'}</Chip>
            </div>
          </BaseCard>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Route**

Standard 5-line route file at `src/routes/configuration/workflows/_admin/rule-migration-report/page.tsx`.

- [ ] **Step 3: Export from barrel + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(workflows): rule-migration report page (admin)"
```

---

## Task 6: Parallel state authoring

**Files:**
- Modify: `src/workflow-editor/components/StateInspector.tsx`
- Create: `src/workflow-editor/components/ParallelSpecEditor.tsx`
- Modify: `src/workflow-editor/canvas/nodes/ParallelStateNode.tsx`
- Modify: `src/workflow-editor/canvas/WorkflowCanvas.tsx`
- Modify: `src/workflow-editor/components/TransitionInspector.tsx`

- [ ] **Step 1: Re-enable Parallel in StateInspector**

Restore the `Parallel` option in `TYPE_ITEMS`. When the user changes type to Parallel:
- Scaffold a default `parallelSpec`: `{ branchStartStateIds: [], joinStateId: '', joinMode: 'AllMustComplete' }`.
- When changing AWAY from Parallel, clear `parallelSpec` to `null`.

```ts
function handleTypeChange(next: StateType) {
  if (next === StateType.Parallel) {
    onChange({ ...state, type: next, parallelSpec: state.parallelSpec ?? { branchStartStateIds: [], joinStateId: '', joinMode: 'AllMustComplete' } });
  } else {
    onChange({ ...state, type: next, parallelSpec: null });
  }
}
```

- [ ] **Step 2: ParallelSpecEditor component**

Renders ONLY when `state.type === Parallel`. Contains:
- Multi-select for `branchStartStateIds` (options = all other states in the workflow).
- Single-select for `joinStateId`.
- Radio for `joinMode`: `AllMustComplete` / `AnyBranch`.

Receive `availableStates: WorkflowStateDto[]` as a prop (excluding the parallel state itself). Wire from `StateInspector` which gets the full state list as a new prop.

- [ ] **Step 3: Pass states to inspector**

Update `WorkflowEditor.tsx` to pass `states` prop down to `StateInspector` so it can populate the spec editor's options.

- [ ] **Step 4: Re-enable parallel node in canvas**

Currently the canvas only registers `workflowState` and `workflowTransition` types. Add `parallelState` and `terminalState` if not yet:
```ts
const NODE_TYPES = {
  workflowState: WorkflowStateNode,
  parallelState: ParallelStateNode,
  terminalState: TerminalStateNode,
};
```

In the `nodes` memo:
```ts
type: s.type === StateType.Parallel ? 'parallelState' : (s.type === StateType.Terminal ? 'terminalState' : 'workflowState'),
```

- [ ] **Step 5: Wire `sourceHandle` through transitions**

In `WorkflowCanvas.onConnect`:
```ts
const newTransition: WorkflowTransitionDto = {
  ...existing,
  sourceHandleId: c.sourceHandle ?? null,
};
```

In edge construction (`edges` memo), add `sourceHandle: t.sourceHandleId ?? undefined` so xyflow renders the connection from the right anchor.

In `TransitionInspector`, if the transition's `fromState` is Parallel, show a read-only badge "Branch: {sourceHandleId}".

- [ ] **Step 6: Dev test**

Create a workflow → add a parallel state → set 2 branch starts + 1 join + mode → save draft → reload → spec persists.

- [ ] **Step 7: typecheck + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(workflows): parallel state authoring + sourceHandle on transitions"
```

---

## Task 7: Real API adapter — full implementation (guarded)

**Files:**
- Rewrite: `src/workflow-editor/api/RealWorkflowApiClient.ts`
- Create: `src/workflow-editor/state/clientSwitch.ts`
- Modify: `src/providers/index.tsx`

- [ ] **Step 1: Inspect generated client structure**

```bash
ls node_modules/@brainforgeau/helpdesk-client/dist/api/ | grep -i workflow
ls node_modules/@brainforgeau/helpdesk-client/dist/api/ | grep -i admin
```

If workflow methods are NOT in the client yet (expected today): document the expected method names from backend Plans 2d/2e/2f and stub them via the `notImplemented` async pattern but with explicit method bodies that show the call shape. This makes the swap a 1-line change later.

If workflow methods ARE in the client (post-regeneration): implement each method against the generated `WorkflowsApi` / `PrincipalWorkflowsApi` classes. Translate camelCase ↔ snake_case as needed.

- [ ] **Step 2: Implementation skeleton**

```ts
import { WorkflowsApi } from '@brainforgeau/helpdesk-client'; // adjust to actual export
import type { IWorkflowApiClient, /* ...all DTOs */ } from '../types';

export function createRealWorkflowApiClient(api: WorkflowsApi): IWorkflowApiClient {
  return {
    listDefinitions: async () => {
      const res = await api.listWorkflowDefinitions();
      return res.data.map(toDto);  // toDto adapter for any field mismatches
    },
    getDefinition: async (id) => {
      const res = await api.getWorkflowDefinition({ id });
      return toDto(res.data);
    },
    createDefinition: async (input) => {
      const res = await api.createWorkflowDefinition({ requestBody: input });
      return toDto(res.data);
    },
    deleteDefinition: async (id) => {
      await api.deleteWorkflowDefinition({ id });
    },
    createDraft: async (definitionId) => {
      const res = await api.createDraft({ definitionId });
      return toVersionDto(res.data);
    },
    updateDraft: async (input) => {
      const res = await api.updateDraft({ definitionId: input.definitionId, versionId: input.versionId, requestBody: input });
      return toVersionDto(res.data);
    },
    publishDraft: async (input) => {
      const res = await api.publishDraft({ definitionId: input.definitionId, versionId: input.versionId, requestBody: { publishNote: input.publishNote } });
      return toVersionDto(res.data);
    },
    validateVersion: async (definitionId, versionId) => {
      const res = await api.validateVersion({ definitionId, versionId });
      return res.data;
    },
    // Principal methods analogous, calling principalApi methods.
    // Migration methods:
    getRuleMigrationReport: async () => {
      const res = await api.getRuleMigrationReport();
      return res.data;
    },
    applyRuleMigration: async (dryRun) => {
      const res = await api.applyRuleMigration({ dryRun });
      return res.data;
    },
  };
}
```

If the client method names differ, adapt. If the client classes don't yet exist, leave the file with `// PLAN-4-PENDING-CLIENT-REGEN: replace with real API methods` comments at each line + keep the async-throw stub bodies. The shape stays — only method bodies fill in.

- [ ] **Step 3: clientSwitch flag**

```ts
// src/workflow-editor/state/clientSwitch.ts
import type { IWorkflowApiClient } from '../types';
import { createMockWorkflowApiClient } from '../api/MockWorkflowApiClient';
import { createRealWorkflowApiClient } from '../api/RealWorkflowApiClient';

// Set to `true` when @brainforgeau/helpdesk-client has workflow endpoints regenerated.
const USE_REAL_CLIENT = false;

export function buildWorkflowApiClient(realApi: unknown): IWorkflowApiClient {
  if (USE_REAL_CLIENT) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createRealWorkflowApiClient(realApi as any);
  }
  return createMockWorkflowApiClient();
}
```

- [ ] **Step 4: Update providers**

In `src/providers/index.tsx`:
```tsx
import { buildWorkflowApiClient } from '@/workflow-editor/state/clientSwitch';
// ...
const workflowApiClient = buildWorkflowApiClient(/* axios/api factory or undefined when USE_REAL_CLIENT=false */);
```

When `USE_REAL_CLIENT=false`, the `realApi` arg is unused (mock built directly).

- [ ] **Step 5: typecheck + commit**

```bash
pnpm typecheck && pnpm build
git add -A
git commit -m "feat(workflows): real API adapter implementation (guarded by USE_REAL_CLIENT flag)"
```

---

## Task 8: Verify + push + PR

- [ ] **Step 1: Module-boundary audit**

```bash
grep -rn "from '@/workflow-editor/" --include="*.ts" --include="*.tsx" src/ | grep -v "^src/workflow-editor"
```
Expected: only `providers/index.tsx` imports `@/workflow-editor/testing` AND/OR `@/workflow-editor/state/clientSwitch`. Routes import `@/workflow-editor` barrel only.

- [ ] **Step 2: Final build**

```bash
pnpm build && pnpm typecheck
```
0 errors.

- [ ] **Step 3: Browser smoke test**

Run `pnpm dev`. Verify:
- Tenant flow (Plan 3 still works).
- Principal flow at `/principal/{id}/workflows` lists, creates, edits, publishes.
- Admin report at `/configuration/workflows/_admin/rule-migration-report` shows seeded legacy rules + dry-run + apply.
- Parallel state — create a parallel state, configure spec, save, reload — spec persists.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feature/workflows-editor-plan4
unset GITHUB_TOKEN && gh pr create --draft \
  --base feature/workflows-editor \
  --title "feat(helpdesk): workflows Plan 4 — principal + rule-migration + parallel" \
  --body "..."
```

---

## Self-Review

- **No new dependencies** — Plan 3 already added `@xyflow/react`.
- **Mock symmetry**: backend has tenant + principal + migration; mock now mirrors all three.
- **Real adapter strategy**: implemented but switched off. When client regenerates, flip `USE_REAL_CLIENT = true` and ship a 1-line PR.
- **Parallel UI**: re-enabled with proper spec editor; sourceHandle threaded through DTO + canvas. Future tweaks (visual fork/join routing, timer entry conditions) can land later.
- **Module boundary preserved**: only the testing barrel + clientSwitch are imported outside the subsystem; everything else through `@/workflow-editor`.
- **No new permissions checks needed in UI** — backend permission gates still enforce; UI just makes the calls.

## Out of scope (future work)

- Approval-step UI within transitions (HelpdeskApprovalProvider integration).
- Timer trigger UI for transitions (cron picker / business-hours preview).
- Visual diff between draft and published versions.
- Workflow simulation / dry-run.
- Bulk rename / clone / export.
