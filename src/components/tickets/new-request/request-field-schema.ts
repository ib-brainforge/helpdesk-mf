/**
 * The questions asked when raising a request, by category.
 *
 * WHY THESE LIVE IN CODE
 * The platform already models category-driven questions in the database
 * (CustomFieldDefinition, CategoryCustomField, CustomFieldOption,
 * CustomFieldValue) and can write them with SetBulkCustomFieldValues. That
 * route was deliberately not taken here: it needs every question seeded as a
 * row before the form can ask it. This map ships the Netcorp intake questions
 * without that groundwork, at the cost of a deploy whenever they change.
 *
 * The consequence to know about: a hard-coded field has no
 * CustomFieldDefinitionId, and SetBulkCustomFieldValues requires one. The
 * answers therefore cannot be stored as structured values, and are folded into
 * the ticket description instead (see formatAnswers.ts). They are readable but
 * not filterable or reportable. Moving a question into the database later is
 * the upgrade path, and the renderer is shaped to make that a swap of the
 * source rather than a rewrite.
 */

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'select'
  | 'date'
  | 'checklist'
  /** Vehicles and other assets, searched live in the Asset app. */
  | 'asset';

export interface FieldSpec {
  /** Stable key. Used as the answer's key and must not change casually: it is what a saved draft and the description block are keyed by. */
  key: string;
  label: string;
  kind: FieldKind;
  /** select only. The first entry is treated as the empty prompt, not an answer. */
  options?: string[];
  placeholder?: string;
  /** Spans the full width of the two column grid. */
  full?: boolean;
  /** checklist only. A group may stand alone or carry child items. */
  groups?: Array<{ name: string; items?: string[] }>;
}

export interface CategorySpec {
  key: string;
  label: string;
  /** Heroicons name shown on the category card. */
  icon: string;
  /** One line under the label on the category card: what this is for. */
  summary: string;
  /** Shown above the questions. Used for the pre-logging reminders. */
  note?: string;
  /** Section heading, for categories that read as a booking rather than a fault. */
  section?: string;
  fields: FieldSpec[];
}

// Shared question blocks. Defined once because they recur across categories and
// drifted copies would make two categories ask subtly different questions.
const urgency: FieldSpec = {
  key: 'urgency',
  label: 'Urgency',
  kind: 'select',
  options: ['Select', 'Low', 'Medium', 'High', 'Critical'],
};

/**
 * The requester's real vehicles, searched in the Asset app rather than a
 * fixed list. This used to offer 'Truck 01', 'Truck 02' and 'Trailer A', which
 * were placeholders: no requester owns them, so every answer was either wrong
 * or meaningless to whoever picked the ticket up.
 */
const vehicles: FieldSpec = {
  key: 'vehicles',
  label: 'Choose vehicle(s)',
  kind: 'asset',
  placeholder: 'Search by name or registration',
};

const preferredTime: FieldSpec = {
  key: 'preferredTime',
  label: 'If service is required, preferred time of day?',
  kind: 'select',
  options: ['Select', 'Morning', 'Afternoon'],
};

const recentService: FieldSpec = {
  key: 'recentService',
  label: 'Recent service or repair that may affect Netcorp hardware?',
  kind: 'select',
  options: ['Select', 'Yes', 'No'],
};

const comms: FieldSpec = {
  key: 'comms',
  label: 'Is the vehicle in an area it can communicate effectively?',
  kind: 'select',
  options: ['Select', 'Yes', 'No', 'Unsure'],
};

const lastActive: FieldSpec = {
  key: 'lastActive',
  label: 'The asset was active in the last',
  kind: 'select',
  options: ['Select', '24 hours', '7 days', '30 days', 'Over 30 days'],
};

const description = (placeholder?: string): FieldSpec => ({
  key: 'details',
  label: 'Description of issue',
  kind: 'textarea',
  full: true,
  placeholder,
});

