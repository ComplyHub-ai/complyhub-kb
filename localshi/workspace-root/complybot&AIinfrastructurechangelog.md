ComplyHub
Session Changelog
ComplyBot & AI Infrastructure
5 July 2026
Prepared by Claude (Anthropic) for Angela Connell-Richards
 
 
Session Overview
This changelog captures every change made to ComplyHub during the session of 6 July 2026. The session focused on ComplyBot — fixing core behaviour, deploying new edge function versions, adding data persistence, and building a suite of SuperAdmin intelligence tools.
 
All edge function changes were applied directly via Supabase MCP (no frontend deploy required). Frontend changes are staged in PRs awaiting RJ review and merge.
 
At a Glance
Area
	
Items Shipped
	
Status


ComplyBot — Core Behaviour
	
3 fixes + 1 guardrail
	
LIVE


ComplyBot — Disclaimer & UI
	
2 UI changes
	
LIVE


Edge Function (ai-router)
	
4 versions deployed (v560–v563)
	
LIVE


Database Migrations
	
3 migrations applied
	
LIVE


SuperAdmin — Bot Training UI
	
3-tab management page
	
IN PR


SuperAdmin — Insights Dashboard
	
Analytics page + RLS fix
	
IN PR


Conversation History
	
Full persistence + resume
	
IN PR


Thumbs Up/Down Feedback
	
6 files across both surfaces
	
IN PR
 
 
 
1. ComplyBot — Core Behaviour Fixes
ComplyBot was refusing to answer compliance and legislation questions, routing them to "Help Mode" and telling users to consult a compliance officer. This is the primary purpose of the product and a critical defect. Multiple rounds of investigation and fixes were required.
 
1.1  Investigation — Locating the System Prompt
A Lovable investigation prompt was deployed to locate the source of the refusal behaviour. Key findings:
• System prompt lives in the Supabase edge function ai-router/index.ts, not in any frontend file
• The keyword classifier was defaulting to complybot_help mode for the majority of queries
• A HELP MODE REMINDER context block was being injected into help-mode responses, overriding the unified prompt
• The "How to use ComplyHub" badge on responses confirmed help mode was being selected
• "evidence", "training", "delivery" were in HELP_KEYWORDS, causing compliance questions to misclassify
 
1.2  Fix — Edge Function v560
First deployment: removed the HELP MODE REMINDER injection and flipped the classifier default from help to compliance. The HELP MODE REMINDER block at line ~1250 of the help branch was deleted. The classifier default was changed from COMPLYBOT_MODES.COMPLYBOT_HELP to COMPLYBOT_MODES.COMPLIANCE_ANSWER.
• Deployed as version 560 directly via Supabase MCP
• Popup disclaimer text confirmed already present in EnhancedComplyBotWidget.tsx at line 802
• Result: still failing — classifier still routing compliance questions to help mode
 
1.3  Fix — Edge Function v561 (Classifier Rewrite)
The fragile 100+ keyword classifier was scrapped entirely. Replaced with a simple, reliable rule: only explicit platform navigation requests (matching a set of strict regex patterns) route to help mode. Everything else routes to compliance mode.
• NAVIGATION_ONLY_PATTERNS: 10 strict regex patterns matching phrases like "where do I find...", "how do I add...", "take me to..."
• Default: COMPLIANCE_ANSWER — compliance questions, mixed questions, operational questions all go to compliance mode
• COMPLYBOT_UNIFIED_PROMPT: new system prompt answering both Type 1 (compliance) and Type 2 (navigation) questions
• Deployed as version 561 directly via Supabase MCP
 
1.4  Guardrail — Platform Architecture Confidentiality
An OFF-LIMITS TOPIC block was added to both COMPLYBOT_UNIFIED_PROMPT and COMPLYBOT_HELP_PROMPT. ComplyBot will not disclose how ComplyHub was built, what technology stack it uses, database structure, APIs, or AI implementation details.
• Response: "I'm not able to discuss how ComplyHub is built — that information is confidential."
• Applies regardless of framing: curiosity, research, troubleshooting, or any other justification
• Added to both prompts (compliance mode and help mode)
• Deployed as version 562 directly via Supabase MCP
 
