import type { DeadlinePriority } from '@/api/local/deadlines';
import { issueScopeToken } from '@/api/local/scoped';
import { ScopeSelect } from '@/components/shared';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { useHelpdeskLicensedTenants } from '@/hooks/useHelpdeskLicensedTenants';
import { useMailbox } from '@/hooks/useMailbox';
import { useScopeNames } from '@/hooks/useScopeNames';
import { selectedContextAtom } from '@/state/auth-atoms';
import {
  BaseButton,
  BaseInput,
  BaseToggle,
  Icon,
} from '@brainforgeau/components';
import { useAuth, usePermissions } from '@brainforgeau/security';
import { toast } from '@heroui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { type FC, useEffect, useMemo, useState } from 'react';
import { scopePath } from '../components/ScopePills';
import { TicketDescriptionContent } from '../components/TicketDescriptionContent';
import type { PickedAsset } from './AssetPicker';
import { ContactPicker, type RequestContact } from './ContactPicker';
import { DeadlinePreviewBox } from './DeadlinePreviewBox';
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
 * ONE DESTINATION
 * Every request goes to Netcorp. The form does not ask, because there is no
 * other answer: the product rule is a two way conversation between the client
 * and Netcorp, so neither an internal lane nor the platform lane (BrainForge
 * engineering, Audience=Platform) belongs here. A third party in the thread
 * breaks the model.
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

interface Props {
  onCreated?: (ticketId: string) => void;
  onCancel?: () => void;
}

