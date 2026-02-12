import type { FC } from 'react';
import { useState, useCallback, useRef } from 'react';
import { Autocomplete, AutocompleteItem } from '@heroui/react';
import { TagChip } from './TagChip';
import type { TagDto } from '@/types';

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
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag(inputValue);
      } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
        // Remove last tag on backspace if input is empty
        handleRemoveTag(selectedTags[selectedTags.length - 1]);
      }
    },
    [inputValue, selectedTags, handleAddTag, handleRemoveTag],
  );

  const filteredTags = availableTags.filter(
    tag =>
      !selectedTags.includes(tag.name) &&
      tag.name.toLowerCase().includes(inputValue.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <Autocomplete
        label="Tags"
        placeholder={placeholder}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onKeyDown={handleKeyDown}
        onSelectionChange={(key) => {
          if (key) {
            const tag = availableTags.find(t => t.id === key);
            if (tag) {
              handleAddTag(tag.name);
            }
          }
        }}
        allowsCustomValue
        ref={inputRef}
      >
        {filteredTags.map((tag) => (
          <AutocompleteItem key={tag.id}>
            {tag.name}
          </AutocompleteItem>
        ))}
      </Autocomplete>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => {
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
