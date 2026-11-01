import { describe, expect, it } from 'vitest';
import type { RequestField } from './request-fields';
import {
  answerRows,
  missingRequired,
  paginate,
  pickedAssetsOf,
  questionItems,
  toCustomFieldValues,
  toRequestField,
  urgencyToPriority,
} from './request-fields';

const vehicles: RequestField = {
  id: 'f-veh',
  name: 'Choose vehicle(s)',
  fieldType: 'Asset',
  isRequired: true,
  options: [],
};
const symptoms: RequestField = {
  id: 'f-sym',
  name: 'What are the symptoms?',
  fieldType: 'Dropdown',
  isRequired: true,
  options: [
    { id: 'o-none', value: 'No position' },
    { id: 'o-int', value: 'Intermittent' },
  ],
};
const hardware: RequestField = {
  id: 'f-hw',
  name: 'Hardware',
  fieldType: 'MultiSelect',
  isRequired: true,
  options: [
    { id: 'o-gps', value: 'GPS Tracker' },
    { id: 'o-bb', value: 'Black Box' },
    { id: 'o-can', value: 'CANBUS', parentOptionId: 'o-bb' },
  ],
};
const date: RequestField = {
  id: 'f-date',
  name: 'Preferred install date',
  fieldType: 'Date',
  isRequired: false,
  options: [],
};
const po: RequestField = {
  id: 'f-po',
  name: 'Purchase order',
  fieldType: 'Text',
  isRequired: true,
  options: [],
};

describe('missingRequired', () => {
  it('lists required questions without an answer, blank text and empty picks included', () => {
    const missing = missingRequired([vehicles, symptoms, hardware, date, po], {
      'f-veh': [],
      'f-sym': 'o-int',
      'f-po': '   ',
    });
    expect(missing.map(f => f.id)).toEqual(['f-veh', 'f-hw', 'f-po']);
  });
});

describe('toCustomFieldValues', () => {
  it('sends each answered question in the property its type takes', () => {
    const values = toCustomFieldValues(
      [vehicles, symptoms, hardware, date, po],
      {
        'f-veh': [{ assetId: 'a-1', label: 'Truck 12' }],
        'f-sym': 'o-int',
        'f-hw': ['o-bb', 'o-can'],
        'f-date': '2026-12-01',
        'f-po': ' PO-77 ',
      },
    );
    expect(values).toEqual([
      {
        customFieldDefinitionId: 'f-veh',
        selectedAssets: [{ assetId: 'a-1', label: 'Truck 12' }],
      },
      { customFieldDefinitionId: 'f-sym', selectedOptionId: 'o-int' },
      { customFieldDefinitionId: 'f-hw', selectedOptionIds: ['o-bb', 'o-can'] },
      { customFieldDefinitionId: 'f-date', dateValue: '2026-12-01' },
      { customFieldDefinitionId: 'f-po', stringValue: 'PO-77' },
    ]);
  });

  it('sends numbers, ticked boxes and long text in their own properties', () => {
    const fields: RequestField[] = [
      {
        id: 'n',
        name: 'Odometer',
        fieldType: 'Number',
        isRequired: false,
        options: [],
      },
      {
        id: 'c',
        name: 'Consent',
        fieldType: 'Checkbox',
        isRequired: true,
        options: [],
      },
      {
        id: 'm',
        name: 'Notes',
        fieldType: 'MultilineText',
        isRequired: false,
        options: [],
      },
      {
        id: 'e',
        name: 'Email',
        fieldType: 'Email',
        isRequired: false,
        options: [],
      },
    ];
    expect(
      toCustomFieldValues(fields, {
        n: '0',
        c: true,
        m: 'Line 1\nLine 2',
        e: 'a@b.co',
      }),
    ).toEqual([
      { customFieldDefinitionId: 'n', numericValue: 0 },
      { customFieldDefinitionId: 'c', booleanValue: true },
      { customFieldDefinitionId: 'm', stringValue: 'Line 1\nLine 2' },
      { customFieldDefinitionId: 'e', stringValue: 'a@b.co' },
    ]);
    expect(missingRequired(fields, { c: false }).map(f => f.id)).toEqual(['c']);
  });

  it('leaves unanswered questions out', () => {
    expect(toCustomFieldValues([symptoms, date], { 'f-sym': '' })).toEqual([]);
  });
});

