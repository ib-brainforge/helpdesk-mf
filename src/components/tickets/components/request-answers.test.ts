import { describe, expect, it } from 'vitest';
import { answerText } from './request-answers';

describe('answerText', () => {
  it('reads picked vehicles by their labels', () => {
    expect(
      answerText({
        customFieldDefinitionId: 'f',
        fieldName: 'Choose vehicle(s)',
        fieldType: 'Asset',
        displayValue: 'Truck 12, Truck 14',
        selectedAssets: [
          { assetId: 'a', label: 'Truck 12' },
          { assetId: 'b', label: 'Truck 14' },
        ],
      }),
    ).toBe('Truck 12, Truck 14');
  });

  it("uses the API's display value for options and text", () => {
    expect(
      answerText({
        customFieldDefinitionId: 'f',
        fieldName: 'Hardware',
        fieldType: 'MultiSelect',
        displayValue: 'Black Box, CANBUS',
      }),
    ).toBe('Black Box, CANBUS');
  });
});
