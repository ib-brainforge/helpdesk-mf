import type { HelpdeskApplicationCustomFieldsModelsCustomFieldValueDto as TicketFieldValue } from '@brainforgeau/helpdesk-client';

/** How an answer reads: picked vehicles by name, otherwise the API's display value. */
export const answerText = (value: TicketFieldValue): string => {
  if (value.selectedAssets?.length) {
    return value.selectedAssets.map(a => a.label ?? '').join(', ');
  }
  if (value.fieldType === 'Checkbox') {
    if (value.booleanValue == null) return '';
    return value.booleanValue ? 'Yes' : 'No';
  }
  return value.displayValue ?? value.stringValue ?? '';
};
