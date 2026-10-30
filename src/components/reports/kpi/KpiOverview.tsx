import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { useScopeNames } from '@/hooks/useScopeNames';
import { BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { useSearchParams } from '@modern-js/runtime/router';
import { type FC, useCallback, useMemo } from 'react';
import { DeadlineWeekChart } from './DeadlineWeekChart';
import { KpiCards } from './KpiCards';
import { LateTicketsTable } from './LateTicketsTable';
import { OpenByAgeCard } from './OpenByAgeCard';
import { PeriodPicker } from './PeriodPicker';
import {
  defaultMonth,
  monthLabel,
  monthName,
  previousMonthKey,
} from './kpiFormat';
import { useKpiReport } from './useKpiReport';

const ALL = 'all';

/*
 * Export PDF prints this panel and nothing else. Hiding by visibility, not by
 * display, because the shell's navbar and side menu sit outside this app and
 * cannot be given a print class; and lifting every ancestor's overflow and
 * height, which would otherwise clip the report to the first screenful.
 */
const PRINT_CSS = `
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  body * { visibility: hidden !important; }
  .kpi-print-root, .kpi-print-root * { visibility: visible !important; }
  *:has(.kpi-print-root) {
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
  }
  .kpi-print-root { position: absolute; inset: 0 auto auto 0; width: 100%; }
  .kpi-print-hide { display: none !important; }
}
`;

/**
 * Reports > Overview. Every figure comes from the one KPI endpoint, for the
 * tenant the user is working in. The filters live in the
 * URL, so a view can be shared and the back button works.
 */
export const KpiOverview: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') ?? defaultMonth();
  const organisation = searchParams.get('org') || null;

  const setParam = useCallback(
    (changes: Record<string, string | null>) =>
      setSearchParams(
        prev => {
          for (const [k, v] of Object.entries(changes)) {
            if (v) prev.set(k, v);
            else prev.delete(k);
          }
          return prev;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const { data, isLoading, isFetching } = useKpiReport({
    month,
    organisationId: organisation,
  });

  const { tenantId: ownTenantId } = useHelpdeskAccess();
  const { byOrganisationId, organisationOptions } = useScopeNames();
  const organisationName = useCallback(
    (id: string | null) => (id ? byOrganisationId.get(id) : undefined),
    [byOrganisationId],
  );
  const ownOrgs = useMemo(
    () =>
      ownTenantId
        ? organisationOptions.filter(o => o.parentId === ownTenantId)
        : [],
    [ownTenantId, organisationOptions],
  );

  const prevName = monthName(previousMonthKey(month));

  return (
    <div
      className={`kpi-print-root mt-4 space-y-4 ${isFetching ? 'opacity-90' : ''}`}
    >
      <style>{PRINT_CSS}</style>
      <h1 className="hidden text-xl font-semibold print:block">
        Reports: {monthLabel(month)}
        {organisation && `, ${organisationName(organisation) ?? ''}`}
      </h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="helpdesk-filter-row kpi-print-hide flex flex-wrap items-end gap-4">
          <PeriodPicker
            value={month}
            onChange={next => setParam({ month: next })}
          />
          <BaseSelect
            label="Organisation"
            className="w-56"
            selectedKey={organisation ?? ALL}
            onSelectionChange={key =>
              setParam({ org: key && key !== ALL ? String(key) : null })
            }
          >
            {[
              <BaseSelectItem key={ALL} id={ALL} textValue="All organisations">
                {`All organisations (${ownOrgs.length})`}
              </BaseSelectItem>,
              ...ownOrgs.map(o => (
                <BaseSelectItem key={o.id} id={o.id} textValue={o.name}>
                  {o.name}
                </BaseSelectItem>
              )),
            ]}
          </BaseSelect>
        </div>
        <span className="text-default-500 pb-2 text-xs">
          Compared with {monthLabel(previousMonthKey(month))}
        </span>
      </div>

      <KpiCards
        cards={data?.cards}
        previous={data?.previous}
        monthName={prevName}
        isLoading={isLoading}
      />

      {data && (
        <div className="grid gap-4 lg:grid-cols-[1fr_372px]">
          <DeadlineWeekChart
            weekly={data.weekly}
            targetPct={data.cards.deadlineTargetPct}
          />
          <OpenByAgeCard
            openByAge={data.openByAge}
            totalOpen={data.cards.openTickets}
          />
        </div>
      )}

      {data?.late && (
        <LateTicketsTable late={data.late} monthName={monthName(month)} />
      )}
    </div>
  );
};