describe('answerRows', () => {
  it('reads options by label, dates as DD/MM/YYYY and vehicles by name', () => {
    const rows = answerRows([vehicles, symptoms, hardware, date], {
      'f-veh': [
        { assetId: 'a-1', label: 'Truck 12' },
        { assetId: 'a-2', label: 'Truck 14' },
      ],
      'f-sym': 'o-none',
      'f-hw': ['o-bb', 'o-can'],
      'f-date': '2026-12-01',
    });
    expect(rows.map(r => r.value)).toEqual([
      'Truck 12, Truck 14',
      'No position',
      'Black Box, CANBUS',
      '01/12/2026',
    ]);
  });
});

describe('pickedAssetsOf', () => {
  it('collects the vehicles picked across asset questions once each', () => {
    const other = { ...vehicles, id: 'f-veh2' };
    const picked = pickedAssetsOf([vehicles, other, symptoms], {
      'f-veh': [{ assetId: 'a-1', label: 'Truck 12' }],
      'f-veh2': [
        { assetId: 'a-1', label: 'Truck 12' },
        { assetId: 'a-3', label: 'Trailer 3' },
      ],
    });
    expect(picked.map(a => a.assetId)).toEqual(['a-1', 'a-3']);
  });
});

describe('questionItems and paginate', () => {
  it("ends with the ticket's urgency and description, and keeps pages within the budget", () => {
    const items = questionItems([vehicles, symptoms, hardware, po]);
    expect(items.map(i => i.kind)).toEqual([
      'field',
      'field',
      'field',
      'field',
      'urgency',
      'description',
    ]);
    const pages = paginate(items);
    // vehicles + symptoms | grouped hardware alone | po + urgency + description
    expect(pages.map(p => p.length)).toEqual([2, 1, 3]);
  });

  it('gives a category with no questions one page of its own two', () => {
    expect(paginate(questionItems([])).map(p => p.map(i => i.kind))).toEqual([
      ['urgency', 'description'],
    ]);
  });
});

describe('urgencyToPriority', () => {
  it('files Medium at Normal and nothing chosen at Normal', () => {
    expect(urgencyToPriority('Medium')).toBe('Normal');
    expect(urgencyToPriority('Critical')).toBe('Critical');
    expect(urgencyToPriority(undefined)).toBe('Normal');
  });
});

describe('toRequestField', () => {
  it('skips a question without an id', () => {
    expect(toRequestField({ name: 'No id', fieldType: 'Text' })).toEqual([]);
  });

  it('fills the defaults', () => {
    expect(toRequestField({ id: 'f1' })).toEqual([
      {
        id: 'f1',
        name: '',
        description: undefined,
        fieldType: 'Text',
        isRequired: false,
        options: [],
      },
    ]);
  });

  it('keeps what the API sent', () => {
    expect(
      toRequestField({
        id: 'f1',
        name: 'Site',
        description: 'Where?',
        fieldType: 'Dropdown',
        isRequired: true,
      }),
    ).toEqual([
      {
        id: 'f1',
        name: 'Site',
        description: 'Where?',
        fieldType: 'Dropdown',
        isRequired: true,
        options: [],
      },
    ]);
  });

  it('drops an option without an id and passes parentOptionId through', () => {
    const [field] = toRequestField({
      id: 'f1',
      fieldType: 'MultiSelect',
      options: [
        { value: 'No id' },
        { id: 'o1', value: 'Top' },
        { id: 'o2', value: 'Child', parentOptionId: 'o1' },
      ],
    });
    expect(field?.options).toEqual([
      { id: 'o1', value: 'Top', parentOptionId: undefined },
      { id: 'o2', value: 'Child', parentOptionId: 'o1' },
    ]);
  });
});
