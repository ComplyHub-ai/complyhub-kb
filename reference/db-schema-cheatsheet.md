# DB Schema Cheat Sheet (production: gdwhlstfguxarnxasrrs)

<!-- last_migration: 20260710044121_fix_critical_suggestion_qi_rpcs -->
<!-- generated: live structural snapshot via information_schema/pg_catalog queries (execute_sql) — no row data -->
<!-- excluded: 313 legacy tables matching _deprecated/_zz_deprecated/_import_ prefixes -->

## How to use this file
Before trusting this file for anything beyond casual browsing, query
`select version, name from supabase_migrations.schema_migrations order by version desc limit 1;`
(cheap) and compare to the `last_migration` stamp above. If they match, this file is current — skip
`list_tables`/full information_schema queries entirely. If they differ, only re-derive the table(s)
touched by migrations newer than the stamp (check the migration filename/content to see which table
changed) rather than re-scanning everything.

## Tables

### account_lockouts
- Columns: id (uuid) NOT NULL, user_email (text) NOT NULL, locked_at (timestamp with time zone), unlock_at (timestamp with time zone), reason (text), failed_attempts (integer), created_at (timestamp with time zone)
- RLS: enabled, policies: account_lockouts_access (ALL)

### action_student_refund
- Columns: id (uuid) NOT NULL, org_id (uuid) NOT NULL, student_name (text) NOT NULL, student_id (text), course_code (text) NOT NULL, course_name (text), refund_grounds (text) NOT NULL, fees_paid (numeric) NOT NULL, refund_amount_requested (numeric) NOT NULL, bank_account_name (text) NOT NULL, bank_bsb (text) NOT NULL, bank_account_number (text) NOT NULL, supporting_evidence (text), evidence (jsonb), created_by (uuid) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone), tenant_id (uuid), title (text)
- RLS: enabled, policies: asr_delete (DELETE), asr_insert (INSERT), asr_role_gate (ALL), asr_select (SELECT), asr_update (UPDATE), billing_gate (ALL), write_lock_delete_action_student_refund (DELETE), write_lock_insert_action_student_refund (INSERT), write_lock_update_action_student_refund (UPDATE)

### actions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, register_id (uuid), title (text) NOT NULL, status (USER-DEFINED), due_at (timestamp with time zone), assignee_id (uuid), sla_minutes (integer), escalates_to (uuid), metadata (jsonb), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid)
- FKs: register_id -> registers.id
- RLS: enabled, policies: actions_admin_cm_delete (DELETE), actions_admin_cm_update (UPDATE), actions_admin_cm_write (INSERT), actions_tenant_select (SELECT), billing_gate (ALL), restrict_sa_select_actions (SELECT), write_lock_delete_actions (DELETE), write_lock_insert_actions (INSERT), write_lock_update_actions (UPDATE)

### active_tenant_audit
- Columns: id (bigint) NOT NULL, user_id (uuid) NOT NULL, from_tenant_id (uuid), to_tenant_id (uuid), action (text) NOT NULL, pg_role (text), created_at (timestamp with time zone) NOT NULL
- FKs: user_id -> profiles.id
- RLS: enabled, policies: own_audit_rows (SELECT), superadmin_can_read_audit (SELECT)

### activity_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, user_id (uuid), event_type (text), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Authenticated users can insert activity_log (INSERT), Super admins can read activity_log (SELECT), Tenant members can read own activity_log (SELECT), billing_gate (ALL), write_lock_delete_activity_log (DELETE), write_lock_insert_activity_log (INSERT), write_lock_update_activity_log (UPDATE)

### adc_dd_outcome
- Columns: id (bigint) NOT NULL, label (text) NOT NULL, value (text), sort_order (integer)
- RLS: enabled, policies: adc_dd_outcome_admin_write (ALL), adc_dd_outcome_read (SELECT)

### adc_declaration_years
- Columns: id (uuid) NOT NULL, declaration_period (integer) NOT NULL, questions_seeded (boolean) NOT NULL, questions_seeded_at (timestamp with time zone), questions_seeded_by (text), legislative_context (text), asqa_guidance_url (text), submission_open_date (date), submission_due_date (date) NOT NULL, is_current_year (boolean) NOT NULL, notes (text), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: adc_declaration_years_read_all (SELECT)

### adc_question_responses
- Columns: id (uuid) NOT NULL, adc_register_id (uuid) NOT NULL, question_template_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, response_text (text), word_count (integer), last_edited_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: adc_register_id -> adc_register.id, question_template_id -> adc_question_templates.id, last_edited_by -> profiles.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: adc_responses_delete_governing_person_only (DELETE), adc_responses_insert_governance (INSERT), adc_responses_select_governance (SELECT), adc_responses_tenant_crud (ALL), adc_responses_update_governance (UPDATE)

### adc_question_templates
- Columns: id (uuid) NOT NULL, declaration_period (integer) NOT NULL, question_code (text) NOT NULL, question_text (text) NOT NULL, standard_reference (text), is_required (boolean) NOT NULL, sort_order (integer) NOT NULL, hint_text (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, change_type (text), change_context (text), prior_year_code (text), is_active (boolean) NOT NULL, added_by (text), added_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: adc_question_templates_read_all (SELECT)

### adc_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, declaration_period (integer) NOT NULL, declaration_date (date) NOT NULL, declared_by (uuid), declaration_statement (text), outcome (text), review_date (date), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), ceo_name (text), risk_level (text), org_id (uuid), period_label (text), period_start (date), period_end (date), status (text), officer_role_id (integer), signed_by_name (text), signed_date (date), next_due_date (date), submission_method (text), submission_ref (text), submission_date (date), outcome_id (uuid), supporting_notes (text), evidence_files (jsonb), responsible_person (uuid), responsible_role (text), description (text), title (text), due_date (date), submitted_report_path (text), submitted_report_filename (text), submitted_report_uploaded_at (timestamp with time zone), submitted_report_uploaded_by (uuid), lessons_learned (text), key_themes (ARRAY), internal_review_date (date), internal_reviewer (uuid)
- FKs: internal_reviewer -> profiles.id, submitted_report_uploaded_by -> profiles.id
- RLS: enabled, policies: adc_delete_governing_person_only (DELETE), adc_insert_governance (INSERT), adc_reg_delete (DELETE), adc_reg_insert (INSERT), adc_reg_select (SELECT), adc_reg_update (UPDATE), adc_select_governance (SELECT), adc_update_governance (UPDATE), billing_gate (ALL), restrict_sa_select_adc_register (SELECT), write_lock_delete_adc_register (DELETE), write_lock_insert_adc_register (INSERT), write_lock_update_adc_register (UPDATE)

### adjustment_plans
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, custom_id (text), support_request_id (uuid), student_id (text), student_name (text), title (text), status (text), disability_disclosed (boolean), evidence (text), adjustment_details (text), integrity_check_passed (boolean), review_date (date), communication_record (text), notes (text), updated_by (uuid)
- FKs: created_by -> auth.users.id, updated_by -> auth.users.id, tenant_id -> tenants.tenant_id, support_request_id -> ssr_register.id
- RLS: enabled, policies: adj_plans_delete (DELETE), adj_plans_insert (INSERT), adj_plans_select (SELECT), adj_plans_update (UPDATE), billing_gate (ALL), write_lock_delete_adjustment_plans (DELETE), write_lock_insert_adjustment_plans (INSERT), write_lock_update_adjustment_plans (UPDATE)

### adjustment_plans_audit_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, adjustment_plan_id (uuid), action (text) NOT NULL, performed_by (uuid), performed_at (timestamp with time zone) NOT NULL, old_values (jsonb), new_values (jsonb)
- FKs: tenant_id -> tenants.tenant_id, performed_by -> auth.users.id, adjustment_plan_id -> adjustment_plans.id
- RLS: enabled, policies: Tenant members can insert audit logs (INSERT), Tenant members can view audit logs (SELECT), billing_gate (ALL), write_lock_delete_adjustment_plans_audit_log (DELETE), write_lock_insert_adjustment_plans_audit_log (INSERT), write_lock_update_adjustment_plans_audit_log (UPDATE)

### admin_action_log
- Columns: id (uuid) NOT NULL, actor_id (uuid) NOT NULL, action_type (text) NOT NULL, resource_type (text) NOT NULL, resource_ids (ARRAY) NOT NULL, metadata (jsonb), result (text) NOT NULL, error_message (text), created_at (timestamp with time zone)
- FKs: actor_id -> auth.users.id
- RLS: enabled, policies: admin_action_log_insert (INSERT), admin_action_log_read (SELECT)

### admin_audit
- Columns: id (bigint) NOT NULL, actor (uuid) NOT NULL, action (text) NOT NULL, target (text), payload (jsonb), created_at (timestamp with time zone)
- RLS: enabled, policies: admin_audit_access (ALL)

### admin_repairs_log
- Columns: repair_id (uuid) NOT NULL, performed_by (uuid), action (text) NOT NULL, issue_type (text), ref_table (text), ref_id (text), tenant_id (uuid), target_user (uuid), target_email (text), details (text), created_at (timestamp with time zone)
- RLS: enabled, policies: Super admins only for admin repairs (ALL), billing_gate (ALL), insert_authenticated_super_admins (INSERT), write_lock_delete_admin_repairs_log (DELETE), write_lock_insert_admin_repairs_log (INSERT), write_lock_update_admin_repairs_log (UPDATE)

### affiliate_ref_codes
- Columns: id (uuid) NOT NULL, affiliate_id (uuid) NOT NULL, ref_code (text) NOT NULL, is_active (boolean) NOT NULL, click_count (integer) NOT NULL, signup_count (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid)
- FKs: created_by -> profiles.id, affiliate_id -> consultant_affiliates.id
- RLS: enabled, policies: ref_codes_admin_read (SELECT), ref_codes_anon_select (SELECT), ref_codes_org_select (SELECT), ref_codes_sa_all (ALL)

### ai_analysis_cache
- Columns: id (uuid) NOT NULL, content_hash (text) NOT NULL, analysis_version (text) NOT NULL, response_json (jsonb) NOT NULL, model (text), tokens_used (integer), created_at (timestamp with time zone) NOT NULL, tenant_id (uuid)
- RLS: enabled, policies: ai_analysis_cache_select (SELECT), billing_gate (ALL), write_lock_delete_ai_analysis_cache (DELETE), write_lock_insert_ai_analysis_cache (INSERT), write_lock_update_ai_analysis_cache (UPDATE)

### ai_call_audit
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, update_id (uuid), content_hash (text), prompt_version (text), model (text), tokens_input (integer), tokens_output (integer), tokens_total (integer), cost_estimate (numeric), requester_user_id (uuid) NOT NULL, result_status (text) NOT NULL, error_message (text), analysis_duration_ms (integer), metadata (jsonb), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: ai_call_audit_insert_service (INSERT), ai_call_audit_select (SELECT), billing_gate (ALL), write_lock_delete_ai_call_audit (DELETE), write_lock_insert_ai_call_audit (INSERT), write_lock_update_ai_call_audit (UPDATE)

### ai_eval_query_sets
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, description (text), queries (jsonb) NOT NULL, expected_results (jsonb) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, is_active (boolean) NOT NULL
- RLS: enabled, policies: Super admins only for AI eval query sets (ALL)

### ai_provider_config
- Columns: id (uuid) NOT NULL, tenant_id (uuid), provider (text) NOT NULL, model (text) NOT NULL, enabled (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: ai_provider_config_insert (INSERT), ai_provider_config_select (SELECT), ai_provider_config_update (UPDATE), billing_gate (ALL), write_lock_delete_ai_provider_config (DELETE), write_lock_insert_ai_provider_config (INSERT), write_lock_update_ai_provider_config (UPDATE)

### ai_suggestions
- Columns: id (uuid) NOT NULL, tenant_id (uuid), suggestion (text) NOT NULL, related_area (text), severity (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), is_dismissed (boolean), updated_at (timestamp with time zone) NOT NULL, status (text), priority (text), category (text), tenant_name (text), assigned_to (uuid), title (text) NOT NULL, details (text)
- RLS: enabled, policies: ai_suggestions_admin_cm_delete (DELETE), ai_suggestions_admin_cm_insert (INSERT), ai_suggestions_admin_cm_update (UPDATE), ai_suggestions_tenant_select (SELECT), billing_gate (ALL), write_lock_delete_ai_suggestions (DELETE), write_lock_insert_ai_suggestions (INSERT), write_lock_update_ai_suggestions (UPDATE)

### ai_tagging_audit
- Columns: id (uuid) NOT NULL, document_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, user_id (uuid) NOT NULL, action_type (text) NOT NULL, field_name (text) NOT NULL, old_value (text), new_value (text), confidence_score (integer), detection_method (text), reasoning (text), applied (boolean), created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, metadata (jsonb)
- RLS: enabled, policies: Tenant access for AI tagging audit (ALL), billing_gate (ALL), write_lock_delete_ai_tagging_audit (DELETE), write_lock_insert_ai_tagging_audit (INSERT), write_lock_update_ai_tagging_audit (UPDATE)

### ai_tenant_insights
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, insight_type (text) NOT NULL, confidence_score (numeric), priority (text) NOT NULL, title (text) NOT NULL, description (text) NOT NULL, recommendations (jsonb), metadata (jsonb), expires_at (timestamp with time zone), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: Super admins can access all AI insights (ALL), billing_gate (ALL), write_lock_delete_ai_tenant_insights (DELETE), write_lock_insert_ai_tenant_insights (INSERT), write_lock_update_ai_tenant_insights (UPDATE)

### ai_usage_tracking
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, period_start (date) NOT NULL, calls_used (integer) NOT NULL, tokens_used (integer) NOT NULL, cost_estimate (numeric) NOT NULL, cache_hits (integer) NOT NULL, cache_misses (integer) NOT NULL, failed_calls (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: ai_usage_tracking_select (SELECT), billing_gate (ALL), write_lock_delete_ai_usage_tracking (DELETE), write_lock_insert_ai_usage_tracking (INSERT), write_lock_update_ai_usage_tracking (UPDATE)

### air_dd_audit_type
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text), sort_order (integer), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: Authenticated users can read air audit types (SELECT)

### air_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, tenant_id (uuid), audit_type (text), audit_date (date), scope (text), key_findings (text), non_compliances (text), rectification_actions (text), responsible_person (uuid), closed_date (date), title (text), description (text), status (text), risk_level (text), responsible_role (text), due_date (date), review_date (date), completion_date (date), supporting_documents (jsonb), evidence_files (jsonb), notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), demo_seed (boolean) NOT NULL
- RLS: enabled, policies: air_reg_delete (DELETE), air_reg_insert (INSERT), air_reg_select (SELECT), air_reg_update (UPDATE), billing_gate (ALL), regulator_select_air_register (SELECT), restrict_sa_select_air_register (SELECT), write_lock_delete_air_register (DELETE), write_lock_insert_air_register (INSERT), write_lock_update_air_register (UPDATE)

### aligned_register_actions
- Columns: id (uuid) NOT NULL, register_entry_id (uuid) NOT NULL, action_type (text) NOT NULL, description (text) NOT NULL, assigned_to (uuid), due_date (timestamp with time zone), completed_at (timestamp with time zone), completed_by (uuid), notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL
- FKs: register_entry_id -> aligned_register_entries.id
- RLS: enabled, policies: ara_admin_cm_delete (DELETE), ara_admin_cm_insert (INSERT), ara_admin_cm_update (UPDATE), ara_tenant_select (SELECT)

### aligned_register_entries
- Columns: id (uuid) NOT NULL, register_type (text) NOT NULL, tenant_id (uuid) NOT NULL, human_id (text) NOT NULL, title (text), description (text), status (text) NOT NULL, standard_references (ARRAY), quality_area (text) NOT NULL, event_date (timestamp with time zone) NOT NULL, due_date (timestamp with time zone), sla_type (text), sla_deadline (timestamp with time zone), completion_date (timestamp with time zone), retention_period (text) NOT NULL, retention_until (timestamp with time zone), evidence_files (jsonb), supporting_documents (jsonb), risk_level (text), compliance_notes (text), assigned_to (uuid), reviewed_by (uuid), approved_by (uuid), next_review_date (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid) NOT NULL, register_data (jsonb), responsible_role (text)
- RLS: enabled, policies: aligned_entries_delete (DELETE), aligned_entries_insert (INSERT), aligned_entries_select (SELECT), aligned_entries_update (UPDATE), billing_gate (ALL), write_lock_delete_aligned_register_entries (DELETE), write_lock_insert_aligned_register_entries (INSERT), write_lock_update_aligned_register_entries (UPDATE)

### announcements
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, audience (text) NOT NULL, title (text) NOT NULL, body (text), starts_at (timestamp with time zone), ends_at (timestamp with time zone), is_active (boolean), created_by (uuid), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: announce_delete (DELETE), announce_insert (INSERT), announce_select (SELECT), announce_update (UPDATE), billing_gate (ALL), write_lock_delete_announcements (DELETE), write_lock_insert_announcements (INSERT), write_lock_update_announcements (UPDATE)

### anzsco_qualification_map
- Columns: id (uuid) NOT NULL, qualification_code (text) NOT NULL, anzsco_code (text) NOT NULL, anzsco_title (text) NOT NULL, confidence (text), source (text), created_at (timestamp with time zone)
- RLS: enabled, policies: anzsco_map_all_service (ALL), anzsco_map_insert_service (INSERT), anzsco_map_select_authenticated (SELECT), anzsco_read_all (SELECT)

### app_config
- Columns: key (text) NOT NULL, value (text) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: app_config_access (ALL)

### app_settings
- Columns: id (boolean) NOT NULL, signup_mode (text) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: app_settings_super_admin_access (ALL)

### appeals
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, custom_id (text), title (text), reason (text), appeal_type (text), status (text), determination (text), reviewer_id (uuid), review_notes (text), independent_review_required (boolean), linked_complaint_id (uuid), due_date (date), reviewed_at (timestamp with time zone), updated_by (uuid)
- FKs: linked_complaint_id -> caa_register.id, created_by -> auth.users.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant members can view appeals (SELECT), appeals_admin_cm_delete (DELETE), appeals_admin_cm_insert (INSERT), appeals_admin_cm_update (UPDATE), appeals_tenant_select (SELECT), billing_gate (ALL), restrict_sa_select_appeals (SELECT), write_lock_delete_appeals (DELETE), write_lock_insert_appeals (INSERT), write_lock_update_appeals (UPDATE)

### approval_overrides
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, artefact_type (text) NOT NULL, artefact_id (uuid) NOT NULL, override_reason (text) NOT NULL, blocking_rules (ARRAY) NOT NULL, warning_rules (ARRAY) NOT NULL, created_by (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: approval_overrides_tenant_delete (DELETE), approval_overrides_tenant_insert (INSERT), approval_overrides_tenant_select (SELECT), approval_overrides_tenant_update (UPDATE), billing_gate (ALL), write_lock_delete_approval_overrides (DELETE), write_lock_insert_approval_overrides (INSERT), write_lock_update_approval_overrides (UPDATE)

### aqf_certifications
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, student_id (uuid) NOT NULL, training_product_code (text) NOT NULL, completion_date (date) NOT NULL, due_date (date) NOT NULL, certificate_issue_date (date), status (text) NOT NULL, issued_by (uuid), evidence_document_id (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, trainer_assessment_decision_id (uuid), issuance_alert_sent_at (timestamp with time zone), issuance_overdue_notified_at (timestamp with time zone)
- FKs: trainer_assessment_decision_id -> trainer_assessment_decisions.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_aqf_certifications (DELETE), write_lock_insert_aqf_certifications (INSERT), write_lock_update_aqf_certifications (UPDATE)

### aqf_volume_of_learning_ranges
- Columns: aqf_level (integer) NOT NULL, min_hours (integer) NOT NULL, max_hours (integer) NOT NULL, notes (text), updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: aqf_ranges_read_authenticated (SELECT)

### asqa_deadline_templates
- Columns: id (uuid) NOT NULL, deadline_name (text) NOT NULL, description (text) NOT NULL, annual_due_date (text) NOT NULL, notification_schedule (jsonb) NOT NULL, linked_register (text), owner_role (USER-DEFINED) NOT NULL, priority (USER-DEFINED) NOT NULL, is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: read_authenticated (SELECT), service_role_write (ALL)

### assessment_tool_training_products
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tool_id (uuid) NOT NULL, scope_code (text) NOT NULL, scope_type (text) NOT NULL, title (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid)
- FKs: tenant_id -> tenants.tenant_id, created_by -> auth.users.id, tool_id -> assessment_tools.id
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_attp (SELECT), write_lock_attp (ALL)

### assessment_tool_versions
- Columns: id (uuid) NOT NULL, tool_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, version_number (text) NOT NULL, change_reason (text) NOT NULL, change_summary (text), previous_version (text), approved_by (uuid), approved_at (timestamp with time zone), effective_date (date), document_storage_path (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid)
- FKs: tool_id -> assessment_tools.id, tenant_id -> tenants.tenant_id, approved_by -> auth.users.id, created_by -> auth.users.id
- RLS: enabled, policies: atv_delete (DELETE), atv_insert (INSERT), atv_select (SELECT), atv_update (UPDATE), billing_gate_assessment_tool_versions (ALL), role_visibility_assessment_tool_versions (SELECT), roledelete_assessment_tool_versions (DELETE), rolewrite_insert_assessment_tool_versions (INSERT), rolewrite_update_assessment_tool_versions (UPDATE), tenant_isolate_select_atv (SELECT), write_lock_delete_assessment_tool_versions (DELETE), write_lock_insert_assessment_tool_versions (INSERT), write_lock_update_assessment_tool_versions (UPDATE)

### assessment_tools
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, custom_id (text), tool_name (text) NOT NULL, tool_code (text), description (text), tool_type (text), unit_codes (ARRAY), qualification_code (text), current_version (text), version_date (date), approved_by (uuid), approved_at (timestamp with time zone), status (text), last_validated_at (timestamp with time zone), next_validation_due (date), validation_cycle_months (integer), sufficiency_confirmed (boolean), authenticity_mechanism (text), currency_confirmed (boolean), validity_confirmed (boolean), fairness_notes (text), flexibility_notes (text), reliability_notes (text), validity_notes (text), document_storage_path (text), ci_action_id (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), naming_prefix (text), naming_validated (boolean), qualification_codes (ARRAY)
- FKs: updated_by -> auth.users.id, tenant_id -> tenants.tenant_id, created_by -> auth.users.id, approved_by -> auth.users.id
- RLS: enabled, policies: at_delete (DELETE), at_insert (INSERT), at_select (SELECT), at_update (UPDATE), billing_gate_assessment_tools (ALL), restrict_sa_select_assessment_tools (SELECT), role_visibility_assessment_tools (SELECT), roledelete_assessment_tools (DELETE), rolewrite_insert_assessment_tools (INSERT), rolewrite_update_assessment_tools (UPDATE), tenant_isolate_select_assessment_tools (SELECT), write_lock_delete_assessment_tools (DELETE), write_lock_insert_assessment_tools (INSERT), write_lock_update_assessment_tools (UPDATE)

### assessment_validation
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, custom_id (text) NOT NULL, training_product_code (text) NOT NULL, training_product_title (text), panel_finalised (boolean), scheduled_at (timestamp with time zone), conducted_at (timestamp with time zone), status (text), overall_outcome (text), next_due_date (date), report_url (text), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), tas_id (uuid), clause_scope (ARRAY), unit_codes (ARRAY), assessment_tool_ids (ARRAY), tool_id (uuid), ci_register_id (uuid), ci_action_raised (boolean), industry_consultation_id (uuid), industry_feedback_flag (boolean) NOT NULL, industry_feedback_context (text), industry_feedback_decision_id (uuid)
- FKs: tool_id -> assessment_tools.id, updated_by -> auth.users.id, industry_feedback_decision_id -> industry_consultation_decisions.id, tenant_id -> tenants.tenant_id, tas_id -> q1_tas_builder.id, created_by -> auth.users.id
- RLS: enabled, policies: av_delete (DELETE), av_insert (INSERT), av_select (SELECT), av_update (UPDATE), billing_gate (ALL), restrict_sa_select_assessment_validation (SELECT), write_lock_delete_assessment_validation (DELETE), write_lock_insert_assessment_validation (INSERT), write_lock_update_assessment_validation (UPDATE)

### assessment_validation_action
- Columns: id (uuid) NOT NULL, validation_id (uuid) NOT NULL, finding_id (uuid), description (text) NOT NULL, responsible_user_id (uuid), due_date (date), status (text), completed_at (timestamp with time zone), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: validation_id -> assessment_validation.id, finding_id -> assessment_validation_finding.id, responsible_user_id -> auth.users.id
- RLS: enabled, policies: av_action_delete (DELETE), av_action_insert (INSERT), av_action_select (SELECT), av_action_update (UPDATE)

### assessment_validation_actions
- Columns: id (uuid) NOT NULL, finding_id (uuid) NOT NULL, validation_event_id (uuid) NOT NULL, clause_id (uuid), action_required (text) NOT NULL, owner_role (text) NOT NULL, responsible_user_id (uuid), due_date (date), completed_at (timestamp with time zone), status (text) NOT NULL, notes (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, tenant_id (uuid) NOT NULL
- FKs: validation_event_id -> assessment_validation_events.id, clause_id -> clauses.id, validation_event_id -> assessment_validation.id, finding_id -> assessment_validation_findings.id
- RLS: enabled, policies: av_actions_delete (DELETE), av_actions_insert (INSERT), av_actions_select (SELECT), av_actions_update (UPDATE), billing_gate (ALL), write_lock_delete_assessment_validation_actions (DELETE), write_lock_insert_assessment_validation_actions (INSERT), write_lock_update_assessment_validation_actions (UPDATE)

### assessment_validation_clause_links
- Columns: validation_event_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, tenant_id (uuid) NOT NULL
- FKs: validation_event_id -> assessment_validation_events.id, clause_id -> clauses.id
- RLS: enabled, policies: av_clause_links_delete (DELETE), av_clause_links_insert (INSERT), av_clause_links_select (SELECT), av_clause_links_update (UPDATE), billing_gate (ALL), write_lock_delete_assessment_validation_clause_links (DELETE), write_lock_insert_assessment_validation_clause_links (INSERT), write_lock_update_assessment_validation_clause_links (UPDATE)

### assessment_validation_events
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, custom_id (text) NOT NULL, name (text) NOT NULL, validation_type (text) NOT NULL, status (text) NOT NULL, training_product_code (text), training_product_title (text), scheduled_date (date), completed_date (date), overall_outcome (text), notes (text), report_url (text), panel_finalised (boolean), created_by (uuid), updated_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, lead_validator_id (uuid), validation_eligible_confirmed (boolean) NOT NULL, ci_register_action_id (uuid), unit_codes (ARRAY), panel_members (jsonb)
- FKs: tas_id -> q1_tas_builder.id, lead_validator_id -> tp_trainers.id
- RLS: enabled, policies: ave_admin_cm_delete (DELETE), ave_admin_cm_insert (INSERT), ave_admin_cm_update (UPDATE), ave_tenant_select (SELECT), billing_gate (ALL), write_lock_delete_assessment_validation_events (DELETE), write_lock_insert_assessment_validation_events (INSERT), write_lock_update_assessment_validation_events (UPDATE)

### assessment_validation_finding
- Columns: id (uuid) NOT NULL, validation_id (uuid) NOT NULL, category (text) NOT NULL, description (text) NOT NULL, severity (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, clause_id (uuid)
- FKs: validation_id -> assessment_validation.id, clause_id -> clauses.id
- RLS: enabled, policies: av_finding_delete (DELETE), av_finding_insert (INSERT), av_finding_select (SELECT), av_finding_update (UPDATE)

### assessment_validation_findings
- Columns: id (uuid) NOT NULL, validation_event_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, unit_code (text), assessment_tool_id (uuid), finding_type (text) NOT NULL, category (text), severity (text), description (text) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, tenant_id (uuid) NOT NULL
- FKs: validation_event_id -> assessment_validation_events.id, clause_id -> clauses.id
- RLS: enabled, policies: av_findings_delete (DELETE), av_findings_insert (INSERT), av_findings_select (SELECT), av_findings_update (UPDATE), billing_gate (ALL), write_lock_delete_assessment_validation_findings (DELETE), write_lock_insert_assessment_validation_findings (INSERT), write_lock_update_assessment_validation_findings (UPDATE)

### assessment_validation_panel
- Columns: id (uuid) NOT NULL, validation_id (uuid) NOT NULL, user_id (uuid) NOT NULL, credential_validated (boolean), is_independent (boolean), designed_or_delivered (boolean), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, credential_verified_at (timestamp with time zone), credential_verification_source (text), independence_verified_at (timestamp with time zone), independence_auto_determined (boolean)
- FKs: user_id -> auth.users.id, validation_id -> assessment_validation.id
- RLS: enabled, policies: av_panel_delete (DELETE), av_panel_insert (INSERT), av_panel_select (SELECT), av_panel_update (UPDATE)

### assessment_validation_panel_members
- Columns: id (uuid) NOT NULL, validation_event_id (uuid) NOT NULL, user_id (uuid) NOT NULL, trainer_profile_id (uuid), role (text) NOT NULL, is_independent (boolean), designed_or_delivered (boolean), credential_validated (boolean), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, tenant_id (uuid) NOT NULL
- FKs: validation_event_id -> assessment_validation.id, trainer_profile_id -> tp_trainers.id
- RLS: enabled, policies: av_panel_members_delete (DELETE), av_panel_members_insert (INSERT), av_panel_members_select (SELECT), av_panel_members_update (UPDATE), billing_gate (ALL), write_lock_delete_assessment_validation_panel_members (DELETE), write_lock_insert_assessment_validation_panel_members (INSERT), write_lock_update_assessment_validation_panel_members (UPDATE)

### assessment_validation_sample
- Columns: id (uuid) NOT NULL, validation_id (uuid) NOT NULL, assessment_record_id (uuid), student_name (text), assessor_name (text), cohort (text), mode (text), delivery_location (text), outcome (text), included (boolean), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: validation_id -> assessment_validation.id
- RLS: enabled, policies: av_sample_delete (DELETE), av_sample_insert (INSERT), av_sample_select (SELECT), av_sample_update (UPDATE)

### assessment_validation_tool_review
- Columns: id (uuid) NOT NULL, validation_id (uuid) NOT NULL, validity_check (boolean), validity_notes (text), reliability_check (boolean), reliability_notes (text), fairness_check (boolean), fairness_notes (text), flexibility_check (boolean), flexibility_notes (text), evidence_adequacy_check (boolean), evidence_adequacy_notes (text), overall_notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: validation_id -> assessment_validation.id
- RLS: enabled, policies: assessment_validation_tool_review_tenant_access (ALL)

### assessment_validation_units
- Columns: validation_event_id (uuid) NOT NULL, unit_code (text) NOT NULL, unit_title (text), created_at (timestamp with time zone) NOT NULL, tenant_id (uuid) NOT NULL
- FKs: validation_event_id -> assessment_validation_events.id
- RLS: enabled, policies: av_units_delete (DELETE), av_units_insert (INSERT), av_units_select (SELECT), av_units_update (UPDATE), billing_gate (ALL), write_lock_delete_assessment_validation_units (DELETE), write_lock_insert_assessment_validation_units (INSERT), write_lock_update_assessment_validation_units (UPDATE)

### assessor_consistency_analysis
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, assessor_id (uuid) NOT NULL, name (text) NOT NULL, score (integer) NOT NULL, flags (jsonb), summary (text), outcome_variation (text), judgement_variation (text), resubmission_rate (numeric), repeated_findings (integer), analyzed_at (timestamp with time zone), created_by (uuid)
- FKs: tenant_id -> tenants.tenant_id, created_by -> auth.users.id, assessor_id -> tp_trainers.id
- RLS: enabled, policies: Super admins full access consistency analysis (ALL), Tenant members can delete consistency analysis (DELETE), Tenant members can insert consistency analysis (INSERT), Tenant members can view consistency analysis (SELECT)

### assessor_pd_suggestions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, assessor_id (uuid) NOT NULL, name (text) NOT NULL, topic (text) NOT NULL, reason (text), affected_units (jsonb), priority (text), category (text), generated_at (timestamp with time zone), created_by (uuid), added_to_ci (boolean)
- FKs: assessor_id -> tp_trainers.id, tenant_id -> tenants.tenant_id, created_by -> auth.users.id
- RLS: enabled, policies: Super admins full access pd suggestions (ALL), Tenant members can delete pd suggestions (DELETE), Tenant members can insert pd suggestions (INSERT), Tenant members can view pd suggestions (SELECT)

### audit_cycle
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, year (integer) NOT NULL, period (text) NOT NULL, audit_type (text) NOT NULL, title (text), planned_date (date) NOT NULL, completed_date (date), status (text) NOT NULL, notes (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: audit_cycle_delete (DELETE), audit_cycle_insert (INSERT), audit_cycle_select (SELECT), audit_cycle_update (UPDATE), billing_gate (ALL), write_lock_delete_audit_cycle (DELETE), write_lock_insert_audit_cycle (INSERT), write_lock_update_audit_cycle (UPDATE)

### audit_events
- Columns: id (uuid) NOT NULL, actor_id (uuid), tenant_id (uuid), action (text) NOT NULL, meta (jsonb), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Super admins can view audit events (SELECT), billing_gate (ALL), write_lock_delete_audit_events (DELETE), write_lock_insert_audit_events (INSERT), write_lock_update_audit_events (UPDATE)

### audit_finding_clause_links
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, finding_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, source_type (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: finding_id -> audit_findings.id, clause_id -> compliance_clauses.id
- RLS: enabled, policies: afcl_delete (DELETE), afcl_insert (INSERT), afcl_select (SELECT), afcl_update (UPDATE), billing_gate (ALL), write_lock_delete_audit_finding_clause_links (DELETE), write_lock_insert_audit_finding_clause_links (INSERT), write_lock_update_audit_finding_clause_links (UPDATE)

### audit_findings
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, audit_id (uuid) NOT NULL, finding_type (text) NOT NULL, severity (text) NOT NULL, summary (text) NOT NULL, detail (text), standard_reference (text), ai_source_location (text), status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, risk_score (integer), superseded (boolean) NOT NULL, processing_run_id (text)
- FKs: tenant_id -> tenants.tenant_id, audit_id -> audit_reports.id
- RLS: enabled, policies: audit_find_delete (DELETE), audit_find_insert (INSERT), audit_find_select (SELECT), audit_find_update (UPDATE), billing_gate (ALL), restrict_sa_select_audit_findings (SELECT), write_lock_delete_audit_findings (DELETE), write_lock_insert_audit_findings (INSERT), write_lock_update_audit_findings (UPDATE)

### audit_log
- Columns: id (uuid) NOT NULL, user_id (uuid), tenant_id (uuid), table_name (text) NOT NULL, action (text) NOT NULL, old_data (jsonb), new_data (jsonb), timestamp (timestamp with time zone), occurred_at (timestamp with time zone) NOT NULL, actor_id (uuid), scope (text) NOT NULL, bucket_id (text) NOT NULL, object_name (text) NOT NULL, details (jsonb) NOT NULL
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: audit_log_insert (INSERT), audit_log_select (SELECT), billing_gate (ALL), write_lock_delete_audit_log (DELETE), write_lock_insert_audit_log (INSERT), write_lock_update_audit_log (UPDATE)

### audit_logs
- Columns: id (uuid) NOT NULL, actor_id (uuid), tenant_id (uuid), action (text) NOT NULL, resource_type (text), meta (jsonb), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: audit_logs_insert (INSERT), audit_logs_select (SELECT), billing_gate (ALL), write_lock_delete_audit_logs (DELETE), write_lock_insert_audit_logs (INSERT), write_lock_update_audit_logs (UPDATE)

### audit_pack_jobs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, requested_by (uuid) NOT NULL, status (text) NOT NULL, progress (integer) NOT NULL, config (jsonb) NOT NULL, manifest (jsonb), file_url (text), error_message (text), sections_completed (ARRAY), total_files (integer), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, completed_at (timestamp with time zone)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Users can insert audit pack jobs for own tenant (INSERT), Users can view own tenant audit pack jobs (SELECT), billing_gate (ALL), write_lock_delete_audit_pack_jobs (DELETE), write_lock_insert_audit_pack_jobs (INSERT), write_lock_update_audit_pack_jobs (UPDATE)

### audit_reports
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, created_by (uuid) NOT NULL, audit_type (text) NOT NULL, title (text) NOT NULL, description (text), file_url (text), audit_date (date) NOT NULL, ai_status (text) NOT NULL, ai_summary (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: audit_rep_delete (DELETE), audit_rep_insert (INSERT), audit_rep_select (SELECT), audit_rep_update (UPDATE), billing_gate (ALL), restrict_sa_select_audit_reports (SELECT), write_lock_delete_audit_reports (DELETE), write_lock_insert_audit_reports (INSERT), write_lock_update_audit_reports (UPDATE)

### audit_status
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, status (text) NOT NULL, notes (text), last_reviewed (timestamp with time zone), reviewed_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: reviewed_by -> auth.users.id, tenant_id -> tenants.tenant_id, clause_id -> clauses.id
- RLS: enabled, policies: Tenant members can view own audit status (SELECT), audit_status_delete (DELETE), audit_status_insert (INSERT), audit_status_update (UPDATE), billing_gate (ALL), write_lock_delete_audit_status (DELETE), write_lock_insert_audit_status (INSERT), write_lock_update_audit_status (UPDATE)

### audit_tasks
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, finding_id (uuid) NOT NULL, title (text) NOT NULL, description (text), assigned_role (text) NOT NULL, assigned_to (uuid), due_date (date), status (text) NOT NULL, evidence_url (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id, finding_id -> audit_findings.id
- RLS: enabled, policies: audit_tasks_delete (DELETE), audit_tasks_insert (INSERT), audit_tasks_select (SELECT), audit_tasks_update (UPDATE), billing_gate (ALL), write_lock_delete_audit_tasks (DELETE), write_lock_insert_audit_tasks (INSERT), write_lock_update_audit_tasks (UPDATE)

### audit_template_questions
- Columns: id (uuid) NOT NULL, template_id (uuid) NOT NULL, question_text (text) NOT NULL, question_type (text) NOT NULL, clause_reference (text), order_index (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: template_id -> audit_templates.id
- RLS: enabled, policies: audit_template_questions_tenant_access (ALL)

### audit_templates
- Columns: id (uuid) NOT NULL, tenant_id (uuid), title (text) NOT NULL, description (text), framework_code (text), is_global (boolean) NOT NULL, created_by (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: audit_tpl_delete (DELETE), audit_tpl_insert (INSERT), audit_tpl_select (SELECT), audit_tpl_update (UPDATE), billing_gate (ALL), write_lock_delete_audit_templates (DELETE), write_lock_insert_audit_templates (INSERT), write_lock_update_audit_templates (UPDATE)

### auditor_questions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, audit_id (uuid), trainer_id (uuid), question_text (text) NOT NULL, question_category (text) NOT NULL, severity (text) NOT NULL, status (text) NOT NULL, asked_by (uuid), asked_by_name (text), asked_date (timestamp with time zone) NOT NULL, response_text (text), responded_by (uuid), response_date (timestamp with time zone), shared_with_auditor (boolean) NOT NULL, linked_evidence (jsonb), internal_notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: trainer_id -> tp_trainers.id
- RLS: enabled, policies: auditor_q_delete (DELETE), auditor_q_insert (INSERT), auditor_q_select (SELECT), auditor_q_update (UPDATE), billing_gate (ALL), write_lock_delete_auditor_questions (DELETE), write_lock_insert_auditor_questions (INSERT), write_lock_update_auditor_questions (UPDATE)

### auditor_questions_audit
- Columns: id (uuid) NOT NULL, question_id (uuid) NOT NULL, action (text) NOT NULL, old_values (jsonb), new_values (jsonb), performed_by (uuid), performed_at (timestamp with time zone) NOT NULL
- FKs: question_id -> auditor_questions.id
- RLS: enabled, policies: aqa_insert (INSERT), aqa_select (SELECT)

### auth_activity_log
- Columns: id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, user_id (uuid) NOT NULL, email (text) NOT NULL, full_name (text), action (text) NOT NULL, tenant_id (uuid), role (text), ip_address (inet), user_agent (text), is_impersonation (boolean) NOT NULL, event_source (text), is_support_mode (boolean) NOT NULL, resolved_tenant_method (text), session_id (text)
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), read_admin_restricted (SELECT), service_insert (INSERT), write_lock_delete_auth_activity_log (DELETE), write_lock_insert_auth_activity_log (INSERT), write_lock_update_auth_activity_log (UPDATE)

### auto_assignment_rules
- Columns: id (uuid) NOT NULL, domain (text) NOT NULL, tenant_id (uuid) NOT NULL, default_role (text) NOT NULL, is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid)
- FKs: created_by -> auth.users.id
- RLS: enabled, policies: auto_assignment_rules_tenant_delete (DELETE), auto_assignment_rules_tenant_insert (INSERT), auto_assignment_rules_tenant_select (SELECT), auto_assignment_rules_tenant_update (UPDATE), billing_gate (ALL), write_lock_delete_auto_assignment_rules (DELETE), write_lock_insert_auto_assignment_rules (INSERT), write_lock_update_auto_assignment_rules (UPDATE)

### avr_dd_validation_outcome
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL, color (text)
- RLS: enabled, policies: Anyone can read validation outcomes (SELECT), avr_dd_validation_outcome_admin_write (ALL), read_authenticated (SELECT)

### avr_dd_validation_phase
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: Anyone can read validation phases (SELECT), avr_dd_validation_phase_admin_write (ALL), read_authenticated (SELECT)

### avr_dd_validation_status
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: Anyone can read validation statuses (SELECT), avr_dd_validation_status_admin_write (ALL), read_authenticated (SELECT)

### avr_dd_validation_type
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: Anyone can read validation types (SELECT), avr_dd_validation_type_admin_write (ALL), read_authenticated (SELECT)

### avr_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, validation_session_date (date) NOT NULL, validation_type (text) NOT NULL, validation_phase (text) NOT NULL, course_code (text) NOT NULL, unit_code (text) NOT NULL, unit_title (text), assessment_tool (text), lead_facilitator_uuid (uuid), validators (text), findings (text), recommendations (text), improvement_actions (text), action_owner (uuid), action_due_date (date), review_date (date), status (text), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), industry_rep (text), completion_date (timestamp with time zone), validation_outcome (text), lead_facilitator (text), responsible_person (uuid), responsible_role (text), description (text), due_date (date), industry_consultation_id (uuid), ci_register_id (uuid), ci_action_raised (boolean)
- RLS: enabled, policies: avr_reg_delete (DELETE), avr_reg_insert (INSERT), avr_reg_insert_mirror (INSERT), avr_reg_select (SELECT), avr_reg_update (UPDATE), avr_reg_update_mirror (UPDATE), billing_gate (ALL), restrict_sa_select_avr_register (SELECT), write_lock_delete_avr_register (DELETE), write_lock_insert_avr_register (INSERT), write_lock_update_avr_register (UPDATE)

### backfill_progress
- Columns: id (uuid) NOT NULL, job_name (text) NOT NULL, tenant_id (uuid) NOT NULL, source_table (text) NOT NULL, last_pk (text), processed_count (bigint), succeeded_count (bigint), failed_count (bigint), status (text) NOT NULL, last_error (text), started_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: backfill_delete (DELETE), backfill_insert (INSERT), backfill_select (SELECT), backfill_update (UPDATE), billing_gate (ALL), write_lock_delete_backfill_progress (DELETE), write_lock_insert_backfill_progress (INSERT), write_lock_update_backfill_progress (UPDATE)

### benchmark_runs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, unit_count (integer) NOT NULL, status (text) NOT NULL, started_at (timestamp with time zone) NOT NULL, finished_at (timestamp with time zone), error_summary (text), stats (jsonb) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Service role can manage benchmark runs (ALL), Tenant users can view own benchmark runs (SELECT), billing_gate (ALL), write_lock_delete_benchmark_runs (DELETE), write_lock_insert_benchmark_runs (INSERT), write_lock_update_benchmark_runs (UPDATE)

### billing_accounts
- Columns: tenant_id (uuid) NOT NULL, plan (text) NOT NULL, status (text) NOT NULL, renewal_at (timestamp with time zone), stripe_customer_id (text)
- RLS: enabled, policies: Super admins can access all billing accounts (ALL), Tenant members can access their billing account (SELECT), billing_gate (ALL), write_lock_delete_billing_accounts (DELETE), write_lock_insert_billing_accounts (INSERT), write_lock_update_billing_accounts (UPDATE)

### billing_audit_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid), event_type (text) NOT NULL, stripe_event_id (text), old_data (jsonb), new_data (jsonb), performed_by (uuid), notes (text), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), read_tenant (SELECT), service_insert (INSERT), write_lock_delete_billing_audit_log (DELETE), write_lock_insert_billing_audit_log (INSERT), write_lock_update_billing_audit_log (UPDATE)

### billing_plan_limits
- Columns: plan_key (text) NOT NULL, display_name (text) NOT NULL, monthly_price_cents (integer) NOT NULL, max_users (integer) NOT NULL, max_documents (integer) NOT NULL, storage_gb (integer) NOT NULL, is_active (boolean), is_legacy (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone), is_visible (boolean), promo_price_cents (integer), promo_months (integer)
- RLS: enabled, policies: read_plan_limits (SELECT)

### billing_subscriptions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, stripe_subscription_id (text), plan_key (text) NOT NULL, status (text) NOT NULL, quantity (integer) NOT NULL, cancel_at_period_end (boolean), trial_start (timestamp with time zone), trial_end (timestamp with time zone), created_at (timestamp with time zone), updated_at (timestamp with time zone), monthly_amount_cents (integer), currency (text), interval (text), last_payment_at (timestamp with time zone), next_billing_at (timestamp with time zone), grace_period_ends_at (timestamp with time zone), failed_payment_count (integer), cancelled_at (timestamp with time zone), billing_cadence (text) NOT NULL, subscription_start_at (timestamp with time zone), billing_state (text) NOT NULL, billing_migration_status (text) NOT NULL, provider (text)
- RLS: enabled, policies: billing_gate (ALL), read_admin (SELECT), service_write (ALL), write_lock_delete_billing_subscriptions (DELETE), write_lock_insert_billing_subscriptions (INSERT), write_lock_update_billing_subscriptions (UPDATE)

### branding_settings
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, logo_url (text), primary_color (text), secondary_color (text), accent_color (text), button_color (text), text_color (text), background_color (text), theme_name (text), custom_css (text), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid), favicon_url (text), header_logo_url (text), logo_path (text), email_from_name (text), email_from_address (text)
- FKs: created_by -> auth.users.id, updated_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), branding_delete (DELETE), branding_insert (INSERT), branding_select (SELECT), branding_update (UPDATE), service_role_bypass (ALL), write_lock_delete_branding_settings (DELETE), write_lock_insert_branding_settings (INSERT), write_lock_update_branding_settings (UPDATE)

### bulk_reprocess_runs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, run_date (timestamp with time zone) NOT NULL, triggered_by (uuid) NOT NULL, total_reports (integer) NOT NULL, total_new_findings (integer) NOT NULL, total_high_risk (integer) NOT NULL, status (text) NOT NULL, error_message (text), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_bulk_reprocess_runs (DELETE), write_lock_insert_bulk_reprocess_runs (INSERT), write_lock_update_bulk_reprocess_runs (UPDATE)

### caa_audit_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, record_id (uuid) NOT NULL, record_type (text) NOT NULL, action (text) NOT NULL, old_values (jsonb), new_values (jsonb), performed_by (uuid), performed_at (timestamp with time zone), notes (text)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Admin/Compliance can insert CAA audit logs (INSERT), Tenant members can view CAA audit logs (SELECT), billing_gate (ALL), write_lock_delete_caa_audit_log (DELETE), write_lock_insert_caa_audit_log (INSERT), write_lock_update_caa_audit_log (UPDATE)

### caa_dd_action_status
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: caa_dd_action_status_admin_write (ALL), caa_dd_action_status_read (SELECT)

### caa_dd_complainant_type
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: caa_dd_complainant_type_admin_write (ALL), caa_dd_complainant_type_read (SELECT)

### caa_dd_complaint_against
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: caa_dd_complaint_against_admin_write (ALL), caa_dd_complaint_against_read (SELECT)

### caa_dd_complaint_category
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: caa_dd_complaint_category_admin_write (ALL), caa_dd_complaint_category_read (SELECT)

### caa_dd_complaint_type
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: caa_dd_complaint_type_admin_write (ALL), caa_dd_complaint_type_read (SELECT)

### caa_dd_identification_source
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: read_authenticated (SELECT), service_role_all (ALL)

### caa_dd_refered_to
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: read_authenticated (SELECT), service_role_all (ALL)

### caa_dd_satisfatction_rating
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: read_authenticated (SELECT), service_role_all (ALL)

### caa_dd_support_docs
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: read_authenticated (SELECT), service_role_all (ALL)

### caa_register
- Columns: id (uuid) NOT NULL, complaint_id (text) NOT NULL, complaint_date (date), complainant_name (text), complaint_against (text), complainant_type (text), complaint_summary (text), supporting_documents (text), initial_acknowledgement_date (date), assigned_to (uuid), actions_taken (text), continuous_improvement (text), date_received (date), source_of_identification (text), risk_category (text), risk_level (text), control_measures (text), responsible_person (uuid), follow_up_required (boolean), action_status (text), review_closure_date (date), investigation_referral (text), satisfaction_with_outcome (text), complaint_type (text), complaint_status (text), register_no (text), custom_id (text) NOT NULL, tenant_id (uuid), user_id (uuid), created_at (timestamp with time zone), created_by (uuid), updated_at (timestamp with time zone), updated_by (uuid), demo_seed (boolean) NOT NULL, responsible_role (text), description (text), title (text), due_date (date), status (text), complaint_category (text), priority_level (text), investigation_notes (text), resolution_details (text), resolution_date (date), governance_description (text)
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), caa_delete (DELETE), caa_insert (INSERT), caa_select (SELECT), caa_update (UPDATE), restrict_sa_select_caa_register (SELECT), trainer_caa_select_own (SELECT), write_lock_delete_caa_register (DELETE), write_lock_insert_caa_register (INSERT), write_lock_update_caa_register (UPDATE)

### calendar_ai_suggestions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, kind (text) NOT NULL, title (text) NOT NULL, description (text), recommended_date (timestamp with time zone), confidence (double precision) NOT NULL, source (text) NOT NULL, dismissed (boolean) NOT NULL, applied_at (timestamp with time zone), created_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), cal_ai_delete (DELETE), cal_ai_insert (INSERT), cal_ai_select (SELECT), cal_ai_update (UPDATE), write_lock_delete_calendar_ai_suggestions (DELETE), write_lock_insert_calendar_ai_suggestions (INSERT), write_lock_update_calendar_ai_suggestions (UPDATE)

### calendar_events
- Columns: id (uuid) NOT NULL, title (text) NOT NULL, description (text), event_date (timestamp with time zone) NOT NULL, event_type (text) NOT NULL, status (text), user_id (uuid), created_at (timestamp with time zone), updated_at (timestamp with time zone), tenant_id (uuid) NOT NULL, location (text), category (text), visibility (text), priority (text), created_by (uuid), task_id (uuid), source (text), entry_type (text), register_id (uuid), register_custom_id (text)
- FKs: user_id -> auth.users.id, task_id -> tasks.id
- RLS: enabled, policies: billing_gate (ALL), calendar_events_admin_cm_delete (DELETE), calendar_events_admin_cm_insert (INSERT), calendar_events_admin_cm_update (UPDATE), calendar_events_tenant_select (SELECT), restrict_sa_select_calendar_events (SELECT), write_lock_delete_calendar_events (DELETE), write_lock_insert_calendar_events (INSERT), write_lock_update_calendar_events (UPDATE)

### calendar_tasks
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, title (text) NOT NULL, due_at (timestamp with time zone) NOT NULL, priority (text) NOT NULL, owner_id (uuid), related_register (text), status (text) NOT NULL, notes (text), created_by (uuid) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), cal_tasks_delete (DELETE), cal_tasks_insert (INSERT), cal_tasks_select (SELECT), cal_tasks_update (UPDATE), write_lock_delete_calendar_tasks (DELETE), write_lock_insert_calendar_tasks (INSERT), write_lock_update_calendar_tasks (UPDATE)

### capabilities
- Columns: capability (text) NOT NULL
- RLS: enabled, policies: capabilities_select (SELECT)

### ci_actions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, entry_id (uuid) NOT NULL, owner_id (uuid), title (text) NOT NULL, action_plan (text), status (text) NOT NULL, due_at (timestamp with time zone), effectiveness_review_at (timestamp with time zone), evidence_links (jsonb) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), ci_actions_admin_cm_delete (DELETE), ci_actions_admin_cm_insert (INSERT), ci_actions_admin_cm_update (UPDATE), ci_actions_tenant_select (SELECT), restrict_sa_select_ci_actions (SELECT), write_lock_delete_ci_actions (DELETE), write_lock_insert_ci_actions (INSERT), write_lock_update_ci_actions (UPDATE)

### ci_dd_collection_mechanism
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: ci_dd_collection_mechanism_admin_write (ALL), ci_dd_collection_mechanism_select (SELECT)

### ci_dd_feedback_stakeholder
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: ci_dd_feedback_stakeholder_admin_write (ALL), ci_dd_feedback_stakeholder_read (SELECT)

### ci_dd_impact_area
- Columns: id (bigint) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: ci_dd_impact_area_admin_write (ALL), ci_dd_impact_area_read (SELECT)

### ci_dd_source
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: Authenticated users can read ci_dd_source (SELECT)

### ci_dd_status
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: Authenticated users can read ci_dd_status (SELECT)

### ci_dd_type
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: ci_dd_type_admin_write (ALL), ci_dd_type_read (SELECT)

### ci_evidence
- Columns: id (uuid) NOT NULL, ci_id (uuid) NOT NULL, file_url (text) NOT NULL, note (text), created_at (timestamp with time zone) NOT NULL, ai_verified (boolean), ai_verification_notes (text)
- FKs: ci_id -> ci_items.id
- RLS: enabled, policies: ci_evidence_insert (INSERT), ci_evidence_select (SELECT)

### ci_items
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, source_type (text) NOT NULL, source_id (uuid), title (text) NOT NULL, description (text), clause_reference (text), priority (text) NOT NULL, status (text) NOT NULL, responsible_role (text) NOT NULL, due_date (timestamp with time zone), completed_date (timestamp with time zone), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), ci_items_delete (DELETE), ci_items_insert (INSERT), ci_items_select (SELECT), ci_items_update (UPDATE), restrict_sa_select_ci_items (SELECT), write_lock_delete_ci_items (DELETE), write_lock_insert_ci_items (INSERT), write_lock_update_ci_items (UPDATE)

### ci_register
- Columns: id (uuid) NOT NULL, register_no (text), date (date), form_completed_by (text), position (text), type_of_opportunity (text), opportunity_description (text), stakeholder_feedback_from (text), data_collection_method (text), root_cause_analysis (text), actions_for_improvement (text), responsible_person_txt (text), action_due_date (date), priority_level (text), source_of_ofi (text), corrective_action_timeline (text), ofi_assigned_to (text), monitoring_and_evaluation (text), effectiveness_of_actions (text), completion_date (date), final_review_outcome (text), source_of_identification (text), risk_category (text), risk_level (text), control_measures (text), follow_up_required (boolean), action_status (text), review_closure_date (date), tenant_id (uuid) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid), custom_id (text) NOT NULL, priority (text), responsible_person (uuid), responsible_role (text), description (text), notes (text), title (text), due_date (date), status (text), lifecycle_state (text) NOT NULL, linked_ofi_id (integer), sla_due_at (timestamp with time zone), escalated_at (timestamp with time zone), escalation_count (integer) NOT NULL, requires_governing_person_attention (boolean) NOT NULL, linked_consultation_decision_id (uuid), consultation_theme_type (text), consultation_theme_snapshot (text), source_meeting_id (uuid), source_ofi_hash (text), merged_into_id (uuid), merged_at (timestamp with time zone), merged_by (uuid)
- FKs: linked_ofi_id -> ofi_register.id, merged_into_id -> ci_register.id, linked_consultation_decision_id -> industry_consultation_decisions.id, source_meeting_id -> governance_meetings.id
- RLS: enabled, policies: billing_gate (ALL), ci_register_admin_cm_delete (DELETE), ci_register_admin_cm_insert (INSERT), ci_register_admin_cm_update (UPDATE), ci_register_tenant_select (SELECT), regulator_select_ci_register (SELECT), restrict_sa_select_ci_register (SELECT), write_lock_delete_ci_register (DELETE), write_lock_insert_ci_register (INSERT), write_lock_update_ci_register (UPDATE)

### ci_source_links
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, ci_entry_id (uuid) NOT NULL, source_type (text) NOT NULL, source_entry_id (uuid), meta (jsonb) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), ci_source_links_tenant_access (ALL), write_lock_delete_ci_source_links (DELETE), write_lock_insert_ci_source_links (INSERT), write_lock_update_ci_source_links (UPDATE)

### clause_intent
- Columns: clause_id (uuid) NOT NULL, plain_english_intent (text) NOT NULL, risk_if_unmanaged (text) NOT NULL
- FKs: clause_id -> clauses.id
- RLS: enabled, policies: read_clause_intent (SELECT)

### clauses
- Columns: id (uuid) NOT NULL, instrument_id (uuid) NOT NULL, clause_reference (text) NOT NULL, title (text), full_text (text) NOT NULL, quality_area (text), clause_type (text) NOT NULL, is_time_based (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: instrument_id -> instruments.id
- RLS: enabled, policies: read_clauses (SELECT)

### clauses_reference
- Columns: id (uuid) NOT NULL, code (text) NOT NULL, title (text) NOT NULL, description (text), value (text) NOT NULL, quality_area (text), division (text), clause_number (text), full_text (text), is_active (boolean), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: clauses_reference_read (SELECT), service_role_override_clauses (ALL)

### compliance_bot_logs
- Columns: id (uuid) NOT NULL, user_id (uuid), session_id (text), question (text) NOT NULL, response (text), confidence_score (numeric), timestamp (timestamp with time zone), linked_registers (ARRAY), feedback (text), tenant_id (uuid)
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), compliance_bot_logs_tenant_access (ALL), write_lock_delete_compliance_bot_logs (DELETE), write_lock_insert_compliance_bot_logs (INSERT), write_lock_update_compliance_bot_logs (UPDATE)

### compliance_calendar_tasks
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, tenant_id (uuid) NOT NULL, task_name (text) NOT NULL, description (text), due_date (date) NOT NULL, owner_role (USER-DEFINED) NOT NULL, assigned_to (uuid), linked_register (text), linked_register_id (uuid), notes (text), status (USER-DEFINED) NOT NULL, priority (USER-DEFINED) NOT NULL, task_type (USER-DEFINED) NOT NULL, is_recurring (boolean) NOT NULL, recurrence_pattern (jsonb), completed_by (uuid), completed_at (timestamp with time zone), created_by (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_by (uuid), updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Tenant access for compliance_calendar_tasks (ALL), billing_gate (ALL), write_lock_delete_compliance_calendar_tasks (DELETE), write_lock_insert_compliance_calendar_tasks (INSERT), write_lock_update_compliance_calendar_tasks (UPDATE)

### compliance_clause_modules
- Columns: id (uuid) NOT NULL, clause_id (uuid) NOT NULL, module_key (text) NOT NULL, evidence_type (text) NOT NULL, is_primary (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: clause_id -> compliance_clauses.id
- RLS: enabled, policies: read_authenticated (SELECT), write_super_admin (ALL)

### compliance_clauses
- Columns: id (uuid) NOT NULL, instrument_id (uuid) NOT NULL, reference_code (text) NOT NULL, short_label (text) NOT NULL, full_text (text), quality_area (text), risk_weight (integer) NOT NULL, is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, description (text), evidence_required (boolean), recurring (boolean), assessment_frequency (text)
- FKs: instrument_id -> compliance_instruments.id
- RLS: enabled, policies: compliance_clauses_select_all (SELECT)

### compliance_event_templates
- Columns: id (uuid) NOT NULL, event_name (text) NOT NULL, description (text), event_type (text) NOT NULL, due_date_pattern (text) NOT NULL, frequency (text) NOT NULL, priority (text), linked_register (text), rto_standards_refs (ARRAY), auto_create (boolean), notification_days (ARRAY), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: compliance_event_templates_authenticated (SELECT)

### compliance_events
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, template_id (uuid), title (text) NOT NULL, description (text), event_date (date) NOT NULL, event_type (text) NOT NULL, status (text), priority (text), assigned_to (uuid), linked_register (text), linked_register_id (uuid), completion_date (date), notes (text), created_by (uuid), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: template_id -> compliance_event_templates.id
- RLS: enabled, policies: billing_gate (ALL), compliance_events_admin_cm_delete (DELETE), compliance_events_admin_cm_insert (INSERT), compliance_events_admin_cm_update (UPDATE), compliance_events_tenant_select (SELECT), write_lock_delete_compliance_events (DELETE), write_lock_insert_compliance_events (INSERT), write_lock_update_compliance_events (UPDATE)

### compliance_instruments
- Columns: id (uuid) NOT NULL, code (text) NOT NULL, name (text) NOT NULL, description (text), is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, instrument_type (text), reference_code (text), effective_date (date), version (text)
- RLS: enabled, policies: compliance_instruments_read (SELECT), compliance_instruments_write (ALL)

### compliance_items
- Columns: id (bigint) NOT NULL, created_at (timestamp with time zone) NOT NULL, item (text), clause (text), status (text), responsible (text), tenant_id (uuid)
- RLS: enabled, policies: billing_gate (ALL), compliance_items_admin_cm_delete (DELETE), compliance_items_admin_cm_insert (INSERT), compliance_items_admin_cm_update (UPDATE), compliance_items_tenant_select (SELECT), write_lock_delete_compliance_items (DELETE), write_lock_insert_compliance_items (INSERT), write_lock_update_compliance_items (UPDATE)

### compliance_score_snapshots
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, overall_score (integer) NOT NULL, band (text) NOT NULL, dimension_scores (jsonb) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: css_read_own_tenant (SELECT)

### compliance_tags
- Columns: id (uuid) NOT NULL, clause_id (uuid) NOT NULL, tag (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: clause_id -> compliance_clauses.id
- RLS: enabled, policies: compliance_tags_select_all (SELECT)

### compliance_task_notifications
- Columns: id (uuid) NOT NULL, task_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, notification_type (USER-DEFINED) NOT NULL, days_before (integer) NOT NULL, sent_at (timestamp with time zone), is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: task_id -> compliance_calendar_tasks.id
- RLS: enabled, policies: billing_gate (ALL), compliance_task_notifications_tenant_access (ALL), write_lock_delete_compliance_task_notifications (DELETE), write_lock_insert_compliance_task_notifications (INSERT), write_lock_update_compliance_task_notifications (UPDATE)

### complybot_conversations
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, user_id (uuid) NOT NULL, title (text) NOT NULL, messages (jsonb) NOT NULL, last_message_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: user_id -> auth.users.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: conv_billing_gate (ALL), conv_user_delete (DELETE), conv_user_insert (INSERT), conv_user_select (SELECT), conv_user_update (UPDATE)

### complybot_feedback
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, user_id (uuid) NOT NULL, response_log_id (uuid), rating (smallint) NOT NULL, comment (text), user_prompt (text), routed_mode (text), created_at (timestamp with time zone) NOT NULL
- FKs: user_id -> auth.users.id, response_log_id -> complybot_response_logs.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: fb_billing_gate (ALL), fb_service_insert (INSERT), fb_user_insert (INSERT), fb_user_select (SELECT)

### complybot_interactions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, user_id (uuid) NOT NULL, route (text) NOT NULL, prompt (text) NOT NULL, response (text), rating (integer), resolved (boolean), latency_ms (integer), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: Users can insert own interactions (INSERT), Users can view own tenant interactions (SELECT), billing_gate (ALL), write_lock_delete_complybot_interactions (DELETE), write_lock_insert_complybot_interactions (INSERT), write_lock_update_complybot_interactions (UPDATE)

### complybot_knowledge_articles
- Columns: id (uuid) NOT NULL, slug (text) NOT NULL, title (text) NOT NULL, category (text) NOT NULL, audience (ARRAY) NOT NULL, keywords (ARRAY) NOT NULL, content_md (text) NOT NULL, related_routes (ARRAY), related_standards (ARRAY), is_published (boolean) NOT NULL, sort_order (integer), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid)
- FKs: created_by -> auth.users.id
- RLS: enabled, policies: cka_manage_superadmin (ALL), cka_read_published (SELECT)

### complybot_messages
- Columns: id (uuid) NOT NULL, org_id (uuid) NOT NULL, user_id (uuid) NOT NULL, message (text) NOT NULL, response (text) NOT NULL, created_at (timestamp with time zone), tenant_id (uuid)
- FKs: org_id -> rto_profiles.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant access for complybot_messages (ALL), billing_gate (ALL), write_lock_delete_complybot_messages (DELETE), write_lock_insert_complybot_messages (INSERT), write_lock_update_complybot_messages (UPDATE)

### complybot_prompts
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, title (text) NOT NULL, prompt_text (text) NOT NULL, category (text), sort_order (integer), created_at (timestamp with time zone), prompt_label (text), trigger_keywords (ARRAY), response_type (text), response_content (text), linked_register (text), is_active (boolean), training_set (text), updated_at (timestamp with time zone), source_document_id (uuid)
- FKs: source_document_id -> documents_register.id, tenant_id -> rto_profiles.id
- RLS: enabled, policies: billing_gate (ALL), service_role_override_complybot_prompts (ALL), write_lock_delete_complybot_prompts (DELETE), write_lock_insert_complybot_prompts (INSERT), write_lock_update_complybot_prompts (UPDATE)

### complybot_queries
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, org_id (uuid) NOT NULL, query (text) NOT NULL, answer (text) NOT NULL, citations (jsonb), page_context (jsonb), resolved (boolean), feedback_rating (integer), improvement_notes (text), knowledge_gaps (jsonb), follow_up_questions (ARRAY), context_relevance_score (double precision), citation_quality_score (double precision), similar_query_id (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, user_role (text), route (text), page_title (text), page_data (jsonb), latency_ms (integer), model (text), rating (integer), tags (ARRAY), tenant_id (uuid)
- FKs: similar_query_id -> complybot_queries.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant access for complybot_queries (ALL), billing_gate (ALL), service_role_bypass (ALL), write_lock_delete_complybot_queries (DELETE), write_lock_insert_complybot_queries (INSERT), write_lock_update_complybot_queries (UPDATE)

### complybot_response_logs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, user_id (uuid) NOT NULL, user_prompt (text) NOT NULL, ai_response (text) NOT NULL, routed_mode (text), detected_route_refs (jsonb), hallucinated_routes (jsonb), has_route_mismatch (boolean) NOT NULL, confidence (text), created_at (timestamp with time zone) NOT NULL, kb_miss (boolean) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), cbl_service_insert (INSERT), cbl_superadmin_select (SELECT), cbl_tenant_select (SELECT), write_lock_delete_complybot_response_logs (DELETE), write_lock_insert_complybot_response_logs (INSERT), write_lock_update_complybot_response_logs (UPDATE)

### conflict_of_interest
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, person_id (uuid) NOT NULL, declaration_date (date) NOT NULL, nature (text) NOT NULL, mitigation_plan (text), status (text) NOT NULL, evidence_links (jsonb) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), conflict_of_interest_tenant_access (ALL), write_lock_delete_conflict_of_interest (DELETE), write_lock_insert_conflict_of_interest (INSERT), write_lock_update_conflict_of_interest (UPDATE)

### consultant_affiliates
- Columns: id (uuid) NOT NULL, consulting_org_id (uuid) NOT NULL, commission_rate_pct (numeric) NOT NULL, status (text) NOT NULL, approved_at (timestamp with time zone), approved_by (uuid), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: consulting_org_id -> tenants.tenant_id, approved_by -> profiles.id
- RLS: enabled, policies: affiliates_admin_read (SELECT), affiliates_org_select (SELECT), affiliates_sa_all (ALL)

### consultant_commission_ledger
- Columns: id (uuid) NOT NULL, affiliate_id (uuid) NOT NULL, client_tenant_id (uuid) NOT NULL, billing_period_start (date) NOT NULL, billing_period_end (date) NOT NULL, gross_revenue_aud (numeric) NOT NULL, commission_pct (numeric) NOT NULL, commission_aud (numeric) NOT NULL, status (text) NOT NULL, stripe_invoice_ref (text), notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), confirmed_at (timestamp with time zone), confirmed_by (uuid), paid_at (timestamp with time zone), paid_by (uuid)
- FKs: paid_by -> profiles.id, affiliate_id -> consultant_affiliates.id, client_tenant_id -> tenants.tenant_id, created_by -> profiles.id, confirmed_by -> profiles.id
- RLS: enabled, policies: ledger_org_select (SELECT), ledger_sa_all (ALL)

### consultant_portfolio_requests
- Columns: id (uuid) NOT NULL, requested_by_user_id (uuid) NOT NULL, tenant_id (uuid), note (text) NOT NULL, status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, decided_at (timestamp with time zone), decided_by_user_id (uuid), decision_note (text), requested_org_name (text)
- FKs: requested_by_user_id -> profiles.id, decided_by_user_id -> profiles.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: cpr_insert (INSERT), cpr_select_own (SELECT), cpr_select_sa (SELECT), cpr_update_sa (UPDATE)

### consultation_themes
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, theme_key (text) NOT NULL, theme_label (text) NOT NULL, source (text), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: Tenant members can delete consultation themes (DELETE), Tenant members can insert consultation themes (INSERT), Tenant members can update consultation themes (UPDATE), Tenant members can view consultation themes (SELECT)

### content_assets
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, asset_type (text) NOT NULL, title (text) NOT NULL, version (text), approval_status (text), review_date (date), extracted_text (text), file_url (text), owner_role (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant members can view their content assets (SELECT), billing_gate (ALL), content_assets_admin_cm_delete (DELETE), content_assets_admin_cm_insert (INSERT), content_assets_admin_cm_update (UPDATE), content_assets_tenant_select (SELECT), write_lock_delete_content_assets (DELETE), write_lock_insert_content_assets (INSERT), write_lock_update_content_assets (UPDATE)

### credential_compliance_scan_results
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, scan_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, trainer_name (text), scan_timestamp (timestamp with time zone) NOT NULL, overall_status (text) NOT NULL, classification (text), credential_policy_section (text), findings (jsonb) NOT NULL, missing_credentials (jsonb) NOT NULL, expiring_credentials (jsonb) NOT NULL, validation_eligibility (boolean), supervision_required (boolean), has_supervisor (boolean), summary_text (text), created_at (timestamp with time zone), created_by (uuid)
- RLS: enabled, policies: Tenant users can view their scan results (SELECT), billing_gate (ALL), write_lock_delete_credential_compliance_scan_results (DELETE), write_lock_insert_credential_compliance_scan_results (INSERT), write_lock_update_credential_compliance_scan_results (UPDATE)

### credential_progress_tracking
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, enrolled_qualification (text) NOT NULL, enrolling_rto (text), enrolment_date (date) NOT NULL, expected_completion_date (date), progress_status (text) NOT NULL, units_completed (integer), total_units_required (integer), last_review_date (date), last_review_notes (text), last_review_by (uuid), created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: cpt_tenant_delete (DELETE), cpt_tenant_insert (INSERT), cpt_tenant_select (SELECT), cpt_tenant_update (UPDATE)

### cross_register_triggers
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, source_register (text) NOT NULL, source_condition (jsonb) NOT NULL, target_register (text) NOT NULL, target_action (text) NOT NULL, trigger_config (jsonb), is_active (boolean), created_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), cross_register_triggers_tenant_access (ALL), write_lock_delete_cross_register_triggers (DELETE), write_lock_insert_cross_register_triggers (INSERT), write_lock_update_cross_register_triggers (UPDATE)

### ct_dd_approvedby
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: ct_dd_approvedby_read (SELECT), service_role_override_ct_approved (ALL)

### ct_dd_evidence_type
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: ct_dd_evidence_type_read (SELECT), service_role_override_ct_evidence_type (ALL)

### ct_dd_evidence_verified
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: ct_dd_evidence_verified_read (SELECT), service_role_override_ct_evidence_verified (ALL)

### ct_dd_grantedby
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: ct_dd_grantedby_read (SELECT), service_role_override_ct_granted (ALL)

### ct_dd_outcome
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: ct_dd_outcome_read (SELECT), service_role_override_ct_outcome (ALL)

### ct_dd_rejection_reason
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: ct_dd_rejection_reason_read (SELECT), service_role_override_ct_rejection (ALL)

### ct_dd_status
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text) NOT NULL
- RLS: enabled, policies: ct_dd_status_read (SELECT), service_role_override_ct_status (ALL)

### ct_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, request_date (date), student_name (text) NOT NULL, course_code (text) NOT NULL, units_requested (text), evidence_provided (text), outcome (text), approved_by (uuid), approval_date (date), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), usi (character varying), rtoid (integer), risk_level (text), dated_verified (timestamp with time zone), student_id (text), course_title (text), unit_code (text), unit_title (text), evidence_type (text), evidence_verified_by (text), granted_by (uuid), approved_by_name (uuid), rejection_reason (text), date_assessed (date), decision_letter_sent (date), status (text), source (text), quality_area (text), qa_category (text), responsible_person (uuid), responsible_role (text), description (text), due_date (date), date_received (date), title (text)
- RLS: enabled, policies: billing_gate (ALL), ct_reg_delete (DELETE), ct_reg_insert (INSERT), ct_reg_select (SELECT), ct_reg_update (UPDATE), restrict_sa_select_ct_register (SELECT), write_lock_delete_ct_register (DELETE), write_lock_insert_ct_register (INSERT), write_lock_update_ct_register (UPDATE)

### dap_assessment_task_evidence_map
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, task_id (uuid) NOT NULL, evidence_item_id (text) NOT NULL, unit_code (text) NOT NULL, source_release (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: evidence_item_id -> tga_assessment_evidence_items.id, task_id -> dap_assessment_tasks.id
- RLS: enabled, policies: Tenant members read task evidence map (SELECT), Tenant members write task evidence map (ALL)

### dap_assessment_tasks
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, plan_id (uuid) NOT NULL, task_code (text), task_title (text) NOT NULL, method (text), unit_codes (ARRAY), due_week (integer), instructions (text), evidence_required (text), created_at (timestamp with time zone) NOT NULL
- FKs: plan_id -> tas_delivery_plans.id
- RLS: enabled, policies: billing_gate (ALL), dap_at_del (DELETE), dap_at_ins (INSERT), dap_at_sel (SELECT), dap_at_upd (UPDATE), write_lock_delete_dap_assessment_tasks (DELETE), write_lock_insert_dap_assessment_tasks (INSERT), write_lock_update_dap_assessment_tasks (UPDATE)

### dap_resources
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, plan_id (uuid) NOT NULL, resource_type (text) NOT NULL, title (text) NOT NULL, description (text), url (text), doc_id (uuid), created_at (timestamp with time zone) NOT NULL
- FKs: plan_id -> tas_delivery_plans.id
- RLS: enabled, policies: billing_gate (ALL), dap_res_del (DELETE), dap_res_ins (INSERT), dap_res_sel (SELECT), dap_res_upd (UPDATE), write_lock_delete_dap_resources (DELETE), write_lock_insert_dap_resources (INSERT), write_lock_update_dap_resources (UPDATE)

### dap_risk_controls
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, plan_id (uuid) NOT NULL, activity (text) NOT NULL, hazard (text) NOT NULL, risk_rating (text), controls (text) NOT NULL, responsible_role (text), review_date (date), created_at (timestamp with time zone) NOT NULL
- FKs: plan_id -> tas_delivery_plans.id
- RLS: enabled, policies: billing_gate (ALL), dap_rc_del (DELETE), dap_rc_ins (INSERT), dap_rc_sel (SELECT), dap_rc_upd (UPDATE), write_lock_delete_dap_risk_controls (DELETE), write_lock_insert_dap_risk_controls (INSERT), write_lock_update_dap_risk_controls (UPDATE)

### dap_sessions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, plan_id (uuid) NOT NULL, week_no (integer) NOT NULL, session_no (integer) NOT NULL, unit_code (text), unit_title (text), elements_topics (text), learning_activities (text), assessment_tasks (text), delivery_hours (numeric), supervision_mode (text), lms_label (text), resources (text), sort_key (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, delivery_confirmed (boolean) NOT NULL, delivered_at (timestamp with time zone), delivered_by (uuid), actual_attendance_count (integer), delivery_notes (text)
- FKs: delivered_by -> auth.users.id, plan_id -> tas_delivery_plans.id
- RLS: enabled, policies: billing_gate (ALL), dap_sess_del (DELETE), dap_sess_ins (INSERT), dap_sess_sel (SELECT), dap_sess_upd (UPDATE), write_lock_delete_dap_sessions (DELETE), write_lock_insert_dap_sessions (INSERT), write_lock_update_dap_sessions (UPDATE)

### dd_address_type
- Columns: code (text) NOT NULL, label (text) NOT NULL, description (text), id (integer) NOT NULL
- RLS: enabled, policies: dd_address_type_authenticated_read (SELECT)

### dd_assessment_methods
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL, description (text), evidence_requirements (text), validation_approach (text), sort_order (integer), created_at (timestamp with time zone)
- RLS: enabled, policies: Anyone can read assessment methods (SELECT)

### dd_contact_type
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: read_authenticated (SELECT)

### dd_delivery_modes
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: dd_delivery_modes_select_authenticated (SELECT), dd_delivery_modes_super_admin_access (ALL), read_authenticated (SELECT)

### dd_departments
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text) NOT NULL, sort_order (integer), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: Authenticated users can read departments (SELECT)

### dd_evidence
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: read_authenticated (SELECT), write_super_admin (ALL)

### dd_framework
- Columns: id (uuid) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: dd_framework_read (SELECT), read_authenticated (SELECT)

### dd_frequency_cycle
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: Authenticated users can read frequency cycles (SELECT), Super admins can manage frequency cycles (ALL)

### dd_governance_type
- Columns: label (text) NOT NULL, id (integer) NOT NULL, code (text), value (text), primary_standard (text), suppoer_reference (text), quality_area (text)
- RLS: enabled, policies: read_authenticated (SELECT), write_super_admin (ALL)

### dd_interval
- Columns: id (bigint) NOT NULL, label (text) NOT NULL, value (text) NOT NULL, sort_order (integer), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: dd_interval_select_authenticated (SELECT), dd_interval_super_admin_access (ALL), read_authenticated (SELECT)

### dd_job_title
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text) NOT NULL, sort_order (integer), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: Authenticated users can read dd_job_title (SELECT), Super admins can delete dd_job_title (DELETE), Super admins can insert dd_job_title (INSERT), Super admins can update dd_job_title (UPDATE)

### dd_mitigation_actions
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: Authenticated users can read mitigation actions (SELECT), Super admins can manage mitigation actions (ALL)

### dd_organisational_roles
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text), authority_level (smallint)
- RLS: enabled, policies: dd_organisational_roles_read (SELECT)

### dd_package_status
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: dd_package_status read (SELECT)

### dd_priority_level
- Columns: id (bigint) NOT NULL, label (text) NOT NULL, value (text), impact_level (integer)
- RLS: enabled, policies: Authenticated users can read priority levels (SELECT)

### dd_product_status
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: Authenticated users can read product status options (SELECT)

### dd_qa_categories
- Columns: id (uuid) NOT NULL, code (text) NOT NULL, name (text) NOT NULL
- RLS: enabled, policies: dd_qa_categories_read (SELECT), service_role_override_qa_categories (ALL)

### dd_quality_area
- Columns: id (uuid) NOT NULL, label (text) NOT NULL, framework (text), value (text)
- FKs: framework -> dd_framework.label
- RLS: enabled, policies: dd_quality_area_read (SELECT), read_authenticated (SELECT)

### dd_risk_category
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: dd_risk_category_read (SELECT)

### dd_risk_level
- Columns: id (bigint) NOT NULL, label (text) NOT NULL, value (text), impact_level (integer)
- RLS: enabled, policies: Authenticated users can read dd_risk_level (SELECT), read_authenticated (SELECT)

### dd_source
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: dd_source_read (SELECT), read_authenticated (SELECT), service_role_override_dd_source (ALL)

### dd_status
- Columns: id (bigint) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: Authenticated users can read dd_status (SELECT), read_authenticated (SELECT)

### dd_subscription_plan
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text) NOT NULL, sort_order (integer), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: dd_subscription_plan_select_authenticated (SELECT)

### dd_subscription_status
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text) NOT NULL, sort_order (integer), created_at (timestamp with time zone), updated_at (timestamp with time zone), subscription_inactive (boolean) NOT NULL
- RLS: enabled, policies: Allow authenticated read access (SELECT)

### dd_subscription_tiers
- Columns: value (text) NOT NULL, label (text) NOT NULL, is_legacy (boolean), is_purchasable (boolean), annual_price_ex_gst (integer), monthly_price_ex_gst (integer), user_limit (integer) NOT NULL, document_limit (integer) NOT NULL, storage_gb (integer) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone), id (bigint) NOT NULL, sort_order (integer)
- RLS: enabled, policies: Authenticated users can read subscription tiers (SELECT)

### dd_tenant_roles
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text) NOT NULL, description (text), is_active (boolean), sort_order (integer)
- RLS: enabled, policies: Authenticated users can read tenant roles (SELECT)

### dd_training_package
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: dd_training_package_read (SELECT), service_role_override_training_package (ALL)

### delivery_assessment_plans
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, name (text) NOT NULL, status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), dap_del (DELETE), dap_ins (INSERT), dap_sel (SELECT), dap_upd (UPDATE), tenant_all (ALL), write_lock_delete_delivery_assessment_plans (DELETE), write_lock_insert_delivery_assessment_plans (INSERT), write_lock_update_delivery_assessment_plans (UPDATE)

### demo_allowlist
- Columns: id (uuid) NOT NULL, email (USER-DEFINED) NOT NULL, company_name (text) NOT NULL, domain (USER-DEFINED) NOT NULL, source (text) NOT NULL, status (USER-DEFINED) NOT NULL, meta (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: demo_allowlist_super_admin_only (ALL)

### demo_audit_log
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, action (text) NOT NULL, metadata (jsonb), created_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), demo_audit_insert (INSERT), demo_audit_select (SELECT), write_lock_delete_demo_audit_log (DELETE), write_lock_insert_demo_audit_log (INSERT), write_lock_update_demo_audit_log (UPDATE)

### demo_config
- Columns: tenant_id (uuid) NOT NULL, max_users (integer) NOT NULL, role_mix (jsonb) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), demo_config_super_admin_only (ALL), write_lock_delete_demo_config (DELETE), write_lock_insert_demo_config (INSERT), write_lock_update_demo_config (UPDATE)

### demo_users
- Columns: id (uuid) NOT NULL, first_name (text) NOT NULL, last_name (text) NOT NULL, company_name (text) NOT NULL, phone (text), email (text) NOT NULL, start_date (timestamp with time zone), expires_at (timestamp with time zone), is_active (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: demo_users_super_admin_only (ALL)

### disposal_queue
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, register_entry_id (uuid) NOT NULL, register_type (text) NOT NULL, scheduled_disposal_date (date) NOT NULL, disposal_status (text), approval_required (boolean), approved_by (uuid), approved_at (timestamp with time zone), disposed_at (timestamp with time zone), disposal_method (text), disposal_notes (text)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_disposal_queue (ALL), write_lock_delete_disposal_queue (DELETE), write_lock_insert_disposal_queue (INSERT), write_lock_update_disposal_queue (UPDATE)

### diversity_inclusion_audit_log
- Columns: id (uuid) NOT NULL, diversity_inclusion_record_id (uuid), tenant_id (uuid) NOT NULL, action (text) NOT NULL, performed_by (uuid), old_values (jsonb), new_values (jsonb), performed_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: di_audit_insert_same_tenant (INSERT), di_audit_select_same_tenant (SELECT)

### diversity_inclusion_records
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, audit_results (text), cultural_safety_notes (text), inclusive_practice_status (USER-DEFINED), survey_summary (text), kpi_snapshot (jsonb), inclusive_checklist (jsonb), self_review_data (jsonb), custom_id (text), updated_by (uuid), trainer_id (uuid), cohort_name (text), qualification_code (text), delivery_mode (text), observation_period_start (date), observation_period_end (date), participation_rate_pct (integer), notes (text)
- FKs: trainer_id -> auth.users.id, created_by -> auth.users.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), diversity_inclusion_records_tenant_isolation (ALL), write_lock_delete_diversity_inclusion_records (DELETE), write_lock_insert_diversity_inclusion_records (INSERT), write_lock_update_diversity_inclusion_records (UPDATE)

### division_sections
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL, code (character varying), register (text)
- RLS: enabled, policies: division_sections_authenticated_read (SELECT)

### doc_review_actions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, document_id (uuid) NOT NULL, submitter_id (uuid) NOT NULL, reviewer_id (uuid), action_type (text) NOT NULL, notes (text), created_at (timestamp with time zone) NOT NULL
- FKs: submitter_id -> auth.users.id, document_id -> documents_register.id, tenant_id -> tenants.tenant_id, reviewer_id -> auth.users.id
- RLS: enabled, policies: Tenant members can insert review actions (INSERT), Tenant members can view review actions (SELECT), billing_gate (ALL), write_lock_delete_doc_review_actions (DELETE), write_lock_insert_doc_review_actions (INSERT), write_lock_update_doc_review_actions (UPDATE)

### document_audience_options
- Columns: id (smallint) NOT NULL, label (text) NOT NULL, value (text) NOT NULL, role_key (text), is_legacy (boolean) NOT NULL, is_active (boolean) NOT NULL, sort_order (smallint) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: dao_authenticated_read (SELECT), dao_super_admin_write (ALL)

### document_audit_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, user_id (uuid), document_id (uuid) NOT NULL, action (text) NOT NULL, field_name (text), old_value (text), new_value (text), metadata (jsonb), created_at (timestamp with time zone)
- RLS: enabled, policies: Audit logs viewable by tenant members (SELECT), Super admins can manage document audit logs (ALL), billing_gate (ALL), write_lock_delete_document_audit_log (DELETE), write_lock_insert_document_audit_log (INSERT), write_lock_update_document_audit_log (UPDATE)

### document_migrations
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, batch_id (text) NOT NULL, source_file_name (text) NOT NULL, source_file_path (text), imported_count (integer) NOT NULL, failed_count (integer) NOT NULL, column_mapping (jsonb) NOT NULL, validation_errors (jsonb), status (text) NOT NULL, is_locked (boolean) NOT NULL, locked_at (timestamp with time zone), locked_by (uuid), created_by (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, completed_at (timestamp with time zone), rolled_back_at (timestamp with time zone)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Super admins can manage document migrations (ALL), billing_gate (ALL), tenant_all (ALL), write_lock_delete_document_migrations (DELETE), write_lock_insert_document_migrations (INSERT), write_lock_update_document_migrations (UPDATE)

### document_notifications
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, type (text) NOT NULL, title (text) NOT NULL, message (text) NOT NULL, document_id (uuid), is_read (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Super admins can manage document notifications (ALL), super_admin_only_document_notifications (ALL)

### document_register_links
- Columns: id (uuid) NOT NULL, document_id (uuid) NOT NULL, register_type (text) NOT NULL, register_id (uuid), created_at (timestamp with time zone), created_by (uuid), tenant_id (uuid) NOT NULL
- FKs: document_id -> documents_register.id
- RLS: enabled, policies: Super admins can manage document register links (ALL), billing_gate (ALL), tenant_access_document_register_links (ALL), write_lock_delete_document_register_links (DELETE), write_lock_insert_document_register_links (INSERT), write_lock_update_document_register_links (UPDATE)

### document_standards_mapping
- Columns: id (uuid) NOT NULL, document_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, quality_area (text) NOT NULL, standard_clause (text) NOT NULL, standard_title (text), notes (text), created_at (timestamp with time zone), created_by (uuid)
- FKs: document_id -> documents_register.id
- RLS: enabled, policies: Super admins can manage document standards mapping (ALL), admin_manage_document_mappings (ALL), billing_gate (ALL), tenant_read_document_mappings (SELECT), write_lock_delete_document_standards_mapping (DELETE), write_lock_insert_document_standards_mapping (INSERT), write_lock_update_document_standards_mapping (UPDATE)

### document_templates
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, description (text), file_path (text) NOT NULL, file_name (text) NOT NULL, category (text) NOT NULL, register_type (text), tags (ARRAY), uploaded_by (uuid), created_at (timestamp with time zone), updated_at (timestamp with time zone), file_size (bigint), mime_type (text), status (text)
- FKs: uploaded_by -> auth.users.id
- RLS: enabled, policies: Super admins can manage document templates (ALL), document_templates_authenticated_read (SELECT), document_templates_super_admin_modify (ALL)

### document_versions
- Columns: id (uuid) NOT NULL, document_id (uuid) NOT NULL, version (text) NOT NULL, file_path (text) NOT NULL, file_name (text) NOT NULL, file_size (bigint), mime_type (text), uploaded_by (uuid) NOT NULL, tenant_id (uuid), created_at (timestamp with time zone), notes (text), changelog (text)
- FKs: document_id -> documents_register.id
- RLS: enabled, policies: billing_gate (ALL), doc_ver_delete (DELETE), doc_ver_insert (INSERT), doc_ver_select (SELECT), doc_ver_update (UPDATE), write_lock_delete_document_versions (DELETE), write_lock_insert_document_versions (INSERT), write_lock_update_document_versions (UPDATE)

### documents_dd_approved_by
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: documents_dd_approved_by_authenticated_read (SELECT)

### documents_dd_compliance_trigger
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: documents_dd_compliance_trigger_authenticated_read (SELECT), read_authenticated (SELECT)

### documents_dd_document_status
- Columns: id (integer) NOT NULL, label (text) NOT NULL, color (text), value (text)
- RLS: enabled, policies: documents_dd_document_status_authenticated_read (SELECT), read_authenticated (SELECT)

### documents_dd_document_type
- Columns: id (integer) NOT NULL, label (text) NOT NULL, category (text) NOT NULL, description (text) NOT NULL, icon (text) NOT NULL, created_at (timestamp with time zone), value (text)
- RLS: enabled, policies: documents_dd_document_type_authenticated_read (SELECT)

### documents_dd_framework
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: documents_dd_framework_authenticated_read (SELECT), read_authenticated (SELECT)

### documents_dd_repository_category
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL, color (text), sort_order (integer), created_at (timestamp with time zone)
- RLS: enabled, policies: Allow authenticated read (SELECT)

### documents_dd_review_frequency
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_documents_dd_review_frequency (SELECT), super_admin_write_documents_dd_review_frequency (ALL)

### documents_dd_rto_division
- Columns: id (integer) NOT NULL, label (text) NOT NULL, code (text) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_documents_dd_rto_division (SELECT), super_admin_write_documents_dd_rto_division (ALL)

### documents_register
- Columns: id (uuid) NOT NULL, file_name (text) NOT NULL, file_path (text) NOT NULL, file_size (bigint), mime_type (text), quality_area (text), tags (ARRAY), notes (text), linked_register_id (uuid), linked_register_type (text), uploaded_by (uuid) NOT NULL, tenant_id (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, document_title (text), description (text), version (text), is_current_version (boolean), parent_document_id (uuid), effective_date (date), category (text), thumbnail_url (text), is_demo (boolean), rto_division_section (text), relevant_legislation (text), accountable_role (text), document_type (text), approved_by (text), compliance_trigger (text), document_status (text), review_frequency (text), review_due_date (date), framework (text), linked_registers (ARRAY), version_notes (text), audience (ARRAY), repository_tags (ARRAY), custom_id (text) NOT NULL, approved_by_uuid (uuid), responsible_person (uuid), responsible_role (text), risk_level (text), title (text), due_date (date), status (text), reviewer_id (uuid), naming_prefix (text), naming_validated (boolean), lifecycle_status (text), lifecycle_changed_at (timestamp with time zone), lifecycle_changed_by (uuid), locked_for_edit (boolean), lock_reason (text), migration_batch_id (text), migration_source (text), migrated_at (timestamp with time zone), custom_audience (ARRAY), approved_at (date)
- FKs: uploaded_by -> auth.users.id, parent_document_id -> documents_register.id, reviewer_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), docs_reg_audience_filter (SELECT), docs_reg_delete (DELETE), docs_reg_insert (INSERT), docs_reg_select (SELECT), docs_reg_update (UPDATE), restrict_sa_select_documents_register (SELECT), write_lock_delete_documents_register (DELETE), write_lock_insert_documents_register (INSERT), write_lock_update_documents_register (UPDATE)

### email_events
- Columns: id (uuid) NOT NULL, mailgun_message_id (text), event (text) NOT NULL, payload (jsonb), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Super admins can view email events (SELECT), super_admin_only_email_events (ALL)

### email_outbox
- Columns: id (uuid) NOT NULL, to_email (text) NOT NULL, subject (text) NOT NULL, template_slug (text) NOT NULL, payload (jsonb) NOT NULL, status (USER-DEFINED) NOT NULL, error (text), sent_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, tenant_id (uuid), invite_id (uuid), idempotency_key (text), to_name (text)
- RLS: enabled, policies: Super admins can manage email outbox (ALL), billing_gate (ALL), email_outbox_tenant_insert (INSERT), email_outbox_tenant_select (SELECT), write_lock_delete_email_outbox (DELETE), write_lock_insert_email_outbox (INSERT), write_lock_update_email_outbox (UPDATE)

### email_rate_limits
- Columns: id (uuid) NOT NULL, user_id (uuid), user_email (text), operation_type (text) NOT NULL, attempt_count (integer), window_start (timestamp with time zone), created_at (timestamp with time zone)
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: Super admins can manage email rate limits (ALL), service_role_override_email_rate_limits (ALL)

### email_sends
- Columns: id (uuid) NOT NULL, template_id (uuid) NOT NULL, to_address (text) NOT NULL, merge_vars (jsonb), mailgun_message_id (text), status (text) NOT NULL, error (text), created_at (timestamp with time zone) NOT NULL, template_slug (text)
- FKs: template_id -> emails.id
- RLS: enabled, policies: Super admins can view email sends (SELECT), super_admin_only_email_sends (ALL)

### email_templates
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, template_type (text) NOT NULL, subject (text) NOT NULL, body (text) NOT NULL, variables (jsonb), is_active (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid)
- FKs: created_by -> auth.users.id
- RLS: enabled, policies: Super admins can manage email templates (ALL), Super admins only email_templates (ALL)

### emails
- Columns: id (uuid) NOT NULL, internal_name (text) NOT NULL, description (text) NOT NULL, slug (text) NOT NULL, subject (text) NOT NULL, preview_text (text), from_address (text) NOT NULL, reply_to (text) NOT NULL, editor_type (text) NOT NULL, html_body (text) NOT NULL, auth_mode (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Super admins can manage emails (ALL), super_admin_only_emails (ALL)

### enhanced_rate_limits
- Columns: id (uuid) NOT NULL, identifier (text) NOT NULL, endpoint (text) NOT NULL, request_count (integer), window_start (timestamp with time zone), window_duration (interval), max_requests (integer) NOT NULL, blocked_until (timestamp with time zone), violation_count (integer), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: super_admin_only_enhanced_rate_limits (ALL)

### enhanced_security_events
- Columns: id (uuid) NOT NULL, tenant_id (uuid), user_id (uuid), event_type (text) NOT NULL, event_category (text) NOT NULL, severity (text) NOT NULL, source_ip (inet), user_agent (text), session_id (text), event_data (jsonb), risk_indicators (jsonb), created_at (timestamp with time zone), processed_at (timestamp with time zone), alert_sent (boolean)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_enhanced_security_events (ALL), write_lock_delete_enhanced_security_events (DELETE), write_lock_insert_enhanced_security_events (INSERT), write_lock_update_enhanced_security_events (UPDATE)

### evidence_audit_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, evidence_document_id (uuid), trainer_id (uuid) NOT NULL, action (text) NOT NULL, record_type (text), record_id (uuid), field_changes (jsonb), parser_output (jsonb), document_hash (text), performed_by (uuid), performed_at (timestamp with time zone) NOT NULL
- FKs: evidence_document_id -> evidence_documents.id
- RLS: enabled, policies: billing_gate (ALL), eal_insert (INSERT), eal_select (SELECT), super_admin_read_evidence_audit_log (SELECT), super_admin_write_evidence_audit_log (INSERT), write_lock_delete_evidence_audit_log (DELETE), write_lock_insert_evidence_audit_log (INSERT), write_lock_update_evidence_audit_log (UPDATE)

### evidence_document_links
- Columns: id (uuid) NOT NULL, evidence_document_id (uuid) NOT NULL, record_type (text) NOT NULL, record_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, tenant_id (uuid) NOT NULL
- FKs: evidence_document_id -> evidence_documents.id
- RLS: enabled, policies: Admins manage evidence links (ALL), Tenant members view evidence links (SELECT), billing_gate (ALL), evidence_document_links_delete (DELETE), evidence_document_links_insert (INSERT), evidence_document_links_select (SELECT), evidence_document_links_update (UPDATE), super_admin_delete_evidence_document_links (DELETE), super_admin_read_evidence_document_links (SELECT), super_admin_update_evidence_document_links (UPDATE), super_admin_write_evidence_document_links (INSERT), tenant_select_evidence_doc_links (SELECT), tenant_write_evidence_doc_links (ALL), write_lock_delete_evidence_document_links (DELETE), write_lock_insert_evidence_document_links (INSERT), write_lock_update_evidence_document_links (UPDATE)

### evidence_documents
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, file_path (text) NOT NULL, file_name (text) NOT NULL, file_type (text), file_size (bigint), document_hash (text), source_flow (text) NOT NULL, status (text) NOT NULL, ai_analysis (jsonb), parser_output (jsonb), validation_errors (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), storage_bucket (text) NOT NULL, disposition (text), reconciled_at (timestamp with time zone), reconciled_by (uuid), mime_type (text), normalized_at (timestamp with time zone), normalized_by (uuid), legacy_path (text), pre_archive_disposition (text)
- FKs: trainer_id -> tp_trainers.id, created_by -> auth.users.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Admins manage evidence docs (ALL), Tenant members can insert evidence docs (INSERT), Tenant members view evidence docs (SELECT), billing_gate (ALL), super_admin_delete_evidence_documents (DELETE), super_admin_read_evidence_documents (SELECT), super_admin_update_evidence_documents (UPDATE), super_admin_write_evidence_documents (INSERT), write_lock_delete_evidence_documents (DELETE), write_lock_insert_evidence_documents (INSERT), write_lock_update_evidence_documents (UPDATE)

### evidence_expectations
- Columns: id (uuid) NOT NULL, clause_id (uuid) NOT NULL, evidence_type (text) NOT NULL, description (text) NOT NULL
- FKs: clause_id -> clauses.id
- RLS: enabled, policies: Super admins can manage evidence expectations (ALL), read_evidence_expectations (SELECT)

### evidence_files
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, register_id (uuid), file_key (text) NOT NULL, file_name (text) NOT NULL, file_size (bigint), hash_sha256 (text), uploaded_by (uuid), tags (ARRAY), source (text), metadata (jsonb), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid)
- FKs: register_id -> registers.id
- RLS: enabled, policies: Super admins can manage evidence files (ALL), billing_gate (ALL), evidence_files_admin_cm_delete (DELETE), evidence_files_admin_cm_insert (INSERT), evidence_files_admin_cm_update (UPDATE), evidence_files_tenant_select (SELECT), write_lock_delete_evidence_files (DELETE), write_lock_insert_evidence_files (INSERT), write_lock_update_evidence_files (UPDATE)

### evidence_integrity
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, file_path (text) NOT NULL, file_name (text) NOT NULL, sha256_hash (text) NOT NULL, file_size (bigint) NOT NULL, upload_timestamp (timestamp with time zone) NOT NULL, verified_timestamp (timestamp with time zone), integrity_status (text), metadata (jsonb)
- RLS: enabled, policies: Super admins can manage evidence integrity (ALL), billing_gate (ALL), tenant_access_evidence_integrity (ALL), write_lock_delete_evidence_integrity (DELETE), write_lock_insert_evidence_integrity (INSERT), write_lock_update_evidence_integrity (UPDATE)

### evidence_items
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, source_type (text) NOT NULL, source_ref_id (uuid), title (text) NOT NULL, summary (text), url (text), published_date (date), captured_at (timestamp with time zone), owner_role (text), approval_status (text), version (text), review_date (date), tags (ARRAY), content_hash (text), created_at (timestamp with time zone), updated_at (timestamp with time zone), basis_date (date)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), evidence_items_tenant_delete (DELETE), evidence_items_tenant_insert (INSERT), evidence_items_tenant_select (SELECT), evidence_items_tenant_update (UPDATE), write_lock_delete_evidence_items (DELETE), write_lock_insert_evidence_items (INSERT), write_lock_update_evidence_items (UPDATE)

### evidence_normalisation_rules
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, pattern (text) NOT NULL, replacement (text) NOT NULL, category (text) NOT NULL, is_regex (boolean), priority (integer), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Super admins can manage evidence normalisation rules (ALL), billing_gate (ALL), tenant_all (ALL), write_lock_delete_evidence_normalisation_rules (DELETE), write_lock_insert_evidence_normalisation_rules (INSERT), write_lock_update_evidence_normalisation_rules (UPDATE)

### evidence_reconciliation_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, evidence_document_id (uuid) NOT NULL, action (text) NOT NULL, target_record_type (text), target_record_id (uuid), metadata (jsonb), performed_by (uuid) NOT NULL, performed_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: evidence_document_id -> evidence_documents.id
- RLS: enabled, policies: sa_read_reconciliation_log (SELECT), sa_reconciliation_log_select (SELECT), sa_write_reconciliation_log (INSERT)

### evidence_repair_audit
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, record_type (text) NOT NULL, record_id (uuid) NOT NULL, repair_action (text) NOT NULL, old_evidence_document_id (uuid), new_evidence_document_id (uuid), old_file_path (text), new_file_path (text), old_storage_bucket (text), new_storage_bucket (text), classification (text), reason (text), performed_by (uuid), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Tenant isolation on evidence_repair_audit (ALL), superadmin_read_evidence_repair_audit (SELECT)

### evidence_resolver_audit
- Columns: id (uuid) NOT NULL, tenant_id (uuid), record_type (text), record_id (uuid), action (text) NOT NULL, resolved_bucket (text), resolved_path (text), source (text), error_message (text), performed_by (uuid), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: evidence_resolver_audit_insert_auth (INSERT), evidence_resolver_audit_select_admin (SELECT)

### evidence_scores
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, evidence_item_id (uuid) NOT NULL, section_key (text) NOT NULL, relevance_score (numeric) NOT NULL, freshness_score (numeric) NOT NULL, authority_score (numeric) NOT NULL, specificity_score (numeric) NOT NULL, total_score (numeric) NOT NULL, scoring_version (text) NOT NULL, explanation (jsonb) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone) NOT NULL
- FKs: tas_build_id -> q1_tas_builder.id, evidence_item_id -> evidence_items.id
- RLS: enabled, policies: billing_gate (ALL), evidence_scores_tenant_isolation (ALL), write_lock_delete_evidence_scores (DELETE), write_lock_insert_evidence_scores (INSERT), write_lock_update_evidence_scores (UPDATE)

### evidence_stopwords
- Columns: id (uuid) NOT NULL, word (text) NOT NULL, category (text), created_at (timestamp with time zone)
- RLS: enabled, policies: Super admins can manage evidence stopwords (ALL), read_authenticated (SELECT), write_super_admin (ALL)

### evidence_weight_config
- Columns: id (uuid) NOT NULL, tenant_id (uuid), evidence_type (text) NOT NULL, weight (numeric) NOT NULL, description (text), is_default (boolean), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Super admins can manage evidence weight config (ALL), billing_gate (ALL), evidence_weight_config_insert (INSERT), evidence_weight_config_select (SELECT), write_lock_delete_evidence_weight_config (DELETE), write_lock_insert_evidence_weight_config (INSERT), write_lock_update_evidence_weight_config (UPDATE)

### expert_engagements
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, expert_name (text) NOT NULL, expert_email (text), expert_phone (text), expert_organisation (text), expertise_area (text) NOT NULL, qualifications_held (text), years_experience (integer), evidence_file_path (text), justification_type (text) NOT NULL, justification_detail (text) NOT NULL, training_products (ARRAY), supervisor_trainer_id (uuid) NOT NULL, supervision_arrangement (text), assessment_involvement (text) NOT NULL, assessing_alongside_trainer_id (uuid), start_date (date) NOT NULL, end_date (date), review_date (date), oversight_methods (ARRAY), oversight_frequency (text), oversight_notes (text), status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: expert_engagements_delete (DELETE), expert_engagements_insert (INSERT), expert_engagements_select (SELECT), expert_engagements_update (UPDATE)

### expert_oversight_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, engagement_id (uuid) NOT NULL, activity_date (date) NOT NULL, activity_type (text) NOT NULL, duration_minutes (integer), notes (text), outcome (text), evidence_file_path (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL
- FKs: engagement_id -> expert_engagements.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: expert_oversight_log_insert (INSERT), expert_oversight_log_select (SELECT)

### external_clients
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, org_name (text) NOT NULL, abn (text), primary_contact (jsonb), notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), super_admin_full_access (ALL), write_lock_delete_external_clients (DELETE), write_lock_insert_external_clients (INSERT), write_lock_update_external_clients (UPDATE)

### feature_flag_audit_events
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, flag_key (text) NOT NULL, old_value (jsonb), new_value (jsonb) NOT NULL, action (text) NOT NULL, actor_id (uuid) NOT NULL, occurred_at (timestamp with time zone) NOT NULL, reason (text)
- RLS: enabled, policies: billing_gate (ALL), ff_audit_insert (INSERT), ff_audit_select (SELECT), write_lock_delete_feature_flag_audit_events (DELETE), write_lock_insert_feature_flag_audit_events (INSERT), write_lock_update_feature_flag_audit_events (UPDATE)

### feature_flags
- Columns: id (uuid) NOT NULL, tenant_id (uuid), feature_name (text) NOT NULL, is_enabled (boolean), created_at (timestamp with time zone), name (text), description (text), flag_type (text), owner_user_id (uuid), owner_name (text), purpose (text), retirement_plan (text), status (text), default_value (boolean), tenant_scope (ARRAY), role_scope (ARRAY), environment (text), review_date (date), created_by (uuid), updated_at (timestamp with time zone), updated_by (uuid), flag_key (text), is_readonly (boolean) NOT NULL, admin_only (boolean) NOT NULL
- FKs: owner_user_id -> auth.users.id, created_by -> auth.users.id, updated_by -> auth.users.id
- RLS: enabled, policies: Authenticated users can view feature flags (SELECT), Super admins can manage feature flags (ALL), billing_gate (ALL), read_authenticated (SELECT), write_lock_delete_feature_flags (DELETE), write_lock_insert_feature_flags (INSERT), write_lock_update_feature_flags (UPDATE), write_super_admin (ALL)

### feature_visibility
- Columns: feature_key (text) NOT NULL, display_name (text) NOT NULL, status (text) NOT NULL, coming_soon_title (text), coming_soon_body (text), expected_release_text (text), nav_section (text), route_path (text), icon (text), sort_order (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: feature_visibility_select_authenticated (SELECT), feature_visibility_write_superadmin (ALL)

### finding_comparisons
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, audit_id (uuid) NOT NULL, bulk_run_id (uuid), old_finding_id (uuid), new_finding_id (uuid), comparison_type (text) NOT NULL, old_severity (text), new_severity (text), clause_reference (text), created_at (timestamp with time zone) NOT NULL
- FKs: bulk_run_id -> bulk_reprocess_runs.id, audit_id -> audit_reports.id, new_finding_id -> audit_findings.id, old_finding_id -> audit_findings.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_finding_comparisons (DELETE), write_lock_insert_finding_comparisons (INSERT), write_lock_update_finding_comparisons (UPDATE)

### form_submissions
- Columns: id (uuid) NOT NULL, form_id (uuid) NOT NULL, submitted_by (uuid) NOT NULL, submitted_at (timestamp with time zone) NOT NULL, tenant_id (uuid) NOT NULL, payload (jsonb) NOT NULL, register_id (uuid)
- FKs: form_id -> forms.id, register_id -> registers.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_form_submissions (ALL), write_lock_delete_form_submissions (DELETE), write_lock_insert_form_submissions (INSERT), write_lock_update_form_submissions (UPDATE)

### forms
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), key (text) NOT NULL, mapping (jsonb), roles (ARRAY), schema (jsonb) NOT NULL, title (text) NOT NULL, is_active (boolean)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_forms (ALL), write_lock_delete_forms (DELETE), write_lock_insert_forms (INSERT), write_lock_update_forms (UPDATE)

### fpp_dd_background_checks
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fpp_dd_background_checks (SELECT), read_authenticated (SELECT), super_admin_write_fpp_dd_background_checks (ALL)

### fpp_dd_conflict_interest_disclosure
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fpp_dd_conflict_interest_disclosure (SELECT), super_admin_write_fpp_dd_conflict_interest_disclosure (ALL)

### fpp_dd_declarations
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fpp_dd_declarations (SELECT), read_authenticated (SELECT), super_admin_write_fpp_dd_declarations (ALL)

### fpp_dd_disclosure
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: super_admin_only_fpp_dd_disclosure (ALL)

### fpp_dd_financial_business_history
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fpp_dd_financial_business_history (SELECT), read_authenticated (SELECT), super_admin_write_fpp_dd_financial_business_history (ALL)

### fpp_dd_financial_history
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: super_admin_only_fpp_dd_financial_history (ALL)

### fpp_dd_historychecks
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: super_admin_only_fpp_dd_historychecks (ALL)

### fpp_dd_identification
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: super_admin_only_fpp_dd_identification (ALL)

### fpp_dd_identification_verfication
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fpp_dd_identification_verfication (SELECT), read_authenticated (SELECT), super_admin_write_fpp_dd_identification_verfication (ALL)

### fpp_dd_monitoring
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: super_admin_only_fpp_dd_monitoring (ALL)

### fpp_dd_ongoing_monitoring_review
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fpp_dd_ongoing_monitoring_review (SELECT), super_admin_write_fpp_dd_ongoing_monitoring_review (ALL)

### fpp_dd_outcome
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL, sort_order (integer)
- RLS: enabled, policies: authenticated_read_fpp_dd_outcome (SELECT), read_authenticated (SELECT), super_admin_write_fpp_dd_outcome (ALL)

### fpp_dd_regulatory_checks
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fpp_dd_regulatory_checks (SELECT), read_authenticated (SELECT), super_admin_write_fpp_dd_regulatory_checks (ALL)

### fpp_dd_supporting_documents
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fpp_dd_supporting_documents (SELECT), super_admin_write_fpp_dd_supporting_documents (ALL)

### fpp_dd_training_annual_history
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fpp_dd_training_annual_history (SELECT), read_authenticated (SELECT), super_admin_write_fpp_dd_training_annual_history (ALL)

### fpp_ddposition
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fpp_ddposition (SELECT), super_admin_write_fpp_ddposition (ALL)

### fpp_declaration_documents
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, declaration_id (uuid) NOT NULL, document_type (text) NOT NULL, file_name (text) NOT NULL, file_path (text) NOT NULL, mime_type (text), file_size (bigint), notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), status (text) NOT NULL, delete_attempted_at (timestamp with time zone), delete_error (text)
- FKs: declaration_id -> fpp_register.id
- RLS: enabled, policies: fpp_docs_delete (DELETE), fpp_docs_delete_governing_person_only (DELETE), fpp_docs_insert (INSERT), fpp_docs_insert_governance (INSERT), fpp_docs_select (SELECT), fpp_docs_select_governance (SELECT), fpp_docs_update (UPDATE), fpp_docs_update_governance (UPDATE), write_lock_delete_fpp_declaration_documents (DELETE), write_lock_insert_fpp_declaration_documents (INSERT), write_lock_update_fpp_declaration_documents (UPDATE)

### fpp_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, declaration_date (date) NOT NULL, person_name (text) NOT NULL, position_held (text) NOT NULL, declaration_completed_by (uuid), fpp_check_details (text), evidence_provided (text), outcome (text) NOT NULL, review_date (date), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), responsible_person (uuid), responsible_role (text), description (text), due_date (date), status (text)
- RLS: enabled, policies: billing_gate (ALL), fpp_reg_delete (DELETE), fpp_reg_insert (INSERT), fpp_reg_select (SELECT), fpp_reg_update (UPDATE), restrict_sa_select_fpp_register (SELECT), write_lock_delete_fpp_register (DELETE), write_lock_insert_fpp_register (INSERT), write_lock_update_fpp_register (UPDATE)

### fre_dd_associated_risks
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_associated_risks (SELECT), read_authenticated (SELECT), super_admin_write_fre_dd_associated_risks (ALL)

### fre_dd_budget_allocation
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_budget_allocation (SELECT), super_admin_write_fre_dd_budget_allocation (ALL)

### fre_dd_compliance_certificate_required
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_compliance_certificate_required (SELECT), read_authenticated (SELECT), super_admin_write_fre_dd_compliance_certificate_required (ALL)

### fre_dd_current_condition
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_current_condition (SELECT), read_authenticated (SELECT), super_admin_write_fre_dd_current_condition (ALL)

### fre_dd_disposal_method
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_disposal_method (SELECT), read_authenticated (SELECT), super_admin_write_fre_dd_disposal_method (ALL)

### fre_dd_energy_efficiency_rating
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_energy_efficiency_rating (SELECT), read_authenticated (SELECT), super_admin_write_fre_dd_energy_efficiency_rating (ALL)

### fre_dd_function_purpose
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_function_purpose (SELECT), super_admin_write_fre_dd_function_purpose (ALL)

### fre_dd_inspection_type
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_inspection_type (SELECT), super_admin_write_fre_dd_inspection_type (ALL)

### fre_dd_item_type
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_item_type (SELECT), read_authenticated (SELECT), super_admin_write_fre_dd_item_type (ALL)

### fre_dd_life_cycle_status
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_life_cycle_status (SELECT), super_admin_write_fre_dd_life_cycle_status (ALL)

### fre_dd_maintenance_frequency
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_maintenance_frequency (SELECT), read_authenticated (SELECT), super_admin_write_fre_dd_maintenance_frequency (ALL)

### fre_dd_regulatory_authoroty
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_regulatory_authoroty (SELECT), super_admin_write_fre_dd_regulatory_authoroty (ALL)

### fre_dd_safety_compliance
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_safety_compliance (SELECT), super_admin_write_fre_dd_safety_compliance (ALL)

### fre_dd_tag_tested
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_tag_tested (SELECT), super_admin_write_fre_dd_tag_tested (ALL)

### fre_dd_use_frequency
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_fre_dd_use_frequency (SELECT), read_authenticated (SELECT), super_admin_write_fre_dd_use_frequency (ALL)

### fre_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, item_type (text) NOT NULL, item_name (text) NOT NULL, description (text), training_product_code (text), training_product_title (text), location (text), responsible_officer (text), suitability_for_delivery (text), maintenance_required (boolean), last_checked_date (date), next_review_date (date), status (text), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), category_type (USER-DEFINED), date_acquired (date), supplier_manufacturer (text), serial_number (text), current_condition (text), last_maintenance_date (date), next_maintenance_due (date), assigned_to (text), maintenance_frequency (text), warranty_expiry_date (date), compliance_requirements (ARRAY), energy_efficiency_rating (text), budget_allocation (text), life_cycle_status (text), disposal_method (text), disposal_date (date), inspection_records (text), maintenance_provider (text), tag_tested (text), responsible_person (uuid), responsible_role (text), due_date (date), title (text), ai_lookup_snapshot (jsonb), ai_lookup_at (timestamp with time zone), units (jsonb) NOT NULL, is_external (boolean) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), fre_reg_delete (DELETE), fre_reg_insert (INSERT), fre_reg_select (SELECT), fre_reg_update (UPDATE), restrict_sa_select_fre_register (SELECT), write_lock_delete_fre_register (DELETE), write_lock_insert_fre_register (INSERT), write_lock_update_fre_register (UPDATE)

### function_security_audit
- Columns: id (uuid) NOT NULL, function_name (text) NOT NULL, schema_name (text) NOT NULL, fix_applied_at (timestamp with time zone), fix_method (text) NOT NULL, applied_by (uuid), before_definition (text), after_definition (text), success (boolean), error_message (text)
- RLS: enabled, policies: super_admin_only_function_security_audit (ALL)

### global_ai_call_audit
- Columns: id (uuid) NOT NULL, global_update_id (uuid), model (text) NOT NULL, tokens (integer), cost_estimate (numeric), duration_ms (integer), status (text) NOT NULL, error_message (text), triggered_by (uuid), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: super_admin_select_global_audit (SELECT)

### global_analysis_cache
- Columns: id (uuid) NOT NULL, content_hash (text) NOT NULL, analysis_version (text) NOT NULL, response_json (jsonb) NOT NULL, model (text), tokens_used (integer), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: super_admin_insert_global_cache (INSERT), super_admin_select_global_cache (SELECT)

### global_regulatory_impacts
- Columns: id (uuid) NOT NULL, global_update_id (uuid), standard_reference (text), clause_reference (text), recommended_action (text), created_at (timestamp with time zone) NOT NULL
- FKs: global_update_id -> global_regulatory_updates.id
- RLS: enabled, policies: super_admin_insert_global_impacts (INSERT), super_admin_select_global_impacts (SELECT)

### global_regulatory_sources
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, url (text) NOT NULL, frequency (text) NOT NULL, is_active (boolean) NOT NULL, last_checked_at (timestamp with time zone), health_status (text), last_http_status (integer), next_run_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: super_admin_delete_global_sources (DELETE), super_admin_insert_global_sources (INSERT), super_admin_select_global_sources (SELECT), super_admin_update_global_sources (UPDATE)

### global_regulatory_updates
- Columns: id (uuid) NOT NULL, source_id (uuid), title (text), published_date (date), summary (text), raw_content (text), content_hash (text) NOT NULL, impact_level (text), change_type (text), analysis_version (text), analysis_status (text), analysis_model (text), analysis_tokens (integer), analysis_cost_estimate (numeric), analysis_started_at (timestamp with time zone), analysis_completed_at (timestamp with time zone), analysis_locked (boolean), analysis_failed (boolean), published_to_tenants (boolean), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: source_id -> global_regulatory_sources.id
- RLS: enabled, policies: super_admin_delete_global_updates (DELETE), super_admin_insert_global_updates (INSERT), super_admin_select_global_updates (SELECT), super_admin_update_global_updates (UPDATE)

### gov_dd_status
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text), sort_order (integer)
- RLS: enabled, policies: gov_dd_status_read_all (SELECT)

### gov_meeting_setups
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_date (date) NOT NULL, include_surveys (boolean), include_risks (boolean), include_pd_logs (boolean), include_scope (boolean), include_ci (boolean), include_validation (boolean), include_complaints (boolean), include_trainer_reports (boolean), include_audit_findings (boolean), include_third_party (boolean), auto_log_unresolved (boolean), complybot_insights (jsonb), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_gov_meeting_setups (ALL), write_lock_delete_gov_meeting_setups (DELETE), write_lock_insert_gov_meeting_setups (INSERT), write_lock_update_gov_meeting_setups (UPDATE)

### gov_register
- Columns: id (uuid) NOT NULL, title (text) NOT NULL, description (text), entry_type (text) NOT NULL, standard_reference (text), evidence_type (text), evidence_link (text), responsible_person (uuid), due_date (date), review_cycle (text), status (text), notes (text), created_by (uuid), created_at (timestamp with time zone), updated_by (uuid), updated_at (timestamp with time zone), tenant_id (uuid), register_id (uuid), source_type (text), register_type (text), severity (text), evidence_url (text), custom_id (text), demo_seed (boolean) NOT NULL, action_type (text), quality_area (text), event_date (timestamp with time zone), sla_type (text), sla_deadline (timestamp with time zone), retention_period (text), retention_until (timestamp with time zone), evidence_files (jsonb), supporting_documents (jsonb), risk_level (text), compliance_notes (text), assigned_to (uuid), reviewed_by (uuid), approved_by (uuid), next_review_date (timestamp with time zone), register_data (jsonb), standard_references (ARRAY), completion_date (timestamp with time zone), responsible_role (text), risk_details (text), register_custom_id (text), linked_ofi_id (integer), linked_ci_id (uuid), linked_risk_id (uuid)
- FKs: updated_by -> auth.users.id, created_by -> auth.users.id, status -> gov_dd_status.value
- RLS: enabled, policies: billing_gate (ALL), gov_register_delete (DELETE), gov_register_insert (INSERT), gov_register_select (SELECT), gov_register_update (UPDATE), restrict_sa_select_gov_register (SELECT), write_lock_delete_gov_register (DELETE), write_lock_insert_gov_register (INSERT), write_lock_update_gov_register (UPDATE)

### governance_actions
- Columns: id (uuid) NOT NULL, action_title (text) NOT NULL, action_type (text) NOT NULL, linked_register (ARRAY) NOT NULL, linked_standard (ARRAY), description (text) NOT NULL, date_identified (date) NOT NULL, status (text) NOT NULL, assigned_to (uuid), target_resolution_date (date), evidence_reference (text), linked_risk_id (text), priority (text) NOT NULL, tags (ARRAY), notes (text), tenant_id (uuid) NOT NULL, created_by (uuid) NOT NULL, updated_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, raised_at_meeting_id (uuid), resolved_at_meeting_id (uuid), last_reviewed_at_meeting_id (uuid), register_destination (text), dispatched_to_register_id (text), dispatched_at (timestamp with time zone), carryover_count (integer) NOT NULL
- FKs: raised_at_meeting_id -> governance_meetings.id, resolved_at_meeting_id -> governance_meetings.id, last_reviewed_at_meeting_id -> governance_meetings.id
- RLS: enabled, policies: Admins can manage governance actions (ALL), Tenant members can view governance actions (SELECT), billing_gate (ALL), gov_actions_delete_governing_person_only (DELETE), gov_actions_insert_governance (INSERT), gov_actions_select_governance (SELECT), gov_actions_update_governance (UPDATE), write_lock_delete_governance_actions (DELETE), write_lock_insert_governance_actions (INSERT), write_lock_update_governance_actions (UPDATE)

### governance_auto_suggestions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, suggestion_type (text) NOT NULL, trigger_code (text) NOT NULL, confidence (numeric) NOT NULL, reasons (jsonb) NOT NULL, suggested_payload (jsonb) NOT NULL, source_refs (jsonb) NOT NULL, status (text) NOT NULL, decided_by (uuid), decided_at (timestamp with time zone), decision_notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: meeting_id -> governance_meetings.id
- RLS: enabled, policies: billing_gate (ALL), gas_select_cm_admin (SELECT), gas_write_cm_admin (ALL), gov_suggestions_insert_governance (INSERT), gov_suggestions_select_governance (SELECT), gov_suggestions_update_governance (UPDATE), write_lock_delete_governance_auto_suggestions (DELETE), write_lock_insert_governance_auto_suggestions (INSERT), write_lock_update_governance_auto_suggestions (UPDATE)

### governance_clause_map
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, signal_type (text) NOT NULL, signal_code (text) NOT NULL, clause_code (text) NOT NULL, clause_label (text) NOT NULL, severity (text) NOT NULL, weight (integer) NOT NULL, base_weight (integer) NOT NULL, allow_multiplier (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), gcm_insert_governance (INSERT), gcm_select_governance (SELECT), write_lock_delete_governance_clause_map (DELETE)

### governance_clause_scores
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, period_month (integer) NOT NULL, period_year (integer) NOT NULL, meeting_id (uuid), base_score (integer) NOT NULL, total_penalty (integer) NOT NULL, final_score (integer) NOT NULL, clause_breakdown (jsonb) NOT NULL, prediction_warning (jsonb), created_at (timestamp with time zone) NOT NULL
- FKs: meeting_id -> governance_meetings.id
- RLS: enabled, policies: billing_gate (ALL), gcs_insert_governance (INSERT), gcs_select_governance (SELECT), write_lock_delete_governance_clause_scores (DELETE)

### governance_clause_trends
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, clause_code (text) NOT NULL, period_year (integer) NOT NULL, period_month (integer) NOT NULL, penalty (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), gct_insert_governance (INSERT), gct_select_governance (SELECT), write_lock_delete_governance_clause_trends (DELETE)

### governance_delegations
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, authority_area (text) NOT NULL, delegate_person_id (uuid) NOT NULL, scope (text), start_date (date) NOT NULL, end_date (date), revocation_reason (text), evidence_links (jsonb) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), gov_delegations_insert_governance (INSERT), gov_delegations_select_governance (SELECT), gov_delegations_update_governance (UPDATE), tenant_access_governance_delegations (ALL), write_lock_delete_governance_delegations (DELETE), write_lock_insert_governance_delegations (INSERT), write_lock_update_governance_delegations (UPDATE)

### governance_meeting_agenda_items
- Columns: id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, section_key (text) NOT NULL, custom_title (text), order_index (integer) NOT NULL, snapshot_payload (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: meeting_id -> governance_meetings.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), gov_agenda_delete (DELETE), gov_agenda_delete_governing_person_only (DELETE), gov_agenda_insert (INSERT), gov_agenda_insert_governance (INSERT), gov_agenda_select (SELECT), gov_agenda_select_governance (SELECT), gov_agenda_update (UPDATE), gov_agenda_update_governance (UPDATE), restrict_sa_select_gov_agenda (SELECT), write_lock_delete_governance_meeting_agenda_items (DELETE), write_lock_insert_governance_meeting_agenda_items (INSERT), write_lock_update_governance_meeting_agenda_items (UPDATE)

### governance_meeting_artefacts
- Columns: id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, storage_path (text) NOT NULL, file_name (text) NOT NULL, file_type (text) NOT NULL, source_type (text) NOT NULL, uploaded_by (uuid), uploaded_at (timestamp with time zone) NOT NULL, processed_text (text)
- FKs: tenant_id -> tenants.tenant_id, meeting_id -> governance_meetings.id, uploaded_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), gov_artefacts_delete_governing_person_only (DELETE), gov_artefacts_insert_governance (INSERT), gov_artefacts_select_governance (SELECT), gov_artefacts_update_governance (UPDATE), tenant_all (ALL), write_lock_delete_governance_meeting_artefacts (DELETE), write_lock_insert_governance_meeting_artefacts (INSERT), write_lock_update_governance_meeting_artefacts (UPDATE)

### governance_meeting_attendance
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, participant_user_id (uuid), participant_name (text), participant_email (text), status (text) NOT NULL, notes (text), created_at (timestamp with time zone), created_by (uuid), updated_at (timestamp with time zone)
- FKs: meeting_id -> governance_meetings.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), gma_tenant_access (ALL), gov_attendance_delete_governing_person_only (DELETE), gov_attendance_insert_governance (INSERT), gov_attendance_select_governance (SELECT), gov_attendance_update_governance (UPDATE), write_lock_delete_governance_meeting_attendance (DELETE), write_lock_insert_governance_meeting_attendance (INSERT), write_lock_update_governance_meeting_attendance (UPDATE)

### governance_meeting_audit_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, event_type (text) NOT NULL, actor_id (uuid), before_state (jsonb), after_state (jsonb), metadata (jsonb), created_at (timestamp with time zone) NOT NULL
- FKs: meeting_id -> governance_meetings.id
- RLS: enabled, policies: Authenticated users can insert audit logs (INSERT), Tenant members can view audit logs (SELECT), billing_gate (ALL), gov_mtg_audit_insert_governing_person_only (INSERT), gov_mtg_audit_select_governance (SELECT), write_lock_delete_governance_meeting_audit_log (DELETE), write_lock_insert_governance_meeting_audit_log (INSERT), write_lock_update_governance_meeting_audit_log (UPDATE)

### governance_meeting_history
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, event_type (text) NOT NULL, minutes_text (text), ai_payload (jsonb), artefact_links (jsonb), metadata (jsonb), created_at (timestamp with time zone), created_by (uuid)
- FKs: meeting_id -> governance_meetings.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), gmh_tenant_access (ALL), gov_history_insert_governance (INSERT), gov_history_select_governance (SELECT), gov_history_update_governance (UPDATE), write_lock_delete_governance_meeting_history (DELETE), write_lock_insert_governance_meeting_history (INSERT), write_lock_update_governance_meeting_history (UPDATE)

### governance_meeting_items
- Columns: id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, title (text) NOT NULL, summary (text), source_table (text) NOT NULL, source_id (uuid) NOT NULL, owner_role (text), due_date (timestamp with time zone), clause_tags (ARRAY), risk_flag (boolean), status (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), gov_items_delete_governance (DELETE), gov_items_insert_governance (INSERT), gov_items_select_governance (SELECT), gov_items_update_governance (UPDATE), tenant_all (ALL), write_lock_delete_governance_meeting_items (DELETE), write_lock_insert_governance_meeting_items (INSERT), write_lock_update_governance_meeting_items (UPDATE)

### governance_meeting_minutes
- Columns: meeting_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, decisions_json (jsonb), actions_json (jsonb), open_questions_json (jsonb), risks_json (jsonb), ofi_json (jsonb), compliance_flags_json (jsonb), raw_notes_text (text), section_notes (jsonb), artefact_refs_json (jsonb), readiness_score (numeric), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, action_links (jsonb), formatted_minutes (text), summary (text)
- FKs: tenant_id -> tenants.tenant_id, meeting_id -> governance_meetings.id
- RLS: enabled, policies: billing_gate (ALL), gov_minutes_delete (DELETE), gov_minutes_delete_governing_person_only (DELETE), gov_minutes_insert (INSERT), gov_minutes_insert_governance (INSERT), gov_minutes_select (SELECT), gov_minutes_select_governance (SELECT), gov_minutes_update (UPDATE), gov_minutes_update_governance (UPDATE), restrict_sa_select_gov_minutes (SELECT), write_lock_delete_governance_meeting_minutes (DELETE), write_lock_insert_governance_meeting_minutes (INSERT), write_lock_update_governance_meeting_minutes (UPDATE)

### governance_meeting_reports
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, report_date (date) NOT NULL, meeting_type (text) NOT NULL, status (text) NOT NULL, last_meeting_date (date), next_meeting_date (date), compliance_rate (numeric), overdue_actions_count (integer), trainer_feedback_summary (text), assessment_validation_status (text), risk_register_updates (text), policy_updates (text), complaints_summary (text), third_party_activity (text), ci_actions_summary (text), industry_engagement (text), survey_results (text), ai_suggestions (jsonb), created_by (uuid), updated_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, ai_summary_sections (jsonb), include_in_export (jsonb), attendees (jsonb), signature_fields (jsonb), ai_generation_status (text), meeting_pack_template (text)
- RLS: enabled, policies: billing_gate (ALL), gov_reports_insert_governance (INSERT), gov_reports_select_governance (SELECT), gov_reports_update_governance (UPDATE), tenant_all (ALL), write_lock_delete_governance_meeting_reports (DELETE), write_lock_insert_governance_meeting_reports (INSERT), write_lock_update_governance_meeting_reports (UPDATE)

### governance_meeting_schedules
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, enabled (boolean) NOT NULL, title (text) NOT NULL, tzid (text) NOT NULL, dtstart (timestamp with time zone) NOT NULL, rrule (text) NOT NULL, duration_minutes (integer) NOT NULL, location (text), attendees (jsonb), notify_hours_before (integer), generate_pack_on_create (boolean), last_emitted_at (timestamp with time zone), created_by (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, scheduled_at (timestamp with time zone), frequency (text), attendees_json (jsonb), location_json (jsonb)
- RLS: enabled, policies: billing_gate (ALL), gov_schedules_insert_governance (INSERT), gov_schedules_select_governance (SELECT), gov_schedules_update_governance (UPDATE), tenant_all (ALL), write_lock_delete_governance_meeting_schedules (DELETE), write_lock_insert_governance_meeting_schedules (INSERT), write_lock_update_governance_meeting_schedules (UPDATE)

### governance_meetings
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_date (date) NOT NULL, agenda_json (jsonb) NOT NULL, outcomes_json (jsonb) NOT NULL, evidence_links (jsonb) NOT NULL, pack_link (text), created_at (timestamp with time zone), updated_at (timestamp with time zone), agenda_items_count (integer), risk_items_count (integer), scheduled_at (timestamp with time zone), status (text) NOT NULL, generated_pack_path (text), generated_pack_pdf_path (text), created_by (uuid) NOT NULL, updated_by (uuid), schedule_id (uuid), starts_at (timestamp with time zone), ends_at (timestamp with time zone), tzid (text), title (text), location (text), attendees (jsonb), pack_id (uuid), agenda (jsonb), shifted_from (date), shift_reason (text), facilitator_id (uuid), minute_taker_id (uuid), is_backdated (boolean), backdated_by (uuid), started_at (timestamp with time zone), ended_at (timestamp with time zone), dispatch_state (jsonb) NOT NULL
- FKs: minute_taker_id -> auth.users.id, backdated_by -> auth.users.id, facilitator_id -> auth.users.id, schedule_id -> governance_meeting_schedules.id
- RLS: enabled, policies: billing_gate (ALL), gov_meetings_apex_only (ALL), gov_meetings_delete (DELETE), gov_meetings_delete_governing_person_only (DELETE), gov_meetings_insert (INSERT), gov_meetings_insert_governance (INSERT), gov_meetings_select (SELECT), gov_meetings_select_tenant_read (SELECT), gov_meetings_update (UPDATE), gov_meetings_update_governance (UPDATE), restrict_sa_select_governance_meetings (SELECT), write_lock_delete_governance_meetings (DELETE), write_lock_insert_governance_meetings (INSERT), write_lock_update_governance_meetings (UPDATE)

### governance_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, period (text) NOT NULL, file_url (text), report_data (jsonb), generated_at (timestamp with time zone) NOT NULL, generated_by (uuid) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), gov_packs_insert_governance (INSERT), gov_packs_select_governance (SELECT), gov_packs_update_governance (UPDATE), governance_packs_insert (INSERT), governance_packs_select (SELECT), write_lock_delete_governance_packs (DELETE), write_lock_insert_governance_packs (INSERT), write_lock_update_governance_packs (UPDATE)

### governance_readiness_snapshots
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, score (numeric) NOT NULL, domain_scores (jsonb) NOT NULL, blockers (jsonb) NOT NULL, is_blocked (boolean) NOT NULL, calculated_by (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: meeting_id -> governance_meetings.id
- RLS: enabled, policies: billing_gate (ALL), gov_readiness_select_governance (SELECT), gov_readiness_write_governing_person_only (INSERT), grs_insert_cm_admin (INSERT), grs_select_cm_admin (SELECT), write_lock_delete_governance_readiness_snapshots (DELETE), write_lock_insert_governance_readiness_snapshots (INSERT), write_lock_update_governance_readiness_snapshots (UPDATE)

### governance_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, tenant_id (uuid) NOT NULL, source_table (text) NOT NULL, source_id (uuid) NOT NULL, title (text) NOT NULL, summary (text), quality_area (text) NOT NULL, clause_tags (ARRAY), risk_flag (boolean), owner_id (uuid), action_required (text), due_date (timestamp with time zone), status (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_by (uuid), updated_at (timestamp with time zone) NOT NULL, meeting_id (uuid), meeting_date (date), responsible_person (uuid), responsible_role (text), risk_level (text)
- FKs: meeting_id -> governance_meetings.id
- RLS: enabled, policies: billing_gate (ALL), gov_reg_delete_governing_person_only (DELETE), gov_reg_insert_governance (INSERT), gov_reg_select_governance (SELECT), gov_reg_update_governance (UPDATE), governance_reg_delete (DELETE), governance_reg_insert (INSERT), governance_reg_select (SELECT), governance_reg_update (UPDATE), restrict_sa_select_governance_register (SELECT), write_lock_delete_governance_register (DELETE), write_lock_insert_governance_register (INSERT), write_lock_update_governance_register (UPDATE)

### governing_body_meetings
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_date (date) NOT NULL, meeting_title (text) NOT NULL, attendees (ARRAY), minutes_recorded (boolean) NOT NULL, notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid)
- FKs: tenant_id -> tenants.tenant_id, created_by -> profiles.id
- RLS: enabled, policies: gbm_admin_all (ALL), gbm_compliance_all (ALL), gbm_governing_person_select (SELECT), gbm_super_admin_all (ALL)

### governing_persons
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, person_id (uuid) NOT NULL, role_title (text) NOT NULL, start_date (date) NOT NULL, end_date (date), fit_proper_status (text) NOT NULL, evidence_links (jsonb) NOT NULL, reviewed_at (timestamp with time zone), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), governing_persons_apex_policy (SELECT), governing_persons_delete_restricted (DELETE), governing_persons_insert_restricted (INSERT), governing_persons_own_manage (ALL), governing_persons_select_restricted (SELECT), governing_persons_update_restricted (UPDATE), gp_admin_all (ALL), gp_compliance_all (ALL), gp_governing_person_select (SELECT), gp_super_admin_all (ALL), tenant_access_governing_persons (ALL), write_lock_delete_governing_persons (DELETE), write_lock_insert_governing_persons (INSERT), write_lock_update_governing_persons (UPDATE)

### help_centre_content
- Columns: id (uuid) NOT NULL, content_type (text) NOT NULL, title (text) NOT NULL, description (text), vimeo_id (text), url (text), sort_order (integer) NOT NULL, is_published (boolean) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, tenant_id (uuid), content (text), slug (text)
- FKs: tenant_id -> tenants.tenant_id, created_by -> auth.users.id
- RLS: enabled, policies: Authenticated users can read published help content (SELECT), Super admins can manage help content (ALL)

### ic_survey_ai_emails
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, plan_id (uuid) NOT NULL, survey_id (uuid), email_subject (text) NOT NULL, email_body (text) NOT NULL, survey_url (text) NOT NULL, survey_name_snapshot (text), industry_sector_snapshot (text), qual_code_snapshot (text), qual_title_snapshot (text), rto_name_snapshot (text), intended_outcomes_snapshot (text), copied_at (timestamp with time zone), copy_count (integer) NOT NULL, model_version (text) NOT NULL, prompt_version (text) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: created_by -> auth.users.id, survey_id -> industry_consultation_surveys.id, plan_id -> industry_consultation_plans.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_select_ic_survey_ai_emails (SELECT), write_lock_insert_ic_survey_ai_emails (INSERT), write_lock_update_ic_survey_ai_emails (UPDATE)

### idc_dd_actions
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_idc_dd_actions (SELECT), read_authenticated (SELECT), super_admin_write_idc_dd_actions (ALL)

### idc_dd_activities
- Columns: id (bigint) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_idc_dd_activities (SELECT), super_admin_write_idc_dd_activities (ALL)

### idc_dd_follow_up
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_idc_dd_follow_up (SELECT), read_authenticated (SELECT), super_admin_write_idc_dd_follow_up (ALL)

### idc_dd_purpose
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_idc_dd_purpose (SELECT), read_authenticated (SELECT), super_admin_write_idc_dd_purpose (ALL)

### idc_dd_recommendations
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_idc_dd_recommendations (SELECT), read_authenticated (SELECT), super_admin_write_idc_dd_recommendations (ALL)

### idc_dd_status
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_idc_dd_status (SELECT), read_authenticated (SELECT), super_admin_write_idc_dd_status (ALL)

### idc_dd_type
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_idc_dd_type (SELECT), read_authenticated (SELECT), super_admin_write_idc_dd_type (ALL)

### idc_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, activity_date (date) NOT NULL, activity_type (text) NOT NULL, participants (text), description (text), industry_partner (text), location (text), evidence_collected (text), follow_up_actions (text), responsible_person (uuid), status (text), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), responsible_role (text), due_date (date), title (text), governance_description (text)
- RLS: enabled, policies: billing_gate (ALL), idc_reg_delete (DELETE), idc_reg_insert (INSERT), idc_reg_select (SELECT), idc_reg_update (UPDATE), restrict_sa_select_idc_register (SELECT), write_lock_delete_idc_register (DELETE), write_lock_insert_idc_register (INSERT), write_lock_update_idc_register (UPDATE)

### ien_dd_engagement_type
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: super_admin_only_ien_dd_engagement_type (ALL)

### ien_register
- Columns: id (uuid) NOT NULL, custom_id (text), organisation (text), contact_person (text), contact_email (text), contact_phone (text), engagement_type (text), engagement_date (date), training_product (text), outcomes_agreed (text), discussion_points (text), followup_required (boolean), followup_date (date), responsible_person (uuid), tabled_qcmeeting (date), pp_amended (text), pp_amended_date (date), status (text), risk_level (text), notes (text), tenant_id (uuid), created_by (uuid), created_at (timestamp with time zone), updated_by (uuid), updated_at (timestamp with time zone), responsible_role (text), description (text), due_date (date), activity_date (date), activity_type (text), evidence_collected (text), follow_up_actions (text), governance_description (text), industry_partner (text), location (text), participants (text), supporting_documents (jsonb), title (text), engagement_outcome (text), skills_gaps (jsonb)
- RLS: enabled, policies: billing_gate (ALL), ien_register_tenant_access (ALL), write_lock_delete_ien_register (DELETE), write_lock_insert_ien_register (INSERT), write_lock_update_ien_register (UPDATE)

### immutable_audit_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, register_type (text) NOT NULL, register_entry_id (uuid) NOT NULL, event_type (text) NOT NULL, event_data (jsonb) NOT NULL, user_id (uuid) NOT NULL, timestamp (timestamp with time zone) NOT NULL, hash_chain (text) NOT NULL, event_hash (text) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_access_immutable_audit_log (ALL), write_lock_delete_immutable_audit_log (DELETE), write_lock_insert_immutable_audit_log (INSERT), write_lock_update_immutable_audit_log (UPDATE)

### impersonations
- Columns: id (uuid) NOT NULL, super_admin_id (uuid) NOT NULL, impersonated_user_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, started_at (timestamp with time zone) NOT NULL, ended_at (timestamp with time zone), reason (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, metadata (jsonb), impersonator_id (uuid) NOT NULL, previous_active_tenant_id (uuid), expires_at (timestamp with time zone) NOT NULL, ended_reason (text), ended_by (uuid)
- FKs: super_admin_id -> auth.users.id, impersonated_user_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), impersonator_select_own (SELECT), impersonator_update_own (UPDATE), super_admin_all (ALL), write_lock_delete_impersonations (DELETE), write_lock_insert_impersonations (INSERT), write_lock_update_impersonations (UPDATE)

### in_app_notifications
- Columns: id (uuid) NOT NULL, tenant_id (uuid), recipient_user_id (uuid) NOT NULL, notification_type (text) NOT NULL, priority (text) NOT NULL, category (text) NOT NULL, title (text) NOT NULL, message (text) NOT NULL, action_url (text), metadata (jsonb), read_at (timestamp with time zone), dismissed_at (timestamp with time zone), expires_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Users can update own notifications (UPDATE), Users can view own notifications (SELECT), billing_gate (ALL), write_lock_delete_in_app_notifications (DELETE), write_lock_insert_in_app_notifications (INSERT), write_lock_update_in_app_notifications (UPDATE)

### independent_reviews
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, tenant_id (uuid) NOT NULL, student_id (text), student_name (text) NOT NULL, title (text), reason (text) NOT NULL, previous_attempts (text), reviewer_id (uuid), findings (text), determination (text), review_date (date), status (text), notes (text), source_type (text), source_id (uuid), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: created_by -> auth.users.id, updated_by -> auth.users.id, reviewer_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_independent_reviews (DELETE), write_lock_insert_independent_reviews (INSERT), write_lock_update_independent_reviews (UPDATE)

### industry_consultation_decisions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, theme_id (uuid), theme_type (text) NOT NULL, theme_statement (text) NOT NULL, decision (text) NOT NULL, decision_rationale (text) NOT NULL, decided_at (timestamp with time zone) NOT NULL, decided_by (uuid), action_type (text), action_description (text), action_due_date (date), linked_tas_section (text), action_status (text) NOT NULL, action_completed_at (timestamp with time zone), action_evidence (text), linked_ci_item_id (uuid), linked_decision_id (uuid), custom_id (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: tas_build_id -> q1_tas_builder.id, theme_id -> tas_industry_themes.id
- RLS: enabled, policies: billing_gate (ALL)

### industry_consultation_invites
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, session_id (uuid) NOT NULL, contact_name (text) NOT NULL, organisation (text), role_title (text), email (text), phone (text), channel (text) NOT NULL, status (text) NOT NULL, sent_at (timestamp with time zone), responded_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL
- FKs: session_id -> industry_consultation_sessions.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolation_delete (DELETE), tenant_isolation_insert (INSERT), tenant_isolation_select (SELECT), tenant_isolation_update (UPDATE), write_lock_delete_industry_consultation_invites (DELETE), write_lock_insert_industry_consultation_invites (INSERT), write_lock_update_industry_consultation_invites (UPDATE)

### industry_consultation_outcomes
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, engagement_id (uuid) NOT NULL, feedback_summary (text) NOT NULL, identified_changes (text), impacts_tas (boolean), impacts_delivery (boolean), impacts_assessment (boolean), impact_details (text), action_taken (text), rationale_for_no_action (text), affected_tas_ids (ARRAY), affected_delivery_plan_ids (ARRAY), clause_ids (ARRAY) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- FKs: engagement_id -> industry_engagements.id
- RLS: enabled, policies: billing_gate (ALL), ico_manage (ALL), ico_select (SELECT), write_lock_delete_industry_consultation_outcomes (DELETE), write_lock_insert_industry_consultation_outcomes (INSERT), write_lock_update_industry_consultation_outcomes (UPDATE)

### industry_consultation_plan_training_products
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, consultation_plan_id (uuid) NOT NULL, training_product_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL
- FKs: consultation_plan_id -> industry_consultation_plans.id, training_product_id -> training_products.id
- RLS: enabled, policies: billing_gate (ALL), icp_tp_delete (DELETE), icp_tp_insert (INSERT), icp_tp_select (SELECT), write_lock_delete_icp_tp (DELETE), write_lock_insert_icp_tp (INSERT)

### industry_consultation_plans
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, custom_id (text) NOT NULL, qualification_code (text), qualification_title (text), unit_codes (ARRAY), tas_id (uuid), industry_sector (text) NOT NULL, title (text) NOT NULL, description (text), consultation_methods (ARRAY) NOT NULL, intended_outcomes (text), planned_start_date (date), planned_end_date (date), status (text) NOT NULL, clause_ids (ARRAY) NOT NULL, review_date (date), valid_until (date), currency_status (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), plan_year (integer), product_type (text) NOT NULL, training_product_title (text), training_product_codes (ARRAY), completed_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), icp_manage (ALL), icp_select (SELECT), write_lock_delete_industry_consultation_plans (DELETE), write_lock_insert_industry_consultation_plans (INSERT), write_lock_update_industry_consultation_plans (UPDATE)

### industry_consultation_record_training_products
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, consultation_record_id (uuid) NOT NULL, training_product_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL
- FKs: consultation_record_id -> industry_consultation_records.id, training_product_id -> training_products.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_icr_tp (DELETE), write_lock_insert_icr_tp (INSERT), write_lock_update_icr_tp (UPDATE)

### industry_consultation_records
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, plan_id (uuid), custom_id (text) NOT NULL, consultation_date (date) NOT NULL, consultation_method (text) NOT NULL, industry_representative (text) NOT NULL, organisation_name (text), industry_sector (text), training_product_code (text), training_product_title (text), tas_id (uuid), validation_id (uuid), purpose (text), discussion_summary (text), key_findings (text), recommendations (text), actions_agreed (text), outcome_summary (text), evidence_files (jsonb), supporting_documents (jsonb), notes (text), status (text) NOT NULL, follow_up_required (boolean), follow_up_date (date), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), participants (jsonb), assigned_trainer_id (uuid), survey_distribution_method (text), survey_response_count (integer), survey_response_rate (numeric), meeting_location (text), meeting_duration_hours (numeric), meeting_agenda (jsonb), call_duration_minutes (integer), caller_name (text), method_details (jsonb), tas_consultation_id (uuid), source (text) NOT NULL, assessment_tool_id (uuid), representative_name (text), representative_role (text), representative_email (text)
- FKs: assessment_tool_id -> assessment_tools.id, tas_consultation_id -> q1_tas_consultation.id, tas_id -> q1_tas_builder.id, validation_id -> assessment_validation.id, updated_by -> auth.users.id, tenant_id -> tenants.tenant_id, plan_id -> industry_consultation_plans.id, created_by -> auth.users.id, assigned_trainer_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_industry_consultation_records (DELETE), write_lock_insert_industry_consultation_records (INSERT), write_lock_update_industry_consultation_records (UPDATE)

### industry_consultation_records_tas_link
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, consultation_record_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid)
- FKs: tas_build_id -> q1_tas_builder.id, consultation_record_id -> industry_consultation_records.id
- RLS: enabled, policies: icr_tas_link_delete_own_tenant (DELETE), icr_tas_link_insert_own_tenant (INSERT), icr_tas_link_select_own_tenant (SELECT), icr_tas_link_service_role_all (ALL)

### industry_consultation_responses
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, session_id (uuid) NOT NULL, invite_id (uuid), response_channel (text) NOT NULL, response_date (date) NOT NULL, raw_notes (text), structured_answers (jsonb) NOT NULL, attachments (jsonb), created_by (uuid), created_at (timestamp with time zone) NOT NULL
- FKs: invite_id -> industry_consultation_invites.id, session_id -> industry_consultation_sessions.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolation_delete (DELETE), tenant_isolation_insert (INSERT), tenant_isolation_select (SELECT), tenant_isolation_update (UPDATE), write_lock_delete_industry_consultation_responses (DELETE), write_lock_insert_industry_consultation_responses (INSERT), write_lock_update_industry_consultation_responses (UPDATE)

### industry_consultation_sessions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, qualification_code (text), region (text), state (text), target_industry (text), status (text) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, product_type (text) NOT NULL, training_product_title (text), training_product_codes (ARRAY)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolation_delete (DELETE), tenant_isolation_insert (INSERT), tenant_isolation_select (SELECT), tenant_isolation_update (UPDATE), write_lock_delete_industry_consultation_sessions (DELETE), write_lock_insert_industry_consultation_sessions (INSERT), write_lock_update_industry_consultation_sessions (UPDATE)

### industry_consultation_survey_responses
- Columns: id (uuid) NOT NULL, survey_id (text) NOT NULL, respondent_name (text) NOT NULL, respondent_role (text), respondent_organization (text) NOT NULL, respondent_email (text), responses (jsonb) NOT NULL, completed_at (timestamp with time zone), created_at (timestamp with time zone)
- RLS: enabled, policies: anon_insert_ic_survey_responses (INSERT), authenticated_insert_ic_survey_responses (INSERT), tenant_select_ic_survey_responses (SELECT)

### industry_consultation_surveys
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, plan_id (uuid), engagement_id (uuid), qualification_code (text), qualification_title (text), industry_sector (text), organization_name (text), created_by (uuid) NOT NULL, expires_at (timestamp with time zone), is_active (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone), slug (text), tas_build_id (uuid)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: anon_can_view_active_surveys (SELECT), billing_gate (ALL), tenant_all (ALL), write_lock_delete_industry_consultation_surveys (DELETE), write_lock_insert_industry_consultation_surveys (INSERT), write_lock_update_industry_consultation_surveys (UPDATE)

### industry_consultation_themes
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, theme_type (text) NOT NULL, theme_text (text) NOT NULL, support_count (integer) NOT NULL, confidence (numeric) NOT NULL, evidence_response_ids (ARRAY), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolation_delete (DELETE), tenant_isolation_insert (INSERT), tenant_isolation_select (SELECT), tenant_isolation_update (UPDATE), write_lock_delete_industry_consultation_themes (DELETE), write_lock_insert_industry_consultation_themes (INSERT), write_lock_update_industry_consultation_themes (UPDATE)

### industry_engagements
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, custom_id (text) NOT NULL, plan_id (uuid), engagement_type (text) NOT NULL, title (text) NOT NULL, description (text), engagement_date (date) NOT NULL, engagement_end_date (date), qualification_code (text), unit_codes (ARRAY), industry_sector (text), representative_ids (ARRAY), representative_details (jsonb), clause_ids (ARRAY) NOT NULL, evidence_files (jsonb), status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- FKs: plan_id -> industry_consultation_plans.id
- RLS: enabled, policies: billing_gate (ALL), ie_manage (ALL), ie_select (SELECT), write_lock_delete_industry_engagements (DELETE), write_lock_insert_industry_engagements (INSERT), write_lock_update_industry_engagements (UPDATE)

### industry_evidence
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, record_type (text) NOT NULL, record_id (uuid) NOT NULL, evidence_type (text) NOT NULL, title (text) NOT NULL, description (text), file_path (text), file_name (text), file_size (integer), uploaded_at (timestamp with time zone) NOT NULL, uploaded_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), iev_manage (ALL), iev_select (SELECT), write_lock_delete_industry_evidence (DELETE), write_lock_insert_industry_evidence (INSERT), write_lock_update_industry_evidence (UPDATE)

### industry_representatives
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, full_name (text) NOT NULL, organisation (text), position (text), industry_sector (text), email (text), phone (text), notes (text), is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), ir_manage (ALL), ir_select (SELECT), write_lock_delete_industry_representatives (DELETE), write_lock_insert_industry_representatives (INSERT), write_lock_update_industry_representatives (UPDATE)

### ingestion_meta
- Columns: key (text) NOT NULL, value (text), updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Public read ingestion_meta (SELECT), Service insert ingestion_meta (INSERT), Service update ingestion_meta (UPDATE)

### instruments
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, short_name (text) NOT NULL, jurisdiction (text) NOT NULL, enabling_act (text) NOT NULL, commencement_date (date), status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: read_instruments (SELECT)

### intervention_plans
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, custom_id (text), student_id (text), student_name (text), title (text), risk_trigger_type (text), risk_category (text), severity_level (text), status (text), summary (text), actions (text), follow_up_date (date), escalation_required (boolean), updated_by (uuid), source_type (text), source_id (uuid), llnd_assessment_id (uuid), suitability_result_id (uuid), support_request_id (uuid), wizard_responses (jsonb), placement_wellbeing_record_id (uuid)
- FKs: support_request_id -> ssr_register.id, created_by -> auth.users.id, llnd_assessment_id -> llnd_assessments.id, placement_wellbeing_record_id -> placement_wellbeing_records.id, suitability_result_id -> suitability_results.id, tenant_id -> tenants.tenant_id, updated_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), intervention_plans_tenant_isolation (ALL), write_lock_delete_intervention_plans (DELETE), write_lock_insert_intervention_plans (INSERT), write_lock_update_intervention_plans (UPDATE)

### intervention_plans_audit_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, intervention_plan_id (uuid), action (text) NOT NULL, performed_by (uuid), performed_at (timestamp with time zone) NOT NULL, old_values (jsonb), new_values (jsonb)
- FKs: intervention_plan_id -> intervention_plans.id, performed_by -> auth.users.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), intervention_audit_insert (INSERT), intervention_audit_select (SELECT), write_lock_delete_intervention_plans_audit_log (DELETE), write_lock_insert_intervention_plans_audit_log (INSERT), write_lock_update_intervention_plans_audit_log (UPDATE)

### invitation_audit_log
- Columns: id (uuid) NOT NULL, invitation_id (uuid), tenant_id (uuid) NOT NULL, email (text) NOT NULL, action (text) NOT NULL, status (text), error_details (text), email_service (text), created_at (timestamp with time zone), created_by (uuid), metadata (jsonb)
- FKs: invitation_id -> user_invitations.id, created_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_invitation_audit_log (ALL), write_lock_delete_invitation_audit_log (DELETE), write_lock_insert_invitation_audit_log (INSERT), write_lock_update_invitation_audit_log (UPDATE)

### invites
- Columns: id (uuid) NOT NULL, email (text) NOT NULL, first_name (text), last_name (text), role (text) NOT NULL, invited_by (uuid), status (text), expires_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone), tenant_id (uuid), accepted_at (timestamp with time zone), created_by (uuid) NOT NULL, sent_at (timestamp with time zone)
- FKs: invited_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_invites (ALL), write_lock_delete_invites (DELETE), write_lock_insert_invites (INSERT), write_lock_update_invites (UPDATE)

### legislation_acts
- Columns: id (uuid) NOT NULL, act_code (text) NOT NULL, full_title (text) NOT NULL, short_title (text) NOT NULL, jurisdiction (text) NOT NULL, year (integer) NOT NULL, is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: legislation_acts_admin_write (ALL), legislation_acts_read (SELECT)

### legislation_clauses
- Columns: id (uuid) NOT NULL, instrument_id (uuid) NOT NULL, part_id (uuid), division_id (uuid), schedule_id (uuid), clause_type (text) NOT NULL, clause_number (text) NOT NULL, title (text), outcome_standard_text (text), performance_indicators_text (text), full_legal_text (text) NOT NULL, compliance_intent (text), applies_to (text), sort_order (integer) NOT NULL, is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: instrument_id -> legislation_instruments.id, schedule_id -> legislation_schedules.id, part_id -> legislation_parts.id, division_id -> legislation_divisions.id
- RLS: enabled, policies: legislation_clauses_admin_write (ALL), legislation_clauses_read (SELECT)

### legislation_divisions
- Columns: id (uuid) NOT NULL, part_id (uuid) NOT NULL, division_number (integer) NOT NULL, title (text) NOT NULL, sort_order (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: part_id -> legislation_parts.id
- RLS: enabled, policies: legislation_divisions_admin_write (ALL), legislation_divisions_read (SELECT)

### legislation_instruments
- Columns: id (uuid) NOT NULL, act_id (uuid) NOT NULL, instrument_code (text) NOT NULL, full_title (text) NOT NULL, short_title (text) NOT NULL, instrument_type (text) NOT NULL, enabling_section (text), federal_register_id (text), commencement_date (date), registration_date (date), is_active (boolean) NOT NULL, repeals_notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: act_id -> legislation_acts.id
- RLS: enabled, policies: legislation_instruments_admin_write (ALL), legislation_instruments_read (SELECT)

### legislation_knowledge_base
- Columns: id (uuid) NOT NULL, instrument_id (text) NOT NULL, clause_number (text) NOT NULL, clause_title (text) NOT NULL, quality_area (text), division (text), legal_text (text) NOT NULL, intent_plain_english (text), performance_indicators (ARRAY), what_law_requires (text), evidence_requirements (ARRAY), rto_decisions (ARRAY), common_risks (ARRAY), guidance_themes (ARRAY), guidance_source (text), cross_links (ARRAY), self_assurance_questions (ARRAY), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: legislation_public_read (SELECT)

### legislation_parts
- Columns: id (uuid) NOT NULL, instrument_id (uuid) NOT NULL, schedule_id (uuid), part_number (text) NOT NULL, title (text) NOT NULL, outcome_statement (text), quality_area_number (integer), sort_order (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: instrument_id -> legislation_instruments.id, schedule_id -> legislation_schedules.id
- RLS: enabled, policies: legislation_parts_admin_write (ALL), legislation_parts_read (SELECT)

### legislation_schedules
- Columns: id (uuid) NOT NULL, instrument_id (uuid) NOT NULL, schedule_number (integer) NOT NULL, title (text) NOT NULL, description (text), sort_order (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: instrument_id -> legislation_instruments.id
- RLS: enabled, policies: legislation_schedules_admin_write (ALL), legislation_schedules_read (SELECT)

### lk_ci_required
- Columns: id (integer) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: super_admin_only_lk_ci_required (ALL)

### lk_complainant_type
- Columns: id (integer) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: authenticated_read_lk_complainant_type (SELECT), read_authenticated (SELECT), super_admin_write_lk_complainant_type (ALL)

### lk_complaint_type
- Columns: id (integer) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: authenticated_read_lk_complaint_type (SELECT), super_admin_write_lk_complaint_type (ALL)

### lk_person_entity_against
- Columns: id (integer) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: authenticated_read_lk_person_entity_against (SELECT), read_authenticated (SELECT), super_admin_write_lk_person_entity_against (ALL)

### lk_referred_to
- Columns: id (integer) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: authenticated_read_lk_referred_to (SELECT), read_authenticated (SELECT), super_admin_write_lk_referred_to (ALL)

### lk_satisfaction_rating
- Columns: id (integer) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: authenticated_read_lk_satisfaction_rating (SELECT), read_authenticated (SELECT), super_admin_write_lk_satisfaction_rating (ALL)

### lk_staff
- Columns: id (uuid) NOT NULL, tenant_id (uuid), display_name (text) NOT NULL, email (text), position (text), is_active (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_lk_staff (ALL), write_lock_delete_lk_staff (DELETE), write_lock_insert_lk_staff (INSERT), write_lock_update_lk_staff (UPDATE)

### lk_status
- Columns: id (integer) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: authenticated_read_lk_status (SELECT), read_authenticated (SELECT), super_admin_write_lk_status (ALL)

### lk_supporting_documents
- Columns: id (integer) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: authenticated_read_lk_supporting_documents (SELECT), read_authenticated (SELECT), super_admin_write_lk_supporting_documents (ALL)

### lkl_module_mappings
- Columns: id (uuid) NOT NULL, clause_id (uuid) NOT NULL, module_name (text) NOT NULL, description (text) NOT NULL
- FKs: clause_id -> clauses.id
- RLS: enabled, policies: read_lkl_module_mappings (SELECT)

### llnd_assessments
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, reading_level (text), writing_level (text), oral_level (text), numeracy_level (text), digital_level (text), assessor_notes (text), recommended_support (text), risk_level (text), trainer_id (uuid), student_ref (text), student_name (text), consent_obtained (boolean) NOT NULL, consent_method (text), consent_date (date)
- FKs: trainer_id -> auth.users.id, tenant_id -> tenants.tenant_id, created_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), llnd_assessments_tenant_isolation (ALL), write_lock_delete_llnd_assessments (DELETE), write_lock_insert_llnd_assessments (INSERT), write_lock_update_llnd_assessments (UPDATE)

### mailgun_messages
- Columns: id (uuid) NOT NULL, tenant_id (uuid), message_id (text), sender (text) NOT NULL, recipient (text) NOT NULL, subject (text), body_text (text), body_html (text), headers (jsonb), attachments (jsonb), received_at (timestamp with time zone) NOT NULL, is_read (boolean), is_archived (boolean), is_support_message (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_mailgun_messages (DELETE), write_lock_insert_mailgun_messages (INSERT), write_lock_update_mailgun_messages (UPDATE)

### manual_audit_responses
- Columns: id (uuid) NOT NULL, manual_audit_id (uuid) NOT NULL, question_id (uuid) NOT NULL, value_text (text), value_bool (boolean), value_file_url (text), auto_flagged (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: question_id -> audit_template_questions.id, manual_audit_id -> manual_audits.id
- RLS: enabled, policies: manual_audit_responses_tenant_select (SELECT), manual_audit_responses_tenant_write (ALL)

### manual_audits
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, template_id (uuid) NOT NULL, audit_date (date) NOT NULL, created_by (uuid) NOT NULL, status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: template_id -> audit_templates.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_manual_audits (DELETE), write_lock_insert_manual_audits (INSERT), write_lock_update_manual_audits (UPDATE)

### manual_response_findings
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, manual_response_id (uuid) NOT NULL, finding_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: finding_id -> audit_findings.id, manual_response_id -> manual_audit_responses.id
- RLS: enabled, policies: billing_gate (ALL), manual_response_findings_insert (INSERT), manual_response_findings_select (SELECT), write_lock_delete_manual_response_findings (DELETE), write_lock_insert_manual_response_findings (INSERT), write_lock_update_manual_response_findings (UPDATE)

### marketing_register
- Columns: id (uuid) NOT NULL, campaign_name (text) NOT NULL, platform (text) NOT NULL, date_published (date), description (text) NOT NULL, compliance_tag (boolean) NOT NULL, approval_status (text) NOT NULL, reviewed_by (uuid), notes (text), file_upload (jsonb), tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, updated_by (uuid) NOT NULL, custom_id (text) NOT NULL, artifact_type (USER-DEFINED), clause_tags (ARRAY), risk_flag (boolean), quality_area (text), governance_logged (boolean), product_code (text), product_title (text), channel (text), url (text), version (text), nrt_logo_used (boolean), third_party_named (text), licensing_claim_verified (boolean), responsible_person (uuid), responsible_role (text), risk_level (text), due_date (date), status (text), title (text)
- FKs: reviewed_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), mktg_reg_delete (DELETE), mktg_reg_insert (INSERT), mktg_reg_select (SELECT), mktg_reg_update (UPDATE), write_lock_delete_marketing_register (DELETE), write_lock_insert_marketing_register (INSERT), write_lock_update_marketing_register (UPDATE)

### mcn_dd_change_category
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: Authenticated users can read mcn change categories (SELECT)

### mcn_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, notification_date (date), change_description (text) NOT NULL, change_type (text), reason_for_change (text), regulatory_body_notified (boolean), date_submitted (date), status (text), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), risk_assessment_date (date), responsible_person (uuid), responsible_role (text), description (text), due_date (date), title (text), change_date (date)
- FKs: created_by -> profiles.id, updated_by -> profiles.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), mcn_delete_governing_person_only (DELETE), mcn_insert_governance (INSERT), mcn_reg_delete (DELETE), mcn_reg_insert (INSERT), mcn_reg_select (SELECT), mcn_reg_update (UPDATE), mcn_select_governance (SELECT), mcn_update_governance (UPDATE), restrict_sa_select_mcn_register (SELECT), write_lock_delete_mcn_register (DELETE), write_lock_insert_mcn_register (INSERT), write_lock_update_mcn_register (UPDATE)

### meeting_ai_summaries
- Columns: id (uuid) NOT NULL, meeting_report_id (uuid) NOT NULL, section_type (text) NOT NULL, section_name (text) NOT NULL, ai_summary (text), original_prompt (text), confidence_score (integer), tokens_used (integer), generation_model (text), is_edited (boolean), edit_history (jsonb), include_in_export (boolean), tenant_id (uuid) NOT NULL, created_by (uuid), updated_by (uuid), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: meeting_report_id -> governance_meeting_reports.id, created_by -> auth.users.id, updated_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_meeting_ai_summaries (ALL), write_lock_delete_meeting_ai_summaries (DELETE), write_lock_insert_meeting_ai_summaries (INSERT), write_lock_update_meeting_ai_summaries (UPDATE)

### meeting_documents
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, document_type (text) NOT NULL, file_name (text) NOT NULL, file_path (text) NOT NULL, uploaded_by (uuid), uploaded_at (timestamp with time zone) NOT NULL, metadata (jsonb), ai_analysis_json (jsonb), ai_analyzed_at (timestamp with time zone), signed_url_cache (text), signed_url_expires_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_meeting_documents (DELETE), write_lock_insert_meeting_documents (INSERT), write_lock_update_meeting_documents (UPDATE)

### meeting_export_metadata
- Columns: id (uuid) NOT NULL, meeting_report_id (uuid) NOT NULL, export_format (text) NOT NULL, export_template (text), file_size (integer), download_url (text), expires_at (timestamp with time zone), export_status (text), error_message (text), sections_included (jsonb), metadata (jsonb), tenant_id (uuid) NOT NULL, created_by (uuid), created_at (timestamp with time zone)
- FKs: meeting_report_id -> governance_meeting_reports.id, created_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_meeting_export_metadata (ALL), write_lock_delete_meeting_export_metadata (DELETE), write_lock_insert_meeting_export_metadata (INSERT), write_lock_update_meeting_export_metadata (UPDATE)

### meeting_insights
- Columns: id (uuid) NOT NULL, meeting_report_id (uuid), insight_type (text) NOT NULL, category (text) NOT NULL, title (text) NOT NULL, description (text) NOT NULL, priority (text), source_register (text), source_data (jsonb), ai_confidence (integer), is_resolved (boolean), resolution_notes (text), auto_logged_to_governance (boolean), governance_action_id (uuid), tenant_id (uuid) NOT NULL, created_by (uuid), resolved_by (uuid), created_at (timestamp with time zone), resolved_at (timestamp with time zone)
- FKs: resolved_by -> auth.users.id, created_by -> auth.users.id, meeting_report_id -> governance_meeting_reports.id, governance_action_id -> gov_register.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_meeting_insights (ALL), write_lock_delete_meeting_insights (DELETE), write_lock_insert_meeting_insights (INSERT), write_lock_update_meeting_insights (UPDATE)

### meeting_minutes
- Columns: id (uuid) NOT NULL, meeting_date (date) NOT NULL, meeting_type (character varying) NOT NULL, attendees (ARRAY), ofi_items (jsonb), complaints_appeals (jsonb), whs_items (jsonb), risk_management (jsonb), industry_consultation (jsonb), third_parties (jsonb), trainers_reports (jsonb), training_product_changes (jsonb), legislation_changes (jsonb), asqa_updates (jsonb), additional_notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, tenant_id (uuid)
- FKs: created_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_meeting_minutes (ALL), write_lock_delete_meeting_minutes (DELETE), write_lock_insert_meeting_minutes (INSERT), write_lock_update_meeting_minutes (UPDATE)

### meeting_report_reviews
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, trainer_reports_reviewed (boolean) NOT NULL, trainer_reports_reviewed_by (uuid), trainer_reports_reviewed_at (timestamp with time zone), trainer_reports_review_notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, sso_reports_reviewed (boolean) NOT NULL, sso_reports_reviewed_by (uuid), sso_reports_reviewed_at (timestamp with time zone), sso_reports_review_notes (text)
- FKs: meeting_id -> governance_meetings.id
- RLS: enabled, policies: billing_gate (ALL), mrr_insert_cm_admin (INSERT), mrr_select_tenant (SELECT), mrr_update_cm_admin (UPDATE), write_lock_delete_meeting_report_reviews (DELETE), write_lock_insert_meeting_report_reviews (INSERT), write_lock_update_meeting_report_reviews (UPDATE)

### mktg_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, date (date) NOT NULL, form_completed_by (uuid), position (text) NOT NULL, marketing_activity (text) NOT NULL, audience (text), description (text), compliance_checked_by (uuid), findings (text), required_amendments (text), date_amendments_done (date), responsible_officer (uuid), status (text) NOT NULL, notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), responsible_person (uuid), responsible_role (text), due_date (date), title (text)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_mktg_register (ALL), write_lock_delete_mktg_register (DELETE), write_lock_insert_mktg_register (INSERT), write_lock_update_mktg_register (UPDATE)

### module_mappings
- Columns: id (uuid) NOT NULL, module_name (text) NOT NULL, clause_id (uuid) NOT NULL, is_primary (boolean), created_at (timestamp with time zone) NOT NULL
- FKs: clause_id -> clauses.id
- RLS: enabled, policies: Authenticated users can read module mappings (SELECT), Super admins can manage module mappings (ALL)

### monthly_compliance_digest
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, month_year (text) NOT NULL, file_url (text), generated_at (timestamp with time zone), emailed_to (ARRAY), created_at (timestamp with time zone)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Admin/CM can manage digests (ALL), Tenant members can read digests (SELECT), billing_gate (ALL), write_lock_delete_monthly_compliance_digest (DELETE), write_lock_insert_monthly_compliance_digest (INSERT), write_lock_update_monthly_compliance_digest (UPDATE)

### monthly_reporting_records
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, user_id (uuid) NOT NULL, role_type (text) NOT NULL, reporting_month (text) NOT NULL, status (text) NOT NULL, submitted_at (timestamp with time zone), form_payload (jsonb), register_entries_created (jsonb), task_id (uuid), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid) NOT NULL, last_reminder_sent_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), monthly_reporting_records_tenant_access (ALL), write_lock_delete_monthly_reporting_records (DELETE), write_lock_insert_monthly_reporting_records (INSERT), write_lock_update_monthly_reporting_records (UPDATE)

### monthly_trainer_reports
- Columns: id (uuid) NOT NULL, org_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, report_month (date) NOT NULL, submitted_at (timestamp with time zone), reviewer_id (uuid), status (USER-DEFINED), summary (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), tenant_id (uuid), due_date (date), complyhub_report_id (uuid), locked_at (timestamp with time zone)
- FKs: trainer_id -> trainers.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant access for monthly_trainer_reports (ALL), Trainers can update own unlocked reports (UPDATE), billing_gate (ALL), write_lock_delete_monthly_trainer_reports (DELETE), write_lock_insert_monthly_trainer_reports (INSERT), write_lock_update_monthly_trainer_reports (UPDATE)

### ncver_nominal_hours
- Columns: unit_code (text) NOT NULL, nominal_hours (numeric) NOT NULL, source_url (text), source_hash (text), source_published_at (timestamp with time zone), ingested_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Public read ncver_nominal_hours (SELECT), Service insert ncver_nominal_hours (INSERT), Service update ncver_nominal_hours (UPDATE)

### no_rto_trial
- Columns: id (uuid) NOT NULL, first_name (text) NOT NULL, last_name (text) NOT NULL, email (text) NOT NULL, phone (text), signed_up_date (timestamp with time zone) NOT NULL, status (text) NOT NULL, notes (text), followed_up_at (timestamp with time zone), followed_up_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, invitation_id (uuid)
- FKs: followed_up_by -> auth.users.id, invitation_id -> user_invitations.id
- RLS: enabled, policies: no_rto_trial_validated_insert (INSERT), super_admin_manage (ALL)

### notes
- Columns: id (bigint) NOT NULL, title (text) NOT NULL, user_id (uuid), created_at (timestamp with time zone), updated_at (timestamp with time zone), tenant_id (bigint), note_type (text), note_body (text)
- RLS: enabled, policies: notes_user_access (ALL), write_lock_delete_notes (DELETE), write_lock_insert_notes (INSERT), write_lock_update_notes (UPDATE)

### notification_role_rules
- Columns: id (uuid) NOT NULL, notification_type (text) NOT NULL, role (text) NOT NULL, enabled (boolean), delivery_methods (ARRAY), priority_override (text), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: read_authenticated (SELECT), write_super_admin (ALL)

### notification_templates
- Columns: id (uuid) NOT NULL, template_key (text) NOT NULL, role_filter (ARRAY), title_template (text) NOT NULL, message_template (text) NOT NULL, priority (text) NOT NULL, category (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: read_authenticated (SELECT), service_role_write (ALL)

### notifications
- Columns: id (uuid) NOT NULL, banner_key (text) NOT NULL, title (text), message (text) NOT NULL, cta_text (text), cta_link (text), is_active (boolean) NOT NULL, starts_at (timestamp with time zone), ends_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, user_id (uuid)
- FKs: created_by -> auth.users.id, user_id -> auth.users.id
- RLS: enabled, policies: Anyone can read active notifications (SELECT), Super admins can manage notifications (ALL)

### nps_surveys
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, respondent_type (text) NOT NULL, respondent_name (text), respondent_email (text), organisation (text), course_or_unit (text), score (integer) NOT NULL, reason_text (text), submitted_at (timestamp with time zone) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), nps_role_gate (ALL), tenant_access_nps_surveys_restricted (SELECT), write_lock_delete_nps_surveys (DELETE), write_lock_insert_nps_surveys (INSERT), write_lock_update_nps_surveys (UPDATE)

### ofi_dd_actions
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_actions (SELECT), super_admin_write_ofi_dd_actions (ALL)

### ofi_dd_assigned_to
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_assigned_to (SELECT), super_admin_write_ofi_dd_assigned_to (ALL)

### ofi_dd_cause_analysis
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_cause_analysis (SELECT), super_admin_write_ofi_dd_cause_analysis (ALL)

### ofi_dd_collection_mechanism
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_collection_mechanism (SELECT), read_authenticated (SELECT), super_admin_write_ofi_dd_collection_mechanism (ALL)

### ofi_dd_feedback_stakeholder
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_feedback_stakeholder (SELECT), super_admin_write_ofi_dd_feedback_stakeholder (ALL)

### ofi_dd_final_outcome
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_final_outcome (SELECT), read_authenticated (SELECT), super_admin_write_ofi_dd_final_outcome (ALL)

### ofi_dd_monitoring_evaluation
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_monitoring_evaluation (SELECT), super_admin_write_ofi_dd_monitoring_evaluation (ALL)

### ofi_dd_monitoring_type
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_monitoring_type (SELECT), read_authenticated (SELECT), super_admin_write_ofi_dd_monitoring_type (ALL)

### ofi_dd_opportunity_type
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_opportunity_type (SELECT), super_admin_write_ofi_dd_opportunity_type (ALL)

### ofi_dd_position
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_position (SELECT), read_authenticated (SELECT), super_admin_write_ofi_dd_position (ALL)

### ofi_dd_priority
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_priority (SELECT), read_authenticated (SELECT), super_admin_write_ofi_dd_priority (ALL)

### ofi_dd_source
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_source (SELECT), read_authenticated (SELECT), super_admin_write_ofi_dd_source (ALL)

### ofi_dd_timeline
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_ofi_dd_timeline (SELECT), super_admin_write_ofi_dd_timeline (ALL)

### ofi_register
- Columns: id (integer) NOT NULL, title (character varying) NOT NULL, description (text), category (character varying), priority (character varying), status (character varying), assigned_to (character varying), review_date (date), created_at (timestamp without time zone), updated_at (timestamp without time zone), custom_id (text), tenant_id (uuid), risk_level (text), demo_seed (boolean) NOT NULL, responsible_person (uuid), responsible_role (text), due_date (date), tabled_at_qc_meeting (boolean) NOT NULL, tabled_at_meeting_id (uuid), tabled_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), ofi_reg_delete (DELETE), ofi_reg_insert (INSERT), ofi_reg_select (SELECT), ofi_reg_update (UPDATE), restrict_sa_select_ofi_register (SELECT), sso_insert_ofi (INSERT), sso_select_ofi (SELECT), write_lock_delete_ofi_register (DELETE), write_lock_insert_ofi_register (INSERT), write_lock_update_ofi_register (UPDATE)

### onboarding_checklist
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, item_id (text) NOT NULL, title (text) NOT NULL, description (text), required (boolean), completed_at (timestamp with time zone), completed_by (uuid), created_at (timestamp with time zone), updated_at (timestamp with time zone), completed (boolean) NOT NULL, role (text), phase (text), route (text), time_estimate (text), sort_order (integer), rto_clause_ref (text), user_id (uuid), auto_complete_check (text), dismissed (boolean) NOT NULL
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: Users can access their tenant checklist (ALL), onboarding_read_own_tenant (SELECT), onboarding_write_own_tenant (ALL), write_lock_delete_onboarding_checklist (DELETE), write_lock_insert_onboarding_checklist (INSERT), write_lock_update_onboarding_checklist (UPDATE)

### onboarding_progress
- Columns: tenant_id (uuid) NOT NULL, steps (jsonb) NOT NULL, completed (boolean) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_onboarding_progress (DELETE), write_lock_insert_onboarding_progress (INSERT), write_lock_update_onboarding_progress (UPDATE)

### ops_unused_index_watchlist
- Columns: id (uuid) NOT NULL, schema_name (text) NOT NULL, index_name (text) NOT NULL, table_name (text) NOT NULL, size_bytes (bigint) NOT NULL, scan_count (bigint), risk_category (text) NOT NULL, is_unique (boolean), is_primary (boolean), backs_constraint (boolean), supports_foreign_key (boolean), is_security_critical (boolean), index_definition (text), first_seen_at (timestamp with time zone), last_seen_at (timestamp with time zone), last_scan_count (bigint), observation_days (integer), is_safe_to_drop (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: ops_unused_index_watchlist_super_admin (ALL)

### organisation_settings_tbl
- Columns: tenant_id (uuid) NOT NULL, legal_name (text) NOT NULL, trading_name (text), website (text), timezone (text) NOT NULL, abn (text), rto_code (text), cricos_code (text), phone (text), address (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), org_settings_read (SELECT), write_lock_delete_organisation_settings_tbl (DELETE), write_lock_insert_organisation_settings_tbl (INSERT), write_lock_update_organisation_settings_tbl (UPDATE)

### organisations_tbl
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: read_public (SELECT), write_super_admin (ALL)

### organization_settings_tbl
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, settings (jsonb), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid), lms_name (text), lms_url (text), sms_name (text), sms_url (text), show_lms (boolean), show_sms (boolean), governance_meeting_enabled (boolean), governance_meeting_frequency (text), governance_meeting_type (text), governance_meeting_day (integer), governance_meeting_sequence_day (text), governance_meeting_sequence_occurrence (text), governance_meeting_time (time without time zone), governance_meeting_duration (integer), trainer_report_reminder_days (integer)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_organization_settings_tbl (ALL), write_lock_delete_organization_settings_tbl (DELETE), write_lock_insert_organization_settings_tbl (INSERT), write_lock_update_organization_settings_tbl (UPDATE)

### orphan_recovery_invites
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, email (text) NOT NULL, sent_at (timestamp with time zone) NOT NULL, sent_by (uuid), status (text) NOT NULL, error (text), unsubscribe_token (text), unsubscribed_at (timestamp with time zone)
- FKs: sent_by -> auth.users.id, user_id -> auth.users.id
- RLS: enabled, policies: super_admin_all (ALL)

### orphan_recovery_suppressions
- Columns: id (uuid) NOT NULL, email (USER-DEFINED) NOT NULL, user_id (uuid), reason (text) NOT NULL, notes (text), added_by (uuid), added_at (timestamp with time zone) NOT NULL, source (text), invite_id (uuid), unsubscribed_at (timestamp with time zone)
- RLS: enabled, policies: Super admins read suppressions (SELECT), orphan_recovery_suppressions_super_admin_all (ALL)

### packages
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, description (text), features (jsonb), pricing_monthly (numeric), pricing_yearly (numeric), max_users (integer), is_active (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: authenticated_read_packages (SELECT), super_admin_write_packages (ALL)

### password_reset_tokens
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, email (text) NOT NULL, token (text) NOT NULL, expires_at (timestamp with time zone) NOT NULL, used (boolean) NOT NULL, used_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: password_reset_tokens_user_access (ALL), service_role_bypass (ALL)

### payment_migration_audit
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, action (text) NOT NULL, actor_id (uuid), details (jsonb), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), sa_full_access_payment_migration_audit (ALL), tenant_read_own_payment_migration_audit (SELECT), write_lock_delete_payment_migration_audit (DELETE), write_lock_insert_payment_migration_audit (INSERT), write_lock_update_payment_migration_audit (UPDATE)

### pd_annual_reviews
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, review_period_start (date) NOT NULL, review_period_end (date) NOT NULL, ta_methodology_hours (numeric), ta_methodology_activities (integer), ta_methodology_status (text), industry_pd_hours (numeric), industry_pd_activities (integer), industry_pd_status (text), units_covered (integer), units_total (integer), reviewer_notes (text), reviewed_by (uuid) NOT NULL, reviewed_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: par_tenant_insert (INSERT), par_tenant_select (SELECT)

### pd_recommendations
- Columns: id (uuid) NOT NULL, trainer_profile_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, recommendation_type (text) NOT NULL, title (text) NOT NULL, description (text), priority (text), due_date (date), unit_codes (ARRAY), standards_reference (text), ai_confidence_score (integer), status (text), completed_date (timestamp with time zone), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid)
- FKs: trainer_profile_id -> tp_trainers.id, updated_by -> auth.users.id, created_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), pd_recommendations_tenant_isolation (ALL), pdr_rec_trainer_own_select (SELECT), pdr_rec_trainer_own_update (UPDATE), write_lock_delete_pd_recommendations (DELETE), write_lock_insert_pd_recommendations (INSERT), write_lock_update_pd_recommendations (UPDATE)

### pdr_dd_category
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_pdr_dd_category (SELECT), read_authenticated (SELECT), super_admin_write_pdr_dd_category (ALL)

### pdr_dd_competence
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_pdr_dd_competence (SELECT), read_authenticated (SELECT), super_admin_write_pdr_dd_competence (ALL)

### pdr_dd_delivery_mode
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_pdr_dd_delivery_mode (SELECT), read_authenticated (SELECT), super_admin_write_pdr_dd_delivery_mode (ALL)

### pdr_dd_relevance
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_pdr_dd_relevance (SELECT), read_authenticated (SELECT), super_admin_write_pdr_dd_relevance (ALL)

### pdr_dd_ta_alignment
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_pdr_dd_ta_alignment (SELECT), read_authenticated (SELECT), super_admin_write_pdr_dd_ta_alignment (ALL)

### pdr_dd_validation
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_pdr_dd_validation (SELECT), read_authenticated (SELECT), super_admin_write_pdr_dd_validation (ALL)

### pdr_ddrole
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_pdr_ddrole (SELECT), super_admin_write_pdr_ddrole (ALL)

### pdr_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, pd_date (date) NOT NULL, staff_member (uuid), position (text), pd_activity (text) NOT NULL, provider (text), hours (numeric), relevance_to_role (text), evidence (text), next_review_date (date), status (text), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), responsible_person (uuid), responsible_role (text), description (text), due_date (date), source_module (text) NOT NULL, source_record_id (uuid), pd_category (text), profile_id (uuid), end_date (date), evidence_file_path (text), evidence_document_id (uuid), trainer_id (uuid), related_units (ARRAY), archived_at (timestamp with time zone), archived_by (uuid), archive_reason (text), hard_delete_after (timestamp with time zone)
- FKs: trainer_id -> tp_trainers.id
- RLS: enabled, policies: billing_gate (ALL), pdr_reg_delete (DELETE), pdr_reg_insert (INSERT), pdr_reg_select (SELECT), pdr_reg_update (UPDATE), restrict_sa_select_pdr_register (SELECT), write_lock_delete_pdr_register (DELETE), write_lock_insert_pdr_register (INSERT), write_lock_update_pdr_register (UPDATE)

### permission_audit_log
- Columns: id (uuid) NOT NULL, user_id (uuid), role (text) NOT NULL, feature_key (text) NOT NULL, action (text) NOT NULL, old_value (boolean), new_value (boolean), reason (text), created_at (timestamp with time zone)
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: permission_audit_log_super_admin (ALL)

### permission_categories
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, description (text), icon (text), sort_order (integer), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: authenticated_read_permission_categories (SELECT), super_admin_write_permission_categories (ALL)

### permissions
- Columns: id (uuid) NOT NULL, key (text) NOT NULL, description (text) NOT NULL, category (text), created_at (timestamp with time zone)
- RLS: enabled, policies: authenticated_read_permissions (SELECT), super_admin_write_permissions (ALL)

### pfp_dd_protection_type
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: authenticated_read_pfp_dd_protection_type (SELECT), read_authenticated (SELECT), super_admin_write_pfp_dd_protection_type (ALL)

### pfp_register
- Columns: id (uuid) NOT NULL, title (text), course (text), fee (numeric), date_received (date), protection_method (text), policy_trust_name (text), policy_trust_number (text), policy_trust_company (text), refund_conditions (text), expiry_date (date), review_date (date), tenant_id (uuid), status (text), notes (text), created_by (uuid), created_at (timestamp with time zone), updated_by (uuid), updated_at (timestamp with time zone), responsible_person (uuid), responsible_role (text), risk_level (text), description (text), due_date (date), custom_id (text), student_id (text)
- RLS: enabled, policies: billing_gate (ALL), pfp_reg_delete (DELETE), pfp_reg_insert (INSERT), pfp_reg_select (SELECT), pfp_reg_update (UPDATE), restrict_sa_select_pfp_register (SELECT), write_lock_delete_pfp_register (DELETE), write_lock_insert_pfp_register (INSERT), write_lock_update_pfp_register (UPDATE)

### placement_site_checks
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, placement_site_id (uuid) NOT NULL, fre_item_id (uuid) NOT NULL, unit_code (text) NOT NULL, requirement_snapshot (text) NOT NULL, student_response (text), student_note (text), student_evidence_url (text), student_attested_at (timestamp with time zone), supervisor_confirmed (boolean) NOT NULL, supervisor_signature_name (text), supervisor_signed_at (timestamp with time zone), supervisor_note (text), rto_outcome (text), rto_reviewed_by (uuid), rto_reviewed_at (timestamp with time zone), rto_note (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: placement_site_id -> placement_sites.id, tenant_id -> tenants.tenant_id, fre_item_id -> fre_register.id
- RLS: enabled, policies: placement_site_checks_delete (DELETE), placement_site_checks_insert (INSERT), placement_site_checks_select (SELECT), placement_site_checks_update (UPDATE)

### placement_site_tokens
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, placement_site_id (uuid) NOT NULL, access_token (text) NOT NULL, token_expires_at (timestamp with time zone) NOT NULL, used_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, created_by (uuid)
- FKs: tenant_id -> tenants.tenant_id, placement_site_id -> placement_sites.id
- RLS: enabled, policies: placement_site_tokens_delete (DELETE), placement_site_tokens_insert (INSERT), placement_site_tokens_select (SELECT), placement_site_tokens_update (UPDATE)

### placement_sites
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, custom_id (text), student_id (text), student_name (text) NOT NULL, student_email (text), site_name (text) NOT NULL, site_address (text), site_contact_name (text), supervisor_name (text), supervisor_email (text), supervisor_phone (text), units (jsonb) NOT NULL, status (text) NOT NULL, verified_by (uuid), verified_at (timestamp with time zone), verification_outcome (text), verification_notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: placement_sites_delete (DELETE), placement_sites_insert (INSERT), placement_sites_select (SELECT), placement_sites_update (UPDATE)

### placement_supervisor_feedback
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, placement_wellbeing_record_id (uuid), supervisor_id (text) NOT NULL, supervisor_name (text), supervisor_email (text), student_id (text) NOT NULL, student_name (text), placement_site (text), feedback_type (USER-DEFINED) NOT NULL, feedback_text (text) NOT NULL, rating (USER-DEFINED), recommended_actions (text), access_token (text), token_expires_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL
- FKs: created_by -> auth.users.id, placement_wellbeing_record_id -> placement_wellbeing_records.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), placement_supervisor_feedback_tenant_access (ALL), psf_role_gate (ALL), write_lock_delete_placement_supervisor_feedback (DELETE), write_lock_insert_placement_supervisor_feedback (INSERT), write_lock_update_placement_supervisor_feedback (UPDATE)

### placement_supervisor_feedback_audit
- Columns: id (uuid) NOT NULL, feedback_id (uuid), tenant_id (uuid) NOT NULL, action (text) NOT NULL, old_values (jsonb), new_values (jsonb), performed_by (text), performed_at (timestamp with time zone) NOT NULL
- FKs: feedback_id -> placement_supervisor_feedback.id
- RLS: enabled, policies: billing_gate (ALL), psfa_insert (INSERT), psfa_select (SELECT), write_lock_delete_placement_supervisor_feedback_audit (DELETE), write_lock_insert_placement_supervisor_feedback_audit (INSERT), write_lock_update_placement_supervisor_feedback_audit (UPDATE)

### placement_wellbeing_records
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, placement_site (text), check_in_date (date), issues_reported (text), actions (text), escalation_flag (boolean), supervisor_feedback (text), whs_incident_id (uuid), support_request_id (uuid), check_in_responses (jsonb), custom_id (text), student_name (text), student_id (text), status (text), risk_score (integer), risk_band (text), risk_override (boolean), risk_override_reason (text), next_check_in_date (date), follow_up_required (boolean), follow_up_completed (boolean)
- FKs: tenant_id -> tenants.tenant_id, created_by -> auth.users.id, whs_incident_id -> whs_incidents.id, support_request_id -> ssr_register.id
- RLS: enabled, policies: billing_gate (ALL), placement_wellbeing_records_tenant_isolation (ALL), write_lock_delete_placement_wellbeing_records (DELETE), write_lock_insert_placement_wellbeing_records (INSERT), write_lock_update_placement_wellbeing_records (UPDATE)

### platform_permissions
- Columns: id (uuid) NOT NULL, permission_key (text) NOT NULL, label (text) NOT NULL, description (text), category (text) NOT NULL, created_at (timestamp with time zone)
- RLS: enabled, policies: platform_permissions_read (SELECT)

### platform_role_permissions
- Columns: id (uuid) NOT NULL, global_role (text) NOT NULL, permission_key (text) NOT NULL, created_at (timestamp with time zone)
- FKs: permission_key -> platform_permissions.permission_key
- RLS: enabled, policies: platform_role_permissions_owner_manage (ALL), platform_role_permissions_read (SELECT)

### platform_user_permission_overrides
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, permission_key (text) NOT NULL, granted (boolean) NOT NULL, granted_by (uuid), created_at (timestamp with time zone)
- FKs: permission_key -> platform_permissions.permission_key, granted_by -> profiles.id, user_id -> profiles.id
- RLS: enabled, policies: platform_overrides_owner_manage (ALL), platform_overrides_read (SELECT)

### pli_dd_status
- Columns: id (bigint) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: anon_users_can_read_pli_dd_status (SELECT), authenticated_users_can_read_pli_dd_status (SELECT)

### pli_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, insurer_name (text) NOT NULL, policy_number (text) NOT NULL, coverage_amount_aud (text), start_date (date) NOT NULL, end_date (date), renewal_due_date (date), covered_activities (text), insurance_file (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), insured_entity (text), coverage_description (text), coverage_limit (numeric), coverage_currency (text), territorial_limit (text), policy_start (date), policy_end (date), evidence_files (jsonb), status (text), responsible_role (text), notes (text), renewal_reminder_date (date), broker_contact (text), exclusions (text), deductible_excess (text), requires_attention (boolean), responsible_person (uuid), description (text), due_date (date), policy_status (text)
- RLS: enabled, policies: billing_gate (ALL), pli_reg_delete (DELETE), pli_reg_insert (INSERT), pli_reg_select (SELECT), pli_reg_update (UPDATE), restrict_sa_select_pli_register (SELECT), write_lock_delete_pli_register (DELETE), write_lock_insert_pli_register (INSERT), write_lock_update_pli_register (UPDATE)

### preview_sessions
- Columns: id (uuid) NOT NULL, super_user_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, role (text) NOT NULL, specific_user_id (uuid), created_at (timestamp with time zone) NOT NULL, expires_at (timestamp with time zone) NOT NULL, active (boolean) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_preview_sessions (DELETE), write_lock_insert_preview_sessions (INSERT), write_lock_update_preview_sessions (UPDATE)

### profiles
- Columns: id (uuid) NOT NULL, email (text) NOT NULL, role (text), full_name (text), tenant_id (uuid), active_tenant_id (uuid), organisation_name (text), avatar_url (text), phone_number (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, must_change_password (boolean), mfa_enabled (boolean), first_name (text), is_locked (boolean), must_reset_password (boolean), last_force_reset_at (timestamp with time zone), email_verified (boolean), onboarding_state (jsonb), last_name (text), job_title (text), timezone (text), signature_url (text), role_subtype (text), preferences (jsonb), employee_number (text), password_set_method (text), user_status (text) NOT NULL, is_internal_staff (boolean) NOT NULL, archived_at (timestamp with time zone), archived_by (uuid), deleted_at (timestamp with time zone), deleted_by (uuid), global_role (text)
- FKs: id -> auth.users.id, active_tenant_id -> tenants.tenant_id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), service_role_bypass (ALL), super_admin_select_all_profiles (SELECT), tenant_all (ALL), write_lock_delete_profiles (DELETE), write_lock_insert_profiles (INSERT), write_lock_update_profiles (UPDATE)

### public_liability_insurance
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, human_id (text) NOT NULL, insurer_name (text) NOT NULL, policy_number (text) NOT NULL, policy_type (text) NOT NULL, coverage_amount (numeric) NOT NULL, coverage_description (text), policy_start_date (date) NOT NULL, policy_end_date (date) NOT NULL, policy_certificate_file (jsonb) NOT NULL, policy_schedule_file (jsonb), claims_history_file (jsonb), policy_status (text) NOT NULL, renewal_due_date (date) NOT NULL, premium_amount (numeric), compliance_status (text) NOT NULL, review_date (date), evidence_files (jsonb), supporting_documents (jsonb), compliance_notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_access_public_liability_insurance (ALL), write_lock_delete_public_liability_insurance (DELETE), write_lock_insert_public_liability_insurance (INSERT), write_lock_update_public_liability_insurance (UPDATE)

### q1_tas_builder
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, tenant_id (uuid) NOT NULL, training_product_id (uuid), qual_code (text) NOT NULL, qual_title (text) NOT NULL, tga_release (text), tga_release_date (date), delivery_modes (jsonb) NOT NULL, cricos (boolean) NOT NULL, cricos_course_code (text), s1_outline (jsonb), s2_target_clients (jsonb), s3_industry_consultation (jsonb), s4_trainer_matrix (jsonb), s5_physical_resources (jsonb), s6_delivery_methodology (jsonb), s7_assessment (jsonb), s8_validation_process (jsonb), s9_monitoring_improvement (jsonb), s10_endorsement (jsonb), status (USER-DEFINED) NOT NULL, version (integer) NOT NULL, approved_by (uuid), approved_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, updated_by (uuid) NOT NULL, builder_state (jsonb), specialisation (text), is_extracted (boolean) NOT NULL, executive_summary (jsonb), legacy_code (text), delivery_code (text), delivery_methods (ARRAY), delivery_other_text (text), cohort_code (text), cohort_profile (text), cohort_nationality (text), stream_code (text), display_code (text), active_learner_pack_id (uuid), previous_tas_id (uuid), delivery_mode_key (text) NOT NULL, is_current (boolean) NOT NULL, duplicate_reason (text), duplicate_override (boolean) NOT NULL, readiness_percent_cached (numeric), readiness_band_cached (text), readiness_last_calculated (timestamp with time zone), version_parent_id (uuid), is_variation (boolean) NOT NULL, variation_reason (text), variation_reason_other (text), licensing_status (text), licensing_last_scanned_at (timestamp with time zone), licensing_scanned_jurisdictions (ARRAY), licensing_result_count (integer), licensing_attested_no_requirements (boolean), licensing_attestation_note (text), tas_build_version (text) NOT NULL, tenant_scope_item_id (uuid), archive_reason (text), code_tga_details (jsonb), packaging_rules (jsonb), qualification_outline (jsonb), cohort_skillset (jsonb), resources (jsonb), delivery_methodology (jsonb) NOT NULL, product_type (text) NOT NULL, scope_basis (text) NOT NULL, scope_via_product_id (uuid), product_purpose (text), version_trigger (text), review_due_date (date), english_evidence_policy (jsonb), llnd_provider (text), acsf_levels (jsonb), regulatory_overlays (jsonb), work_placement_mandatory (boolean), work_placement_hours (integer), work_placement_block (text), conflict_flags (jsonb), gaps_page_enabled (boolean) NOT NULL, consultation_health_status (text), last_consultation_review_at (timestamp with time zone), consultation_decision_count (integer) NOT NULL, consultation_pending_actions (integer) NOT NULL
- FKs: version_parent_id -> q1_tas_builder.id, variation_reason -> tas_variation_reasons.code, tenant_scope_item_id -> tenant_scope_items.id, scope_via_product_id -> training_products.id, previous_tas_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), superadmin_read_q1_tas_builder (SELECT), tenant_isolate_delete_q1_tas_builder (DELETE), tenant_isolate_insert_q1_tas_builder (INSERT), tenant_isolate_select_q1_tas_builder (SELECT), tenant_isolate_update_q1_tas_builder (UPDATE), write_lock_delete_q1_tas_builder (DELETE), write_lock_insert_q1_tas_builder (INSERT), write_lock_update_q1_tas_builder (UPDATE)

### q1_tas_builder_fees
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, type (text) NOT NULL, amount (numeric), is_refundable (boolean) NOT NULL, payment_plan_included (boolean) NOT NULL, tuition_included (boolean) NOT NULL, description (jsonb) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tas_id -> q1_tas_builder.id
- RLS: enabled, policies: tas_fees_delete (DELETE), tas_fees_insert (INSERT), tas_fees_select (SELECT), tas_fees_update (UPDATE)

### q1_tas_builder_settings
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, rto_id (text), rto_name (text), ceo_name (text), type (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, facility (text), facility_name (text)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_q1_tas_builder_settings (DELETE), tenant_isolate_insert_q1_tas_builder_settings (INSERT), tenant_isolate_select_q1_tas_builder_settings (SELECT), tenant_isolate_update_q1_tas_builder_settings (UPDATE), write_lock_delete_q1_tas_builder_settings (DELETE), write_lock_insert_q1_tas_builder_settings (INSERT), write_lock_update_q1_tas_builder_settings (UPDATE)

### q1_tas_consultation
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, tas_id (uuid) NOT NULL, source (USER-DEFINED) NOT NULL, org_name (text) NOT NULL, contact_name (text), contact_role (text), consultation_date (date) NOT NULL, summary (text), attachments (jsonb), tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, updated_by (uuid) NOT NULL
- FKs: tas_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), tenant_isolate_delete_q1_tas_consultation (DELETE), tenant_isolate_insert_q1_tas_consultation (INSERT), tenant_isolate_select_q1_tas_consultation (SELECT), tenant_isolate_update_q1_tas_consultation (UPDATE), write_lock_delete_q1_tas_consultation (DELETE), write_lock_insert_q1_tas_consultation (INSERT), write_lock_update_q1_tas_consultation (UPDATE)

### q1_tas_units
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, tas_id (uuid) NOT NULL, unit_code (text) NOT NULL, unit_title (text) NOT NULL, core_or_elective (text) NOT NULL, unit_group (text), hours_online (integer), hours_self_paced (integer), hours_f2f (integer), hours_work_placement (integer), hours_assessment (integer), volume_of_learning (integer), tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, updated_by (uuid) NOT NULL, source_product_code (text), elective_source (text), sequence_order (integer), assessment_methods (ARRAY), prerequisite_units (ARRAY), trainers (jsonb), tas_build_id (uuid) NOT NULL, source_release (text)
- FKs: tas_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_q1_tas_units (DELETE), tenant_isolate_insert_q1_tas_units (INSERT), tenant_isolate_select_q1_tas_units (SELECT), tenant_isolate_update_q1_tas_units (UPDATE), write_lock_delete_q1_tas_units (DELETE), write_lock_insert_q1_tas_units (INSERT), write_lock_update_q1_tas_units (UPDATE)

### q1_tas_units_external
- Columns: id (uuid) NOT NULL, tas_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, units (jsonb) NOT NULL, created_by (uuid), updated_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tas_id -> q1_tas_builder.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Restrict to current tenant (ALL), delete_q1_tas_units_external (DELETE), insert_q1_tas_units_external (INSERT), select_q1_tas_units_external (SELECT), update_q1_tas_units_external (UPDATE)

### q1_tas_validation_schedule
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, tas_id (uuid) NOT NULL, risk_rating (USER-DEFINED) NOT NULL, due_by (date) NOT NULL, validator_role_req (text) NOT NULL, notes (text), tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, updated_by (uuid) NOT NULL, status (text), clause_ids (ARRAY), linked_finding_id (uuid), is_follow_up (boolean), owner_user_id (uuid), owner_role (text), last_escalation_at (timestamp with time zone), escalation_level (integer), override_reason (text), override_by (uuid), override_at (timestamp with time zone), unit_code (text), unit_title (text), risk_reasoning (text), validation_type (text) NOT NULL, proposed_date (date), actual_date (date), lead_validator_id (uuid), lead_validator_name (text), industry_rep_name (text), industry_rep_org (text), industry_rep_role (text), validation_event_id (uuid), ci_action_ids (ARRAY)
- FKs: validation_event_id -> assessment_validation_events.id, lead_validator_id -> tp_trainers.id, tas_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), tenant_isolate_delete_q1_tas_validation_schedule (DELETE), tenant_isolate_insert_q1_tas_validation_schedule (INSERT), tenant_isolate_select_q1_tas_validation_schedule (SELECT), tenant_isolate_update_q1_tas_validation_schedule (UPDATE), write_lock_delete_q1_tas_validation_schedule (DELETE), write_lock_insert_q1_tas_validation_schedule (INSERT), write_lock_update_q1_tas_validation_schedule (UPDATE)

### q1_tas_versions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, custom_id (text) NOT NULL, version_number (text) NOT NULL, major_version (integer) NOT NULL, minor_version (integer) NOT NULL, patch_version (integer) NOT NULL, generation_type (text) NOT NULL, sources_used (ARRAY), health_score (integer), validation_status (text), issues_count (integer), governance_register_id (uuid), compliance_status (text), status (text), output_files (jsonb), change_summary (text), breaking_changes (ARRAY), is_current_version (boolean), retention_period (text), retention_until (timestamp with time zone), notes (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_by (uuid), updated_at (timestamp with time zone) NOT NULL, elective_selection_snapshot (jsonb)
- FKs: tas_id -> q1_tas_builder.id, governance_register_id -> governance_register.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), tenant_isolate_delete_q1_tas_versions (DELETE), tenant_isolate_insert_q1_tas_versions (INSERT), tenant_isolate_select_q1_tas_versions (SELECT), tenant_isolate_update_q1_tas_versions (UPDATE), write_lock_delete_q1_tas_versions (DELETE), write_lock_insert_q1_tas_versions (INSERT), write_lock_update_q1_tas_versions (UPDATE)

### qa_page_inventory
- Columns: id (uuid) NOT NULL, portal_group (text) NOT NULL, portal_subgroup (text), page_name (text) NOT NULL, route_path (text) NOT NULL, sidebar_location (text), is_in_sidebar (boolean) NOT NULL, role_access (ARRAY) NOT NULL, page_type (text) NOT NULL, has_form (boolean) NOT NULL, has_modal (boolean) NOT NULL, has_file_upload (boolean) NOT NULL, is_hidden_route (boolean) NOT NULL, is_redirect (boolean) NOT NULL, is_placeholder (boolean) NOT NULL, is_duplicate_route (boolean) NOT NULL, priority_level (text) NOT NULL, testing_phase (integer) NOT NULL, assigned_team (text), assigned_tester (uuid), is_excluded (boolean) NOT NULL, exclusion_reason (text), requires_full_workflow_testing (boolean) NOT NULL, requires_permissions_testing (boolean) NOT NULL, requires_data_integrity_testing (boolean) NOT NULL, requires_edge_case_testing (boolean) NOT NULL, requires_upload_testing (boolean) NOT NULL, requires_retest_cycle (boolean) NOT NULL, display_order (integer) NOT NULL, source_tag (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: qa_inventory_sa_all (ALL), qa_inventory_tester_read (SELECT)

### qa_page_test_scenarios
- Columns: id (uuid) NOT NULL, qa_page_id (uuid) NOT NULL, scenario_name (text) NOT NULL, scenario_group (text), display_order (integer) NOT NULL, is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: qa_page_id -> qa_page_inventory.id
- RLS: enabled, policies: qa_scenarios_sa_all (ALL), qa_scenarios_tester_read (SELECT)

### qa_scenario_test_log
- Columns: id (uuid) NOT NULL, qa_page_id (uuid) NOT NULL, scenario_id (uuid) NOT NULL, tested_by (uuid) NOT NULL, tester_team (text), test_date (date) NOT NULL, status (text) NOT NULL, issues_found (boolean) NOT NULL, suggestions_submitted_count (integer) NOT NULL, notes (text), retest_required (boolean) NOT NULL, retest_status (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: qa_page_id -> qa_page_inventory.id, scenario_id -> qa_page_test_scenarios.id
- RLS: enabled, policies: qa_scenario_log_sa_all (ALL), qa_scenario_log_tester_insert (INSERT), qa_scenario_log_tester_read (SELECT), qa_scenario_log_tester_update_own (UPDATE)

### qa_tester_profiles
- Columns: user_id (uuid) NOT NULL, tester_team (text) NOT NULL, display_name (text), is_active (boolean) NOT NULL, can_manage_qa (boolean) NOT NULL, can_log_testing (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: qa_tester_profiles_manage (ALL), qa_tester_profiles_select_own (SELECT), qa_tester_profiles_service (ALL)

### qa_testing_log
- Columns: id (uuid) NOT NULL, qa_page_id (uuid) NOT NULL, tested_by (uuid) NOT NULL, tester_team (text), tester_role (text), test_date (date) NOT NULL, status (text) NOT NULL, issues_found (boolean) NOT NULL, suggestions_submitted_count (integer) NOT NULL, notes (text), retest_required (boolean) NOT NULL, retest_status (text), tested_as_role (text), tested_as_portal (text), browser (text), device (text), environment (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: qa_page_id -> qa_page_inventory.id
- RLS: enabled, policies: qa_log_sa_all (ALL), qa_log_tester_insert (INSERT), qa_log_tester_read (SELECT), qa_log_tester_update_own (UPDATE)

### qi_annual_register
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, custom_id (text) NOT NULL, survey_year (integer) NOT NULL, learner_surveys_sent (integer) NOT NULL, learner_surveys_completed (integer) NOT NULL, employer_surveys_sent (integer) NOT NULL, employer_surveys_completed (integer) NOT NULL, rapid_surveys_sent (integer) NOT NULL, rapid_surveys_completed (integer) NOT NULL, acer_learner_response_rate (numeric), acer_employer_response_rate (numeric), rapid_avg_overall_satisfaction (numeric), rapid_pct_would_recommend (numeric), rapid_pct_trainer_positive (numeric), rapid_pct_assessment_fair (numeric), rapid_pct_support_positive (numeric), themes_identified (text), improvement_actions (text), asqa_submitted_at (timestamp with time zone), asqa_submission_reference (text), asqa_submitted_by (uuid), status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), asqa_report_file_path (text), asqa_report_file_name (text)
- FKs: asqa_submitted_by -> auth.users.id, updated_by -> auth.users.id, created_by -> auth.users.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), qi_annual_register_delete (DELETE), qi_annual_register_insert (INSERT), qi_annual_register_select (SELECT), qi_annual_register_update (UPDATE), restrict_sa_select_qi_annual_register (SELECT), write_lock_delete_qi_annual_register (DELETE), write_lock_insert_qi_annual_register (INSERT), write_lock_update_qi_annual_register (UPDATE)

### qi_asqa_narrative
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, register_id (text) NOT NULL, completion_rates (text), student_outcomes (text), employer_satisfaction (text), student_satisfaction (text), training_practices (text), continuous_improvement (text), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id, updated_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_insert (INSERT), tenant_select (SELECT), tenant_update (UPDATE)

### qi_dd_action
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_qi_dd_action (SELECT), super_admin_write_qi_dd_action (ALL)

### qi_dd_action_status
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_qi_dd_action_status (SELECT), read_authenticated (SELECT), super_admin_write_qi_dd_action_status (ALL)

### qi_dd_assigned_person
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_qi_dd_assigned_person (SELECT), super_admin_write_qi_dd_assigned_person (ALL)

### qi_dd_collection_method
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text), sort_order (integer)
- RLS: enabled, policies: qi_dd_collection_method_select (SELECT)

### qi_dd_employer_questions
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text), sort_order (integer)
- RLS: enabled, policies: qi_dd_employer_questions_select (SELECT)

### qi_dd_followup
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_qi_dd_followup (SELECT), read_authenticated (SELECT), super_admin_write_qi_dd_followup (ALL)

### qi_dd_learner_questions
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text), sort_order (integer)
- RLS: enabled, policies: qi_dd_learner_questions_select (SELECT)

### qi_dd_response_scale
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text), sort_order (integer)
- RLS: enabled, policies: qi_dd_response_scale_select (SELECT)

### qi_dd_source
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_qi_dd_source (SELECT), read_authenticated (SELECT), super_admin_write_qi_dd_source (ALL)

### qi_dd_survey_type
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text), sort_order (integer)
- RLS: enabled, policies: qi_dd_survey_type_select (SELECT)

### qi_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, data_source (text) NOT NULL, reporting_period (text), response_rate (text), summary_of_findings (text), improvement_actions (text), action_owner (uuid), action_due_date (date), review_date (date), status (text), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), responsible_person (uuid), responsible_role (text), description (text), due_date (date), title (text), survey_year (integer), learner_sent (integer) NOT NULL, learner_completed (integer) NOT NULL, employer_sent (integer) NOT NULL, employer_completed (integer) NOT NULL, rapid_sent (integer) NOT NULL, rapid_completed (integer) NOT NULL, rapid_avg_satisfaction (numeric), themes_identified (text), asqa_submitted_at (timestamp with time zone), asqa_reference (text), asqa_submitted_by (uuid), survey_id (uuid), asqa_evidence_file_path (text), asqa_evidence_file_name (text), asqa_evidence_uploaded_at (timestamp with time zone), asqa_evidence_uploaded_by (uuid)
- FKs: survey_id -> surveys.id
- RLS: enabled, policies: billing_gate (ALL), qi_reg_delete (DELETE), qi_reg_insert (INSERT), qi_reg_select (SELECT), qi_reg_update (UPDATE), restrict_sa_select_qi_register (SELECT), write_lock_delete_qi_register (DELETE), write_lock_insert_qi_register (INSERT), write_lock_update_qi_register (UPDATE)

### qi_responses
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, custom_id (text) NOT NULL, survey_type (text) NOT NULL, survey_year (integer) NOT NULL, survey_slug (text), completed_at (timestamp with time zone), status (text) NOT NULL, responses (jsonb), rapid_overall_satisfaction (integer), rapid_trainer_quality (text), rapid_assessment_fairness (text), rapid_assessment_feedback (text), rapid_learner_support (text), rapid_resources_suitable (text), rapid_would_recommend (text), rapid_improvement_comments (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), register_id (uuid), link_id (uuid), submitter_name (text), submitter_email (text), sent_at (timestamp with time zone), reminder_sent_at (timestamp with time zone), exclusion_reason (text)
- FKs: link_id -> qi_survey_links.id, created_by -> auth.users.id, updated_by -> auth.users.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), public_submit_qi_responses (UPDATE), qi_responses_delete (DELETE), qi_responses_insert (INSERT), qi_responses_select (SELECT), qi_responses_update (UPDATE), restrict_sa_select_qi_responses (SELECT), write_lock_delete_qi_responses (DELETE), write_lock_insert_qi_responses (INSERT), write_lock_update_qi_responses (UPDATE)

### qi_survey_ai_emails
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, response_id (uuid), survey_type (text) NOT NULL, survey_url (text) NOT NULL, email_subject (text) NOT NULL, email_preview_text (text), email_body (text) NOT NULL, respondent_name_snapshot (text), rto_name_snapshot (text), survey_year (integer), model_version (text), prompt_version (text), copy_count (integer) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL, link_id (uuid)
- FKs: response_id -> qi_responses.id, tenant_id -> tenants.tenant_id, link_id -> qi_survey_links.id, created_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), qi_survey_ai_emails_insert (INSERT), qi_survey_ai_emails_select (SELECT), qi_survey_ai_emails_update (UPDATE), restrict_sa_select_qi_survey_ai_emails (SELECT), write_lock_insert_qi_survey_ai_emails (INSERT), write_lock_update_qi_survey_ai_emails (UPDATE)

### qi_survey_links
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, register_id (uuid) NOT NULL, survey_type (text) NOT NULL, survey_year (integer) NOT NULL, survey_slug (text) NOT NULL, expires_at (timestamp with time zone), is_active (boolean) NOT NULL, submission_count (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id, updated_by -> auth.users.id, created_by -> auth.users.id, register_id -> qi_annual_register.id
- RLS: enabled, policies: anon_read_active_qi_survey_links (SELECT), billing_gate (ALL), qi_survey_links_insert (INSERT), qi_survey_links_select (SELECT), qi_survey_links_update (UPDATE), restrict_sa_select_qi_survey_links (SELECT), write_lock_insert_qi_survey_links (INSERT), write_lock_update_qi_survey_links (UPDATE)

### qi_survey_questions
- Columns: id (uuid) NOT NULL, survey_type (text) NOT NULL, question_code (text) NOT NULL, question_text (text) NOT NULL, section (text) NOT NULL, question_order (integer) NOT NULL, response_type (text) NOT NULL, response_options (jsonb), is_required (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: qi_survey_questions_public_read (SELECT)

### qualification_context
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, qualification_code (text) NOT NULL, qualification_title (text), aqf_level (integer), volume_of_learning_min (integer), volume_of_learning_max (integer), training_product_intent (text), packaging_rules_json (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, qual_code (text), qual_title (text), training_package_code (text), training_package_title (text), metadata (jsonb), created_by (uuid), updated_by (uuid), retention_until (timestamp with time zone), source (text), context (jsonb)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_qualification_context (DELETE), write_lock_insert_qualification_context (INSERT), write_lock_update_qualification_context (UPDATE)

### rbac_capabilities
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, capability_key (text) NOT NULL, capability_name (text) NOT NULL, description (text), category (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), rbac_capabilities_modify (ALL), rbac_capabilities_select (SELECT), write_lock_delete_rbac_capabilities (DELETE), write_lock_insert_rbac_capabilities (INSERT), write_lock_update_rbac_capabilities (UPDATE)

### rbac_role_capabilities
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, role_id (uuid) NOT NULL, capability_key (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: role_id -> rbac_roles.id
- RLS: enabled, policies: billing_gate (ALL), rbac_role_capabilities_modify (ALL), rbac_role_capabilities_select (SELECT), write_lock_delete_rbac_role_capabilities (DELETE), write_lock_insert_rbac_role_capabilities (INSERT), write_lock_update_rbac_role_capabilities (UPDATE)

### rbac_roles
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, role_key (text) NOT NULL, role_name (text) NOT NULL, description (text), is_system (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_rbac_roles (DELETE), write_lock_insert_rbac_roles (INSERT), write_lock_update_rbac_roles (UPDATE)

### recurring_event_templates
- Columns: id (uuid) NOT NULL, template_name (text) NOT NULL, description (text), event_type (text) NOT NULL, default_frequency (text) NOT NULL, default_priority (text), notification_schedule (ARRAY), is_system_template (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: read_public (SELECT), write_super_admin (ALL)

### ref_legislation
- Columns: id (uuid) NOT NULL, code (text) NOT NULL, title (text) NOT NULL, framework (text) NOT NULL, category (text), description (text), is_active (boolean) NOT NULL, sort_order (integer), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: authenticated_read_ref_legislation (SELECT), super_admin_write_ref_legislation (ALL)

### register_empty_prompts
- Columns: id (uuid) NOT NULL, register_key (text) NOT NULL, register_name (text) NOT NULL, standard_ref (text), why_it_matters (text) NOT NULL, auditor_expects (text) NOT NULL, route (text) NOT NULL, cta_label (text) NOT NULL, time_estimate (text), icon (text), sort_order (integer)
- RLS: enabled, policies: register_prompts_read (SELECT)

### register_entries_unified
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, register (text) NOT NULL, human_id (text) NOT NULL, status (text) NOT NULL, title (text) NOT NULL, description (text), standard_refs (ARRAY), qa_refs (ARRAY), sla_due_at (timestamp with time zone), assignee_id (uuid), related_party_id (uuid), product_id (uuid), third_party_id (uuid), metadata (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), responsible_role (text)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_register_entries_unified (ALL), write_lock_delete_register_entries_unified (DELETE), write_lock_insert_register_entries_unified (INSERT), write_lock_update_register_entries_unified (UPDATE)

### register_evidence_documents
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, storage_bucket (text) NOT NULL, storage_path (text) NOT NULL, file_name (text) NOT NULL, mime_type (text), file_size_bytes (bigint), uploaded_by (uuid) NOT NULL, uploaded_at (timestamp with time zone) NOT NULL, category (text), status (text) NOT NULL, notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), file_hash_sha256 (text), module_key (text)
- RLS: enabled, policies: reg_ev_docs_delete (DELETE), reg_ev_docs_insert (INSERT), reg_ev_docs_select (SELECT), reg_ev_docs_update (UPDATE), write_lock_delete_reg_ev_docs (DELETE), write_lock_insert_reg_ev_docs (INSERT), write_lock_update_reg_ev_docs (UPDATE)

### register_evidence_links
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, evidence_document_id (uuid) NOT NULL, linked_table (text) NOT NULL, linked_record_id (uuid) NOT NULL, document_role (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), is_primary (boolean) NOT NULL
- FKs: evidence_document_id -> register_evidence_documents.id
- RLS: enabled, policies: reg_ev_links_delete (DELETE), reg_ev_links_insert (INSERT), reg_ev_links_select (SELECT), write_lock_delete_reg_ev_links (DELETE), write_lock_insert_reg_ev_links (INSERT)

### registers
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, type (text) NOT NULL, status (USER-DEFINED), title (text), description (text), standard_refs (ARRAY), qa_refs (ARRAY), sla_due_at (timestamp with time zone), assignee_id (uuid), related_party_id (uuid), product_id (uuid), third_party_id (uuid), metadata (jsonb), human_id (text), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid), responsible_role (text)
- RLS: enabled, policies: billing_gate (ALL), registers_delete (DELETE), registers_insert (INSERT), registers_select (SELECT), registers_update (UPDATE), write_lock_delete_registers (DELETE), write_lock_insert_registers (INSERT), write_lock_update_registers (UPDATE)

### regulatory_impacts
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, update_id (uuid), standard_reference (text), clause_reference (text), risk_rating (text), recommended_action (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: update_id -> regulatory_updates.id
- RLS: enabled, policies: billing_gate (ALL), ri_insert (INSERT), ri_select (SELECT), write_lock_delete_regulatory_impacts (DELETE), write_lock_insert_regulatory_impacts (INSERT), write_lock_update_regulatory_impacts (UPDATE)

### regulatory_source_scans
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, source_id (uuid) NOT NULL, scan_status (text) NOT NULL, started_at (timestamp with time zone) NOT NULL, completed_at (timestamp with time zone), http_status (integer), content_hash (text), content_length (integer), updates_created (integer), updates_skipped (integer), error_message (text), triggered_by (uuid), created_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: No deletes (DELETE), No direct inserts from client (INSERT), No direct updates from client (UPDATE), Tenant members can view their scans (SELECT), billing_gate (ALL), write_lock_delete_regulatory_source_scans (DELETE), write_lock_insert_regulatory_source_scans (INSERT), write_lock_update_regulatory_source_scans (UPDATE)

### regulatory_sources
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, name (text) NOT NULL, url (text) NOT NULL, frequency (text) NOT NULL, is_active (boolean) NOT NULL, last_checked_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, source_type (text), health_status (text), last_http_status (integer), next_run_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), rs_delete (DELETE), rs_insert (INSERT), rs_select (SELECT), rs_update (UPDATE), write_lock_delete_regulatory_sources (DELETE), write_lock_insert_regulatory_sources (INSERT), write_lock_update_regulatory_sources (UPDATE)

### regulatory_update_history
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, update_id (uuid), action (text) NOT NULL, performed_by (uuid), details (jsonb), created_at (timestamp with time zone) NOT NULL
- FKs: update_id -> regulatory_updates.id
- RLS: enabled, policies: billing_gate (ALL), ruh_insert (INSERT), ruh_no_delete (DELETE), ruh_no_update (UPDATE), ruh_select (SELECT), write_lock_delete_regulatory_update_history (DELETE), write_lock_insert_regulatory_update_history (INSERT), write_lock_update_regulatory_update_history (UPDATE)

### regulatory_updates
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, source_id (uuid), title (text), published_date (date), summary (text), raw_content (text), impact_level (text), change_type (text), processed (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, content_hash (text), analysis_version (text), analysis_model (text), analysis_tokens (integer), analysis_cost_estimate (numeric), analysis_failed (boolean) NOT NULL, analysis_locked (boolean) NOT NULL, requires_manual_review (boolean) NOT NULL, linked_update_id (uuid), analysis_status (text), analysis_started_at (timestamp with time zone), analysis_completed_at (timestamp with time zone)
- FKs: source_id -> regulatory_sources.id
- RLS: enabled, policies: billing_gate (ALL), ru_insert (INSERT), ru_select (SELECT), ru_update (UPDATE), write_lock_delete_regulatory_updates (DELETE), write_lock_insert_regulatory_updates (INSERT), write_lock_update_regulatory_updates (UPDATE)

### release_note_items
- Columns: id (uuid) NOT NULL, release_note_id (uuid) NOT NULL, sort_order (integer) NOT NULL, category (text) NOT NULL, title (text) NOT NULL, detail (text), source (text) NOT NULL, source_table (text), source_record_id (uuid), occurred_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: release_note_id -> release_notes.id
- RLS: enabled, policies: SuperAdmin full access on release_note_items (ALL), Tenant users read items of visible notes (SELECT), rni_read_published (SELECT)

### release_note_seen
- Columns: user_id (uuid) NOT NULL, release_note_id (uuid) NOT NULL, seen_at (timestamp with time zone) NOT NULL
- FKs: release_note_id -> release_notes.id, user_id -> auth.users.id
- RLS: enabled, policies: rns_read_own (SELECT), rns_write_own (INSERT)

### release_notes
- Columns: id (uuid) NOT NULL, tenant_id (uuid), version (text) NOT NULL, title (text) NOT NULL, status (text) NOT NULL, published_at (timestamp with time zone), summary_md (text) NOT NULL, created_by (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: SuperAdmin full access on release_notes (ALL), Tenant users read global + own tenant notes (SELECT), billing_gate (ALL), rn_read_published (SELECT), write_lock_delete_release_notes (DELETE), write_lock_insert_release_notes (INSERT), write_lock_update_release_notes (UPDATE)

### retention_schedule
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, register_type (text) NOT NULL, retention_period_years (integer) NOT NULL, disposal_method (text), is_active (boolean), created_at (timestamp with time zone), created_by (uuid) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_access_retention_schedule (ALL), write_lock_delete_retention_schedule (DELETE), write_lock_insert_retention_schedule (INSERT), write_lock_update_retention_schedule (UPDATE)

### risk_dd_impact
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL, description (text) NOT NULL
- RLS: enabled, policies: impact_select_authenticated (SELECT), impact_write_service_role (ALL)

### risk_dd_likelihood
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL, description (text) NOT NULL
- RLS: enabled, policies: likelihood_select_authenticated (SELECT), likelihood_write_service_role (ALL)

### risk_escalation_suggestions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, report_id (uuid), ofi_id (text) NOT NULL, ofi_title (text), ofi_description (text), suggested_risk_title (text) NOT NULL, suggested_risk_category (text), suggested_risk_level (text) NOT NULL, suggested_mitigation (text), confidence (numeric) NOT NULL, reasons (jsonb) NOT NULL, status (text) NOT NULL, accepted_risk_id (uuid), actioned_by (uuid), actioned_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, source_type (text) NOT NULL
- FKs: accepted_risk_id -> risk_register.id, meeting_id -> governance_meetings.id, report_id -> trainer_monthly_reports.id
- RLS: enabled, policies: billing_gate (ALL), res_select_cm_admin (SELECT), res_write_cm_admin (ALL), write_lock_delete_risk_escalation_suggestions (DELETE), write_lock_insert_risk_escalation_suggestions (INSERT), write_lock_update_risk_escalation_suggestions (UPDATE)

### risk_history
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, risk_score (integer) NOT NULL, snapshot_date (date) NOT NULL, open_findings_count (integer) NOT NULL, closed_findings_30d (integer) NOT NULL, overdue_tasks_count (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id, clause_id -> compliance_clauses.id
- RLS: enabled, policies: billing_gate (ALL), risk_history_insert (INSERT), risk_history_select (SELECT), write_lock_delete_risk_history (DELETE), write_lock_insert_risk_history (INSERT), write_lock_update_risk_history (UPDATE)

### risk_predictions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, predicted_risk (integer) NOT NULL, trend_direction (text), recommended_action (text), calculated_at (timestamp with time zone) NOT NULL
- FKs: clause_id -> compliance_clauses.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), risk_predictions_all (ALL), risk_predictions_select (SELECT), write_lock_delete_risk_predictions (DELETE), write_lock_insert_risk_predictions (INSERT), write_lock_update_risk_predictions (UPDATE)

### risk_register
- Columns: id (uuid) NOT NULL, risk_title (text) NOT NULL, risk_category (text), priority (text) NOT NULL, quality_area (text) NOT NULL, owner_id (uuid), due_date (date), status (text), likelihood (integer), impact (integer), governance_link (text), notes (text), created_at (timestamp with time zone), updated_at (timestamp with time zone), tenant_id (uuid), risk_level (text), custom_id (text) NOT NULL, demo_seed (boolean) NOT NULL, risk_score (bigint), assigned_to (uuid), date_identified (date), mitigation_actions (text), risk_description (text), responsible_person (uuid), responsible_role (text), description (text), title (text), linked_update_id (uuid), requires_governing_person_attention (boolean) NOT NULL
- FKs: linked_update_id -> regulatory_updates.id
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_risk_register (SELECT), risk_reg_delete (DELETE), risk_reg_insert (INSERT), risk_reg_select (SELECT), risk_reg_update (UPDATE), write_lock_delete_risk_register (DELETE), write_lock_insert_risk_register (INSERT), write_lock_update_risk_register (UPDATE)

### risk_sla_matrix
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, register_type (text) NOT NULL, risk_level (text) NOT NULL, base_sla_hours (integer) NOT NULL, escalation_multiplier (numeric), auto_escalate (boolean), notification_thresholds (ARRAY), is_active (boolean)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_risk_sla_matrix (ALL), write_lock_delete_risk_sla_matrix (DELETE), write_lock_insert_risk_sla_matrix (INSERT), write_lock_update_risk_sla_matrix (UPDATE)

### risk_snapshots
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, student_id (text) NOT NULL, student_name (text) NOT NULL, score (numeric) NOT NULL, band (text) NOT NULL, drivers (jsonb) NOT NULL, signal_detail (jsonb) NOT NULL, trend (text) NOT NULL, computed_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), rs_insert_system (INSERT), rs_select_sso (SELECT), write_lock_delete_risk_snapshots (DELETE), write_lock_insert_risk_snapshots (INSERT), write_lock_update_risk_snapshots (UPDATE)

### role_capabilities
- Columns: role (USER-DEFINED) NOT NULL, capability (text) NOT NULL
- FKs: capability -> capabilities.capability
- RLS: enabled, policies: role_capabilities_select (SELECT)

### role_definitions
- Columns: id (smallint) NOT NULL, role_key (text) NOT NULL, display_name (text) NOT NULL, description (text), sort_order (smallint) NOT NULL, is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: rd_authenticated_read (SELECT), rd_super_admin_write (ALL)

### role_page_overrides
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, route_prefix (text) NOT NULL, can_view (boolean) NOT NULL, can_edit (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_role_page_overrides (ALL), write_lock_delete_role_page_overrides (DELETE), write_lock_insert_role_page_overrides (INSERT), write_lock_update_role_page_overrides (UPDATE)

### role_permissions
- Columns: id (uuid) NOT NULL, role (text) NOT NULL, feature_id (uuid), has_access (boolean), granted_by (uuid), granted_at (timestamp with time zone), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: feature_id -> system_features.id, granted_by -> auth.users.id
- RLS: enabled, policies: authenticated_read_role_permissions (SELECT), super_admin_write_role_permissions (ALL)

### roles
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, description (text), tenant_id (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_roles (ALL), write_lock_delete_roles (DELETE), write_lock_insert_roles (INSERT), write_lock_update_roles (UPDATE)

### route_permissions
- Columns: id (uuid) NOT NULL, route (text) NOT NULL, permission_key (text) NOT NULL, is_active (boolean) NOT NULL, created_at (timestamp with time zone)
- FKs: permission_key -> permissions.key
- RLS: enabled, policies: authenticated_read_route_permissions (SELECT), super_admin_write_route_permissions (ALL)

### rpl_dd_approvedby
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_rpl_dd_approvedby (SELECT), read_authenticated (SELECT), super_admin_write_rpl_dd_approvedby (ALL)

### rpl_dd_decission
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_rpl_dd_decission (SELECT), super_admin_write_rpl_dd_decission (ALL)

### rpl_dd_denial_reason
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_rpl_dd_denial_reason (SELECT), read_authenticated (SELECT), super_admin_write_rpl_dd_denial_reason (ALL)

### rpl_dd_gaps_address
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_rpl_dd_gaps_address (SELECT), read_authenticated (SELECT), super_admin_write_rpl_dd_gaps_address (ALL)

### rpl_dd_gaps_identified
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_rpl_dd_gaps_identified (SELECT), read_authenticated (SELECT), super_admin_write_rpl_dd_gaps_identified (ALL)

### rpl_dd_outcome
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_rpl_dd_outcome (SELECT), read_authenticated (SELECT), super_admin_write_rpl_dd_outcome (ALL)

### rpl_dd_type
- Columns: id (integer) NOT NULL, label (text) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_rpl_dd_type (SELECT), read_authenticated (SELECT), super_admin_write_rpl_dd_type (ALL)

### rpl_dd_validation_method
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_rpl_dd_validation_method (SELECT), read_authenticated (SELECT), super_admin_write_rpl_dd_validation_method (ALL)

### rpl_dd_workplace_verification
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_rpl_dd_workplace_verification (SELECT), super_admin_write_rpl_dd_workplace_verification (ALL)

### rpl_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, application_date (date) NOT NULL, student_name (text) NOT NULL, course_code (text) NOT NULL, units_applied_for (text), evidence_provided (text), assessment_outcome (text), assessor (uuid), assessment_date (date), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), responsible_person (uuid), responsible_role (text), description (text), due_date (date), status (text), title (text)
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_rpl_register (SELECT), rpl_reg_delete (DELETE), rpl_reg_insert (INSERT), rpl_reg_select (SELECT), rpl_reg_update (UPDATE), write_lock_delete_rpl_register (DELETE), write_lock_insert_rpl_register (INSERT), write_lock_update_rpl_register (UPDATE)

### rto_profiles
- Columns: id (uuid) NOT NULL, rto_name (text) NOT NULL, abn (text), contact_email (text), contact_phone (text), created_at (timestamp without time zone), tenant_id (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_rto_profiles (ALL), write_lock_delete_rto_profiles (DELETE), write_lock_insert_rto_profiles (INSERT), write_lock_update_rto_profiles (UPDATE)

### rtos
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, rto_code (text) NOT NULL, legal_name (text) NOT NULL, trading_name (text), website_url (text), locations (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant admins can manage RTOs (ALL), Tenant members can view their RTOs (SELECT), billing_gate (ALL), write_lock_delete_rtos (DELETE), write_lock_insert_rtos (INSERT), write_lock_update_rtos (UPDATE)

### sales_follow_ups
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, status (text) NOT NULL, owner_id (uuid), priority (text), next_follow_up_date (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid)
- FKs: created_by -> auth.users.id, owner_id -> auth.users.id
- RLS: enabled, policies: Super admins can manage sales follow-ups (ALL), billing_gate (ALL), write_lock_delete_sales_follow_ups (DELETE), write_lock_insert_sales_follow_ups (INSERT), write_lock_update_sales_follow_ups (UPDATE)

### sales_notes
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, note (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), contact_type (text)
- FKs: created_by -> auth.users.id
- RLS: enabled, policies: Super admins can manage sales notes (ALL), billing_gate (ALL), write_lock_delete_sales_notes (DELETE), write_lock_insert_sales_notes (INSERT), write_lock_update_sales_notes (UPDATE)

### schema_changes_log
- Columns: id (uuid) NOT NULL, phase (text) NOT NULL, operation (text) NOT NULL, table_name (text), column_name (text), created_at (timestamp with time zone)
- RLS: enabled, policies: schema_changes_log_super_admin (ALL)

### search_path_audit
- Columns: id (bigint) NOT NULL, at (timestamp with time zone) NOT NULL, who (text), ip (text), note (text)
- RLS: enabled, policies: search_path_audit_super_admin (ALL)

### security_audit
- Columns: id (uuid) NOT NULL, user_id (uuid), event_type (text) NOT NULL, event_data (jsonb), ip_address (inet), user_agent (text), created_at (timestamp with time zone), source_table (text), operation (text), severity (text)
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: Super admins only security audit (ALL), security_audit_authenticated_insert (INSERT)

### security_event_log
- Columns: id (uuid) NOT NULL, user_id (uuid), event_type (text) NOT NULL, event_data (jsonb), ip_address (inet), user_agent (text), severity (text), table_name (text), action_performed (text), risk_score (integer), created_at (timestamp with time zone)
- RLS: enabled, policies: Super admins can view all security events (SELECT), Users can insert their own security events (INSERT)

### security_events
- Columns: id (uuid) NOT NULL, user_id (uuid), event_type (text) NOT NULL, event_details (jsonb), ip_address (text), user_agent (text), severity (text), created_at (timestamp with time zone)
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: security_events_super_admin (ALL)

### security_headers_config
- Columns: id (boolean) NOT NULL, csp_policy (text), enable_hsts (boolean), enable_frame_options (boolean), enable_content_type_options (boolean), enable_referrer_policy (boolean), custom_headers (jsonb), updated_at (timestamp with time zone), updated_by (uuid)
- RLS: enabled, policies: read_public (SELECT), write_super_admin (ALL)

### security_logs
- Columns: id (uuid) NOT NULL, user_id (uuid), metadata (jsonb), source (text), created_at (timestamp with time zone)
- RLS: enabled, policies: security_logs_super_admin (ALL)

### self_assurance_results
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, run_id (uuid) NOT NULL, clause_id (uuid), clause_reference (text) NOT NULL, rating (text) NOT NULL, risk_score (integer) NOT NULL, ai_summary (text), ai_recommendation (text), created_at (timestamp with time zone) NOT NULL
- FKs: run_id -> self_assurance_runs.id
- RLS: enabled, policies: Admins can insert self-assurance results (INSERT), Tenant members can view self-assurance results (SELECT), billing_gate (ALL), write_lock_delete_self_assurance_results (DELETE), write_lock_insert_self_assurance_results (INSERT), write_lock_update_self_assurance_results (UPDATE)

### self_assurance_runs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, run_date (timestamp with time zone) NOT NULL, triggered_by (uuid) NOT NULL, ai_status (text) NOT NULL, overall_score (integer), risk_level (text), pdf_url (text), overall_observation (text), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_self_assurance_runs (DELETE), write_lock_insert_self_assurance_runs (INSERT), write_lock_update_self_assurance_runs (UPDATE)

### self_assurance_schedule
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, register_type (text) NOT NULL, quality_area (text) NOT NULL, schedule_frequency (text) NOT NULL, next_due_date (date) NOT NULL, assigned_to (uuid), is_active (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_self_assurance_schedule (ALL), write_lock_delete_self_assurance_schedule (DELETE), write_lock_insert_self_assurance_schedule (INSERT), write_lock_update_self_assurance_schedule (UPDATE)

### self_assurance_scores
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, clause_id (uuid), score (integer) NOT NULL, risk_score (integer), ci_load (integer), last_updated (timestamp with time zone) NOT NULL
- FKs: clause_id -> compliance_clauses.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_self_assurance_scores (DELETE), write_lock_insert_self_assurance_scores (INSERT), write_lock_update_self_assurance_scores (UPDATE)

### smart_form_submissions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, form_id (uuid) NOT NULL, submitted_by (uuid) NOT NULL, payload (jsonb) NOT NULL, evidence_files (jsonb), governance_id (text), created_at (timestamp with time zone), updated_at (timestamp with time zone), status (text)
- FKs: form_id -> smart_forms.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_smart_form_submissions (ALL), write_lock_delete_smart_form_submissions (DELETE), write_lock_insert_smart_form_submissions (INSERT), write_lock_update_smart_form_submissions (UPDATE)

### smart_forms
- Columns: id (uuid) NOT NULL, short_slug (text) NOT NULL, title (text) NOT NULL, summary (text), category (text) NOT NULL, audiences (ARRAY) NOT NULL, standards (jsonb) NOT NULL, governance_register (text), evidence_tags (ARRAY), sla_days (integer), requires_approval (boolean), status (text), aliases (ARRAY), retention (text), risk_hints (ARRAY), exports (ARRAY), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: read_public (SELECT), write_super_admin (ALL)

### smart_governance_records
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, governance_id (text) NOT NULL, source_submission (uuid) NOT NULL, standard_refs (jsonb) NOT NULL, status (text), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: source_submission -> smart_form_submissions.id
- RLS: enabled, policies: billing_gate (ALL), smart_gov_delete_governing_person_only (DELETE), smart_gov_insert_governance (INSERT), smart_gov_select_governance (SELECT), smart_gov_update_governance (UPDATE), tenant_access_smart_governance_records (ALL), write_lock_delete_smart_governance_records (DELETE), write_lock_insert_smart_governance_records (INSERT), write_lock_update_smart_governance_records (UPDATE)

### sso_alert_thresholds
- Columns: tenant_id (uuid) NOT NULL, complaint_spike_delta (integer) NOT NULL, at_risk_spike_pct (numeric) NOT NULL, support_drop_pct (numeric) NOT NULL, ci_delta_threshold (integer) NOT NULL, critical_incident_delta (integer) NOT NULL, response_sla_days (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: SSO: delete own tenant thresholds (DELETE), SSO: insert own tenant thresholds (INSERT), SSO: select own tenant thresholds (SELECT), SSO: update own tenant thresholds (UPDATE), billing_gate (ALL), write_lock_delete_sso_alert_thresholds (DELETE), write_lock_insert_sso_alert_thresholds (INSERT), write_lock_update_sso_alert_thresholds (UPDATE)

### sso_monthly_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, period_month (date) NOT NULL, status (text) NOT NULL, generated_at (timestamp with time zone) NOT NULL, generated_by (uuid) NOT NULL, submitted_at (timestamp with time zone), submitted_by (uuid), snapshot (jsonb) NOT NULL, commentary (jsonb) NOT NULL, pdf_url (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, period_year (smallint), previous_period (jsonb), delta_summary (jsonb), delta_highlights (jsonb), computed_at (timestamp with time zone)
- RLS: enabled, policies: SSO: insert own tenant packs (INSERT), SSO: select own tenant packs (SELECT), SSO: update draft packs only (UPDATE), billing_gate (ALL), write_lock_delete_sso_monthly_packs (DELETE), write_lock_insert_sso_monthly_packs (INSERT), write_lock_update_sso_monthly_packs (UPDATE)

### sso_report_reminders
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, sso_user_id (uuid) NOT NULL, reminder_type (text) NOT NULL, scheduled_for (date) NOT NULL, delivered_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL
- FKs: meeting_id -> governance_meetings.id
- RLS: enabled, policies: billing_gate (ALL)

### sso_reports_register
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, seq_no (integer) NOT NULL, sso_id (text) NOT NULL, report_type (text) NOT NULL, period_label (text) NOT NULL, period_start (date) NOT NULL, period_end (date) NOT NULL, status (text) NOT NULL, source_table (text) NOT NULL, source_id (uuid) NOT NULL, evidence_url (text), linked_counts (jsonb) NOT NULL, governance_meeting_id (uuid), submitted_by (uuid) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: tenant isolation (ALL)

### ssr_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, register_no (text), tenant_id (uuid), student_name (text) NOT NULL, date_of_support (date) NOT NULL, support_type (text) NOT NULL, description (text), notes (text), outcome (text), assigned_to (uuid), review_date (date), status (text) NOT NULL, created_by (uuid), updated_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, record_type (USER-DEFINED), clause_tags (ARRAY), risk_flag (boolean), quality_area (text), governance_logged (boolean), responsible_person (uuid), responsible_role (text), risk_level (text), due_date (date), title (text), student_id (text), action_taken (text), source (text), suitability_result_id (uuid), llnd_assessment_id (uuid)
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_ssr_register (SELECT), sso_insert_ssr (INSERT), sso_select_ssr (SELECT), sso_update_ssr (UPDATE), ssr_reg_delete (DELETE), ssr_reg_insert (INSERT), ssr_reg_select (SELECT), ssr_reg_update (UPDATE), trainer_ssr_select_assigned (SELECT), write_lock_delete_ssr_register (DELETE), write_lock_insert_ssr_register (INSERT), write_lock_update_ssr_register (UPDATE)

### str_register
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, position (text) NOT NULL, date_of_exit (date) NOT NULL, reason_for_leaving (text) NOT NULL, exit_interview_completed (boolean) NOT NULL, exit_interview_date (date), replacement_required (boolean) NOT NULL, notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), custom_id (text), employee_name (text), employee_id (text), department (text), manager_id (uuid), status (text), due_date (date), responsible_person (uuid), responsible_role (text), description (text), title (text)
- FKs: manager_id -> profiles.id
- RLS: enabled, policies: billing_gate (ALL), str_register_tenant_access (ALL), write_lock_delete_str_register (DELETE), write_lock_insert_str_register (INSERT), write_lock_update_str_register (UPDATE)

### student_feedback
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, form_submission_id (uuid), course_unit (text), trainer (text), training_start_date (date), respondent_category (text), full_name (text), consent_followup (boolean), email (text), phone (text), q_objectives (integer), q_materials (integer), q_trainer (integer), q_resources (integer), q_assessment (integer), q_confidence (integer), most_valuable (text), ofi_text (text), additional_comments (text), discuss_further (boolean), discuss_details (text), contact_method (text), wants_complaint (boolean), governance_record_id (uuid), ofi_id (uuid), created_at (timestamp with time zone), created_by (uuid)
- FKs: form_submission_id -> survey_response_sessions.id
- RLS: enabled, policies: billing_gate (ALL), sf_role_gate (ALL), tenant_access_student_feedback (ALL), trainer_feedback_select_own (SELECT), write_lock_delete_student_feedback (DELETE), write_lock_insert_student_feedback (INSERT), write_lock_update_student_feedback (UPDATE)

### student_support_audit_log
- Columns: id (uuid) NOT NULL, support_id (uuid), action (text) NOT NULL, details (jsonb), performed_by (uuid), performed_at (timestamp with time zone) NOT NULL, tenant_id (uuid) NOT NULL
- FKs: support_id -> ssr_register.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_student_support_audit_log (ALL), write_lock_delete_student_support_audit_log (DELETE), write_lock_insert_student_support_audit_log (INSERT), write_lock_update_student_support_audit_log (UPDATE)

### subscribers
- Columns: id (uuid) NOT NULL, user_id (uuid), email (text) NOT NULL, stripe_customer_id (text), subscribed (boolean) NOT NULL, subscription_tier (text), subscription_end (timestamp with time zone), trial_end (timestamp with time zone), updated_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: read_public (SELECT), write_super_admin (ALL)

### subscription_limits
- Columns: tier (text) NOT NULL, max_users (integer) NOT NULL, max_documents (integer) NOT NULL, storage_bytes_limit (bigint) NOT NULL, display_name (text) NOT NULL, is_legacy (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: subscription_limits_read (SELECT)

### subscription_plans
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, tier (text) NOT NULL, price_monthly (numeric) NOT NULL, price_yearly (numeric), stripe_price_id_monthly (text), stripe_price_id_yearly (text), features (jsonb) NOT NULL, max_users (integer), max_organizations (integer), is_active (boolean), created_at (timestamp with time zone)
- RLS: enabled, policies: authenticated_read_subscription_plans (SELECT), super_admin_write_subscription_plans (ALL)

### subscription_tier_definitions
- Columns: tier (text) NOT NULL, display_name (text) NOT NULL, is_legacy (boolean), is_purchasable (boolean), annual_price_ex_gst (integer), monthly_price_ex_gst (integer), user_limit (integer) NOT NULL, document_limit (integer) NOT NULL, storage_gb (integer) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: Tier definitions are publicly readable (SELECT)

### subscriptions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, source (text) NOT NULL, plan_code (text) NOT NULL, status (text) NOT NULL, mrr (numeric) NOT NULL, next_billing_date (date), external_reference (text), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_subscriptions (DELETE), write_lock_insert_subscriptions (INSERT), write_lock_update_subscriptions (UPDATE)

### suggestion_activity_log
- Columns: id (uuid) NOT NULL, suggestion_id (uuid) NOT NULL, activity_type (text) NOT NULL, old_value (text), new_value (text), actor_id (uuid), actor_name (text), notes (text), created_at (timestamp with time zone) NOT NULL
- FKs: suggestion_id -> suggestions.id
- RLS: enabled, policies: sal_select (SELECT)

### suggestion_attachments
- Columns: id (uuid) NOT NULL, suggestion_id (uuid) NOT NULL, file_name (text) NOT NULL, storage_path (text) NOT NULL, content_type (text), file_size_bytes (integer), uploaded_by (uuid), created_at (timestamp with time zone) NOT NULL
- FKs: suggestion_id -> suggestions.id
- RLS: enabled, policies: sa_insert (INSERT), sa_select (SELECT)

### suggestion_comments
- Columns: id (uuid) NOT NULL, suggestion_id (uuid) NOT NULL, author_id (uuid) NOT NULL, body (text), created_at (timestamp with time zone), tenant_id (uuid), author_profile_id (uuid), author_role (text) NOT NULL, is_internal (boolean) NOT NULL, comment (text), author_name (text)
- FKs: suggestion_id -> suggestions.id
- RLS: enabled, policies: billing_gate (ALL), sc_insert_v2 (INSERT), sc_select_v2 (SELECT), write_lock_delete_suggestion_comments (DELETE), write_lock_insert_suggestion_comments (INSERT), write_lock_update_suggestion_comments (UPDATE)

### suggestion_views
- Columns: tenant_id (uuid) NOT NULL, suggestion_id (uuid) NOT NULL, profile_id (uuid) NOT NULL, last_viewed_at (timestamp with time zone) NOT NULL
- FKs: suggestion_id -> suggestions.id
- RLS: enabled, policies: billing_gate (ALL), sv_own_select (SELECT), sv_own_update (UPDATE), sv_own_upsert (INSERT), write_lock_delete_suggestion_views (DELETE), write_lock_insert_suggestion_views (INSERT), write_lock_update_suggestion_views (UPDATE)

### suggestions
- Columns: id (uuid) NOT NULL, tenant_id (uuid), user_id (uuid) NOT NULL, title (text) NOT NULL, type (text) NOT NULL, urgency (text) NOT NULL, description (text), status (text) NOT NULL, internal_notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, triaged_at (timestamp with time zone), triaged_by (uuid), url_link (text), admin_upload (ARRAY), is_read (boolean) NOT NULL, app_build_version (text), ui_route (text), client_error_fingerprint (text), submission_type (text) NOT NULL, error_fingerprint (text), browser_info (text), occurred_at (timestamp with time zone), what_were_you_doing (text), what_happened (text), error_message_seen (text), problem_solving (text), who_would_use (text), is_blocking (boolean), usage_frequency (text), affected_users (text), public_status (text) NOT NULL, public_outcome (text), public_last_updated_at (timestamp with time zone) NOT NULL, last_public_update_at (timestamp with time zone) NOT NULL, issue_key (text), suggestion_type (text) NOT NULL, category (text), severity_level (text), source_type (text) NOT NULL, source_channel (text), submitted_from_route (text), submitted_from_portal (text), submitted_from_role (text), submitted_by_name (text), submitted_by_email (text), device_info (text), environment (text), steps_to_reproduce (text), expected_result (text), actual_result (text), is_reproducible (boolean), is_bug (boolean) NOT NULL, is_internal (boolean) NOT NULL, is_tenant_visible (boolean) NOT NULL, assigned_to (uuid), assigned_team (text), ready_for_retest (boolean) NOT NULL, retest_required (boolean) NOT NULL, retest_status (text), resolved_in_release (text), resolution_summary (text), closed_at (timestamp with time zone), closed_by (uuid), intake_dispatched_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), suggestions_access (ALL), write_lock_delete_suggestions (DELETE), write_lock_insert_suggestions (INSERT), write_lock_update_suggestions (UPDATE)

### suitability_results
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, student_id (text), course_id (text), suitability_outcome (text), notes (text)
- FKs: tenant_id -> tenants.tenant_id, created_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), suitability_results_tenant_isolation (ALL), write_lock_delete_suitability_results (DELETE), write_lock_insert_suitability_results (INSERT), write_lock_update_suitability_results (UPDATE)

### supervision_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, wud_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, supervisor_id (uuid) NOT NULL, session_date (date) NOT NULL, session_type (text) NOT NULL, duration_minutes (integer), unit_codes (ARRAY), activity_description (text) NOT NULL, location (text), feedback_provided (text), areas_of_strength (text), areas_for_development (text), actions_agreed (text), readiness_rating (text), supervisor_recommendation (text), trainer_acknowledged (boolean), trainer_acknowledged_at (timestamp with time zone), supervisor_signed (boolean), supervisor_signed_at (timestamp with time zone), evidence_document_ids (ARRAY), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), milestone_type (text), competency_areas_covered (ARRAY), next_session_due (date), progression_status (text)
- FKs: supervisor_id -> tp_trainers.id, wud_id -> working_under_direction.id, trainer_id -> tp_trainers.id, tenant_id -> tenants.tenant_id, updated_by -> auth.users.id, created_by -> auth.users.id
- RLS: enabled, policies: supervision_insert_tenant (INSERT), supervision_select_tenant (SELECT), supervision_update_tenant (UPDATE)

### support_mode_audit
- Columns: id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, admin_user_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, action (text) NOT NULL, details (jsonb), ip (text), user_agent (text), session_token_hash (text)
- RLS: enabled, policies: Service role only on support_mode_audit (ALL), Super admins read support_mode_audit (SELECT), write_lock_delete_support_mode_audit (DELETE), write_lock_insert_support_mode_audit (INSERT), write_lock_update_support_mode_audit (UPDATE)

### support_sessions
- Columns: id (uuid) NOT NULL, created_by (uuid) NOT NULL, tenant_id (uuid) NOT NULL, mode (text) NOT NULL, reason (text), started_at (timestamp with time zone) NOT NULL, expires_at (timestamp with time zone) NOT NULL, ended_at (timestamp with time zone), ip (text), user_agent (text), token_hash (text)
- FKs: created_by -> auth.users.id
- RLS: enabled, policies: support_sessions_select (SELECT), write_lock_delete_support_sessions (DELETE), write_lock_insert_support_sessions (INSERT), write_lock_update_support_sessions (UPDATE)

### survey_cycles
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, template_id (uuid) NOT NULL, title (text) NOT NULL, status (text) NOT NULL, target_role (text), target_cohort (text), dispatched_at (timestamp with time zone), closes_at (timestamp with time zone), created_by (uuid), created_at (timestamp with time zone) NOT NULL
- FKs: created_by -> auth.users.id, tenant_id -> tenants.tenant_id, template_id -> survey_templates.id
- RLS: enabled, policies: governance_select_survey_cycles (SELECT), tenant_access_survey_cycles (ALL), write_lock_delete_survey_cycles (DELETE), write_lock_insert_survey_cycles (INSERT), write_lock_update_survey_cycles (UPDATE)

### survey_findings
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, survey_cycle_id (uuid), survey_id (uuid), ci_register_id (uuid), complaints_register_id (uuid), notes (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL
- FKs: survey_cycle_id -> survey_cycles.id, created_by -> auth.users.id, survey_id -> surveys.id
- RLS: enabled, policies: tenant_access_survey_findings (ALL), write_lock_delete_survey_findings (DELETE), write_lock_insert_survey_findings (INSERT), write_lock_update_survey_findings (UPDATE)

### survey_questions
- Columns: id (uuid) NOT NULL, survey_id (uuid) NOT NULL, question_text (text) NOT NULL, question_type (text) NOT NULL, options (jsonb), required (boolean), order_index (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, is_core (boolean), question_category (text)
- FKs: survey_id -> surveys.id
- RLS: enabled, policies: public_token_read_survey_questions (SELECT), tenant_access_survey_questions (ALL)

### survey_recipients
- Columns: id (uuid) NOT NULL, survey_cycle_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, recipient_user_id (uuid), recipient_email (text), responded_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL
- FKs: survey_cycle_id -> survey_cycles.id, recipient_user_id -> auth.users.id
- RLS: enabled, policies: governance_select_survey_recipients (SELECT), tenant_access_survey_recipients (ALL), write_lock_delete_survey_recipients (DELETE), write_lock_insert_survey_recipients (INSERT), write_lock_update_survey_recipients (UPDATE)

### survey_response_sessions
- Columns: id (uuid) NOT NULL, survey_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, session_token (text) NOT NULL, completed_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL
- FKs: survey_id -> surveys.id
- RLS: enabled, policies: Users can view tenant sessions (SELECT), billing_gate (ALL), survey_response_sessions_insert (INSERT), write_lock_delete_survey_response_sessions (DELETE), write_lock_insert_survey_response_sessions (INSERT), write_lock_update_survey_response_sessions (UPDATE)

### survey_responses
- Columns: id (uuid) NOT NULL, survey_id (uuid) NOT NULL, question_id (uuid) NOT NULL, response_value (text), response_data (jsonb), respondent_id (uuid), tenant_id (uuid), created_at (timestamp with time zone) NOT NULL, file_path (text), is_anonymous (boolean), session_id (text)
- FKs: question_id -> survey_questions.id, survey_id -> surveys.id, respondent_id -> auth.users.id
- RLS: enabled, policies: anonymity_select_survey_responses (SELECT), billing_gate (ALL), public_token_insert_survey_responses (INSERT), tenant_access_survey_responses (ALL), write_lock_delete_survey_responses (DELETE), write_lock_insert_survey_responses (INSERT), write_lock_update_survey_responses (UPDATE)

### survey_templates
- Columns: id (uuid) NOT NULL, tenant_id (uuid), title (text) NOT NULL, description (text), survey_type (text) NOT NULL, target_audience (text) NOT NULL, is_core_template (boolean) NOT NULL, is_locked (boolean) NOT NULL, version (integer) NOT NULL, parent_template_id (uuid), quality_areas (ARRAY), standard_references (ARRAY), questions (jsonb) NOT NULL, custom_questions (jsonb), source_file_path (text), source_file_name (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: parent_template_id -> survey_templates.id
- RLS: enabled, policies: Users can view core templates (SELECT), billing_gate (ALL), survey_templates_delete (DELETE), survey_templates_insert (INSERT), survey_templates_select (SELECT), survey_templates_update (UPDATE), write_lock_delete_survey_templates (DELETE), write_lock_insert_survey_templates (INSERT), write_lock_update_survey_templates (UPDATE)

### survey_tokens
- Columns: id (uuid) NOT NULL, survey_cycle_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, token (text) NOT NULL, email (text) NOT NULL, expires_at (timestamp with time zone) NOT NULL, used_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL
- FKs: survey_cycle_id -> survey_cycles.id
- RLS: enabled, policies: public_token_lookup_survey_tokens (SELECT), tenant_delete_survey_tokens (DELETE), tenant_insert_survey_tokens (INSERT), tenant_update_survey_tokens (UPDATE), write_lock_delete_survey_tokens (DELETE), write_lock_insert_survey_tokens (INSERT), write_lock_update_survey_tokens (UPDATE)

### surveys
- Columns: id (uuid) NOT NULL, title (text) NOT NULL, description (text), type (text) NOT NULL, target_audience (text), auto_log_enabled (boolean), status (text), tenant_id (uuid), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, template_id (uuid), public_token (text), allow_anonymous (boolean), quality_areas (ARRAY), standard_references (ARRAY), expires_at (timestamp with time zone), source_file_path (text), source_file_name (text), public_token_generated_at (timestamp with time zone), revoked_at (timestamp with time zone), revoked_by (uuid), link_label (text), consultation_plan_id (uuid), consultation_engagement_id (uuid)
- FKs: consultation_plan_id -> industry_consultation_plans.id, created_by -> auth.users.id, template_id -> survey_templates.id, revoked_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), public_token_read_surveys (SELECT), tenant_access_surveys (ALL), write_lock_delete_surveys (DELETE), write_lock_insert_surveys (INSERT), write_lock_update_surveys (UPDATE)

### surveys_itn
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone), details_snapshot (jsonb) NOT NULL, itnskillsgap_snapshot (jsonb) NOT NULL, tda_snapshot (jsonb) NOT NULL, rplupskilling_snapshot (jsonb) NOT NULL, genfeedback_snapshot (jsonb) NOT NULL, consent_snapshot (jsonb) NOT NULL, custom_id (text) NOT NULL, tas_build_id (uuid), qual_code (text), survey_id (uuid)
- FKs: survey_id -> industry_consultation_surveys.id, tenant_id -> tenants.tenant_id, tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), public_trusted_insert_surveys_itn (INSERT), tenant_all (ALL), write_lock_delete_surveys_itn (DELETE), write_lock_insert_surveys_itn (INSERT), write_lock_update_surveys_itn (UPDATE)

### system_features
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, description (text), feature_key (text) NOT NULL, category_id (uuid), is_core (boolean), sort_order (integer), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: category_id -> permission_categories.id
- RLS: enabled, policies: authenticated_read_system_features (SELECT), super_admin_write_system_features (ALL)

### system_logs
- Columns: id (uuid) NOT NULL, timestamp (timestamp with time zone) NOT NULL, function_name (text) NOT NULL, error_detail (text), level (text) NOT NULL, metadata (jsonb), created_at (timestamp with time zone) NOT NULL, tenant_id (uuid), user_id (uuid), event_type (text), severity (text) NOT NULL, message (text), source (text), created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: system_logs_super_admin (ALL)

### system_notifications
- Columns: id (uuid) NOT NULL, timestamp (timestamp with time zone) NOT NULL, type (text) NOT NULL, severity (text) NOT NULL, message (text) NOT NULL, tenant_id (uuid), user_id (uuid), resolved (boolean), metadata (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: user_id -> auth.users.id, updated_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_system_notifications (ALL), write_lock_delete_system_notifications (DELETE), write_lock_insert_system_notifications (INSERT), write_lock_update_system_notifications (UPDATE)

### system_settings
- Columns: id (uuid) NOT NULL, setting_key (text) NOT NULL, setting_value (jsonb) NOT NULL, description (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: updated_by -> auth.users.id
- RLS: enabled, policies: authenticated_read_system_settings (SELECT), super_admin_write_system_settings (ALL)

### tar_register
- Columns: trainer (uuid) NOT NULL, delivery_area (ARRAY) NOT NULL, mon_am (boolean), mon_pm (boolean), tue_am (boolean), tue_pm (boolean), wed_am (boolean), wed_pm (boolean), thu_am (boolean), thu_pm (boolean), fri_am (boolean), fri_pm (boolean), sat_am (boolean), sat_pm (boolean), sun_am (boolean), sun_pm (boolean), tenant_id (uuid) NOT NULL, status (text), notes (text), created_by (uuid), created_at (timestamp with time zone), updated_by (uuid), updated_at (timestamp with time zone), custom_id (text), title (text), description (text), responsible_person (uuid), due_date (date), risk_level (text), start_date (date), end_date (date), name (text), unavailable_periods (jsonb), responsible_role (text), id (uuid) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_or_super_admin (ALL), write_lock_delete_tar_register (DELETE), write_lock_insert_tar_register (INSERT), write_lock_update_tar_register (UPDATE)

### tas_action_rules
- Columns: id (uuid) NOT NULL, tenant_id (uuid), name (text) NOT NULL, is_enabled (boolean) NOT NULL, trigger (jsonb) NOT NULL, action (jsonb) NOT NULL, cooldown_hours (integer) NOT NULL, schema_version (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tas_action_rules_insert (INSERT), tas_action_rules_select (SELECT), tas_action_rules_service (ALL), tas_action_rules_update (UPDATE), tenant_isolate_delete_tas_action_rules (DELETE), tenant_isolate_insert_tas_action_rules (INSERT), tenant_isolate_select_tas_action_rules (SELECT), tenant_isolate_update_tas_action_rules (UPDATE)

### tas_admissions_requirements
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, section_key (text) NOT NULL, item_text (text) NOT NULL, source_type (text) NOT NULL, source_id (uuid), confidence (integer) NOT NULL, is_required (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Tenant members can delete admissions requirements (DELETE), Tenant members can insert admissions requirements (INSERT), Tenant members can update admissions requirements (UPDATE), Tenant members can view admissions requirements (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_admissions_requirements (DELETE), tenant_isolate_insert_tas_admissions_requirements (INSERT), tenant_isolate_select_tas_admissions_requirements (SELECT), tenant_isolate_update_tas_admissions_requirements (UPDATE), write_lock_delete_tas_admissions_requirements (DELETE), write_lock_insert_tas_admissions_requirements (INSERT), write_lock_update_tas_admissions_requirements (UPDATE)

### tas_ai_runs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, run_type (text) NOT NULL, prompt_version (text), input_snapshot (jsonb), output_summary (jsonb), status (text) NOT NULL, error_message (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL, completed_at (timestamp with time zone)
- RLS: enabled, policies: Tenant isolation on tas_ai_runs (ALL), billing_gate (ALL), tenant_isolate_delete_tas_ai_runs (DELETE), tenant_isolate_insert_tas_ai_runs (INSERT), tenant_isolate_select_tas_ai_runs (SELECT), tenant_isolate_update_tas_ai_runs (UPDATE), write_lock_delete_tas_ai_runs (DELETE), write_lock_insert_tas_ai_runs (INSERT), write_lock_update_tas_ai_runs (UPDATE)

### tas_aot_determinations
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, determination_version (text) NOT NULL, aot_determination (jsonb) NOT NULL, inputs_hash (text) NOT NULL, validation_flags (ARRAY) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, determination (jsonb)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tas_aot_determinations_delete (DELETE), tas_aot_determinations_insert (INSERT), tas_aot_determinations_select (SELECT), tas_aot_determinations_update (UPDATE), tenant_isolate_delete_tas_aot_determinations (DELETE), tenant_isolate_insert_tas_aot_determinations (INSERT), tenant_isolate_select_tas_aot_determinations (SELECT), tenant_isolate_update_tas_aot_determinations (UPDATE), write_lock_delete_tas_aot_determinations (DELETE), write_lock_insert_tas_aot_determinations (INSERT), write_lock_update_tas_aot_determinations (UPDATE)

### tas_aot_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, pack_version (text) NOT NULL, unit_hour_allocations (jsonb) NOT NULL, total_hours (numeric), breakdown (jsonb) NOT NULL, aqf_level (integer), vol_min (numeric), vol_max (numeric), delta_from_range (numeric), alignment_status (text) NOT NULL, risk_flags (ARRAY) NOT NULL, inputs_hash (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, cohort_multiplier_applied (numeric), cohort_multiplier_source (text), schema_version (integer) NOT NULL, delta_from_vol_min (integer), delta_from_vol_max (integer), hours_breakdown (jsonb), benchmark_summary (jsonb), evidence_ids (ARRAY) NOT NULL, explain_packet (jsonb), generated_at (timestamp with time zone) NOT NULL, created_by (uuid), aot_mode (text) NOT NULL, product_type (text)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_delete (DELETE), tenant_insert (INSERT), tenant_isolate_delete_tas_aot_packs (DELETE), tenant_isolate_insert_tas_aot_packs (INSERT), tenant_isolate_select_tas_aot_packs (SELECT), tenant_isolate_update_tas_aot_packs (UPDATE), tenant_select (SELECT), tenant_update (UPDATE), write_lock_delete_tas_aot_packs (DELETE), write_lock_insert_tas_aot_packs (INSERT), write_lock_update_tas_aot_packs (UPDATE)

### tas_aot_vol_justifications
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, justification_version (text) NOT NULL, aot_justification_text (text) NOT NULL, vol_justification_text (text) NOT NULL, combined_text (text) NOT NULL, inputs_hash (text) NOT NULL, prompt_version (text) NOT NULL, generated_by (uuid), generated_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, alignment_status (text) NOT NULL, risk_flags (ARRAY) NOT NULL, evidence_item_ids (ARRAY) NOT NULL, updated_at (timestamp with time zone) NOT NULL, model_name (text), cited_evidence_ids (ARRAY), quality_warnings (ARRAY)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: Service role full access justifications (ALL), Tenant members can insert justifications (INSERT), Tenant members can update justifications (UPDATE), Tenant members can view justifications (SELECT), billing_gate (ALL), tas_aot_vol_justifications_delete (DELETE), tas_aot_vol_justifications_insert (INSERT), tas_aot_vol_justifications_select (SELECT), tas_aot_vol_justifications_update (UPDATE), tenant_isolate_delete_tas_aot_vol_justifications (DELETE), tenant_isolate_insert_tas_aot_vol_justifications (INSERT), tenant_isolate_select_tas_aot_vol_justifications (SELECT), tenant_isolate_update_tas_aot_vol_justifications (UPDATE), write_lock_delete_tas_aot_vol_justifications (DELETE), write_lock_insert_tas_aot_vol_justifications (INSERT), write_lock_update_tas_aot_vol_justifications (UPDATE)

### tas_approval_audit
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, approved_by (uuid) NOT NULL, approved_at (timestamp with time zone) NOT NULL, blocked_rules (ARRAY), notes (text)
- RLS: enabled, policies: Admins can insert approval audit (INSERT), Tenant members can view approval audit (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_approval_audit (DELETE), tenant_isolate_insert_tas_approval_audit (INSERT), tenant_isolate_select_tas_approval_audit (SELECT), tenant_isolate_update_tas_approval_audit (UPDATE), write_lock_delete_tas_approval_audit (DELETE), write_lock_insert_tas_approval_audit (INSERT), write_lock_update_tas_approval_audit (UPDATE)

### tas_assessment_mapping
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, custom_id (text) NOT NULL, unit_code (text) NOT NULL, unit_title (text) NOT NULL, cluster_unit_codes (ARRAY), row_type (text) NOT NULL, element_number (text), element_title (text), criterion_ref (text), criterion_text (text) NOT NULL, method_a_written (text), method_b_oral (text), method_c_project (text), method_d_observation (text), method_e_portfolio (text), method_f_supervisor (text), ai_proposed (boolean) NOT NULL, trainer_confirmed (boolean) NOT NULL, upload_override (boolean) NOT NULL, upload_url (text), sequence_no (integer) NOT NULL, created_by (uuid) NOT NULL, updated_by (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id, tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL)

### tas_assessment_strategy_configs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, config (jsonb) NOT NULL, unit_coverage (jsonb) NOT NULL, schema_version (integer) NOT NULL, saved_at (timestamp with time zone) NOT NULL, saved_by (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tas_assessment_strategy_configs_insert (INSERT), tas_assessment_strategy_configs_select (SELECT), tas_assessment_strategy_configs_update (UPDATE), tenant_isolate_delete_tas_assessment_strategy_configs (DELETE), tenant_isolate_insert_tas_assessment_strategy_configs (INSERT), tenant_isolate_select_tas_assessment_strategy_configs (SELECT), tenant_isolate_update_tas_assessment_strategy_configs (UPDATE)

### tas_audit_actions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, run_id (uuid) NOT NULL, finding_id (uuid) NOT NULL, action_title (text) NOT NULL, action_detail (text), owner_user_id (uuid), due_date (date), status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_audit_actions (DELETE), tenant_isolate_insert_tas_audit_actions (INSERT), tenant_isolate_select_tas_audit_actions (SELECT), tenant_isolate_update_tas_audit_actions (UPDATE), write_lock_delete_tas_audit_actions (DELETE), write_lock_insert_tas_audit_actions (INSERT), write_lock_update_tas_audit_actions (UPDATE)

### tas_audit_findings
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, run_id (uuid) NOT NULL, clause_id (uuid), severity (text) NOT NULL, finding_title (text) NOT NULL, finding_detail (text) NOT NULL, evidence_gap (boolean) NOT NULL, suggested_fix (text), suggested_evidence (text), linked_evidence_ids (ARRAY), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_audit_findings (DELETE), tenant_isolate_insert_tas_audit_findings (INSERT), tenant_isolate_select_tas_audit_findings (SELECT), tenant_isolate_update_tas_audit_findings (UPDATE), write_lock_delete_tas_audit_findings (DELETE), write_lock_insert_tas_audit_findings (INSERT), write_lock_update_tas_audit_findings (UPDATE)

### tas_audit_sim_runs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, run_status (text) NOT NULL, provider (text) NOT NULL, model (text), input_fingerprint (text) NOT NULL, started_at (timestamp with time zone), finished_at (timestamp with time zone), run_summary (text), overall_score (numeric), error_text (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_audit_sim_runs (DELETE), tenant_isolate_insert_tas_audit_sim_runs (INSERT), tenant_isolate_select_tas_audit_sim_runs (SELECT), tenant_isolate_update_tas_audit_sim_runs (UPDATE), write_lock_delete_tas_audit_sim_runs (DELETE), write_lock_insert_tas_audit_sim_runs (INSERT), write_lock_update_tas_audit_sim_runs (UPDATE)

### tas_auditor_simulations
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, simulation_version (text) NOT NULL, mode (text) NOT NULL, deterministic_findings (jsonb) NOT NULL, final_findings (jsonb) NOT NULL, blocker_count (integer) NOT NULL, warning_count (integer) NOT NULL, overall_risk_rating (text) NOT NULL, inputs_hash (text) NOT NULL, simulated_by (uuid), simulated_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, prompt_version (text) NOT NULL, ai_findings (jsonb) NOT NULL, ai_validation_report (jsonb) NOT NULL, ai_ran_at (timestamp with time zone), ai_model (text)
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_auditor_simulations (DELETE), tenant_isolate_insert_tas_auditor_simulations (INSERT), tenant_isolate_select_tas_auditor_simulations (SELECT), tenant_isolate_update_tas_auditor_simulations (UPDATE), write_lock_delete_tas_auditor_simulations (DELETE), write_lock_insert_tas_auditor_simulations (INSERT), write_lock_update_tas_auditor_simulations (UPDATE)

### tas_builds
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, rto_id (uuid), qualification_code (text) NOT NULL, qualification_title (text) NOT NULL, status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), aqf_level (integer), aot_total_hours (numeric), aot_face_to_face (numeric), aot_structured_online (numeric), aot_assessment (numeric), aot_workplace (numeric), aot_calculation_basis_json (jsonb), aot_last_calculated_at (timestamp with time zone), entry_skill_justification (text), compile_ready (boolean) NOT NULL, compile_blockers (jsonb) NOT NULL, title (text) NOT NULL, readiness_percent (integer) NOT NULL, readiness_band (text) NOT NULL, blockers (jsonb) NOT NULL, phase_state (jsonb) NOT NULL, last_activity_at (timestamp with time zone) NOT NULL
- FKs: rto_id -> rtos.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant admins can manage TAS builds (ALL), Tenant members can view their TAS builds (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_builds (DELETE), tenant_isolate_insert_tas_builds (INSERT), tenant_isolate_select_tas_builds (SELECT), tenant_isolate_update_tas_builds (UPDATE), write_lock_delete_tas_builds (DELETE), write_lock_insert_tas_builds (INSERT), write_lock_update_tas_builds (UPDATE)

### tas_capacity_snapshots
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, capacity_score (integer) NOT NULL, capacity_band (text) NOT NULL, assessor_count (integer) NOT NULL, expiring_soon_count (integer) NOT NULL, coverage_gap_count (integer) NOT NULL, gaps (jsonb) NOT NULL, mitigations (jsonb) NOT NULL, inputs (jsonb) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Insert via RPC only (INSERT), No deletes on snapshots (DELETE), SuperAdmin cross-tenant select snapshots (SELECT), Tenant members can view capacity snapshots (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_capacity_snapshots (DELETE), tenant_isolate_insert_tas_capacity_snapshots (INSERT), tenant_isolate_select_tas_capacity_snapshots (SELECT), tenant_isolate_update_tas_capacity_snapshots (UPDATE), write_lock_delete_tas_capacity_snapshots (DELETE), write_lock_insert_tas_capacity_snapshots (INSERT), write_lock_update_tas_capacity_snapshots (UPDATE)

### tas_clause_map
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, tas_section (text) NOT NULL, applicability (text) NOT NULL, rationale (text), evidence_ids (ARRAY), created_at (timestamp with time zone) NOT NULL, section (text)
- FKs: clause_id -> compliance_clauses.id
- RLS: enabled, policies: billing_gate (ALL), tas_clause_map_insert (INSERT), tas_clause_map_sa_select (SELECT), tas_clause_map_select (SELECT), tenant_isolate_delete_tas_clause_map (DELETE), tenant_isolate_insert_tas_clause_map (INSERT), tenant_isolate_select_tas_clause_map (SELECT), tenant_isolate_update_tas_clause_map (UPDATE)

### tas_clause_risk
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, risk_level (text) NOT NULL, gap_flag (boolean) NOT NULL, mitigation_required (boolean) NOT NULL, mitigation_text (text), inputs (jsonb) NOT NULL, evidence_ids (ARRAY), generated_by (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: clause_id -> compliance_clauses.id
- RLS: enabled, policies: billing_gate (ALL), tas_clause_risk_insert (INSERT), tas_clause_risk_sa_select (SELECT), tas_clause_risk_select (SELECT), tenant_isolate_delete_tas_clause_risk (DELETE), tenant_isolate_insert_tas_clause_risk (INSERT), tenant_isolate_select_tas_clause_risk (SELECT), tenant_isolate_update_tas_clause_risk (UPDATE)

### tas_cohort_integrity
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, cohort_types (jsonb), prior_experience_level (text), delivery_mode (jsonb), geographic_scope (jsonb), entry_requirements (jsonb), screening_methods (jsonb), licensing_flags (jsonb), licensing_acknowledged (boolean), lln_required (boolean), lln_risk_factors (jsonb), lln_strategy (text), lln_referral_pathways (text), lln_adjustment_notes (text), cohort_risk_level (text), cohort_risk_triggers (jsonb), mitigation_statement (text), integrity_rating (text), delivery_compat_flags (jsonb), cohort_profile_text (text), profile_generated_at (timestamp with time zone), phase_completed (boolean), phase_completed_at (timestamp with time zone), completed_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tas_ci_delete (DELETE), tas_ci_insert (INSERT), tas_ci_select (SELECT), tas_ci_update (UPDATE), tas_cohort_integrity_insert (INSERT), tas_cohort_integrity_update (UPDATE), tenant_isolate_delete_tas_cohort_integrity (DELETE), tenant_isolate_insert_tas_cohort_integrity (INSERT), tenant_isolate_select_tas_cohort_integrity (SELECT), tenant_isolate_update_tas_cohort_integrity (UPDATE)

### tas_cohort_profiles
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, profile_version (text) NOT NULL, cohort_multiplier (numeric) NOT NULL, llnd_risk_level (text) NOT NULL, entry_skill_assumptions (jsonb) NOT NULL, experience_assumption (text) NOT NULL, risk_flags (ARRAY) NOT NULL, inputs_hash (text) NOT NULL, generated_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_delete (DELETE), tenant_insert (INSERT), tenant_isolate_delete_tas_cohort_profiles (DELETE), tenant_isolate_insert_tas_cohort_profiles (INSERT), tenant_isolate_select_tas_cohort_profiles (SELECT), tenant_isolate_update_tas_cohort_profiles (UPDATE), tenant_select (SELECT), tenant_update (UPDATE), write_lock_delete_tas_cohort_profiles (DELETE), write_lock_insert_tas_cohort_profiles (INSERT), write_lock_update_tas_cohort_profiles (UPDATE)

### tas_compile_snapshots
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, compile_version (text) NOT NULL, compiled (jsonb) NOT NULL, combined_text (text) NOT NULL, evidence_refs (ARRAY) NOT NULL, inputs_hash (text) NOT NULL, compiled_by (uuid), compiled_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_compile_snapshots (DELETE), tenant_isolate_insert_tas_compile_snapshots (INSERT), tenant_isolate_select_tas_compile_snapshots (SELECT), tenant_isolate_update_tas_compile_snapshots (UPDATE), write_lock_delete_tas_compile_snapshots (DELETE), write_lock_insert_tas_compile_snapshots (INSERT), write_lock_update_tas_compile_snapshots (UPDATE)

### tas_compiled_exports
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, format (text) NOT NULL, content (text) NOT NULL, section_order (ARRAY) NOT NULL, draft_revision_snapshot (jsonb) NOT NULL, schema_version (integer) NOT NULL, generated_at (timestamp with time zone) NOT NULL, generated_by (uuid) NOT NULL, defensibility_score (integer) NOT NULL, defensibility_blockers (ARRAY) NOT NULL, defensibility_warnings (ARRAY) NOT NULL, defensibility_details (jsonb) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tas_compiled_exports_insert (INSERT), tas_compiled_exports_select (SELECT), tenant_isolate_delete_tas_compiled_exports (DELETE), tenant_isolate_insert_tas_compiled_exports (INSERT), tenant_isolate_select_tas_compiled_exports (SELECT), tenant_isolate_update_tas_compiled_exports (UPDATE)

### tas_compliance_requirements
- Columns: id (uuid) NOT NULL, standard_reference (text) NOT NULL, tas_component (text) NOT NULL, compliance_requirement (text) NOT NULL, evidence_expected (text) NOT NULL, quality_area (text) NOT NULL, is_required (boolean) NOT NULL, sort_order (integer), created_at (timestamp with time zone) NOT NULL, artefact_type (text) NOT NULL, requirement_key (text)
- RLS: enabled, policies: tas_compliance_requirements_select (SELECT)

### tas_compliance_scans
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, scan_version (text) NOT NULL, scan_results (jsonb) NOT NULL, inputs_hash (text) NOT NULL, scanned_by (uuid), scanned_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_compliance_scans (DELETE), tenant_isolate_insert_tas_compliance_scans (INSERT), tenant_isolate_select_tas_compliance_scans (SELECT), tenant_isolate_update_tas_compliance_scans (UPDATE), write_lock_delete_tas_compliance_scans (DELETE), write_lock_insert_tas_compliance_scans (INSERT), write_lock_update_tas_compliance_scans (UPDATE)

### tas_compliance_status
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, artefact_type (text) NOT NULL, artefact_id (uuid) NOT NULL, requirement_key (text) NOT NULL, compliance_status (text) NOT NULL, validation_notes (text), last_validated_at (timestamp with time zone), validated_by (uuid), evidence_references (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), tenant_isolate_delete_tas_compliance_status (DELETE), tenant_isolate_insert_tas_compliance_status (INSERT), tenant_isolate_select_tas_compliance_status (SELECT), tenant_isolate_update_tas_compliance_status (UPDATE), write_lock_delete_tas_compliance_status (DELETE), write_lock_insert_tas_compliance_status (INSERT), write_lock_update_tas_compliance_status (UPDATE)

### tas_confidence_scores
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, score_version (text) NOT NULL, scores (jsonb) NOT NULL, inputs_hash (text) NOT NULL, scored_by (uuid), scored_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_confidence_scores (DELETE), tenant_isolate_insert_tas_confidence_scores (INSERT), tenant_isolate_select_tas_confidence_scores (SELECT), tenant_isolate_update_tas_confidence_scores (UPDATE), write_lock_delete_tas_confidence_scores (DELETE), write_lock_insert_tas_confidence_scores (INSERT), write_lock_update_tas_confidence_scores (UPDATE)

### tas_consultation_links
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, consultation_record_id (uuid) NOT NULL, link_type (text) NOT NULL, link_status (text) NOT NULL, match_source (text) NOT NULL, match_reason (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL
- FKs: tas_id -> q1_tas_builder.id, consultation_record_id -> industry_consultation_records.id
- RLS: enabled, policies: billing_gate_tas_consultation_links (ALL), tenant_isolate_delete_tas_consultation_links (DELETE), tenant_isolate_insert_tas_consultation_links (INSERT), tenant_isolate_select_tas_consultation_links (SELECT), tenant_isolate_update_tas_consultation_links (UPDATE), write_lock_delete_tas_consultation_links (DELETE), write_lock_insert_tas_consultation_links (INSERT), write_lock_update_tas_consultation_links (UPDATE)

### tas_delivery_integrity_snapshots
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, integrity_score (integer) NOT NULL, integrity_band (text) NOT NULL, mismatch_count (integer) NOT NULL, missing_controls_count (integer) NOT NULL, mismatches (jsonb) NOT NULL, missing_controls (jsonb) NOT NULL, mitigations (jsonb) NOT NULL, inputs (jsonb) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: No delete delivery integrity snapshots (DELETE), SuperAdmin select delivery integrity snapshots (SELECT), Tenant insert delivery integrity snapshots (INSERT), Tenant select delivery integrity snapshots (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_delivery_integrity_snapshots (DELETE), tenant_isolate_insert_tas_delivery_integrity_snapshots (INSERT), tenant_isolate_select_tas_delivery_integrity_snapshots (SELECT), tenant_isolate_update_tas_delivery_integrity_snapshots (UPDATE), write_lock_delete_tas_delivery_integrity_snapshots (DELETE), write_lock_insert_tas_delivery_integrity_snapshots (INSERT), write_lock_update_tas_delivery_integrity_snapshots (UPDATE)

### tas_delivery_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, pack_version (text) NOT NULL, trainer_coverage (jsonb) NOT NULL, assessment_validation (jsonb) NOT NULL, delivery_ready (boolean) NOT NULL, blockers (ARRAY) NOT NULL, warnings (ARRAY) NOT NULL, inputs_hash (text) NOT NULL, generated_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, coverage_pct (numeric)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_delete (DELETE), tenant_insert (INSERT), tenant_isolate_delete_tas_delivery_packs (DELETE), tenant_isolate_insert_tas_delivery_packs (INSERT), tenant_isolate_select_tas_delivery_packs (SELECT), tenant_isolate_update_tas_delivery_packs (UPDATE), tenant_select (SELECT), tenant_update (UPDATE), write_lock_delete_tas_delivery_packs (DELETE), write_lock_insert_tas_delivery_packs (INSERT), write_lock_update_tas_delivery_packs (UPDATE)

### tas_delivery_plan_risks
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, delivery_plan_id (uuid) NOT NULL, risk_text (text) NOT NULL, risk_rating (text) NOT NULL, control_measure (text) NOT NULL, person_responsible (text), target_date (date), location (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: delivery_plan_id -> tas_delivery_plans.id
- RLS: enabled, policies: billing_gate (ALL), tas_dpr_delete (DELETE), tas_dpr_insert (INSERT), tas_dpr_select (SELECT), tas_dpr_update (UPDATE), tenant_isolate_delete_tas_delivery_plan_risks (DELETE), tenant_isolate_insert_tas_delivery_plan_risks (INSERT), tenant_isolate_select_tas_delivery_plan_risks (SELECT), tenant_isolate_update_tas_delivery_plan_risks (UPDATE), write_lock_delete_tas_delivery_plan_risks (DELETE), write_lock_insert_tas_delivery_plan_risks (INSERT), write_lock_update_tas_delivery_plan_risks (UPDATE)

### tas_delivery_plan_schedule_rows
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, delivery_plan_id (uuid) NOT NULL, sequence_no (integer) NOT NULL, label (text), allocated_hours_total (numeric), allocated_hours_learning (numeric), allocated_hours_assessment (numeric), delivery_mode (text), unit_code (text), unit_title (text), content_elements (text), learning_activities (text), assessment_tasks (text), required_resources (text), tags (ARRAY) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, spine_type (text) NOT NULL, week_number (integer), day_number (integer), year_number (integer), quarter_label (text), location (text), break_minutes (integer)
- FKs: delivery_plan_id -> tas_delivery_plans.id
- RLS: enabled, policies: billing_gate (ALL), tas_dpsr_delete (DELETE), tas_dpsr_insert (INSERT), tas_dpsr_select (SELECT), tas_dpsr_update (UPDATE), tenant_isolate_delete_tas_delivery_plan_schedule_rows (DELETE), tenant_isolate_insert_tas_delivery_plan_schedule_rows (INSERT), tenant_isolate_select_tas_delivery_plan_schedule_rows (SELECT), tenant_isolate_update_tas_delivery_plan_schedule_rows (UPDATE), write_lock_delete_tas_delivery_plan_schedule_rows (DELETE), write_lock_insert_tas_delivery_plan_schedule_rows (INSERT), write_lock_update_tas_delivery_plan_schedule_rows (UPDATE)

### tas_delivery_plan_units
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, delivery_plan_id (uuid) NOT NULL, unit_code (text) NOT NULL, unit_title (text) NOT NULL, sequence_no (integer) NOT NULL, tga_status (text), is_core (boolean), is_elective (boolean), nominal_hours (integer), created_at (timestamp with time zone) NOT NULL, delivery_mode (text), assigned_trainer (text), delivery_phase (text), assessment_tasks (ARRAY), unit_notes (text), hours_online (integer), hours_self_paced (integer), hours_f2f (integer), hours_work_placement (integer), hours_assessment (integer), weight (numeric), updated_at (timestamp with time zone) NOT NULL, allocated_weeks (text), content (jsonb), learning_activities (text), required_resources (text)
- FKs: delivery_plan_id -> tas_delivery_plans.id
- RLS: enabled, policies: billing_gate (ALL), tas_dpu_delete (DELETE), tas_dpu_insert (INSERT), tas_dpu_select (SELECT), tas_dpu_update (UPDATE), tenant_isolate_delete_tas_delivery_plan_units (DELETE), tenant_isolate_insert_tas_delivery_plan_units (INSERT), tenant_isolate_select_tas_delivery_plan_units (SELECT), tenant_isolate_update_tas_delivery_plan_units (UPDATE), write_lock_delete_tas_delivery_plan_units (DELETE), write_lock_insert_tas_delivery_plan_units (INSERT), write_lock_update_tas_delivery_plan_units (UPDATE)

### tas_delivery_plans
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, custom_id (text) NOT NULL, title (text), description (text), unit_sequence (jsonb), assessment_methods (jsonb), trainer_allocation (jsonb), reasonable_adjustment_approach (text), evidence_requirements (jsonb), status (text) NOT NULL, approved_by (uuid), approved_at (timestamp with time zone), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tas_build_id (uuid), training_product_code (text), training_product_title (text), rto_name (text), rto_id (text), course_outline (text), delivery_structure (text), practical_hours_required (integer), practical_required (boolean) NOT NULL, lln_required (jsonb) NOT NULL, reasonable_adjustments (jsonb) NOT NULL, aqf_level (text), course_description (text), training_package (text), target_cohort (text), vol_online_hrs (integer), vol_f2f_hrs (integer), vol_placement_hrs (integer), vol_total_hrs (integer), gen_contact_hours_per_week (integer) NOT NULL, gen_placement_hours_per_week (integer) NOT NULL, delivery_modes (jsonb) NOT NULL, course_outline_accepted_at (timestamp with time zone), course_outline_accepted_by (uuid), product_type (text) NOT NULL, scope_basis (text) NOT NULL, vol_assessment_hrs (numeric) NOT NULL, contextualisation_summary (text), contextualisation_summary_generated_at (timestamp with time zone), work_placement_narrative (text), work_placement_narrative_generated_at (timestamp with time zone)
- FKs: tas_build_id -> q1_tas_builder.id, course_outline_accepted_by -> auth.users.id, tas_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), tenant_isolate_delete_tas_delivery_plans (DELETE), tenant_isolate_insert_tas_delivery_plans (INSERT), tenant_isolate_select_tas_delivery_plans (SELECT), tenant_isolate_update_tas_delivery_plans (UPDATE), write_lock_delete_tas_delivery_plans (DELETE), write_lock_insert_tas_delivery_plans (INSERT), write_lock_update_tas_delivery_plans (UPDATE)

### tas_document_versions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_document_id (uuid), version_no (integer) NOT NULL, snapshot (jsonb) NOT NULL, compiled_file_path (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL, compiled_file_type (text), compiled_sha256 (text), tas_build_id (uuid), storage_path (text), storage_bucket (text), generated_by (uuid), generated_at (timestamp with time zone), version_number (integer), is_draft (boolean) NOT NULL, section_count (integer), file_size_bytes (bigint), format (text), download_count (integer) NOT NULL
- FKs: tas_document_id -> tas_documents.id, tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tas_dv_ins (INSERT), tas_dv_sel (SELECT), tdv_ins_v2 (INSERT), tdv_sa (ALL), tdv_sel_v2 (SELECT), tenant_isolate_delete_tas_document_versions (DELETE), tenant_isolate_insert_tas_document_versions (INSERT), tenant_isolate_select_tas_document_versions (SELECT), tenant_isolate_update_tas_document_versions (UPDATE), write_lock_delete_tas_document_versions (DELETE), write_lock_insert_tas_document_versions (INSERT), write_lock_update_tas_document_versions (UPDATE)

### tas_documents
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_goal_id (uuid) NOT NULL, status (text) NOT NULL, current_version_id (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, qualification_code (text), qualification_title (text), last_compiled_at (timestamp with time zone)
- FKs: tas_goal_id -> tas_goals.id
- RLS: enabled, policies: billing_gate (ALL), tas_doc_del (DELETE), tas_doc_ins (INSERT), tas_doc_sel (SELECT), tas_doc_upd (UPDATE), tenant_isolate_delete_tas_documents (DELETE), tenant_isolate_insert_tas_documents (INSERT), tenant_isolate_select_tas_documents (SELECT), tenant_isolate_update_tas_documents (UPDATE), write_lock_delete_tas_documents (DELETE), write_lock_insert_tas_documents (INSERT), write_lock_update_tas_documents (UPDATE)

### tas_draft_sections
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, section_key (text) NOT NULL, content_md (text) NOT NULL, citations (jsonb) NOT NULL, schema_version (integer) NOT NULL, revision (integer) NOT NULL, ai_mode (boolean) NOT NULL, ai_risk_score (integer) NOT NULL, ai_risk_flags (ARRAY) NOT NULL, needs_review (boolean) NOT NULL, reviewed_at (timestamp with time zone), reviewed_by (uuid), generated_at (timestamp with time zone) NOT NULL, generated_by (uuid), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_draft_sections (DELETE), tenant_isolate_insert_tas_draft_sections (INSERT), tenant_isolate_select_tas_draft_sections (SELECT), tenant_isolate_update_tas_draft_sections (UPDATE), write_lock_delete_tas_draft_sections (DELETE), write_lock_insert_tas_draft_sections (INSERT), write_lock_update_tas_draft_sections (UPDATE)

### tas_drift_flags
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, qualification_code (text) NOT NULL, change_event_id (uuid) NOT NULL, severity (text) NOT NULL, requires_review (boolean) NOT NULL, review_status (text) NOT NULL, impact_summary (text), created_at (timestamp with time zone) NOT NULL, resolved_at (timestamp with time zone), resolved_by (uuid)
- FKs: change_event_id -> training_product_change_events.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tdf_insert_super_admin (INSERT), tdf_select_tenant (SELECT), tdf_update_tenant (UPDATE), tenant_isolate_delete_tas_drift_flags (DELETE), tenant_isolate_insert_tas_drift_flags (INSERT), tenant_isolate_select_tas_drift_flags (SELECT), tenant_isolate_update_tas_drift_flags (UPDATE), write_lock_delete_tas_drift_flags (DELETE), write_lock_insert_tas_drift_flags (INSERT), write_lock_update_tas_drift_flags (UPDATE)

### tas_evidence_audit_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, section_key (text), action (text) NOT NULL, actor_id (uuid), details (jsonb), created_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant admins can insert audit logs (INSERT), Tenant members can view audit logs (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_evidence_audit_log (DELETE), tenant_isolate_insert_tas_evidence_audit_log (INSERT), tenant_isolate_select_tas_evidence_audit_log (SELECT), tenant_isolate_update_tas_evidence_audit_log (UPDATE), write_lock_delete_tas_evidence_audit_log (DELETE), write_lock_insert_tas_evidence_audit_log (INSERT), write_lock_update_tas_evidence_audit_log (UPDATE)

### tas_evidence_confidence
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, source_type (text) NOT NULL, source_url (text), source_title (text) NOT NULL, publication_date (date), jurisdiction (text), extracted_text (text), relevance_score (numeric) NOT NULL, freshness_score (numeric) NOT NULL, diversity_group (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), content_hash (text), canonical_url (text), is_reused (boolean) NOT NULL, reused_from_evidence_id (uuid), tas_consultation_id (uuid), industry_consultation_id (uuid)
- FKs: reused_from_evidence_id -> tas_evidence_confidence.id
- RLS: enabled, policies: billing_gate (ALL), tas_evidence_confidence_insert (INSERT), tas_evidence_confidence_sa_select (SELECT), tas_evidence_confidence_select (SELECT), tas_evidence_confidence_update (UPDATE), tenant_isolate_delete_tas_evidence_confidence (DELETE), tenant_isolate_insert_tas_evidence_confidence (INSERT), tenant_isolate_select_tas_evidence_confidence (SELECT), tenant_isolate_update_tas_evidence_confidence (UPDATE)

### tas_evidence_index
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, section_key (text) NOT NULL, asset_id (uuid) NOT NULL, asset_type (text), approval_status (text), review_date (date), version (text), owner_role (text), freshness_score (numeric) NOT NULL, relevance_score (numeric) NOT NULL, evidence_level (text) NOT NULL, total_score (numeric) NOT NULL, link_status (text) NOT NULL, source_summary (jsonb) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, metadata (jsonb)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tas_evidence_index_delete (DELETE), tas_evidence_index_insert (INSERT), tas_evidence_index_select (SELECT), tas_evidence_index_update (UPDATE), tenant_isolate_delete_tas_evidence_index (DELETE), tenant_isolate_insert_tas_evidence_index (INSERT), tenant_isolate_select_tas_evidence_index (SELECT), tenant_isolate_update_tas_evidence_index (UPDATE), write_lock_delete_tas_evidence_index (DELETE), write_lock_insert_tas_evidence_index (INSERT), write_lock_update_tas_evidence_index (UPDATE)

### tas_evidence_integrity_checks
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, status (text) NOT NULL, issues (jsonb) NOT NULL, missing_required (jsonb) NOT NULL, stale_review_items (jsonb) NOT NULL, summary (jsonb) NOT NULL, metrics (jsonb) NOT NULL, result (jsonb) NOT NULL, checked_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Service role can manage TAS evidence integrity checks (ALL), Tenant members can view TAS evidence integrity checks (SELECT)

### tas_evidence_items
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, section_key (text) NOT NULL, evidence_type (text) NOT NULL, title (text) NOT NULL, description (text), source_url (text), storage_path (text), is_verified (boolean) NOT NULL, verified_at (timestamp with time zone), verified_by (uuid), metadata (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, tas_consultation_id (uuid), industry_consultation_id (uuid)
- RLS: enabled, policies: Tenant members can insert evidence items (INSERT), Tenant members can update evidence items (UPDATE), billing_gate (ALL), tas_evidence_items_delete (DELETE), tas_evidence_items_insert (INSERT), tas_evidence_items_select (SELECT), tas_evidence_items_update (UPDATE), tenant_isolate_delete_tas_evidence_items (DELETE), tenant_isolate_insert_tas_evidence_items (INSERT), tenant_isolate_select_tas_evidence_items (SELECT), tenant_isolate_update_tas_evidence_items (UPDATE)

### tas_evidence_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, evidence_ready (boolean) NOT NULL, pack_version (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_evidence_packs (DELETE), tenant_isolate_insert_tas_evidence_packs (INSERT), tenant_isolate_select_tas_evidence_packs (SELECT), tenant_isolate_update_tas_evidence_packs (UPDATE), write_lock_delete_tas_evidence_packs (DELETE), write_lock_insert_tas_evidence_packs (INSERT), write_lock_update_tas_evidence_packs (UPDATE)

### tas_evidence_provenance_maps
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, map_json (jsonb) NOT NULL, mapped_count (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_evidence_provenance_maps (DELETE), tenant_isolate_insert_tas_evidence_provenance_maps (INSERT), tenant_isolate_select_tas_evidence_provenance_maps (SELECT), tenant_isolate_update_tas_evidence_provenance_maps (UPDATE), tenant_read_provenance_maps (SELECT), tenant_write_provenance_maps (ALL), write_lock_delete_tas_evidence_provenance_maps (DELETE), write_lock_insert_tas_evidence_provenance_maps (INSERT), write_lock_update_tas_evidence_provenance_maps (UPDATE)

### tas_evidence_scores
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, total_score (numeric) NOT NULL, threshold_pass (boolean) NOT NULL, coverage_pct (numeric) NOT NULL, freshness_pct (numeric) NOT NULL, verification_pct (numeric) NOT NULL, blockers (ARRAY), warnings (ARRAY), breakdown (jsonb), generated_at (timestamp with time zone) NOT NULL, generated_by (uuid), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_evidence_scores (DELETE), tenant_isolate_insert_tas_evidence_scores (INSERT), tenant_isolate_select_tas_evidence_scores (SELECT), tenant_isolate_update_tas_evidence_scores (UPDATE), write_lock_delete_tas_evidence_scores (DELETE), write_lock_insert_tas_evidence_scores (INSERT), write_lock_update_tas_evidence_scores (UPDATE)

### tas_executive_summaries
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, summary_version (text) NOT NULL, prompt_version (text) NOT NULL, content (jsonb) NOT NULL, combined_text (text) NOT NULL, evidence_refs (ARRAY) NOT NULL, risk_flags (ARRAY) NOT NULL, inputs_hash (text) NOT NULL, generated_by (uuid), generated_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, confidence_score (numeric), evidence_coverage_score (numeric), consistency_flags (jsonb)
- RLS: enabled, policies: tas_exec_summ_service_all (ALL), tas_exec_summ_tenant_insert (INSERT), tas_exec_summ_tenant_select (SELECT)

### tas_final_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, version (integer) NOT NULL, compiled_status (text) NOT NULL, compiled_at (timestamp with time zone) NOT NULL, compiled_by (uuid), compile_snapshot (jsonb) NOT NULL, storage_path (text), export_urls (jsonb) NOT NULL, notes (text), created_at (timestamp with time zone) NOT NULL
- FKs: compiled_by -> profiles.id, tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: Tenant members can insert own final packs (INSERT), Tenant members can update own final packs (UPDATE), Tenant members can view own final packs (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_final_packs (DELETE), tenant_isolate_insert_tas_final_packs (INSERT), tenant_isolate_select_tas_final_packs (SELECT), tenant_isolate_update_tas_final_packs (UPDATE), write_lock_delete_tas_final_packs (DELETE), write_lock_insert_tas_final_packs (INSERT), write_lock_update_tas_final_packs (UPDATE)

### tas_forecast_config
- Columns: id (uuid) NOT NULL, tenant_id (uuid), months_ahead (integer) NOT NULL, w_market (numeric) NOT NULL, w_evidence (numeric) NOT NULL, w_clause (numeric) NOT NULL, w_audit_sim (numeric) NOT NULL, w_workforce (numeric) NOT NULL, band_low_max (integer) NOT NULL, band_moderate_max (integer) NOT NULL, band_high_max (integer) NOT NULL, active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), sa_manage_global_fc (ALL), tas_forecast_config_insert (INSERT), tas_forecast_config_update (UPDATE), tenant_admin_manage_fc (ALL), tenant_isolate_delete_tas_forecast_config (DELETE), tenant_isolate_insert_tas_forecast_config (INSERT), tenant_isolate_select_tas_forecast_config (SELECT), tenant_isolate_update_tas_forecast_config (UPDATE), tenant_read_fc (SELECT)

### tas_forecast_events
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, from_band (text), to_band (text), reason (text), snapshot_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_forecast_events (DELETE), tenant_isolate_insert_tas_forecast_events (INSERT), tenant_isolate_select_tas_forecast_events (SELECT), tenant_isolate_update_tas_forecast_events (UPDATE), write_lock_delete_tas_forecast_events (DELETE), write_lock_insert_tas_forecast_events (INSERT), write_lock_update_tas_forecast_events (UPDATE)

### tas_forecast_snapshots
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, months_ahead (integer) NOT NULL, forecast_score (integer) NOT NULL, forecast_band (text) NOT NULL, key_drivers (jsonb) NOT NULL, early_warnings (jsonb) NOT NULL, recommended_actions (jsonb) NOT NULL, inputs (jsonb) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_forecast_snapshots (DELETE), tenant_isolate_insert_tas_forecast_snapshots (INSERT), tenant_isolate_select_tas_forecast_snapshots (SELECT), tenant_isolate_update_tas_forecast_snapshots (UPDATE), write_lock_delete_tas_forecast_snapshots (DELETE), write_lock_insert_tas_forecast_snapshots (INSERT), write_lock_update_tas_forecast_snapshots (UPDATE)

### tas_generation_runs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_goal_id (uuid) NOT NULL, run_type (text) NOT NULL, status (text) NOT NULL, started_at (timestamp with time zone) NOT NULL, finished_at (timestamp with time zone), input_hash (text) NOT NULL, output_summary (jsonb), evidence_ids (ARRAY), error (text)
- RLS: enabled, policies: billing_gate (ALL), tas_gr_ins (INSERT), tas_gr_sel (SELECT), tas_gr_upd (UPDATE), tenant_isolate_delete_tas_generation_runs (DELETE), tenant_isolate_insert_tas_generation_runs (INSERT), tenant_isolate_select_tas_generation_runs (SELECT), tenant_isolate_update_tas_generation_runs (UPDATE), tgr_ins_v2 (INSERT), tgr_sa (ALL), tgr_sel_v2 (SELECT), tgr_upd_v2 (UPDATE), write_lock_delete_tas_generation_runs (DELETE), write_lock_insert_tas_generation_runs (INSERT), write_lock_update_tas_generation_runs (UPDATE)

### tas_goal_ai_drafts
- Columns: id (uuid) NOT NULL, tas_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, field_key (text) NOT NULL, ai_draft (text) NOT NULL, confidence_score (numeric), completeness_score (numeric), prompt_version (text) NOT NULL, input_snapshot (jsonb), model_used (text), is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), evidence_sources (jsonb), standard_references (ARRAY), key_points (jsonb), assumptions (jsonb), recommended_user_questions (jsonb), evidence_link_ids (ARRAY), evidence_gaps (jsonb), claims_register (jsonb)
- FKs: tas_id -> q1_tas_builder.id
- RLS: enabled, policies: Users can insert AI drafts for their tenant (INSERT), Users can update their tenant's AI drafts (UPDATE), Users can view their tenant's AI drafts (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_goal_ai_drafts (DELETE), tenant_isolate_insert_tas_goal_ai_drafts (INSERT), tenant_isolate_select_tas_goal_ai_drafts (SELECT), tenant_isolate_update_tas_goal_ai_drafts (UPDATE), write_lock_delete_tas_goal_ai_drafts (DELETE), write_lock_insert_tas_goal_ai_drafts (INSERT), write_lock_update_tas_goal_ai_drafts (UPDATE)

### tas_goal_ai_run_outputs
- Columns: id (uuid) NOT NULL, run_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, field_key (text) NOT NULL, ai_draft_text (text) NOT NULL, key_points (jsonb), assumptions (jsonb), confidence_score (numeric), completeness_score (numeric), recommended_user_questions (jsonb), evidence_link_ids (ARRAY), evidence_gaps (jsonb), evidence_selection (jsonb), created_at (timestamp with time zone) NOT NULL
- FKs: run_id -> tas_goal_ai_runs.id
- RLS: enabled, policies: Tenant members can insert run outputs (INSERT), Tenant members can view their run outputs (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_goal_ai_run_outputs (DELETE), tenant_isolate_insert_tas_goal_ai_run_outputs (INSERT), tenant_isolate_select_tas_goal_ai_run_outputs (SELECT), tenant_isolate_update_tas_goal_ai_run_outputs (UPDATE), write_lock_delete_tas_goal_ai_run_outputs (DELETE), write_lock_insert_tas_goal_ai_run_outputs (INSERT), write_lock_update_tas_goal_ai_run_outputs (UPDATE)

### tas_goal_ai_runs
- Columns: id (uuid) NOT NULL, tas_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, prompt_version (text) NOT NULL, input_snapshot (jsonb) NOT NULL, fields_generated (ARRAY) NOT NULL, model_used (text), tokens_used (integer), processing_time_ms (integer), created_at (timestamp with time zone) NOT NULL, created_by (uuid), run_type (text), context_pack (jsonb), source_index (jsonb), conflicts (jsonb)
- FKs: tas_id -> q1_tas_builder.id
- RLS: enabled, policies: Users can insert AI runs for their tenant (INSERT), Users can view their tenant's AI runs (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_goal_ai_runs (DELETE), tenant_isolate_insert_tas_goal_ai_runs (INSERT), tenant_isolate_select_tas_goal_ai_runs (SELECT), tenant_isolate_update_tas_goal_ai_runs (UPDATE), write_lock_delete_tas_goal_ai_runs (DELETE), write_lock_insert_tas_goal_ai_runs (INSERT), write_lock_update_tas_goal_ai_runs (UPDATE)

### tas_goal_evidence_links
- Columns: id (uuid) NOT NULL, tas_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, field_key (text) NOT NULL, evidence_type (text) NOT NULL, evidence_id (text), evidence_title (text) NOT NULL, evidence_url (text), standard_clause (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), tas_goal_section_id (uuid), evidence_source_type (text), content_asset_id (uuid), external_url (text), excerpt (text), mapped_standard_codes (ARRAY), source_domain (text), retrieved_at (timestamp with time zone), snapshot_text (text), query_used (text), reliability_tier (text), relevance_score (numeric), freshness_score (numeric), authority_score (numeric), specificity_score (numeric), coverage_score (numeric), penalty_score (numeric), total_score (numeric), approval_status (text), review_date (date), source_date (date), version (text), owner_role (text)
- FKs: content_asset_id -> content_assets.id
- RLS: enabled, policies: Users can delete evidence links for their tenant (DELETE), Users can insert evidence links for their tenant (INSERT), Users can view evidence links for their tenant (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_goal_evidence_links (DELETE), tenant_isolate_insert_tas_goal_evidence_links (INSERT), tenant_isolate_select_tas_goal_evidence_links (SELECT), tenant_isolate_update_tas_goal_evidence_links (UPDATE), write_lock_delete_tas_goal_evidence_links (DELETE), write_lock_insert_tas_goal_evidence_links (INSERT), write_lock_update_tas_goal_evidence_links (UPDATE)

### tas_goals
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id, tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: Tenant admins can manage TAS goals (ALL), Tenant members can view their TAS goals (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_goals (DELETE), tenant_isolate_insert_tas_goals (INSERT), tenant_isolate_select_tas_goals (SELECT), tenant_isolate_update_tas_goals (UPDATE), write_lock_delete_tas_goals (DELETE), write_lock_insert_tas_goals (INSERT), write_lock_update_tas_goals (UPDATE)

### tas_governance
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, qualification_code (text), release_number (text), on_scope (boolean), scope_validated_at (timestamp with time zone), delivery_states (ARRAY), scope_delivery_states (ARRAY), state_authority_valid (boolean), qualification_is_current (boolean), funding_model (text), apprenticeship_flag (boolean), workplace_pathway_confirmed (boolean), employer_arrangement (text), third_party_flag (boolean), third_party_details (jsonb), governance_risk_score (integer), governance_risk_level (text), phase_completed (boolean), phase_completed_at (timestamp with time zone), completed_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), service_role_override_tas_governance (ALL), tas_governance_delete (DELETE), tas_governance_insert (INSERT), tas_governance_select (SELECT), tas_governance_update (UPDATE), tenant_isolate_delete_tas_governance (DELETE), tenant_isolate_insert_tas_governance (INSERT), tenant_isolate_select_tas_governance (SELECT), tenant_isolate_update_tas_governance (UPDATE)

### tas_import_compliance_gaps
- Columns: id (uuid) NOT NULL, import_session_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, gap_type (text) NOT NULL, standard_reference (text), description (text) NOT NULL, severity (text) NOT NULL, affected_units (ARRAY), resolution_status (text), resolved_by (uuid), resolved_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id, import_session_id -> tas_import_sessions.id
- RLS: enabled, policies: Admins can manage compliance gaps (ALL), Tenant members can view compliance gaps (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_import_compliance_gaps (DELETE), tenant_isolate_insert_tas_import_compliance_gaps (INSERT), tenant_isolate_select_tas_import_compliance_gaps (SELECT), tenant_isolate_update_tas_import_compliance_gaps (UPDATE), write_lock_delete_tas_import_compliance_gaps (DELETE), write_lock_insert_tas_import_compliance_gaps (INSERT), write_lock_update_tas_import_compliance_gaps (UPDATE)

### tas_import_documents
- Columns: id (uuid) NOT NULL, import_session_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, file_name (text) NOT NULL, file_path (text) NOT NULL, file_type (text) NOT NULL, file_size (integer), document_type (text) NOT NULL, status (text) NOT NULL, parse_error (text), parsed_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL
- FKs: import_session_id -> tas_import_sessions.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Admins can manage import documents (ALL), Tenant members can view import documents (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_import_documents (DELETE), tenant_isolate_insert_tas_import_documents (INSERT), tenant_isolate_select_tas_import_documents (SELECT), tenant_isolate_update_tas_import_documents (UPDATE), write_lock_delete_tas_import_documents (DELETE), write_lock_insert_tas_import_documents (INSERT), write_lock_update_tas_import_documents (UPDATE)

### tas_import_parsed_data
- Columns: id (uuid) NOT NULL, import_session_id (uuid) NOT NULL, document_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, section_type (text) NOT NULL, extracted_data (jsonb) NOT NULL, confidence_score (numeric), compliance_mapping (jsonb), validation_status (text), validation_notes (text), user_confirmed (boolean), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: import_session_id -> tas_import_sessions.id, tenant_id -> tenants.tenant_id, document_id -> tas_import_documents.id
- RLS: enabled, policies: Admins can manage parsed data (ALL), Tenant members can view parsed data (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_import_parsed_data (DELETE), tenant_isolate_insert_tas_import_parsed_data (INSERT), tenant_isolate_select_tas_import_parsed_data (SELECT), tenant_isolate_update_tas_import_parsed_data (UPDATE), write_lock_delete_tas_import_parsed_data (DELETE), write_lock_insert_tas_import_parsed_data (INSERT), write_lock_update_tas_import_parsed_data (UPDATE)

### tas_import_sessions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, qualification_code (text) NOT NULL, qualification_title (text), status (text) NOT NULL, created_by (uuid) NOT NULL, confirmed_by (uuid), confirmed_at (timestamp with time zone), tas_id (uuid), compliance_score (numeric), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id, tas_id -> q1_tas_builder.id
- RLS: enabled, policies: Admins can manage import sessions (ALL), Tenant members can view import sessions (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_import_sessions (DELETE), tenant_isolate_insert_tas_import_sessions (INSERT), tenant_isolate_select_tas_import_sessions (SELECT), tenant_isolate_update_tas_import_sessions (UPDATE), write_lock_delete_tas_import_sessions (DELETE), write_lock_insert_tas_import_sessions (INSERT), write_lock_update_tas_import_sessions (UPDATE)

### tas_industry_themes
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, theme_type (text) NOT NULL, theme_statement (text) NOT NULL, confidence_score (numeric) NOT NULL, support_count (integer) NOT NULL, source_ids (ARRAY) NOT NULL, sources (jsonb) NOT NULL, model (text), schema_version (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), decision_id (uuid), updated_at (timestamp with time zone)
- FKs: decision_id -> industry_consultation_decisions.id, tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL)

### tas_labour_market_snapshots
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, qualification_code (text) NOT NULL, region (text) NOT NULL, occupations (jsonb) NOT NULL, metrics (jsonb) NOT NULL, sources (jsonb) NOT NULL, source_provider (text) NOT NULL, source_query (text) NOT NULL, dataset_version (text) NOT NULL, cache_key (text) NOT NULL, schema_version (integer) NOT NULL, fetched_at (timestamp with time zone) NOT NULL, fetched_by (uuid) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), lms_insert (INSERT), lms_select (SELECT), lms_service (ALL), tas_labour_market_snapshots_insert (INSERT), tenant_isolate_delete_tas_labour_market_snapshots (DELETE), tenant_isolate_insert_tas_labour_market_snapshots (INSERT), tenant_isolate_select_tas_labour_market_snapshots (SELECT), tenant_isolate_update_tas_labour_market_snapshots (UPDATE)

### tas_learner_aot_consistency_checks
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, learner_pack_id (uuid), aot_pack_id (uuid), checks (jsonb) NOT NULL, overall_status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Tenant members can insert consistency checks (INSERT), Tenant members can view consistency checks (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_learner_aot_consistency_checks (DELETE), tenant_isolate_insert_tas_learner_aot_consistency_checks (INSERT), tenant_isolate_select_tas_learner_aot_consistency_checks (SELECT), tenant_isolate_update_tas_learner_aot_consistency_checks (UPDATE), write_lock_delete_tas_learner_aot_consistency_checks (DELETE), write_lock_insert_tas_learner_aot_consistency_checks (INSERT), write_lock_update_tas_learner_aot_consistency_checks (UPDATE)

### tas_learner_profile_inputs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, cohort_types (ARRAY) NOT NULL, entry_requirements (ARRAY) NOT NULL, selection_criteria (ARRAY) NOT NULL, lln_support_required (boolean) NOT NULL, prior_experience (text) NOT NULL, delivery_mode (text) NOT NULL, region (text) NOT NULL, state (ARRAY) NOT NULL, screening_methods (ARRAY) NOT NULL, licensing_or_regulatory (ARRAY) NOT NULL, reasonable_adjustment_notes (text) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), learner_inputs_tenant_delete (DELETE), learner_inputs_tenant_insert (INSERT), learner_inputs_tenant_select (SELECT), learner_inputs_tenant_update (UPDATE), tenant_isolate_delete_tas_learner_profile_inputs (DELETE), tenant_isolate_insert_tas_learner_profile_inputs (INSERT), tenant_isolate_select_tas_learner_profile_inputs (SELECT), tenant_isolate_update_tas_learner_profile_inputs (UPDATE), write_lock_delete_tas_learner_profile_inputs (DELETE), write_lock_insert_tas_learner_profile_inputs (INSERT), write_lock_update_tas_learner_profile_inputs (UPDATE)

### tas_learner_profile_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, pack_version (text) NOT NULL, learner_profile_pack (jsonb) NOT NULL, inputs_hash (text) NOT NULL, baseline_flag (boolean) NOT NULL, risk_flags (ARRAY) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, complexity_modifier (numeric) NOT NULL, entry_skill_risk_flag (boolean) NOT NULL, provenance (jsonb) NOT NULL, schema_version (integer) NOT NULL, generated_at (timestamp with time zone) NOT NULL
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_delete (DELETE), tenant_insert (INSERT), tenant_isolate_delete_tas_learner_profile_packs (DELETE), tenant_isolate_insert_tas_learner_profile_packs (INSERT), tenant_isolate_select_tas_learner_profile_packs (SELECT), tenant_isolate_update_tas_learner_profile_packs (UPDATE), tenant_select (SELECT), tenant_update (UPDATE), write_lock_delete_tas_learner_profile_packs (DELETE), write_lock_insert_tas_learner_profile_packs (INSERT), write_lock_update_tas_learner_profile_packs (UPDATE)

### tas_licensing_reference_rules
- Columns: id (uuid) NOT NULL, training_product_code (text), industry_area (text), jurisdiction (text) NOT NULL, rule_name (text) NOT NULL, rule_summary (text) NOT NULL, source_url (text), source_domain (text), is_outcome_licence (boolean), is_entry_requirement (boolean), effective_from (date), effective_to (date)
- RLS: enabled, policies: tas_licensing_ref_rules_select (SELECT)

### tas_licensing_registry
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, qualification_code (text) NOT NULL, state (text) NOT NULL, source_url (text), regulator_name (text), licensing_required (boolean) NOT NULL, licensing_details (text), citation_date (date), confidence_score (integer), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), updated_at (timestamp with time zone) NOT NULL, retention_until (timestamp with time zone)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_delete_tas_licensing_registry (DELETE), tenant_insert_tas_licensing_registry (INSERT), tenant_isolate_delete_tas_licensing_registry (DELETE), tenant_isolate_insert_tas_licensing_registry (INSERT), tenant_isolate_select_tas_licensing_registry (SELECT), tenant_isolate_update_tas_licensing_registry (UPDATE), tenant_select_tas_licensing_registry (SELECT), tenant_update_tas_licensing_registry (UPDATE), write_lock_delete_tas_licensing_registry (DELETE), write_lock_insert_tas_licensing_registry (INSERT), write_lock_update_tas_licensing_registry (UPDATE)

### tas_lln_ai_output
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, lln_support_strategy (text) NOT NULL, referral_pathways (text) NOT NULL, adjustment_notes_draft (text), cohort_types_snapshot (ARRAY), llnd_risk_level_snapshot (text), risk_flags_snapshot (ARRAY), qual_code_snapshot (text), region_snapshot (text), state_snapshot (ARRAY), delivery_methods_snapshot (ARRAY), model_version (text) NOT NULL, prompt_version (text) NOT NULL, generation_status (text) NOT NULL, accepted_by_user (boolean) NOT NULL, accepted_at (timestamp with time zone), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: created_by -> auth.users.id, tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_select_tas_lln_ai_output (SELECT), write_lock_delete_tas_lln_ai_output (DELETE), write_lock_insert_tas_lln_ai_output (INSERT), write_lock_update_tas_lln_ai_output (UPDATE)

### tas_lm_fetch_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, qualification_code (text) NOT NULL, status (text) NOT NULL, error_code (text), error_message (text), provider (text), duration_ms (integer), created_at (timestamp with time zone) NOT NULL, created_by (uuid), attempt (integer) NOT NULL
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), sa_all (ALL), tenant_insert (INSERT), tenant_isolate_delete_tas_lm_fetch_log (DELETE), tenant_isolate_insert_tas_lm_fetch_log (INSERT), tenant_isolate_select_tas_lm_fetch_log (SELECT), tenant_isolate_update_tas_lm_fetch_log (UPDATE), tenant_read (SELECT), tenant_update (UPDATE), write_lock_delete_tas_lm_fetch_log (DELETE), write_lock_insert_tas_lm_fetch_log (INSERT), write_lock_update_tas_lm_fetch_log (UPDATE)

### tas_market_alignment_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, qual_code (text), qual_title (text), inputs_hash (text) NOT NULL, alignment_score (numeric) NOT NULL, alignment_band (text) NOT NULL, aligned_theme_count (integer) NOT NULL, total_theme_count (integer) NOT NULL, unit_coverage_ratio (numeric) NOT NULL, consultation_overlap_ratio (numeric) NOT NULL, evidence_coverage_ratio (numeric) NOT NULL, theme_alignment (jsonb) NOT NULL, unit_alignment (jsonb) NOT NULL, evidence_alignment (jsonb) NOT NULL, risk_flags (ARRAY) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Tenant members can insert their alignment packs (INSERT), Tenant members can select their alignment packs (SELECT), Tenant members can update their alignment packs (UPDATE), billing_gate (ALL), tenant_isolate_delete_tas_market_alignment_packs (DELETE), tenant_isolate_insert_tas_market_alignment_packs (INSERT), tenant_isolate_select_tas_market_alignment_packs (SELECT), tenant_isolate_update_tas_market_alignment_packs (UPDATE), write_lock_delete_tas_market_alignment_packs (DELETE), write_lock_insert_tas_market_alignment_packs (INSERT), write_lock_update_tas_market_alignment_packs (UPDATE)

### tas_market_baseline_evidence
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, evidence_item_id (uuid), source_type (text) NOT NULL, source_name (text) NOT NULL, source_url (text) NOT NULL, published_date (date), captured_at (timestamp with time zone) NOT NULL, region_state (text), region_name (text), qualification_code (text), claim_type (text) NOT NULL, claim_text (text) NOT NULL, excerpt (text), metadata (jsonb) NOT NULL, created_by (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: evidence_item_id -> evidence_items.id
- RLS: enabled, policies: Tenant members can delete baseline evidence (DELETE), Tenant members can insert baseline evidence (INSERT), Tenant members can update baseline evidence (UPDATE), Tenant members can view baseline evidence (SELECT), billing_gate (ALL), tas_market_baseline_evidence_insert (INSERT), tas_market_baseline_evidence_update (UPDATE), tenant_isolate_delete_tas_market_baseline_evidence (DELETE), tenant_isolate_insert_tas_market_baseline_evidence (INSERT), tenant_isolate_select_tas_market_baseline_evidence (SELECT), tenant_isolate_update_tas_market_baseline_evidence (UPDATE)

### tas_market_justification
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, qualification_code (text), anzsco_codes (jsonb), labour_market_data (jsonb), market_strength_rating (text), primary_occupations (jsonb), projected_growth_rate (numeric), annual_job_openings (integer), shortage_status (text), regional_demand_indicator (text), wage_range_min (numeric), wage_range_max (numeric), labour_data_fetched_at (timestamp with time zone), industry_consultations (jsonb), employer_count (integer), stakeholder_count (integer), consultation_theme_summary (text), industry_support_rating (text), saturation_index (text), competitor_rto_count (integer), saturation_data (jsonb), strategic_alignment_confirmed (boolean), alignment_checklist (jsonb), viability_rating (text), viability_justification (text), justification_text (text), justification_generated_at (timestamp with time zone), phase_completed (boolean), phase_completed_at (timestamp with time zone), completed_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tas_market_justification_insert (INSERT), tas_market_justification_update (UPDATE), tas_mj_delete (DELETE), tas_mj_insert (INSERT), tas_mj_select (SELECT), tas_mj_update (UPDATE), tenant_isolate_delete_tas_market_justification (DELETE), tenant_isolate_insert_tas_market_justification (INSERT), tenant_isolate_select_tas_market_justification (SELECT), tenant_isolate_update_tas_market_justification (UPDATE)

### tas_market_research_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, pack_version (text) NOT NULL, prompt_version (text) NOT NULL, qualification_code (text), state (text), region (text), shortage_indicators (jsonb) NOT NULL, labour_demand_themes (jsonb) NOT NULL, licensing_or_regulatory (jsonb) NOT NULL, sources (ARRAY) NOT NULL, warnings (ARRAY) NOT NULL, inputs_hash (text) NOT NULL, generated_by (uuid), generated_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, market_integrity_score (numeric), consultation_alignment_ratio (numeric), source_count (integer), unique_domains (integer), validated_theme_count (integer), data_window_start (date), data_window_end (date), integrity_band (text), pack_data (jsonb), pack (jsonb)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_market_research_packs (DELETE), tenant_isolate_insert_tas_market_research_packs (INSERT), tenant_isolate_select_tas_market_research_packs (SELECT), tenant_isolate_update_tas_market_research_packs (UPDATE), tenant_isolation_delete (DELETE), tenant_isolation_insert (INSERT), tenant_isolation_select (SELECT), tenant_isolation_update (UPDATE), write_lock_delete_tas_market_research_packs (DELETE), write_lock_insert_tas_market_research_packs (INSERT), write_lock_update_tas_market_research_packs (UPDATE)

### tas_market_research_sources
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, source_url (text) NOT NULL, source_host (text) NOT NULL, source_title (text), source_type (text) NOT NULL, retrieved_at (timestamp with time zone) NOT NULL, published_date (date), content_hash (text) NOT NULL, content_excerpt (text), extracted_facts (jsonb) NOT NULL, extraction_confidence (numeric) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_market_research_sources (DELETE), tenant_isolate_insert_tas_market_research_sources (INSERT), tenant_isolate_select_tas_market_research_sources (SELECT), tenant_isolate_update_tas_market_research_sources (UPDATE), tenant_isolation_delete (DELETE), tenant_isolation_insert (INSERT), tenant_isolation_select (SELECT), tenant_isolation_update (UPDATE), write_lock_delete_tas_market_research_sources (DELETE), write_lock_insert_tas_market_research_sources (INSERT), write_lock_update_tas_market_research_sources (UPDATE)

### tas_market_saturation_audit
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, actor_id (uuid) NOT NULL, action (text) NOT NULL, old_values (jsonb), new_values (jsonb), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), saturation_audit_insert (INSERT), saturation_audit_select (SELECT), tenant_isolate_delete_tas_market_saturation_audit (DELETE), tenant_isolate_insert_tas_market_saturation_audit (INSERT), tenant_isolate_select_tas_market_saturation_audit (SELECT), tenant_isolate_update_tas_market_saturation_audit (UPDATE)

### tas_market_saturation_thresholds
- Columns: id (uuid) NOT NULL, label (text) NOT NULL, min_count (integer) NOT NULL, max_count (integer), sort_order (integer) NOT NULL, is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: saturation_thresholds_manage (ALL), saturation_thresholds_select (SELECT)

### tas_package_companion_cache
- Columns: id (uuid) NOT NULL, tenant_id (text) NOT NULL, package_code (text) NOT NULL, package_release (text) NOT NULL, files_json (jsonb) NOT NULL, extracted_factors (jsonb) NOT NULL, fetched_at (timestamp with time zone) NOT NULL, expires_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Service role full access on tas_package_companion_cache (ALL), tenant_isolate_select_tas_package_companion_cache (SELECT), tenant_select_tas_package_companion_cache (SELECT), write_lock_delete_tas_package_companion_cache (DELETE), write_lock_insert_tas_package_companion_cache (INSERT), write_lock_update_tas_package_companion_cache (UPDATE)

### tas_phase_status
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, phase_key (text) NOT NULL, status (text) NOT NULL, confidence_score (integer) NOT NULL, evidence_strength (integer) NOT NULL, compliance_alignment (text) NOT NULL, blocking_issues (jsonb) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: Tenant isolation for tas_phase_status (ALL), Write lock for tas_phase_status (INSERT), Write lock update for tas_phase_status (UPDATE), billing_gate (ALL), tenant_isolate_delete_tas_phase_status (DELETE), tenant_isolate_insert_tas_phase_status (INSERT), tenant_isolate_select_tas_phase_status (SELECT), tenant_isolate_update_tas_phase_status (UPDATE)

### tas_provenance_links
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, target_type (text) NOT NULL, target_key (text) NOT NULL, source_type (text) NOT NULL, source_id (uuid), source_ref (text), confidence (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tas_provenance_links_delete (DELETE), tas_provenance_links_insert (INSERT), tas_provenance_links_select (SELECT), tas_provenance_links_update (UPDATE), tenant_isolate_delete_tas_provenance_links (DELETE), tenant_isolate_insert_tas_provenance_links (INSERT), tenant_isolate_select_tas_provenance_links (SELECT), tenant_isolate_update_tas_provenance_links (UPDATE), write_lock_delete_tas_provenance_links (DELETE), write_lock_insert_tas_provenance_links (INSERT), write_lock_update_tas_provenance_links (UPDATE)

### tas_qualification_occupations
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, qualification_code (text) NOT NULL, occupation_code (text) NOT NULL, occupation_title (text) NOT NULL, weight (numeric) NOT NULL, is_active (boolean) NOT NULL, schema_version (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tas_qualification_occupations_insert (INSERT), tas_qualification_occupations_update (UPDATE), tenant_isolate_delete_tas_qualification_occupations (DELETE), tenant_isolate_insert_tas_qualification_occupations (INSERT), tenant_isolate_select_tas_qualification_occupations (SELECT), tenant_isolate_update_tas_qualification_occupations (UPDATE), tqo_insert (INSERT), tqo_select (SELECT), tqo_service (ALL), tqo_update (UPDATE)

### tas_redteam_questions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, run_id (uuid) NOT NULL, clause_id (uuid), theme (text) NOT NULL, severity (text) NOT NULL, auditor_question (text) NOT NULL, why_it_matters (text) NOT NULL, evidence_to_show (text) NOT NULL, linked_evidence_ids (ARRAY), created_at (timestamp with time zone) NOT NULL
- FKs: run_id -> tas_redteam_runs.id
- RLS: enabled, policies: No delete redteam questions (DELETE), SuperAdmin select redteam questions (SELECT), Tenant insert redteam questions (INSERT), Tenant select redteam questions (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_redteam_questions (DELETE), tenant_isolate_insert_tas_redteam_questions (INSERT), tenant_isolate_select_tas_redteam_questions (SELECT), tenant_isolate_update_tas_redteam_questions (UPDATE), write_lock_delete_tas_redteam_questions (DELETE), write_lock_insert_tas_redteam_questions (INSERT), write_lock_update_tas_redteam_questions (UPDATE)

### tas_redteam_runs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, run_status (text) NOT NULL, provider (text) NOT NULL, model (text), input_fingerprint (text) NOT NULL, started_at (timestamp with time zone), finished_at (timestamp with time zone), error_text (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: No delete redteam runs (DELETE), SuperAdmin select redteam runs (SELECT), Tenant insert redteam runs (INSERT), Tenant select redteam runs (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_redteam_runs (DELETE), tenant_isolate_insert_tas_redteam_runs (INSERT), tenant_isolate_select_tas_redteam_runs (SELECT), tenant_isolate_update_tas_redteam_runs (UPDATE), write_lock_delete_tas_redteam_runs (DELETE), write_lock_insert_tas_redteam_runs (INSERT), write_lock_update_tas_redteam_runs (UPDATE)

### tas_redteam_weak_points
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, run_id (uuid) NOT NULL, claim_text (text) NOT NULL, weakness_reason (text) NOT NULL, probable_finding (text), severity (text) NOT NULL, recommended_fix (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: run_id -> tas_redteam_runs.id
- RLS: enabled, policies: No delete redteam weak_points (DELETE), SuperAdmin select redteam weak_points (SELECT), Tenant insert redteam weak_points (INSERT), Tenant select redteam weak_points (SELECT), billing_gate (ALL), tenant_isolate_delete_tas_redteam_weak_points (DELETE), tenant_isolate_insert_tas_redteam_weak_points (INSERT), tenant_isolate_select_tas_redteam_weak_points (SELECT), tenant_isolate_update_tas_redteam_weak_points (UPDATE), write_lock_delete_tas_redteam_weak_points (DELETE), write_lock_insert_tas_redteam_weak_points (INSERT), write_lock_update_tas_redteam_weak_points (UPDATE)

### tas_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, strategy_version (text) NOT NULL, approval_date (date), course_code (text) NOT NULL, course_title (text) NOT NULL, course_duration (integer), delivery_modes (text), training_locations (text), resources_used (text), assessment_methods (text), tas_developer (uuid), next_review_date (date), responsible_officer (text), status (text), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid) NOT NULL, risk_level (text), tas_id (uuid), sources_used (ARRAY), output_docx_url (text), output_pdf_url (text), output_zip_url (text), evidence_links (jsonb), generated_by (uuid), generated_at (timestamp with time zone), course_duration_interval (text), responsible_person (uuid), responsible_role (text), description (text), due_date (date), title (text), product_type (text) NOT NULL, scope_basis (text) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tas_reg_delete (DELETE), tas_reg_insert (INSERT), tas_reg_select (SELECT), tas_reg_update (UPDATE), tenant_isolate_delete_tas_register (DELETE), tenant_isolate_insert_tas_register (INSERT), tenant_isolate_select_tas_register (SELECT), tenant_isolate_update_tas_register (UPDATE), write_lock_delete_tas_register (DELETE), write_lock_insert_tas_register (INSERT), write_lock_update_tas_register (UPDATE)

### tas_regulatory_overlay_registry
- Columns: id (uuid) NOT NULL, overlay_code (text) NOT NULL, overlay_type (text) NOT NULL, body_name (text) NOT NULL, body_acronym (text), jurisdiction (text) NOT NULL, unit_code_prefixes (ARRAY), unit_codes_exact (ARRAY), keyword_signals (ARRAY), assessment_condition (text), accreditation_hours (integer), licensing_body_url (text), overlay_description (text) NOT NULL, injects_unit_table_note (boolean) NOT NULL, injects_assessment_note (boolean) NOT NULL, injects_legislative_block (boolean) NOT NULL, injects_pathways_note (boolean) NOT NULL, is_active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: allow_authenticated_read (SELECT), superadmin_write (ALL)

### tas_repair_plans
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_id (uuid) NOT NULL, signal_id (uuid), recommended_actions (jsonb) NOT NULL, approval_required (boolean) NOT NULL, status (text) NOT NULL, approved_by (uuid), approved_at (timestamp with time zone), executed_at (timestamp with time zone), notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL
- FKs: signal_id -> training_product_compliance_signals.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_repair_plans (DELETE), tenant_isolate_insert_tas_repair_plans (INSERT), tenant_isolate_select_tas_repair_plans (SELECT), tenant_isolate_update_tas_repair_plans (UPDATE), trp_tenant_iso (ALL), write_lock_delete_tas_repair_plans (DELETE), write_lock_insert_tas_repair_plans (INSERT), write_lock_update_tas_repair_plans (UPDATE)

### tas_scoring_config
- Columns: id (uuid) NOT NULL, tenant_id (uuid), weight_freshness (numeric) NOT NULL, weight_relevance (numeric) NOT NULL, weight_diversity (numeric) NOT NULL, active (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tas_scoring_config_insert (INSERT), tas_scoring_config_select (SELECT), tas_scoring_config_update (UPDATE), tenant_isolate_delete_tas_scoring_config (DELETE), tenant_isolate_insert_tas_scoring_config (INSERT), tenant_isolate_select_tas_scoring_config (SELECT), tenant_isolate_update_tas_scoring_config (UPDATE)

### tas_section2_contents
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, section_version (text) NOT NULL, prompt_version (text) NOT NULL, content (jsonb) NOT NULL, evidence_refs (ARRAY) NOT NULL, risk_flags (ARRAY) NOT NULL, inputs_hash (text) NOT NULL, generated_by (uuid), generated_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, alignment_status (text) NOT NULL, learner_pack_updated_at (timestamp with time zone), admissions_updated_at (timestamp with time zone), market_pack_updated_at (timestamp with time zone)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tas_section2_contents_delete (DELETE), tas_section2_contents_insert (INSERT), tas_section2_contents_select (SELECT), tas_section2_contents_update (UPDATE), tenant_isolate_delete_tas_section2_contents (DELETE), tenant_isolate_insert_tas_section2_contents (INSERT), tenant_isolate_select_tas_section2_contents (SELECT), tenant_isolate_update_tas_section2_contents (UPDATE), write_lock_delete_tas_section2_contents (DELETE), write_lock_insert_tas_section2_contents (INSERT), write_lock_update_tas_section2_contents (UPDATE)

### tas_summary_theme_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, pack_version (text) NOT NULL, synthesis (jsonb) NOT NULL, inputs_hash (text) NOT NULL, created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_summary_theme_packs (DELETE), tenant_isolate_insert_tas_summary_theme_packs (INSERT), tenant_isolate_select_tas_summary_theme_packs (SELECT), tenant_isolate_update_tas_summary_theme_packs (UPDATE), write_lock_delete_tas_summary_theme_packs (DELETE), write_lock_insert_tas_summary_theme_packs (INSERT), write_lock_update_tas_summary_theme_packs (UPDATE)

### tas_timetable_events
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, unit_code (text) NOT NULL, unit_title (text) NOT NULL, week_number (integer) NOT NULL, session_number (integer) NOT NULL, start_at (timestamp with time zone), end_at (timestamp with time zone), mode (text) NOT NULL, location (text), schema_version (integer) NOT NULL, generated_at (timestamp with time zone) NOT NULL, generated_by (uuid), created_at (timestamp with time zone) NOT NULL, created_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_delete_tas_timetable_events (DELETE), tenant_isolate_insert_tas_timetable_events (INSERT), tenant_isolate_select_tas_timetable_events (SELECT), tenant_isolate_update_tas_timetable_events (UPDATE), write_lock_delete_tas_timetable_events (DELETE), write_lock_insert_tas_timetable_events (INSERT), write_lock_update_tas_timetable_events (UPDATE)

### tas_trainer_coverage_snapshots
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, coverage_percent (numeric) NOT NULL, covered_count (integer) NOT NULL, under_direction_count (integer) NOT NULL, no_coverage_count (integer) NOT NULL, tae_current_count (integer) NOT NULL, need_review_count (integer) NOT NULL, summary (jsonb) NOT NULL, schema_version (integer) NOT NULL, generated_at (timestamp with time zone) NOT NULL, generated_by (uuid) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tas_trainer_coverage_snapshots_insert (INSERT), tas_trainer_coverage_snapshots_select (SELECT), tenant_isolate_delete_tas_trainer_coverage_snapshots (DELETE), tenant_isolate_insert_tas_trainer_coverage_snapshots (INSERT), tenant_isolate_select_tas_trainer_coverage_snapshots (SELECT), tenant_isolate_update_tas_trainer_coverage_snapshots (UPDATE)

### tas_unit_benchmarks
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, unit_code (text) NOT NULL, nominal_hours (numeric), nominal_hours_source_url (text), companion_urls (ARRAY) NOT NULL, companion_factors (jsonb) NOT NULL, complexity_score (numeric) NOT NULL, confidence (numeric) NOT NULL, risk_flags (ARRAY) NOT NULL, inputs_hash (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), evidence_refs (ARRAY), source_version (text), verified_at (timestamp with time zone), verified_by (uuid), retention_until (timestamp with time zone), stale (boolean) NOT NULL
- RLS: enabled, policies: Tenant members can delete benchmarks (DELETE), Tenant members can insert benchmarks (INSERT), Tenant members can read benchmarks (SELECT), Tenant members can update benchmarks (UPDATE), billing_gate (ALL), tenant_isolate_delete_tas_unit_benchmarks (DELETE), tenant_isolate_insert_tas_unit_benchmarks (INSERT), tenant_isolate_select_tas_unit_benchmarks (SELECT), tenant_isolate_update_tas_unit_benchmarks (UPDATE), write_lock_delete_tas_unit_benchmarks (DELETE), write_lock_insert_tas_unit_benchmarks (INSERT), write_lock_update_tas_unit_benchmarks (UPDATE)

### tas_unit_delivery_hours
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, unit_code (text) NOT NULL, face_to_face_hours (numeric) NOT NULL, structured_online_hours (numeric) NOT NULL, self_paced_hours (numeric) NOT NULL, workplace_hours (numeric) NOT NULL, assessment_hours (numeric) NOT NULL, total_hours (numeric) NOT NULL, source_pack_id (uuid), source_inputs_hash (text), applied_at (timestamp with time zone) NOT NULL, applied_by (uuid) NOT NULL
- RLS: enabled, policies: Tenant members can insert delivery hours (INSERT), Tenant members can update delivery hours (UPDATE), Tenant members can view delivery hours (SELECT), billing_gate (ALL), tas_unit_delivery_hours_insert (INSERT), tas_unit_delivery_hours_update (UPDATE), tenant_isolate_delete_tas_unit_delivery_hours (DELETE), tenant_isolate_insert_tas_unit_delivery_hours (INSERT), tenant_isolate_select_tas_unit_delivery_hours (SELECT), tenant_isolate_update_tas_unit_delivery_hours (UPDATE)

### tas_unit_rationales
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, rationale_version (text) NOT NULL, prompt_version (text) NOT NULL, scope (text) NOT NULL, unit_group_key (text), content (jsonb) NOT NULL, evidence_refs (ARRAY) NOT NULL, risk_flags (ARRAY) NOT NULL, inputs_hash (text) NOT NULL, generated_by (uuid), generated_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, stale (boolean) NOT NULL, created_by (uuid), updated_by (uuid), retention_until (timestamp with time zone)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tas_unit_rationales_delete (DELETE), tas_unit_rationales_insert (INSERT), tas_unit_rationales_select (SELECT), tas_unit_rationales_update (UPDATE), tenant_isolate_delete_tas_unit_rationales (DELETE), tenant_isolate_insert_tas_unit_rationales (INSERT), tenant_isolate_select_tas_unit_rationales (SELECT), tenant_isolate_update_tas_unit_rationales (UPDATE), write_lock_delete_tas_unit_rationales (DELETE), write_lock_insert_tas_unit_rationales (INSERT), write_lock_update_tas_unit_rationales (UPDATE)

### tas_unit_weight_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, pack_version (text) NOT NULL, unit_weights (jsonb) NOT NULL, total_weight (numeric) NOT NULL, average_complexity (numeric) NOT NULL, max_complexity (numeric) NOT NULL, min_complexity (numeric) NOT NULL, inputs_hash (text) NOT NULL, generated_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, stale (boolean) NOT NULL, created_by (uuid), updated_by (uuid), retention_until (timestamp with time zone)
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), tas_unit_weight_packs_delete (DELETE), tas_unit_weight_packs_insert (INSERT), tas_unit_weight_packs_select (SELECT), tas_unit_weight_packs_update (UPDATE), tenant_isolate_delete_tas_unit_weight_packs (DELETE), tenant_isolate_insert_tas_unit_weight_packs (INSERT), tenant_isolate_select_tas_unit_weight_packs (SELECT), tenant_isolate_update_tas_unit_weight_packs (UPDATE), write_lock_delete_tas_unit_weight_packs (DELETE), write_lock_insert_tas_unit_weight_packs (INSERT), write_lock_update_tas_unit_weight_packs (UPDATE)

### tas_variation_reasons
- Columns: code (text) NOT NULL, label (text) NOT NULL, is_active (boolean) NOT NULL
- RLS: enabled, policies: Authenticated users can read variation reasons (SELECT)

### task_comments
- Columns: id (uuid) NOT NULL, task_id (uuid) NOT NULL, user_id (uuid) NOT NULL, comment (text) NOT NULL, tenant_id (uuid), created_at (timestamp with time zone) NOT NULL
- FKs: task_id -> tasks.id
- RLS: enabled, policies: billing_gate (ALL), write_lock_delete_task_comments (DELETE), write_lock_insert_task_comments (INSERT), write_lock_update_task_comments (UPDATE)

### task_history
- Columns: id (uuid) NOT NULL, tenant_id (uuid), task_id (uuid) NOT NULL, user_id (uuid) NOT NULL, action (text) NOT NULL, old_value (text), new_value (text), created_at (timestamp with time zone) NOT NULL
- FKs: task_id -> tasks.id
- RLS: enabled, policies: billing_gate (ALL), task_history_insert_policy (INSERT), task_history_select_policy (SELECT), write_lock_delete_task_history (DELETE), write_lock_insert_task_history (INSERT), write_lock_update_task_history (UPDATE)

### tasks
- Columns: id (uuid) NOT NULL, title (text) NOT NULL, description (text), status (text), priority (text), assigned_to (uuid), due_date (date) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), rto_standard (text), task_type (text), linked_registers (ARRAY), completion_date (date), linked_module (text), is_recurring (boolean), reminder_sent (boolean), visibility (text), notes (text), register_entry_id (uuid), tenant_id (uuid), is_demo (boolean), priority_level (text), link_id (uuid), assigned_by (uuid), action_status (text)
- FKs: created_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_tasks (SELECT), service_role_bypass (ALL), tasks_delete (DELETE), tasks_insert (INSERT), tasks_select (SELECT), tasks_update (UPDATE), write_lock_delete_tasks (DELETE), write_lock_insert_tasks (INSERT), write_lock_update_tasks (UPDATE)

### tcr_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, trainer_name (text) NOT NULL, position (text) NOT NULL, credential_type_code (text) NOT NULL, issued_by_rto_name (text) NOT NULL, issue_date (date) NOT NULL, expiry_date (date) NOT NULL, evidence_of_currency (text), evidence_upload_url (text), next_review_date (date), risk_level (text), status (text), notes (text), tenant_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), responsible_person (uuid), responsible_role (text), due_date (date), trainer_id (uuid), credential_name (text)
- FKs: trainer_id -> tp_trainers.id
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_tcr_register (SELECT), tcr_reg_delete (DELETE), tcr_reg_insert (INSERT), tcr_reg_select (SELECT), tcr_reg_update (UPDATE), write_lock_delete_tcr_register (DELETE), write_lock_insert_tcr_register (INSERT), write_lock_update_tcr_register (UPDATE)

### tenant_activity_events
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, user_id (uuid) NOT NULL, event_type (text) NOT NULL, feature_name (text) NOT NULL, route (text), meta (jsonb), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Super admins can view all activity events (SELECT), Users can insert own activity events (INSERT), billing_gate (ALL), write_lock_delete_tenant_activity_events (DELETE), write_lock_insert_tenant_activity_events (INSERT), write_lock_update_tenant_activity_events (UPDATE)

### tenant_addresses
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, address_type (text) NOT NULL, address1 (text) NOT NULL, address2 (text), address3 (text), suburb (text), state (text), postcode (text), country (text) NOT NULL, country_code (text) NOT NULL, latitude (numeric), longitude (numeric), geohash (text), inactive (boolean), full_address (text), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id, address_type -> dd_address_type.code
- RLS: enabled, policies: billing_gate (ALL), tenant_addresses_delete (DELETE), tenant_addresses_insert (INSERT), tenant_addresses_select (SELECT), tenant_addresses_update (UPDATE), write_lock_delete_tenant_addresses (DELETE), write_lock_insert_tenant_addresses (INSERT), write_lock_update_tenant_addresses (UPDATE)

### tenant_audit_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, user_id (uuid) NOT NULL, action (text) NOT NULL, field_changed (text), old_value (text), new_value (text), metadata (jsonb), timestamp (timestamp with time zone), user_email (text), user_name (text)
- RLS: enabled, policies: billing_gate (ALL), tenant_audit_log_super_admin_only (ALL), write_lock_delete_tenant_audit_log (DELETE), write_lock_insert_tenant_audit_log (INSERT), write_lock_update_tenant_audit_log (UPDATE)

### tenant_branding
- Columns: tenant_id (uuid) NOT NULL, logo_url (text), brand_primary (text), brand_secondary (text), updated_at (timestamp with time zone) NOT NULL, brand_accent (text)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_branding_tenant_access (ALL), write_lock_delete_tenant_branding (DELETE), write_lock_insert_tenant_branding (INSERT), write_lock_update_tenant_branding (UPDATE)

### tenant_clause_assessment_audit
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, assessment_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, old_status (text), new_status (text) NOT NULL, changed_by (uuid) NOT NULL, changed_at (timestamp with time zone) NOT NULL, rationale (text)
- FKs: assessment_id -> tenant_clause_assessments.id
- RLS: enabled, policies: billing_gate (ALL), tcaa_insert (INSERT), tcaa_select (SELECT), write_lock_delete_tenant_clause_assessment_audit (DELETE), write_lock_insert_tenant_clause_assessment_audit (INSERT), write_lock_update_tenant_clause_assessment_audit (UPDATE)

### tenant_clause_assessments
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, status (text) NOT NULL, assessed_by (uuid), assessed_at (timestamp with time zone), rationale (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, evidence_url (text)
- FKs: clause_id -> compliance_clauses.id, tenant_id -> tenants.tenant_id, assessed_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), service_role_bypass (ALL), tenant_clause_assessments_tenant_access (ALL), write_lock_delete_tenant_clause_assessments (DELETE), write_lock_insert_tenant_clause_assessments (INSERT), write_lock_update_tenant_clause_assessments (UPDATE)

### tenant_clause_assessments_audit
- Columns: id (uuid) NOT NULL, assessment_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, old_status (text), new_status (text) NOT NULL, old_rationale (text), new_rationale (text), changed_by (uuid) NOT NULL, changed_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Service role can insert audit (INSERT), Tenant members can view their audit log (SELECT), billing_gate (ALL), write_lock_delete_tenant_clause_assessments_audit (DELETE), write_lock_insert_tenant_clause_assessments_audit (INSERT), write_lock_update_tenant_clause_assessments_audit (UPDATE)

### tenant_clause_evidence
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, module_key (text) NOT NULL, record_type (text) NOT NULL, record_id (uuid) NOT NULL, evidence_status (text) NOT NULL, last_checked_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL
- FKs: clause_id -> compliance_clauses.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_tenant_clause_evidence (DELETE), write_lock_insert_tenant_clause_evidence (INSERT), write_lock_update_tenant_clause_evidence (UPDATE)

### tenant_compliance_actions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, action_title (text) NOT NULL, severity (text) NOT NULL, due_date (date), status (text) NOT NULL, assigned_to (uuid), created_by (uuid), created_at (timestamp with time zone) NOT NULL, closed_at (timestamp with time zone), closed_by (uuid)
- FKs: tenant_id -> tenants.tenant_id, closed_by -> auth.users.id, assigned_to -> auth.users.id, clause_id -> compliance_clauses.id, created_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_tenant_compliance_actions (DELETE), write_lock_insert_tenant_compliance_actions (INSERT), write_lock_update_tenant_compliance_actions (UPDATE)

### tenant_email_domains
- Columns: domain (text) NOT NULL, tenant_id (uuid), created_at (timestamp with time zone), is_support_inbox (boolean), updated_at (timestamp with time zone), verification_state (text) NOT NULL, verification_method (text), verification_email (text), verification_token_hash (text), verification_expires_at (timestamp with time zone), verification_attempts (integer) NOT NULL, verified_at (timestamp with time zone), verified_by (uuid)
- FKs: verified_by -> auth.users.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_tenant_email_domains (DELETE), write_lock_insert_tenant_email_domains (INSERT), write_lock_update_tenant_email_domains (UPDATE)

### tenant_feature_flags
- Columns: tenant_id (uuid) NOT NULL, allow_view_as (boolean) NOT NULL, created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: tenant_id -> organisations_tbl.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_tenant_feature_flags (ALL), write_lock_delete_tenant_feature_flags (DELETE), write_lock_insert_tenant_feature_flags (INSERT), write_lock_update_tenant_feature_flags (UPDATE)

### tenant_flags
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, is_demo (boolean), data_locked (boolean), pii_export_blocked (boolean), feature_flags (jsonb) NOT NULL, updated_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_tenant_flags (ALL), write_lock_delete_tenant_flags (DELETE), write_lock_insert_tenant_flags (INSERT), write_lock_update_tenant_flags (UPDATE)

### tenant_governance_settings
- Columns: tenant_id (uuid) NOT NULL, enable_meetings (boolean) NOT NULL, frequency (text) NOT NULL, anchor_weekday (integer), anchor_time (time without time zone), next_meeting (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), created_by (uuid), scheduled_at (timestamp with time zone), recurrence_pattern (text), recurrence_weekday (text), default_attendees (jsonb), agenda_template (jsonb), checklist_template (jsonb), responsible_roles (ARRAY), notifications (jsonb), trainer_reports_enabled (boolean) NOT NULL, sso_reports_enabled (boolean) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), tenant_gov_settings_insert_restricted (INSERT), tenant_gov_settings_select_restricted (SELECT), tenant_gov_settings_update_restricted (UPDATE), write_lock_delete_tenant_governance_settings (DELETE), write_lock_insert_tenant_governance_settings (INSERT), write_lock_update_tenant_governance_settings (UPDATE)

### tenant_health_alerts
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, alert_type (text) NOT NULL, severity (text), title (text) NOT NULL, description (text), triggered_at (timestamp with time zone), acknowledged_at (timestamp with time zone), acknowledged_by (uuid), resolved_at (timestamp with time zone), metadata (jsonb), created_at (timestamp with time zone), resolved (boolean) NOT NULL, resolved_by (uuid), suggested_action (text)
- FKs: tenant_id -> tenants.tenant_id, acknowledged_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_health_alerts_super_admin (ALL), tha_read (SELECT), tha_write (ALL), write_lock_delete_tenant_health_alerts (DELETE), write_lock_insert_tenant_health_alerts (INSERT), write_lock_update_tenant_health_alerts (UPDATE)

### tenant_health_scores
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, overall_score (integer), user_engagement_score (integer), financial_health_score (integer), compliance_score (integer), growth_score (integer), factors (jsonb), last_calculated (timestamp with time zone), created_at (timestamp with time zone), updated_at (timestamp with time zone), band (text), login_score (integer), data_score (integer), feature_score (integer), alerts (jsonb)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_health_scores_super_admin (ALL), ths_read (SELECT), write_lock_delete_tenant_health_scores (DELETE), write_lock_insert_tenant_health_scores (INSERT), write_lock_update_tenant_health_scores (UPDATE)

### tenant_join_requests
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, requester_id (uuid) NOT NULL, email (text) NOT NULL, domain (text) NOT NULL, status (text) NOT NULL, reviewed_by (uuid), reviewed_at (timestamp with time zone), token_hash (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id, reviewed_by -> profiles.id, requester_id -> profiles.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_tenant_join_requests (DELETE), write_lock_insert_tenant_join_requests (INSERT), write_lock_update_tenant_join_requests (UPDATE)

### tenant_lifecycle_events
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, event_type (text) NOT NULL, from_lifecycle_status (text), to_lifecycle_status (text), old_values (jsonb), new_values (jsonb), reason (text), notes (text), trigger_source (text) NOT NULL, triggered_by (uuid), event_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: tle_deny_all (ALL), tle_superadmin_read (SELECT)

### tenant_members
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, role (text) NOT NULL, email (text) NOT NULL, phone_number (text), status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, position (text), last_login (timestamp with time zone), roles (jsonb) NOT NULL, first_name (text), last_name (text), full_name (text), is_internal_staff (boolean) NOT NULL
- FKs: user_id -> profiles.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Admins can add tenant members (INSERT), Admins can delete tenant members (DELETE), Admins can update tenant members (UPDATE), SuperAdmins can view all memberships (SELECT), Users can switch own role (UPDATE), Users can view tenant members (SELECT), billing_gate (ALL), write_lock_delete_tenant_members (DELETE), write_lock_insert_tenant_members (INSERT), write_lock_update_tenant_members (UPDATE)

### tenant_offboarding
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, initiated_by (uuid) NOT NULL, offboarding_type (text) NOT NULL, reason (text), data_retention_days (integer), data_exported (boolean), users_notified (boolean), completed_at (timestamp with time zone), status (text), metadata (jsonb), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: tenant_id -> tenants.tenant_id, initiated_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_offboarding_super_admin (ALL), write_lock_delete_tenant_offboarding (DELETE), write_lock_insert_tenant_offboarding (INSERT), write_lock_update_tenant_offboarding (UPDATE)

### tenant_onboarding
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, step_key (text) NOT NULL, step_name (text) NOT NULL, step_description (text), status (text), completed_at (timestamp with time zone), completed_by (uuid), metadata (jsonb), order_index (integer) NOT NULL, is_required (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: tenant_id -> tenants.tenant_id, completed_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_onboarding_super_admin (ALL), write_lock_delete_tenant_onboarding (DELETE), write_lock_insert_tenant_onboarding (INSERT), write_lock_update_tenant_onboarding (UPDATE)

### tenant_plans
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, plan (text) NOT NULL, trial_ends_at (timestamp with time zone), status (text) NOT NULL, notes (text), created_at (timestamp with time zone), updated_at (timestamp with time zone), tier (USER-DEFINED), trial_expires_at (timestamp with time zone), subscription_started_at (timestamp with time zone), billing_provider (text), first_month_free (boolean)
- RLS: enabled, policies: billing_gate (ALL), tenant_plans_read (SELECT), tenant_plans_write (ALL), write_lock_delete_tenant_plans (DELETE), write_lock_insert_tenant_plans (INSERT), write_lock_update_tenant_plans (UPDATE)

### tenant_preferences
- Columns: tenant_id (uuid) NOT NULL, language_locale (text) NOT NULL, date_format (text) NOT NULL, timezone (text) NOT NULL, compliance_alerts (boolean) NOT NULL, reminder_frequency (text) NOT NULL, export_pdf (boolean) NOT NULL, export_csv (boolean) NOT NULL, export_docx (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_tenant_preferences (ALL), write_lock_delete_tenant_preferences (DELETE), write_lock_insert_tenant_preferences (INSERT), write_lock_update_tenant_preferences (UPDATE)

### tenant_regulatory_impacts
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, global_update_id (uuid) NOT NULL, tenant_risk_level (text), tenant_risk_summary (text), mapped_risks (jsonb), recommended_actions (jsonb), tenant_context_hash (text) NOT NULL, analysis_version (text) NOT NULL, analysed_by (uuid), analysed_at (timestamp with time zone), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: global_update_id -> global_regulatory_updates.id
- RLS: enabled, policies: billing_gate (ALL), tenant_reg_impacts_insert (INSERT), tenant_reg_impacts_select (SELECT), tenant_reg_impacts_update (UPDATE), write_lock_delete_tenant_regulatory_impacts (DELETE), write_lock_insert_tenant_regulatory_impacts (INSERT), write_lock_update_tenant_regulatory_impacts (UPDATE)

### tenant_regulatory_update_links
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, global_update_id (uuid) NOT NULL, relevance (text), status (text), acknowledged_by (uuid), acknowledged_at (timestamp with time zone), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: global_update_id -> global_regulatory_updates.id
- RLS: enabled, policies: billing_gate (ALL), super_admin_delete_links (DELETE), super_admin_insert_links (INSERT), tenant_read_links (SELECT), tenant_update_links (UPDATE), write_lock_delete_tenant_regulatory_update_links (DELETE), write_lock_insert_tenant_regulatory_update_links (INSERT), write_lock_update_tenant_regulatory_update_links (UPDATE)

### tenant_role_configs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, role_key (text) NOT NULL, role_name (text) NOT NULL, description (text), permissions (jsonb) NOT NULL, is_system (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_tenant_role_configs (DELETE), write_lock_insert_tenant_role_configs (INSERT), write_lock_update_tenant_role_configs (UPDATE)

### tenant_rto_profile
- Columns: id (bigint) NOT NULL, tenant_id (uuid) NOT NULL, rto_id (text) NOT NULL, legal_name (text), trading_name (text), abn (text), status (text), regulator (text), registration_start (date), registration_end (date), head_office_address (jsonb), contact (jsonb), last_refreshed_at (timestamp with time zone), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_tenant_rto_profile (DELETE), write_lock_insert_tenant_rto_profile (INSERT), write_lock_update_tenant_rto_profile (UPDATE)

### tenant_rto_scope
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, code (text) NOT NULL, title (text) NOT NULL, scope_type (text) NOT NULL, status (text) NOT NULL, is_superseded (boolean), superseded_by (text), last_refreshed_at (timestamp with time zone), created_at (timestamp with time zone), updated_at (timestamp with time zone), tga_data (jsonb)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_rto_scope_tenant_access (ALL), write_lock_delete_tenant_rto_scope (DELETE), write_lock_insert_tenant_rto_scope (INSERT), write_lock_update_tenant_rto_scope (UPDATE)

### tenant_scope_items
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, training_product_code (text) NOT NULL, scope_state (USER-DEFINED) NOT NULL, notes (text), evidence_files (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tsi_insert_admin (INSERT), tsi_select_tenant (SELECT), tsi_service_role (ALL), tsi_update_admin (UPDATE), write_lock_delete_tenant_scope_items (DELETE), write_lock_insert_tenant_scope_items (INSERT), write_lock_update_tenant_scope_items (UPDATE)

### tenant_settings
- Columns: tenant_id (uuid) NOT NULL, is_demo (boolean) NOT NULL, tour_mode_enabled (boolean) NOT NULL, tour_mode_default_on_for_new_users (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, is_demo_mode (boolean) NOT NULL, rto_id (text), tga_connected (boolean) NOT NULL, tga_last_synced_at (timestamp with time zone), abn (text), company_email (text), website (text), trading_name (text), rto_name (text), timezone (text), date_format (text), notification_frequency (text)
- RLS: enabled, policies: billing_gate (ALL), tenant_settings_tenant_access (ALL), write_lock_delete_tenant_settings (DELETE), write_lock_insert_tenant_settings (INSERT), write_lock_update_tenant_settings (UPDATE)

### tenant_subscriptions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, billing_provider (text) NOT NULL, tier (text) NOT NULL, status (text) NOT NULL, trial_end_date (date), stripe_customer_id (text), stripe_subscription_id (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), write_lock_delete_tenant_subscriptions (DELETE), write_lock_insert_tenant_subscriptions (INSERT), write_lock_update_tenant_subscriptions (UPDATE)

### tenant_sync_jobs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, sync_type (text) NOT NULL, source (text) NOT NULL, status (text) NOT NULL, started_at (timestamp with time zone) NOT NULL, completed_at (timestamp with time zone), message (text), error_details (jsonb), meta (jsonb), created_at (timestamp with time zone) NOT NULL, supersession_issues_found (integer), supersession_alerts_created (integer)
- RLS: enabled, policies: billing_gate (ALL), tenant_sync_jobs_super_admin (ALL), tenant_sync_jobs_tenant_view (SELECT), write_lock_delete_tenant_sync_jobs (DELETE), write_lock_insert_tenant_sync_jobs (INSERT), write_lock_update_tenant_sync_jobs (UPDATE)

### tenant_watchlist
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, added_by (uuid) NOT NULL, reason (text), priority (text), notes (text), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: added_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_watchlist_super_admin (ALL), write_lock_delete_tenant_watchlist (DELETE), write_lock_insert_tenant_watchlist (INSERT), write_lock_update_tenant_watchlist (UPDATE)

### tenants
- Columns: tenant_id (uuid) NOT NULL, tenant_name (text) NOT NULL, name (text) NOT NULL, legal_name (text), trading_name (text), owner_id (uuid), contact_email (text), main_contact_email (text), status (text) NOT NULL, subscription_status (text) NOT NULL, trial_ends (timestamp with time zone), organisation_type (text) NOT NULL, setup_completed (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, billing_customer_id (text), subscription_id (text), is_demo (boolean), enabled_registers (jsonb), rto_details (jsonb), branding (jsonb), compliance_prefs (jsonb), key_contacts (jsonb), onboarding_settings (jsonb), config (jsonb) NOT NULL, trial_expires_at (timestamp with time zone), slug (text) NOT NULL, risk_level (text) NOT NULL, rto_id (text), is_rto (boolean), target_audit_date (date), non_rto_notes (text), abn (text), acn (text), ceo_name (text), compliance_officer (text), phone (text), company_email (text), website (text), billing_contact (text), main_contact_name (text), trial_started_at (timestamp with time zone), plan (text), is_trial (boolean), reminder_frequency (text), account_type (USER-DEFINED), creation_method (text), billing_trial_ends_at (timestamp with time zone), tga_snapshot (jsonb), tga_legal_name (text), tga_status (text), tga_abn (text), tga_website (text), tga_last_synced_at (timestamp with time zone), time_zone (text) NOT NULL, trial_length_days (integer), subscription_source (text), stripe_customer_id (text), stripe_subscription_id (text), stripe_price_id (text), current_plan (text), is_diamond (boolean) NOT NULL, diamond_since (timestamp with time zone), diamond_notes (text), registration_start (date), registration_end (date), tenant_type (USER-DEFINED), lifecycle_status (USER-DEFINED), trial_start_date (timestamp with time zone), trial_end_date (timestamp with time zone), archived_at (timestamp with time zone), archived_reason (text), write_locked (boolean) NOT NULL, terms_accepted_at (timestamp with time zone), terms_accepted_by (uuid), locked_reason (text), grace_ends_at (timestamp with time zone), pending_tier (text), pending_tier_effective_at (timestamp with time zone), billing_company_name (text), billing_email (text), trial_consumed (boolean) NOT NULL, payment_migration_required (boolean) NOT NULL, payment_migration_due_date (date), payment_migration_status (text) NOT NULL, payment_migration_last_prompted_at (timestamp with time zone), has_stripe_payment_method (boolean) NOT NULL, is_external (boolean) NOT NULL, billing_source (text), paid_through_date (timestamp with time zone), renewal_date (timestamp with time zone), requires_payment_method (boolean), converted_at (timestamp with time zone), cancelled_at (timestamp with time zone), suspended_at (timestamp with time zone), reactivated_at (timestamp with time zone), lifecycle_reason (text), lifecycle_notes (text), operational_status (text), billing_status (text), renewal_action_required (boolean) NOT NULL, has_had_trial (boolean) NOT NULL, allow_email_domain_autojoin (boolean) NOT NULL, id (uuid), cricos_provider_code (text), lms_name (text), llnd_provider (text), llnd_assessment_instrument (text), english_evidence_policy (jsonb), acsf_defaults (jsonb), delivery_sites (jsonb), funding_streams (ARRAY), trainer_pd_review_cadence (text), ai_enabled (boolean) NOT NULL, parent_consultant_org_id (uuid)
- FKs: parent_consultant_org_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), read_tenant (SELECT), write_admin (ALL), write_lock_delete_tenants (DELETE), write_lock_insert_tenants (INSERT), write_lock_update_tenants (UPDATE)

### tga_assessment_evidence_items
- Columns: id (text) NOT NULL, unit_code (text) NOT NULL, source_release (text) NOT NULL, evidence_type (text) NOT NULL, ordinal (integer) NOT NULL, text (text) NOT NULL, parser_version (text) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: unit_code, source_release -> tga_companion_parsed.unit_code, source_release
- RLS: enabled, policies: Authenticated read evidence items (SELECT)

### tga_cache
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, product_code (text) NOT NULL, product_type (text) NOT NULL, product_title (text) NOT NULL, release_status (text), release_date (date), superseded_date (date), superseded_by (text), tga_metadata (jsonb), checksum (text), fetched_at (timestamp with time zone) NOT NULL, expires_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), tenant_isolate_select_tga_cache (SELECT), write_lock_delete_tga_cache (DELETE), write_lock_insert_tga_cache (INSERT), write_lock_update_tga_cache (UPDATE)

### tga_companion_cache
- Columns: unit_code (text) NOT NULL, companion_urls (ARRAY) NOT NULL, extracted_factors (jsonb) NOT NULL, retrieved_at (timestamp with time zone) NOT NULL, raw_payload (text)
- RLS: enabled, policies: Anyone can read TGA companion cache (SELECT)

### tga_companion_files
- Columns: id (uuid) NOT NULL, package_code (text) NOT NULL, release (text) NOT NULL, title (text) NOT NULL, uri (text) NOT NULL, file_category (text), created_on (timestamp with time zone), state (text), raw (jsonb), ingested_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Public read tga_companion_files (SELECT), Service insert tga_companion_files (INSERT), Service update tga_companion_files (UPDATE)

### tga_companion_parsed
- Columns: unit_code (text) NOT NULL, source_companion_file_id (uuid), source_release (text) NOT NULL, source_package_code (text), performance_criteria_count (integer), elements_count (integer), performance_evidence_text (text), performance_evidence_word_count (integer), performance_evidence_item_count (integer), knowledge_evidence_text (text), knowledge_evidence_word_count (integer), knowledge_evidence_item_count (integer), foundation_skills_count (integer), foundation_skills_raw (text), assessment_conditions_text (text), assessment_conditions_signals (jsonb) NOT NULL, raw_text (text), parser_version (text) NOT NULL, parser_flags (ARRAY) NOT NULL, parsed_at (timestamp with time zone) NOT NULL, retention_until (timestamp with time zone)
- FKs: source_companion_file_id -> tga_companion_files.id
- RLS: enabled, policies: tga_companion_parsed_read_authenticated (SELECT), tga_companion_parsed_write_service_role (ALL)

### tga_packages
- Columns: package_code (text) NOT NULL, current_release (text) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Public read tga_packages (SELECT), Service insert tga_packages (INSERT), Service update tga_packages (UPDATE)

### tga_pre_import
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, rto_id (text) NOT NULL, preimport_snapshot (jsonb) NOT NULL, created_at (timestamp with time zone), skillset_snapshot (jsonb), units_snapshot (jsonb), courses_snapshot (jsonb), created_by (uuid), updated_at (timestamp with time zone)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_select_tga_pre_import (SELECT), tga_pre_import_delete (DELETE), tga_pre_import_insert (INSERT), tga_pre_import_select (SELECT), tga_pre_import_update (UPDATE)

### tga_rto_snapshots
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, rto_id (text) NOT NULL, fetched_at (timestamp with time zone) NOT NULL, source_url (text) NOT NULL, raw_html_len (integer), raw_sha256 (text), legal_name (text), business_names (ARRAY), status (text), abn (text), acn (text), rto_type (text), website (text), registration_manager (text), initial_registration_date (date), start_date (date), end_date (date), legal_authority (text), exerciser (text), chief_exec (jsonb), registration_enquiries (jsonb), public_enquiries (jsonb), physical_address (text), postal_address (text), scope_overview (text), qualifications (jsonb), skill_sets (jsonb), units (jsonb), courses (jsonb)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tga_rto_snapshots_tenant_access (ALL), write_lock_delete_tga_rto_snapshots (DELETE), write_lock_insert_tga_rto_snapshots (INSERT), write_lock_update_tga_rto_snapshots (UPDATE)

### tga_sync_jobs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, rto_id (text) NOT NULL, status (text) NOT NULL, attempts (integer) NOT NULL, last_error (text), payload (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tga_sync_jobs_tenant_access (ALL), write_lock_delete_tga_sync_jobs (DELETE), write_lock_insert_tga_sync_jobs (INSERT), write_lock_update_tga_sync_jobs (UPDATE)

### tga_sync_runs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, started_at (timestamp with time zone) NOT NULL, completed_at (timestamp with time zone), mode (text), types (jsonb), records_fetched (integer), records_inserted (integer), records_updated (integer), status (text) NOT NULL, error (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tsr_insert (INSERT), tsr_select (SELECT), tsr_update (UPDATE), write_lock_delete_tga_sync_runs (DELETE), write_lock_insert_tga_sync_runs (INSERT), write_lock_update_tga_sync_runs (UPDATE)

### tga_unit_parents
- Columns: unit_code (text) NOT NULL, package_code (text) NOT NULL, unit_title (text), current_release (text), raw (jsonb), updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Public read tga_unit_parents (SELECT), Service insert tga_unit_parents (INSERT), Service update tga_unit_parents (UPDATE)

### third_parties
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, name (text) NOT NULL, abn (text), status (text), agreement_start (date), agreement_end (date), metadata (jsonb), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_third_parties (ALL), write_lock_delete_third_parties (DELETE), write_lock_insert_third_parties (INSERT), write_lock_update_third_parties (UPDATE)

### thp_dd_actions
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_thp_dd_actions (SELECT), read_authenticated (SELECT), super_admin_write_thp_dd_actions (ALL)

### thp_dd_agreement_status
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_thp_dd_agreement_status (SELECT), read_authenticated (SELECT), super_admin_write_thp_dd_agreement_status (ALL)

### thp_dd_agreement_type
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_thp_dd_agreement_type (SELECT), read_authenticated (SELECT), super_admin_write_thp_dd_agreement_type (ALL)

### thp_dd_issues
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_thp_dd_issues (SELECT), read_authenticated (SELECT), super_admin_write_thp_dd_issues (ALL)

### thp_dd_monitoring
- Columns: label (text) NOT NULL, id (integer) NOT NULL, description (text), value (text)
- RLS: enabled, policies: authenticated_read_thp_dd_monitoring (SELECT), super_admin_write_thp_dd_monitoring (ALL)

### thp_dd_monitoring_frequency
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL, sort_order (integer), is_active (boolean), created_at (timestamp with time zone)
- RLS: enabled, policies: authenticated_read_thp_dd_monitoring_frequency (SELECT), read_authenticated (SELECT), super_admin_write_thp_dd_monitoring_frequency (ALL)

### thp_dd_responsibilities
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_thp_dd_responsibilities (SELECT), super_admin_write_thp_dd_responsibilities (ALL)

### thp_dd_service_type
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL, sort_order (integer), is_active (boolean), created_at (timestamp with time zone)
- RLS: enabled, policies: authenticated_read_thp_dd_service_type (SELECT), super_admin_write_thp_dd_service_type (ALL)

### thp_dd_type
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_thp_dd_type (SELECT), read_authenticated (SELECT), super_admin_write_thp_dd_type (ALL)

### thp_register
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, organisation_name (text) NOT NULL, abn_acn (text), contact_person (text), contact_phone (text), contact_email (text), service_type (text) NOT NULL, training_products (ARRAY), agreement_start_date (date), agreement_end_date (date), agreement_status (text) NOT NULL, monitoring_frequency (text), last_monitoring_date (date), next_review_date (date), monitoring_outcome (text), non_compliances (text), corrective_actions (text), evidence_document_ids (ARRAY), supporting_documents (jsonb), risk_level (text), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), custom_id (text), responsible_officer (text), website (text), next_monitoring_date (date), monitoring_outcomes (text), monitoring_type (text), agreement_type (text), responsibilities (text), responsible_person (uuid), responsible_role (text), description (text), due_date (date), status (text), title (text)
- FKs: service_type -> thp_dd_service_type.value, agreement_status -> thp_dd_agreement_status.value, monitoring_frequency -> thp_dd_monitoring_frequency.value, risk_level -> dd_risk_level.value
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_thp_register (SELECT), thp_reg_delete (DELETE), thp_reg_insert (INSERT), thp_reg_select (SELECT), thp_reg_update (UPDATE), write_lock_delete_thp_register (DELETE), write_lock_insert_thp_register (INSERT), write_lock_update_thp_register (UPDATE)

### thp_register_ver1
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, agreement_date (date) NOT NULL, third_party_name (text) NOT NULL, arrangement_type (text) NOT NULL, scope (text), start_date (date) NOT NULL, end_date (date), responsible_officer (uuid), signed_agreement (boolean), quality_assurance_method (text), review_date (date), status (text), notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), tenant_id (uuid), risk_level (text), due_date (date)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_thp_register_ver1 (ALL), write_lock_delete_thp_register_ver1 (DELETE), write_lock_insert_thp_register_ver1 (INSERT), write_lock_update_thp_register_ver1 (UPDATE)

### tour_steps
- Columns: id (uuid) NOT NULL, tour_id (uuid) NOT NULL, step_order (integer) NOT NULL, title (text) NOT NULL, content (text) NOT NULL, target_selector (text), placement (text), page_path (text), is_modal (boolean), created_at (timestamp with time zone) NOT NULL
- FKs: tour_id -> tours.id
- RLS: enabled, policies: read_authenticated (SELECT), write_super_admin (ALL)

### tours
- Columns: id (uuid) NOT NULL, name (text) NOT NULL, description (text), target_role (text), is_active (boolean) NOT NULL, version (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: read_authenticated (SELECT), write_super_admin (ALL)

### tp_audit_trail
- Columns: id (uuid) NOT NULL, trainer_id (uuid), org_id (uuid) NOT NULL, action (text) NOT NULL, details (jsonb), performed_by (uuid), performed_at (timestamp with time zone), created_at (timestamp with time zone), tenant_id (uuid)
- FKs: trainer_id -> tp_trainers.id, performed_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_tp_audit_trail (ALL), write_lock_delete_tp_audit_trail (DELETE), write_lock_insert_tp_audit_trail (INSERT), write_lock_update_tp_audit_trail (UPDATE)

### tp_credentials
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, trainer_id (uuid) NOT NULL, org_id (uuid) NOT NULL, kind (text) NOT NULL, code (text), title (text) NOT NULL, issuer (text), issue_date (date), expiry_date (date), evidence_url (text), notes (text), status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), ai_confidence (integer), ai_parsed (boolean), tenant_id (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_tp_credentials (ALL), write_lock_delete_tp_credentials (DELETE), write_lock_insert_tp_credentials (INSERT), write_lock_update_tp_credentials (UPDATE)

### tp_dd_status
- Columns: id (integer) NOT NULL, value (text) NOT NULL, label (text) NOT NULL
- RLS: enabled, policies: authenticated_read_tp_dd_status (SELECT), read_authenticated (SELECT), super_admin_write_tp_dd_status (ALL)

### tp_experience
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, trainer_id (uuid) NOT NULL, org_id (uuid) NOT NULL, role_title (text) NOT NULL, employer (text) NOT NULL, start_date (date) NOT NULL, end_date (date), related_units (ARRAY), summary (text), evidence_url (text), relevance_score (integer), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), ai_confidence (integer), ai_parsed (boolean), tenant_id (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_tp_experience (ALL), write_lock_delete_tp_experience (DELETE), write_lock_insert_tp_experience (INSERT), write_lock_update_tp_experience (UPDATE)

### tp_matrix
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, trainer_id (uuid) NOT NULL, org_id (uuid) NOT NULL, matrix_version (integer) NOT NULL, status (text) NOT NULL, generated_date (timestamp with time zone) NOT NULL, published_at (timestamp with time zone), published_by (uuid), ai_confidence_score (numeric), metadata (jsonb), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), tenant_id (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_tp_matrix (ALL), write_lock_delete_tp_matrix (DELETE), write_lock_insert_tp_matrix (INSERT), write_lock_update_tp_matrix (UPDATE)

### tp_matrix_units
- Columns: id (uuid) NOT NULL, matrix_id (uuid) NOT NULL, unit_code (text) NOT NULL, unit_title (text), justification (text), evidence_refs (ARRAY), confidence_score (numeric), status (text) NOT NULL, approved_at (timestamp with time zone), approved_by (uuid), comments (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, tenant_id (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_tp_matrix_units (ALL), write_lock_delete_tp_matrix_units (DELETE), write_lock_insert_tp_matrix_units (INSERT), write_lock_update_tp_matrix_units (UPDATE)

### tp_monthly_reports
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, trainer_id (uuid) NOT NULL, org_id (uuid) NOT NULL, report_month (date) NOT NULL, fields_delta (jsonb), status (text) NOT NULL, submitted_at (timestamp with time zone), submitted_by (uuid), approved_at (timestamp with time zone), approved_by (uuid), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), tenant_id (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_tp_monthly_reports (ALL), write_lock_delete_tp_monthly_reports (DELETE), write_lock_insert_tp_monthly_reports (INSERT), write_lock_update_tp_monthly_reports (UPDATE)

### tp_pd_events
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, trainer_id (uuid) NOT NULL, org_id (uuid) NOT NULL, category (text) NOT NULL, title (text) NOT NULL, provider (text), hours (numeric) NOT NULL, start_date (date) NOT NULL, end_date (date), expiry_date (date), standards (ARRAY), units (ARRAY), tags (ARRAY), evidence_url (text), summary (text), status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), tenant_id (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_tp_pd_events (ALL), write_lock_delete_tp_pd_events (DELETE), write_lock_insert_tp_pd_events (INSERT), write_lock_update_tp_pd_events (UPDATE)

### tp_trainers
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, user_id (uuid), trainer_name (text) NOT NULL, email (text) NOT NULL, phone (text), position (text), employee_id (text), bio (text), profile_image_url (text), status (text) NOT NULL, last_matrix_published_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), metadata (jsonb), tenant_id (uuid) NOT NULL, vet_pd_completion_percentage (numeric), industry_pd_completion_percentage (numeric), wwcc_expiry_date (date), first_aid_expiry_date (date), cpr_expiry_date (date), last_vet_pd_date (date), last_industry_pd_date (date), archived_at (timestamp with time zone), archived_by (uuid), archive_reason (text), delete_requested (boolean), tae_credential_code (text), tae_credential_status (text), tae_credential_expiry (date), working_under_direction (boolean), supervision_required (boolean), qualifications (jsonb), industry_experience (jsonb), current_scope (jsonb), qualifications_summary (text), industry_currency_summary (text), full_name (text), role_type (text), wwcc_number (text)
- RLS: enabled, policies: billing_gate (ALL), regulator_select_tp_trainers (SELECT), restrict_sa_select_tp_trainers (SELECT), tp_trainers_tenant_access (ALL), write_lock_delete_tp_trainers (DELETE), write_lock_insert_tp_trainers (INSERT), write_lock_update_tp_trainers (UPDATE)

### trainer_assessment_decisions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, session_plan_id (uuid), assessment_task_id (uuid), unit_code (text) NOT NULL, unit_title (text), student_ref (text) NOT NULL, decision (text) NOT NULL, attempt_number (integer) NOT NULL, assessment_date (date) NOT NULL, evidence_notes (text), resubmission_required (boolean), resubmission_due_date (date), assessment_method (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), assessment_tool_id (uuid), retention_locked_until (timestamp with time zone)
- FKs: created_by -> auth.users.id, assessment_task_id -> dap_assessment_tasks.id, session_plan_id -> trainer_session_plans.id, trainer_id -> auth.users.id, assessment_tool_id -> assessment_tools.id, updated_by -> auth.users.id
- RLS: enabled, policies: block_deletion_within_retention_window (DELETE), tad_manager_read (SELECT), tad_trainer_own (ALL)

### trainer_clause_entitlement
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, clause_id (uuid) NOT NULL, entitlement_status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id, clause_id -> clauses.id
- RLS: enabled, policies: billing_gate (ALL), trainer_clause_entitlement_tenant_isolation (ALL), write_lock_delete_trainer_clause_entitlement (DELETE), write_lock_insert_trainer_clause_entitlement (INSERT), write_lock_update_trainer_clause_entitlement (UPDATE)

### trainer_credential_classification
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, classification (text) NOT NULL, can_train (boolean) NOT NULL, can_assess (boolean) NOT NULL, can_make_judgements (boolean) NOT NULL, requires_supervision (boolean) NOT NULL, can_supervise (boolean) NOT NULL, supervisor_trainer_id (uuid), supervision_start_date (date), supervision_plan (text), supervision_evidence_path (text), risk_flags (jsonb), last_computed_at (timestamp with time zone) NOT NULL, computed_by (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), policy_section (text), has_tae_full (boolean), has_tae_skill_set (boolean), has_assessor_skill_set (boolean), has_vocational (boolean), has_industry_currency (boolean), supervision_required (boolean), validation_eligible (boolean)
- FKs: trainer_id -> tp_trainers.id, tenant_id -> tenants.tenant_id, supervisor_trainer_id -> tp_trainers.id
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_trainer_credential_classification (SELECT), tenant_all (ALL), write_lock_delete_trainer_credential_classification (DELETE), write_lock_insert_trainer_credential_classification (INSERT), write_lock_update_trainer_credential_classification (UPDATE)

### trainer_credentials
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, credential_type (text) NOT NULL, credential_category (text) NOT NULL, issue_date (date), expiry_date (date), evidence_url (text), created_at (timestamp with time zone), updated_at (timestamp with time zone), status (text), evidence_document_id (uuid), validation_notes (text), credential_flags (jsonb), archived_at (timestamp with time zone), archived_by (uuid), archive_reason (text), hard_delete_after (timestamp with time zone)
- FKs: trainer_id -> tp_trainers.id
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_trainer_credentials (SELECT), tc_admin_cm_all (ALL), tc_trainer_self_insert (INSERT), tc_trainer_self_select (SELECT), tc_trainer_self_update (UPDATE), tenant_all (ALL), write_lock_delete_trainer_credentials (DELETE), write_lock_insert_trainer_credentials (INSERT), write_lock_update_trainer_credentials (UPDATE)

### trainer_currency_evidence
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, currency_type (text) NOT NULL, activity_date (date) NOT NULL, activity_end_date (date), description (text) NOT NULL, related_units (ARRAY), document_id (uuid), document_path (text), hours (numeric), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_trainer_currency_evidence (DELETE), write_lock_insert_trainer_currency_evidence (INSERT), write_lock_update_trainer_currency_evidence (UPDATE)

### trainer_document_audit
- Columns: id (uuid) NOT NULL, document_item_id (uuid), upload_job_id (uuid), tenant_id (uuid) NOT NULL, action (text) NOT NULL, performed_by (uuid) NOT NULL, details (jsonb), created_at (timestamp with time zone) NOT NULL
- FKs: document_item_id -> trainer_document_items.id, upload_job_id -> trainer_document_uploads.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant members can insert audit (INSERT), Tenant members can view own audit (SELECT), billing_gate (ALL), write_lock_delete_trainer_document_audit (DELETE), write_lock_insert_trainer_document_audit (INSERT), write_lock_update_trainer_document_audit (UPDATE)

### trainer_document_items
- Columns: id (uuid) NOT NULL, upload_job_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, file_name (text) NOT NULL, file_path (text) NOT NULL, file_size (integer), file_hash (text), mime_type (text), detected_type (text), classification_confidence (numeric), extracted_metadata (jsonb), is_duplicate (boolean), duplicate_of_item_id (uuid), is_outdated (boolean), outdated_reason (text), supersedes_document_id (uuid), expiry_date (date), issue_date (date), issuing_body (text), approval_status (text) NOT NULL, reviewed_by (uuid), reviewed_at (timestamp with time zone), review_notes (text), published_to_register_id (uuid), version_history_id (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: upload_job_id -> trainer_document_uploads.id, duplicate_of_item_id -> trainer_document_items.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_trainer_document_items (DELETE), write_lock_insert_trainer_document_items (INSERT), write_lock_update_trainer_document_items (UPDATE)

### trainer_document_uploads
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, uploaded_by (uuid) NOT NULL, status (text) NOT NULL, file_count (integer) NOT NULL, processed_count (integer), approved_count (integer), rejected_count (integer), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_trainer_document_uploads (DELETE), write_lock_insert_trainer_document_uploads (INSERT), write_lock_update_trainer_document_uploads (UPDATE)

### trainer_improvement_plan_actions
- Columns: id (uuid) NOT NULL, plan_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, issue_summary (text) NOT NULL, policy_reference (text), required_action (text) NOT NULL, evidence_required (text), responsible_party (text) NOT NULL, due_date (date) NOT NULL, severity (text) NOT NULL, status (text) NOT NULL, linked_matrix_rule (text), linked_action_type (text), evidence_url (text), submitted_at (timestamp with time zone), submitted_by (uuid), verified_at (timestamp with time zone), verified_by (uuid), verification_notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: plan_id -> trainer_improvement_plans.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_trainer_improvement_plan_actions (DELETE), write_lock_insert_trainer_improvement_plan_actions (INSERT), write_lock_update_trainer_improvement_plan_actions (UPDATE)

### trainer_improvement_plans
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, trainer_name (text) NOT NULL, status (text) NOT NULL, created_by (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, closed_at (timestamp with time zone), closed_by (uuid), original_classification (text), original_compliance_status (text), original_risk_flags (jsonb), notes (text)
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_trainer_improvement_plans (DELETE), write_lock_insert_trainer_improvement_plans (INSERT), write_lock_update_trainer_improvement_plans (UPDATE)

### trainer_industry_currency
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, activity_type (text) NOT NULL, activity_title (text) NOT NULL, organization (text), description (text), start_date (date) NOT NULL, end_date (date), hours (numeric), related_units (ARRAY), evidence_file_path (text), verified_by (uuid), verified_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), status (text), evidence_document_id (uuid), pd_compliance_category (text), reconciliation_status (text), relevance_to_role (text), hours_validated (numeric), reconciled_by (uuid), reconciled_at (timestamp with time zone), reconciliation_notes (text), evidence_files (jsonb) NOT NULL, archived_at (timestamp with time zone), archived_by (uuid), archive_reason (text), hard_delete_after (timestamp with time zone)
- FKs: trainer_id -> tp_trainers.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_trainer_industry_currency (DELETE), write_lock_insert_trainer_industry_currency (INSERT), write_lock_update_trainer_industry_currency (UPDATE)

### trainer_industry_intel
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, sector (text) NOT NULL, qual_codes (ARRAY), title (text) NOT NULL, summary (text) NOT NULL, relevance_note (text), source_type (text), industry_currency_relevant (boolean), generated_at (timestamp with time zone) NOT NULL, dismissed (boolean), logged_as_currency (boolean), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: trainer_id -> auth.users.id
- RLS: enabled, policies: tiil_trainer_own (ALL)

### trainer_matrix
- Columns: id (uuid) NOT NULL, trainer_profile_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, matrix_version (integer), generated_date (timestamp with time zone), unit_competencies (jsonb), qualification_mappings (jsonb), gap_analysis (jsonb), pd_recommendations (jsonb), is_current (boolean), approved_by (uuid), approved_at (timestamp with time zone), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid)
- FKs: created_by -> auth.users.id, approved_by -> auth.users.id, trainer_profile_id -> trainer_profiles.id, updated_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_trainer_matrix (ALL), trainer_matrix_own_access (ALL), write_lock_delete_trainer_matrix (DELETE), write_lock_insert_trainer_matrix (INSERT), write_lock_update_trainer_matrix (UPDATE)

### trainer_matrix_audit
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, action_type (text) NOT NULL, action_description (text) NOT NULL, old_value (jsonb), new_value (jsonb), performed_by (uuid) NOT NULL, performed_at (timestamp with time zone) NOT NULL, metadata (jsonb)
- FKs: trainer_id -> tp_trainers.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: System can insert audit logs (INSERT), Users can view audit logs in tenant (SELECT), billing_gate (ALL), write_lock_delete_trainer_matrix_audit (DELETE), write_lock_insert_trainer_matrix_audit (INSERT), write_lock_update_trainer_matrix_audit (UPDATE)

### trainer_matrix_credentials
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, credential_type (text) NOT NULL, qualification_code (text) NOT NULL, qualification_title (text), aqf_level (integer), issued_by (text), issued_date (date), expiry_date (date), evidence_file_path (text), evidence_verified_by (uuid), evidence_verified_at (timestamp with time zone), status (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), issuing_rto_id (text), evidence_document_id (uuid), custom_id (text), position (text), evidence_of_currency (text), next_review_date (date), risk_level (text), notes (text), responsible_person (uuid), responsible_role (text), due_date (date), is_superseded (boolean), superseded_by (uuid), dedup_reviewed (boolean), licence_number (text), issuing_authority (text), jurisdiction (text), archived_at (timestamp with time zone), archived_by (uuid), archive_reason (text), hard_delete_after (timestamp with time zone)
- FKs: evidence_document_id, tenant_id -> evidence_documents.id, tenant_id, trainer_id -> tp_trainers.id, tenant_id -> tenants.tenant_id, responsible_person -> profiles.id
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_trainer_matrix_credentials (SELECT), tenant_all (ALL), write_lock_delete_trainer_matrix_credentials (DELETE), write_lock_insert_trainer_matrix_credentials (INSERT), write_lock_update_trainer_matrix_credentials (UPDATE)

### trainer_monthly_reports
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, display_id (text) NOT NULL, hours_worked (numeric), training_activities (text), professional_development (text), issues_challenges (text), support_needed (text), notes (text), status (text) NOT NULL, submitted_at (timestamp with time zone), reviewed_by (uuid), reviewed_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, courses_delivered (ARRAY), delivery_modes (ARRAY), total_sessions (integer), delivery_exceptions (boolean), delivery_exceptions_reason (text), reporting_month (date), has_lln_concerns (boolean), lln_flags (jsonb), has_wellbeing_issues (boolean), wellbeing_incidents (jsonb), sessions_as_planned (boolean), sessions_deviation_reason (text), has_resource_concerns (boolean), resource_concerns (jsonb), assessment_tool_issue (text), assessment_tool_details (jsonb), rpl_processed (boolean), rpl_rows (jsonb), ct_processed (boolean), ct_rows (jsonb), improvement_areas (ARRAY), improvement_items (jsonb), has_complaints (boolean), complaint_items (jsonb), has_pd (boolean), pd_items (jsonb), has_industry_engagement (boolean), industry_items (jsonb), has_risks (boolean), risk_items (jsonb), declaration_accepted (boolean), has_ofi (boolean), ofi_ids (ARRAY), linked_ofi_ids (ARRAY), linked_risk_ids (ARRAY), linked_pdr_ids (ARRAY), linked_ssr_ids (ARRAY), linked_ien_ids (ARRAY), linked_rpl_ids (ARRAY), linked_caa_ids (ARRAY), linked_whs_ids (ARRAY), lock_deadline (timestamp with time zone), period_start (date), period_end (date)
- FKs: meeting_id -> governance_meetings.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_trainer_monthly_reports (SELECT), tenant_all (ALL), tmr_manager_select (SELECT), tmr_trainer_own_insert (INSERT), tmr_trainer_own_select (SELECT), tmr_trainer_own_update (UPDATE), write_lock_delete_trainer_monthly_reports (DELETE), write_lock_insert_trainer_monthly_reports (INSERT), write_lock_update_trainer_monthly_reports (UPDATE)

### trainer_onboarding_evidence_analysis
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, evidence_document_id (uuid) NOT NULL, predicted_category (text), predicted_subtype (text), credential_code (text), credential_title (text), issuing_body (text), issue_date (date), expiry_date (date), pd_hours (numeric), industry_area (text), confidence_score (numeric), extraction_status (text) NOT NULL, normalisation_status (text) NOT NULL, review_required (boolean) NOT NULL, review_reason (text), dedupe_group_key (text), proposed_record_type (text), proposed_record_payload (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid) NOT NULL, date_validation (jsonb)
- RLS: enabled, policies: toea_tenant_insert (INSERT), toea_tenant_isolation (ALL), toea_tenant_read (SELECT), toea_tenant_update (UPDATE)

### trainer_onboarding_sessions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, status (text) NOT NULL, created_by (uuid) NOT NULL, confirmed_by (uuid), confirmed_at (timestamp with time zone), ai_analysis (jsonb), final_decisions (jsonb), records_created (jsonb), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Admins and Compliance Managers can manage onboarding sessions (ALL), billing_gate (ALL), write_lock_delete_trainer_onboarding_sessions (DELETE), write_lock_insert_trainer_onboarding_sessions (INSERT), write_lock_update_trainer_onboarding_sessions (UPDATE)

### trainer_onboarding_steps
- Columns: id (uuid) NOT NULL, item_id (text) NOT NULL, title (text) NOT NULL, description (text) NOT NULL, why_it_matters (text), phase (text) NOT NULL, sort_order (integer) NOT NULL, route (text) NOT NULL, cta_label (text) NOT NULL, time_estimate (text), rto_clause_ref (text), auto_complete_check (text), required (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: trainer_onboarding_steps_read_all (SELECT)

### trainer_pd
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid), pd_type (USER-DEFINED) NOT NULL, title (text) NOT NULL, provider (text), start_date (date), end_date (date), hours (numeric), evidence_file_id (uuid), metadata (jsonb), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid), completion_date (date), description (text), status (text), evidence_document_id (uuid), evidence_files (jsonb) NOT NULL, archived_at (timestamp with time zone), archived_by (uuid), archive_reason (text), hard_delete_after (timestamp with time zone)
- FKs: evidence_file_id -> evidence_files.id, trainer_id -> tp_trainers.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_trainer_pd (ALL), write_lock_delete_trainer_pd (DELETE), write_lock_insert_trainer_pd (INSERT), write_lock_update_trainer_pd (UPDATE)

### trainer_pd_plan
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, plan_year (integer) NOT NULL, plan_status (text) NOT NULL, goals (jsonb), planned_activities (jsonb), target_vet_pd_hours (numeric), target_industry_pd_hours (numeric), approved_by (uuid), approved_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- FKs: trainer_id -> tp_trainers.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_trainer_pd_plan (DELETE), write_lock_insert_trainer_pd_plan (INSERT), write_lock_update_trainer_pd_plan (UPDATE)

### trainer_product_coverage
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, training_product_code (text) NOT NULL, training_product_title (text), coverage_type (text) NOT NULL, units_covered (integer), units_total (integer), coverage_percentage (numeric), scope_item_id (uuid), auto_generated (boolean), source_credential_ids (ARRAY), risk_flags (jsonb), notes (text), created_at (timestamp with time zone), created_by (uuid), updated_at (timestamp with time zone), updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant admins can manage product coverage (ALL), Tenant users can view their product coverage (SELECT), billing_gate (ALL), restrict_sa_select_trainer_product_coverage (SELECT), write_lock_delete_trainer_product_coverage (DELETE), write_lock_insert_trainer_product_coverage (INSERT), write_lock_update_trainer_product_coverage (UPDATE)

### trainer_product_requests
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, training_product_code (text) NOT NULL, training_product_title (text) NOT NULL, scope_type (text), tas_build_id (uuid), capability (text) NOT NULL, delivery_modes (ARRAY), trainer_statement (text), status (text) NOT NULL, reviewed_by (uuid), reviewed_at (timestamp with time zone), review_notes (text), units_assigned (integer), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- FKs: updated_by -> auth.users.id, reviewed_by -> auth.users.id, tas_build_id -> q1_tas_builder.id, created_by -> auth.users.id, trainer_id -> auth.users.id
- RLS: enabled, policies: tpr_manager_read (SELECT), tpr_manager_update (UPDATE), tpr_trainer_own (ALL)

### trainer_profiles
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_name (text) NOT NULL, employee_id (text), position (text), qualifications (jsonb), industry_experience (jsonb), current_scope (jsonb), wwcc_number (text), wwcc_expiry_date (date), first_aid_expiry_date (date), cpr_expiry_date (date), vet_pd_completion_percentage (integer), industry_pd_completion_percentage (integer), last_vet_pd_date (date), last_industry_pd_date (date), profile_image_url (text), bio (text), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid), full_name (text), role_type (text), qualifications_summary (text), industry_currency_summary (text), tae_credential_code (text), tae_credential_status (text), tae_credential_expiry (date), working_under_direction (boolean), supervision_required (boolean), email (text), phone (text), custom_id (text), status (text), metadata (jsonb), last_matrix_published_at (timestamp with time zone), archived_at (timestamp with time zone), archived_by (uuid), archive_reason (text), delete_requested (boolean)
- FKs: user_id -> auth.users.id, created_by -> auth.users.id, updated_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_trainer_profiles (ALL), write_lock_delete_trainer_profiles (DELETE), write_lock_insert_trainer_profiles (INSERT), write_lock_update_trainer_profiles (UPDATE)

### trainer_quals
- Columns: id (uuid) NOT NULL, org_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, qualification_code (text) NOT NULL, qualification_title (text), aqf_level (text), issued_by (text), issued_at (date), expires_at (date), evidence_file_url (text), verified_by (uuid), verified_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), tenant_id (uuid), source_type (text), source_credential_id (uuid), units_json (jsonb), status (text), issuing_rto_id (text)
- FKs: trainer_id -> tp_trainers.id, tenant_id -> tenants.tenant_id, source_credential_id -> trainer_matrix_credentials.id
- RLS: enabled, policies: billing_gate (ALL), tq_trainer_own_insert (INSERT), tq_trainer_own_select (SELECT), tq_trainer_own_update (UPDATE), trainer_quals_tenant_access (ALL), write_lock_delete_trainer_quals (DELETE), write_lock_insert_trainer_quals (INSERT), write_lock_update_trainer_quals (UPDATE)

### trainer_report_reminders
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, meeting_id (uuid) NOT NULL, trainer_user_id (uuid) NOT NULL, reminder_type (text) NOT NULL, scheduled_for (date) NOT NULL, delivered_at (timestamp with time zone) NOT NULL
- FKs: meeting_id -> governance_meetings.id
- RLS: enabled, policies: billing_gate (ALL), trainer_report_reminders_select (SELECT)

### trainer_report_transactions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, report_id (uuid) NOT NULL, register_type (text) NOT NULL, payload (jsonb) NOT NULL, approved (boolean), committed (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), trt_tenant_select (SELECT), trt_trainer_insert (INSERT), trt_trainer_update (UPDATE), write_lock_delete_trainer_report_transactions (DELETE), write_lock_insert_trainer_report_transactions (INSERT), write_lock_update_trainer_report_transactions (UPDATE)

### trainer_reports
- Columns: id (uuid) NOT NULL, tenant_id (uuid), trainer_id (uuid), trainer_name (text) NOT NULL, reporting_month (date) NOT NULL, courses_delivered (ARRAY), delivery_mode (text) NOT NULL, total_sessions_delivered (integer), lln_digital_issues (boolean), lln_digital_description (text), wellbeing_concerns (boolean), wellbeing_description (text), assessments_delivered_as_planned (boolean), assessment_delivery_issues (text), assessment_issues_level (text), assessment_issues_description (text), improvement_suggestions (ARRAY), additional_comments (text), learner_complaints_feedback (boolean), complaints_description (text), pd_completed (boolean), pd_description (text), log_to_trainer_matrix (boolean), log_to_pdr_tab (boolean), industry_engagement_completed (boolean), industry_engagement_file_path (text), risks_to_escalate (boolean), risk_description (text), declaration_accuracy (boolean), declaration_governance (boolean), signature_data (text), signature_type (text), status (text), submitted_at (timestamp with time zone), reviewed_by (uuid), reviewed_at (timestamp with time zone), created_by (uuid), created_at (timestamp with time zone), updated_by (uuid), updated_at (timestamp with time zone)
- FKs: created_by -> auth.users.id, reviewed_by -> auth.users.id, trainer_id -> auth.users.id, updated_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_trainer_reports (ALL), write_lock_delete_trainer_reports (DELETE), write_lock_insert_trainer_reports (INSERT), write_lock_update_trainer_reports (UPDATE)

### trainer_scope
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, unit_code (text) NOT NULL, unit_title (text) NOT NULL, can_train (boolean), can_assess (boolean), requires_supervision (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone), confidence_score (numeric), confidence_level (text), gap_flag (text)
- FKs: trainer_id -> trainers.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_trainer_scope (DELETE), write_lock_insert_trainer_scope (INSERT), write_lock_update_trainer_scope (UPDATE)

### trainer_session_plan_ai_logs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, session_plan_id (uuid), prompt_context (jsonb), model_used (text), generated_at (timestamp with time zone) NOT NULL
- FKs: session_plan_id -> trainer_session_plans.id, trainer_id -> auth.users.id
- RLS: enabled, policies: tsp_ai_log_own (ALL)

### trainer_session_plans
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, tas_build_id (uuid), delivery_plan_id (uuid), schedule_row_id (uuid), unit_code (text) NOT NULL, unit_title (text) NOT NULL, session_number (integer), session_title (text) NOT NULL, session_date (date), duration_minutes (integer), delivery_mode (text), learning_outcomes (jsonb), elements_covered (jsonb), delivery_activities (jsonb), assessment_activities (jsonb), resources_required (text), reasonable_adjustments (text), cohort_contextualisation (text), ai_generated (boolean), ai_generation_log_id (uuid), status (text) NOT NULL, post_delivery_notes (jsonb), evidence_url (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), presentation_url (text), parent_id (uuid), cohort_name (text), is_master (boolean) NOT NULL, clone_of (uuid), trainer_learner_ratio (integer), training_hours (numeric), assessment_hours (numeric), self_paced_hours (numeric), regulatory_instrument (text), hrwl_unit (boolean) NOT NULL, spine_type (text) NOT NULL
- FKs: created_by -> auth.users.id, tas_build_id -> q1_tas_builder.id, trainer_id -> auth.users.id, delivery_plan_id -> tas_delivery_plans.id, schedule_row_id -> tas_delivery_plan_schedule_rows.id, clone_of -> trainer_session_plans.id, parent_id -> trainer_session_plans.id, updated_by -> auth.users.id
- RLS: enabled, policies: tsp_manager_read (SELECT), tsp_trainer_own (ALL)

### trainer_supervision
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, supervisor_id (uuid) NOT NULL, supervision_plan (text), frequency (text), evidence_url (text), start_date (date), end_date (date), status (text), notes (text), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid)
- FKs: supervisor_id -> tp_trainers.id, trainer_id -> tp_trainers.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), trainer_supervision_tenant_access (ALL), write_lock_delete_trainer_supervision (DELETE), write_lock_insert_trainer_supervision (INSERT), write_lock_update_trainer_supervision (UPDATE)

### trainer_supervision_requirements
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, supervisor_id (uuid), supervision_type (text) NOT NULL, unit_codes (ARRAY), supervision_plan_path (text), observation_logs (jsonb), status (text) NOT NULL, start_date (date) NOT NULL, end_date (date), notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant isolation for supervision_requirements (ALL), billing_gate (ALL), write_lock_delete_trainer_supervision_requirements (DELETE), write_lock_insert_trainer_supervision_requirements (INSERT), write_lock_update_trainer_supervision_requirements (UPDATE)

### trainer_sync_audit
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, source_table (text) NOT NULL, source_action (text) NOT NULL, source_record_id (uuid), rule_version (text) NOT NULL, old_classification (text), new_classification (text), old_capabilities (jsonb), new_capabilities (jsonb), affected_tas_count (integer), recompute_duration_ms (integer), triggered_by (uuid), triggered_at (timestamp with time zone) NOT NULL, metadata (jsonb)
- RLS: enabled, policies: billing_gate (ALL), trainer_sync_audit_tenant_read (SELECT), write_lock_delete_trainer_sync_audit (DELETE), write_lock_insert_trainer_sync_audit (INSERT), write_lock_update_trainer_sync_audit (UPDATE)

### trainer_timeline_events
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, event_type (text) NOT NULL, event_at (timestamp with time zone) NOT NULL, event_by (uuid), title (text) NOT NULL, description (text), source_table (text), source_id (uuid), evidence_document_id (uuid), metadata (jsonb) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: admin_cm_view_timeline (SELECT), trainer_view_own_timeline (SELECT)

### trainer_unit_competency
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, unit_code (text) NOT NULL, can_train (boolean) NOT NULL, can_assess (boolean) NOT NULL, requires_supervision (boolean) NOT NULL, supervisor_trainer_id (uuid), credential_verified (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), trainer_unit_competency_tenant_isolation (ALL), write_lock_delete_trainer_unit_competency (DELETE), write_lock_insert_trainer_unit_competency (INSERT), write_lock_update_trainer_unit_competency (UPDATE)

### trainer_unit_map
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid), training_product_id (uuid), unit_code (text) NOT NULL, unit_title (text), capability (USER-DEFINED) NOT NULL, evidence_refs (ARRAY), last_validated_at (timestamp with time zone), validator_id (uuid), metadata (jsonb), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid), status (text) NOT NULL, evidence_links (jsonb) NOT NULL, delivery_methods (ARRAY), assessment_methods (ARRAY), currency_status (text), last_delivered_date (date), notes (text)
- FKs: trainer_id -> tp_trainers.id, training_product_id -> training_products.id
- RLS: enabled, policies: billing_gate (ALL), trainer_unit_map_tenant_access (ALL), tum_trainer_own_insert (INSERT), tum_trainer_own_select (SELECT), tum_trainer_own_update (UPDATE), write_lock_delete_trainer_unit_map (DELETE), write_lock_insert_trainer_unit_map (INSERT), write_lock_update_trainer_unit_map (UPDATE)

### trainer_unit_mapping
- Columns: id (uuid) NOT NULL, org_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, unit_id (uuid) NOT NULL, mapping_basis (USER-DEFINED) NOT NULL, confidence (integer), evidence_refs (jsonb), comments (text), last_validated_at (timestamp with time zone), validated_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), tenant_id (uuid)
- FKs: tenant_id -> tenants.tenant_id, unit_id -> units.id, trainer_id -> trainers.id
- RLS: enabled, policies: Tenant access for trainer_unit_mapping (ALL), billing_gate (ALL), write_lock_delete_trainer_unit_mapping (DELETE), write_lock_insert_trainer_unit_mapping (INSERT), write_lock_update_trainer_unit_mapping (UPDATE)

### trainer_unit_mapping_suggestions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, unit_code (text) NOT NULL, unit_title (text) NOT NULL, confidence_score (numeric) NOT NULL, confidence_level (text) NOT NULL, reasoning (text) NOT NULL, source_evidence (jsonb) NOT NULL, suggested_can_train (boolean) NOT NULL, suggested_can_assess (boolean) NOT NULL, suggested_requires_supervision (boolean) NOT NULL, status (text) NOT NULL, reviewed_by (uuid), reviewed_at (timestamp with time zone), review_notes (text), applied_to_vocational_competency_id (uuid), trigger_source (text) NOT NULL, trigger_entity_id (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid)
- FKs: trainer_id -> tp_trainers.id, tenant_id -> tenants.tenant_id, created_by -> auth.users.id, applied_to_vocational_competency_id -> trainer_vocational_competency.id, reviewed_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_trainer_unit_mapping_suggestions (SELECT), reviewer_update (UPDATE), tenant_select (SELECT)

### trainer_unit_permissions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, unit_code (text) NOT NULL, unit_title (text), source_basis (text) NOT NULL, can_train (boolean) NOT NULL, can_assess (boolean) NOT NULL, evidence_credential_id (uuid), notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- FKs: evidence_credential_id -> trainer_credentials.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_trainer_unit_permissions (DELETE), write_lock_insert_trainer_unit_permissions (INSERT), write_lock_update_trainer_unit_permissions (UPDATE)

### trainer_validation_actions
- Columns: id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, unit_code (text) NOT NULL, action_type (text) NOT NULL, status (text) NOT NULL, assigned_to (uuid), evidence_provided (jsonb), reviewer_notes (text), created_by (uuid) NOT NULL, reviewed_by (uuid), reviewed_at (timestamp with time zone), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- FKs: trainer_id -> tp_trainers.id
- RLS: enabled, policies: trainer_validation_actions_tenant_delete (DELETE), trainer_validation_actions_tenant_insert (INSERT), trainer_validation_actions_tenant_select (SELECT), trainer_validation_actions_tenant_update (UPDATE)

### trainer_vet_currency
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, activity_type (text) NOT NULL, activity_name (text) NOT NULL, provider (text), activity_date (date) NOT NULL, hours (numeric), vet_or_industry (text) NOT NULL, evidence_url (text), notes (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: created_by -> auth.users.id, trainer_id -> auth.users.id
- RLS: enabled, policies: trainer_vet_currency_cm_select (SELECT), trainer_vet_currency_insert_own (INSERT), trainer_vet_currency_select_own (SELECT), trainer_vet_currency_service (ALL), trainer_vet_currency_update_own (UPDATE)

### trainer_vocational_competency
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, unit_code (text) NOT NULL, unit_title (text), competency_basis (text) NOT NULL, competency_evidence_path (text), can_train (boolean) NOT NULL, can_assess (boolean) NOT NULL, industry_currency_date (date), industry_currency_evidence_path (text), currency_status (text), verified_by (uuid), verified_at (timestamp with time zone), verification_notes (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), risk_flags (jsonb), source_credential_id (uuid), auto_generated (boolean), requires_supervision (boolean), confidence_score (numeric), confidence_level (text), gap_flag (text)
- FKs: tenant_id -> tenants.tenant_id, trainer_id -> tp_trainers.id, source_credential_id -> trainer_matrix_credentials.id
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_trainer_vocational_competency (SELECT), tenant_member_access (ALL), trainer_tenant_guard (INSERT), trainer_tenant_guard_update (UPDATE), write_lock_delete_trainer_vocational_competency (DELETE), write_lock_insert_trainer_vocational_competency (INSERT), write_lock_update_trainer_vocational_competency (UPDATE)

### trainer_wud_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, supervisor_name (text) NOT NULL, supervisor_role (text) NOT NULL, unit_code (text) NOT NULL, unit_name (text) NOT NULL, delivery_start_date (date), delivery_end_date (date), delivery_method (text), supervisor_signoff_date (date), supervisor_signoff_confirmed (boolean), notes (text), evidence_url (text), created_by (uuid), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: created_by -> auth.users.id, trainer_id -> auth.users.id
- RLS: enabled, policies: trainer_wud_log_cm_select (SELECT), trainer_wud_log_insert_own (INSERT), trainer_wud_log_select_own (SELECT), trainer_wud_log_service (ALL), trainer_wud_log_update_own (UPDATE)

### trainers
- Columns: id (uuid) NOT NULL, user_id (uuid), email (text) NOT NULL, first_name (text), last_name (text), phone (text), trainer_number (text), employment_type (USER-DEFINED), status (USER-DEFINED), about (text), avatar_url (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid), tenant_id (uuid)
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_trainers (ALL), write_lock_delete_trainers (DELETE), write_lock_insert_trainers (INSERT), write_lock_update_trainers (UPDATE)

### training_product_alerts
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, training_product_id (uuid) NOT NULL, severity (text) NOT NULL, category (text) NOT NULL, message (text) NOT NULL, detected_at (timestamp with time zone) NOT NULL, acknowledged_at (timestamp with time zone), acknowledged_by (uuid), raw (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: training_product_id -> training_products.id
- RLS: enabled, policies: billing_gate (ALL), tpa_insert (INSERT), tpa_select (SELECT), tpa_update (UPDATE), write_lock_delete_training_product_alerts (DELETE), write_lock_insert_training_product_alerts (INSERT), write_lock_update_training_product_alerts (UPDATE)

### training_product_change_events
- Columns: id (uuid) NOT NULL, qualification_code (text) NOT NULL, detected_at (timestamp with time zone) NOT NULL, change_type (text) NOT NULL, before (jsonb) NOT NULL, after (jsonb) NOT NULL, diff_summary (text), evidence_ids (ARRAY), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: tpce_insert_super_admin (INSERT), tpce_select_authenticated (SELECT)

### training_product_compliance_signals
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, training_product_id (uuid) NOT NULL, signal_type (text) NOT NULL, signal_level (text) NOT NULL, status (text) NOT NULL, details (jsonb) NOT NULL, resolved_at (timestamp with time zone), resolved_by (uuid), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tpcs_tenant_iso (ALL), write_lock_delete_training_product_compliance_signals (DELETE), write_lock_insert_training_product_compliance_signals (INSERT), write_lock_update_training_product_compliance_signals (UPDATE)

### training_product_evidence_packs
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, training_product_id (uuid) NOT NULL, pack_type (text) NOT NULL, pack_data (jsonb) NOT NULL, generated_at (timestamp with time zone) NOT NULL, generated_by (uuid), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tpep_tenant_iso (ALL), write_lock_delete_training_product_evidence_packs (DELETE), write_lock_insert_training_product_evidence_packs (INSERT), write_lock_update_training_product_evidence_packs (UPDATE)

### training_product_scope
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, training_product_id (uuid) NOT NULL, is_active (boolean) NOT NULL, scoped_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: training_product_id -> training_products.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_select_training_product_scope (SELECT), tps_delete (DELETE), tps_insert (INSERT), tps_select (SELECT), tps_update (UPDATE), write_lock_delete_training_product_scope (DELETE), write_lock_insert_training_product_scope (INSERT), write_lock_update_training_product_scope (UPDATE)

### training_product_transition_cases
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, training_product_id (uuid) NOT NULL, replacement_product_id (uuid), case_status (text) NOT NULL, trigger_reason (text) NOT NULL, detected_at (timestamp with time zone) NOT NULL, deadline_date (date) NOT NULL, impact_summary (jsonb) NOT NULL, closed_at (timestamp with time zone), regulator_approval (boolean) NOT NULL, created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tp_trans_case_tenant_iso (ALL), write_lock_delete_training_product_transition_cases (DELETE), write_lock_insert_training_product_transition_cases (INSERT), write_lock_update_training_product_transition_cases (UPDATE)

### training_product_transition_policies
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, product_type (text) NOT NULL, trigger_reason (text) NOT NULL, superseded_no_new_enrol_after_days (integer) NOT NULL, noncurrent_complete_within_days (integer) NOT NULL, effective_from (date) NOT NULL, raw_reference (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: tp_trans_pol_tenant_iso (ALL)

### training_product_transition_tasks
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, case_id (uuid) NOT NULL, task_type (text) NOT NULL, owner_role (text) NOT NULL, due_date (date) NOT NULL, task_status (text) NOT NULL, notes (text), evidence_links (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: case_id -> training_product_transition_cases.id
- RLS: enabled, policies: billing_gate (ALL), tp_trans_task_tenant_iso (ALL), write_lock_delete_training_product_transition_tasks (DELETE), write_lock_insert_training_product_transition_tasks (INSERT), write_lock_update_training_product_transition_tasks (UPDATE)

### training_product_transitions
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, training_product_id (uuid) NOT NULL, replacement_product_code (text), transition_deadline (date), status (text) NOT NULL, impact_summary (jsonb), affected_tas_ids (ARRAY), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: training_product_id -> training_products.id
- RLS: enabled, policies: billing_gate (ALL), tpt_insert (INSERT), tpt_select (SELECT), tpt_update (UPDATE), write_lock_delete_training_product_transitions (DELETE), write_lock_insert_training_product_transitions (INSERT), write_lock_update_training_product_transitions (UPDATE)

### training_product_units
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, training_product_id (uuid) NOT NULL, unit_code (text) NOT NULL, unit_title (text), core (boolean), elective (boolean), packaging_group (text), raw_payload (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- FKs: training_product_id -> training_products.id
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_select_training_product_units (SELECT), tpu_insert (INSERT), tpu_select (SELECT), tpu_update (UPDATE), write_lock_delete_training_product_units (DELETE), write_lock_insert_training_product_units (INSERT), write_lock_update_training_product_units (UPDATE)

### training_products
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, code (text) NOT NULL, title (text) NOT NULL, status (text), metadata (jsonb), created_at (timestamp with time zone), updated_at (timestamp with time zone), created_by (uuid), updated_by (uuid), type (text) NOT NULL, tga_identifier (text), release_date (date), superseded_by_code (text), supersedes_code (text), raw_payload (jsonb) NOT NULL, status_updated_at (timestamp with time zone), origin (text) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_access_training_products (ALL), tenant_isolate_select_training_products (SELECT), write_lock_delete_training_products (DELETE), write_lock_insert_training_products (INSERT), write_lock_update_training_products (UPDATE)

### training_products_catalog
- Columns: code (text) NOT NULL, title (text) NOT NULL, type (text) NOT NULL, status (text), raw (jsonb) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: catalog_select_authenticated (SELECT), catalog_service_role (ALL)

### training_unit_codes
- Columns: id (uuid) NOT NULL, unit_code (text) NOT NULL, unit_title (text) NOT NULL, qualification_level (text), industry_domain (text), keywords (ARRAY), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: authenticated_read_training_unit_codes (SELECT), super_admin_write_training_unit_codes (ALL)

### trial_analytics
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, event_type (text) NOT NULL, event_data (jsonb), user_id (uuid), created_at (timestamp with time zone) NOT NULL, metadata (jsonb)
- RLS: enabled, policies: Super admins can manage trial analytics (ALL), billing_gate (ALL), write_lock_delete_trial_analytics (DELETE), write_lock_insert_trial_analytics (INSERT), write_lock_update_trial_analytics (UPDATE)

### trial_audit_log
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, action (text) NOT NULL, metadata (jsonb), created_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), tal_insert (INSERT), tal_select (SELECT), write_lock_delete_trial_audit_log (DELETE), write_lock_insert_trial_audit_log (INSERT), write_lock_update_trial_audit_log (UPDATE)

### trial_config
- Columns: tenant_id (uuid) NOT NULL, max_users (integer) NOT NULL, role_mix (jsonb) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Super admins can manage trial config (ALL), Tenant members can view trial config (SELECT), billing_gate (ALL), write_lock_delete_trial_config (DELETE), write_lock_insert_trial_config (INSERT), write_lock_update_trial_config (UPDATE)

### trial_defaults
- Columns: id (boolean) NOT NULL, trial_length_days (integer), default_risk_level (text), auto_extend_grace_days (integer), expiry_warning_days (jsonb), auto_lock_on_expiry (boolean), updated_at (timestamp with time zone), updated_by (uuid)
- FKs: updated_by -> auth.users.id
- RLS: enabled, policies: Super admins only trial_defaults (ALL)

### trial_metrics_daily
- Columns: id (uuid) NOT NULL, metric_date (date) NOT NULL, trials_created (integer), trials_activated (integer), trials_converted (integer), trials_expired (integer), conversion_rate (numeric), avg_days_to_convert (numeric), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Super admins can manage trial metrics (ALL)

### trial_notifications
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, notification_type (text) NOT NULL, notification_data (jsonb), sent_at (timestamp with time zone), scheduled_for (timestamp with time zone) NOT NULL, created_at (timestamp with time zone)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_trial_notifications (ALL), write_lock_delete_trial_notifications (DELETE), write_lock_insert_trial_notifications (INSERT), write_lock_update_trial_notifications (UPDATE)

### trial_offer_emails_sent
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, email_type (text) NOT NULL, sent_at (timestamp with time zone) NOT NULL, recipient_email (text) NOT NULL, offer_token_id (uuid)
- FKs: offer_token_id -> trial_offer_tokens.id
- RLS: enabled, policies: billing_gate (ALL), trial_offer_emails_sent_super_admin (ALL), write_lock_delete_trial_offer_emails_sent (DELETE), write_lock_insert_trial_offer_emails_sent (INSERT), write_lock_update_trial_offer_emails_sent (UPDATE)

### trial_offer_tokens
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, token (text) NOT NULL, discount_percent (integer) NOT NULL, valid_months (integer) NOT NULL, expires_at (timestamp with time zone) NOT NULL, redeemed_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), trial_offer_tokens_super_admin (ALL), write_lock_delete_trial_offer_tokens (DELETE), write_lock_insert_trial_offer_tokens (INSERT), write_lock_update_trial_offer_tokens (UPDATE)

### trial_users
- Columns: id (uuid) NOT NULL, first_name (text) NOT NULL, last_name (text) NOT NULL, company_name (text) NOT NULL, phone (text), email (text) NOT NULL, start_date (timestamp with time zone), expires_at (timestamp with time zone), is_active (boolean), created_at (timestamp with time zone), updated_at (timestamp with time zone)
- RLS: enabled, policies: Super admins can manage trial users (ALL)

### trials
- Columns: tenant_id (uuid) NOT NULL, trial_start_date (date) NOT NULL, trial_length_days (integer) NOT NULL, status (text) NOT NULL, converted_at (timestamp with time zone), revoked_at (timestamp with time zone), notes (text), created_by (uuid) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_by (uuid)
- RLS: enabled, policies: billing_gate (ALL), tenant_access_trials (ALL), write_lock_delete_trials (DELETE), write_lock_insert_trials (INSERT), write_lock_update_trials (UPDATE)

### unit_clause_requirements
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, unit_code (text) NOT NULL, clause_id (uuid) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: clause_id -> clauses.id, tenant_id -> tenants.tenant_id
- RLS: enabled, policies: billing_gate (ALL), unit_clause_requirements_tenant_isolation (ALL), write_lock_delete_unit_clause_requirements (DELETE), write_lock_insert_unit_clause_requirements (INSERT), write_lock_update_unit_clause_requirements (UPDATE)

### unit_complexity_benchmarks
- Columns: unit_code (text) NOT NULL, nominal_hours (numeric), companion_count (integer) NOT NULL, companion_links (jsonb) NOT NULL, signals (jsonb) NOT NULL, complexity_score (numeric) NOT NULL, confidence (numeric) NOT NULL, flags (ARRAY) NOT NULL, computed_at (timestamp with time zone) NOT NULL, engine_version (text) NOT NULL, aqf_level (integer), aqf_score (numeric), hours_score (numeric), companion_signal_score (numeric), performance_evidence_score (numeric), knowledge_evidence_score (numeric), assessment_conditions_score (numeric), foundation_skills_score (numeric), performance_criteria_count (integer), foundation_skills_count (integer), composite_score (numeric), components (jsonb) NOT NULL
- RLS: enabled, policies: Public read unit_complexity_benchmarks (SELECT), Service insert unit_complexity_benchmarks (INSERT), Service update unit_complexity_benchmarks (UPDATE)

### unit_complexity_metadata
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, unit_code (text) NOT NULL, performance_evidence_length (integer) NOT NULL, knowledge_evidence_length (integer) NOT NULL, foundation_skill_count (integer) NOT NULL, licensing_flag (boolean) NOT NULL, prerequisite_flag (boolean) NOT NULL, source (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), tenant_isolate_select_unit_complexity_metadata (SELECT), write_lock_delete_unit_complexity_metadata (DELETE), write_lock_insert_unit_complexity_metadata (INSERT), write_lock_update_unit_complexity_metadata (UPDATE)

### unit_intelligence
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, tas_build_id (uuid) NOT NULL, unit_code (text) NOT NULL, performance_evidence_complexity_score (numeric), knowledge_evidence_complexity_score (numeric), assessment_conditions_score (numeric), prerequisite_flag (boolean), total_complexity_score (numeric), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, stale (boolean) NOT NULL, created_by (uuid), updated_by (uuid), retention_until (timestamp with time zone), aqf_level (integer), aqf_score (numeric), hours_score (numeric), companion_signal_score (numeric), foundation_skills_score (numeric), foundation_skills_count (integer), performance_criteria_count (integer), composite_score (numeric), complexity_version (text) NOT NULL, components (jsonb) NOT NULL
- FKs: tas_build_id -> q1_tas_builder.id
- RLS: enabled, policies: billing_gate (ALL), unit_intelligence_tenant_access (ALL), write_lock_delete_unit_intelligence (DELETE), write_lock_insert_unit_intelligence (INSERT), write_lock_update_unit_intelligence (UPDATE)

### units
- Columns: id (uuid) NOT NULL, org_id (uuid) NOT NULL, code (text) NOT NULL, title (text), training_package (text), status (USER-DEFINED), release (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, tenant_id (uuid)
- FKs: tenant_id -> tenants.tenant_id
- RLS: enabled, policies: Tenant access for units (ALL), billing_gate (ALL), write_lock_delete_units (DELETE), write_lock_insert_units (INSERT), write_lock_update_units (UPDATE)

### user_admin_audit
- Columns: id (bigint) NOT NULL, actor_id (uuid) NOT NULL, action (text) NOT NULL, target_email (text), target_user_id (uuid), tenant_id (uuid), details (jsonb), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: Super admins can access user admin audit (ALL), billing_gate (ALL), uaa_select (SELECT), write_lock_delete_user_admin_audit (DELETE), write_lock_insert_user_admin_audit (INSERT), write_lock_update_user_admin_audit (UPDATE)

### user_banner_dismissals
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, banner_key (text) NOT NULL, dismissed_at (timestamp with time zone) NOT NULL, created_at (timestamp with time zone) NOT NULL
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: user_all (ALL)

### user_deletion_queue
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, requested_by (uuid) NOT NULL, requested_at (timestamp with time zone) NOT NULL, eligible_at (timestamp with time zone) NOT NULL, reason (text) NOT NULL, confirmed_by (uuid), confirmed_at (timestamp with time zone), status (text) NOT NULL
- RLS: enabled, policies: super_admin_all (ALL)

### user_invitations
- Columns: id (uuid) NOT NULL, email (text) NOT NULL, role (text) NOT NULL, invited_by (uuid) NOT NULL, invite_token (text) NOT NULL, expires_at (timestamp with time zone) NOT NULL, status (text) NOT NULL, domain_restricted (boolean), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, accepted_at (timestamp with time zone), accepted_by (uuid), invite_type (USER-DEFINED), package_id (uuid), tenant_id (uuid), cancelled_at (timestamp with time zone), resent_at (timestamp with time zone), invite_link (text), last_sent_at (timestamp with time zone), last_error (text), scope (text), platform_role (text), invited_email_domain (text), tenant_name (text), token_used (boolean), token_used_at (timestamp with time zone), roles (ARRAY), first_name (text), last_name (text), full_name (text), delivery_status (text), delivery_status_updated_at (timestamp with time zone), target_profile_role (text), affiliate_id (uuid), invited_org_name (text)
- FKs: affiliate_id -> consultant_affiliates.id, package_id -> packages.id, invited_by -> profiles.id, accepted_by -> profiles.id
- RLS: enabled, policies: Allow anonymous to validate invitation by token (SELECT), Allow authenticated to validate invitation by token (SELECT), billing_gate (ALL), tenant_all (ALL), write_lock_delete_user_invitations (DELETE), write_lock_insert_user_invitations (INSERT), write_lock_update_user_invitations (UPDATE)

### user_login_events
- Columns: id (uuid) NOT NULL, user_id (uuid), occurred_at (timestamp with time zone) NOT NULL, ip_address (inet), user_agent (text), created_at (timestamp with time zone) NOT NULL
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: service_role_all (ALL), user_own (SELECT)

### user_management_audit
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, user_id (uuid) NOT NULL, action (text) NOT NULL, performed_by (uuid) NOT NULL, delta (jsonb), old_values (jsonb), new_values (jsonb), notes (text), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), uma_insert (INSERT), uma_select (SELECT), write_lock_delete_user_management_audit (DELETE), write_lock_insert_user_management_audit (INSERT), write_lock_update_user_management_audit (UPDATE)

### user_notification_preferences
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, email_status_changes (boolean) NOT NULL, email_review_assignments (boolean) NOT NULL, email_overdue_reminders (boolean) NOT NULL, email_approval_requests (boolean) NOT NULL, sms_status_changes (boolean) NOT NULL, sms_review_assignments (boolean) NOT NULL, sms_overdue_reminders (boolean) NOT NULL, sms_approval_requests (boolean) NOT NULL, in_app_status_changes (boolean) NOT NULL, in_app_review_assignments (boolean) NOT NULL, in_app_overdue_reminders (boolean) NOT NULL, in_app_approval_requests (boolean) NOT NULL, reminder_frequency (text) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: service_role_override_user_notification_preferences (ALL)

### user_orgs
- Columns: user_id (uuid) NOT NULL, org_id (uuid) NOT NULL, is_default (boolean) NOT NULL, inserted_at (timestamp with time zone), tenant_id (uuid)
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_user_orgs (ALL), write_lock_delete_user_orgs (DELETE), write_lock_insert_user_orgs (INSERT), write_lock_update_user_orgs (UPDATE)

### user_preferences
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, email_notifications (boolean), dashboard_view_preference (text), default_page (text), theme_preference (text), created_at (timestamp with time zone), updated_at (timestamp with time zone), security_alerts (boolean) NOT NULL, system_updates (boolean) NOT NULL, tour_mode_opt_out (boolean) NOT NULL, tour_mode_snooze_until (timestamp with time zone), first_seen_at (timestamp with time zone) NOT NULL
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: Users can manage their preferences (ALL), service_role_override_user_preferences (ALL)

### user_roles
- Columns: id (uuid) NOT NULL, role (text) NOT NULL, assigned_at (timestamp with time zone), tenant_id (uuid) NOT NULL, user_id (uuid) NOT NULL
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_user_roles (ALL), write_lock_delete_user_roles (DELETE), write_lock_insert_user_roles (INSERT), write_lock_update_user_roles (UPDATE)

### user_status_audit
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, old_status (text), new_status (text) NOT NULL, reason (text), changed_by (uuid) NOT NULL, changed_at (timestamp with time zone) NOT NULL
- FKs: changed_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_user_status_audit (ALL), write_lock_delete_user_status_audit (DELETE), write_lock_insert_user_status_audit (INSERT), write_lock_update_user_status_audit (UPDATE)

### users
- Columns: id (uuid) NOT NULL, user_id (uuid) NOT NULL, full_name (text), email (text), phone (text), position (text), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, tenant_id (uuid), role (text), inactive (boolean) NOT NULL, total_logins (bigint), last_login (timestamp with time zone)
- FKs: user_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_access_users (ALL), write_lock_delete_users (DELETE), write_lock_insert_users (INSERT), write_lock_update_users (UPDATE)

### validation_escalation_events
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, schedule_id (uuid) NOT NULL, tas_id (uuid), clause_id (uuid), event_type (text) NOT NULL, actor_id (uuid), actor_type (text), previous_status (text), new_status (text), reason (text), metadata (jsonb), created_at (timestamp with time zone)
- FKs: schedule_id -> q1_tas_validation_schedule.id
- RLS: enabled, policies: System and admins can insert escalation events (INSERT), Tenant members can view escalation events (SELECT), billing_gate (ALL), write_lock_delete_validation_escalation_events (DELETE), write_lock_insert_validation_escalation_events (INSERT), write_lock_update_validation_escalation_events (UPDATE)

### validation_notification_events
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, event_type (text) NOT NULL, recipient_role (text) NOT NULL, schedule_id (uuid) NOT NULL, delivered_at (timestamp with time zone) NOT NULL, channel (text) NOT NULL, suppressed (boolean), suppression_reason (text), metadata (jsonb), created_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: billing_gate (ALL), vne_insert (INSERT), vne_select (SELECT), write_lock_delete_validation_notification_events (DELETE), write_lock_insert_validation_notification_events (INSERT), write_lock_update_validation_notification_events (UPDATE)

### vivacity_staff
- Columns: email (text) NOT NULL, full_name (text) NOT NULL, role (text), created_at (timestamp with time zone)
- RLS: enabled, policies: vivacity_staff_super_admin_only (ALL)

### webmail_domains
- Columns: domain (text) NOT NULL
- RLS: enabled, policies: Authenticated users can read webmail domains (SELECT), Super admins can manage webmail domains (ALL)

### wellbeing_audit_log
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, table_name (text) NOT NULL, record_id (uuid) NOT NULL, action (text) NOT NULL, performed_by (uuid), performed_at (timestamp with time zone) NOT NULL, old_values (jsonb), new_values (jsonb)
- FKs: performed_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), wellbeing_audit_log_insert (INSERT), wellbeing_audit_log_select (SELECT), write_lock_delete_wellbeing_audit_log (DELETE), write_lock_insert_wellbeing_audit_log (INSERT), write_lock_update_wellbeing_audit_log (UPDATE)

### wellbeing_risk_scans
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, tenant_id (uuid) NOT NULL, student_id (text), student_name (text) NOT NULL, title (text), indicators (jsonb), severity (text), actions_taken (text), referral_made (boolean), follow_up_date (date), status (text), notes (text), source_type (text), source_id (uuid), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), wizard_responses (jsonb)
- FKs: created_by -> auth.users.id, updated_by -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_wellbeing_risk_scans (DELETE), write_lock_insert_wellbeing_risk_scans (INSERT), write_lock_update_wellbeing_risk_scans (UPDATE)

### wellbeing_support_plans
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, tenant_id (uuid) NOT NULL, risk_scan_id (uuid), student_id (text), student_name (text) NOT NULL, title (text), wellbeing_goals (text), plan_actions (text), review_cycle (text), outcomes (text), next_review_date (date), status (text), notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), reminder_sent (boolean), severity (text), assigned_sso_id (uuid), trainer_id (uuid), referral_pathway (text), referral_date (date), referral_outcome (text)
- FKs: created_by -> auth.users.id, assigned_sso_id -> auth.users.id, updated_by -> auth.users.id, risk_scan_id -> wellbeing_risk_scans.id, trainer_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_wellbeing_support_plans (DELETE), write_lock_insert_wellbeing_support_plans (INSERT), write_lock_update_wellbeing_support_plans (UPDATE)

### whs_dd_action
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_whs_dd_action (SELECT), read_authenticated (SELECT), super_admin_write_whs_dd_action (ALL)

### whs_dd_incident_nature
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_whs_dd_incident_nature (SELECT), read_authenticated (SELECT), super_admin_write_whs_dd_incident_nature (ALL)

### whs_dd_location
- Columns: label (text) NOT NULL, id (integer) NOT NULL, value (text)
- RLS: enabled, policies: authenticated_read_whs_dd_location (SELECT), read_authenticated (SELECT), super_admin_write_whs_dd_location (ALL)

### whs_incidents
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, tenant_id (uuid) NOT NULL, student_id (text), student_name (text) NOT NULL, title (text), incident_type (text) NOT NULL, incident_date (date) NOT NULL, description (text), injury (text), corrective_actions (text), third_party_location (text), evidence_url (text), status (text), risk_level (text), notify_compliance_manager (boolean), notified_at (timestamp with time zone), notes (text), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), severity_score (integer), severity_band (text), injury_severity (text), emergency_response (boolean), third_party_involved (boolean), severity_override (boolean), whs_register_id (uuid), trainer_id (uuid), student_ref (text)
- FKs: whs_register_id -> whs_register.id, updated_by -> auth.users.id, created_by -> auth.users.id, trainer_id -> auth.users.id
- RLS: enabled, policies: billing_gate (ALL), tenant_all (ALL), write_lock_delete_whs_incidents (DELETE), write_lock_insert_whs_incidents (INSERT), write_lock_update_whs_incidents (UPDATE)

### whs_register
- Columns: id (uuid) NOT NULL, custom_id (text) NOT NULL, incident_date (date) NOT NULL, form_completed_by (uuid), position (text) NOT NULL, hazard_incident_type (text) NOT NULL, location (text), description (text), people_involved (text), immediate_action (text), root_cause (text), preventative_measures (text), follow_up_actions (text), review_date (date), responsible_person (uuid), status (text) NOT NULL, notes (text), supporting_documents (jsonb), created_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_at (timestamp with time zone) NOT NULL, updated_by (uuid), medical_action_required (text), follow_up_actions_dropdown (text), tenant_id (uuid), risk_level (text), responsible_role (text), due_date (date), title (text), whs_incident_id (uuid)
- FKs: whs_incident_id -> whs_incidents.id
- RLS: enabled, policies: billing_gate (ALL), restrict_sa_select_whs_register (SELECT), sso_insert_whs (INSERT), sso_select_whs (SELECT), whs_reg_delete (DELETE), whs_reg_insert (INSERT), whs_reg_select (SELECT), whs_reg_update (UPDATE), write_lock_delete_whs_register (DELETE), write_lock_insert_whs_register (INSERT), write_lock_update_whs_register (UPDATE)

### work_package_templates
- Columns: id (uuid) NOT NULL, title (text) NOT NULL, description (text), category (text) NOT NULL, default_effort_band (text) NOT NULL, default_risk_level (text) NOT NULL, default_priority_score (integer) NOT NULL, suggested_modules (ARRAY), default_change_flags (jsonb) NOT NULL, is_active (boolean) NOT NULL, sort_order (integer) NOT NULL, created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- RLS: enabled, policies: super_admin_full_access_wpt (ALL)

### work_packages
- Columns: id (uuid) NOT NULL, title (text) NOT NULL, description (text), template_id (uuid), effort_band (text) NOT NULL, risk_level (text) NOT NULL, priority_score (integer) NOT NULL, impacted_modules (ARRAY), change_flags (jsonb) NOT NULL, status (text) NOT NULL, lovable_prompt (text), notes (text), created_by (uuid), exported_at (timestamp with time zone), completed_at (timestamp with time zone), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL
- FKs: template_id -> work_package_templates.id, created_by -> auth.users.id
- RLS: enabled, policies: super_admin_full_access_wp (ALL)

### working_under_direction
- Columns: id (uuid) NOT NULL, tenant_id (uuid) NOT NULL, trainer_id (uuid) NOT NULL, supervisor_id (uuid) NOT NULL, unit_codes (ARRAY) NOT NULL, qualification_code (text), qualification_title (text), arrangement_type (text) NOT NULL, status (text) NOT NULL, start_date (date) NOT NULL, expected_end_date (date), actual_end_date (date), supervision_frequency (text), supervision_method (text), development_plan (text), progress_notes (text), competency_achieved (boolean), competency_sign_off_by (uuid), competency_sign_off_date (date), evidence_document_ids (ARRAY), evidence_storage_paths (ARRAY), created_at (timestamp with time zone) NOT NULL, updated_at (timestamp with time zone) NOT NULL, created_by (uuid), updated_by (uuid)
- FKs: tenant_id -> tenants.tenant_id, updated_by -> auth.users.id, created_by -> auth.users.id, competency_sign_off_by -> auth.users.id, supervisor_id -> tp_trainers.id, trainer_id -> tp_trainers.id
- RLS: enabled, policies: wud_insert_tenant (INSERT), wud_select_tenant (SELECT), wud_update_tenant (UPDATE)
