import { IconTip } from '@/components/shared';
import { contextQueryKeyAtom } from '@/state/context-query-key';
import { toSortParam, withSortKeys } from '@/utils/listSort';
import { ConfirmActionModal } from '@/workflow-editor/components/ConfirmActionModal';
/**
 * Rule graphs list page for a given automation project.
 *
 * Accessed at /configuration/automations/:projectId
 * Pages, sorts and searches on the server; create and delete actions.
 * Clicking a row navigates to the graph editor.
 */
import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  Icon,
} from '@brainforgeau/components';
import {
  ListPage,
  SearchFilter,
  useListPage,
} from '@brainforgeau/components/page';
import { useLogger } from '@brainforgeau/observability';
import {
  RULE_GRAPH_SORT_KEYS,
  type RuleGraphListItemDto,
  createRuleGraphsColumns,
} from '@brainforgeau/rules-ui';
import { Chip, toast } from '@heroui/react';
import { NavLink, useNavigate, useParams } from '@modern-js/runtime/router';
import { useAtomValue } from 'jotai';
import { useMemo, useState } from 'react';
import { createHelpdeskRulesApiClient } from '../api/helpdeskRulesApiAdapter';
import { ruleProjectKeys } from '../state/ruleProjectQueries';
import {
  useCreateRuleGraph,
  useDeleteRuleGraph,
  useRuleProject,
} from '../state/ruleProjectQueries';

function publishedBadge(isPublished: boolean) {
  return isPublished ? (
    <Chip size="sm" color="success">
      Published
    </Chip>
  ) : (
    <Chip size="sm" color="warning">
      Draft
    </Chip>
  );
}

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const RULE_NOUN = { one: 'rule graph', other: 'rule graphs' } as const;

// REVIEW: Using controlled component pattern for create modal.
export function RuleGraphsListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const contextKey = useAtomValue(contextQueryKeyAtom);
  const { data: project } = useRuleProject(projectId ?? null);
  const createMutation = useCreateRuleGraph();
  const deleteMutation = useDeleteRuleGraph();
  const navigate = useNavigate();
  const logger = useLogger('RuleGraphsListPage');

  const [newName, setNewName] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleCreate() {
    if (!projectId) return;
    const name = newName.trim() || 'Untitled Graph';
    const key = toSlug(name);
    try {
      const result = await createMutation.mutateAsync({
        projectId,
        name,
        key,
      });
      setNewName('');
      setIsCreateOpen(false);
      navigate(`/configuration/automations/${projectId}/rules/${result.id}`);
    } catch (err) {
      logger.captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'rule_graphs_list_create_failed',
      });
      toast('Failed to create rule graph', { variant: 'danger' });
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDeleteId || !projectId) return;
    try {
      await deleteMutation.mutateAsync({ projectId, ruleId: pendingDeleteId });
      toast('Rule graph deleted', { variant: 'success' });
    } catch (err) {
      logger.captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'rule_graphs_list_delete_failed',
      });
      toast('Delete failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'danger',
      });
    } finally {
      setPendingDeleteId(null);
    }
  }

  const columns = useMemo(
    () =>
      withSortKeys<RuleGraphListItemDto>(
        createRuleGraphsColumns({
          renderNameCell: rule => (
            <NavLink
              to={`/configuration/automations/${projectId}/rules/${rule.id}`}
              className="font-medium text-primary hover:underline"
            >
              {rule.name}
            </NavLink>
          ),
          renderStatusCell: rule => publishedBadge(rule.isPublished),
          renderActionsCell: rule => (
            <div className="-my-1.5 flex items-center justify-end gap-1">
              <IconTip label={'Delete rule graph'}>
                <BaseButton
                  variant="link"
                  size="none"
                  className="text-danger hover:text-danger-600"
                  aria-label="Delete rule graph"
                  onPress={() => setPendingDeleteId(rule.id)}
                  icon={<Icon name="trash" className="h-4 w-4" />}
                />
              </IconTip>
            </div>
          ),
        })
          // The slim list rows carry no targeting, so the column would only
          // ever read "-".
          .filter(column => column.id !== 'targeting'),
        RULE_GRAPH_SORT_KEYS,
      ),
    [projectId],
  );

  const list = useListPage<RuleGraphListItemDto>({
    listId: 'helpdesk.rule-graphs',
    // Under the key every rule mutation invalidates.
    queryKey: ruleProjectKeys.graphs(contextKey, projectId ?? '__null__'),
    columns,
    search: {},
    getRowId: row => row.id,
    queryFn: async ({ pageIndex, pageSize, sorting, search }) => {
      const page = await createHelpdeskRulesApiClient().listRuleGraphs(
        projectId ?? '',
        {
          page: pageIndex + 1,
          pageSize,
          sort: toSortParam(sorting, RULE_GRAPH_SORT_KEYS),
          search: search.trim() || undefined,
        },
      );
      return { rows: page.items, totalCount: page.totalCount };
    },
    queryOptions: { enabled: Boolean(projectId) },
  });

  const pendingDelete = list.rows.find(g => g.id === pendingDeleteId);

  return (
    <>
      <ListPage
        title="Rule Graphs"
        breadcrumbsKey="configuration.automations.project"
        breadcrumbsParams={{
          projectId: projectId ?? '',
          projectName: project?.name ?? 'Rule Graphs',
        }}
        list={list}
        personalise
        countNoun={RULE_NOUN}
        loadError={list.isError ? list.error : undefined}
        onRetry={() => void list.refetch()}
        filters={
          <SearchFilter
            value={list.search}
            onValueChange={list.setSearch}
            placeholder="Search by name or key"
            ariaLabel="Search rule graphs"
          />
        }
        actions={
          <BaseButton
            icon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onPress={() => setIsCreateOpen(true)}
          >
            New Rule Graph
          </BaseButton>
        }
      />

      {/* Create modal */}
      <BaseModal
        isOpen={isCreateOpen}
        onOpenChange={open => setIsCreateOpen(open)}
        size="md"
      >
        <BaseModalContent>
          {onClose => (
            <>
              <BaseModalHeader title="New Rule Graph" windowControls={false} />
              <BaseModalBody>
                <BaseInput
                  label="Graph Name"
                  value={newName}
                  onValueChange={setNewName}
                  placeholder="e.g. Auto-assign urgent tickets"
                  labelPlacement="outside"
                  isRequired
                />
              </BaseModalBody>
              <BaseModalFooter>
                <BaseButton variant="light" onPress={onClose}>
                  Cancel
                </BaseButton>
                <BaseButton
                  color="primary"
                  isDisabled={createMutation.isPending || !newName.trim()}
                  onPress={handleCreate}
                >
                  Create
                </BaseButton>
              </BaseModalFooter>
            </>
          )}
        </BaseModalContent>
      </BaseModal>

      {/* Delete confirm */}
      <ConfirmActionModal
        isOpen={pendingDeleteId !== null}
        onOpenChange={open => !open && setPendingDeleteId(null)}
        title="Delete rule graph?"
        description={
          <>
            Are you sure you want to delete{' '}
            <strong>{pendingDelete?.name ?? 'this rule graph'}</strong>? This
            action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
