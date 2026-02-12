export interface CategoryDto {
  id: string;
  name: string;
  sectionId?: string;
  sectionName?: string;
  accessLevel: AccessLevel;
  defaultAssigneeId?: string;
  emailRoutingAddress?: string;
  emailRoutingProtocol?: string;
  isActive: boolean;
  sortOrder: number;
  customFieldIds?: string[];
}

export interface SectionDto {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export enum AccessLevel {
  Everyone = 0,
  AgentsOnly = 1,
  AdminsOnly = 2,
}

export interface CreateCategoryCommand {
  name: string;
  sectionId?: string;
  accessLevel: AccessLevel;
  defaultAssigneeId?: string;
  emailRoutingAddress?: string;
  emailRoutingProtocol?: string;
  isActive: boolean;
  sortOrder: number;
  customFieldIds?: string[];
}

export interface UpdateCategoryCommand {
  name: string;
  sectionId?: string;
  accessLevel: AccessLevel;
  defaultAssigneeId?: string;
  emailRoutingAddress?: string;
  emailRoutingProtocol?: string;
  isActive: boolean;
  sortOrder: number;
  customFieldIds?: string[];
}

export interface CreateSectionCommand {
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface UpdateSectionCommand {
  name: string;
  sortOrder: number;
  isActive: boolean;
}
