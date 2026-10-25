import type { KpiWeekDto } from '@/api/local/kpi';
import { BarChart } from '@brainforgeau/components';
import { type FC, useMemo } from 'react';
import { KpiPanel } from './KpiPanel';
import { formatPct, weekLabel } from './kpiFormat';

const MET = '#1868db';
const BELOW = '#e17100';

interface DeadlineWeekChartProps {
  weekly: KpiWeekDto[];
  targetPct: number;
  /** "All companies" or the company's name. */
  scopeLabel: string;
}

/**
 * "Deadline met by week", 13 weeks. Bars at or above target are blue, below
 * it orange. The library chart draws no reference line, so the target is
 * named in the legend instead. A week with no finished tickets has no bar.
 */
export const DeadlineWeekChart: FC<DeadlineWeekChartProps> = ({
  weekly,
  targetPct,
  scopeLabel,
}) => {
  const data = useMemo(
    () =>
      weekly.map(w => ({
        label: weekLabel(w.weekStart),
        // NaN rather than 0: chart.js leaves the slot empty and keeps the
        // axis on the real range instead of dragging it down to zero.
        value: w.deadlineMetPct ?? Number.NaN,
        color:
          w.deadlineMetPct !== null && w.deadlineMetPct >= targetPct
            ? MET
            : BELOW,
      })),
    [weekly, targetPct],
  );

  return (
    <KpiPanel
      title="Deadline met by week"
      aside={`${scopeLabel}, last ${weekly.length} weeks`}
    >
      <div className="px-5 pt-3 pb-4">
        <BarChart
          data={data}
          height={170}
          formatValue={v => `${v}%`}
          formatTooltip={(label, value, index) =>
            Number.isNaN(value)
              ? `Week of ${label}: no finished tickets`
              : `Week of ${label}: ${formatPct(value)} of ${weekly[index]?.ticketCount ?? 0} tickets`
          }
          ariaLabel={`Deadline met by week, ${scopeLabel}`}
        />
        <div className="text-default-600 mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: MET }}
            />
            Met target
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: BELOW }}
            />
            Below target
          </span>
          <span className="font-semibold">Target {targetPct}%</span>
        </div>
      </div>
    </KpiPanel>
  );
};
