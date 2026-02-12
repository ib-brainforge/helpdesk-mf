import { useState } from 'react';
import type { HelpdeskUserRole } from '@/types/user';

export const useUsersFilters = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [role, setRole] = useState<HelpdeskUserRole | undefined>(undefined);
  const [includeDisabled, setIncludeDisabled] = useState<boolean>(false);

  return {
    searchTerm,
    setSearchTerm,
    role,
    setRole,
    includeDisabled,
    setIncludeDisabled,
  };
};