export const NewRequestWizard: FC<Props> = ({ onCreated, onCancel }) => {
  const { user } = useAuth();
  // Linking needs tickets.update, which a Customer raising a request does not
  // have. They still get their vehicles named in the description; the link is
  // only attempted when it can succeed.
  const { hasPermission } = usePermissions();
  const canLinkAssets = hasPermission(HelpdeskPermissions.Tickets.Update);
  const { categories, isLoading: categoriesLoading } = useRequestCategories();
  // Why the last create failed, shown on the review step. Cleared as soon as
  // the requester moves, so a stale message never sits over a fixed form.
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Covers the create and the vehicle links made after the ticket exists, so
  // Create cannot be pressed a second time while they finish.
  const [isFinishing, setIsFinishing] = useState(false);
  const isBusy = isFinishing;

  /*
   * Staff raising a request for a client pick the client's contact, and may
   * email them a confirmation from their own mailbox. Clients raise their own
   * request, so for them the contact is their account, read only, as before.
   */
  const { isServiceAdmin: isStaff } = useHelpdeskAccess();
  const { isConnected: mailboxConnected } = useMailbox();
  const [contact, setContact] = useState<RequestContact | null>(null);
  const [newContactEmail, setNewContactEmail] = useState('');
  // Off until asked for: on by default, a client was nearly emailed by
  // someone who had not noticed the switch.
  const [notifyContact, setNotifyContact] = useState(false);

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

  /*
   * Which company (tenant) and organisation the request is for.
   *
   * Someone who works across several tenants picks the company; someone with
   * one has it filled in and locked. The organisation works the same way
   * within the chosen company: a dropdown when there are several, locked when
   * there is one. Both start from the context the app is in, which is nearly
   * always the right answer.
   *
   * An organisation is required whenever the company has any. A request is
   * raised by someone at a site, and a ticket left at company level is not
   * visible to the organisation it belongs to.
   */
  const appContext = useAtomValue(selectedContextAtom);
  const { tenantOptions: allTenantOptions, organisationOptions } =
    useScopeNames();
  // Only companies where Helpdesk is licensed: picking one that is not, and
  // only then being told, was the commonest dead end (5 of 7 tried).
  const allTenantIds = useMemo(
    () => allTenantOptions.map(t => t.id),
    [allTenantOptions],
  );
  const { isLicensed } = useHelpdeskLicensedTenants(allTenantIds);
  const tenantOptions = useMemo(
    () => allTenantOptions.filter(t => isLicensed(t.id)),
    [allTenantOptions, isLicensed],
  );
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const orgsForTenant = useMemo(
    () => organisationOptions.filter(o => o.parentId === tenantId),
    [organisationOptions, tenantId],
  );
  const tenantLocked = tenantOptions.length <= 1;
  const orgLocked = orgsForTenant.length <= 1;
  const tenantName = tenantOptions.find(t => t.id === tenantId)?.name;
  const organisationName = orgsForTenant.find(
    o => o.id === organisationId,
  )?.name;

  useEffect(() => {
    if (tenantId && tenantOptions.some(t => t.id === tenantId)) return;
    setTenantId(
      tenantOptions.find(t => t.id === appContext?.tenantId)?.id ??
        (tenantOptions.length === 1 ? tenantOptions[0].id : null),
    );
  }, [tenantOptions, appContext?.tenantId, tenantId]);

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

  // When the chosen scope is the app's own context, the normal client already
  // serves it. Anything else needs a token issued for that scope.
  const inAppContext =
    tenantId === (appContext?.tenantId ?? null) &&
    organisationId === (appContext?.organisationId ?? null);

  /*
   * A ticket can only be raised where Helpdesk is licensed, and identity
   * refuses a token anywhere else. Asked as soon as the scope is chosen, so
   * the requester learns it on the Details step instead of after answering
   * every question. The token it returns is the one Create then uses.
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

  const category: CategorySpec | undefined = useMemo(
    () => REQUEST_CATEGORIES.find(c => c.key === categoryKey),
    [categoryKey],
  );

  const step = STEPS[stepIndex];
  const siteDetailsRequired = !category?.remote;

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

  const contactDetails = {
    location,
    name: contactName,
    phone,
    email: contactEmail,
  };

  /**
   * Vehicles picked for the previous organisation are not this one's, so a
   * change of company or organisation clears them.
   */
  const changeScope = (next: {
    tenantId?: string | null;
    organisationId?: string | null;
  }) => {
    if ('tenantId' in next) {
      setTenantId(next.tenantId ?? null);
      setOrganisationId(null);
      // Contacts belong to a company, so another company starts again.
      setContact(null);
      setNewContactEmail('');
    }
    if ('organisationId' in next) {
      setOrganisationId(next.organisationId ?? null);
    }
    const assetKeys = new Set(
      (category?.fields ?? []).filter(f => f.kind === 'asset').map(f => f.key),
    );
    if (assetKeys.size === 0) return;
    setPickedAssets({});
    setAnswers(prev =>
      Object.fromEntries(
        Object.entries(prev).filter(([k]) => !assetKeys.has(k)),
      ),
    );
  };

  const submit = async () => {
    if (!category || !resolvedCategoryId) return;
    setSubmitError(null);
    const notify =
      isStaff && notifyContact && !!contact && contact.kind !== 'self';
    const ticket = {
      subject: subject.trim(),
      description: buildDescription({
        category,
        answers,
        contact: contactDetails,
      }),
      priority: urgencyToPriority(answers.urgency),
      categoryId: resolvedCategoryId,
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
      if (canLinkAssets) {
        await linkPickedAssets(created.id, created.linkAsset);
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      // The create response carries no send result, and the ticket exists
      // either way, so the mailbox status already known here decides it.
      if (notify && !mailboxConnected) {
        toast('Ticket created', {
          description:
            "The confirmation email wasn't sent because your mailbox isn't connected.",
          variant: 'warning',
        });
      }
      onCreated?.(created.id);
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
   * linked assets rather than only as a name in the description. The picker
   * lists Asset app records, so every chosen vehicle has an id to link.
   *
   * Best effort, and deliberately so: the ticket already exists and already
   * names every vehicle, so a link that fails (for example a requester without
   * permission to edit links) loses nothing the agent needs. Failing the whole
   * request over it would be worse.
   */
  const linkPickedAssets = async (
    ticketId: string,
    link: (assetId: string) => Promise<unknown>,
  ) => {
    const assetIds = [
      ...new Set(
        Object.values(pickedAssets)
          .flat()
          .map(a => a.assetId)
          .filter((x): x is string => !!x),
      ),
    ];
    const results = await Promise.allSettled(
      assetIds.map(assetId => link(assetId)),
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(
        `New request ${ticketId}: ${failed} of ${assetIds.length} vehicle links failed; the vehicles are still named in the description.`,
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
          {step.id === 'category' && (
            <div>
              <p className="mb-0.5 text-[15px] font-semibold">
                What is your request about?
              </p>
              <p className="text-light-gray mb-3 text-[13px]">
                Pick a category. The questions on the next steps are tailored to
                your choice.
              </p>
              {/*
              Cards rather than bare text buttons: an icon to scan by, the
              request type, and one line on what it is for, so the choice can
              be made without reading every label in full. One choice only, so
              they are a radio group to assistive technology.

              All ten fit without scrolling on a laptop screen. The dialog is
              wide enough for most labels and summaries to sit on one line, and
              on a screen too short for that (under 620px of page height) the
              summaries drop out and the labels alone carry the choice.
            */}
              <div
                role="radiogroup"
                aria-label="Request category"
                className="grid grid-cols-1 gap-1.5 sm:grid-cols-2"
              >
                {REQUEST_CATEGORIES.map(c => {
                  const selected = categoryKey === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setCategoryKey(c.key);
                        setAnswers({});
                        setPickedAssets({});
                        setQuestionPage(0);
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
                {isStaff
                  ? 'Who the request is for, and how to reach them.'
                  : 'How to reach you. Your name and email come from your account.'}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {tenantLocked ? (
                  <BaseInput
                    label="Tenant"
                    value={tenantName ?? ''}
                    isReadOnly
                  />
                ) : (
                  <ScopeSelect
                    label="Tenant"
                    options={tenantOptions}
                    value={tenantId}
                    onChange={id => changeScope({ tenantId: id })}
                    placeholder="Choose a tenant"
                  />
                )}
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
                    onChange={id => changeScope({ organisationId: id })}
                    placeholder="Choose an organisation"
                    isDisabled={!tenantId}
                  />
                )}
                {scopeUnavailable && (
                  <p className="text-red-dark -mt-2 text-xs sm:col-span-2">
                    Helpdesk isn't enabled for {tenantName ?? 'this company'},
                    so requests can't be raised there. Choose another tenant, or
                    ask an admin to enable Helpdesk for it.
                  </p>
                )}
                {showErrors && !scopeComplete && (
                  <p className="text-red-dark -mt-2 text-xs sm:col-span-2">
                    {tenantId
                      ? 'Choose the organisation this request is for.'
                      : 'Choose the tenant this request is for.'}
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
                    {category.section ?? 'A few details about the problem'}
                  </p>
                  <p className="text-light-gray text-[13px]">
                    All answers are required. They save a round trip before
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
                This is how your ticket will look to Netcorp support.
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
                      {resolvedCategory?.name ?? category.label}
                    </span>
                    <span className="bg-light/60 text-gray rounded-md px-2 py-0.5 dark:text-light">
                      Priority: {urgencyToPriority(answers.urgency)}
                    </span>
                    {tenantName && (
                      <span className="bg-light/60 text-gray rounded-md px-2 py-0.5 dark:text-light">
                        {scopePath(tenantName, organisationName)}
                      </span>
                    )}
                    <span className="bg-light/60 text-gray rounded-md px-2 py-0.5 dark:text-light">
                      Goes to Netcorp support
                    </span>
                  </div>
                </div>
                <div className="max-h-[min(36vh,320px)] overflow-y-auto px-4 py-1 text-sm">
                  <TicketDescriptionContent
                    value={buildDescription({
                      category,
                      answers,
                      contact: contactDetails,
                    })}
                  />
                </div>
              </div>
              {/*
                What happens next: the deadline the tenant's policy gives this
                ticket, and (staff only) the confirmation to the contact.
              */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DeadlinePreviewBox
                  priority={
                    urgencyToPriority(answers.urgency) as DeadlinePriority
                  }
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
    </RequestScopeContext.Provider>
  );
};
