import type { SectionDto } from '@/types/category';
import { BaseTooltip } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { toast } from '@heroui/react';
import type { FC } from 'react';

/** Filter value for categories that belong to no section. */
export const NO_SECTION = '__none__';

interface SectionsPanelProps {
  sections: SectionDto[];
  /** Categories the tenant owns in each section, keyed by section id. */
  countsBySection: Map<string, number>;
  /** Categories (owned and preset) with no section. */
  unsectionedCount: number;
  /** Every category the table can show. */
  totalCount: number;
  /** null for every category, NO_SECTION, or a section id. */
  value: string | null;
  onChange: (value: string | null) => void;
  onEdit: (section: SectionDto) => void;
  onDelete: (section: SectionDto) => void;
}

const rowClass = (selected: boolean) =>
  `flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue ${
    selected
      ? 'bg-lighter-blue text-blue font-medium'
      : 'text-gray hover:bg-light dark:text-light'
  }`;

const Count: FC<{ value: number; className?: string }> = ({
  value,
  className = '',
}) => (
  <span
    className={`text-light-gray w-8 shrink-0 text-right text-xs tabular-nums ${className}`}
  >
    {value}
  </span>
);

/**
 * The tenant's sections, as a filter for the category table and the place to
 * rename or delete them.
 *
 * Sections could be created from this page but never seen, renamed or
 * deleted: the edit and delete handlers existed with nothing on screen to
 * reach them, and an empty section did not appear anywhere at all.
 *
 * Delete works only for an empty section. The backend soft-deletes the
 * section and leaves its categories pointing at it, and the category list
 * shows neither deleted sections nor their categories, so deleting a section
 * that still held categories would make them vanish from Configuration while
 * tickets kept using them. The button says why instead, on hover and on press.
 */
export const SectionsPanel: FC<SectionsPanelProps> = ({
  sections,
  countsBySection,
  unsectionedCount,
  totalCount,
  value,
  onChange,
  onEdit,
  onDelete,
}) => (
  /*
    ListPage's aside only sets the width, so the panel brings its own surface:
    the same tinted column, right rule and padding as the Tickets page's side
    panel, stacked above the table with a bottom rule on narrow screens.
  */
  <nav
    aria-label="Sections"
    className="border-light bg-default-50 h-full space-y-0.5 border-b px-4 py-5 lg:border-r lg:border-b-0"
  >
    <h3 className="text-dark mb-2 px-2 text-sm font-semibold dark:text-light">
      Sections
    </h3>
    <button
      type="button"
      aria-pressed={value === null}
      onClick={() => onChange(null)}
      className={rowClass(value === null)}
    >
      <span className="min-w-0 flex-1 truncate">All categories</span>
      <Count value={totalCount} />
    </button>

    {sections.map(section => {
      const count = countsBySection.get(section.id) ?? 0;
      const selected = value === section.id;
      const blockedReason =
        count > 0
          ? `Can't delete: ${section.name} still has ${count} ${count === 1 ? 'category' : 'categories'}. Move ${count === 1 ? 'it' : 'them'} to another section first.`
          : null;
      return (
        <div key={section.id} className="group relative">
          <button
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(section.id)}
            className={`${rowClass(selected)} group-hover:pr-14 group-focus-within:pr-14`}
          >
            <span className="min-w-0 flex-1 truncate">{section.name}</span>
            <Count
              value={count}
              className="group-hover:hidden group-focus-within:hidden"
            />
          </button>
          {/*
            Rename and delete take the count's place on hover or keyboard
            focus, so the list reads as clean name and count rows the rest of
            the time and every count lines up.
          */}
          <div className="invisible absolute inset-y-0 right-2 flex items-center gap-2.5 group-hover:visible group-focus-within:visible">
            <BaseTooltip content="Rename section" delay={200}>
              <BaseButton
                variant="link"
                size="none"
                className="text-dark dark:text-light hover:text-blue"
                aria-label={`Rename section ${section.name}`}
                onPress={() => onEdit(section)}
                icon={<Icon name="pencil" className="h-3.5 w-3.5" />}
              />
            </BaseTooltip>
            {/*
              Not truly disabled when the section has categories: a disabled
              button gets no hover or focus, so no tooltip could ever explain
              it and a click silently did nothing. It looks muted, says why on
              hover or focus, and repeats the reason if pressed anyway.
            */}
            <BaseTooltip
              content={blockedReason ?? 'Delete section'}
              delay={200}
            >
              <BaseButton
                variant="link"
                size="none"
                className={
                  blockedReason
                    ? 'text-danger cursor-not-allowed opacity-40'
                    : 'text-danger hover:text-danger-600'
                }
                // No aria-disabled: HeroUI gives it pointer-events: none, which
                // swallowed the hover and the press, so the reason never
                // showed. The accessible name carries it instead.
                aria-label={
                  blockedReason
                    ? `Delete section ${section.name} (unavailable). ${blockedReason}`
                    : `Delete section ${section.name}`
                }
                onPress={() =>
                  blockedReason
                    ? toast(`Can't delete "${section.name}"`, {
                        description: `It still has ${count} ${count === 1 ? 'category' : 'categories'}. Move ${count === 1 ? 'it' : 'them'} to another section first, then delete the empty section.`,
                        variant: 'warning',
                      })
                    : onDelete(section)
                }
                icon={<Icon name="trash" className="h-3.5 w-3.5" />}
              />
            </BaseTooltip>
          </div>
        </div>
      );
    })}

    <div className="border-light mt-2 border-t pt-2">
      <button
        type="button"
        aria-pressed={value === NO_SECTION}
        onClick={() => onChange(NO_SECTION)}
        className={rowClass(value === NO_SECTION)}
      >
        <span className="min-w-0 flex-1 truncate">No section</span>
        <Count value={unsectionedCount} />
      </button>
    </div>

    {sections.length === 0 && (
      <p className="text-light-gray px-2 pt-1 text-xs">
        No sections yet. Use Add Section to group categories.
      </p>
    )}
  </nav>
);
