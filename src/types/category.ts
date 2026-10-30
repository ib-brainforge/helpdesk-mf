import type { ServicesCoreAbstractionsRecordMeta } from '@/api/helpdesk-client';

export interface CategoryDto {
  id: string;
  name: string;
  sectionId?: string;
  sectionName?: string;
  accessLevel: AccessLevel;
  // Correct field names from HelpdeskApplicationCategoriesModelsCategoryDto.
  // The old emailRoutingAddress / emailRoutingProtocol fields did not exist on the backend DTO.
  fromEmailAddress?: string;
  fromEmailName?: string;
  useFromAddressAsReplyTo?: boolean;
  isActive: boolean;
  sortOrder: number;
  customFieldIds?: string[];
  /** True for the tenant's single category that customer-portal enquiries are filed under. */
  isPortalEnquiryCategory?: boolean;
}

export interface SectionDto {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  /** Record placement/audit metadata (DTO tenancy/scope metadata initiative). */
  meta?: ServicesCoreAbstractionsRecordMeta;
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
  fromEmailAddress?: string;
  fromEmailName?: string;
  useFromAddressAsReplyTo?: boolean;
  isActive: boolean;
  sortOrder: number;
  customFieldIds?: string[];
}

export interface UpdateCategoryCommand {
  name: string;
  sectionId?: string;
  accessLevel: AccessLevel;
  fromEmailAddress?: string;
  fromEmailName?: string;
  useFromAddressAsReplyTo?: boolean;
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
