import type { DynamicsDataPointDto } from '@/types';
import { formatDateTimeAsDate } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import type { FC } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_COLORS,
  CHART_GRID,
  axisProps,
  gradientStops,
  tooltipProps,
} from './chartTheme';

interface ResolutionTimeChartProps {
  data: DynamicsDataPointDto[];
}

export const ResolutionTimeChart: FC<ResolutionTimeChartProps> = ({ data }) => {
  const timezone = useTimezone();
  if (!Array.isArray(data) || data.length === 0) return null;

  const chartData = data.map(item => ({
    date: formatDateTimeAsDate(item.periodStart, { timezone }),
    avgResolutionTime: (item.avgResolutionMinutes ?? 0) / 60,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      {/* A single series, which is the one case where a filled area is
          unambiguously the right form: there is nothing for it to occlude and
          no second series for the fill to imply a total with. */}
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0 }}>
        <defs>{gradientStops()}</defs>
        <CartesianGrid
          stroke={CHART_GRID}
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis
          {...axisProps}
          width={48}
          label={{
            value: 'Hours',
            angle: -90,
            position: 'insideLeft',
            style: { fill: axisProps.stroke, fontSize: 12 },
          }}
        />
        <Tooltip
          {...tooltipProps}
          formatter={(value: number) => `${value.toFixed(1)} hours`}
        />
        {/* One series: the title already names it, so the legend is redundant
            chrome. Kept off rather than drawn as a single-entry box. */}
        <Area
          type="monotone"
          dataKey="avgResolutionTime"
          name="Avg Resolution Time"
          stroke={CHART_COLORS.blue}
          strokeWidth={2}
          // Gradient rather than the old flat #cce0ff, which read as a solid
          // slab and competed with its own outline.
          fill="url(#chart-fill-blue)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
