// MockWorkflowApiClient — in-memory CRUD for dev/testing.
// Position persistence: frontend stores positionX/positionY directly on the DTO.
// In production, these would be stored in state.metadata["ui.x"] / ["ui.y"] and parsed
// by the real adapter. The mock skips that indirection for simplicity.

import type {
  CloneDefinitionInput,
  CreateDefinitionInput,
  CreatePrincipalDefinitionInput,
  IWorkflowApiClient,
  MigrationResult,
  PrincipalOwnerScope,
  PublishDraftInput,
  PublishPrincipalDraftInput,
  RuleMigrationReportItem,
  UpdateDraftInput,
  UpdatePrincipalDraftInput,
  ValidationResult,
  WorkflowDefinitionDto,
  WorkflowDefinitionVersionDto,
} from '../types';
import { StateCategory, StateType, TriggerType, VersionStatus } from '../types';

export function createMockWorkflowApiClient(): IWorkflowApiClient {
  const store = new Map<string, WorkflowDefinitionDto>();
  const legacyRules: RuleMigrationReportItem[] = buildLegacyRules();
  seed(store);
  return new MockClient(store, legacyRules);
}

function buildLegacyRules(): RuleMigrationReportItem[] {
  return [
    {
      ruleId: crypto.randomUUID(),
      name: 'Auto-close stale tickets',
      isEnabled: true,
      statusConditionCount: 1,
      statusMutatingActionCount: 1,
      mutatingActionTypes: ['SetStatus'],
      categoryId: null,
      categoryName: null,
    },
    {
      ruleId: crypto.randomUUID(),
      name: 'Reopen on customer reply',
      isEnabled: true,
      statusConditionCount: 0,
      statusMutatingActionCount: 1,
      mutatingActionTypes: ['ReopenTicket'],
      categoryId: null,
      categoryName: null,
    },
    {
      ruleId: crypto.randomUUID(),
      name: 'Escalate unresolved after 48h',
      isEnabled: false,
      statusConditionCount: 2,
      statusMutatingActionCount: 2,
      mutatingActionTypes: ['SetStatus', 'NotifyAgent'],
      categoryId: null,
      categoryName: null,
    },
  ];
}

// Seeded principal ID for browser testing. Format: 22222222-2222-2222-2222-222222222222
// Use a format without dashes when constructing ownerScope to match: `principal:{guid:N}`
const SEED_PRINCIPAL_ID = '22222222-2222-2222-2222-222222222222';
const SEED_PRINCIPAL_SCOPE =
  `principal:${SEED_PRINCIPAL_ID.replace(/-/g, '')}` as const;

