import { BaseButton, BaseCard } from '@brainforgeau/components';
import { useLogger } from '@brainforgeau/observability';
import { Card, Chip, Spinner, toast } from '@heroui/react';
import { useState } from 'react';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import {
  useApplyRuleMigration,
  useRuleMigrationReport,
} from '../state/workflowQueries';

export function RuleMigrationReportPage() {
  const { data, isLoading } = useRuleMigrationReport();
  const apply = useApplyRuleMigration();
  const logger = useLogger('RuleMigrationReportPage');
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  async function handleDryRun() {
    try {
      const r = await apply.mutateAsync(true);
      toast(
        `Dry run complete: ${r.rulesScanned} rule(s) scanned, ${r.conditionsMigrated} condition(s) + ${r.actionsMigrated} action(s) would be migrated`,
        { variant: 'success' }
      );
    } catch (err) {
      if (err instanceof Error) {
        logger.captureError(err, { context: 'rule_migration_dry_run_failed' });
      } else {
        logger.error('rule_migration_dry_run_failed');
      }
      toast('Dry run failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'danger',
      });
    }
  }

  async function handleApply() {
    try {
      const r = await apply.mutateAsync(false);
      toast(
        `Migration applied: ${r.conditionsMigrated} condition(s) and ${r.actionsMigrated} action(s) migrated`,
        { variant: 'success' }
      );
    } catch (err) {
      if (err instanceof Error) {
        logger.captureError(err, { context: 'rule_migration_apply_failed' });
      } else {
        logger.error('rule_migration_apply_failed');
      }
      toast('Migration failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'danger',
      });
    }
  }

  const hasRules = (data?.length ?? 0) > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rule Migration Report</h1>
          <p className="mt-0.5 text-sm text-default-500">
            Legacy automation rules using StatusCondition or status-mutating
            actions. These rules must be migrated to workflow-aware transition
            types.
          </p>
        </div>
        <div className="flex gap-2">
          <BaseButton
            variant="bordered"
            isDisabled={apply.isPending || !hasRules || apply.isPending}
            onPress={handleDryRun}
          >
            Dry Run
          </BaseButton>
          <BaseButton
            color="primary"
            isDisabled={!hasRules || apply.isPending}
            onPress={() => setApplyConfirmOpen(true)}
          >
            Apply Migration
          </BaseButton>
        </div>
      </div>

      {/* Summary stats */}
      {hasRules && (
        <div className="flex gap-4">
          <div className="bg-warning-50 border-warning-200 rounded-lg border px-4 py-2 text-center">
            <div className="text-warning-700 text-2xl font-bold">
              {data?.length}
            </div>
            <div className="text-warning-600 text-xs">Rules to migrate</div>
          </div>
          <div className="rounded-lg border border-default-200 bg-default-50 px-4 py-2 text-center">
            <div className="text-2xl font-bold text-default-700">
              {data?.reduce((acc, r) => acc + r.statusConditionCount, 0)}
            </div>
            <div className="text-xs text-default-600">Status conditions</div>
          </div>
          <div className="rounded-lg border border-default-200 bg-default-50 px-4 py-2 text-center">
            <div className="text-2xl font-bold text-default-700">
              {data?.reduce((acc, r) => acc + r.statusMutatingActionCount, 0)}
            </div>
            <div className="text-xs text-default-600">Mutating actions</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasRules && (
        <BaseCard className="p-6 text-center text-default-500">
          <p className="mb-1 font-semibold text-default-700">
            No legacy rules found
          </p>
          <p className="text-sm">
            All automation rules are using workflow-aware types.
          </p>
        </BaseCard>
      )}

      {/* Rule list */}
      <div className="space-y-2">
        {data?.map((r) => (
          <BaseCard key={r.ruleId}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-default-900">{r.name}</div>
                {(r.categoryName || r.categoryId) && (
                  <div className="mt-0.5 text-xs text-default-400">
                    Category: {r.categoryName ?? r.categoryId}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.statusConditionCount > 0 && (
                    <Chip size="sm" color="warning">
                      {r.statusConditionCount} status condition
                      {r.statusConditionCount !== 1 ? 's' : ''}
                    </Chip>
                  )}
                  {r.mutatingActionTypes.map((t) => (
                    <Chip key={t} size="sm" color="danger">
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0">
                <Chip size="sm" color={r.isEnabled ? 'success' : 'default'}>
                  {r.isEnabled ? 'Enabled' : 'Disabled'}
                </Chip>
              </div>
            </div>
          </BaseCard>
        ))}
      </div>

      {/* Apply Migration confirm modal */}
      <ConfirmActionModal
        isOpen={applyConfirmOpen}
        onOpenChange={(open) => !open && setApplyConfirmOpen(false)}
        title="Apply legacy rule migration?"
        description={`This will convert ${data?.length ?? 0} legacy rule(s) to workflow-aware types. The change is irreversible.`}
        confirmLabel="Apply"
        destructive
        isLoading={apply.isPending}
        onConfirm={handleApply}
      />
    </div>
  );
}
