import { BaseButton, BaseInput } from '@brainforgeau/components';
import { useAuth } from '@brainforgeau/security';
import { type FC, useMemo, useState } from 'react';
import { useCreateTicket, useLinkAsset } from '../hooks/useTickets';
import type { PickedAsset } from './AssetPicker';
import { RequestFieldRenderer } from './RequestFieldRenderer';
import { buildDescription, urgencyToPriority } from './formatAnswers';
import {
  type Answers,
  type CategorySpec,
  REQUEST_CATEGORIES,
  missingRequired,
  paginateFields,
  resolveRequestCategory,
} from './request-field-schema';
import { useRequestCategories } from './useRequestCategories';

/**
 * Raising a request, as a wizard.
 *
 * WHY A WIZARD RATHER THAN ONE FORM
 * The questions depend on the chosen category, so a single form either shows
 * every category's questions at once (most of them irrelevant) or shifts under
 * the user as they choose. Stepping means each screen asks one thing and the
 * branching happens between screens instead of inside one.
 *
 * ONE DESTINATION
 * Every request goes to Netcorp. The form does not ask, because there is no
 * other answer: the product rule is a two way conversation between the client
 * and Netcorp, so neither an internal lane nor the platform lane (BrainForge
 * engineering, Audience=Platform) belongs here. A third party in the thread
 * breaks the model.
 */

type StepId = 'category' | 'details' | 'questions' | 'review';

const normalise = (name: string) => name.trim().toLowerCase();

/**
 * A failed create, in words the requester can act on.
 *
 * The API answers a rejected request with a ProblemDetails body: field errors
 * under `errors`, otherwise a `detail` or `title`. Those are shown as they come,
 * since they name the actual problem ("Category is required"). With no
 * response at all the request never reached the server.
 */
const describeCreateError = (error: unknown): string => {
  const response = (
    error as { response?: { status?: number; data?: unknown } } | undefined
  )?.response;
  if (!response) {
    return "Your request wasn't sent: Helpdesk couldn't be reached. Check your connection and try again.";
  }
  const data = response.data as
    | { errors?: Record<string, unknown>; detail?: string; title?: string }
    | string
    | undefined;
  const fieldErrors =
    data && typeof data === 'object' && data.errors
      ? Object.values(data.errors)
          .flat()
          .filter((m): m is string => typeof m === 'string')
      : [];
  const reason =
    fieldErrors.join(' ') ||
    (typeof data === 'object' ? data?.detail || data?.title : data) ||
    'Please try again.';
  return `Your request wasn't created (error ${response.status ?? 'unknown'}). ${reason}`;
};

const STEPS: Array<{ id: StepId; title: string }> = [
  { id: 'category', title: 'Category' },
  { id: 'details', title: 'Details' },
  { id: 'questions', title: 'Questions' },
  { id: 'review', title: 'Review' },
];

interface Props {
  onCreated?: (ticketId: string) => void;
  onCancel?: () => void;
}

