/**
 * Adapter that exposes helpdesk-mf's rule API functions as the structural
 * `RulesApiClient` interface expected by `@brainforgeau/rules-ui`.
 */
import type { RulesApiClient } from '@brainforgeau/rules-ui';
import {
  listRuleProjects,
  createRuleProject,
  updateRuleProject,
  deleteRuleProject,
  listRuleGraphs,
  getRuleGraph,
  createRuleGraph,
  updateRuleGraph,
  deleteRuleGraph,
  createRuleGraphVersion,
  publishRuleGraphVersion,
} from './ruleProjectsApi';

export function createHelpdeskRulesApiClient(): RulesApiClient {
  return {
    listRuleProjects: () =>
      listRuleProjects() as unknown as ReturnType<RulesApiClient['listRuleProjects']>,

    createRuleProject: (name, key, description) =>
      createRuleProject(name, key, description) as unknown as ReturnType<
        RulesApiClient['createRuleProject']
      >,

    updateRuleProject: (id, data) =>
      updateRuleProject(id, data) as unknown as ReturnType<
        RulesApiClient['updateRuleProject']
      >,

    deleteRuleProject: (projectId) => deleteRuleProject(projectId),

    listRuleGraphs: (projectId) =>
      listRuleGraphs(projectId) as unknown as ReturnType<
        RulesApiClient['listRuleGraphs']
      >,

    getRuleGraph: (projectId, ruleId) =>
      getRuleGraph(projectId, ruleId) as unknown as ReturnType<
        RulesApiClient['getRuleGraph']
      >,

    createRuleGraph: (projectId, name, key, description, category) =>
      createRuleGraph(
        projectId,
        name,
        key,
        description,
        category,
      ) as unknown as ReturnType<RulesApiClient['createRuleGraph']>,

    updateRuleGraph: (projectId, ruleId, request) =>
      updateRuleGraph(projectId, ruleId, request) as unknown as ReturnType<
        RulesApiClient['updateRuleGraph']
      >,

    deleteRuleGraph: (projectId, ruleId) => deleteRuleGraph(projectId, ruleId),

    createRuleGraphVersion: (projectId, ruleId, content, versionName) =>
      createRuleGraphVersion(
        projectId,
        ruleId,
        content,
        versionName,
      ) as unknown as ReturnType<RulesApiClient['createRuleGraphVersion']>,

    publishRuleGraphVersion: (projectId, ruleId, versionId) =>
      publishRuleGraphVersion(
        projectId,
        ruleId,
        versionId,
      ) as unknown as ReturnType<RulesApiClient['publishRuleGraphVersion']>,
  };
}
