import type { HelpdeskUserDto, HelpdeskUserRole } from '@/types/user';

export type UsersRow = HelpdeskUserDto;

export interface UsersFiltersState {
  role?: HelpdeskUserRole;
  includeDisabled: boolean;
  searchTerm?: string;
}
