import { BaseButton } from '@brainforgeau/components';
import { Card, Chip, Spinner, addToast } from '@heroui/react';
import { useState } from 'react';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import {
  useApplyRuleMigration,
  useRuleMigrationReport,
} from '../state/workflowQueries';

export function RuleMigrationReportPage() {
  const { data, isLoading } = useRuleMigrationReport();
  const apply = useApplyRuleMigration();
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Loading report..." />
      </div>
    );
  }

  async function handleDryRun() {
    try {
      const r = await apply.mutateAsync(true);
      addToast({
        title: `Dry run complete: ${r.rulesScanned} rule(s) scanned, ${r.conditionsMigrated} condition(s) + ${r.actionsMigrated} action(s) would be migrated`,
        severity: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Dry run failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        severity: 'danger',
      });
    }
  }

  async function handleApply() {
    try {
      const r = await apply.mutateAsync(false);
      addToast({
        title: `Migration applied: ${r.conditionsMigrated} condition(s) and ${r.actionsMigrated} action(s) migrated`,
        severity: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Migration failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        severity: 'danger',
      });
    }
  }

  const hasRules = (data?.length ?? 0) > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rule Migration Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Legacy automation rules using StatusCondition or status-mutating
            actions. These rules must be migrated to workflow-aware transition
            types.
          </p>
        </div>
        <div className="flex gap-2">
          <BaseButton
            variant="bordered"
            isDisabled={!hasRules || apply.isPending}
            onPress={handleDryRun}
          >
            Dry Run
          </BaseButton>
          <BaseButton
            color="primary"
            isDisabled={!hasRules || apply.isPending}
            isLoading={apply.isPending}
            onPress={() => setApplyConfirmOpen(true)}
          >
            Apply Migration
          </BaseButton>
        </div>
      </div>

      {/* Summary stats */}
      {hasRules && (
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-warning-50 border border-warning-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-warning-700">
              {data?.length}
            </div>
            <div className="text-xs text-warning-600">Rules to migrate</div>
          </div>
          <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-700">
              {data?.reduce((acc, r) => acc + r.statusConditionCount, 0)}
            </div>
            <div className="text-xs text-gray-600">Status conditions</div>
          </div>
          <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-700">
              {data?.reduce((acc, r) => acc + r.statusMutatingActionCount, 0)}
            </div>
            <div className="text-xs text-gray-600">Mutating actions</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasRules && (
        <Card className="p-6 text-center text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">
            No legacy rules found
          </p>
          <p className="text-sm">
            All automation rules are using workflow-aware types.
          </p>
        </Card>
      )}

      {/* Rule list */}
      <div className="space-y-2">
        {data?.map(r => (
          <Card key={r.ruleId} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">{r.name}</div>
                {(r.categoryName || r.categoryId) && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    Category: {r.categoryName ?? r.categoryId}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.statusConditionCount > 0 && (
                    <Chip size="sm" color="warning" variant="flat">
                      {r.statusConditionCount} status condition
                      {r.statusConditionCount !== 1 ? 's' : ''}
                    </Chip>
                  )}
                  {r.mutatingActionTypes.map(t => (
                    <Chip key={t} size="sm" color="danger" variant="flat">
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0">
                <Chip
                  size="sm"
                  color={r.isEnabled ? 'success' : 'default'}
                  variant="flat"
                >
                  {r.isEnabled ? 'Enabled' : 'Disabled'}
                </Chip>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Apply Migration confirm modal */}
      <ConfirmActionModal
        isOpen={applyConfirmOpen}
        onOpenChange={open => !open && setApplyConfirmOpen(false)}
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