/**
 * Asked before a fault is logged, because both answers routinely resolve the
 * fault without a ticket and the answer is needed for diagnosis either way.
 */
const PRE_LOG_REMINDER =
  "Before logging, please refresh your browser and run a tracking report for the vehicle's known activity to help diagnose the issue.";

const hardwareChecklist: FieldSpec = {
  key: 'hardware',
  label: 'Hardware',
  kind: 'checklist',
  full: true,
  groups: [
    { name: 'GPS Tracker' },
    { name: 'Tablet Cradle' },
    {
      name: 'Black Box',
      items: [
        'CANBUS',
        'Barrel Sensor',
        'Scales Truck',
        'Scales Trailer',
        'Scales Display',
      ],
    },
    {
      name: 'Dashcam',
      items: ['Dashcam Front', 'MDVR Front', 'MDVR FR', 'MDVR FRS'],
    },
  ],
};

const scheduleFields = (dateLabel: string): FieldSpec[] => [
  { key: 'preferredDate', label: dateLabel, kind: 'date' },
  {
    key: 'preferredSlot',
    label: 'Preferred time',
    kind: 'select',
    options: ['Select', '9:30 AM', '12:00 PM', '2:00 PM'],
  },
  { key: 'address', label: 'Address', kind: 'text', full: true },
];

/** Requests handled by Netcorp. These are the standard categories Netcorp provides. */
export const NETCORP_CATEGORIES: CategorySpec[] = [
  {
    key: 'vehicle',
    label: "Issue with a vehicle's GPS tracking hardware or ability to track",
    icon: 'TruckIcon',
    summary: 'A tracker is offline, misreporting or not tracking.',
    note: PRE_LOG_REMINDER,
    fields: [
      vehicles,
      {
        key: 'symptoms',
        label: 'What are the symptoms?',
        kind: 'select',
        options: ['Select', 'No position', 'Intermittent', 'Wrong location'],
      },
      {
        key: 'historicalReport',
        label: 'Historical report: is the vehicle showing activity?',
        kind: 'select',
        options: ['Select', 'Yes', 'No'],
      },
      urgency,
      comms,
      lastActive,
      {
        key: 'installedWhen',
        label: 'When was the device installed?',
        kind: 'select',
        options: [
          'Select',
          'Under 1 month',
          '1-6 months',
          '6-12 months',
          'Over 12 months',
        ],
      },
      recentService,
      preferredTime,
      description(),
    ],
  },
  {
    key: 'system',
    label: 'Problems with the web interface or portal',
    icon: 'ComputerDesktopIcon',
    summary: 'Something in the portal is broken or not loading.',
    note: PRE_LOG_REMINDER,
    fields: [
      {
        key: 'area',
        label: 'What area of the platform are you having problems with?',
        kind: 'select',
        options: ['Select', 'Live map', 'Reports', 'Login', 'Alerts', 'Other'],
      },
      urgency,
      comms,
      lastActive,
      {
        key: 'fleetWork',
        label: 'Any work done on fleet vehicles that may affect the install?',
        kind: 'select',
        options: ['Select', 'Yes', 'No'],
      },
      description(),
    ],
  },
  {
    key: 'hardware',
    label: 'Hardware related repair',
    icon: 'WrenchScrewdriverIcon',
    summary: 'Installed equipment needs repairing.',
    fields: [vehicles, urgency, preferredTime, recentService, description()],
  },
  {
    key: 'maintenance',
    label: 'Maintenance or update',
    icon: 'ArrowPathIcon',
    summary: 'Scheduled servicing or a firmware update.',
    fields: [vehicles, urgency, preferredTime, recentService, description()],
  },
  {
    key: 'install',
    label: 'New installation or onsite service',
    icon: 'WrenchIcon',
    summary: 'Fit new equipment or book a technician on site.',
    section: 'New installation or onsite service',
    fields: [
      { key: 'additional', label: 'Additional information', kind: 'text' },
      { key: 'purchaseOrder', label: 'Purchase order', kind: 'text' },
      ...scheduleFields('Preferred install date'),
      hardwareChecklist,
    ],
  },
  {
    key: 'removal',
    label: 'Device or hardware removal',
    icon: 'ArchiveBoxXMarkIcon',
    summary: 'Take a device or hardware out of a vehicle.',
    section: 'Device or hardware removal',
    fields: [
      ...scheduleFields('Preferred removal date'),
      hardwareChecklist,
      vehicles,
      { key: 'purchaseOrder', label: 'Purchase order', kind: 'text' },
      { key: 'additional', label: 'Additional information', kind: 'text' },
      {
        key: 'keepHistory',
        label: "Save the vehicle's history on our platform? (charges apply)",
        kind: 'select',
        options: ['Select', 'Yes', 'No'],
      },
    ],
  },
  {
    key: 'account',
    label: 'Accounts or sales enquiry',
    icon: 'BanknotesIcon',
    summary: 'Billing, your account, or a sales question.',
    fields: [
      {
        key: 'accountTopic',
        label: 'Is your issue related to',
        kind: 'select',
        options: ['Select', 'Billing', 'Subscription', 'Sales', 'Other'],
      },
      {
        key: 'firstTime',
        label: 'Is this your first time logging this request?',
        kind: 'select',
        options: ['Select', 'Yes', 'No'],
      },
      urgency,
      description(),
    ],
  },
  {
    key: 'health',
    label: 'Health check',
    icon: 'HeartIcon',
    summary: "Check a vehicle's installed equipment is healthy.",
    fields: [
      vehicles,
      urgency,
      preferredTime,
      recentService,
      { ...description(), label: 'Additional note' },
    ],
  },
  {
    key: 'obm',
    label: 'OBM calibration or maintenance',
    icon: 'ScaleIcon',
    summary: 'Calibrate or service on-board mass equipment.',
    fields: [
      vehicles,
      urgency,
      preferredTime,
      recentService,
      { ...description(), label: 'Additional note' },
    ],
  },
  {
    key: 'other',
    label: 'Problem with apps or something else',
    icon: 'QuestionMarkCircleIcon',
    summary: 'App problems, or anything not listed here.',
    section: 'Tell us in your own words',
    note: 'Not sure which category fits? Describe the problem here and our team will route it.',
    fields: [
      urgency,
      {
        ...description(
          "Tell us what's happening, what you expected, and any steps to reproduce it.",
        ),
        label: 'Describe the problem',
      },
    ],
  },
];

