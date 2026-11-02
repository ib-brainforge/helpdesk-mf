import type {
  HelpdeskApplicationKnowledgeBaseCommandsCreateArticleCreateArticleCommand as CreateArticleCommand,
  HelpdeskDomainKnowledgeBaseEnumsKbArticleAccessLevel,
  HelpdeskApplicationKnowledgeBaseCommandsUpdateArticleUpdateArticleCommand as UpdateArticleCommand,
} from '@/api/helpdesk-client';

import type {
  CreateKnowledgeBaseArticleDto,
  UpdateKnowledgeBaseArticleDto,
} from '@/types';
import { normalisePageKeys } from './pageKeys';

// The create command does not accept a status field: articles always start as Draft.
export const buildCreateArticleCommand = (
  article: CreateKnowledgeBaseArticleDto,
): CreateArticleCommand => ({
  title: article.title,
  body: article.body,
  categoryId: article.categoryId,
  tags: article.tags,
  pageKeys: normalisePageKeys(article.pageKeys ?? []),
  accessLevel:
    article.accessLevel as HelpdeskDomainKnowledgeBaseEnumsKbArticleAccessLevel,
});

// pageKeys: undefined leaves the article's keys unchanged, a list (even empty) replaces them.
export const buildUpdateArticleCommand = (
  id: string,
  updates: UpdateKnowledgeBaseArticleDto,
): UpdateArticleCommand => ({
  id,
  title: updates.title,
  body: updates.body,
  categoryId: updates.categoryId,
  tags: updates.tags,
  pageKeys: updates.pageKeys ? normalisePageKeys(updates.pageKeys) : undefined,
  accessLevel: updates.accessLevel as
    | HelpdeskDomainKnowledgeBaseEnumsKbArticleAccessLevel
    | undefined,
});
