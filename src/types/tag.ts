// TODO: Replace with types from @brainforgeau/helpdesk-backend-client when available
// These types match the backend DTOs for Tags

export interface TagDto {
  id: string;
  name: string;
  color?: string;
  usageCount: number;
  createdAt: string;
}

export interface CreateTagDto {
  name: string;
  color?: string;
}
