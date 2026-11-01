/**
 * The questions asked when raising a request, and their answers.
 *
 * WHERE THE QUESTIONS COME FROM
 * Each category carries its questions as custom fields, listed with it by
 * `GET v1/categories/available` (`fields`, in the order they are asked). The
 * default request types' questions are seeded by helpdesk-backend
 * (DefaultRequestCategories); an office's own categories ask whatever fields
 * its admins assign. Nothing about a question lives here.
 *
 * Answers go with the ticket (`customFieldValues` on `POST v1/tickets`) and are
 * saved as the ticket's custom field values in the helpdesk that handles it,
 * where they are filterable and reportable.
 *
 * Besides the category's questions, every request asks two things of the
 * ticket itself: how urgent it is (its priority) and the requester's own words
 * (its description).
 */
import { formatDate } from '@brainforgeau/components/utils';
import type {
  HelpdeskApplicationCustomFieldsCommandsSetBulkCustomFieldValuesCustomFieldValueInput as CustomFieldAnswer,
  HelpdeskApplicationCategoriesModelsRequestFieldDto,
  HelpdeskApplicationCategoriesModelsRequestFieldOptionDto,
} from '@brainforgeau/helpdesk-client';
import type { PickedAsset } from './AssetPicker';

/** A question's option, with the API's optional fields made present. */
export type RequestFieldOption = Required<
  Omit<
    HelpdeskApplicationCategoriesModelsRequestFieldOptionDto,
    'parentOptionId'
  >
> &
  Pick<
    HelpdeskApplicationCategoriesModelsRequestFieldOptionDto,
    'parentOptionId'
  >;

/** A category question, with the API's optional fields made present. */
export type RequestField = Required<
  Omit<
    HelpdeskApplicationCategoriesModelsRequestFieldDto,
    'description' | 'options'
  >
> &
  Pick<HelpdeskApplicationCategoriesModelsRequestFieldDto, 'description'> & {
    options: RequestFieldOption[];
  };

/**
 * Narrows a listed question to the shape the wizard reads. The backend always
 * sends the ids; the filter only narrows the generated optionals (a question
 * or option without an id is dropped), and the defaults fill the rest.
 */
export const toRequestField = (
  dto: HelpdeskApplicationCategoriesModelsRequestFieldDto,
): RequestField[] =>
  dto.id
    ? [
        {
          id: dto.id,
          name: dto.name ?? '',
          description: dto.description,
          fieldType: dto.fieldType ?? 'Text',
          isRequired: dto.isRequired ?? false,
          options: (dto.options ?? []).flatMap(o =>
            o.id
              ? [
                  {
                    id: o.id,
                    value: o.value ?? '',
                    parentOptionId: o.parentOptionId,
                  },
                ]
              : [],
          ),
        },
      ]
    : [];

/**
 * An answer. Text, number, date (yyyy-mm-dd) and a dropdown's option id are
 * strings; a MultiSelect is its option ids; a checkbox a boolean; an asset
 * field the picked assets.
 */
export type AnswerValue =
  | string
  | string[]
  | boolean
  | PickedAsset[]
  | undefined;

/** Answers by field id. */
export type Answers = Record<string, AnswerValue>;

/** One item on the questions step: a category question, or one of the ticket's own. */
export type QuestionItem =
  | { kind: 'field'; field: RequestField }
  | { kind: 'urgency' }
  | { kind: 'description' };

export const itemKey = (item: QuestionItem): string =>
  item.kind === 'field' ? item.field.id : item.kind;

/** The urgency choices, and the ticket priority each files the ticket at. */
export const URGENCY_CHOICES = [
  { label: 'Low', priority: 'Low' },
  { label: 'Medium', priority: 'Normal' },
  { label: 'High', priority: 'High' },
  { label: 'Critical', priority: 'Critical' },
] as const;

export const urgencyToPriority = (urgency: string | undefined): string =>
  URGENCY_CHOICES.find(c => c.label === urgency)?.priority ?? 'Normal';

export const isAnswered = (
  field: RequestField,
  value: AnswerValue,
): boolean => {
  if (field.fieldType === 'Checkbox') return value === true;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.trim().length > 0;
};

export const missingRequired = (
  fields: RequestField[],
  answers: Answers,
): RequestField[] =>
  fields.filter(f => f.isRequired && !isAnswered(f, answers[f.id]));

/**
 * The questions step's items: the category's questions in order, then the
 * ticket's urgency and description.
 */
export const questionItems = (fields: RequestField[]): QuestionItem[] => [
  ...fields.map(field => ({ kind: 'field' as const, field })),
  { kind: 'urgency' },
  { kind: 'description' },
];

/** A grouped MultiSelect: some option sits under another. */
export const isGrouped = (field: RequestField): boolean =>
  field.options.some(o => !!o.parentOptionId);