function seed(store: Map<string, WorkflowDefinitionDto>) {
  const standardId = crypto.randomUUID();
  const standardVersionId = crypto.randomUUID();

  const stateNew = {
    id: crypto.randomUUID(),
    name: 'New',
    slug: 'new',
    description: null,
    category: StateCategory.New,
    type: StateType.Initial,
    sortOrder: 0,
    positionX: 100,
    positionY: 200,
    metadata: {},
    parallelSpec: null,
  };
  const stateOpen = {
    id: crypto.randomUUID(),
    name: 'Open',
    slug: 'open',
    description: null,
    category: StateCategory.Open,
    type: StateType.Normal,
    sortOrder: 1,
    positionX: 350,
    positionY: 200,
    metadata: {},
    parallelSpec: null,
  };
  const stateClosed = {
    id: crypto.randomUUID(),
    name: 'Closed',
    slug: 'closed',
    description: null,
    category: StateCategory.Closed,
    type: StateType.Terminal,
    sortOrder: 2,
    positionX: 600,
    positionY: 200,
    metadata: {},
    parallelSpec: null,
  };

  const standardVersion: WorkflowDefinitionVersionDto = {
    id: standardVersionId,
    versionNumber: 1,
    status: VersionStatus.Published,
    publishedAt: new Date().toISOString(),
    publishedBy: 'system',
    states: [stateNew, stateOpen, stateClosed],
    transitions: [
      {
        id: crypto.randomUUID(),
        fromStateId: stateNew.id,
        toStateId: stateOpen.id,
        triggerType: TriggerType.Manual,
        triggerSpec: null,
        guardExpression: null,
        actions: [],
      },
      {
        id: crypto.randomUUID(),
        fromStateId: stateOpen.id,
        toStateId: stateClosed.id,
        triggerType: TriggerType.Manual,
        triggerSpec: null,
        guardExpression: null,
        actions: [],
      },
    ],
    startStateId: stateNew.id,
  };

  store.set(standardId, {
    id: standardId,
    name: 'Standard Helpdesk',
    description: 'Default ticket flow',
    ownerScope: 'tenant:11111111111111111111111111111111',
    latestVersion: standardVersion,
    draftVersion: null,
    versions: [
      {
        id: standardVersionId,
        versionNumber: 1,
        status: VersionStatus.Published,
        publishedAt: standardVersion.publishedAt,
        publishedBy: 'system',
      },
    ],
  });

  // Second seed: "Approval Workflow" with Pending state
  const approvalId = crypto.randomUUID();
  const approvalVersionId = crypto.randomUUID();
  const aStateNew = {
    id: crypto.randomUUID(),
    name: 'New',
    slug: 'new',
    description: null,
    category: StateCategory.New,
    type: StateType.Initial,
    sortOrder: 0,
    positionX: 100,
    positionY: 200,
    metadata: {},
    parallelSpec: null,
  };
  const aStatePending = {
    id: crypto.randomUUID(),
    name: 'Pending Approval',
    slug: 'pending-approval',
    description: 'Awaiting manager sign-off',
    category: StateCategory.Pending,
    type: StateType.Normal,
    sortOrder: 1,
    positionX: 350,
    positionY: 200,
    metadata: {},
    parallelSpec: null,
  };
  const aStateResolved = {
    id: crypto.randomUUID(),
    name: 'Resolved',
    slug: 'resolved',
    description: null,
    category: StateCategory.Resolved,
    type: StateType.Normal,
    sortOrder: 2,
    positionX: 600,
    positionY: 200,
    metadata: {},
    parallelSpec: null,
  };
  const aStateClosed = {
    id: crypto.randomUUID(),
    name: 'Closed',
    slug: 'closed',
    description: null,
    category: StateCategory.Closed,
    type: StateType.Terminal,
    sortOrder: 3,
    positionX: 850,
    positionY: 200,
    metadata: {},
    parallelSpec: null,
  };

  const approvalVersion: WorkflowDefinitionVersionDto = {
    id: approvalVersionId,
    versionNumber: 1,
    status: VersionStatus.Published,
    publishedAt: new Date().toISOString(),
    publishedBy: 'system',
    states: [aStateNew, aStatePending, aStateResolved, aStateClosed],
    transitions: [
      {
        id: crypto.randomUUID(),
        fromStateId: aStateNew.id,
        toStateId: aStatePending.id,
        triggerType: TriggerType.Manual,
        triggerSpec: null,
        guardExpression: null,
        actions: [],
      },
      {
        id: crypto.randomUUID(),
        fromStateId: aStatePending.id,
        toStateId: aStateResolved.id,
        triggerType: TriggerType.Event,
        triggerSpec: { eventName: 'approval.granted' },
        guardExpression: null,
        actions: [],
      },
      {
        id: crypto.randomUUID(),
        fromStateId: aStatePending.id,
        toStateId: aStateClosed.id,
        triggerType: TriggerType.Event,
        triggerSpec: { eventName: 'approval.denied' },
        guardExpression: null,
        actions: [],
      },
      {
        id: crypto.randomUUID(),
        fromStateId: aStateResolved.id,
        toStateId: aStateClosed.id,
        triggerType: TriggerType.Timer,
        triggerSpec: { duration: 'P7D' },
        guardExpression: null,
        actions: [],
      },
    ],
    startStateId: aStateNew.id,
  };

  store.set(approvalId, {
    id: approvalId,
    name: 'Approval Workflow',
    description: 'Ticket flow requiring manager approval',
    ownerScope: 'tenant:11111111111111111111111111111111',
    latestVersion: approvalVersion,
    draftVersion: null,
    versions: [
      {
        id: approvalVersionId,
        versionNumber: 1,
        status: VersionStatus.Published,
        publishedAt: approvalVersion.publishedAt,
        publishedBy: 'system',
      },
    ],
  });

  // Third seed: principal-owned workflow
  const principalDefId = crypto.randomUUID();
  const principalVersionId = crypto.randomUUID();
  const pStateNew = {
    id: crypto.randomUUID(),
    name: 'Submitted',
    slug: 'submitted',
    description: null,
    category: StateCategory.New,
    type: StateType.Initial,
    sortOrder: 0,
    positionX: 100,
    positionY: 200,
    metadata: {},
    parallelSpec: null,
  };
  const pStateInReview = {
    id: crypto.randomUUID(),
    name: 'In Review',
    slug: 'in-review',
    description: 'Under principal review',
    category: StateCategory.Open,
    type: StateType.Normal,
    sortOrder: 1,
    positionX: 350,
    positionY: 200,
    metadata: {},
    parallelSpec: null,
  };
  const pStateClosed = {
    id: crypto.randomUUID(),
    name: 'Resolved',
    slug: 'resolved',
    description: null,
    category: StateCategory.Resolved,
    type: StateType.Terminal,
    sortOrder: 2,
    positionX: 600,
    positionY: 200,
    metadata: {},
    parallelSpec: null,
  };

  const principalVersion: WorkflowDefinitionVersionDto = {
    id: principalVersionId,
    versionNumber: 1,
    status: VersionStatus.Published,
    publishedAt: new Date().toISOString(),
    publishedBy: 'system',
    states: [pStateNew, pStateInReview, pStateClosed],
    transitions: [
      {
        id: crypto.randomUUID(),
        fromStateId: pStateNew.id,
        toStateId: pStateInReview.id,
        triggerType: TriggerType.Manual,
        triggerSpec: null,
        guardExpression: null,
        actions: [],
      },
      {
        id: crypto.randomUUID(),
        fromStateId: pStateInReview.id,
        toStateId: pStateClosed.id,
        triggerType: TriggerType.Manual,
        triggerSpec: null,
        guardExpression: null,
        actions: [],
      },
    ],
    startStateId: pStateNew.id,
  };

  store.set(principalDefId, {
    id: principalDefId,
    name: 'Principal Support Flow',
    description: 'Ticket workflow for principal-scoped support',
    ownerScope: SEED_PRINCIPAL_SCOPE,
    latestVersion: principalVersion,
    draftVersion: null,
    versions: [
      {
        id: principalVersionId,
        versionNumber: 1,
        status: VersionStatus.Published,
        publishedAt: principalVersion.publishedAt,
        publishedBy: 'system',
      },
    ],
  });
}

