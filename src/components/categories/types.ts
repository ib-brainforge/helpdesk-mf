import type { CategoryDto, SectionDto } from '@/types/category';

export type CategoriesRow = CategoryDto;
export type SectionsRow = SectionDto;

export interface CategoryEditorData {
  category?: CategoryDto;
  sections: SectionDto[];
}
