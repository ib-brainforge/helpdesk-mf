import type { KnowledgeBaseArticleListDto } from '@/types';
import { KnowledgeBaseStatus } from '@/types';
import { BaseTable } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { EmptyState } from '@brainforgeau/components/page';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import { Chip } from '@heroui/react';
import { Link } from '@modern-js/runtime/router';
import {
  type ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';

type KbArticleListViewProps = {
  articles: KnowledgeBaseArticleListDto[];
  categories: { id: string; name: string; articleCount: number }[];
  isLoading?: boolean;
};

const getStatusColor = (
  status: KnowledgeBaseStatus,
): 'default' | 'success' | 'warning' => {
  switch (status) {
    case KnowledgeBaseStatus.Published:
      return 'success';
    case KnowledgeBaseStatus.Draft:
      return 'warning';
    case KnowledgeBaseStatus.Archived:
      return 'default';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: KnowledgeBaseStatus): string => {
  switch (status) {
    case KnowledgeBaseStatus.Published:
      return 'Published';
    case KnowledgeBaseStatus.Draft:
      return 'Draft';
    case KnowledgeBaseStatus.Archived:
      return 'Archived';
    default:
      return 'Unknown';
  }
};

const columnHelper = createColumnHelper<KnowledgeBaseArticleListDto>();

export function KbArticleListView({
  articles,
  categories,
  isLoading,
}: KbArticleListViewProps) {
  const timezone = useTimezone();

  const columns = useMemo(
    (): ColumnDef<KnowledgeBaseArticleListDto, any>[] => [
      columnHelper.display({
        id: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <Link
            to={`/knowledge-base/${row.original.slug}`}
            className="text-primary hover:underline font-medium"
          >
            {row.original.title}
          </Link>
        ),
        size: 400,
      }),
      columnHelper.display({
        id: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-sm text-default-600">
            {row.original.categoryName || 'Uncategorized'}
          </span>
        ),
        size: 180,
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Chip size="sm" color={getStatusColor(row.original.status)}>
            {getStatusLabel(row.original.status)}
          </Chip>
        ),
        size: 120,
      }),
      columnHelper.display({
        id: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-sm text-default-500">
            {formatDateTime(row.original.createdAt, { timezone })}
          </span>
        ),
        size: 160,
      }),
    ],
    [timezone],
  );

  const table = useReactTable({
    data: articles,
    columns,
    getRowId: row => row.id ?? row.slug,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-default-500">Loading articles...</span>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <EmptyState title="No articles found" live />
    );
  }

  return (
    <BaseTable
      table={table}
      showInfo={false}
      isLoading={isLoading}
      loading={{ title: 'Loading articles...' }}
    />
  );
}
