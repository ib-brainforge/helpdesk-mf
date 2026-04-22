// MockWorkflowApiClient — in-memory CRUD for dev/testing.
// Position persistence: frontend stores positionX/positionY directly on the DTO.
// In production, these would be stored in state.metadata["ui.x"] / ["ui.y"] and parsed
// by the real adapter. The mock skips that indirection for simplicity.

import type {
  CreateDefinitionInput,
  IWorkflowApiClient,
  PublishDraftInput,
  UpdateDraftInput,
  ValidationResult,
  WorkflowDefinitionDto,
  WorkflowDefinitionVersionDto,
} from '../types';
import { StateCategory, StateType, TriggerType, VersionStatus } from '../types';

export function createMockWorkflowApiClient(): IWorkflowApiClient {
  const store = new Map<string, WorkflowDefinitionDto>();
  seed(store);
  return new MockClient(store);
}

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
}

class MockClient implements IWorkflowApiClient {
  constructor(private store: Map<string, WorkflowDefinitionDto>) {}

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
    return def;
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
    return draft;
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
}