/**
 * Every request goes to Netcorp. There is no internal lane and no platform
 * lane: the product rule is a two way conversation between the client and
 * Netcorp, so a request has exactly one destination and the form does not ask.
 */
export const REQUEST_CATEGORIES = NETCORP_CATEGORIES;

/**
 * Which helpdesk category each request type is filed under, as names to try in
 * order.
 *
 * WHY THIS EXISTS
 * The request types above are defined in code, but a ticket must carry a real
 * Category row: the create command rejects one without. They were matched by
 * their own label, and when that failed the wizard took whichever category came
 * first. Neither dev nor local has categories named after these request types,
 * so every request was quietly filed under one arbitrary category ("fnfnf" on
 * dev, "Building Maintenance" locally).
 *
 * HOW IT RESOLVES
 * The request type's own label is always tried first, so creating a category
 * with exactly that name takes over with no code change. After it come the
 * closest general categories: the "... and ..." names are dev's, the
 * "... Issues" names are the local seed's. If none of them exists the wizard
 * says so and does not submit, rather than guessing.
 */
export const CATEGORY_NAME_CANDIDATES: Record<string, string[]> = {
  vehicle: ['Hardware and Devices', 'Hardware Issues'],
  system: ['Software and Applications', 'Software Issues'],
  hardware: ['Hardware and Devices', 'Hardware Issues'],
  maintenance: ['Hardware and Devices', 'Hardware Issues'],
  install: ['Hardware and Devices', 'Hardware Issues'],
  removal: ['Hardware and Devices', 'Hardware Issues'],
  account: ['Billing and Licensing', 'Accounts and Access', 'Access Requests'],
  health: ['Hardware and Devices', 'Hardware Issues'],
  obm: ['Hardware and Devices', 'Hardware Issues'],
  other: ['Software and Applications', 'Software Issues'],
};

