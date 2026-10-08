import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { PRINCIPAL_ADMIN_ROLES } from '@/hooks/usePrincipalAccess';
import { useScopeNames } from '@/hooks/useScopeNames';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import { usePermissions } from '@brainforgeau/security';
import { useSearchParams } from '@modern-js/runtime/router';
import { type FC, useCallback, useMemo } from 'react';
import { CompaniesTable } from './CompaniesTable';
import { DeadlineWeekChart } from './DeadlineWeekChart';
import { KpiCards } from './KpiCards';
import { LateTicketsTable } from './LateTicketsTable';
import { OpenByAgeCard } from './OpenByAgeCard';
import { PolicyBanner } from './PolicyBanner';
import {
  defaultMonth,
  monthLabel,
  monthName,
  monthOptions,
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
 * Reports > Overview (04) and, with a company chosen, that company's view
 * (04b). Every figure comes from the one KPI endpoint. The filters live in the
 * URL, so a view can be shared and the back button works.
 */
export const KpiOverview: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') ?? defaultMonth();
  const { principalId, tenantId: ownTenantId } = useHelpdeskAccess();
  const { hasAnyRole } = usePermissions();
  const canEditDeadlines = hasAnyRole([...PRINCIPAL_ADMIN_ROLES]);

  // Netcorp staff pick a company; anyone else only ever sees their own.
  const company = principalId
    ? searchParams.get('company') || null
    : (ownTenantId ?? null);
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

  const { data, isLoading, isFetching } = useKpiReport(principalId, {
    month,
    tenantId: principalId ? company : null,
    organisationId: organisation,
  });

  const { byTenantId, byOrganisationId, tenantOptions, organisationOptions } =
    useScopeNames();
  const companyName = useCallback(
    (id: string) => byTenantId.get(id)?.tenantName ?? id.slice(0, 8),
    [byTenantId],
  );
  const organisationName = useCallback(
    (id: string | null) => (id ? byOrganisationId.get(id) : undefined),
    [byOrganisationId],
  );
  const companyOrgs = useMemo(
    () =>
      company ? organisationOptions.filter(o => o.parentId === company) : [],
    [company, organisationOptions],
  );

  const selectCompany = useCallback(
    (id: string) => setParam({ company: id, org: null }),
    [setParam],
  );

  const prevName = monthName(previousMonthKey(month));
  const scopeLabel = company ? companyName(company) : 'All companies';

  return (
    <div
      className={`kpi-print-root mt-4 space-y-4 ${isFetching ? 'opacity-90' : ''}`}
    >
      <style>{PRINT_CSS}</style>
      <h1 className="hidden text-xl font-semibold print:block">
        Reports: {monthLabel(month)}, {scopeLabel}
        {organisation && `, ${organisationName(organisation) ?? ''}`}
      </h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="kpi-print-hide flex flex-wrap items-end gap-4">
          <BaseSelect
            label="Period"
            className="w-48"
            selectedKey={month}
            onSelectionChange={key => key && setParam({ month: String(key) })}
          >
            {monthOptions().map(o => (
              <BaseSelectItem key={o.key} id={o.key} textValue={o.label}>
                {o.label}
              </BaseSelectItem>
            ))}
          </BaseSelect>
          {principalId && (
            <BaseAutocomplete
              label="Company"
              placeholder="All companies"
              className="w-56"
              selectedKey={company ?? ALL}
              onSelectionChange={key =>
                setParam({
                  company: key && key !== ALL ? String(key) : null,
                  org: null,
                })
              }
            >
              {[
                <BaseAutocompleteItem
                  key={ALL}
                  id={ALL}
                  textValue="All companies"
                >
                  All companies
                </BaseAutocompleteItem>,
                ...tenantOptions.map(t => (
                  <BaseAutocompleteItem key={t.id} id={t.id} textValue={t.name}>
                    {t.name}
                  </BaseAutocompleteItem>
                )),
              ]}
            </BaseAutocomplete>
          )}
          <BaseSelect
            label="Organisation"
            className="w-56"
            isDisabled={!company}
            selectedKey={organisation ?? ALL}
            onSelectionChange={key =>
              setParam({ org: key && key !== ALL ? String(key) : null })
            }
          >
            {[
              <BaseSelectItem key={ALL} id={ALL} textValue="All organisations">
                {company
                  ? `All organisations (${companyOrgs.length})`
                  : 'All organisations'}
              </BaseSelectItem>,
              ...companyOrgs.map(o => (
                <BaseSelectItem key={o.id} id={o.id} textValue={o.name}>
                  {o.name}
                </BaseSelectItem>
              )),
            ]}
          </BaseSelect>
        </div>
        {company && data?.policySummary ? (
          <div className="ml-auto">
            <PolicyBanner
              companyName={companyName(company)}
              tenantId={company}
              policy={data.policySummary}
              canEdit={canEditDeadlines && Boolean(principalId)}
            />
          </div>
        ) : (
          <span className="text-default-500 pb-2 text-xs">
            Compared with {monthLabel(previousMonthKey(month))}
          </span>
        )}
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
            scopeLabel={scopeLabel}
          />
          <OpenByAgeCard
            openByAge={data.openByAge}
            totalOpen={data.cards.openTickets}
            companyName={id => byTenantId.get(id)?.tenantName}
            showCompany={!company}
          />
        </div>
      )}

      {data?.companies && !company && (
        <CompaniesTable
          companies={data.companies}
          targetPct={data.cards.deadlineTargetPct}
          companyName={companyName}
          onSelectCompany={selectCompany}
        />
      )}
      {data?.late && company && (
        <LateTicketsTable late={data.late} monthName={monthName(month)} />
      )}
    </div>
  );
};
