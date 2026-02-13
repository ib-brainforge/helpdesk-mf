import type { AccessLevel } from './category';

export interface CustomFieldDefinitionDto {
  id: string;
  name: string;
  fieldType: CustomFieldType;
  usageType: CustomFieldUsageType;
  isRequired: boolean;
  accessLevel: AccessLevel;
  isActive: boolean;
  options?: CustomFieldOptionDto[];
}

export interface CustomFieldOptionDto {
  id: string;
  value: string;
  sortOrder: number;
  isDisabled?: boolean;
}

export enum CustomFieldType {
  Text = 0,
  Date = 1,
  Dropdown = 2,
  Checkbox = 3,
  MultilineText = 4,
  Url = 5,
  Number = 6,
  Email = 7,
  MultiSelect = 8,
}

export enum CustomFieldUsageType {
  Ticket = 0,
  Asset = 1,
}

export interface CreateCustomFieldCommand {
  name: string;
  fieldType: CustomFieldType;
  usageType: CustomFieldUsageType;
  isRequired: boolean;
  accessLevel: AccessLevel;
  isActive: boolean;
  options?: Omit<CustomFieldOptionDto, 'id'>[];
}

export interface UpdateCustomFieldCommand {
  name: string;
  fieldType: CustomFieldType;
  usageType: CustomFieldUsageType;
  isRequired: boolean;
  accessLevel: AccessLevel;
  isActive: boolean;
  options?: CustomFieldOptionDto[];
}