const normaliseName = (name: string | null | undefined) =>
  (name ?? '').trim().toLowerCase();

/**
 * The real category a request type is filed under, or undefined when none of
 * its candidate names exists for this requester. Never a guess.
 */
export const resolveRequestCategory = <
  C extends { id?: string | null; name?: string | null },
>(
  spec: CategorySpec,
  available: C[] | undefined,
): C | undefined => {
  const byName = new Map(
    (available ?? []).map(c => [normaliseName(c.name), c] as const),
  );
  for (const name of [
    spec.label,
    ...(CATEGORY_NAME_CANDIDATES[spec.key] ?? []),
  ]) {
    const match = byName.get(normaliseName(name));
    if (match?.id) return match;
  }
  return undefined;
};

/**
 * Answer values. A checklist answer is the list of ticked labels; an asset
 * answer is the list of chosen vehicles' labels, as they read in the ticket.
 */
export type AnswerValue = string | string[] | undefined;
export type Answers = Record<string, AnswerValue>;

/** The prompt entry of a select is a placeholder, never a real answer. */
export const isAnswered = (spec: FieldSpec, value: AnswerValue): boolean => {
  if (spec.kind === 'checklist' || spec.kind === 'asset')
    return Array.isArray(value) && value.length > 0;
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (spec.kind === 'select' && trimmed === 'Select') return false;
  return true;
};

/**
 * Every question must be answered.
 *
 * There is no optional question in this form, by design. The whole reason for
 * asking category specific questions is to arrive at a ticket an agent can act
 * on without a round trip, and an optional field is the one nobody fills in.
 * A question that is not worth insisting on is a question worth deleting.
 *
 * The practical consequence: adding a question to a category makes it
 * mandatory for everyone raising that kind of request. That is the intended
 * cost, and the reason the lists are short.
 */
export const missingRequired = (
  fields: FieldSpec[],
  answers: Answers,
): FieldSpec[] => fields.filter(f => !isAnswered(f, answers[f.key]));

/**
 * Splits a category's questions into pages that fit on one screen.
 *
 * The longest category asks eleven questions, which is taller than a modal can
 * be on a laptop. The alternative to paging is an inner scrollbar, and a
 * scrollable dialog hides its own Continue button below the fold, which is the
 * one control the user is looking for.
 *
 * Fields are weighted rather than counted because they are not the same height:
 * a checklist of four groups with children is several times a text input, and a
 * textarea is about two. BUDGET is the number of single line fields that fit
 * comfortably in the dialog body at the smallest viewport we target, with the
 * step rail and buttons already accounted for.
 */
const FIELD_WEIGHT: Record<FieldKind, number> = {
  text: 1,
  select: 1,
  date: 1,
  textarea: 2,
  checklist: 5,
  // One search box. Chosen vehicles wrap beneath it as chips, which a page can
  // absorb; weighting it higher would push questions onto extra pages.
  asset: 1,
};

const BUDGET = 4;

export const paginateFields = (fields: FieldSpec[]): FieldSpec[][] => {
  const pages: FieldSpec[][] = [];
  let page: FieldSpec[] = [];
  let used = 0;

  for (const field of fields) {
    const weight = FIELD_WEIGHT[field.kind] ?? 1;
    // A field heavier than the whole budget still gets its own page rather than
    // being dropped: one oversized page beats a missing question.
    if (page.length > 0 && used + weight > BUDGET) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(field);
    used += weight;
  }
  if (page.length > 0) pages.push(page);
  return pages;
};
