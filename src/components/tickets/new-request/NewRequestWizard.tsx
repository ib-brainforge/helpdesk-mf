import { BaseButton, BaseInput } from '@brainforgeau/components';
import { useAuth } from '@brainforgeau/security';
import { type FC, useMemo, useState } from 'react';
import { useCreateTicket } from '../hooks/useTickets';
import { RequestFieldRenderer } from './RequestFieldRenderer';
import { buildDescription, urgencyToPriority } from './formatAnswers';
import {
  type Answers,
  type CategorySpec,
  REQUEST_CATEGORIES,
  missingRequired,
  paginateFields,
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
  const { categories } = useRequestCategories();

  const [stepIndex, setStepIndex] = useState(0);
  const [categoryKey, setCategoryKey] = useState<string>('');
  const [answers, setAnswers] = useState<Answers>({});
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
   * The wizard's categories are defined in code, but the API requires a real
   * Category row: CreateTicketCommandHandler rejects a ticket with no
   * CategoryId. The label is matched against the configured categories, which
   * are seeded with these exact names, falling back to the first available one
   * so a renamed category costs a mis-filed ticket rather than a failed submit.
   *
   * This is the seam that disappears once the questions themselves are
   * configured in the database rather than listed here.
   */
  const resolvedCategoryId = useMemo(() => {
    if (!category) return undefined;
    const byName = categories?.find(
      c => c.name?.trim().toLowerCase() === category.label.trim().toLowerCase(),
    );
    return byName?.id ?? categories?.[0]?.id;
  }, [category, categories]);

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
    if (!category) return;
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
      { onSuccess: id => onCreated?.(String(id)) },
    );
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
              <div className="flex gap-2">
                <dt className="text-light-gray w-32 shrink-0">Subject</dt>
                <dd>{subject}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-light-gray w-32 shrink-0">Priority</dt>
                <dd>{urgencyToPriority(answers.urgency)}</dd>
              </div>
            </dl>
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
        <BaseButton
          variant="bordered"
          onPress={onCancel}
          isDisabled={createTicket.isPending}
        >
          Cancel
        </BaseButton>
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <BaseButton
              variant="bordered"
              onPress={back}
              isDisabled={createTicket.isPending}
            >
              Back
            </BaseButton>
          )}
          {step.id === 'review' ? (
            <BaseButton
              color="primary"
              onPress={submit}
              isDisabled={createTicket.isPending}
            >
              {createTicket.isPending ? 'Creating...' : 'Create request'}
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