class MockClient implements IWorkflowApiClient {
  constructor(
    private store: Map<string, WorkflowDefinitionDto>,
    private legacyRules: RuleMigrationReportItem[],
  ) {}

  // ── Tenant-scoped ────────────────────────────────────────────────────────────

  async listDefinitions(): Promise<WorkflowDefinitionDto[]> {
    return Array.from(this.store.values()).map(d => structuredClone(d));
  }

  async getDefinition(id: string): Promise<WorkflowDefinitionDto> {
    const d = this.store.get(id);
    if (!d) throw new Error(`Workflow definition ${id} not found`);
    return structuredClone(d);
  }

  async createDefinition(
    input: CreateDefinitionInput,
  ): Promise<WorkflowDefinitionDto> {
    const id = crypto.randomUUID();
    const def: WorkflowDefinitionDto = {
      id,
      name: input.name,
      description: input.description ?? null,
      ownerScope: 'tenant:11111111111111111111111111111111',
      latestVersion: null,
      draftVersion: null,
      versions: [],
    };
    this.store.set(id, def);
    return structuredClone(def);
  }

  async deleteDefinition(id: string): Promise<void> {
    this.store.delete(id);
  }

  async createDraft(
    definitionId: string,
  ): Promise<WorkflowDefinitionVersionDto> {
    const d = await this.getDefinition(definitionId);
    const draft: WorkflowDefinitionVersionDto = {
      id: crypto.randomUUID(),
      versionNumber: (d.latestVersion?.versionNumber ?? 0) + 1,
      status: VersionStatus.Draft,
      publishedAt: null,
      publishedBy: null,
      states: d.latestVersion ? [...d.latestVersion.states] : [],
      transitions: d.latestVersion ? [...d.latestVersion.transitions] : [],
      startStateId: d.latestVersion?.startStateId ?? null,
    };
    d.draftVersion = draft;
    return structuredClone(draft);
  }

