/**
 * Rule Projects API wrapper for helpdesk-mf.
 *
 * The helpdesk-backend-client does not yet include the RuleProjects API
 * (PRs #48 + #49 shipped to the backend develop branch after the client was
 * last regenerated). This adapter calls the endpoints via authorizedAxios
 * directly, following the same pattern used in tracking-mf for endpoints that
 * outpaced their generated client.
 *
 * REVIEW: Replace with generated client imports once the helpdesk-client is
 * regenerated and published (expected after backend PR merges propagate).
 */
import { configAtom } from '@/state/config';
import { authorizedAxios } from '@/state/authorizedAxios';
import { getDefaultStore } from 'jotai';
import type { RuntimeConfig } from '@brainforgeau/security';
import type {
  RuleProjectDto,
  RuleGraphDto,
  RuleGraphContent,
  RuleGraphVersionDto,
} from '@brainforgeau/rules-ui';

function getBaseUrl(): string {
  const store = getDefaultStore();
  const config = store.get(configAtom) as RuntimeConfig | undefined;
  return config?.api?.baseUrl ?? '';
}

// ── Rule Projects ──────────────────────────────────────────────────────────────

export async function listRuleProjects(): Promise<RuleProjectDto[]> {
  const { data } = await authorizedAxios.get(
    `${getBaseUrl()}/v1/rule-projects`,
  );
  return data as RuleProjectDto[];
}

export async function createRuleProject(
  name: string,
  key: string,
  description?: string,
): Promise<RuleProjectDto> {
  const { data } = await authorizedAxios.post(
    `${getBaseUrl()}/v1/rule-projects`,
    { name, key, description },
  );
  return data as RuleProjectDto;
}

export async function updateRuleProject(
  id: string,
  payload: { name: string; description?: string | null; isEnabled: boolean; status: string },
): Promise<RuleProjectDto> {
  const { data } = await authorizedAxios.put(
    `${getBaseUrl()}/v1/rule-projects/${id}`,
    { id, ...payload },
  );
  return data as RuleProjectDto;
}

export async function deleteRuleProject(projectId: string): Promise<void> {
  await authorizedAxios.delete(`${getBaseUrl()}/v1/rule-projects/${projectId}`);
}

// ── Rule Graphs ────────────────────────────────────────────────────────────────

export async function listRuleGraphs(projectId: string): Promise<RuleGraphDto[]> {
  const { data } = await authorizedAxios.get(
    `${getBaseUrl()}/v1/rule-projects/${projectId}/rules`,
  );
  return data as RuleGraphDto[];
}

export async function getRuleGraph(
  projectId: string,
  ruleId: string,
): Promise<RuleGraphDto> {
  const { data } = await authorizedAxios.get(
    `${getBaseUrl()}/v1/rule-projects/${projectId}/rules/${ruleId}`,
  );
  return data as RuleGraphDto;
}

export async function createRuleGraph(
  projectId: string,
  name: string,
  key: string,
  description?: string,
  category?: string | null,
): Promise<RuleGraphDto> {
  const { data } = await authorizedAxios.post(
    `${getBaseUrl()}/v1/rule-projects/${projectId}/rules`,
    { name, key, description, category },
  );
  return data as RuleGraphDto;
}

export async function updateRuleGraph(
  projectId: string,
  ruleId: string,
  request: {
    name: string;
    description: string | null;
    category?: string | null;
    isEnabled?: boolean;
    cooldownMinutes?: number;
    consecutivePacketsRequired?: number;
    schedule?: unknown;
    assetIds?: string[];
    assetGroupIds?: string[];
    mapColor?: string | null;
    mapLabel?: string | null;
    linkedGeofenceIds?: string[];
  },
): Promise<RuleGraphDto> {
  const { data } = await authorizedAxios.put(
    `${getBaseUrl()}/v1/rule-projects/${projectId}/rules/${ruleId}`,
    request,
  );
  return data as RuleGraphDto;
}

export async function deleteRuleGraph(
  projectId: string,
  ruleId: string,
): Promise<void> {
  await authorizedAxios.delete(
    `${getBaseUrl()}/v1/rule-projects/${projectId}/rules/${ruleId}`,
  );
}

// ── Versions / Publishing ──────────────────────────────────────────────────────

export async function createRuleGraphVersion(
  projectId: string,
  ruleId: string,
  content: RuleGraphContent,
  versionName?: string,
): Promise<RuleGraphVersionDto> {
  const { data } = await authorizedAxios.post(
    `${getBaseUrl()}/v1/rule-projects/${projectId}/rules/${ruleId}/versions`,
    { name: versionName ?? null, contentSnapshot: content },
  );
  return data as RuleGraphVersionDto;
}

export async function publishRuleGraphVersion(
  projectId: string,
  ruleId: string,
  versionId: string,
): Promise<RuleGraphDto> {
  const { data } = await authorizedAxios.post(
    `${getBaseUrl()}/v1/rule-projects/${projectId}/rules/${ruleId}/versions/${versionId}/publish`,
  );
  return data as RuleGraphDto;
}
