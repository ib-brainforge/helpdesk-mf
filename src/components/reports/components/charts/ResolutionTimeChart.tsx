import type { FC } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DynamicsDataPointDto } from '@/types';

interface ResolutionTimeChartProps {
  data: DynamicsDataPointDto[];
}

export const ResolutionTimeChart: FC<ResolutionTimeChartProps> = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) return null;

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    avgResolutionTime: item.averageResolutionTimeHours,
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
          stroke="#3b82f6"
          fill="#93c5fd"
          name="Avg Resolution Time"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
