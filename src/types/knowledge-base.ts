// TODO: Replace with types from @brainforgeau/helpdesk-backend-client when available
// These types match the backend DTOs for Knowledge Base

export enum KnowledgeBaseStatus {
  Draft = 0,
  Published = 1,
  Archived = 2,
}

export enum KnowledgeBaseAccessLevel {
  Public = 0,
  Internal = 1,
  Private = 2,
}

export interface KnowledgeBaseCategoryDto {
  id: string;
  name: string;
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
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
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
  status?: KnowledgeBaseStatus;
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
