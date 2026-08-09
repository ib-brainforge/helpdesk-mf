// Enums use string values that match the generated @brainforgeau/helpdesk-client types
// (HelpdeskDomainKnowledgeBaseEnumsKbArticleStatus and HelpdeskDomainKnowledgeBaseEnumsKbArticleAccessLevel).
// This allows direct comparison against values returned from the backend without any casting.

import type { ServicesCoreAbstractionsRecordMeta } from '@brainforgeau/helpdesk-client';

export enum KnowledgeBaseStatus {
  Draft = 'Draft',
  Published = 'Published',
  Archived = 'Archived',
}

// Access level values match HelpdeskDomainKnowledgeBaseEnumsKbArticleAccessLevel from the generated client.
// Note: the old local enum used Internal/Private; the backend uses Authenticated/TechOnly/AdminOnly.
export enum KnowledgeBaseAccessLevel {
  Public = 'Public',
  Authenticated = 'Authenticated',
  TechOnly = 'TechOnly',
  AdminOnly = 'AdminOnly',
}

export interface KnowledgeBaseCategoryDto {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  children?: KnowledgeBaseCategoryDto[];
  articleCount: number;
  order: number;
}

export interface KnowledgeBaseArticleListDto {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  categoryId?: string;
  categoryName?: string;
  status: KnowledgeBaseStatus;
  accessLevel: KnowledgeBaseAccessLevel;
  views: number;
  averageRating?: number;
  ratingCount: number;
  tags: string[];
  authorId: string;
  // authorName is not exposed by the backend KbArticleDetailDto (only authorId is available).
  // UI should treat absence as a gap and display a graceful fallback rather than "Unknown".
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  /** Record placement/audit metadata (DTO tenancy/scope metadata initiative). */
  meta?: ServicesCoreAbstractionsRecordMeta;
}

export interface KnowledgeBaseArticleDto extends KnowledgeBaseArticleListDto {
  body: string;
  relatedArticleIds?: string[];
}

export interface KnowledgeBaseRelatedArticleDto {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  categoryName?: string;
}

export interface CreateKnowledgeBaseArticleDto {
  title: string;
  body: string;
  categoryId?: string;
  tags?: string[];
  accessLevel: KnowledgeBaseAccessLevel;
  status: KnowledgeBaseStatus;
}

export interface UpdateKnowledgeBaseArticleDto {
  title?: string;
  body?: string;
  categoryId?: string;
  tags?: string[];
  accessLevel?: KnowledgeBaseAccessLevel;
  // Note: status changes are applied via dedicated endpoints (publish/unpublish/archive),
  // not through the update command. See useKnowledgeBase.ts for the transition logic.
}

export interface RateArticleDto {
  articleId: string;
  rating: number; // 1-5
}

export interface KnowledgeBaseSearchFilters {
  searchTerm?: string;
  categoryId?: string;
  status?: KnowledgeBaseStatus[];
  accessLevel?: KnowledgeBaseAccessLevel[];
  tags?: string[];
}
