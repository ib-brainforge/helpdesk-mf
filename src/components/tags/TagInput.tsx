import type { TagDto } from '@/types';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
} from '@brainforgeau/components/autocomplete';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { TagChip } from './TagChip';

interface TagInputProps {
  selectedTags: string[];
  availableTags: TagDto[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export const TagInput: FC<TagInputProps> = ({
  selectedTags,
  availableTags,
  onTagsChange,
  placeholder = 'Add tags...',
  maxTags,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = useCallback(
    (tagName: string) => {
      const trimmedTag = tagName.trim();
      if (!trimmedTag) return;

      if (maxTags && selectedTags.length >= maxTags) {
        return;
      }

      if (!selectedTags.includes(trimmedTag)) {
        onTagsChange([...selectedTags, trimmedTag]);
      }

      setInputValue('');
    },
    [selectedTags, onTagsChange, maxTags],
  );

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
    },
    [selectedTags, onTagsChange],
  );

  const filteredTags = availableTags.filter(
    tag =>
      !selectedTags.includes(tag.name) &&
      tag.name.toLowerCase().includes(inputValue.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <BaseAutocomplete
        label="Tags"
        placeholder={placeholder}
        onValueChange={setInputValue}
        onSelectionChange={key => {
          if (key) {
            const tag = availableTags.find(t => t.id === String(key));
            if (tag) {
              handleAddTag(tag.name);
            }
          }
        }}
        allowsCustomValue
      >
        {filteredTags.map(tag => (
          <BaseAutocompleteItem key={tag.id} value={tag.id}>
            {tag.name}
          </BaseAutocompleteItem>
        ))}
      </BaseAutocomplete>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tag => {
            const tagData = availableTags.find(t => t.name === tag);
            return (
              <TagChip
                key={tag}
                name={tag}
                color={tagData?.color}
                onRemove={() => handleRemoveTag(tag)}
              />
            );
          })}
        </div>
      )}

      {maxTags && (
        <p className="text-xs text-gray-500">
          {selectedTags.length} / {maxTags} tags
        </p>
      )}
    </div>
  );
};
