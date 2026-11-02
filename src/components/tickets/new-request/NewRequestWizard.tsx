import type { DeadlinePriority } from '@/api/local/deadlines';
import { issueScopeToken } from '@/api/local/scoped';
import { ScopeSelect } from '@/components/shared';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useMailbox } from '@/hooks/useMailbox';
import { useScopeNames } from '@/hooks/useScopeNames';
import { useTenantNames } from '@/hooks/useTenantNames';
import { selectedContextAtom } from '@/state/auth-atoms';
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
  BaseToggle,
  Icon,
} from '@brainforgeau/components';
import { useAuth, usePermissions } from '@brainforgeau/security';
import { toast } from '@heroui/react';
import { NavLink } from '@modern-js/runtime/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { type FC, useEffect, useMemo, useState } from 'react';
import { scopePath } from '../components/ScopePills';
import { TicketDescriptionContent } from '../components/TicketDescriptionContent';
import { ContactPicker, type RequestContact } from './ContactPicker';
import { DeadlinePreviewBox } from './DeadlinePreviewBox';
import { RequestFieldRenderer } from './RequestFieldRenderer';
import {
  type CategoryCard,
  cardOf,
  groupTitle,
  handledByOf,
  sentToLabel,
} from './request-categories';
import {
  type Answers,
  type QuestionItem,
  URGENCY_CHOICES,
  answerRows,
  isFullWidth,
  itemKey,
  missingRequired,
  paginate,
  pickedAssetsOf,
  questionItems,
  toCustomFieldValues,
  urgencyToPriority,
} from './request-fields';
import { requestDescription } from './requestDescription';
import { RequestScopeContext, createTicketInScope } from './requestScope';
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
 * WHERE A REQUEST GOES
 * The category decides. The categories come from the API grouped by who
 * handles them: the tenant's own helpdesk, its provider's office, or Netcorp.
 * The wizard submits once, in the app's own context, and the backend files the
 * ticket in the helpdesk of the tenant that owns the category. The answer says
 * which, and the requester is told ("Sent to ...").
 */

type StepId = 'category' | 'details' | 'questions' | 'review';

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

/** A created request: its id, and whether a helpdesk above the tenant holds it. */
export interface CreatedRequest {
  id: string;
  handledAbove: boolean;
}

interface Props {
  onCreated?: (created: CreatedRequest) => void;
  onCancel?: () => void;
}