  async updateDraft(
    input: UpdateDraftInput,
  ): Promise<WorkflowDefinitionVersionDto> {
    const d = await this.getDefinition(input.definitionId);
    if (!d.draftVersion || d.draftVersion.id !== input.versionId) {
      throw new Error('Draft version not found or ID mismatch');
    }
    d.draftVersion.states = input.states;
    d.draftVersion.transitions = input.transitions;
    d.draftVersion.startStateId = input.startStateId;
    return structuredClone(d.draftVersion);
  }

  async publishDraft(
    input: PublishDraftInput,
  ): Promise<WorkflowDefinitionVersionDto> {
    const d = await this.getDefinition(input.definitionId);
    if (!d.draftVersion || d.draftVersion.id !== input.versionId) {
      throw new Error('Draft version not found or ID mismatch');
    }
    // Archive any previously published versions (mirrors backend Plan 2d behavior)
    const previousPublished = d.versions.filter(
      v => v.status === VersionStatus.Published,
    );
    for (const prev of previousPublished) {
      prev.status = VersionStatus.Archived;
    }
    const published: WorkflowDefinitionVersionDto = {
      ...d.draftVersion,
      status: VersionStatus.Published,
      publishedAt: new Date().toISOString(),
      publishedBy: 'mock-user',
    };
    d.latestVersion = published;
    d.draftVersion = null;
    d.versions.push({
      id: published.id,
      versionNumber: published.versionNumber,
      status: published.status,
      publishedAt: published.publishedAt,
      publishedBy: published.publishedBy,
    });
    return structuredClone(published);
  }

  async validateVersion(
    _definitionId: string,
    _versionId: string,
  ): Promise<ValidationResult> {
    return { isValid: true, errors: [] };
  }

  // ── Principal-scoped ─────────────────────────────────────────────────────────

  /** Normalises principalId to match ownerScope format (strips dashes) */
  private principalScope(principalId: string): PrincipalOwnerScope {
    return `principal:${principalId.replace(/-/g, '')}`;
  }

  async listPrincipalDefinitions(
    principalId: string,
  ): Promise<WorkflowDefinitionDto[]> {
    const expected = this.principalScope(principalId);
    return Array.from(this.store.values())
      .filter(d => d.ownerScope === expected)
      .map(d => structuredClone(d));
  }

  async getPrincipalDefinition(
    principalId: string,
    id: string,
  ): Promise<WorkflowDefinitionDto> {
    const d = this.store.get(id);
    const expected = this.principalScope(principalId);
    if (!d || d.ownerScope !== expected) {
      throw new Error(`Workflow ${id} not found for principal ${principalId}`);
    }
    return structuredClone(d);
  }

  async createPrincipalDefinition(
    input: CreatePrincipalDefinitionInput,
  ): Promise<WorkflowDefinitionDto> {
    const id = crypto.randomUUID();
    const def: WorkflowDefinitionDto = {
      id,
      name: input.name,
      description: input.description ?? null,
      ownerScope: this.principalScope(input.principalId),
      latestVersion: null,
      draftVersion: null,
      versions: [],
    };
    this.store.set(id, def);
    return structuredClone(def);
  }

  async deletePrincipalDefinition(
    principalId: string,
    id: string,
  ): Promise<void> {
    await this.getPrincipalDefinition(principalId, id); // throws if not found/mismatch
    this.store.delete(id);
  }