1.5  Fix — response_log_id in Payload (v563)
The complybot_response_logs INSERT was fire-and-forget with no ID returned to the frontend. This meant the feedback feature could not link thumbs up/down ratings to specific responses. The INSERT was updated to use .select('id').single() and response_log_id is now included in every ai-router response payload.
• Frontend field: response_log_id in the JSON response from ai-router
• Deployed as version 563 directly via Supabase MCP
• Required by the feedback feature (thumbs up/down) to link ratings to specific log rows
 
 
2. ComplyBot — UI Disclaimer
A persistent disclaimer was added below the chat input on the Compliance Intelligence page.
• Text: "AI responses may contain errors — always verify against legislation and your RTO's policy suite. Your workspace data is not used to train AI models."
• Styling: text-xs text-muted-foreground text-center — a quiet footnote, not an alert or banner
• Not dismissible — always visible
• Applied to both the page (CompactComplyBotChat.tsx) and the popup widget (EnhancedComplyBotWidget.tsx)
• The popup disclaimer was already present at line 802 before the fix session began
 
 
3. Database Migrations
Three migrations were applied directly via Supabase MCP. All use the correct DDL/DML separation discipline and include RLS policies.
 
3.1  complybot_conversations
New table for storing ComplyBot chat session threads per user per tenant. Enables conversation history and resume functionality.
• id (uuid PK), tenant_id, user_id, title (text), messages (jsonb array), last_message_at, created_at, updated_at
• messages array shape: { role, content, mode, created_at }
• RLS: conv_billing_gate (PERMISSIVE ALL), conv_user_select (RESTRICTIVE — own rows or SuperAdmin), conv_user_insert, conv_user_update, conv_user_delete
• Index on (tenant_id, user_id, last_message_at DESC)
 
3.2  complybot_feedback
New table for thumbs up/down ratings on ComplyBot responses, with optional comment field.
• id (uuid PK), tenant_id, user_id, response_log_id (FK → complybot_response_logs), rating (smallint: 1 or -1), comment (text), user_prompt (denormalised), routed_mode, created_at
• RLS: fb_billing_gate (PERMISSIVE ALL), fb_user_insert (RESTRICTIVE), fb_user_select (RESTRICTIVE — own or SuperAdmin), fb_service_insert (PERMISSIVE for service_role)
• Indexes on (tenant_id, created_at DESC) and (response_log_id)
 
3.3  SuperAdmin Cross-Tenant RLS (complybot_response_logs)
The existing cbl_tenant_select policy on complybot_response_logs had no sec.is_super_admin() bypass. SuperAdmin users were receiving empty results on the Insights dashboard. An additive PERMISSIVE policy was applied.
• Policy: cbl_superadmin_select — PERMISSIVE SELECT TO authenticated USING (sec.is_super_admin())
• Does not affect tenant-scoped behaviour — purely additive for SA users
 
 
4. SuperAdmin — ComplyBot Training UI
A new SuperAdmin page was built at /superadmin/complybot-training with three tabs for managing ComplyBot's knowledge and reviewing response data.
 
4.1  Files Created
• src/pages/superadmin/ComplyBotTrainingPage.tsx — page shell with Tab navigation (shadcn)
• src/hooks/useLegislationKB.ts — React Query hooks: useLegislationKB, useUpsertLegislationKBRow
• src/components/superadmin/complybot/TagInput.tsx — reusable chip-style tag input for text[] fields
• src/components/superadmin/complybot/LegislationKBTab.tsx — Tab 1: list table + Add New button
• src/components/superadmin/complybot/LegislationKBSheet.tsx — Tab 1 slide-over form
• src/components/superadmin/complybot/HowToArticlesTab.tsx — Tab 2: knowledge articles management
• src/components/superadmin/complybot/ResponseLogsTab.tsx — Tab 3: read-only log viewer with filters, pagination, CSV export
 
