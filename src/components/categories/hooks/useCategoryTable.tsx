/**
 * useCategoryTable — lifts the TanStack table instance out of CategoryList so
 * the categories page can pass it directly to <ListPage>.
 *
 * The table owns search-filtered rows. The page owns searchTerm state and passes
 * it in, allowing <ListPage filters={...}> to wire the search input.
 */
import { IconTip, StatusBadge, UserCell } from '@/components/shared';
import type { UserInfo } from '@/hooks/useUserEnrichment';
import type { CategoryDto, SectionDto } from '@/types/category';
import { AccessLevel } from '@/types/category';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import {
  type ColumnDef,
  type PaginationState,
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

export type CategoryRow = CategoryDto & { sectionName?: string };

const columnHelper = createColumnHelper<CategoryRow>();

/**
 * Who can log a ticket in the category, in the words the request form's users
 * would use. Everyone is the ordinary case and stays plain text; the
 * restricted levels get a solid chip so they stand out.
 */
const WhoCanUseIt = ({ level }: { level: AccessLevel }) =>
  level === AccessLevel.AgentsOnly ? (
    <StatusBadge color="primary">Techs only</StatusBadge>
  ) : level === AccessLevel.AdminsOnly ? (
    <StatusBadge color="warning">Admins only</StatusBadge>
  ) : (
    <span className="text-default-600 text-sm">Clients and techs</span>
  );

interface UseCategoryTableOptions {
  categories: CategoryDto[];
  sections: SectionDto[];
  searchTerm: string;
  isLoading?: boolean;
  onEditCategory: (category: CategoryDto) => void;
  onDeleteCategory: (categoryId: string) => void;
  /**
   * Categories the tenant may use but does not own (the Netcorp presets).
   * They are listed so the set matches what the request form offers, but they
   * belong to the principal, so editing or deleting one here is not the
   * tenant's to do.
   */
  presetIds?: Set<string>;
  /** Show the Section column. Off while categories are presets only. */
  showSections?: boolean;
  /** Open tickets per category id; undefined hides the counts (tenant users). */
  openCounts?: Map<string, number>;
  /** Names for the Default assignee column, from useUserEnrichment. */
  userMap?: Record<string, UserInfo | null | undefined>;
  /** Opens the default assignee picker; undefined makes the column read only. */
  onSetDefaultAssignee?: (category: CategoryDto) => void;
}

export function useCategoryTable({
  categories,
  sections,
  searchTerm,
  onEditCategory,
  onDeleteCategory,
  presetIds,
  showSections = true,
  openCounts,
  userMap,
  onSetDefaultAssignee,
}: UseCategoryTableOptions) {
  const columns = useMemo(
    (): ColumnDef<CategoryRow, any>[] => [
      columnHelper.display({
        id: 'name',
        header: 'Name',
        // The preset names are long: truncated here, whole in the tooltip.
        cell: ({ row }) =>
          presetIds?.has(row.original.id) ? (
            <span className="block truncate" title={row.original.name}>
              {row.original.name}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onEditCategory(row.original)}
              className="text-primary block max-w-full truncate font-medium hover:underline"
              title={row.original.name}
            >
              {row.original.name}
            </button>
          ),
        size: 360,
      }),
      ...(showSections
        ? [
            columnHelper.display({
              id: 'section',
              header: 'Section',
              cell: ({ row }) => (
                <span className="text-sm text-default-600">
                  {row.original.sectionName ?? '–'}
                </span>
              ),
              size: 200,
            }),
          ]
        : []),
      columnHelper.display({
        id: 'accessLevel',
        header: 'Who can use it',
        cell: ({ row }) => (
          <WhoCanUseIt level={row.original.accessLevel as AccessLevel} />
        ),
        size: 160,
      }),
      columnHelper.display({
        id: 'defaultAssignee',
        header: 'Default assignee',
        cell: ({ row }) => {
          const id = row.original.defaultAssigneeId;
          const content = id ? (
            <UserCell userInfo={userMap?.[id]} />
          ) : (
            <span className="text-default-400 text-sm">Not set</span>
          );
          if (!onSetDefaultAssignee) return content;
          return (
            <IconTip label="Set default assignee">
              <button
                type="button"
                className="-mx-1 flex w-full items-center rounded px-1 py-0.5 text-left hover:bg-default-100"
                aria-label={`Set default assignee for ${row.original.name}`}
                onClick={() => onSetDefaultAssignee(row.original)}
              >
                {content}
              </button>
            </IconTip>
          );
        },
        size: 240,
      }),
      columnHelper.display({
        id: 'openTickets',
        header: () => <span className="block text-right">Open tickets</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {openCounts ? (openCounts.get(row.original.id) ?? 0) : '–'}
          </span>
        ),
        size: 110,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const isPreset = presetIds?.has(row.original.id) ?? false;
          if (isPreset) {
            return (
              <div className="-my-1.5 flex items-center justify-end gap-2">
                <span
                  className="bg-lighter-blue text-blue rounded-full px-2 py-0.5 text-[11px] font-medium"
                  title="Provided by the platform. Cannot be edited or deleted here."
                >
                  Preset
                </span>
              </div>
            );
          }
          return (
            <div className="-my-1.5 flex items-center justify-end gap-1">
              <IconTip label={'Edit category'}>
                <BaseButton
                  variant="link"
                  size="none"
                  className="text-dark dark:text-light hover:text-blue"
                  aria-label="Edit category"
                  onPress={() => onEditCategory(row.original)}
                  icon={<Icon name="pencil" className="h-4 w-4" />}
                />
              </IconTip>
              <IconTip label={'Delete category'}>
                <BaseButton
                  variant="link"
                  size="none"
                  className="text-danger hover:text-danger-600"
                  aria-label="Delete category"
                  onPress={() => onDeleteCategory(row.original.id)}
                  icon={<Icon name="trash" className="h-4 w-4" />}
                />
              </IconTip>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 100,
      }),
    ],
    [
      onEditCategory,
      onDeleteCategory,
      presetIds,
      showSections,
      openCounts,
      userMap,
      onSetDefaultAssignee,
    ],
  );

  // Build flat rows with section grouping info
  const rows = useMemo(() => {
    const result: CategoryRow[] = [];
    const categoriesBySection = new Map<string | undefined, CategoryDto[]>();

    for (const cat of categories) {
      const key = cat.sectionId;
      if (!categoriesBySection.has(key)) {
        categoriesBySection.set(key, []);
      }
      categoriesBySection.get(key)?.push(cat);
    }

    // Sectioned categories first
    for (const section of sections) {
      const sectionCats = categoriesBySection.get(section.id) ?? [];
      for (const cat of sectionCats) {
        result.push({ ...cat, sectionName: section.name });
      }
    }

    // Unsectioned categories last
    const unsectioned = categoriesBySection.get(undefined) ?? [];
    for (const cat of unsectioned) {
      result.push({ ...cat, sectionName: undefined });
    }

    return result;
  }, [categories, sections]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const lower = searchTerm.toLowerCase();
    return rows.filter(row => row.name?.toLowerCase().includes(lower));
  }, [rows, searchTerm]);

  /*
   * Paginated, because this table had no pagination model at all and therefore
   * rendered every category it was given.
   *
   * On a tenant with 1,100 categories that meant 1,100 rows and ~4,400 buttons
   * in the DOM at once (~21,000 nodes), none of it virtualised. Every render
   * walked the lot, so opening the Create Category dialog -- which adds about
   * 100 nodes of its own -- took 18 seconds cold and 10 warm. The dialog was
   * never the problem; the list re-rendering behind it was.
   *
   * Client side rather than server side: the categories endpoint returns the
   * whole hierarchy in one call and the page's search box filters across all
   * of it, so paging here is purely about what reaches the DOM. ListPage
   * derives its pagination controls straight from the table instance, so
   * adding the row model is all that is needed to get the footer.
   */
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const table = useReactTable<CategoryRow>({
    data: filteredRows,
    columns,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination },
    onPaginationChange: setPagination,
    enableSorting: false,
  });

  // Searching shrinks the result set, so a page index carried over from the
  // previous one can land past the end and show an empty table. Snap to the
  // first page when that happens.
  const pageCount = table.getPageCount();
  if (pagination.pageIndex > 0 && pagination.pageIndex >= pageCount) {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }

  return { table };
}