  async createPrincipalDraft(
    principalId: string,
    definitionId: string,
  ): Promise<WorkflowDefinitionVersionDto> {
    // Ownership check — throws if mismatch
    await this.getPrincipalDefinition(principalId, definitionId);
    return this.createDraft(definitionId);
  }

  async updatePrincipalDraft(
    input: UpdatePrincipalDraftInput,
  ): Promise<WorkflowDefinitionVersionDto> {
    await this.getPrincipalDefinition(input.principalId, input.definitionId);
    return this.updateDraft(input);
  }

  async publishPrincipalDraft(
    input: PublishPrincipalDraftInput,
  ): Promise<WorkflowDefinitionVersionDto> {
    await this.getPrincipalDefinition(input.principalId, input.definitionId);
    return this.publishDraft(input);
  }

  // ── Clone ────────────────────────────────────────────────────────────────────

  async cloneDefinition(
    input: CloneDefinitionInput,
  ): Promise<WorkflowDefinitionDto> {
    const source = await this.getDefinition(input.sourceDefinitionId);

    // Determine owner scope for the clone
    let ownerScope: WorkflowDefinitionDto['ownerScope'];
    if (input.principalId) {
      ownerScope = this.principalScope(input.principalId);
    } else if (source.ownerScope.startsWith('principal:')) {
      // Keep same principal scope if source was principal-scoped and no override
      ownerScope = source.ownerScope;
    } else {
      ownerScope = 'tenant:11111111111111111111111111111111';
    }

    // Clone states and transitions from the source's latest published version.
    // Build the old→new ID map inline during clone to avoid index-pairing fragility.
    const sourceVersion = source.latestVersion ?? source.draftVersion;
    const stateIdMap = new Map<string, string>();
    const clonedStates = sourceVersion
      ? sourceVersion.states.map(s => {
          const newId = crypto.randomUUID();
          stateIdMap.set(s.id, newId);
          return { ...s, id: newId };
        })
      : [];

    const clonedTransitions = sourceVersion
      ? sourceVersion.transitions.map(t => ({
          ...t,
          id: crypto.randomUUID(),
          fromStateId: stateIdMap.get(t.fromStateId) ?? t.fromStateId,
          toStateId: stateIdMap.get(t.toStateId) ?? t.toStateId,
        }))
      : [];

    const draftVersionId = crypto.randomUUID();
    const draftVersion: WorkflowDefinitionVersionDto = {
      id: draftVersionId,
      versionNumber: 1,
      status: VersionStatus.Draft,
      publishedAt: null,
      publishedBy: null,
      states: clonedStates,
      transitions: clonedTransitions,
      startStateId: sourceVersion?.startStateId
        ? (stateIdMap.get(sourceVersion.startStateId) ?? null)
        : null,
    };

    const newId = crypto.randomUUID();
    const cloned: WorkflowDefinitionDto = {
      id: newId,
      name: input.newName,
      description: input.newDescription ?? source.description,
      ownerScope,
      latestVersion: null,
      draftVersion,
      versions: [],
    };

    this.store.set(newId, cloned);
    return structuredClone(cloned);
  }

  // ── Admin — rule migration ───────────────────────────────────────────────────

  async getRuleMigrationReport(): Promise<RuleMigrationReportItem[]> {
    return structuredClone(this.legacyRules);
  }

  async applyRuleMigration(dryRun: boolean): Promise<MigrationResult> {
    const rulesScanned = this.legacyRules.length;
    const conditionsMigrated = this.legacyRules.reduce(
      (acc, r) => acc + r.statusConditionCount,
      0,
    );
    const actionsMigrated = this.legacyRules.reduce(
      (acc, r) => acc + r.statusMutatingActionCount,
      0,
    );

    if (!dryRun) {
      // Simulate cleanup — in real backend this would migrate and remove records
      this.legacyRules.length = 0;
    }

    return {
      rulesScanned,
      conditionsMigrated,
      actionsMigrated,
      warnings: [],
    };
  }
}
