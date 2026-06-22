import type { DynamicsDataPointDto } from '@/types';
import { formatDateTimeAsDate } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import type { FC } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value: number) => `${value.toFixed(1)} hours`} />
        <Legend />
        <Area
          type="monotone"
          dataKey="avgResolutionTime"
          stroke="#1868db"
          fill="#cce0ff"
          name="Avg Resolution Time"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
