import { BaseInput, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import type { Table } from '@tanstack/react-table';
import { useCallback } from 'react';
import type { UsersRow } from '../types';
import { HelpdeskUserRole } from '@/types/user';
import { useUsersFilters } from '../hooks';
import { Switch } from '@heroui/react';

interface UsersTableFiltersProps {
  table: Table<UsersRow>;
}

const ROLE_OPTIONS = [
  { id: HelpdeskUserRole.Customer, name: 'Customer' },
  { id: HelpdeskUserRole.Manager, name: 'Manager' },
  { id: HelpdeskUserRole.Technician, name: 'Technician' },
  { id: HelpdeskUserRole.Admin, name: 'Admin' },
];

export const UsersTableFilters: React.FC<UsersTableFiltersProps> = ({ table }) => {
  const { searchTerm, setSearchTerm, role, setRole, includeDisabled, setIncludeDisabled } = useUsersFilters();

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    table.setGlobalFilter(value);
  }, [setSearchTerm, table]);

  const handleRoleChange = useCallback((keys: any) => {
    const selectedRole = keys.currentKey ? Number(keys.currentKey) as HelpdeskUserRole : undefined;
    setRole(selectedRole);
    // TODO: Apply role filter when data fetching is implemented
  }, [setRole]);

  const handleIncludeDisabledChange = useCallback((checked: boolean) => {
    setIncludeDisabled(checked);
    // TODO: Apply includeDisabled filter when data fetching is implemented
  }, [setIncludeDisabled]);

  return (
    <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
      <div className="flex-1">
        <BaseInput
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="flex gap-3 items-center">
        <BaseSelect
          placeholder="All Roles"
          selectedKeys={role !== undefined ? [String(role)] : []}
          onSelectionChange={handleRoleChange}
          className="w-[180px]"
          aria-label="Filter by role"
        >
          {ROLE_OPTIONS.map((option) => (
            <BaseSelectItem key={String(option.id)}>{option.name}</BaseSelectItem>
          ))}
        </BaseSelect>

        <Switch
          isSelected={includeDisabled}
          onValueChange={handleIncludeDisabledChange}
          size="sm"
        >
          Include Disabled
        </Switch>
      </div>
    </div>
  );
};