export const NewRequestWizard: FC<Props> = ({ onCreated, onCancel }) => {
  const { user } = useAuth();
  const createTicket = useCreateTicket();
  const linkAsset = useLinkAsset();
  const { categories, isLoading: categoriesLoading } = useRequestCategories();
  // Why the last create failed, shown on the review step. Cleared as soon as
  // the requester moves, so a stale message never sits over a fixed form.
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Covers the vehicle links made after the ticket exists, so Create cannot be
  // pressed a second time while they finish.
  const [isFinishing, setIsFinishing] = useState(false);
  const isBusy = createTicket.isPending || isFinishing;

  const [stepIndex, setStepIndex] = useState(0);
  const [categoryKey, setCategoryKey] = useState<string>('');
  const [answers, setAnswers] = useState<Answers>({});
  // Chosen vehicles per asset question, as objects. `answers` keeps only their
  // labels, which is what the description shows; these keep the ids needed to
  // link them to the ticket once it exists.
  const [pickedAssets, setPickedAssets] = useState<
    Record<string, PickedAsset[]>
  >({});
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  // Which page of the questions step is showing. Long categories are paged so
  // the dialog never needs to scroll.
  const [questionPage, setQuestionPage] = useState(0);

  const profile = (user?.profile ?? {}) as Record<string, unknown>;
  const contactName = (profile.name as string) ?? '';
  const contactEmail = (profile.email as string) ?? '';

  const category: CategorySpec | undefined = useMemo(
    () => REQUEST_CATEGORIES.find(c => c.key === categoryKey),
    [categoryKey],
  );

  const step = STEPS[stepIndex];

  const questionPages = useMemo(
    () => (category ? paginateFields(category.fields) : []),
    [category],
  );
  const currentQuestions = questionPages[questionPage] ?? [];
  const isLastQuestionPage = questionPage >= questionPages.length - 1;

  /*
   * The real category this request is filed under. See
   * CATEGORY_NAME_CANDIDATES for how it is chosen. There is no fallback to
   * "the first category": that filed every request somewhere arbitrary.
   * Undefined means none of the candidates exists for this requester, and the
   * review step says so instead of submitting.
   *
   * This is the seam that disappears once the questions themselves are
   * configured in the database rather than listed here.
   */
  const resolvedCategory = useMemo(
    () => (category ? resolveRequestCategory(category, categories) : undefined),
    [category, categories],
  );
  const resolvedCategoryId = resolvedCategory?.id ?? undefined;

  const canAdvance = (): boolean => {
    if (step.id === 'category') return !!category;
    if (step.id === 'details') {
      // Phone and location are required like every other question: the point of
      // the form is to arrive at something actionable without a round trip.
      // Name and email are not checked because they come from the account and
      // are read only.
      return (
        subject.trim().length > 0 &&
        phone.trim().length > 0 &&
        location.trim().length > 0
      );
    }
    if (step.id === 'questions') {
      return missingRequired(currentQuestions, answers).length === 0;
    }
    return true;
  };

  const next = () => {
    setSubmitError(null);
    if (!canAdvance()) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (step.id === 'questions' && !isLastQuestionPage) {
      setQuestionPage(p => p + 1);
      return;
    }
    // Entering the questions step always starts at its first page, including
    // after the category was changed and the pages are different ones.
    if (STEPS[stepIndex + 1]?.id === 'questions') setQuestionPage(0);
    setStepIndex(i => Math.min(i + 1, STEPS.length - 1));
  };

  const back = () => {
    setShowErrors(false);
    setSubmitError(null);
    if (step.id === 'questions' && questionPage > 0) {
      setQuestionPage(p => p - 1);
      return;
    }
    if (STEPS[stepIndex - 1]?.id === 'questions') {
      setQuestionPage(Math.max(questionPages.length - 1, 0));
    }
    setStepIndex(i => Math.max(i - 1, 0));
  };

  const submit = () => {
    if (!category || !resolvedCategoryId) return;
    setSubmitError(null);
    createTicket.mutate(
      {
        subject: subject.trim(),
        description: buildDescription({
          category,
          answers,
          contact: {
            location,
            name: contactName,
            phone,
            email: contactEmail,
          },
        }),
        priority: urgencyToPriority(answers.urgency),
        categoryId: resolvedCategoryId,
      },
      {
        onSuccess: async id => {
          setIsFinishing(true);
          try {
            await linkPickedAssets(String(id));
          } finally {
            setIsFinishing(false);
          }
          onCreated?.(String(id));
        },
        // The dialog stays open with everything as entered, so the requester
        // can fix the cause and press Create again rather than start over.
        onError: error => setSubmitError(describeCreateError(error)),
      },
    );
  };

  /*
   * Links each chosen vehicle to the new ticket, so it shows under the ticket's
   * linked assets rather than only as a name in the description. The picker
   * lists Asset app records, so every chosen vehicle has an id to link.
   *
   * Best effort, and deliberately so: the ticket already exists and already
   * names every vehicle, so a link that fails (for example a requester without
   * permission to edit links) loses nothing the agent needs. Failing the whole
   * request over it would be worse.
   */
  const linkPickedAssets = async (ticketId: string) => {
    const assetIds = [
      ...new Set(
        Object.values(pickedAssets)
          .flat()
          .map(a => a.assetId)
          .filter((x): x is string => !!x),
      ),
    ];
    const results = await Promise.allSettled(
      assetIds.map(assetId => linkAsset.mutateAsync({ ticketId, assetId })),
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(
        `New request ${ticketId}: ${failed} of ${assetIds.length} vehicle links failed; the vehicles are still named in the description.`,
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl pb-6">
      {/*
        Progress reads as one bar that fills, with the step names beneath it,
        matching the Create Asset wizard in the sibling app. Numbered circles
        were a different dialect of the same idea; sharing the pattern means a
        user who has met one wizard already knows how far through they are.
      */}
      <div className="mb-6 flex justify-center">
        <ol className="flex w-full max-w-md items-start">
          {STEPS.map((s, i) => {
            const reached = i <= stepIndex;
            return (
              <li key={s.id} className="flex flex-1 flex-col items-center">
                <span
                  className={
                    reached
                      ? 'bg-blue h-1 w-full rounded-full'
                      : 'bg-light mt-[3px] h-1.5 w-1.5 rounded-full'
                  }
                />
                <span
                  className={`mt-2 text-[13px] ${
                    i === stepIndex
                      ? 'text-blue font-medium'
                      : 'text-light-gray'
                  }`}
                >
                  {s.title}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="min-h-[240px]">
        {step.id === 'category' && (
          <div>
            <p className="mb-0.5 text-[15px] font-semibold">
              What is your request about?
            </p>
            <p className="text-light-gray mb-3 text-[13px]">
              Pick a category. The questions on the next steps are tailored to
              your choice.
            </p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {REQUEST_CATEGORIES.map(c => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    setCategoryKey(c.key);
                    setAnswers({});
                    setPickedAssets({});
                    setQuestionPage(0);
                  }}
                  className={`block h-full w-full rounded-lg border p-2 text-left text-[13px] leading-snug transition-colors ${
                    categoryKey === c.key
                      ? 'border-blue bg-lighter-blue'
                      : 'border-light hover:border-light-gray'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {showErrors && !category && (
              <p className="text-red-dark mt-2 text-sm">Choose a category.</p>
            )}
          </div>
        )}

        {step.id === 'details' && (
          <div>
            <p className="mb-0.5 text-[15px] font-semibold">
              Tell us who and where
            </p>
            <p className="text-light-gray mb-3 text-[13px]">
              Your name and email come from your account. The rest helps us
              reach you and find the site.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <BaseInput
                  label="Subject"
                  isRequired
                  placeholder="Short summary of your request"
                  value={subject}
                  onValueChange={setSubject}
                  isInvalid={showErrors && !subject.trim()}
                  errorMessage="A subject is required"
                />
              </div>
              {/* Identity comes from the signed in account and is shown read only:
                editing it here would not change who the ticket is actually from. */}
              <BaseInput label="Contact name" value={contactName} isReadOnly />
              <BaseInput
                label="Contact email"
                value={contactEmail}
                isReadOnly
              />
              <BaseInput
                label="Contact phone"
                isRequired
                placeholder="Enter a phone number"
                value={phone}
                onValueChange={setPhone}
                isInvalid={showErrors && !phone.trim()}
                errorMessage="A phone number is required"
              />
              <BaseInput
                label="Location"
                isRequired
                placeholder="Enter a location"
                value={location}
                onValueChange={setLocation}
                isInvalid={showErrors && !location.trim()}
                errorMessage="A location is required"
              />
            </div>
          </div>
        )}

        {step.id === 'questions' && category && (
          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold">
                  {category.section ?? 'A few details about the problem'}
                </p>
                <p className="text-light-gray text-[13px]">
                  All answers are required. They save a round trip before anyone
                  can start on it.
                </p>
              </div>
              {questionPages.length > 1 && (
                <span className="text-light-gray shrink-0 text-xs">
                  Page {questionPage + 1} of {questionPages.length}
                </span>
              )}
            </div>
            {questionPage === 0 && category.note && (
              <div className="bg-lighter-blue text-blue mb-4 rounded-lg p-3 text-sm">
                {category.note}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {currentQuestions.map(f => (
                <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                  <RequestFieldRenderer
                    spec={f}
                    value={answers[f.key]}
                    onChange={v => setAnswers(a => ({ ...a, [f.key]: v }))}
                    assets={pickedAssets[f.key]}
                    onAssetsChange={assets =>
                      setPickedAssets(p => ({ ...p, [f.key]: assets }))
                    }
                    showError={
                      showErrors && missingRequired([f], answers).length > 0
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step.id === 'review' && category && (
          <div>
            <p className="mb-0.5 text-[15px] font-semibold">
              Review your request
            </p>
            <p className="text-light-gray mb-3 text-[13px]">
              This is what Netcorp support will receive.
            </p>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-light-gray w-32 shrink-0">Goes to</dt>
                <dd className="font-medium">Netcorp support</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-light-gray w-32 shrink-0">Category</dt>
                <dd>{category.label}</dd>
              </div>
              {resolvedCategory?.name &&
                normalise(resolvedCategory.name) !==
                  normalise(category.label) && (
                  <div className="flex gap-2">
                    <dt className="text-light-gray w-32 shrink-0">
                      Filed under
                    </dt>
                    <dd>{resolvedCategory.name}</dd>
                  </div>
                )}
              <div className="flex gap-2">
                <dt className="text-light-gray w-32 shrink-0">Subject</dt>
                <dd>{subject}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-light-gray w-32 shrink-0">Priority</dt>
                <dd>{urgencyToPriority(answers.urgency)}</dd>
              </div>
            </dl>
            {!categoriesLoading && !resolvedCategory && (
              <p className="bg-red-dark/5 text-red-dark mt-4 rounded-lg p-3 text-sm">
                This request type can't be submitted yet: Helpdesk has no
                category for "{category.label}". Ask a Helpdesk admin to add a
                category with that name, then try again.
              </p>
            )}
            {submitError && (
              <p
                role="alert"
                className="bg-red-dark/5 text-red-dark mt-4 rounded-lg p-3 text-sm"
              >
                {submitError}
              </p>
            )}
            <p className="text-light-gray mt-4 mb-1 text-xs font-semibold">
              What the ticket will say
            </p>
            <pre className="bg-light/40 max-h-56 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
              {buildDescription({
                category,
                answers,
                contact: {
                  location,
                  name: contactName,
                  phone,
                  email: contactEmail,
                },
              })}
            </pre>
          </div>
        )}
      </div>

      {/*
        Footer laid out like the Create Asset wizard: a rule separating it from
        the content, Cancel alone on the left as the way out, and Back beside
        the primary action on the right so the two navigation controls sit
        together rather than at opposite ends of the dialog.
      */}
      <div className="border-light mt-5 flex items-center justify-between border-t pt-4">
        <BaseButton variant="bordered" onPress={onCancel} isDisabled={isBusy}>
          Cancel
        </BaseButton>
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <BaseButton variant="bordered" onPress={back} isDisabled={isBusy}>
              Back
            </BaseButton>
          )}
          {step.id === 'review' ? (
            <BaseButton
              color="primary"
              onPress={submit}
              isDisabled={isBusy || !resolvedCategoryId}
            >
              {isBusy ? 'Creating...' : 'Create request'}
            </BaseButton>
          ) : (
            <BaseButton color="primary" onPress={next}>
              Next
            </BaseButton>
          )}
        </div>
      </div>
    </div>
  );
};