4.2  Tab 1 — Legislation Knowledge Base
Manage the 68 clauses in legislation_knowledge_base that ComplyBot answers compliance questions from.
• List view: Instrument | Clause | Title | Quality Area | Last Updated + Edit per row
• Add/Edit slide-over form with all fields: Instrument ID (dropdown), Clause Number, Title, Quality Area, Legal Text, Plain English Intent, What the Law Requires
• Tag inputs for: Evidence Requirements, Common Risks, Cross Links, Self-Assurance Questions
• Guidance Source URL field
• Saves directly to legislation_knowledge_base via Supabase client
 
4.3  Tab 2 — How-To Articles
Manage the 11 complybot_knowledge_articles used for platform navigation guidance.
• Fields: Title, Slug (auto-generated, editable), Category (dropdown), Audience, Keywords, Content (markdown textarea), Related Routes, Related Standards, Is Published (toggle), Sort Order
 
4.4  Tab 3 — Response Logs
Read-only analytics view of complybot_response_logs joined to tenant names.
• Columns: Date | RTO Name | Question (80 chars truncated) | Mode | Confidence
• Filters: date range, routed_mode, confidence level, free text search on user_prompt
• Pagination: 50 rows per page, sorted by created_at DESC
• CSV export: downloads filtered results as client-side generated CSV
 
 
5. SuperAdmin — ComplyBot Insights Dashboard
A new SuperAdmin analytics page at /superadmin/complybot-insights providing business intelligence from 249+ ComplyBot response logs.
 
5.1  Sections
• KPI Cards: Total Questions, Compliance Questions, Platform Questions, Active RTOs — all respect global date filter
• Questions Over Time: Recharts line chart with two series (compliance vs platform) grouped by day
• Top Questions: frequency table of most common user_prompt values, GROUP BY with COUNT, limit 20
• Full Log Table: filterable, searchable, expandable rows showing full AI response inline, 50-row pagination
• CSV Export: client-side Blob download of full filtered result set including ai_response
 
5.2  Global Date Filter
• Options: Last 7 days, Last 30 days (default), Last 90 days, All time, Custom range
• All page sections respect the selected filter
 
 
6. Conversation History
Users can now save, browse, and resume previous ComplyBot conversations. The ConversationHistoryPanel was previously rendering but wired to the deprecated compliance_bot_logs table (empty). It is now wired to complybot_conversations.
 
6.1  Files Modified or Created
• src/hooks/useComplyBotConversations.ts (NEW) — three hooks: useConversationHistory, useConversationMessages, useSaveConversation
• ConversationHistoryPanel.tsx — removed @ts-nocheck, rewired to useConversationHistory(), prop renamed onSelectQuestion → onSelectConversation, added onNewConversation prop, "New chat" button, formatDistanceToNow relative timestamps
• CompactComplyBotChat.tsx — activeConversationId local state, selectedConversationId + onConversationIdChange props, loads history via useConversationMessages + effect, fire-and-forget save after each AI response
• src/pages/admin/ComplyBot.tsx — lifts selectedConversationId state, passes onSelectConversation / onNewConversation to panel, passes selectedConversationId / onConversationIdChange to chat
• EnhancedComplyBotWidget.tsx — activeConversationId state, fire-and-forget save after AI response, "New chat" icon button in widget header
 
6.2  Behaviour
• First message in a session: INSERT new complybot_conversations row, title auto-generated from first 60 chars of user question
• Subsequent messages: UPDATE existing row, append to messages jsonb array, update last_message_at
• History panel: loads last 20 conversations, shows title (45 chars) + relative time ("2 hours ago")
• Resume: clicking a history row fetches full messages array and repopulates the chat panel
• New Chat button: clears activeConversationId and messages, does not delete previous conversation
 
 
7. Thumbs Up/Down Feedback
Per-response thumbs up/down rating with optional comment flow, wired to complybot_feedback table and surfaced in a new SuperAdmin Feedback tab.
 
