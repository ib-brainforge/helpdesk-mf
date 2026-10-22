## @brainforgeau/helpdesk-client@v1

This generator creates TypeScript/JavaScript client that utilizes [axios](https://github.com/axios/axios). The generated Node module can be used in the following environments:

Environment
* Node.js
* Webpack
* Browserify

Language level
* ES5 - you must have a Promises/A+ library installed
* ES6

Module system
* CommonJS
* ES6 module system

It can be used in both TypeScript and JavaScript. In TypeScript, the definition will be automatically resolved via `package.json`. ([Reference](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html))

### Building

To build and compile the typescript sources to javascript use:
```
npm install
npm run build
```

### Publishing

First build the package then run `npm publish`

### Consuming

navigate to the folder of your consuming project and run one of the following commands.

_published:_

```
npm install @brainforgeau/helpdesk-client@v1 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
```

### Documentation for API Endpoints

All URIs are relative to *http://localhost*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*AdminImportExportApi* | [**v1AdminExportGet**](docs/AdminImportExportApi.md#v1adminexportget) | **GET** /v1/admin/export | Tenant data export — placeholder endpoint (HTTP 501).              Full export requires async job queuing and secure download link generation — deferred to a future release. Returns 501 with guidance. Contact support@brainforge.au for a full data extract.
*AdminImportExportApi* | [**v1AdminImportPost**](docs/AdminImportExportApi.md#v1adminimportpost) | **POST** /v1/admin/import | Tenant data import — placeholder endpoint (HTTP 501).              Accepts a .zip archive and runs FluentValidation (file size, extension). Does not process the file in this version — returns 501 with guidance. Contact support@brainforge.au for assisted migration of large datasets.
*AdminUsersApi* | [**v1AdminTenantUsersGet**](docs/AdminUsersApi.md#v1admintenantusersget) | **GET** /v1/admin/tenant-users | Returns all users known to this helpdesk tenant, inferred from ticket activity. Identity details (display name, email) are NOT returned here — resolve them from identity-management-client using the returned UserId.
*AdminUsersApi* | [**v1AdminUsersUserIdRolesGet**](docs/AdminUsersApi.md#v1adminusersuseridrolesget) | **GET** /v1/admin/users/{userId}/roles | Returns the explicit helpdesk role assignments for a specific user.
*AdminUsersApi* | [**v1AdminUsersUserIdRolesPost**](docs/AdminUsersApi.md#v1adminusersuseridrolespost) | **POST** /v1/admin/users/{userId}/roles | Assigns a helpdesk role to a user. Idempotent — calling with an existing assignment returns the existing ID. Supported roles: \&quot;agent\&quot;, \&quot;admin\&quot;, \&quot;customer\&quot;.
*AdminUsersApi* | [**v1AdminUsersUserIdRolesRoleNameDelete**](docs/AdminUsersApi.md#v1adminusersuseridrolesrolenamedelete) | **DELETE** /v1/admin/users/{userId}/roles/{roleName} | Removes a helpdesk role from a user. Idempotent — if the assignment does not exist, returns 200.
*AiAssistApi* | [**v1AiSuggestReplyPost**](docs/AiAssistApi.md#v1aisuggestreplypost) | **POST** /v1/ai/suggest-reply | Get an AI-generated reply suggestion for a ticket.              Requires AI features to be enabled and configured for the tenant. Returns a stub response until a real AI provider is integrated.
*AiAssistApi* | [**v1AiTicketSummaryPost**](docs/AiAssistApi.md#v1aiticketsummarypost) | **POST** /v1/ai/ticket-summary | Get an AI-generated summary for a ticket.              Requires AI features to be enabled and configured for the tenant. Returns a stub response until a real AI provider is integrated.
*AiToolsApi* | [**apiAiToolsGetKbArticlePost**](docs/AiToolsApi.md#apiaitoolsgetkbarticlepost) | **POST** /api/ai-tools/get_kb_article | READ — one knowledge base article, without counting a view. Twin: GET v1/kb/articles/{id}.
*AiToolsApi* | [**apiAiToolsGetSlaCompliancePost**](docs/AiToolsApi.md#apiaitoolsgetslacompliancepost) | **POST** /api/ai-tools/get_sla_compliance | READ — SLA compliance over a bounded window. Twin: GET v1/reports/sla-compliance.
*AiToolsApi* | [**apiAiToolsGetSummaryReportPost**](docs/AiToolsApi.md#apiaitoolsgetsummaryreportpost) | **POST** /api/ai-tools/get_summary_report | READ — summary report over a bounded window. Twin: GET v1/reports/summary.
*AiToolsApi* | [**apiAiToolsGetTechPerformancePost**](docs/AiToolsApi.md#apiaitoolsgettechperformancepost) | **POST** /api/ai-tools/get_tech_performance | READ — technician performance over a bounded window. Twin: GET v1/reports/tech-performance.
*AiToolsApi* | [**apiAiToolsGetTicketCountsPost**](docs/AiToolsApi.md#apiaitoolsgetticketcountspost) | **POST** /api/ai-tools/get_ticket_counts | READ — queue counts over the caller\&#39;s visible tickets. Twin: GET v1/tickets/counts.
*AiToolsApi* | [**apiAiToolsGetTicketPost**](docs/AiToolsApi.md#apiaitoolsgetticketpost) | **POST** /api/ai-tools/get_ticket | READ — one visible ticket. Twin: GET v1/tickets/{id}.
*AiToolsApi* | [**apiAiToolsGetTicketSlaStatusPost**](docs/AiToolsApi.md#apiaitoolsgetticketslastatuspost) | **POST** /api/ai-tools/get_ticket_sla_status | READ — the SLA timer of one visible ticket. Twin: GET v1/sla/ticket/{ticketId}.
*AiToolsApi* | [**apiAiToolsListCategoriesPost**](docs/AiToolsApi.md#apiaitoolslistcategoriespost) | **POST** /api/ai-tools/list_categories | READ — ticket categories. Twin: GET v1/categories.
*AiToolsApi* | [**apiAiToolsListTicketCommentsPost**](docs/AiToolsApi.md#apiaitoolslistticketcommentspost) | **POST** /api/ai-tools/list_ticket_comments | READ — public replies on one visible ticket. Twin: GET v1/tickets/{ticketId}/comments.
*AiToolsApi* | [**apiAiToolsListTicketsPost**](docs/AiToolsApi.md#apiaitoolslistticketspost) | **POST** /api/ai-tools/list_tickets | READ — one page of the caller\&#39;s visible tickets. Twin: GET v1/tickets.
*AiToolsApi* | [**apiAiToolsSearchKbArticlesPost**](docs/AiToolsApi.md#apiaitoolssearchkbarticlespost) | **POST** /api/ai-tools/search_kb_articles | READ — knowledge base search. Twin: GET v1/kb/articles/search.
*AppSettingsApi* | [**v1AppSettingsGet**](docs/AppSettingsApi.md#v1appsettingsget) | **GET** /v1/app-settings | 
*AppSettingsApi* | [**v1AppSettingsIdDelete**](docs/AppSettingsApi.md#v1appsettingsiddelete) | **DELETE** /v1/app-settings/{id} | 
*AppSettingsApi* | [**v1AppSettingsIdGet**](docs/AppSettingsApi.md#v1appsettingsidget) | **GET** /v1/app-settings/{id} | 
*AppSettingsApi* | [**v1AppSettingsIdPut**](docs/AppSettingsApi.md#v1appsettingsidput) | **PUT** /v1/app-settings/{id} | 
*AppSettingsApi* | [**v1AppSettingsPost**](docs/AppSettingsApi.md#v1appsettingspost) | **POST** /v1/app-settings | 
*ApprovalWorkflowsApi* | [**v1ApprovalWorkflowsGet**](docs/ApprovalWorkflowsApi.md#v1approvalworkflowsget) | **GET** /v1/approval-workflows | 
*ApprovalWorkflowsApi* | [**v1ApprovalWorkflowsIdDelete**](docs/ApprovalWorkflowsApi.md#v1approvalworkflowsiddelete) | **DELETE** /v1/approval-workflows/{id} | 
*ApprovalWorkflowsApi* | [**v1ApprovalWorkflowsIdGet**](docs/ApprovalWorkflowsApi.md#v1approvalworkflowsidget) | **GET** /v1/approval-workflows/{id} | 
*ApprovalWorkflowsApi* | [**v1ApprovalWorkflowsIdPut**](docs/ApprovalWorkflowsApi.md#v1approvalworkflowsidput) | **PUT** /v1/approval-workflows/{id} | 
*ApprovalWorkflowsApi* | [**v1ApprovalWorkflowsPost**](docs/ApprovalWorkflowsApi.md#v1approvalworkflowspost) | **POST** /v1/approval-workflows | 
*ApprovalsApi* | [**v1ApprovalsIdCancelPost**](docs/ApprovalsApi.md#v1approvalsidcancelpost) | **POST** /v1/approvals/{id}/cancel | 
*ApprovalsApi* | [**v1ApprovalsIdDecidePost**](docs/ApprovalsApi.md#v1approvalsiddecidepost) | **POST** /v1/approvals/{id}/decide | 
*ApprovalsApi* | [**v1ApprovalsPendingGet**](docs/ApprovalsApi.md#v1approvalspendingget) | **GET** /v1/approvals/pending | 
*ApprovalsApi* | [**v1ApprovalsRequestPost**](docs/ApprovalsApi.md#v1approvalsrequestpost) | **POST** /v1/approvals/request | 
*ApprovalsApi* | [**v1ApprovalsTicketTicketIdGet**](docs/ApprovalsApi.md#v1approvalsticketticketidget) | **GET** /v1/approvals/ticket/{ticketId} | 
*AttachmentsApi* | [**v1AttachmentsDownloadStorageKeyGet**](docs/AttachmentsApi.md#v1attachmentsdownloadstoragekeyget) | **GET** /v1/attachments/download/{storageKey} | 
*AttachmentsApi* | [**v1AttachmentsIdDelete**](docs/AttachmentsApi.md#v1attachmentsiddelete) | **DELETE** /v1/attachments/{id} | 
*AttachmentsApi* | [**v1AttachmentsIdGet**](docs/AttachmentsApi.md#v1attachmentsidget) | **GET** /v1/attachments/{id} | 
*AttachmentsApi* | [**v1AttachmentsTicketTicketIdGet**](docs/AttachmentsApi.md#v1attachmentsticketticketidget) | **GET** /v1/attachments/ticket/{ticketId} | 
*AttachmentsApi* | [**v1AttachmentsUploadPost**](docs/AttachmentsApi.md#v1attachmentsuploadpost) | **POST** /v1/attachments/upload | 
*AutoCloseConfigApi* | [**v1AutoCloseConfigIdGet**](docs/AutoCloseConfigApi.md#v1autocloseconfigidget) | **GET** /v1/auto-close-config/{id} | 
*AutoCloseConfigApi* | [**v1AutoCloseConfigIdPut**](docs/AutoCloseConfigApi.md#v1autocloseconfigidput) | **PUT** /v1/auto-close-config/{id} | 
*AutoCloseConfigApi* | [**v1AutoCloseConfigPost**](docs/AutoCloseConfigApi.md#v1autocloseconfigpost) | **POST** /v1/auto-close-config | 
*CannedResponsesApi* | [**v1CannedResponsesGet**](docs/CannedResponsesApi.md#v1cannedresponsesget) | **GET** /v1/canned-responses | 
*CannedResponsesApi* | [**v1CannedResponsesIdDelete**](docs/CannedResponsesApi.md#v1cannedresponsesiddelete) | **DELETE** /v1/canned-responses/{id} | 
*CannedResponsesApi* | [**v1CannedResponsesIdPut**](docs/CannedResponsesApi.md#v1cannedresponsesidput) | **PUT** /v1/canned-responses/{id} | 
*CannedResponsesApi* | [**v1CannedResponsesPost**](docs/CannedResponsesApi.md#v1cannedresponsespost) | **POST** /v1/canned-responses | 
*CategoriesApi* | [**v1CategoriesGet**](docs/CategoriesApi.md#v1categoriesget) | **GET** /v1/categories | 
*CategoriesApi* | [**v1CategoriesIdDelete**](docs/CategoriesApi.md#v1categoriesiddelete) | **DELETE** /v1/categories/{id} | 
*CategoriesApi* | [**v1CategoriesIdDuplicatePost**](docs/CategoriesApi.md#v1categoriesidduplicatepost) | **POST** /v1/categories/{id}/duplicate | 
*CategoriesApi* | [**v1CategoriesIdGet**](docs/CategoriesApi.md#v1categoriesidget) | **GET** /v1/categories/{id} | 
*CategoriesApi* | [**v1CategoriesIdPortalEnquiryPatch**](docs/CategoriesApi.md#v1categoriesidportalenquirypatch) | **PATCH** /v1/categories/{id}/portal-enquiry | 
*CategoriesApi* | [**v1CategoriesIdPut**](docs/CategoriesApi.md#v1categoriesidput) | **PUT** /v1/categories/{id} | 
*CategoriesApi* | [**v1CategoriesIdWorkflowPatch**](docs/CategoriesApi.md#v1categoriesidworkflowpatch) | **PATCH** /v1/categories/{id}/workflow | 
*CategoriesApi* | [**v1CategoriesPost**](docs/CategoriesApi.md#v1categoriespost) | **POST** /v1/categories | 
*CategoriesApi* | [**v1CategoriesSectionsGet**](docs/CategoriesApi.md#v1categoriessectionsget) | **GET** /v1/categories/sections | 
*CategoriesApi* | [**v1CategoriesSectionsIdDelete**](docs/CategoriesApi.md#v1categoriessectionsiddelete) | **DELETE** /v1/categories/sections/{id} | 
*CategoriesApi* | [**v1CategoriesSectionsIdPut**](docs/CategoriesApi.md#v1categoriessectionsidput) | **PUT** /v1/categories/sections/{id} | 
*CategoriesApi* | [**v1CategoriesSectionsPost**](docs/CategoriesApi.md#v1categoriessectionspost) | **POST** /v1/categories/sections | 
*CommentsApi* | [**v1TicketsTicketIdCommentsGet**](docs/CommentsApi.md#v1ticketsticketidcommentsget) | **GET** /v1/tickets/{ticketId}/comments | 
*CommentsApi* | [**v1TicketsTicketIdCommentsInternalNotesPost**](docs/CommentsApi.md#v1ticketsticketidcommentsinternalnotespost) | **POST** /v1/tickets/{ticketId}/comments/internal-notes | 
*CommentsApi* | [**v1TicketsTicketIdCommentsPost**](docs/CommentsApi.md#v1ticketsticketidcommentspost) | **POST** /v1/tickets/{ticketId}/comments | 
*ContactsApi* | [**v1ContactsGet**](docs/ContactsApi.md#v1contactsget) | **GET** /v1/contacts | 
*ContactsApi* | [**v1ContactsIdGet**](docs/ContactsApi.md#v1contactsidget) | **GET** /v1/contacts/{id} | 
*ContactsApi* | [**v1ContactsIdPut**](docs/ContactsApi.md#v1contactsidput) | **PUT** /v1/contacts/{id} | 
*ContactsApi* | [**v1ContactsPost**](docs/ContactsApi.md#v1contactspost) | **POST** /v1/contacts | 
*CustomFieldsApi* | [**v1CustomFieldsGet**](docs/CustomFieldsApi.md#v1customfieldsget) | **GET** /v1/custom-fields | 
*CustomFieldsApi* | [**v1CustomFieldsIdDelete**](docs/CustomFieldsApi.md#v1customfieldsiddelete) | **DELETE** /v1/custom-fields/{id} | 
*CustomFieldsApi* | [**v1CustomFieldsIdPut**](docs/CustomFieldsApi.md#v1customfieldsidput) | **PUT** /v1/custom-fields/{id} | 
*CustomFieldsApi* | [**v1CustomFieldsPost**](docs/CustomFieldsApi.md#v1customfieldspost) | **POST** /v1/custom-fields | 
*CustomFieldsApi* | [**v1CustomFieldsValuesBulkPost**](docs/CustomFieldsApi.md#v1customfieldsvaluesbulkpost) | **POST** /v1/custom-fields/values/bulk | 
*CustomFieldsApi* | [**v1CustomFieldsValuesGet**](docs/CustomFieldsApi.md#v1customfieldsvaluesget) | **GET** /v1/custom-fields/values | 
*CustomFieldsApi* | [**v1CustomFieldsValuesPost**](docs/CustomFieldsApi.md#v1customfieldsvaluespost) | **POST** /v1/custom-fields/values | 
*CustomPrioritiesApi* | [**v1CustomPrioritiesGet**](docs/CustomPrioritiesApi.md#v1customprioritiesget) | **GET** /v1/custom-priorities | 
*CustomPrioritiesApi* | [**v1CustomPrioritiesIdDelete**](docs/CustomPrioritiesApi.md#v1customprioritiesiddelete) | **DELETE** /v1/custom-priorities/{id} | 
*CustomPrioritiesApi* | [**v1CustomPrioritiesIdPut**](docs/CustomPrioritiesApi.md#v1customprioritiesidput) | **PUT** /v1/custom-priorities/{id} | 
*CustomPrioritiesApi* | [**v1CustomPrioritiesPost**](docs/CustomPrioritiesApi.md#v1customprioritiespost) | **POST** /v1/custom-priorities | 
*CustomStatusesApi* | [**v1CustomStatusesGet**](docs/CustomStatusesApi.md#v1customstatusesget) | **GET** /v1/custom-statuses | 
*CustomStatusesApi* | [**v1CustomStatusesIdDelete**](docs/CustomStatusesApi.md#v1customstatusesiddelete) | **DELETE** /v1/custom-statuses/{id} | 
*CustomStatusesApi* | [**v1CustomStatusesIdPut**](docs/CustomStatusesApi.md#v1customstatusesidput) | **PUT** /v1/custom-statuses/{id} | 
*CustomStatusesApi* | [**v1CustomStatusesPost**](docs/CustomStatusesApi.md#v1customstatusespost) | **POST** /v1/custom-statuses | 
*IdeasApi* | [**v1IdeasGet**](docs/IdeasApi.md#v1ideasget) | **GET** /v1/ideas | 
*IntegrationsApi* | [**v1IntegrationsGet**](docs/IntegrationsApi.md#v1integrationsget) | **GET** /v1/integrations | 
*IntegrationsApi* | [**v1IntegrationsIdDelete**](docs/IntegrationsApi.md#v1integrationsiddelete) | **DELETE** /v1/integrations/{id} | 
*IntegrationsApi* | [**v1IntegrationsIdPut**](docs/IntegrationsApi.md#v1integrationsidput) | **PUT** /v1/integrations/{id} | 
*IntegrationsApi* | [**v1IntegrationsPost**](docs/IntegrationsApi.md#v1integrationspost) | **POST** /v1/integrations | 
*KnowledgeBaseApi* | [**v1KbArticlesBySlugSlugGet**](docs/KnowledgeBaseApi.md#v1kbarticlesbyslugslugget) | **GET** /v1/kb/articles/by-slug/{slug} | 
*KnowledgeBaseApi* | [**v1KbArticlesFromTicketPost**](docs/KnowledgeBaseApi.md#v1kbarticlesfromticketpost) | **POST** /v1/kb/articles/from-ticket | 
*KnowledgeBaseApi* | [**v1KbArticlesGet**](docs/KnowledgeBaseApi.md#v1kbarticlesget) | **GET** /v1/kb/articles | 
*KnowledgeBaseApi* | [**v1KbArticlesIdArchivePost**](docs/KnowledgeBaseApi.md#v1kbarticlesidarchivepost) | **POST** /v1/kb/articles/{id}/archive | 
*KnowledgeBaseApi* | [**v1KbArticlesIdDelete**](docs/KnowledgeBaseApi.md#v1kbarticlesiddelete) | **DELETE** /v1/kb/articles/{id} | 
*KnowledgeBaseApi* | [**v1KbArticlesIdGet**](docs/KnowledgeBaseApi.md#v1kbarticlesidget) | **GET** /v1/kb/articles/{id} | 
*KnowledgeBaseApi* | [**v1KbArticlesIdPublishPost**](docs/KnowledgeBaseApi.md#v1kbarticlesidpublishpost) | **POST** /v1/kb/articles/{id}/publish | 
*KnowledgeBaseApi* | [**v1KbArticlesIdPut**](docs/KnowledgeBaseApi.md#v1kbarticlesidput) | **PUT** /v1/kb/articles/{id} | 
*KnowledgeBaseApi* | [**v1KbArticlesIdRatePost**](docs/KnowledgeBaseApi.md#v1kbarticlesidratepost) | **POST** /v1/kb/articles/{id}/rate | 
*KnowledgeBaseApi* | [**v1KbArticlesIdUnpublishPost**](docs/KnowledgeBaseApi.md#v1kbarticlesidunpublishpost) | **POST** /v1/kb/articles/{id}/unpublish | 
*KnowledgeBaseApi* | [**v1KbArticlesPost**](docs/KnowledgeBaseApi.md#v1kbarticlespost) | **POST** /v1/kb/articles | 
*KnowledgeBaseApi* | [**v1KbArticlesSearchGet**](docs/KnowledgeBaseApi.md#v1kbarticlessearchget) | **GET** /v1/kb/articles/search | 
*KnowledgeBaseApi* | [**v1KbArticlesSuggestionsGet**](docs/KnowledgeBaseApi.md#v1kbarticlessuggestionsget) | **GET** /v1/kb/articles/suggestions | 
*KnowledgeBaseApi* | [**v1KbCategoriesGet**](docs/KnowledgeBaseApi.md#v1kbcategoriesget) | **GET** /v1/kb/categories | 
*KnowledgeBaseApi* | [**v1KbCategoriesIdDelete**](docs/KnowledgeBaseApi.md#v1kbcategoriesiddelete) | **DELETE** /v1/kb/categories/{id} | 
*KnowledgeBaseApi* | [**v1KbCategoriesIdDuplicatePost**](docs/KnowledgeBaseApi.md#v1kbcategoriesidduplicatepost) | **POST** /v1/kb/categories/{id}/duplicate | 
*KnowledgeBaseApi* | [**v1KbCategoriesIdPut**](docs/KnowledgeBaseApi.md#v1kbcategoriesidput) | **PUT** /v1/kb/categories/{id} | 
*KnowledgeBaseApi* | [**v1KbCategoriesPost**](docs/KnowledgeBaseApi.md#v1kbcategoriespost) | **POST** /v1/kb/categories | 
*KnowledgeBaseApi* | [**v1KbExportGet**](docs/KnowledgeBaseApi.md#v1kbexportget) | **GET** /v1/kb/export | 
*KnowledgeBaseApi* | [**v1KbImportPost**](docs/KnowledgeBaseApi.md#v1kbimportpost) | **POST** /v1/kb/import | 
*KnowledgeBaseApi* | [**v1KbTagsGet**](docs/KnowledgeBaseApi.md#v1kbtagsget) | **GET** /v1/kb/tags | 
*KnowledgeBaseApi* | [**v1KbTagsPost**](docs/KnowledgeBaseApi.md#v1kbtagspost) | **POST** /v1/kb/tags | 
*LiveChatApi* | [**v1LiveChatConfigGet**](docs/LiveChatApi.md#v1livechatconfigget) | **GET** /v1/live-chat/config | 
*LiveChatApi* | [**v1LiveChatConfigPut**](docs/LiveChatApi.md#v1livechatconfigput) | **PUT** /v1/live-chat/config | 
*LiveChatApi* | [**v1LiveChatEmbedScriptGet**](docs/LiveChatApi.md#v1livechatembedscriptget) | **GET** /v1/live-chat/embed-script | 
*PlatformCategoriesApi* | [**v1PlatformCategoriesGet**](docs/PlatformCategoriesApi.md#v1platformcategoriesget) | **GET** /v1/platform/categories | 
*PlatformMyCategoriesApi* | [**v1PlatformMyCategoriesGet**](docs/PlatformMyCategoriesApi.md#v1platformmycategoriesget) | **GET** /v1/platform/my-categories | 
*PlatformSelfServiceTicketsApi* | [**v1PlatformMyTicketsGet**](docs/PlatformSelfServiceTicketsApi.md#v1platformmyticketsget) | **GET** /v1/platform/my-tickets | 
*PlatformSelfServiceTicketsApi* | [**v1PlatformMyTicketsIdCommentsGet**](docs/PlatformSelfServiceTicketsApi.md#v1platformmyticketsidcommentsget) | **GET** /v1/platform/my-tickets/{id}/comments | 
*PlatformSelfServiceTicketsApi* | [**v1PlatformMyTicketsIdCommentsPost**](docs/PlatformSelfServiceTicketsApi.md#v1platformmyticketsidcommentspost) | **POST** /v1/platform/my-tickets/{id}/comments | 
*PlatformSelfServiceTicketsApi* | [**v1PlatformMyTicketsIdGet**](docs/PlatformSelfServiceTicketsApi.md#v1platformmyticketsidget) | **GET** /v1/platform/my-tickets/{id} | 
*PlatformSelfServiceTicketsApi* | [**v1PlatformMyTicketsPost**](docs/PlatformSelfServiceTicketsApi.md#v1platformmyticketspost) | **POST** /v1/platform/my-tickets | 
*PlatformTicketsApi* | [**v1PlatformTicketsGet**](docs/PlatformTicketsApi.md#v1platformticketsget) | **GET** /v1/platform/tickets | 
*PlatformTicketsApi* | [**v1PlatformTicketsIdAssignPatch**](docs/PlatformTicketsApi.md#v1platformticketsidassignpatch) | **PATCH** /v1/platform/tickets/{id}/assign | 
*PlatformTicketsApi* | [**v1PlatformTicketsIdCategoryPatch**](docs/PlatformTicketsApi.md#v1platformticketsidcategorypatch) | **PATCH** /v1/platform/tickets/{id}/category | 
*PlatformTicketsApi* | [**v1PlatformTicketsIdCommentsGet**](docs/PlatformTicketsApi.md#v1platformticketsidcommentsget) | **GET** /v1/platform/tickets/{id}/comments | 
*PlatformTicketsApi* | [**v1PlatformTicketsIdCommentsPost**](docs/PlatformTicketsApi.md#v1platformticketsidcommentspost) | **POST** /v1/platform/tickets/{id}/comments | 
*PlatformTicketsApi* | [**v1PlatformTicketsIdGet**](docs/PlatformTicketsApi.md#v1platformticketsidget) | **GET** /v1/platform/tickets/{id} | 
*PlatformTicketsApi* | [**v1PlatformTicketsIdPriorityPatch**](docs/PlatformTicketsApi.md#v1platformticketsidprioritypatch) | **PATCH** /v1/platform/tickets/{id}/priority | 
*PlatformTicketsApi* | [**v1PlatformTicketsIdPut**](docs/PlatformTicketsApi.md#v1platformticketsidput) | **PUT** /v1/platform/tickets/{id} | 
*PlatformTicketsApi* | [**v1PlatformTicketsIdStatusPatch**](docs/PlatformTicketsApi.md#v1platformticketsidstatuspatch) | **PATCH** /v1/platform/tickets/{id}/status | 
*PlatformTicketsApi* | [**v1PlatformTicketsPost**](docs/PlatformTicketsApi.md#v1platformticketspost) | **POST** /v1/platform/tickets | 
*PortalEnquiriesApi* | [**v1PortalEnquiriesGet**](docs/PortalEnquiriesApi.md#v1portalenquiriesget) | **GET** /v1/portal/enquiries | 
*PortalEnquiriesApi* | [**v1PortalEnquiriesIdGet**](docs/PortalEnquiriesApi.md#v1portalenquiriesidget) | **GET** /v1/portal/enquiries/{id} | 
*PortalEnquiriesApi* | [**v1PortalEnquiriesIdRepliesPost**](docs/PortalEnquiriesApi.md#v1portalenquiriesidrepliespost) | **POST** /v1/portal/enquiries/{id}/replies | 
*PortalEnquiriesApi* | [**v1PortalEnquiriesPost**](docs/PortalEnquiriesApi.md#v1portalenquiriespost) | **POST** /v1/portal/enquiries | 
*PortalHelpApi* | [**v1PortalHelpAnnouncementsGet**](docs/PortalHelpApi.md#v1portalhelpannouncementsget) | **GET** /v1/portal/help/announcements | 
*PortalHelpApi* | [**v1PortalHelpAnnouncementsIdReadPost**](docs/PortalHelpApi.md#v1portalhelpannouncementsidreadpost) | **POST** /v1/portal/help/announcements/{id}/read | 
*PortalHelpApi* | [**v1PortalHelpAnnouncementsUnreadCountGet**](docs/PortalHelpApi.md#v1portalhelpannouncementsunreadcountget) | **GET** /v1/portal/help/announcements/unread-count | 
*PortalHelpApi* | [**v1PortalHelpArticlesGet**](docs/PortalHelpApi.md#v1portalhelparticlesget) | **GET** /v1/portal/help/articles | 
*PortalHelpApi* | [**v1PortalHelpArticlesSlugGet**](docs/PortalHelpApi.md#v1portalhelparticlesslugget) | **GET** /v1/portal/help/articles/{slug} | 
*PortalHelpApi* | [**v1PortalHelpCategoriesGet**](docs/PortalHelpApi.md#v1portalhelpcategoriesget) | **GET** /v1/portal/help/categories | 
*PrincipalApprovalsApi* | [**v1PrincipalsPrincipalIdApprovalWorkflowsGet**](docs/PrincipalApprovalsApi.md#v1principalsprincipalidapprovalworkflowsget) | **GET** /v1/principals/{principalId}/approval-workflows | 
*PrincipalApprovalsApi* | [**v1PrincipalsPrincipalIdApprovalWorkflowsIdDelete**](docs/PrincipalApprovalsApi.md#v1principalsprincipalidapprovalworkflowsiddelete) | **DELETE** /v1/principals/{principalId}/approval-workflows/{id} | 
*PrincipalApprovalsApi* | [**v1PrincipalsPrincipalIdApprovalWorkflowsIdGet**](docs/PrincipalApprovalsApi.md#v1principalsprincipalidapprovalworkflowsidget) | **GET** /v1/principals/{principalId}/approval-workflows/{id} | 
*PrincipalApprovalsApi* | [**v1PrincipalsPrincipalIdApprovalWorkflowsIdPut**](docs/PrincipalApprovalsApi.md#v1principalsprincipalidapprovalworkflowsidput) | **PUT** /v1/principals/{principalId}/approval-workflows/{id} | 
*PrincipalApprovalsApi* | [**v1PrincipalsPrincipalIdApprovalWorkflowsPost**](docs/PrincipalApprovalsApi.md#v1principalsprincipalidapprovalworkflowspost) | **POST** /v1/principals/{principalId}/approval-workflows | 
*PrincipalCategoriesApi* | [**v1PrincipalsPrincipalIdCategoriesGet**](docs/PrincipalCategoriesApi.md#v1principalsprincipalidcategoriesget) | **GET** /v1/principals/{principalId}/categories | 
*PrincipalCategoriesApi* | [**v1PrincipalsPrincipalIdCategoriesIdDelete**](docs/PrincipalCategoriesApi.md#v1principalsprincipalidcategoriesiddelete) | **DELETE** /v1/principals/{principalId}/categories/{id} | 
*PrincipalCategoriesApi* | [**v1PrincipalsPrincipalIdCategoriesIdGet**](docs/PrincipalCategoriesApi.md#v1principalsprincipalidcategoriesidget) | **GET** /v1/principals/{principalId}/categories/{id} | 
*PrincipalCategoriesApi* | [**v1PrincipalsPrincipalIdCategoriesIdPut**](docs/PrincipalCategoriesApi.md#v1principalsprincipalidcategoriesidput) | **PUT** /v1/principals/{principalId}/categories/{id} | 
*PrincipalCategoriesApi* | [**v1PrincipalsPrincipalIdCategoriesPost**](docs/PrincipalCategoriesApi.md#v1principalsprincipalidcategoriespost) | **POST** /v1/principals/{principalId}/categories | 
*PrincipalReportsApi* | [**v1PrincipalsPrincipalIdReportsTicketVolumeGet**](docs/PrincipalReportsApi.md#v1principalsprincipalidreportsticketvolumeget) | **GET** /v1/principals/{principalId}/reports/ticket-volume | 
*PrincipalSlaPoliciesApi* | [**v1PrincipalsPrincipalIdSlaPoliciesGet**](docs/PrincipalSlaPoliciesApi.md#v1principalsprincipalidslapoliciesget) | **GET** /v1/principals/{principalId}/sla-policies | 
*PrincipalSlaPoliciesApi* | [**v1PrincipalsPrincipalIdSlaPoliciesIdDelete**](docs/PrincipalSlaPoliciesApi.md#v1principalsprincipalidslapoliciesiddelete) | **DELETE** /v1/principals/{principalId}/sla-policies/{id} | 
*PrincipalSlaPoliciesApi* | [**v1PrincipalsPrincipalIdSlaPoliciesIdGet**](docs/PrincipalSlaPoliciesApi.md#v1principalsprincipalidslapoliciesidget) | **GET** /v1/principals/{principalId}/sla-policies/{id} | 
*PrincipalSlaPoliciesApi* | [**v1PrincipalsPrincipalIdSlaPoliciesIdPut**](docs/PrincipalSlaPoliciesApi.md#v1principalsprincipalidslapoliciesidput) | **PUT** /v1/principals/{principalId}/sla-policies/{id} | 
*PrincipalSlaPoliciesApi* | [**v1PrincipalsPrincipalIdSlaPoliciesPost**](docs/PrincipalSlaPoliciesApi.md#v1principalsprincipalidslapoliciespost) | **POST** /v1/principals/{principalId}/sla-policies | 
*PrincipalTicketsApi* | [**v1PrincipalsPrincipalIdTicketsCountsGet**](docs/PrincipalTicketsApi.md#v1principalsprincipalidticketscountsget) | **GET** /v1/principals/{principalId}/tickets/counts | 
*PrincipalTicketsApi* | [**v1PrincipalsPrincipalIdTicketsGet**](docs/PrincipalTicketsApi.md#v1principalsprincipalidticketsget) | **GET** /v1/principals/{principalId}/tickets | 
*PrincipalTicketsApi* | [**v1PrincipalsPrincipalIdTicketsIdAssignPatch**](docs/PrincipalTicketsApi.md#v1principalsprincipalidticketsidassignpatch) | **PATCH** /v1/principals/{principalId}/tickets/{id}/assign | 
*PrincipalTicketsApi* | [**v1PrincipalsPrincipalIdTicketsIdCategoryPatch**](docs/PrincipalTicketsApi.md#v1principalsprincipalidticketsidcategorypatch) | **PATCH** /v1/principals/{principalId}/tickets/{id}/category | 
*PrincipalTicketsApi* | [**v1PrincipalsPrincipalIdTicketsIdGet**](docs/PrincipalTicketsApi.md#v1principalsprincipalidticketsidget) | **GET** /v1/principals/{principalId}/tickets/{id} | 
*PrincipalTicketsApi* | [**v1PrincipalsPrincipalIdTicketsIdPriorityPatch**](docs/PrincipalTicketsApi.md#v1principalsprincipalidticketsidprioritypatch) | **PATCH** /v1/principals/{principalId}/tickets/{id}/priority | 
*PrincipalTicketsApi* | [**v1PrincipalsPrincipalIdTicketsIdStatusPatch**](docs/PrincipalTicketsApi.md#v1principalsprincipalidticketsidstatuspatch) | **PATCH** /v1/principals/{principalId}/tickets/{id}/status | 
*PrincipalTicketsApi* | [**v1PrincipalsPrincipalIdTicketsPost**](docs/PrincipalTicketsApi.md#v1principalsprincipalidticketspost) | **POST** /v1/principals/{principalId}/tickets | 
*PrincipalWorkflowsApi* | [**v1PrincipalsPrincipalIdWorkflowsGet**](docs/PrincipalWorkflowsApi.md#v1principalsprincipalidworkflowsget) | **GET** /v1/principals/{principalId}/workflows | 
*PrincipalWorkflowsApi* | [**v1PrincipalsPrincipalIdWorkflowsIdClonePost**](docs/PrincipalWorkflowsApi.md#v1principalsprincipalidworkflowsidclonepost) | **POST** /v1/principals/{principalId}/workflows/{id}/clone | 
*PrincipalWorkflowsApi* | [**v1PrincipalsPrincipalIdWorkflowsIdDelete**](docs/PrincipalWorkflowsApi.md#v1principalsprincipalidworkflowsiddelete) | **DELETE** /v1/principals/{principalId}/workflows/{id} | 
*PrincipalWorkflowsApi* | [**v1PrincipalsPrincipalIdWorkflowsIdDraftsPost**](docs/PrincipalWorkflowsApi.md#v1principalsprincipalidworkflowsiddraftspost) | **POST** /v1/principals/{principalId}/workflows/{id}/drafts | 
*PrincipalWorkflowsApi* | [**v1PrincipalsPrincipalIdWorkflowsIdDraftsVersionIdPublishPost**](docs/PrincipalWorkflowsApi.md#v1principalsprincipalidworkflowsiddraftsversionidpublishpost) | **POST** /v1/principals/{principalId}/workflows/{id}/drafts/{versionId}/publish | 
*PrincipalWorkflowsApi* | [**v1PrincipalsPrincipalIdWorkflowsIdDraftsVersionIdPut**](docs/PrincipalWorkflowsApi.md#v1principalsprincipalidworkflowsiddraftsversionidput) | **PUT** /v1/principals/{principalId}/workflows/{id}/drafts/{versionId} | 
*PrincipalWorkflowsApi* | [**v1PrincipalsPrincipalIdWorkflowsIdGet**](docs/PrincipalWorkflowsApi.md#v1principalsprincipalidworkflowsidget) | **GET** /v1/principals/{principalId}/workflows/{id} | 
*PrincipalWorkflowsApi* | [**v1PrincipalsPrincipalIdWorkflowsPost**](docs/PrincipalWorkflowsApi.md#v1principalsprincipalidworkflowspost) | **POST** /v1/principals/{principalId}/workflows | 
*ReadStatusApi* | [**v1TicketsTicketIdReadStatusPost**](docs/ReadStatusApi.md#v1ticketsticketidreadstatuspost) | **POST** /v1/tickets/{ticketId}/read-status | 
*ReadStatusApi* | [**v1TicketsUnreadCountGet**](docs/ReadStatusApi.md#v1ticketsunreadcountget) | **GET** /v1/tickets/unread-count | 
*RecurringTicketsApi* | [**v1RecurringTicketsGet**](docs/RecurringTicketsApi.md#v1recurringticketsget) | **GET** /v1/recurring-tickets | 
*RecurringTicketsApi* | [**v1RecurringTicketsIdDelete**](docs/RecurringTicketsApi.md#v1recurringticketsiddelete) | **DELETE** /v1/recurring-tickets/{id} | 
*RecurringTicketsApi* | [**v1RecurringTicketsIdExecutePost**](docs/RecurringTicketsApi.md#v1recurringticketsidexecutepost) | **POST** /v1/recurring-tickets/{id}/execute | 
*RecurringTicketsApi* | [**v1RecurringTicketsIdGet**](docs/RecurringTicketsApi.md#v1recurringticketsidget) | **GET** /v1/recurring-tickets/{id} | 
*RecurringTicketsApi* | [**v1RecurringTicketsIdPut**](docs/RecurringTicketsApi.md#v1recurringticketsidput) | **PUT** /v1/recurring-tickets/{id} | 
*RecurringTicketsApi* | [**v1RecurringTicketsPost**](docs/RecurringTicketsApi.md#v1recurringticketspost) | **POST** /v1/recurring-tickets | 
*ReportsApi* | [**v1ReportsAgentUtilizationGet**](docs/ReportsApi.md#v1reportsagentutilizationget) | **GET** /v1/reports/agent-utilization | 
*ReportsApi* | [**v1ReportsAssetsGet**](docs/ReportsApi.md#v1reportsassetsget) | **GET** /v1/reports/assets | 
*ReportsApi* | [**v1ReportsAuditLogGet**](docs/ReportsApi.md#v1reportsauditlogget) | **GET** /v1/reports/audit-log | 
*ReportsApi* | [**v1ReportsCompanyStatisticsGet**](docs/ReportsApi.md#v1reportscompanystatisticsget) | **GET** /v1/reports/company-statistics | 
*ReportsApi* | [**v1ReportsCustomPost**](docs/ReportsApi.md#v1reportscustompost) | **POST** /v1/reports/custom | 
*ReportsApi* | [**v1ReportsDeletedTicketsGet**](docs/ReportsApi.md#v1reportsdeletedticketsget) | **GET** /v1/reports/deleted-tickets | 
*ReportsApi* | [**v1ReportsDynamicsGet**](docs/ReportsApi.md#v1reportsdynamicsget) | **GET** /v1/reports/dynamics | 
*ReportsApi* | [**v1ReportsExportExecutionIdDownloadGet**](docs/ReportsApi.md#v1reportsexportexecutioniddownloadget) | **GET** /v1/reports/export/{executionId}/download | 
*ReportsApi* | [**v1ReportsExportExecutionIdStatusGet**](docs/ReportsApi.md#v1reportsexportexecutionidstatusget) | **GET** /v1/reports/export/{executionId}/status | 
*ReportsApi* | [**v1ReportsExportPost**](docs/ReportsApi.md#v1reportsexportpost) | **POST** /v1/reports/export | 
*ReportsApi* | [**v1ReportsOverdueTicketsGet**](docs/ReportsApi.md#v1reportsoverdueticketsget) | **GET** /v1/reports/overdue-tickets | 
*ReportsApi* | [**v1ReportsSlaComplianceGet**](docs/ReportsApi.md#v1reportsslacomplianceget) | **GET** /v1/reports/sla-compliance | 
*ReportsApi* | [**v1ReportsStatsGet**](docs/ReportsApi.md#v1reportsstatsget) | **GET** /v1/reports/stats | 
*ReportsApi* | [**v1ReportsSummaryGet**](docs/ReportsApi.md#v1reportssummaryget) | **GET** /v1/reports/summary | 
*ReportsApi* | [**v1ReportsTechPerformanceGet**](docs/ReportsApi.md#v1reportstechperformanceget) | **GET** /v1/reports/tech-performance | 
*ReportsApi* | [**v1ReportsTicketsByCategoryGet**](docs/ReportsApi.md#v1reportsticketsbycategoryget) | **GET** /v1/reports/tickets-by-category | 
*ReportsApi* | [**v1ReportsTicketsByPriorityGet**](docs/ReportsApi.md#v1reportsticketsbypriorityget) | **GET** /v1/reports/tickets-by-priority | 
*ReportsApi* | [**v1ReportsTicketsByStatusGet**](docs/ReportsApi.md#v1reportsticketsbystatusget) | **GET** /v1/reports/tickets-by-status | 
*RuleEvaluateApi* | [**v1RuleProjectsProjectIdEvaluateBulkPost**](docs/RuleEvaluateApi.md#v1ruleprojectsprojectidevaluatebulkpost) | **POST** /v1/rule-projects/{projectId}/evaluate/bulk | 
*RuleEvaluateApi* | [**v1RuleProjectsProjectIdEvaluateRuleKeyPost**](docs/RuleEvaluateApi.md#v1ruleprojectsprojectidevaluaterulekeypost) | **POST** /v1/rule-projects/{projectId}/evaluate/{ruleKey} | 
*RuleGraphsApi* | [**v1RuleProjectsProjectIdRulesGet**](docs/RuleGraphsApi.md#v1ruleprojectsprojectidrulesget) | **GET** /v1/rule-projects/{projectId}/rules | 
*RuleGraphsApi* | [**v1RuleProjectsProjectIdRulesIdDelete**](docs/RuleGraphsApi.md#v1ruleprojectsprojectidrulesiddelete) | **DELETE** /v1/rule-projects/{projectId}/rules/{id} | 
*RuleGraphsApi* | [**v1RuleProjectsProjectIdRulesIdDraftPatch**](docs/RuleGraphsApi.md#v1ruleprojectsprojectidrulesiddraftpatch) | **PATCH** /v1/rule-projects/{projectId}/rules/{id}/draft | 
*RuleGraphsApi* | [**v1RuleProjectsProjectIdRulesIdExecutionLogsGet**](docs/RuleGraphsApi.md#v1ruleprojectsprojectidrulesidexecutionlogsget) | **GET** /v1/rule-projects/{projectId}/rules/{id}/execution-logs | 
*RuleGraphsApi* | [**v1RuleProjectsProjectIdRulesIdGet**](docs/RuleGraphsApi.md#v1ruleprojectsprojectidrulesidget) | **GET** /v1/rule-projects/{projectId}/rules/{id} | 
*RuleGraphsApi* | [**v1RuleProjectsProjectIdRulesIdPublishPost**](docs/RuleGraphsApi.md#v1ruleprojectsprojectidrulesidpublishpost) | **POST** /v1/rule-projects/{projectId}/rules/{id}/publish | 
*RuleGraphsApi* | [**v1RuleProjectsProjectIdRulesIdPut**](docs/RuleGraphsApi.md#v1ruleprojectsprojectidrulesidput) | **PUT** /v1/rule-projects/{projectId}/rules/{id} | 
*RuleGraphsApi* | [**v1RuleProjectsProjectIdRulesIdVersionsGet**](docs/RuleGraphsApi.md#v1ruleprojectsprojectidrulesidversionsget) | **GET** /v1/rule-projects/{projectId}/rules/{id}/versions | 
*RuleGraphsApi* | [**v1RuleProjectsProjectIdRulesIdVersionsPost**](docs/RuleGraphsApi.md#v1ruleprojectsprojectidrulesidversionspost) | **POST** /v1/rule-projects/{projectId}/rules/{id}/versions | 
*RuleGraphsApi* | [**v1RuleProjectsProjectIdRulesIdVersionsVersionIdPublishPost**](docs/RuleGraphsApi.md#v1ruleprojectsprojectidrulesidversionsversionidpublishpost) | **POST** /v1/rule-projects/{projectId}/rules/{id}/versions/{versionId}/publish | 
*RuleGraphsApi* | [**v1RuleProjectsProjectIdRulesPost**](docs/RuleGraphsApi.md#v1ruleprojectsprojectidrulespost) | **POST** /v1/rule-projects/{projectId}/rules | 
*RuleProjectsApi* | [**v1RuleProjectsGet**](docs/RuleProjectsApi.md#v1ruleprojectsget) | **GET** /v1/rule-projects | 
*RuleProjectsApi* | [**v1RuleProjectsIdDelete**](docs/RuleProjectsApi.md#v1ruleprojectsiddelete) | **DELETE** /v1/rule-projects/{id} | 
*RuleProjectsApi* | [**v1RuleProjectsIdPut**](docs/RuleProjectsApi.md#v1ruleprojectsidput) | **PUT** /v1/rule-projects/{id} | 
*RuleProjectsApi* | [**v1RuleProjectsPost**](docs/RuleProjectsApi.md#v1ruleprojectspost) | **POST** /v1/rule-projects | 
*RuleValidationApi* | [**v1ValidateRuleExpressionPost**](docs/RuleValidationApi.md#v1validateruleexpressionpost) | **POST** /v1/validate/rule-expression | 
*RuleValidationApi* | [**v1ValidateRuleGraphPost**](docs/RuleValidationApi.md#v1validaterulegraphpost) | **POST** /v1/validate/rule-graph | 
*SatisfactionApi* | [**v1SatisfactionGet**](docs/SatisfactionApi.md#v1satisfactionget) | **GET** /v1/satisfaction | 
*SatisfactionApi* | [**v1SatisfactionIdPut**](docs/SatisfactionApi.md#v1satisfactionidput) | **PUT** /v1/satisfaction/{id} | 
*SatisfactionApi* | [**v1SatisfactionReportGet**](docs/SatisfactionApi.md#v1satisfactionreportget) | **GET** /v1/satisfaction/report | 
*SatisfactionApi* | [**v1SatisfactionSubmitPost**](docs/SatisfactionApi.md#v1satisfactionsubmitpost) | **POST** /v1/satisfaction/submit | 
*SatisfactionApi* | [**v1SatisfactionTicketTicketIdGet**](docs/SatisfactionApi.md#v1satisfactionticketticketidget) | **GET** /v1/satisfaction/ticket/{ticketId} | 
*ScopeApi* | [**v1ScopeEntityTypeIdPatch**](docs/ScopeApi.md#v1scopeentitytypeidpatch) | **PATCH** /v1/scope/{entityType}/{id} | 
*ScopeApi* | [**v1ScopeEntityTypePatch**](docs/ScopeApi.md#v1scopeentitytypepatch) | **PATCH** /v1/scope/{entityType} | 
*SlaApi* | [**v1SlaGet**](docs/SlaApi.md#v1slaget) | **GET** /v1/sla | 
*SlaApi* | [**v1SlaIdDelete**](docs/SlaApi.md#v1slaiddelete) | **DELETE** /v1/sla/{id} | 
*SlaApi* | [**v1SlaIdGet**](docs/SlaApi.md#v1slaidget) | **GET** /v1/sla/{id} | 
*SlaApi* | [**v1SlaIdPut**](docs/SlaApi.md#v1slaidput) | **PUT** /v1/sla/{id} | 
*SlaApi* | [**v1SlaPost**](docs/SlaApi.md#v1slapost) | **POST** /v1/sla | 
*SlaApi* | [**v1SlaSchedulesGet**](docs/SlaApi.md#v1slaschedulesget) | **GET** /v1/sla/schedules | 
*SlaApi* | [**v1SlaTicketTicketIdGet**](docs/SlaApi.md#v1slaticketticketidget) | **GET** /v1/sla/ticket/{ticketId} | 
*SlaApi* | [**v1SlaTicketTicketIdTimerPausePost**](docs/SlaApi.md#v1slaticketticketidtimerpausepost) | **POST** /v1/sla/ticket/{ticketId}/timer/pause | 
*SlaApi* | [**v1SlaTicketTicketIdTimerStartPost**](docs/SlaApi.md#v1slaticketticketidtimerstartpost) | **POST** /v1/sla/ticket/{ticketId}/timer/start | 
*SlaApi* | [**v1SlaTicketTicketIdTimerStopPost**](docs/SlaApi.md#v1slaticketticketidtimerstoppost) | **POST** /v1/sla/ticket/{ticketId}/timer/stop | 
*SubscribersApi* | [**v1TicketsTicketIdSubscribersGet**](docs/SubscribersApi.md#v1ticketsticketidsubscribersget) | **GET** /v1/tickets/{ticketId}/subscribers | 
*SubscribersApi* | [**v1TicketsTicketIdSubscribersPut**](docs/SubscribersApi.md#v1ticketsticketidsubscribersput) | **PUT** /v1/tickets/{ticketId}/subscribers | 
*TagsApi* | [**v1TagsPost**](docs/TagsApi.md#v1tagspost) | **POST** /v1/tags | 
*TagsApi* | [**v1TagsSearchGet**](docs/TagsApi.md#v1tagssearchget) | **GET** /v1/tags/search | 
*TagsApi* | [**v1TagsTicketIdTagsTagIdDelete**](docs/TagsApi.md#v1tagsticketidtagstagiddelete) | **DELETE** /v1/tags/{ticketId}/tags/{tagId} | 
*TagsApi* | [**v1TagsTicketIdTagsTagIdPost**](docs/TagsApi.md#v1tagsticketidtagstagidpost) | **POST** /v1/tags/{ticketId}/tags/{tagId} | 
*TagsApi* | [**v1TagsTicketTicketIdGet**](docs/TagsApi.md#v1tagsticketticketidget) | **GET** /v1/tags/ticket/{ticketId} | 
*TicketWorkflowsApi* | [**v1TicketsTicketIdTransitionsGet**](docs/TicketWorkflowsApi.md#v1ticketsticketidtransitionsget) | **GET** /v1/tickets/{ticketId}/transitions | 
*TicketWorkflowsApi* | [**v1TicketsTicketIdTransitionsSlugPost**](docs/TicketWorkflowsApi.md#v1ticketsticketidtransitionsslugpost) | **POST** /v1/tickets/{ticketId}/transitions/{slug} | 
*TicketWorkflowsApi* | [**v1TicketsTicketIdWorkflowGet**](docs/TicketWorkflowsApi.md#v1ticketsticketidworkflowget) | **GET** /v1/tickets/{ticketId}/workflow | 
*TicketsApi* | [**v1TicketsCountsGet**](docs/TicketsApi.md#v1ticketscountsget) | **GET** /v1/tickets/counts | 
*TicketsApi* | [**v1TicketsGet**](docs/TicketsApi.md#v1ticketsget) | **GET** /v1/tickets | 
*TicketsApi* | [**v1TicketsIdAssignPatch**](docs/TicketsApi.md#v1ticketsidassignpatch) | **PATCH** /v1/tickets/{id}/assign | 
*TicketsApi* | [**v1TicketsIdCategoryPatch**](docs/TicketsApi.md#v1ticketsidcategorypatch) | **PATCH** /v1/tickets/{id}/category | 
*TicketsApi* | [**v1TicketsIdChildrenGet**](docs/TicketsApi.md#v1ticketsidchildrenget) | **GET** /v1/tickets/{id}/children | 
*TicketsApi* | [**v1TicketsIdConvertToReplyPost**](docs/TicketsApi.md#v1ticketsidconverttoreplypost) | **POST** /v1/tickets/{id}/convert-to-reply | 
*TicketsApi* | [**v1TicketsIdDelete**](docs/TicketsApi.md#v1ticketsiddelete) | **DELETE** /v1/tickets/{id} | 
*TicketsApi* | [**v1TicketsIdDuplicatePost**](docs/TicketsApi.md#v1ticketsidduplicatepost) | **POST** /v1/tickets/{id}/duplicate | 
*TicketsApi* | [**v1TicketsIdForwardPost**](docs/TicketsApi.md#v1ticketsidforwardpost) | **POST** /v1/tickets/{id}/forward | 
*TicketsApi* | [**v1TicketsIdGet**](docs/TicketsApi.md#v1ticketsidget) | **GET** /v1/tickets/{id} | 
*TicketsApi* | [**v1TicketsIdLinkedAssetsAssetIdDelete**](docs/TicketsApi.md#v1ticketsidlinkedassetsassetiddelete) | **DELETE** /v1/tickets/{id}/linked-assets/{assetId} | 
*TicketsApi* | [**v1TicketsIdLinkedAssetsGet**](docs/TicketsApi.md#v1ticketsidlinkedassetsget) | **GET** /v1/tickets/{id}/linked-assets | 
*TicketsApi* | [**v1TicketsIdLinkedAssetsPost**](docs/TicketsApi.md#v1ticketsidlinkedassetspost) | **POST** /v1/tickets/{id}/linked-assets | 
*TicketsApi* | [**v1TicketsIdLinkedEntitiesGet**](docs/TicketsApi.md#v1ticketsidlinkedentitiesget) | **GET** /v1/tickets/{id}/linked-entities | 
*TicketsApi* | [**v1TicketsIdLinkedEntitiesLinkIdDelete**](docs/TicketsApi.md#v1ticketsidlinkedentitieslinkiddelete) | **DELETE** /v1/tickets/{id}/linked-entities/{linkId} | 
*TicketsApi* | [**v1TicketsIdLinkedEntitiesPost**](docs/TicketsApi.md#v1ticketsidlinkedentitiespost) | **POST** /v1/tickets/{id}/linked-entities | 
*TicketsApi* | [**v1TicketsIdLinksGet**](docs/TicketsApi.md#v1ticketsidlinksget) | **GET** /v1/tickets/{id}/links | 
*TicketsApi* | [**v1TicketsIdLinksLinkIdDelete**](docs/TicketsApi.md#v1ticketsidlinkslinkiddelete) | **DELETE** /v1/tickets/{id}/links/{linkId} | 
*TicketsApi* | [**v1TicketsIdLinksPost**](docs/TicketsApi.md#v1ticketsidlinkspost) | **POST** /v1/tickets/{id}/links | 
*TicketsApi* | [**v1TicketsIdMarkProblemPost**](docs/TicketsApi.md#v1ticketsidmarkproblempost) | **POST** /v1/tickets/{id}/mark-problem | 
*TicketsApi* | [**v1TicketsIdMarkSpamPost**](docs/TicketsApi.md#v1ticketsidmarkspampost) | **POST** /v1/tickets/{id}/mark-spam | 
*TicketsApi* | [**v1TicketsIdMergePost**](docs/TicketsApi.md#v1ticketsidmergepost) | **POST** /v1/tickets/{id}/merge | 
*TicketsApi* | [**v1TicketsIdPriorityPatch**](docs/TicketsApi.md#v1ticketsidprioritypatch) | **PATCH** /v1/tickets/{id}/priority | 
*TicketsApi* | [**v1TicketsIdPublishAsIdeaPost**](docs/TicketsApi.md#v1ticketsidpublishasideapost) | **POST** /v1/tickets/{id}/publish-as-idea | 
*TicketsApi* | [**v1TicketsIdPut**](docs/TicketsApi.md#v1ticketsidput) | **PUT** /v1/tickets/{id} | 
*TicketsApi* | [**v1TicketsIdStatusPatch**](docs/TicketsApi.md#v1ticketsidstatuspatch) | **PATCH** /v1/tickets/{id}/status | 
*TicketsApi* | [**v1TicketsIdSubscribeDelete**](docs/TicketsApi.md#v1ticketsidsubscribedelete) | **DELETE** /v1/tickets/{id}/subscribe | 
*TicketsApi* | [**v1TicketsIdSubscribeMeGet**](docs/TicketsApi.md#v1ticketsidsubscribemeget) | **GET** /v1/tickets/{id}/subscribe/me | 
*TicketsApi* | [**v1TicketsIdSubscribePost**](docs/TicketsApi.md#v1ticketsidsubscribepost) | **POST** /v1/tickets/{id}/subscribe | 
*TicketsApi* | [**v1TicketsIdUnmarkProblemPost**](docs/TicketsApi.md#v1ticketsidunmarkproblempost) | **POST** /v1/tickets/{id}/unmark-problem | 
*TicketsApi* | [**v1TicketsIdUnmarkSpamPost**](docs/TicketsApi.md#v1ticketsidunmarkspampost) | **POST** /v1/tickets/{id}/unmark-spam | 
*TicketsApi* | [**v1TicketsIdUnpublishAsIdeaPost**](docs/TicketsApi.md#v1ticketsidunpublishasideapost) | **POST** /v1/tickets/{id}/unpublish-as-idea | 
*TicketsApi* | [**v1TicketsParentIdSubtasksPost**](docs/TicketsApi.md#v1ticketsparentidsubtaskspost) | **POST** /v1/tickets/{parentId}/subtasks | 
*TicketsApi* | [**v1TicketsPost**](docs/TicketsApi.md#v1ticketspost) | **POST** /v1/tickets | 
*TicketsApi* | [**v1TicketsSearchGet**](docs/TicketsApi.md#v1ticketssearchget) | **GET** /v1/tickets/search | 
*TicketsApi* | [**v1TicketsStatsGet**](docs/TicketsApi.md#v1ticketsstatsget) | **GET** /v1/tickets/stats | 
*TimeTrackingApi* | [**v1TimeTrackingEntriesIdDelete**](docs/TimeTrackingApi.md#v1timetrackingentriesiddelete) | **DELETE** /v1/time-tracking/entries/{id} | 
*TimeTrackingApi* | [**v1TimeTrackingEntriesIdPut**](docs/TimeTrackingApi.md#v1timetrackingentriesidput) | **PUT** /v1/time-tracking/entries/{id} | 
*TimeTrackingApi* | [**v1TimeTrackingEntriesPost**](docs/TimeTrackingApi.md#v1timetrackingentriespost) | **POST** /v1/time-tracking/entries | 
*TimeTrackingApi* | [**v1TimeTrackingTicketsTicketIdEntriesGet**](docs/TimeTrackingApi.md#v1timetrackingticketsticketidentriesget) | **GET** /v1/time-tracking/tickets/{ticketId}/entries | 
*WidgetApi* | [**v1HelpdeskWidgetCategoriesGet**](docs/WidgetApi.md#v1helpdeskwidgetcategoriesget) | **GET** /v1/helpdesk/widget/categories | Returns categories available in the widget dropdown, grouped by audience. Includes Tenant-specific categories for the user\&#39;s tenant, Platform-wide categories, and Principal-scoped categories where applicable.
*WidgetApi* | [**v1HelpdeskWidgetTicketsGet**](docs/WidgetApi.md#v1helpdeskwidgetticketsget) | **GET** /v1/helpdesk/widget/tickets | Returns the current user\&#39;s own tickets, regardless of audience. Supports optional status filtering and basic pagination.
*WidgetApi* | [**v1HelpdeskWidgetTicketsPost**](docs/WidgetApi.md#v1helpdeskwidgetticketspost) | **POST** /v1/helpdesk/widget/tickets | Submits a new ticket from the widget. Audience is derived from the selected category; if no category is provided the ticket is routed to BrainForge engineering (Audience&#x3D;Platform).
*WorkflowsApi* | [**v1WorkflowsAdminMigrateLegacyRulesPost**](docs/WorkflowsApi.md#v1workflowsadminmigratelegacyrulespost) | **POST** /v1/workflows/_admin/migrate-legacy-rules | One-time admin command that migrates legacy automation rule conditions and actions to workflow-aware equivalents. Use &#x60;dryRun&#x3D;true&#x60; (default) to preview counts without persisting changes; set &#x60;dryRun&#x3D;false&#x60; to apply.              Always returns 200. Inspect the &#x60;warnings&#x60; array in the response body to determine whether any rules required manual review. An empty warnings array means the migration applied cleanly.              Tenant-scoped: only rules belonging to the calling tenant are processed.
*WorkflowsApi* | [**v1WorkflowsAdminRuleMigrationReportGet**](docs/WorkflowsApi.md#v1workflowsadminrulemigrationreportget) | **GET** /v1/workflows/_admin/rule-migration-report | Admin-only read-only report listing automation rules that reference legacy &#x60;StatusCondition&#x60; or &#x60;SetStatusAction&#x60; types. Intended for ops use during Release 2 cutover planning.
*WorkflowsApi* | [**v1WorkflowsGet**](docs/WorkflowsApi.md#v1workflowsget) | **GET** /v1/workflows | 
*WorkflowsApi* | [**v1WorkflowsIdClonePost**](docs/WorkflowsApi.md#v1workflowsidclonepost) | **POST** /v1/workflows/{id}/clone | 
*WorkflowsApi* | [**v1WorkflowsIdDelete**](docs/WorkflowsApi.md#v1workflowsiddelete) | **DELETE** /v1/workflows/{id} | 
*WorkflowsApi* | [**v1WorkflowsIdDraftsPost**](docs/WorkflowsApi.md#v1workflowsiddraftspost) | **POST** /v1/workflows/{id}/drafts | 
*WorkflowsApi* | [**v1WorkflowsIdDraftsVersionIdPublishPost**](docs/WorkflowsApi.md#v1workflowsiddraftsversionidpublishpost) | **POST** /v1/workflows/{id}/drafts/{versionId}/publish | 
*WorkflowsApi* | [**v1WorkflowsIdDraftsVersionIdPut**](docs/WorkflowsApi.md#v1workflowsiddraftsversionidput) | **PUT** /v1/workflows/{id}/drafts/{versionId} | 
*WorkflowsApi* | [**v1WorkflowsIdGet**](docs/WorkflowsApi.md#v1workflowsidget) | **GET** /v1/workflows/{id} | 
*WorkflowsApi* | [**v1WorkflowsIdVersionsVersionIdValidatePost**](docs/WorkflowsApi.md#v1workflowsidversionsversionidvalidatepost) | **POST** /v1/workflows/{id}/versions/{versionId}/validate | 
*WorkflowsApi* | [**v1WorkflowsPost**](docs/WorkflowsApi.md#v1workflowspost) | **POST** /v1/workflows | 


### Documentation For Models

 - [HelpdeskApiControllersAssignUserRoleRequest](docs/HelpdeskApiControllersAssignUserRoleRequest.md)
 - [HelpdeskApiControllersPortalCreatePortalEnquiryRequest](docs/HelpdeskApiControllersPortalCreatePortalEnquiryRequest.md)
 - [HelpdeskApiControllersPortalReplyToPortalEnquiryRequest](docs/HelpdeskApiControllersPortalReplyToPortalEnquiryRequest.md)
 - [HelpdeskApiControllersSetCategoryWorkflowRequest](docs/HelpdeskApiControllersSetCategoryWorkflowRequest.md)
 - [HelpdeskApiControllersSetPortalEnquiryCategoryRequest](docs/HelpdeskApiControllersSetPortalEnquiryCategoryRequest.md)
 - [HelpdeskApplicationAdminDTOsTenantUserDto](docs/HelpdeskApplicationAdminDTOsTenantUserDto.md)
 - [HelpdeskApplicationAdminDTOsUserRoleDto](docs/HelpdeskApplicationAdminDTOsUserRoleDto.md)
 - [HelpdeskApplicationAiAssistCommandsGetTicketSummaryGetTicketSummaryCommand](docs/HelpdeskApplicationAiAssistCommandsGetTicketSummaryGetTicketSummaryCommand.md)
 - [HelpdeskApplicationAiAssistCommandsSuggestReplySuggestReplyCommand](docs/HelpdeskApplicationAiAssistCommandsSuggestReplySuggestReplyCommand.md)
 - [HelpdeskApplicationAiAssistDTOsAiAssistResultDto](docs/HelpdeskApplicationAiAssistDTOsAiAssistResultDto.md)
 - [HelpdeskApplicationAiCopilotAIToolRequestGetKbArticleInput](docs/HelpdeskApplicationAiCopilotAIToolRequestGetKbArticleInput.md)
 - [HelpdeskApplicationAiCopilotAIToolRequestGetSlaComplianceInput](docs/HelpdeskApplicationAiCopilotAIToolRequestGetSlaComplianceInput.md)
 - [HelpdeskApplicationAiCopilotAIToolRequestGetTechPerformanceInput](docs/HelpdeskApplicationAiCopilotAIToolRequestGetTechPerformanceInput.md)
 - [HelpdeskApplicationAiCopilotAIToolRequestGetTicketCountsInput](docs/HelpdeskApplicationAiCopilotAIToolRequestGetTicketCountsInput.md)
 - [HelpdeskApplicationAiCopilotAIToolRequestListCategoriesInput](docs/HelpdeskApplicationAiCopilotAIToolRequestListCategoriesInput.md)
 - [HelpdeskApplicationAiCopilotAIToolRequestListTicketCommentsInput](docs/HelpdeskApplicationAiCopilotAIToolRequestListTicketCommentsInput.md)
 - [HelpdeskApplicationAiCopilotAIToolRequestListTicketsInput](docs/HelpdeskApplicationAiCopilotAIToolRequestListTicketsInput.md)
 - [HelpdeskApplicationAiCopilotAIToolRequestReportWindowInput](docs/HelpdeskApplicationAiCopilotAIToolRequestReportWindowInput.md)
 - [HelpdeskApplicationAiCopilotAIToolRequestSearchKbArticlesInput](docs/HelpdeskApplicationAiCopilotAIToolRequestSearchKbArticlesInput.md)
 - [HelpdeskApplicationAiCopilotAIToolRequestTicketIdInput](docs/HelpdeskApplicationAiCopilotAIToolRequestTicketIdInput.md)
 - [HelpdeskApplicationAiCopilotAIToolResultCategoryList](docs/HelpdeskApplicationAiCopilotAIToolResultCategoryList.md)
 - [HelpdeskApplicationAiCopilotAIToolResultKbArticle](docs/HelpdeskApplicationAiCopilotAIToolResultKbArticle.md)
 - [HelpdeskApplicationAiCopilotAIToolResultKbArticlePage](docs/HelpdeskApplicationAiCopilotAIToolResultKbArticlePage.md)
 - [HelpdeskApplicationAiCopilotAIToolResultSlaCompliance](docs/HelpdeskApplicationAiCopilotAIToolResultSlaCompliance.md)
 - [HelpdeskApplicationAiCopilotAIToolResultSummaryReport](docs/HelpdeskApplicationAiCopilotAIToolResultSummaryReport.md)
 - [HelpdeskApplicationAiCopilotAIToolResultTechPerformanceReport](docs/HelpdeskApplicationAiCopilotAIToolResultTechPerformanceReport.md)
 - [HelpdeskApplicationAiCopilotAIToolResultTicketCounts](docs/HelpdeskApplicationAiCopilotAIToolResultTicketCounts.md)
 - [HelpdeskApplicationAiCopilotAIToolResultTicketDetail](docs/HelpdeskApplicationAiCopilotAIToolResultTicketDetail.md)
 - [HelpdeskApplicationAiCopilotAIToolResultTicketPage](docs/HelpdeskApplicationAiCopilotAIToolResultTicketPage.md)
 - [HelpdeskApplicationAiCopilotAIToolResultTicketReplyPage](docs/HelpdeskApplicationAiCopilotAIToolResultTicketReplyPage.md)
 - [HelpdeskApplicationAiCopilotAIToolResultTicketSlaStatus](docs/HelpdeskApplicationAiCopilotAIToolResultTicketSlaStatus.md)
 - [HelpdeskApplicationAiCopilotAssigneeTicketCount](docs/HelpdeskApplicationAiCopilotAssigneeTicketCount.md)
 - [HelpdeskApplicationAiCopilotBreakdownRow](docs/HelpdeskApplicationAiCopilotBreakdownRow.md)
 - [HelpdeskApplicationAiCopilotCategoryList](docs/HelpdeskApplicationAiCopilotCategoryList.md)
 - [HelpdeskApplicationAiCopilotCategorySummary](docs/HelpdeskApplicationAiCopilotCategorySummary.md)
 - [HelpdeskApplicationAiCopilotGetKbArticleInput](docs/HelpdeskApplicationAiCopilotGetKbArticleInput.md)
 - [HelpdeskApplicationAiCopilotGetSlaComplianceInput](docs/HelpdeskApplicationAiCopilotGetSlaComplianceInput.md)
 - [HelpdeskApplicationAiCopilotGetTechPerformanceInput](docs/HelpdeskApplicationAiCopilotGetTechPerformanceInput.md)
 - [HelpdeskApplicationAiCopilotGetTicketCountsInput](docs/HelpdeskApplicationAiCopilotGetTicketCountsInput.md)
 - [HelpdeskApplicationAiCopilotKbArticle](docs/HelpdeskApplicationAiCopilotKbArticle.md)
 - [HelpdeskApplicationAiCopilotKbArticlePage](docs/HelpdeskApplicationAiCopilotKbArticlePage.md)
 - [HelpdeskApplicationAiCopilotKbArticleSummary](docs/HelpdeskApplicationAiCopilotKbArticleSummary.md)
 - [HelpdeskApplicationAiCopilotListCategoriesInput](docs/HelpdeskApplicationAiCopilotListCategoriesInput.md)
 - [HelpdeskApplicationAiCopilotListTicketCommentsInput](docs/HelpdeskApplicationAiCopilotListTicketCommentsInput.md)
 - [HelpdeskApplicationAiCopilotListTicketsInput](docs/HelpdeskApplicationAiCopilotListTicketsInput.md)
 - [HelpdeskApplicationAiCopilotReportWindowInput](docs/HelpdeskApplicationAiCopilotReportWindowInput.md)
 - [HelpdeskApplicationAiCopilotSearchKbArticlesInput](docs/HelpdeskApplicationAiCopilotSearchKbArticlesInput.md)
 - [HelpdeskApplicationAiCopilotSlaCompliance](docs/HelpdeskApplicationAiCopilotSlaCompliance.md)
 - [HelpdeskApplicationAiCopilotSlaPolicyCompliance](docs/HelpdeskApplicationAiCopilotSlaPolicyCompliance.md)
 - [HelpdeskApplicationAiCopilotSummaryReport](docs/HelpdeskApplicationAiCopilotSummaryReport.md)
 - [HelpdeskApplicationAiCopilotTechPerformanceReport](docs/HelpdeskApplicationAiCopilotTechPerformanceReport.md)
 - [HelpdeskApplicationAiCopilotTechnicianPerformance](docs/HelpdeskApplicationAiCopilotTechnicianPerformance.md)
 - [HelpdeskApplicationAiCopilotTicketCounts](docs/HelpdeskApplicationAiCopilotTicketCounts.md)
 - [HelpdeskApplicationAiCopilotTicketDetail](docs/HelpdeskApplicationAiCopilotTicketDetail.md)
 - [HelpdeskApplicationAiCopilotTicketIdInput](docs/HelpdeskApplicationAiCopilotTicketIdInput.md)
 - [HelpdeskApplicationAiCopilotTicketPage](docs/HelpdeskApplicationAiCopilotTicketPage.md)
 - [HelpdeskApplicationAiCopilotTicketReply](docs/HelpdeskApplicationAiCopilotTicketReply.md)
 - [HelpdeskApplicationAiCopilotTicketReplyPage](docs/HelpdeskApplicationAiCopilotTicketReplyPage.md)
 - [HelpdeskApplicationAiCopilotTicketSlaStatus](docs/HelpdeskApplicationAiCopilotTicketSlaStatus.md)
 - [HelpdeskApplicationAiCopilotTicketSummary](docs/HelpdeskApplicationAiCopilotTicketSummary.md)
 - [HelpdeskApplicationAppSettingsCommandsCreateAppSettingCreateAppSettingCommand](docs/HelpdeskApplicationAppSettingsCommandsCreateAppSettingCreateAppSettingCommand.md)
 - [HelpdeskApplicationAppSettingsCommandsUpdateAppSettingUpdateAppSettingCommand](docs/HelpdeskApplicationAppSettingsCommandsUpdateAppSettingUpdateAppSettingCommand.md)
 - [HelpdeskApplicationAppSettingsModelsAppSettingDto](docs/HelpdeskApplicationAppSettingsModelsAppSettingDto.md)
 - [HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreateApprovalWorkflowCommand](docs/HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreateApprovalWorkflowCommand.md)
 - [HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreateApprovalWorkflowStepDto](docs/HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreateApprovalWorkflowStepDto.md)
 - [HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreatePrincipalApprovalWorkflowCommand](docs/HelpdeskApplicationApprovalsCommandsCreateApprovalWorkflowCreatePrincipalApprovalWorkflowCommand.md)
 - [HelpdeskApplicationApprovalsCommandsMakeApprovalDecisionMakeApprovalDecisionCommand](docs/HelpdeskApplicationApprovalsCommandsMakeApprovalDecisionMakeApprovalDecisionCommand.md)
 - [HelpdeskApplicationApprovalsCommandsRequestApprovalRequestApprovalCommand](docs/HelpdeskApplicationApprovalsCommandsRequestApprovalRequestApprovalCommand.md)
 - [HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdateApprovalWorkflowCommand](docs/HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdateApprovalWorkflowCommand.md)
 - [HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdateApprovalWorkflowStepDto](docs/HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdateApprovalWorkflowStepDto.md)
 - [HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdatePrincipalApprovalWorkflowCommand](docs/HelpdeskApplicationApprovalsCommandsUpdateApprovalWorkflowUpdatePrincipalApprovalWorkflowCommand.md)
 - [HelpdeskApplicationApprovalsDTOsApprovalDecisionDto](docs/HelpdeskApplicationApprovalsDTOsApprovalDecisionDto.md)
 - [HelpdeskApplicationApprovalsDTOsApprovalWorkflowDetailDto](docs/HelpdeskApplicationApprovalsDTOsApprovalWorkflowDetailDto.md)
 - [HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto](docs/HelpdeskApplicationApprovalsDTOsApprovalWorkflowDto.md)
 - [HelpdeskApplicationApprovalsDTOsApprovalWorkflowStepDto](docs/HelpdeskApplicationApprovalsDTOsApprovalWorkflowStepDto.md)
 - [HelpdeskApplicationApprovalsDTOsPendingApprovalDto](docs/HelpdeskApplicationApprovalsDTOsPendingApprovalDto.md)
 - [HelpdeskApplicationApprovalsDTOsTicketApprovalDto](docs/HelpdeskApplicationApprovalsDTOsTicketApprovalDto.md)
 - [HelpdeskApplicationAttachmentsDTOsAttachmentDto](docs/HelpdeskApplicationAttachmentsDTOsAttachmentDto.md)
 - [HelpdeskApplicationCannedResponsesCommandsCreateCannedResponseCreateCannedResponseCommand](docs/HelpdeskApplicationCannedResponsesCommandsCreateCannedResponseCreateCannedResponseCommand.md)
 - [HelpdeskApplicationCannedResponsesCommandsUpdateCannedResponseUpdateCannedResponseCommand](docs/HelpdeskApplicationCannedResponsesCommandsUpdateCannedResponseUpdateCannedResponseCommand.md)
 - [HelpdeskApplicationCannedResponsesDTOsCannedResponseDto](docs/HelpdeskApplicationCannedResponsesDTOsCannedResponseDto.md)
 - [HelpdeskApplicationCategoriesCommandsCreateCategoryCreateCategoryCommand](docs/HelpdeskApplicationCategoriesCommandsCreateCategoryCreateCategoryCommand.md)
 - [HelpdeskApplicationCategoriesCommandsCreateCategoryCreatePrincipalCategoryCommand](docs/HelpdeskApplicationCategoriesCommandsCreateCategoryCreatePrincipalCategoryCommand.md)
 - [HelpdeskApplicationCategoriesCommandsCreateSectionCreateSectionCommand](docs/HelpdeskApplicationCategoriesCommandsCreateSectionCreateSectionCommand.md)
 - [HelpdeskApplicationCategoriesCommandsUpdateCategoryUpdateCategoryCommand](docs/HelpdeskApplicationCategoriesCommandsUpdateCategoryUpdateCategoryCommand.md)
 - [HelpdeskApplicationCategoriesCommandsUpdateCategoryUpdatePrincipalCategoryCommand](docs/HelpdeskApplicationCategoriesCommandsUpdateCategoryUpdatePrincipalCategoryCommand.md)
 - [HelpdeskApplicationCategoriesCommandsUpdateSectionUpdateSectionCommand](docs/HelpdeskApplicationCategoriesCommandsUpdateSectionUpdateSectionCommand.md)
 - [HelpdeskApplicationCategoriesModelsCategoriesHierarchyDto](docs/HelpdeskApplicationCategoriesModelsCategoriesHierarchyDto.md)
 - [HelpdeskApplicationCategoriesModelsCategoryDto](docs/HelpdeskApplicationCategoriesModelsCategoryDto.md)
 - [HelpdeskApplicationCategoriesModelsSectionDto](docs/HelpdeskApplicationCategoriesModelsSectionDto.md)
 - [HelpdeskApplicationCategoriesModelsSectionWithCategoriesDto](docs/HelpdeskApplicationCategoriesModelsSectionWithCategoriesDto.md)
 - [HelpdeskApplicationCommentsCommandsAddCommentAddCommentCommand](docs/HelpdeskApplicationCommentsCommandsAddCommentAddCommentCommand.md)
 - [HelpdeskApplicationCommentsCommandsAddInternalNoteAddInternalNoteCommand](docs/HelpdeskApplicationCommentsCommandsAddInternalNoteAddInternalNoteCommand.md)
 - [HelpdeskApplicationCommentsCommandsAddPlatformCommentAddPlatformCommentRequest](docs/HelpdeskApplicationCommentsCommandsAddPlatformCommentAddPlatformCommentRequest.md)
 - [HelpdeskApplicationCommentsCommandsManageSubscribersManageSubscribersCommand](docs/HelpdeskApplicationCommentsCommandsManageSubscribersManageSubscribersCommand.md)
 - [HelpdeskApplicationCommentsDTOsCommentDto](docs/HelpdeskApplicationCommentsDTOsCommentDto.md)
 - [HelpdeskApplicationCommentsDTOsSubscriberDto](docs/HelpdeskApplicationCommentsDTOsSubscriberDto.md)
 - [HelpdeskApplicationCommonPagedResultCommentDto](docs/HelpdeskApplicationCommonPagedResultCommentDto.md)
 - [HelpdeskApplicationCommonPagedResultDictionaryStringObject](docs/HelpdeskApplicationCommonPagedResultDictionaryStringObject.md)
 - [HelpdeskApplicationCommonPagedResultHelpdeskContactListDto](docs/HelpdeskApplicationCommonPagedResultHelpdeskContactListDto.md)
 - [HelpdeskApplicationCommonPagedResultIdeaDto](docs/HelpdeskApplicationCommonPagedResultIdeaDto.md)
 - [HelpdeskApplicationCommonPagedResultKbArticleListDto](docs/HelpdeskApplicationCommonPagedResultKbArticleListDto.md)
 - [HelpdeskApplicationCommonPagedResultPendingApprovalDto](docs/HelpdeskApplicationCommonPagedResultPendingApprovalDto.md)
 - [HelpdeskApplicationCommonPagedResultPlatformTicketCommentDto](docs/HelpdeskApplicationCommonPagedResultPlatformTicketCommentDto.md)
 - [HelpdeskApplicationCommonPagedResultPlatformTicketListDto](docs/HelpdeskApplicationCommonPagedResultPlatformTicketListDto.md)
 - [HelpdeskApplicationCommonPagedResultPortalAnnouncementDto](docs/HelpdeskApplicationCommonPagedResultPortalAnnouncementDto.md)
 - [HelpdeskApplicationCommonPagedResultPortalEnquiryDto](docs/HelpdeskApplicationCommonPagedResultPortalEnquiryDto.md)
 - [HelpdeskApplicationCommonPagedResultPortalHelpArticleListDto](docs/HelpdeskApplicationCommonPagedResultPortalHelpArticleListDto.md)
 - [HelpdeskApplicationCommonPagedResultRecurringTicketDto](docs/HelpdeskApplicationCommonPagedResultRecurringTicketDto.md)
 - [HelpdeskApplicationCommonPagedResultSatisfactionRatingDto](docs/HelpdeskApplicationCommonPagedResultSatisfactionRatingDto.md)
 - [HelpdeskApplicationCommonPagedResultSectionDto](docs/HelpdeskApplicationCommonPagedResultSectionDto.md)
 - [HelpdeskApplicationCommonPagedResultTicketListDto](docs/HelpdeskApplicationCommonPagedResultTicketListDto.md)
 - [HelpdeskApplicationCommonPagedResultWidgetTicketDto](docs/HelpdeskApplicationCommonPagedResultWidgetTicketDto.md)
 - [HelpdeskApplicationCommonPagedResultWorkflowDefinitionSummaryDto](docs/HelpdeskApplicationCommonPagedResultWorkflowDefinitionSummaryDto.md)
 - [HelpdeskApplicationContactsCommandsCreateHelpdeskContactCreateHelpdeskContactCommand](docs/HelpdeskApplicationContactsCommandsCreateHelpdeskContactCreateHelpdeskContactCommand.md)
 - [HelpdeskApplicationContactsCommandsUpdateHelpdeskContactUpdateHelpdeskContactCommand](docs/HelpdeskApplicationContactsCommandsUpdateHelpdeskContactUpdateHelpdeskContactCommand.md)
 - [HelpdeskApplicationContactsDTOsHelpdeskContactDto](docs/HelpdeskApplicationContactsDTOsHelpdeskContactDto.md)
 - [HelpdeskApplicationContactsDTOsHelpdeskContactListDto](docs/HelpdeskApplicationContactsDTOsHelpdeskContactListDto.md)
 - [HelpdeskApplicationCustomFieldsCommandsCreateCustomFieldCreateCustomFieldCommand](docs/HelpdeskApplicationCustomFieldsCommandsCreateCustomFieldCreateCustomFieldCommand.md)
 - [HelpdeskApplicationCustomFieldsCommandsCreateCustomFieldCustomFieldOptionInput](docs/HelpdeskApplicationCustomFieldsCommandsCreateCustomFieldCustomFieldOptionInput.md)
 - [HelpdeskApplicationCustomFieldsCommandsSetBulkCustomFieldValuesCustomFieldValueInput](docs/HelpdeskApplicationCustomFieldsCommandsSetBulkCustomFieldValuesCustomFieldValueInput.md)
 - [HelpdeskApplicationCustomFieldsCommandsSetBulkCustomFieldValuesSetBulkCustomFieldValuesCommand](docs/HelpdeskApplicationCustomFieldsCommandsSetBulkCustomFieldValuesSetBulkCustomFieldValuesCommand.md)
 - [HelpdeskApplicationCustomFieldsCommandsSetCustomFieldValueSetCustomFieldValueCommand](docs/HelpdeskApplicationCustomFieldsCommandsSetCustomFieldValueSetCustomFieldValueCommand.md)
 - [HelpdeskApplicationCustomFieldsCommandsUpdateCustomFieldCustomFieldOptionInput](docs/HelpdeskApplicationCustomFieldsCommandsUpdateCustomFieldCustomFieldOptionInput.md)
 - [HelpdeskApplicationCustomFieldsCommandsUpdateCustomFieldUpdateCustomFieldCommand](docs/HelpdeskApplicationCustomFieldsCommandsUpdateCustomFieldUpdateCustomFieldCommand.md)
 - [HelpdeskApplicationCustomFieldsModelsCustomFieldDefinitionDto](docs/HelpdeskApplicationCustomFieldsModelsCustomFieldDefinitionDto.md)
 - [HelpdeskApplicationCustomFieldsModelsCustomFieldOptionDto](docs/HelpdeskApplicationCustomFieldsModelsCustomFieldOptionDto.md)
 - [HelpdeskApplicationCustomFieldsModelsCustomFieldValueDto](docs/HelpdeskApplicationCustomFieldsModelsCustomFieldValueDto.md)
 - [HelpdeskApplicationCustomPrioritiesCommandsCreateCustomPriorityCreateCustomPriorityCommand](docs/HelpdeskApplicationCustomPrioritiesCommandsCreateCustomPriorityCreateCustomPriorityCommand.md)
 - [HelpdeskApplicationCustomPrioritiesCommandsUpdateCustomPriorityUpdateCustomPriorityCommand](docs/HelpdeskApplicationCustomPrioritiesCommandsUpdateCustomPriorityUpdateCustomPriorityCommand.md)
 - [HelpdeskApplicationCustomPrioritiesDTOsCustomPriorityDto](docs/HelpdeskApplicationCustomPrioritiesDTOsCustomPriorityDto.md)
 - [HelpdeskApplicationCustomStatusesCommandsCreateCustomStatusCreateCustomStatusCommand](docs/HelpdeskApplicationCustomStatusesCommandsCreateCustomStatusCreateCustomStatusCommand.md)
 - [HelpdeskApplicationCustomStatusesCommandsUpdateCustomStatusUpdateCustomStatusCommand](docs/HelpdeskApplicationCustomStatusesCommandsUpdateCustomStatusUpdateCustomStatusCommand.md)
 - [HelpdeskApplicationCustomStatusesDTOsCustomTicketStatusDto](docs/HelpdeskApplicationCustomStatusesDTOsCustomTicketStatusDto.md)
 - [HelpdeskApplicationIntegrationsCommandsAddIntegrationAddIntegrationCommand](docs/HelpdeskApplicationIntegrationsCommandsAddIntegrationAddIntegrationCommand.md)
 - [HelpdeskApplicationIntegrationsCommandsUpdateIntegrationUpdateIntegrationCommand](docs/HelpdeskApplicationIntegrationsCommandsUpdateIntegrationUpdateIntegrationCommand.md)
 - [HelpdeskApplicationIntegrationsDTOsIntegrationConfigDto](docs/HelpdeskApplicationIntegrationsDTOsIntegrationConfigDto.md)
 - [HelpdeskApplicationKnowledgeBaseCommandsCreateArticleCreateArticleCommand](docs/HelpdeskApplicationKnowledgeBaseCommandsCreateArticleCreateArticleCommand.md)
 - [HelpdeskApplicationKnowledgeBaseCommandsCreateCategoryCreateCategoryCommand](docs/HelpdeskApplicationKnowledgeBaseCommandsCreateCategoryCreateCategoryCommand.md)
 - [HelpdeskApplicationKnowledgeBaseCommandsCreateTagCreateTagCommand](docs/HelpdeskApplicationKnowledgeBaseCommandsCreateTagCreateTagCommand.md)
 - [HelpdeskApplicationKnowledgeBaseCommandsPublishTicketToKbPublishTicketToKbCommand](docs/HelpdeskApplicationKnowledgeBaseCommandsPublishTicketToKbPublishTicketToKbCommand.md)
 - [HelpdeskApplicationKnowledgeBaseCommandsRateArticleRateArticleCommand](docs/HelpdeskApplicationKnowledgeBaseCommandsRateArticleRateArticleCommand.md)
 - [HelpdeskApplicationKnowledgeBaseCommandsUpdateArticleUpdateArticleCommand](docs/HelpdeskApplicationKnowledgeBaseCommandsUpdateArticleUpdateArticleCommand.md)
 - [HelpdeskApplicationKnowledgeBaseCommandsUpdateCategoryUpdateCategoryCommand](docs/HelpdeskApplicationKnowledgeBaseCommandsUpdateCategoryUpdateCategoryCommand.md)
 - [HelpdeskApplicationKnowledgeBaseModelsKbArticleDetailDto](docs/HelpdeskApplicationKnowledgeBaseModelsKbArticleDetailDto.md)
 - [HelpdeskApplicationKnowledgeBaseModelsKbArticleDto](docs/HelpdeskApplicationKnowledgeBaseModelsKbArticleDto.md)
 - [HelpdeskApplicationKnowledgeBaseModelsKbArticleListDto](docs/HelpdeskApplicationKnowledgeBaseModelsKbArticleListDto.md)
 - [HelpdeskApplicationKnowledgeBaseModelsKbArticleSuggestionDto](docs/HelpdeskApplicationKnowledgeBaseModelsKbArticleSuggestionDto.md)
 - [HelpdeskApplicationKnowledgeBaseModelsKbCategoryDto](docs/HelpdeskApplicationKnowledgeBaseModelsKbCategoryDto.md)
 - [HelpdeskApplicationKnowledgeBaseModelsKbCategoryTreeDto](docs/HelpdeskApplicationKnowledgeBaseModelsKbCategoryTreeDto.md)
 - [HelpdeskApplicationKnowledgeBaseModelsKbImportResultDto](docs/HelpdeskApplicationKnowledgeBaseModelsKbImportResultDto.md)
 - [HelpdeskApplicationKnowledgeBaseModelsKbTagDto](docs/HelpdeskApplicationKnowledgeBaseModelsKbTagDto.md)
 - [HelpdeskApplicationLiveChatCommandsUpdateLiveChatConfigUpdateLiveChatConfigCommand](docs/HelpdeskApplicationLiveChatCommandsUpdateLiveChatConfigUpdateLiveChatConfigCommand.md)
 - [HelpdeskApplicationLiveChatDTOsLiveChatWidgetConfigDto](docs/HelpdeskApplicationLiveChatDTOsLiveChatWidgetConfigDto.md)
 - [HelpdeskApplicationPlatformCommandsAddPlatformTicketCommentAddPlatformTicketCommentCommand](docs/HelpdeskApplicationPlatformCommandsAddPlatformTicketCommentAddPlatformTicketCommentCommand.md)
 - [HelpdeskApplicationPlatformCommandsAssignPlatformTicketAssignPlatformTicketCommand](docs/HelpdeskApplicationPlatformCommandsAssignPlatformTicketAssignPlatformTicketCommand.md)
 - [HelpdeskApplicationPlatformCommandsChangePlatformTicketCategoryChangePlatformTicketCategoryCommand](docs/HelpdeskApplicationPlatformCommandsChangePlatformTicketCategoryChangePlatformTicketCategoryCommand.md)
 - [HelpdeskApplicationPlatformCommandsChangePlatformTicketPriorityChangePlatformTicketPriorityCommand](docs/HelpdeskApplicationPlatformCommandsChangePlatformTicketPriorityChangePlatformTicketPriorityCommand.md)
 - [HelpdeskApplicationPlatformCommandsCreatePlatformTicketCreatePlatformTicketCommand](docs/HelpdeskApplicationPlatformCommandsCreatePlatformTicketCreatePlatformTicketCommand.md)
 - [HelpdeskApplicationPlatformCommandsUpdatePlatformTicketContentUpdatePlatformTicketContentCommand](docs/HelpdeskApplicationPlatformCommandsUpdatePlatformTicketContentUpdatePlatformTicketContentCommand.md)
 - [HelpdeskApplicationPlatformCommandsUpdatePlatformTicketStatusUpdatePlatformTicketStatusCommand](docs/HelpdeskApplicationPlatformCommandsUpdatePlatformTicketStatusUpdatePlatformTicketStatusCommand.md)
 - [HelpdeskApplicationPlatformDTOsPlatformCategoryDto](docs/HelpdeskApplicationPlatformDTOsPlatformCategoryDto.md)
 - [HelpdeskApplicationPlatformDTOsPlatformTicketCommentDto](docs/HelpdeskApplicationPlatformDTOsPlatformTicketCommentDto.md)
 - [HelpdeskApplicationPlatformDTOsPlatformTicketDto](docs/HelpdeskApplicationPlatformDTOsPlatformTicketDto.md)
 - [HelpdeskApplicationPlatformDTOsPlatformTicketListDto](docs/HelpdeskApplicationPlatformDTOsPlatformTicketListDto.md)
 - [HelpdeskApplicationPortalEnquiriesPortalEnquiryDetailDto](docs/HelpdeskApplicationPortalEnquiriesPortalEnquiryDetailDto.md)
 - [HelpdeskApplicationPortalEnquiriesPortalEnquiryDto](docs/HelpdeskApplicationPortalEnquiriesPortalEnquiryDto.md)
 - [HelpdeskApplicationPortalEnquiriesPortalEnquiryReplyDto](docs/HelpdeskApplicationPortalEnquiriesPortalEnquiryReplyDto.md)
 - [HelpdeskApplicationPortalHelpPortalAnnouncementDto](docs/HelpdeskApplicationPortalHelpPortalAnnouncementDto.md)
 - [HelpdeskApplicationPortalHelpPortalAnnouncementUnreadCountDto](docs/HelpdeskApplicationPortalHelpPortalAnnouncementUnreadCountDto.md)
 - [HelpdeskApplicationPortalHelpPortalHelpArticleDto](docs/HelpdeskApplicationPortalHelpPortalHelpArticleDto.md)
 - [HelpdeskApplicationPortalHelpPortalHelpArticleListDto](docs/HelpdeskApplicationPortalHelpPortalHelpArticleListDto.md)
 - [HelpdeskApplicationPortalHelpPortalHelpCategoryDto](docs/HelpdeskApplicationPortalHelpPortalHelpCategoryDto.md)
 - [HelpdeskApplicationReportingCommandsExecuteReportExportExecuteReportExportCommand](docs/HelpdeskApplicationReportingCommandsExecuteReportExportExecuteReportExportCommand.md)
 - [HelpdeskApplicationReportingDTOsAgentUtilizationDto](docs/HelpdeskApplicationReportingDTOsAgentUtilizationDto.md)
 - [HelpdeskApplicationReportingDTOsAssetTicketDto](docs/HelpdeskApplicationReportingDTOsAssetTicketDto.md)
 - [HelpdeskApplicationReportingDTOsAssetsReportDto](docs/HelpdeskApplicationReportingDTOsAssetsReportDto.md)
 - [HelpdeskApplicationReportingDTOsAssigneeStatDto](docs/HelpdeskApplicationReportingDTOsAssigneeStatDto.md)
 - [HelpdeskApplicationReportingDTOsAuditLogEntryDto](docs/HelpdeskApplicationReportingDTOsAuditLogEntryDto.md)
 - [HelpdeskApplicationReportingDTOsAuditLogReportDto](docs/HelpdeskApplicationReportingDTOsAuditLogReportDto.md)
 - [HelpdeskApplicationReportingDTOsCategoryBreakdownDto](docs/HelpdeskApplicationReportingDTOsCategoryBreakdownDto.md)
 - [HelpdeskApplicationReportingDTOsCategoryStatDto](docs/HelpdeskApplicationReportingDTOsCategoryStatDto.md)
 - [HelpdeskApplicationReportingDTOsCompanyStatisticsDto](docs/HelpdeskApplicationReportingDTOsCompanyStatisticsDto.md)
 - [HelpdeskApplicationReportingDTOsDeletedTicketDto](docs/HelpdeskApplicationReportingDTOsDeletedTicketDto.md)
 - [HelpdeskApplicationReportingDTOsDynamicsDataPoint](docs/HelpdeskApplicationReportingDTOsDynamicsDataPoint.md)
 - [HelpdeskApplicationReportingDTOsDynamicsReportDto](docs/HelpdeskApplicationReportingDTOsDynamicsReportDto.md)
 - [HelpdeskApplicationReportingDTOsOverdueTicketDto](docs/HelpdeskApplicationReportingDTOsOverdueTicketDto.md)
 - [HelpdeskApplicationReportingDTOsPriorityBreakdownDto](docs/HelpdeskApplicationReportingDTOsPriorityBreakdownDto.md)
 - [HelpdeskApplicationReportingDTOsReportExecutionStatusDto](docs/HelpdeskApplicationReportingDTOsReportExecutionStatusDto.md)
 - [HelpdeskApplicationReportingDTOsSlaComplianceDto](docs/HelpdeskApplicationReportingDTOsSlaComplianceDto.md)
 - [HelpdeskApplicationReportingDTOsSlaPolicyComplianceDto](docs/HelpdeskApplicationReportingDTOsSlaPolicyComplianceDto.md)
 - [HelpdeskApplicationReportingDTOsStatusBreakdownDto](docs/HelpdeskApplicationReportingDTOsStatusBreakdownDto.md)
 - [HelpdeskApplicationReportingDTOsSummaryReportDto](docs/HelpdeskApplicationReportingDTOsSummaryReportDto.md)
 - [HelpdeskApplicationReportingDTOsTechPerformanceDto](docs/HelpdeskApplicationReportingDTOsTechPerformanceDto.md)
 - [HelpdeskApplicationReportingDTOsTechnicianBreakdownDto](docs/HelpdeskApplicationReportingDTOsTechnicianBreakdownDto.md)
 - [HelpdeskApplicationReportingDTOsTicketByCategoryDto](docs/HelpdeskApplicationReportingDTOsTicketByCategoryDto.md)
 - [HelpdeskApplicationReportingDTOsTicketByPriorityDto](docs/HelpdeskApplicationReportingDTOsTicketByPriorityDto.md)
 - [HelpdeskApplicationReportingDTOsTicketByStatusDto](docs/HelpdeskApplicationReportingDTOsTicketByStatusDto.md)
 - [HelpdeskApplicationReportingDTOsTicketStatsDto](docs/HelpdeskApplicationReportingDTOsTicketStatsDto.md)
 - [HelpdeskApplicationReportingQueriesGetCustomReportGetCustomReportQuery](docs/HelpdeskApplicationReportingQueriesGetCustomReportGetCustomReportQuery.md)
 - [HelpdeskApplicationReportingQueriesGetPrincipalTicketVolumePrincipalTicketVolumeDto](docs/HelpdeskApplicationReportingQueriesGetPrincipalTicketVolumePrincipalTicketVolumeDto.md)
 - [HelpdeskApplicationSatisfactionCommandsSubmitSatisfactionRatingSubmitSatisfactionRatingCommand](docs/HelpdeskApplicationSatisfactionCommandsSubmitSatisfactionRatingSubmitSatisfactionRatingCommand.md)
 - [HelpdeskApplicationSatisfactionCommandsUpdateSatisfactionRatingUpdateSatisfactionRatingCommand](docs/HelpdeskApplicationSatisfactionCommandsUpdateSatisfactionRatingUpdateSatisfactionRatingCommand.md)
 - [HelpdeskApplicationSatisfactionDTOsCSATReportDto](docs/HelpdeskApplicationSatisfactionDTOsCSATReportDto.md)
 - [HelpdeskApplicationSatisfactionDTOsGroupedRatingDto](docs/HelpdeskApplicationSatisfactionDTOsGroupedRatingDto.md)
 - [HelpdeskApplicationSatisfactionDTOsRatingDistributionDto](docs/HelpdeskApplicationSatisfactionDTOsRatingDistributionDto.md)
 - [HelpdeskApplicationSatisfactionDTOsSatisfactionRatingDto](docs/HelpdeskApplicationSatisfactionDTOsSatisfactionRatingDto.md)
 - [HelpdeskApplicationSchedulingCommandsCreateAutoCloseConfigCommand](docs/HelpdeskApplicationSchedulingCommandsCreateAutoCloseConfigCommand.md)
 - [HelpdeskApplicationSchedulingCommandsCreateRecurringTicketCommand](docs/HelpdeskApplicationSchedulingCommandsCreateRecurringTicketCommand.md)
 - [HelpdeskApplicationSchedulingCommandsUpdateAutoCloseConfigCommand](docs/HelpdeskApplicationSchedulingCommandsUpdateAutoCloseConfigCommand.md)
 - [HelpdeskApplicationSchedulingCommandsUpdateRecurringTicketCommand](docs/HelpdeskApplicationSchedulingCommandsUpdateRecurringTicketCommand.md)
 - [HelpdeskApplicationSchedulingDTOsAutoCloseConfigurationDto](docs/HelpdeskApplicationSchedulingDTOsAutoCloseConfigurationDto.md)
 - [HelpdeskApplicationSchedulingDTOsRecurringTicketDto](docs/HelpdeskApplicationSchedulingDTOsRecurringTicketDto.md)
 - [HelpdeskApplicationSlaCommandsCreateSlaPolicyCreatePrincipalSlaPolicyCommand](docs/HelpdeskApplicationSlaCommandsCreateSlaPolicyCreatePrincipalSlaPolicyCommand.md)
 - [HelpdeskApplicationSlaCommandsCreateSlaPolicyCreateSlaPolicyCommand](docs/HelpdeskApplicationSlaCommandsCreateSlaPolicyCreateSlaPolicyCommand.md)
 - [HelpdeskApplicationSlaCommandsStartSlaTimerStartSlaTimerCommand](docs/HelpdeskApplicationSlaCommandsStartSlaTimerStartSlaTimerCommand.md)
 - [HelpdeskApplicationSlaCommandsUpdateSlaPolicyUpdatePrincipalSlaPolicyCommand](docs/HelpdeskApplicationSlaCommandsUpdateSlaPolicyUpdatePrincipalSlaPolicyCommand.md)
 - [HelpdeskApplicationSlaCommandsUpdateSlaPolicyUpdateSlaPolicyCommand](docs/HelpdeskApplicationSlaCommandsUpdateSlaPolicyUpdateSlaPolicyCommand.md)
 - [HelpdeskApplicationSlaDTOsSlaPolicyDto](docs/HelpdeskApplicationSlaDTOsSlaPolicyDto.md)
 - [HelpdeskApplicationSlaDTOsTicketSlaStatusDto](docs/HelpdeskApplicationSlaDTOsTicketSlaStatusDto.md)
 - [HelpdeskApplicationSlaQueriesGetBusinessHoursSchedulesBusinessHoursScheduleSummaryDto](docs/HelpdeskApplicationSlaQueriesGetBusinessHoursSchedulesBusinessHoursScheduleSummaryDto.md)
 - [HelpdeskApplicationTagsCommandsCreateTagCreateTagCommand](docs/HelpdeskApplicationTagsCommandsCreateTagCreateTagCommand.md)
 - [HelpdeskApplicationTagsDTOsTagDto](docs/HelpdeskApplicationTagsDTOsTagDto.md)
 - [HelpdeskApplicationTicketsCommandsAddTicketLinkedEntityAddTicketLinkedEntityCommand](docs/HelpdeskApplicationTicketsCommandsAddTicketLinkedEntityAddTicketLinkedEntityCommand.md)
 - [HelpdeskApplicationTicketsCommandsAssignTicketAssignTicketCommand](docs/HelpdeskApplicationTicketsCommandsAssignTicketAssignTicketCommand.md)
 - [HelpdeskApplicationTicketsCommandsChangeTicketCategoryChangeTicketCategoryCommand](docs/HelpdeskApplicationTicketsCommandsChangeTicketCategoryChangeTicketCategoryCommand.md)
 - [HelpdeskApplicationTicketsCommandsChangeTicketPriorityChangeTicketPriorityCommand](docs/HelpdeskApplicationTicketsCommandsChangeTicketPriorityChangeTicketPriorityCommand.md)
 - [HelpdeskApplicationTicketsCommandsChangeTicketStatusChangeTicketStatusCommand](docs/HelpdeskApplicationTicketsCommandsChangeTicketStatusChangeTicketStatusCommand.md)
 - [HelpdeskApplicationTicketsCommandsConvertTicketToReplyConvertTicketToReplyCommand](docs/HelpdeskApplicationTicketsCommandsConvertTicketToReplyConvertTicketToReplyCommand.md)
 - [HelpdeskApplicationTicketsCommandsCreateSubtaskCreateSubtaskCommand](docs/HelpdeskApplicationTicketsCommandsCreateSubtaskCreateSubtaskCommand.md)
 - [HelpdeskApplicationTicketsCommandsCreateTicketCreateTicketCommand](docs/HelpdeskApplicationTicketsCommandsCreateTicketCreateTicketCommand.md)
 - [HelpdeskApplicationTicketsCommandsForwardTicketForwardTicketCommand](docs/HelpdeskApplicationTicketsCommandsForwardTicketForwardTicketCommand.md)
 - [HelpdeskApplicationTicketsCommandsLinkAssetToTicketLinkAssetToTicketCommand](docs/HelpdeskApplicationTicketsCommandsLinkAssetToTicketLinkAssetToTicketCommand.md)
 - [HelpdeskApplicationTicketsCommandsLinkTicketsLinkTicketsCommand](docs/HelpdeskApplicationTicketsCommandsLinkTicketsLinkTicketsCommand.md)
 - [HelpdeskApplicationTicketsCommandsMergeTicketsMergeTicketsCommand](docs/HelpdeskApplicationTicketsCommandsMergeTicketsMergeTicketsCommand.md)
 - [HelpdeskApplicationTicketsCommandsUpdateTicketUpdateTicketCommand](docs/HelpdeskApplicationTicketsCommandsUpdateTicketUpdateTicketCommand.md)
 - [HelpdeskApplicationTicketsDTOsIdeaDto](docs/HelpdeskApplicationTicketsDTOsIdeaDto.md)
 - [HelpdeskApplicationTicketsDTOsLinkedAssetDto](docs/HelpdeskApplicationTicketsDTOsLinkedAssetDto.md)
 - [HelpdeskApplicationTicketsDTOsTicketAssigneeCountDto](docs/HelpdeskApplicationTicketsDTOsTicketAssigneeCountDto.md)
 - [HelpdeskApplicationTicketsDTOsTicketCountsDto](docs/HelpdeskApplicationTicketsDTOsTicketCountsDto.md)
 - [HelpdeskApplicationTicketsDTOsTicketDto](docs/HelpdeskApplicationTicketsDTOsTicketDto.md)
 - [HelpdeskApplicationTicketsDTOsTicketLinkDto](docs/HelpdeskApplicationTicketsDTOsTicketLinkDto.md)
 - [HelpdeskApplicationTicketsDTOsTicketLinkedEntityDto](docs/HelpdeskApplicationTicketsDTOsTicketLinkedEntityDto.md)
 - [HelpdeskApplicationTicketsDTOsTicketListDto](docs/HelpdeskApplicationTicketsDTOsTicketListDto.md)
 - [HelpdeskApplicationTicketsDTOsTicketStatsDto](docs/HelpdeskApplicationTicketsDTOsTicketStatsDto.md)
 - [HelpdeskApplicationTicketsDTOsTicketStatsDtoByPriority](docs/HelpdeskApplicationTicketsDTOsTicketStatsDtoByPriority.md)
 - [HelpdeskApplicationTicketsDTOsTicketStatsDtoByStatus](docs/HelpdeskApplicationTicketsDTOsTicketStatsDtoByStatus.md)
 - [HelpdeskApplicationTicketsDTOsTicketTabCountsDto](docs/HelpdeskApplicationTicketsDTOsTicketTabCountsDto.md)
 - [HelpdeskApplicationTimeTrackingCommandsAddTimeEntryCommand](docs/HelpdeskApplicationTimeTrackingCommandsAddTimeEntryCommand.md)
 - [HelpdeskApplicationTimeTrackingCommandsUpdateTimeEntryCommand](docs/HelpdeskApplicationTimeTrackingCommandsUpdateTimeEntryCommand.md)
 - [HelpdeskApplicationTimeTrackingDTOsTimeEntryDto](docs/HelpdeskApplicationTimeTrackingDTOsTimeEntryDto.md)
 - [HelpdeskApplicationWidgetCommandsCreateWidgetTicketCreateWidgetTicketCommand](docs/HelpdeskApplicationWidgetCommandsCreateWidgetTicketCreateWidgetTicketCommand.md)
 - [HelpdeskApplicationWidgetDTOsWidgetCategoryDto](docs/HelpdeskApplicationWidgetDTOsWidgetCategoryDto.md)
 - [HelpdeskApplicationWidgetDTOsWidgetTicketDto](docs/HelpdeskApplicationWidgetDTOsWidgetTicketDto.md)
 - [HelpdeskApplicationWorkflowsCommandsClonePrincipalWorkflowDefinitionClonePrincipalWorkflowDefinitionRequest](docs/HelpdeskApplicationWorkflowsCommandsClonePrincipalWorkflowDefinitionClonePrincipalWorkflowDefinitionRequest.md)
 - [HelpdeskApplicationWorkflowsCommandsClonePrincipalWorkflowDefinitionClonePrincipalWorkflowDefinitionResult](docs/HelpdeskApplicationWorkflowsCommandsClonePrincipalWorkflowDefinitionClonePrincipalWorkflowDefinitionResult.md)
 - [HelpdeskApplicationWorkflowsCommandsCloneWorkflowDefinitionCloneWorkflowDefinitionRequest](docs/HelpdeskApplicationWorkflowsCommandsCloneWorkflowDefinitionCloneWorkflowDefinitionRequest.md)
 - [HelpdeskApplicationWorkflowsCommandsCloneWorkflowDefinitionCloneWorkflowDefinitionResult](docs/HelpdeskApplicationWorkflowsCommandsCloneWorkflowDefinitionCloneWorkflowDefinitionResult.md)
 - [HelpdeskApplicationWorkflowsCommandsCreatePrincipalWorkflowDefinitionCreatePrincipalWorkflowDefinitionCommand](docs/HelpdeskApplicationWorkflowsCommandsCreatePrincipalWorkflowDefinitionCreatePrincipalWorkflowDefinitionCommand.md)
 - [HelpdeskApplicationWorkflowsCommandsCreatePrincipalWorkflowDefinitionCreatePrincipalWorkflowDefinitionResult](docs/HelpdeskApplicationWorkflowsCommandsCreatePrincipalWorkflowDefinitionCreatePrincipalWorkflowDefinitionResult.md)
 - [HelpdeskApplicationWorkflowsCommandsCreateWorkflowDefinitionCreateWorkflowDefinitionCommand](docs/HelpdeskApplicationWorkflowsCommandsCreateWorkflowDefinitionCreateWorkflowDefinitionCommand.md)
 - [HelpdeskApplicationWorkflowsCommandsCreateWorkflowDefinitionCreateWorkflowDefinitionResult](docs/HelpdeskApplicationWorkflowsCommandsCreateWorkflowDefinitionCreateWorkflowDefinitionResult.md)
 - [HelpdeskApplicationWorkflowsCommandsInvokeTransitionInvokeTransitionResult](docs/HelpdeskApplicationWorkflowsCommandsInvokeTransitionInvokeTransitionResult.md)
 - [HelpdeskApplicationWorkflowsCommandsMigrateLegacyAutomationRulesMigrationResult](docs/HelpdeskApplicationWorkflowsCommandsMigrateLegacyAutomationRulesMigrationResult.md)
 - [HelpdeskApplicationWorkflowsCommandsPublishPrincipalWorkflowDraftPublishPrincipalWorkflowDraftCommand](docs/HelpdeskApplicationWorkflowsCommandsPublishPrincipalWorkflowDraftPublishPrincipalWorkflowDraftCommand.md)
 - [HelpdeskApplicationWorkflowsCommandsPublishWorkflowDraftPublishWorkflowDraftCommand](docs/HelpdeskApplicationWorkflowsCommandsPublishWorkflowDraftPublishWorkflowDraftCommand.md)
 - [HelpdeskApplicationWorkflowsCommandsUpdatePrincipalWorkflowDraftUpdatePrincipalWorkflowDraftCommand](docs/HelpdeskApplicationWorkflowsCommandsUpdatePrincipalWorkflowDraftUpdatePrincipalWorkflowDraftCommand.md)
 - [HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateGuardSpecInput](docs/HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateGuardSpecInput.md)
 - [HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateParallelSpecInput](docs/HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateParallelSpecInput.md)
 - [HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateWorkflowDraftCommand](docs/HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateWorkflowDraftCommand.md)
 - [HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateWorkflowDraftStateInput](docs/HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateWorkflowDraftStateInput.md)
 - [HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateWorkflowDraftTransitionInput](docs/HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateWorkflowDraftTransitionInput.md)
 - [HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateWorkflowTimerSpecInput](docs/HelpdeskApplicationWorkflowsCommandsUpdateWorkflowDraftUpdateWorkflowTimerSpecInput.md)
 - [HelpdeskApplicationWorkflowsQueriesGetAvailableTransitionsAvailableTransitionDto](docs/HelpdeskApplicationWorkflowsQueriesGetAvailableTransitionsAvailableTransitionDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetAvailableTransitionsFieldErrorDto](docs/HelpdeskApplicationWorkflowsQueriesGetAvailableTransitionsFieldErrorDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetRuleMigrationReportRuleMigrationReportItem](docs/HelpdeskApplicationWorkflowsQueriesGetRuleMigrationReportRuleMigrationReportItem.md)
 - [HelpdeskApplicationWorkflowsQueriesGetTicketWorkflowTicketWorkflowDto](docs/HelpdeskApplicationWorkflowsQueriesGetTicketWorkflowTicketWorkflowDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetTicketWorkflowWorkflowHistoryEntryDto](docs/HelpdeskApplicationWorkflowsQueriesGetTicketWorkflowWorkflowHistoryEntryDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionGuardSpecDto](docs/HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionGuardSpecDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionParallelSpecDto](docs/HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionParallelSpecDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowApprovalSpecDto](docs/HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowApprovalSpecDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowDefinitionDto](docs/HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowDefinitionDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowStateDto](docs/HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowStateDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowTimerSpecDto](docs/HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowTimerSpecDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowTransitionDto](docs/HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowTransitionDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowVersionDto](docs/HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionWorkflowVersionDto.md)
 - [HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionsWorkflowDefinitionSummaryDto](docs/HelpdeskApplicationWorkflowsQueriesGetWorkflowDefinitionsWorkflowDefinitionSummaryDto.md)
 - [HelpdeskApplicationWorkflowsQueriesValidateWorkflowVersionWorkflowValidationErrorDto](docs/HelpdeskApplicationWorkflowsQueriesValidateWorkflowVersionWorkflowValidationErrorDto.md)
 - [HelpdeskApplicationWorkflowsQueriesValidateWorkflowVersionWorkflowValidationResultDto](docs/HelpdeskApplicationWorkflowsQueriesValidateWorkflowVersionWorkflowValidationResultDto.md)
 - [HelpdeskDomainApprovalsEnumsApprovalDecisionType](docs/HelpdeskDomainApprovalsEnumsApprovalDecisionType.md)
 - [HelpdeskDomainApprovalsEnumsApprovalMode](docs/HelpdeskDomainApprovalsEnumsApprovalMode.md)
 - [HelpdeskDomainApprovalsEnumsApprovalState](docs/HelpdeskDomainApprovalsEnumsApprovalState.md)
 - [HelpdeskDomainCannedResponsesEnumsCannedResponseScope](docs/HelpdeskDomainCannedResponsesEnumsCannedResponseScope.md)
 - [HelpdeskDomainCategoriesEnumsAccessLevel](docs/HelpdeskDomainCategoriesEnumsAccessLevel.md)
 - [HelpdeskDomainCategoriesEnumsCustomFieldType](docs/HelpdeskDomainCategoriesEnumsCustomFieldType.md)
 - [HelpdeskDomainCategoriesEnumsCustomFieldUsageType](docs/HelpdeskDomainCategoriesEnumsCustomFieldUsageType.md)
 - [HelpdeskDomainCommentsEnumsCommentType](docs/HelpdeskDomainCommentsEnumsCommentType.md)
 - [HelpdeskDomainCommonEnumsAudience](docs/HelpdeskDomainCommonEnumsAudience.md)
 - [HelpdeskDomainIntegrationsEnumsIntegrationType](docs/HelpdeskDomainIntegrationsEnumsIntegrationType.md)
 - [HelpdeskDomainKnowledgeBaseEnumsKbArticleAccessLevel](docs/HelpdeskDomainKnowledgeBaseEnumsKbArticleAccessLevel.md)
 - [HelpdeskDomainKnowledgeBaseEnumsKbArticleStatus](docs/HelpdeskDomainKnowledgeBaseEnumsKbArticleStatus.md)
 - [HelpdeskDomainKnowledgeBaseEnumsKbPortalSection](docs/HelpdeskDomainKnowledgeBaseEnumsKbPortalSection.md)
 - [HelpdeskDomainReportingEnumsDynamicsGranularity](docs/HelpdeskDomainReportingEnumsDynamicsGranularity.md)
 - [HelpdeskDomainReportingEnumsReportExecutionStatus](docs/HelpdeskDomainReportingEnumsReportExecutionStatus.md)
 - [HelpdeskDomainReportingEnumsReportExportFormat](docs/HelpdeskDomainReportingEnumsReportExportFormat.md)
 - [HelpdeskDomainSchedulingEnumsRecurrenceFrequency](docs/HelpdeskDomainSchedulingEnumsRecurrenceFrequency.md)
 - [HelpdeskDomainSchedulingEnumsRecurrenceMode](docs/HelpdeskDomainSchedulingEnumsRecurrenceMode.md)
 - [HelpdeskDomainSlaEnumsSlaTimerState](docs/HelpdeskDomainSlaEnumsSlaTimerState.md)
 - [HelpdeskDomainTicketsEnumsTicketLinkType](docs/HelpdeskDomainTicketsEnumsTicketLinkType.md)
 - [HelpdeskDomainTicketsEnumsTicketOrigin](docs/HelpdeskDomainTicketsEnumsTicketOrigin.md)
 - [HelpdeskDomainTicketsEnumsTicketPriority](docs/HelpdeskDomainTicketsEnumsTicketPriority.md)
 - [HelpdeskDomainTicketsEnumsTicketStatus](docs/HelpdeskDomainTicketsEnumsTicketStatus.md)
 - [MicrosoftAspNetCoreMvcProblemDetails](docs/MicrosoftAspNetCoreMvcProblemDetails.md)
 - [ServicesCoreAbstractionsRecordMeta](docs/ServicesCoreAbstractionsRecordMeta.md)
 - [ServicesCoreAbstractionsRecordUser](docs/ServicesCoreAbstractionsRecordUser.md)
 - [ServicesCoreAbstractionsScopeLevel](docs/ServicesCoreAbstractionsScopeLevel.md)
 - [ServicesCoreAbstractionsScopePatch](docs/ServicesCoreAbstractionsScopePatch.md)
 - [ServicesCoreAbstractionsScopeSnapshot](docs/ServicesCoreAbstractionsScopeSnapshot.md)
 - [ServicesCoreAbstractionsVisibility](docs/ServicesCoreAbstractionsVisibility.md)
 - [ServicesCoreRulesApplicationCommandsCreateRuleGraphCreateRuleGraphCommand](docs/ServicesCoreRulesApplicationCommandsCreateRuleGraphCreateRuleGraphCommand.md)
 - [ServicesCoreRulesApplicationCommandsCreateRuleGraphVersionCreateRuleGraphVersionCommand](docs/ServicesCoreRulesApplicationCommandsCreateRuleGraphVersionCreateRuleGraphVersionCommand.md)
 - [ServicesCoreRulesApplicationCommandsCreateRuleProjectCreateRuleProjectCommand](docs/ServicesCoreRulesApplicationCommandsCreateRuleProjectCreateRuleProjectCommand.md)
 - [ServicesCoreRulesApplicationCommandsPublishRuleGraphVersionPublishRuleGraphVersionCommand](docs/ServicesCoreRulesApplicationCommandsPublishRuleGraphVersionPublishRuleGraphVersionCommand.md)
 - [ServicesCoreRulesApplicationCommandsSaveRuleGraphDraftSaveRuleGraphDraftCommand](docs/ServicesCoreRulesApplicationCommandsSaveRuleGraphDraftSaveRuleGraphDraftCommand.md)
 - [ServicesCoreRulesApplicationCommandsUpdateRuleGraphUpdateRuleGraphCommand](docs/ServicesCoreRulesApplicationCommandsUpdateRuleGraphUpdateRuleGraphCommand.md)
 - [ServicesCoreRulesApplicationCommandsUpdateRuleProjectUpdateRuleProjectCommand](docs/ServicesCoreRulesApplicationCommandsUpdateRuleProjectUpdateRuleProjectCommand.md)
 - [ServicesCoreRulesApplicationModelsBulkRuleEvaluationRequestDto](docs/ServicesCoreRulesApplicationModelsBulkRuleEvaluationRequestDto.md)
 - [ServicesCoreRulesApplicationModelsBulkRuleEvaluationResultDto](docs/ServicesCoreRulesApplicationModelsBulkRuleEvaluationResultDto.md)
 - [ServicesCoreRulesApplicationModelsCompileWarningDto](docs/ServicesCoreRulesApplicationModelsCompileWarningDto.md)
 - [ServicesCoreRulesApplicationModelsDayScheduleDto](docs/ServicesCoreRulesApplicationModelsDayScheduleDto.md)
 - [ServicesCoreRulesApplicationModelsExpressionErrorDto](docs/ServicesCoreRulesApplicationModelsExpressionErrorDto.md)
 - [ServicesCoreRulesApplicationModelsExpressionValidationRequestDto](docs/ServicesCoreRulesApplicationModelsExpressionValidationRequestDto.md)
 - [ServicesCoreRulesApplicationModelsGraphValidationRequestDto](docs/ServicesCoreRulesApplicationModelsGraphValidationRequestDto.md)
 - [ServicesCoreRulesApplicationModelsRuleEvaluationRequestDto](docs/ServicesCoreRulesApplicationModelsRuleEvaluationRequestDto.md)
 - [ServicesCoreRulesApplicationModelsRuleEvaluationResultDto](docs/ServicesCoreRulesApplicationModelsRuleEvaluationResultDto.md)
 - [ServicesCoreRulesApplicationModelsRuleExecutionLogDto](docs/ServicesCoreRulesApplicationModelsRuleExecutionLogDto.md)
 - [ServicesCoreRulesApplicationModelsRuleExecutionLogPageDto](docs/ServicesCoreRulesApplicationModelsRuleExecutionLogPageDto.md)
 - [ServicesCoreRulesApplicationModelsRuleGraphDto](docs/ServicesCoreRulesApplicationModelsRuleGraphDto.md)
 - [ServicesCoreRulesApplicationModelsRuleGraphVersionDto](docs/ServicesCoreRulesApplicationModelsRuleGraphVersionDto.md)
 - [ServicesCoreRulesApplicationModelsRuleKeyEvaluationResult](docs/ServicesCoreRulesApplicationModelsRuleKeyEvaluationResult.md)
 - [ServicesCoreRulesApplicationModelsRuleProjectDto](docs/ServicesCoreRulesApplicationModelsRuleProjectDto.md)
 - [ServicesCoreRulesApplicationModelsScheduleConfigDto](docs/ServicesCoreRulesApplicationModelsScheduleConfigDto.md)
 - [ServicesCoreRulesApplicationModelsValidationResultDto](docs/ServicesCoreRulesApplicationModelsValidationResultDto.md)
 - [ServicesCoreScopeAspNetCoreControllersBulkScopeOutcome](docs/ServicesCoreScopeAspNetCoreControllersBulkScopeOutcome.md)
 - [ServicesCoreScopeAspNetCoreControllersBulkScopePatchRecordResult](docs/ServicesCoreScopeAspNetCoreControllersBulkScopePatchRecordResult.md)
 - [ServicesCoreScopeAspNetCoreControllersBulkScopePatchRequest](docs/ServicesCoreScopeAspNetCoreControllersBulkScopePatchRequest.md)
 - [ServicesCoreScopeAspNetCoreControllersBulkScopePatchResponse](docs/ServicesCoreScopeAspNetCoreControllersBulkScopePatchResponse.md)
 - [ServicesCoreWorkflowsAbstractionsEnumsWorkflowVersionStatus](docs/ServicesCoreWorkflowsAbstractionsEnumsWorkflowVersionStatus.md)
 - [SystemDayOfWeek](docs/SystemDayOfWeek.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization


Authentication schemes defined for the API:
<a id="Bearer"></a>
### Bearer

- **Type**: Bearer authentication (JWT)

<a id="ContextToken"></a>
### ContextToken

- **Type**: API key
- **API key parameter name**: X-Context-Token
- **Location**: HTTP header