/** Spans the full width of the two column grid. */
export const isFullWidth = (item: QuestionItem): boolean =>
  item.kind === 'description' ||
  (item.kind === 'field' &&
    (item.field.fieldType === 'MultilineText' ||
      item.field.fieldType === 'MultiSelect' ||
      item.field.fieldType === 'Asset'));

/**
 * Splits the questions into pages that fit on one screen.
 *
 * The longest category asks ten questions, which is taller than a modal can be
 * on a laptop. The alternative to paging is an inner scrollbar, and a
 * scrollable dialog hides its own Continue button below the fold, which is the
 * one control the user is looking for.
 *
 * Items are weighted rather than counted because they are not the same height:
 * a grouped checklist is several times a text input, and a textarea is about
 * two. BUDGET is the number of single line fields that fit comfortably in the
 * dialog body at the smallest viewport we target.
 */
const weightOf = (item: QuestionItem): number => {
  if (item.kind === 'description') return 2;
  if (item.kind === 'urgency') return 1;
  const { field } = item;
  if (field.fieldType === 'MultilineText') return 2;
  if (field.fieldType === 'MultiSelect') return isGrouped(field) ? 5 : 2;
  // One search box. Chosen vehicles wrap beneath it as chips, which a page can
  // absorb; weighting it higher would push questions onto extra pages.
  return 1;
};

const BUDGET = 4;

export const paginate = (items: QuestionItem[]): QuestionItem[][] => {
  const pages: QuestionItem[][] = [];
  let page: QuestionItem[] = [];
  let used = 0;

  for (const item of items) {
    const weight = weightOf(item);
    // An item heavier than the whole budget still gets its own page rather
    // than being dropped: one oversized page beats a missing question.
    if (page.length > 0 && used + weight > BUDGET) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(item);
    used += weight;
  }
  if (page.length > 0) pages.push(page);
  return pages;
};

/** The answers as `customFieldValues`: only the answered ones. */
export const toCustomFieldValues = (
  fields: RequestField[],
  answers: Answers,
): CustomFieldAnswer[] =>
  fields.flatMap((field): CustomFieldAnswer[] => {
    const value = answers[field.id];
    if (!isAnswered(field, value)) return [];
    const customFieldDefinitionId = field.id;
    switch (field.fieldType) {
      case 'Asset':
        return [
          {
            customFieldDefinitionId,
            selectedAssets: (value as PickedAsset[]).map(a => ({
              assetId: a.assetId,
              label: a.label,
            })),
          },
        ];
      case 'MultiSelect':
        return [
          { customFieldDefinitionId, selectedOptionIds: value as string[] },
        ];
      case 'Dropdown':
        return [{ customFieldDefinitionId, selectedOptionId: value as string }];
      case 'Checkbox':
        return [{ customFieldDefinitionId, booleanValue: value as boolean }];
      case 'Number':
        return [{ customFieldDefinitionId, numericValue: Number(value) }];
      case 'Date':
        return [{ customFieldDefinitionId, dateValue: value as string }];
      default:
        return [
          { customFieldDefinitionId, stringValue: (value as string).trim() },
        ];
    }
  });

/** An answer as it reads: option labels, a DD/MM/YYYY date, vehicle labels. */
export const displayAnswer = (
  field: RequestField,
  value: AnswerValue,
): string => {
  const optionLabel = (id: string) =>
    field.options.find(o => o.id === id)?.value ?? id;
  switch (field.fieldType) {
    case 'Asset':
      return (value as PickedAsset[]).map(a => a.label).join(', ');
    case 'MultiSelect':
      return (value as string[]).map(optionLabel).join(', ');
    case 'Dropdown':
      return optionLabel(value as string);
    case 'Checkbox':
      return value ? 'Yes' : 'No';
    case 'Date':
      return formatDate(String(value ?? ''), { emptyLabel: '' });
    default:
      return String(value ?? '').trim();
  }
};

/** The answered questions, labelled, for the review step. */
export const answerRows = (
  fields: RequestField[],
  answers: Answers,
): Array<{ id: string; label: string; value: string }> =>
  fields
    .filter(f => isAnswered(f, answers[f.id]))
    .map(f => ({
      id: f.id,
      label: f.name,
      value: displayAnswer(f, answers[f.id]),
    }));

/** Every vehicle picked across the asset questions, once each. */
export const pickedAssetsOf = (
  fields: RequestField[],
  answers: Answers,
): PickedAsset[] => {
  const seen = new Map<string, PickedAsset>();
  for (const field of fields) {
    if (field.fieldType !== 'Asset') continue;
    const picked = answers[field.id];
    if (!Array.isArray(picked)) continue;
    for (const asset of picked as PickedAsset[]) seen.set(asset.assetId, asset);
  }
  return [...seen.values()];
};
