// TODO(plan-4): Implement methods against @brainforgeau/helpdesk-client once workflow endpoints regenerate.
// Expected endpoints from backend Plans 2d/2e/2f:
//   GET    /v1/workflows                                          → listDefinitions()
//   GET    /v1/workflows/{id}                                     → getDefinition(id)
//   POST   /v1/workflows                                          → createDefinition(input)
//   DELETE /v1/workflows/{id}                                     → deleteDefinition(id)
//   POST   /v1/workflows/{id}/drafts                              → createDraft(definitionId)
//   PUT    /v1/workflows/{id}/drafts/{versionId}                  → updateDraft(input)
//   POST   /v1/workflows/{id}/drafts/{versionId}/publish          → publishDraft(input)
//   POST   /v1/workflows/{id}/versions/{versionId}/validate       → validateVersion(definitionId, versionId)
//
// Implementation notes for Plan 4:
// - Import the generated WorkflowsClient from @brainforgeau/helpdesk-client
// - Implement IWorkflowApiClient using the generated client methods
// - Map HelpdeskApplicationWorkflowsDTOs* types to the internal DTO types defined in ./types/workflow.ts
// - Position persistence: read positionX/Y from state.metadata["ui.x"]/["ui.y"] strings, write back on updateDraft
// - The _client parameter below is intentionally typed as unknown — replace with the proper generated client type

import type { IWorkflowApiClient } from '../types';

export function createRealWorkflowApiClient(
  _client: unknown,
): IWorkflowApiClient {
  // Async so the error travels through the Promise channel, keeping callers
  // in consistent async error-handling paths (try/catch, onError, etc.).
  const notImplemented = (method: string) => async (): Promise<never> => {
    throw new Error(
      `${method} not implemented — Plan 4 wires the real adapter once @brainforgeau/helpdesk-client regenerates with workflow endpoints`,
    );
  };

  return {
    listDefinitions: notImplemented('listDefinitions'),
    getDefinition: notImplemented('getDefinition'),
    createDefinition: notImplemented('createDefinition'),
    deleteDefinition: notImplemented('deleteDefinition'),
    createDraft: notImplemented('createDraft'),
    updateDraft: notImplemented('updateDraft'),
    publishDraft: notImplemented('publishDraft'),
    validateVersion: notImplemented('validateVersion'),
  };
}
