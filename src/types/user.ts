export interface HelpdeskUserDto {
  id: string;
  role: HelpdeskUserRole;
  signature?: string;
  greeting?: string;
  sendEmailNotifications: boolean;
  lastSeenAt?: string;
  categoryPermissionIds?: string[];
  // Additional fields for display
  name?: string;
  email?: string;
  isDisabled?: boolean;
}

export enum HelpdeskUserRole {
  Customer = 0,
  Manager = 1,
  Technician = 2,
  Admin = 3,
}

export interface UpdateHelpdeskUserCommand {
  role: HelpdeskUserRole;
  signature?: string;
  greeting?: string;
  sendEmailNotifications: boolean;
  categoryPermissionIds?: string[];
}

export interface UserListFilters {
  role?: HelpdeskUserRole;
  includeDisabled: boolean;
}