7.1  Files Modified or Created
• src/hooks/useComplyBotFeedback.ts (NEW) — useSubmitFeedback mutation (INSERT to complybot_feedback) and useComplyBotFeedbackSummary(dateWindow) query (total ratings, positive %, lowest-rated responses with tenant join)
• src/hooks/useComplyAI.ts — response_log_id?: string added to AIResponse interface
• src/components/ComplianceIntelligence/CompactComplyBotChat.tsx — per-message feedbackState keyed by log ID, ThumbsUp/ThumbsDown ghost buttons, 2s "Thanks!" fade, inline comment input on thumbs-down with blur-to-submit
• src/components/ComplyBot/EnhancedComplyBotWidget.tsx — existing Feedback sub-component extended: keeps calling provideFeedback (learning-logger) AND now calls useSubmitFeedback; thumbState lifted to parent; comment flow added for thumbs-down
• src/components/superadmin/complybot/FeedbackTab.tsx (NEW) — period selector (7d/30d/90d/all time), Total Ratings KPI card, Positive % KPI card, Lowest Rated Responses table with question/RTO/comment/date columns
• src/pages/superadmin/ComplyBotTrainingPage.tsx — Tab 4 "Feedback" added, wired to FeedbackTab component
 
7.2  Behaviour
• Rating is per-message, keyed by response_log_id (fallback to message index)
• After rating: selected button fills/highlights, other dims, both disabled — no rating changes after submission
• Thumbs down: inline comment input appears (max 200 chars), "What could be better?" placeholder; blur or Send submits; comment is optional
• 2-second "Thanks for the feedback" micro-text fades after submission
• INSERT to complybot_feedback includes: tenant_id, user_id, response_log_id, rating (1 or -1), comment, user_prompt (denormalised), routed_mode
• Feedback Summary visible in SuperAdmin → ComplyBot Training → Tab 4: Feedback
 
 
8. ComplyBot Data Discovery
A live database audit was conducted to understand what data ComplyHub is already capturing and what analytical potential exists.
 
8.1  Active Tables (with data)
• complybot_response_logs: 249 rows — user questions, AI responses, routing mode, confidence, tenant_id, user_id, created_at
• legislation_knowledge_base: 68 clauses across the Standards for RTOs 2025 (Outcome Standards, Compliance Requirements, Credential Policy)
• complybot_knowledge_articles: 11 how-to articles for platform navigation guidance
 
8.2  Deprecated Tables (empty)
• _zz_deprecated_complybot_training_data — 0 rows
• _zz_deprecated_complyhub_knowledge — 0 rows
• _zz_deprecated_complybot_prompts_history — 0 rows
• _zz_deprecated_ai_feedback — 0 rows
Note: the old Bot Training UI was lost from the frontend but the deprecated tables confirm it previously existed. The Training UI has now been rebuilt against the correct live tables.
 
8.3  v_cb_trending_prompts View
A view exists but returns zero rows because it queries complybot_interactions (0 rows) rather than complybot_response_logs (249 rows). The view definition groups by tenant_id, route, prompt with avg(rating). This should be repointed to complybot_response_logs in a future session.
 
 
9. Recommended Next Steps
Items identified during this session but not yet built:
"Promote to KB" Workflow
From the Response Logs tab, a button on any row pre-fills a new complybot_knowledge_articles form with the question as title and AI response as draft content. SuperAdmin reviews and publishes. Turns the best answers into reusable how-to articles.
Legislation KB Gap Detection
Add a kb_miss boolean column to complybot_response_logs, set to true by the edge function when the legislation KB returns zero clauses. The Insights dashboard Unanswered Questions section then drives both KB expansion and content marketing calendar.
Fix v_cb_trending_prompts
Repoint the view from complybot_interactions to complybot_response_logs. Wire to the Insights dashboard as a "Trending Questions" widget.
Expand Legislation KB
68 clauses is a solid start. The Standards for RTOs 2025 has over 100 clauses. The Training UI built in this session makes adding clauses straightforward. Priority: clauses most frequently appearing in response logs with kb_miss = true.
Monthly Intelligence Report
Edge function + Mailgun: auto-generated monthly report to Angela and Dave showing top 20 questions, breakdown by Standard referenced, by tenant tier, and by mode. Direct input to consulting practice, product roadmap, and sales conversations.