export const NewRequestWizard: FC<Props> = ({ onCreated, onCancel }) => {
  const { user } = useAuth();
  // Linking needs tickets.update, which a Tenant raising a request does not
  // have. Their vehicles are still saved as the answer to the vehicle
  // question; the link is only attempted when it can succeed.
  const { hasPermission } = usePermissions();
  const canLinkAssets = hasPermission(HelpdeskPermissions.Tickets.Update);
  // Staff raising a request for a client use the same tickets.update grant as
  // linking assets; a separate name keeps the two meanings from blurring.
  const canActOnBehalf = hasPermission(HelpdeskPermissions.Tickets.Update);
  const canAuthorCategories = hasPermission(
    HelpdeskPermissions.Categories.Manage,
  );
  const {
    categories,
    groups: categoryGroups,
    tenantNames: ownerNames,
    isLoading: categoriesLoading,
  } = useRequestCategories();
  // Why the last create failed, shown on the review step. Cleared as soon as
  // the requester moves, so a stale message never sits over a fixed form.
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Covers the create and the vehicle links made after the ticket exists, so
  // Create cannot be pressed a second time while they finish.
  const [isFinishing, setIsFinishing] = useState(false);
  const isBusy = isFinishing;

  /*
   * Staff (agents who can edit tickets) raising a request for a client pick the
   * client's contact, and may email them a confirmation from their own
   * mailbox. Clients raise their own request, so for them the contact is their
   * account, read only, as before.
   */
  const isStaff = canActOnBehalf;
  const { isConnected: mailboxConnected } = useMailbox();
  const [contact, setContact] = useState<RequestContact | null>(null);
  const [newContactEmail, setNewContactEmail] = useState('');
  // Off until asked for: on by default, a client was nearly emailed by
  // someone who had not noticed the switch.
  const [notifyContact, setNotifyContact] = useState(false);

  const [stepIndex, setStepIndex] = useState(0);
  // The chosen category's id.
  const [categoryKey, setCategoryKey] = useState<string>('');
  // Answers to the category's questions, by field id.
  const [answers, setAnswers] = useState<Answers>({});
  // The ticket's own questions: its priority and the requester's own words.
  const [urgency, setUrgency] = useState<string>('');
  const [details, setDetails] = useState('');
  const [subject, setSubject] = useState('');

  /*
   * Which organisation the request is for, within the tenant the app is in.
   *
   * The tenant is not asked: a request is raised from the app's own tenant,
   * and the category (not a choice of tenant) decides whose helpdesk works it.
   * The organisation is: a dropdown when the tenant has several, locked when
   * it has one, starting from the app's own. It is required whenever the
   * tenant has any, since a ticket left at tenant level is not visible to the
   * organisation it belongs to.
   */
  const appContext = useAtomValue(selectedContextAtom);
  const { tenantOptions, organisationOptions } = useScopeNames();
  const tenantId = appContext?.tenantId ?? null;
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const orgsForTenant = useMemo(
    () => organisationOptions.filter(o => o.parentId === tenantId),
    [organisationOptions, tenantId],
  );
  const orgLocked = orgsForTenant.length <= 1;
  const tenantName = tenantOptions.find(t => t.id === tenantId)?.name;
  const organisationName = orgsForTenant.find(
    o => o.id === organisationId,
  )?.name;

  useEffect(() => {
    if (organisationId && orgsForTenant.some(o => o.id === organisationId))
      return;
    setOrganisationId(
      orgsForTenant.find(o => o.id === appContext?.organisationId)?.id ??
        (orgsForTenant.length === 1 ? orgsForTenant[0].id : null),
    );
  }, [orgsForTenant, appContext?.organisationId, organisationId]);

  const scopeComplete =
    !!tenantId && (orgsForTenant.length === 0 || !!organisationId);
  const requestScope = useMemo(
    () => ({ tenantId, organisationId }),
    [tenantId, organisationId],
  );
  const queryClient = useQueryClient();

  // When the chosen organisation is the app's own, the normal client already
  // serves it. Another organisation of the same tenant needs a token issued
  // for it, since the backend stamps the organisation from the token.
  const inAppContext = organisationId === (appContext?.organisationId ?? null);

  /*
   * Issued as soon as the organisation is chosen, so a refusal shows on the
   * Details step instead of after every question. Create then uses it.
   */
  const scopeToken = useQuery({
    queryKey: ['new-request', 'scope-token', tenantId, organisationId],
    enabled: scopeComplete && !inAppContext,
    staleTime: 30 * 60 * 1000,
    retry: false,
    queryFn: () => issueScopeToken(requestScope, 'helpdesk'),
  });
  const scopeUnavailable = !inAppContext && scopeToken.isError;
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  // Which page of the questions step is showing. Long categories are paged so
  // the dialog never needs to scroll.
  const [questionPage, setQuestionPage] = useState(0);

  const profile = (user?.profile ?? {}) as Record<string, unknown>;
  const accountName = (profile.name as string) ?? '';
  const accountEmail = (profile.email as string) ?? '';
  const isSelf = !isStaff || contact?.kind === 'self';
  const contactName = isSelf
    ? accountName
    : contact?.kind === 'existing'
      ? contact.contact.displayName
      : contact?.kind === 'new'
        ? contact.displayName
        : '';
  const contactEmail = isSelf
    ? accountEmail
    : contact?.kind === 'existing'
      ? contact.contact.email
      : contact?.kind === 'new'
        ? newContactEmail.trim()
        : '';
  const newContactEmailValid =
    contact?.kind !== 'new' ||
    (contact.displayName.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContactEmail.trim()));

  /*
   * Staff start with themselves as the contact, so the step never blocks on a
   * company with no contacts on file (most have none yet). They can pick a
   * client's contact, or add one inline with a name and an email.
   */
  useEffect(() => {
    if (isStaff && contact === null) setContact({ kind: 'self' });
  }, [isStaff, contact]);

  const pickContact = (next: RequestContact | null) => {
    setContact(next);
    if (next?.kind === 'existing' && next.contact.phone) {
      setPhone(next.contact.phone);
    }
  };

  // The chosen category as the API listed it, and the questions it asks.
  const chosenCategory = useMemo(
    () => categories.find(c => c.id === categoryKey),
    [categories, categoryKey],
  );
  const category: CategoryCard | undefined = useMemo(
    () => (chosenCategory ? cardOf(chosenCategory) : undefined),
    [chosenCategory],
  );
  const chosenHandledBy = chosenCategory
    ? handledByOf(chosenCategory)
    : undefined;
  const handlerTitle = chosenHandledBy
    ? groupTitle(
        chosenHandledBy,
        chosenCategory?.ownerTenantId
          ? ownerNames[chosenCategory.ownerTenantId]
          : undefined,
      )
    : undefined;

  const step = STEPS[stepIndex];

  /*
   * Every question the category marks required must be answered, and so must
   * the urgency. The description is required only of a category with no
   * questions, where it is the whole request.
   */
  const isMissing = (item: QuestionItem): boolean => {
    if (item.kind === 'field')
      return missingRequired([item.field], answers).length > 0;
    if (item.kind === 'urgency') return !urgency;
    return (category?.fields.length ?? 0) === 0 && !details.trim();
  };
  const siteDetailsRequired = !category?.remote;

  const questionPages = useMemo(
    () => (category ? paginate(questionItems(category.fields)) : []),
    [category],
  );
  const currentQuestions = questionPages[questionPage] ?? [];
  const isLastQuestionPage = questionPage >= questionPages.length - 1;

  const canAdvance = (): boolean => {
    if (step.id === 'category') return !!category;
    if (step.id === 'details') {
      // Phone and location are required where someone may need to ring or
      // visit; a portal, account or app question needs neither.
      return (
        scopeComplete &&
        !scopeUnavailable &&
        subject.trim().length > 0 &&
        (!siteDetailsRequired ||
          (phone.trim().length > 0 && location.trim().length > 0)) &&
        (!isStaff || !!contact) &&
        newContactEmailValid
      );
    }
    if (step.id === 'questions') {
      return currentQuestions.every(item => !isMissing(item));
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

  const contactDetails = {
    location,
    name: contactName,
    phone,
    email: contactEmail,
  };

  /*
   * Vehicles picked for one organisation are not another's, so whatever
   * changes the organisation (the picker, or the app's context) clears them.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: only an organisation change clears them
  useEffect(() => {
    setAnswers(prev => {
      const assetKeys = new Set(
        (category?.fields ?? [])
          .filter(f => f.fieldType === 'Asset')
          .map(f => f.id),
      );
      if (!Object.keys(prev).some(k => assetKeys.has(k))) return prev;
      return Object.fromEntries(
        Object.entries(prev).filter(([k]) => !assetKeys.has(k)),
      );
    });
  }, [tenantId, organisationId]);

  const reviewRows = useMemo(
    () => (category ? answerRows(category.fields, answers) : []),
    [category, answers],
  );

  const submit = async () => {
    if (!category || !chosenCategory?.id) return;
    setSubmitError(null);
    const notify =
      isStaff && notifyContact && !!contact && contact.kind !== 'self';
    const ticket = {
      subject: subject.trim(),
      description: requestDescription(details, contactDetails),
      priority: urgencyToPriority(urgency),
      categoryId: chosenCategory.id,
      customFieldValues: toCustomFieldValues(category.fields, answers),
      ...(isStaff && contact?.kind === 'existing'
        ? { contactId: contact.contact.id }
        : {}),
      ...(isStaff && contact?.kind === 'new'
        ? {
            newContact: {
              displayName: contact.displayName,
              email: newContactEmail.trim(),
              phone: phone.trim() || undefined,
            },
          }
        : {}),
      ...(notify ? { notifyContact: true } : {}),
    };

    setIsFinishing(true);
    try {
      // One path whichever scope was chosen: the app's own context needs no
      // token (null), any other uses the one issued on the Details step.
      const created = await createTicketInScope(
        requestScope,
        ticket,
        inAppContext ? null : scopeToken.data,
      );
      const handledAbove = created.handledByTenantId !== tenantId;
      // A ticket filed above the tenant is not this tenant's to link vehicles
      // to; they are saved as its vehicle answer either way.
      if (canLinkAssets && !handledAbove) {
        await linkPickedAssets(created.id, created.linkAsset);
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast(
        sentToLabel({
          handledByTenantId: created.handledByTenantId,
          ownTenantId: tenantId,
          category: chosenCategory,
          tenantNames: ownerNames,
        }),
        { variant: 'success' },
      );
      // The create response carries no send result, and the ticket exists
      // either way, so the mailbox status already known here decides it.
      if (notify && !mailboxConnected) {
        toast('Ticket created', {
          description:
            "The confirmation email wasn't sent because your mailbox isn't connected.",
          variant: 'warning',
        });
      }
      onCreated?.({ id: created.id, handledAbove });
    } catch (error) {
      // The dialog stays open with everything as entered, so the requester
      // can fix the cause and press Create again rather than start over.
      setSubmitError(describeCreateError(error));
    } finally {
      setIsFinishing(false);
    }
  };

  /*
   * Links each chosen vehicle to the new ticket, so it shows under the ticket's
   * linked assets as well as in the vehicle answer. The picker lists Asset app
   * records, so every chosen vehicle has an id to link.
   *
   * Best effort, and deliberately so: the ticket already exists and its answer
   * already names every vehicle, so a link that fails (for example a requester
   * without permission to edit links) loses nothing the agent needs. Failing
   * the whole request over it would be worse.
   */
  const linkPickedAssets = async (
    ticketId: string,
    link: (assetId: string) => Promise<unknown>,
  ) => {
    const assetIds = pickedAssetsOf(category?.fields ?? [], answers)
      .map(a => a.assetId)
      .filter((x): x is string => !!x);
    const results = await Promise.allSettled(
      assetIds.map(assetId => link(assetId)),
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(
        `New request ${ticketId}: ${failed} of ${assetIds.length} vehicle links failed; the vehicles are still in its vehicle answer.`,
      );
    }
  };

  return (
    <RequestScopeContext.Provider value={requestScope}>
      <div className="mx-auto w-full pb-4">
        {/*
        Progress reads as one bar that fills, with the step names beneath it,
        matching the Create Asset wizard in the sibling app. Numbered circles
        were a different dialect of the same idea; sharing the pattern means a
        user who has met one wizard already knows how far through they are.
      */}
        {/*
        Every step is drawn the same way, a segment of the bar, blue once
        reached and grey before. Upcoming steps used to be a small dot with a
        nudge to centre it, so their labels sat lower than the reached ones and
        the row looked broken.
      */}
        <div className="mb-3 flex justify-center">
          <ol className="flex w-full max-w-md items-start gap-1.5">
            {STEPS.map((s, i) => {
              const reached = i <= stepIndex;
              return (
                <li key={s.id} className="flex flex-1 flex-col items-center">
                  <span
                    className={`h-1 w-full rounded-full transition-colors ${
                      reached ? 'bg-blue' : 'bg-light'
                    }`}
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
          {step.id === 'category' &&
            !categoriesLoading &&
            categories.length === 0 && (
              <div role="status" className="py-6 text-center">
                <p className="mb-1 text-[15px] font-semibold">
                  No request types yet
                </p>
                <p className="text-light-gray mb-3 text-[13px]">
                  There are no categories to raise a request under, so requests
                  cannot be created here yet.
                </p>
                <div className="flex flex-col items-center gap-1 text-sm">
                  {canAuthorCategories && (
                    <NavLink
                      to="/configuration/categories"
                      className="text-primary hover:underline"
                    >
                      Add categories in Configuration
                    </NavLink>
                  )}
                </div>
              </div>
            )}
          {step.id === 'category' &&
            (categoriesLoading || categories.length > 0) && (
              <div>
                <p className="mb-0.5 text-[15px] font-semibold">
                  What is your request about?
                </p>
                <p className="text-light-gray mb-3 text-[13px]">
                  Pick a category. The questions on the next steps are tailored
                  to your choice.
                </p>
                {/*
              Cards rather than bare text buttons: an icon to scan by, the
              request type, and one line on what it is for, so the choice can
              be made without reading every label in full. One choice only, so
              they are a radio group to assistive technology.

              Grouped by who handles them: the tenant's own helpdesk (left
              out when it has no categories), its provider, Netcorp. On a
              screen too short for the summaries (under 620px of page height)
              they drop out and the labels alone carry the choice.
            */}
                {categoryGroups.map(group => (
                  <div key={group.handledBy} className="mb-3 last:mb-0">
                    <p className="text-light-gray mb-1.5 text-xs font-semibold uppercase tracking-wide">
                      {group.title}
                    </p>
                    <div
                      role="radiogroup"
                      aria-label={`Request category: ${group.title}`}
                      className="grid grid-cols-1 gap-1.5 sm:grid-cols-2"
                    >
                      {group.categories.map(row => {
                        const c = cardOf(row);
                        const selected = categoryKey === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => {
                              // Choosing the same category again keeps its answers.
                              if (c.id !== categoryKey) {
                                setCategoryKey(c.id);
                                setAnswers({});
                                setQuestionPage(0);
                              }
                              // One choice and nothing else on this step, so
                              // picking it moves on.
                              setSubmitError(null);
                              setStepIndex(1);
                            }}
                            className={`flex h-full w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue ${
                              selected
                                ? 'border-blue bg-lighter-blue'
                                : 'border-light hover:border-light-gray hover:bg-light/40'
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                                selected
                                  ? 'bg-blue text-white'
                                  : 'bg-lighter-blue text-blue'
                              }`}
                            >
                              <Icon name={c.icon} className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="text-gray block text-[13px] font-medium leading-snug dark:text-light">
                                {c.label}
                              </span>
                              <span className="text-light-gray mt-0.5 block text-xs leading-snug [@media(max-height:620px)]:hidden">
                                {c.summary}
                              </span>
                            </span>
                            {selected && (
                              <Icon
                                name="CheckCircleIcon"
                                className="text-blue h-5 w-5 shrink-0"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {showErrors && !category && (
                  <p className="text-red-dark mt-2 text-sm">
                    Choose a category.
                  </p>
                )}
              </div>
            )}

          {step.id === 'details' && (
            <div>
              <p className="mb-0.5 text-[15px] font-semibold">
                Tell us who and where
              </p>
              <p className="text-light-gray mb-3 text-[13px]">
                {isStaff
                  ? 'Who the request is for, and how to reach them.'
                  : 'How to reach you. Your name and email come from your account.'}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <BaseInput label="Tenant" value={tenantName ?? ''} isReadOnly />
                {orgLocked ? (
                  <BaseInput
                    label="Organisation"
                    value={organisationName ?? (tenantId ? 'None' : '')}
                    isReadOnly
                  />
                ) : (
                  <ScopeSelect
                    label="Organisation"
                    options={orgsForTenant}
                    value={organisationId}
                    onChange={setOrganisationId}
                    placeholder="Choose an organisation"
                    isRequired
                  />
                )}
                {scopeUnavailable && (
                  <p className="text-red-dark -mt-2 text-xs sm:col-span-2">
                    Requests can't be raised for{' '}
                    {organisationName ?? 'this organisation'}. Choose another,
                    or ask an admin to check your access to it.
                  </p>
                )}
                {showErrors && !scopeComplete && (
                  <p className="text-red-dark -mt-2 text-xs sm:col-span-2">
                    {tenantId
                      ? 'Choose the organisation this request is for.'
                      : 'Choose a tenant in the app before raising a request.'}
                  </p>
                )}
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
                {isStaff ? (
                  <>
                    {/* Staff pick the client's contact, or add a new one
                      here; replies go to them. */}
                    <div>
                      {contact?.kind === 'new' ? (
                        <BaseInput
                          label="New contact name"
                          isRequired
                          placeholder="Who rang or emailed"
                          value={contact.displayName}
                          onValueChange={v =>
                            setContact({ kind: 'new', displayName: v })
                          }
                          isInvalid={showErrors && !contact.displayName.trim()}
                          errorMessage="A name is required for a new contact"
                        />
                      ) : (
                        <ContactPicker
                          value={contact}
                          onChange={pickContact}
                          selfName={accountName || accountEmail || 'you'}
                          isRequired
                          isInvalid={showErrors && !contact}
                          errorMessage="Choose who this request is for"
                          scopeKey={`${tenantId ?? ''}|${organisationId ?? ''}`}
                          scopeToken={
                            inAppContext ? undefined : scopeToken.data
                          }
                          isReady={
                            scopeComplete && (inAppContext || !!scopeToken.data)
                          }
                        />
                      )}
                      <button
                        type="button"
                        className="text-blue mt-1 text-xs hover:underline"
                        onClick={() => {
                          setNewContactEmail('');
                          setContact(
                            contact?.kind === 'new'
                              ? { kind: 'self' }
                              : { kind: 'new', displayName: '' },
                          );
                        }}
                      >
                        {contact?.kind === 'new'
                          ? 'Choose an existing contact instead'
                          : 'Add a new contact'}
                      </button>
                    </div>
                    {contact?.kind === 'new' ? (
                      <BaseInput
                        label="Contact email"
                        isRequired
                        placeholder="name@company.com.au"
                        value={newContactEmail}
                        onValueChange={setNewContactEmail}
                        isInvalid={showErrors && !newContactEmailValid}
                        errorMessage="A valid email is required for a new contact"
                      />
                    ) : (
                      <BaseInput
                        label="Contact email"
                        value={contactEmail}
                        isReadOnly
                      />
                    )}
                  </>
                ) : (
                  <>
                    {/* Identity comes from the signed in account and is shown read
                    only: editing it here would not change who the ticket is from. */}
                    <BaseInput
                      label="Contact name"
                      value={contactName}
                      isReadOnly
                    />
                    <BaseInput
                      label="Contact email"
                      value={contactEmail}
                      isReadOnly
                    />
                  </>
                )}
                <BaseInput
                  label="Contact phone"
                  isRequired={siteDetailsRequired}
                  placeholder={
                    siteDetailsRequired
                      ? 'Enter a phone number'
                      : 'Optional for this request'
                  }
                  value={phone}
                  onValueChange={setPhone}
                  isInvalid={showErrors && siteDetailsRequired && !phone.trim()}
                  errorMessage="A phone number is required"
                />
                <BaseInput
                  label="Location"
                  isRequired={siteDetailsRequired}
                  placeholder={
                    siteDetailsRequired
                      ? 'Where the vehicle or site is'
                      : 'Optional for this request'
                  }
                  value={location}
                  onValueChange={setLocation}
                  isInvalid={
                    showErrors && siteDetailsRequired && !location.trim()
                  }
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
                    {category.heading ?? 'A few details about the problem'}
                  </p>
                  <p className="text-light-gray text-[13px]">
                    Answers marked * are required. They save a round trip before
                    anyone can start on it.
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
                {currentQuestions.map(item => (
                  <div
                    key={itemKey(item)}
                    className={isFullWidth(item) ? 'sm:col-span-2' : ''}
                  >
                    {item.kind === 'field' && (
                      <RequestFieldRenderer
                        field={item.field}
                        value={answers[item.field.id]}
                        onChange={v =>
                          setAnswers(a => ({ ...a, [item.field.id]: v }))
                        }
                        showError={showErrors && isMissing(item)}
                      />
                    )}
                    {item.kind === 'urgency' && (
                      <BaseSelect
                        label="Urgency"
                        isRequired
                        placeholder="Select"
                        selectedKey={urgency || null}
                        onSelectionChange={key => {
                          if (typeof key === 'string') setUrgency(key);
                        }}
                        {...(showErrors && isMissing(item)
                          ? {
                              isInvalid: true,
                              errorMessage: 'This is required',
                            }
                          : {})}
                      >
                        {URGENCY_CHOICES.map(c => (
                          <BaseSelectItem key={c.label} value={c.label}>
                            {c.label}
                          </BaseSelectItem>
                        ))}
                      </BaseSelect>
                    )}
                    {item.kind === 'description' && (
                      <BaseTextarea
                        label={
                          category.fields.length > 0
                            ? 'Anything else we should know?'
                            : 'Describe the problem'
                        }
                        isRequired={category.fields.length === 0}
                        placeholder="Tell us what's happening, what you expected, and any steps to reproduce it."
                        value={details}
                        onValueChange={setDetails}
                        minRows={4}
                        {...(showErrors && isMissing(item)
                          ? {
                              isInvalid: true,
                              errorMessage: 'This is required',
                            }
                          : {})}
                      />
                    )}
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
                This is how your ticket will look to the support team.
              </p>
              {/*
              A preview of the ticket itself rather than a summary of the form:
              the subject as its heading, the facts it is filed with as chips,
              and the description drawn by the same component as the ticket
              page. It used to print the description's raw HTML, which showed
              the requester markup instead of their request.
            */}
              <div className="border-light overflow-hidden rounded-lg border">
                <div className="border-light border-b px-4 py-3">
                  <p className="text-gray text-base font-semibold break-words dark:text-light">
                    {subject}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <span className="bg-lighter-blue text-blue inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium">
                      <Icon name={category.icon} className="h-3.5 w-3.5" />
                      {category.label}
                    </span>
                    <span className="bg-light/60 text-gray rounded-md px-2 py-0.5 dark:text-light">
                      Priority: {urgency || 'Medium'}
                    </span>
                    {tenantName && (
                      <span className="bg-light/60 text-gray rounded-md px-2 py-0.5 dark:text-light">
                        {scopePath(tenantName, organisationName)}
                      </span>
                    )}
                    {handlerTitle && (
                      <span className="bg-light/60 text-gray rounded-md px-2 py-0.5 dark:text-light">
                        Handled by {handlerTitle}
                      </span>
                    )}
                  </div>
                </div>
                <div className="max-h-[min(36vh,320px)] overflow-y-auto px-4 py-1 text-sm">
                  {reviewRows.length > 0 && (
                    <dl className="my-2 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                      {reviewRows.map(row => (
                        <div key={row.id} className="contents">
                          <dt className="text-light-gray text-xs">
                            {row.label}
                          </dt>
                          <dd className="text-gray break-words dark:text-light">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <TicketDescriptionContent
                    value={requestDescription(details, contactDetails)}
                  />
                </div>
              </div>
              {/*
                What happens next: the deadline the tenant's policy gives this
                ticket, and (staff only) the confirmation to the contact.
              */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DeadlinePreviewBox
                  priority={urgencyToPriority(urgency) as DeadlinePriority}
                  scopeKey={`${tenantId ?? ''}|${organisationId ?? ''}`}
                  scopeToken={inAppContext ? undefined : scopeToken.data}
                  isReady={inAppContext || !!scopeToken.data}
                  companyName={tenantName}
                />
                {isStaff && contact?.kind !== 'self' && (
                  <div className="border-light rounded-lg border px-4 py-3 text-sm">
                    <BaseToggle
                      isSelected={notifyContact && !!contact}
                      isDisabled={!contact}
                      onChange={setNotifyContact}
                    >
                      <span className="font-semibold">
                        Notify contact by email
                      </span>
                    </BaseToggle>
                    <p className="text-light-gray mt-2 text-xs">
                      {contact
                        ? `${contactName} gets a confirmation with the ticket number, sent from your own mailbox. Their replies come back into the ticket.`
                        : 'Choose a contact on the Details step to email them a confirmation.'}
                      {notifyContact && contact && !mailboxConnected
                        ? " Your mailbox isn't connected, so it won't be sent."
                        : ''}
                    </p>
                  </div>
                )}
              </div>
              {submitError && (
                <p
                  role="alert"
                  className="bg-red-dark/5 text-red-dark mt-4 rounded-lg p-3 text-sm"
                >
                  {submitError}
                </p>
              )}
            </div>
          )}
        </div>

        {/*
        Footer laid out like the Create Asset wizard: a rule separating it from
        the content, Cancel alone on the left as the way out, and Back beside
        the primary action on the right so the two navigation controls sit
        together rather than at opposite ends of the dialog.
      */}
        <div className="border-light mt-4 flex items-center justify-between border-t pt-4">
          <BaseButton
            variant="bordered"
            color="light"
            onPress={onCancel}
            isDisabled={isBusy}
          >
            Cancel
          </BaseButton>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <BaseButton
                variant="bordered"
                color="light"
                onPress={back}
                isDisabled={isBusy}
              >
                Back
              </BaseButton>
            )}
            {step.id === 'review' ? (
              <BaseButton
                color="primary"
                onPress={submit}
                isDisabled={isBusy || !chosenCategory?.id}
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
    </RequestScopeContext.Provider>
  );
};
