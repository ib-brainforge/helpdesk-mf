import type { FC } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { StatusBreakdownDto } from '@/types';

interface StatusPieChartProps {
  data: StatusBreakdownDto[];
}

const STATUS_COLORS: Record<string, string> = {
  New: '#3b82f6', // blue
  InProgress: '#f59e0b', // amber
  Closed: '#10b981', // green
};

export const StatusPieChart: FC<StatusPieChartProps> = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) return null;

  const chartData = data.map(item => ({
    name: item.statusName,
    value: item.count,
    percentage: item.percentage,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={STATUS_COLORS[entry.name] || `hsl(${index * 45}, 70%, 50%)`}
            />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `${value} tickets`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
