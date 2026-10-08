import type { KpiPolicySummaryDto } from '@/api/local/kpi';
import { formatTargetMinutes } from '@/components/company-deadlines/deadlinePolicy';
import { NavLink } from '@modern-js/runtime/router';
import type { FC } from 'react';

interface PolicyBannerProps {
  companyName: string;
  tenantId: string;
  policy: KpiPolicySummaryDto;
  /** Netcorp admins can follow the link to change them. */
  canEdit: boolean;
}

/** One company's SAVED deadlines, beside the filters on its report. */
export const PolicyBanner: FC<PolicyBannerProps> = ({
  companyName,
  tenantId,
  policy,
  canEdit,
}) => (
  <div className="bg-lighter-blue/60 dark:bg-blue/10 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg px-4 py-2 text-xs">
    <div className="min-w-0">
      <div className="text-dark font-semibold dark:text-white">
        {companyName} deadlines
      </div>
      <div className="text-gray dark:text-light">{policy.hoursText}</div>
      {canEdit && (
        <NavLink
          to={`/configuration/company-deadlines/${tenantId}`}
          className="text-primary hover:underline print:hidden"
        >
          Change deadlines
        </NavLink>
      )}
    </div>
    <table className="border-default-300 border-l pl-4 text-xs">
      <thead>
        <tr className="text-default-500">
          <th className="pl-4 pr-2 text-left font-normal" />
          {policy.targets.map(t => (
            <th key={t.priority} className="px-2 text-left font-normal">
              {t.priority}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-dark font-semibold dark:text-white">
        {(['replyMinutes', 'fixMinutes'] as const).map(field => (
          <tr key={field}>
            <th className="text-default-500 pl-4 pr-2 text-left font-normal">
              {field === 'replyMinutes' ? 'Reply by' : 'Fix by'}
            </th>
            {policy.targets.map(t => (
              <td key={t.priority} className="px-2">
                {formatTargetMinutes(t[field])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
