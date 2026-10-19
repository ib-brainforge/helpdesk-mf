import type { StatusBreakdownDto } from '@/types';
import type { FC } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface StatusPieChartProps {
  data: StatusBreakdownDto[];
}

const STATUS_COLORS: Record<string, string> = {
  New: '#1868db',
  InProgress: '#e2b203',
  Closed: '#6a9a23',
  Open: '#bf63f3',
  OnHold: '#ff7f00',
  Resolved: '#6acda4',
};

export const StatusPieChart: FC<StatusPieChartProps> = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) return null;

  const chartData = data.map(item => ({
    name: item.name,
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
          label={({ name, percentage }) =>
            `${name} (${percentage.toFixed(1)}%)`
          }
          outerRadius={80}
          fill="#1868db"
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
