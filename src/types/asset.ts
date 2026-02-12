// TODO: Replace with types from @brainforgeau/helpdesk-backend-client when available
// These types match the backend DTOs for Asset Management

export enum AssetStatus {
  Available = 0,
  InUse = 1,
  UnderMaintenance = 2,
  Retired = 3,
  Lost = 4,
}

export enum AssetType {
  Hardware = 0,
  Software = 1,
  Equipment = 2,
  Other = 3,
}

export interface AssetListDto {
  id: string;
  name: string;
  assetType: AssetType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  status: AssetStatus;
  assignedToUserId?: string;
  assignedToUserName?: string;
  location?: string;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDto extends AssetListDto {
  description?: string;
  supplier?: string;
  purchaseCost?: number;
  currentValue?: number;
  notes?: string;
  customFields?: Record<string, string>;
}

export interface AssetAssignmentDto {
  id: string;
  assetId: string;
  userId: string;
  userName?: string;
  assignedAt: string;
  returnedAt?: string;
  notes?: string;
}

export interface AssetTicketLinkDto {
  id: string;
  assetId: string;
  ticketId: string;
  ticketSubject?: string;
  linkType: string; // "related", "maintenance", "issue"
  linkedAt: string;
}

export interface CreateAssetDto {
  name: string;
  assetType: AssetType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  status: AssetStatus;
  description?: string;
  supplier?: string;
  location?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiryDate?: string;
  customFields?: Record<string, string>;
}

export interface UpdateAssetDto {
  name?: string;
  assetType?: AssetType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  status?: AssetStatus;
  description?: string;
  supplier?: string;
  location?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  warrantyExpiryDate?: string;
  notes?: string;
  customFields?: Record<string, string>;
}

export interface AssignAssetDto {
  userId: string;
  notes?: string;
}

export interface AssetFilters {
  assetType?: AssetType[];
  manufacturer?: string[];
  status?: AssetStatus[];
  searchTerm?: string;
}
