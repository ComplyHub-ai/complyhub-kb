# Industry Consultation Demo Audit — 19 Aug 2026

**Demo date:** Tomorrow (Industry Consultation, AI Theme Extraction, Documenting Decisions)  
**Testing tenant:** Vivacity Testing Tenant  
**Codebase:** rto-compass-hub on main (pulled 18 Aug 2026)  
**Script:** 7.3 Industry Consultation — in detail

Audit conducted: 6 parallel agents (Consultation Plans, Consultation Register, Surveys, Coverage/Dashboard/Legacy, Documenting Decisions traceability) + 2 live DB checks (record IDs, Legacy Engagements table row counts).

---

## 🔴 High Risk — will likely fail or mislead live in front of the client

### 1. Consultation Plans → Status "Archived" throws database error on Save
**Status:** CONFIRMED  
**Component:** ConsultationPlanFormDialog.tsx, form schema, industry_consultation_plans table  
**Finding:** The form offers Status options Draft/Active/Completed/**Archived**, but the database only accepts Draft/Active/Completed/**Cancelled**. Selecting "Archived" and clicking Save will throw a database error live in the demo.  
**Action before demo:** Just don't click Archived tomorrow. Or fix the form to remove "Archived" and use only the four valid enum values (Draft, Active, Completed, Cancelled).

---

### 2. Consultation Register → Record IDs — live DB check CONFIRMS they generate correctly
**Status:** CONFIRMED WORKING (contradicts initial code-reading theory)  
**Component:** useConsultationRecords.ts, industry_consultation_records.custom_id, DB trigger `20260813104831_register_custom_id_trigger_sweep.sql`  
**Finding:** Initial code audit suspected record IDs might insert as literal "auto-generated" text. Live DB check of Vivacity Testing Tenant shows actual records have correct IDs: `ICR-0004`, `ICR-0003`, etc. The trigger fires correctly despite the code passing the literal string `'auto-generated'`. This is working as-is.  
**Action before demo:** None required. IDs display correctly.

---

### 3. Consultation Register → "Industry Representative" and "Organisation" are not where the script says
**Status:** CONFIRMED BUG  
**Components:** ConsultationRecordFormEnhanced.tsx Details tab (lines 551-909), ParticipantSection.tsx  
**Finding:** The script implies these are fields on the main Details tab. They are not. Industry Representative and Organisation are derived from a separate "Participants" tab where you must add a person. The Details tab has leftover text saying "Set in the Details tab" (`ParticipantSection.tsx:142`) pointing at nothing. If a demo attendee goes looking for this field live, it won't be where they expect.  
**Action before demo:** When reaching this step in the demo, go directly to the Participants tab and add a person there. Don't search for the field on Details.

---

### 4. Surveys → "Auto-log feedback to Governance Register" toggle does nothing
**Status:** CONFIRMED DEAD TOGGLE  
**Components:** SurveyBuilder.tsx, surveyService.ts, `surveys.auto_log_enabled` column  
**Finding:** The toggle exists and saves `auto_log_enabled` to the database. Nothing in the system actually reads that setting for any of the seven survey templates this tab offers. When a response comes in, the toggle is never checked. There is a separate trigger (`trg_qi_register_autolog_from_session`) that fires only for survey types `'student_qi'` and `'employer_qi'` (not any of the seven templates built from this tab), and even then it writes to `qi_register`, not a "governance register." Flipping this toggle on and expecting responses to flow into governance data will show nothing happening.  
**Action before demo:** Skip or rework this step in the script. Do not demo it as working.

---

### 5. Surveys → "Copy the public link and send it to your industry contacts" — dead end on this tab
**Status:** CONFIRMED DEAD FLOW  
**Components:** src/pages/public/SurveyResponse.tsx (public route `/s/:token`), src/pages/admin/SurveysFeedback.tsx (PublishSurveyDialog), ConsultationSurveysTab.tsx  
**Finding:** The `/s/:token` public route and RLS policies (allowing anon SELECT/INSERT) do technically exist. But nothing reachable from the Surveys tab ever publishes a survey or generates a `public_token`. The only "Publish" action lives on a completely unrelated admin page (SurveysFeedback.tsx / PublishSurveyDialog) and doesn't generate the link either. A survey built via "Build New Survey" on this tab can never get a working public link — this step is a dead end.  
**Action before demo:** Skip or rework this step. Do not attempt to "copy the public link" from the Surveys tab results.

---

### 6. Dashboard → "Qualifications Covered" and "High-Risk Gaps" metrics show wrong numbers
**Status:** CONFIRMED BUG  
**Component:** ConsultationDashboardTab.tsx, lines 38, 87  
**Finding:** Both metrics are built on a field-name mismatch. Code reads `r.qualification_code`, but the real column in `industry_consultation_records` is `training_product_code` (confirmed in `src/types/consultation.ts` and `useConsultationRecords.ts`). Every record falls into the fallback bucket `'Unknown'`, so these metrics will always show a flat, meaningless number (1 if there's any data, 0 if none) regardless of real data. The Dashboard's "coverage-by-qualification" chart inherits the same bug at line 84-95.  
**Action before demo:** Either fix the three field references (change `qualification_code` → `training_product_code` at lines 38, 87 in ConsultationDashboardTab, and line 84-95 for the chart), or avoid dwelling on these two numbers live. They are genuinely broken.

---

### 7. Legacy Engagements → live DB check CONFIRMS the tab will be mostly empty
**Status:** CONFIRMED EMPTY DATA  
**Component:** LegacyEngagementsTab.tsx, ien_register and surveys_itn tables  
**Finding:** Live DB check of Vivacity Testing Tenant: `ien_register` has 0 rows, `surveys_itn` has 1 row. So opening the Legacy Engagements tab tomorrow will show only a single survey-response entry and otherwise look essentially empty. The script says "browse your pre-existing consultation history," which will be misleading if there's almost nothing to browse.  
**Action before demo:** Either seed a couple of realistic legacy records into `ien_register` for the Vivacity tenant before the demo, or adjust the talk track to briefly acknowledge it's a light historical set rather than implying a rich archive.

---

## 🟡 Medium — won't break, but could look off or confuse you mid-demo

### Consultation Plans: Industry Sector is free-text, not a picklist
**Finding:** Script implies "choose from a list." Code has a free-text box. Minor, but the UI will look different from the script description.

### Consultation Plans: two-click flow to edit (view, then Edit) rather than one-click open
**Finding:** Script implies clicking a plan opens it for edit. It actually opens a read-only summary first; you need a separate "Edit" click. Minor UX difference.

### Consultation Register: record ID format in script example doesn't match actual format
**Finding:** Script example shows `ICR-0010` (with hyphen); actual format is `ICR0010` (no hyphen). This is cosmetic once the code-reading concern (item #2 above) is cleared. Don't reference a literal example onscreen.

### Coverage Report: Standard 1.1 advertised but not shown in Met/Not-Met mapping
**Finding:** Page header says "linked standards 1.1, 1.2, 4.1," but only 1.2 and 4.1 appear in the actual Met/Not-Met breakdown. Standard 1.1 is absent.

### Consultation Plans vs Consultation Register: two unrelated method lists
**Finding:** Plans' method list (Industry Advisory Committee, Employer Survey, Site Visit, etc. — Title-Case strings) and Register's method list (`survey`, `meeting`, `phone_call`, etc. — snake_case values) are completely separate enums with no mapping or overlap. Don't imply on stage that a plan's chosen methods will match register records for reporting.

### Surveys: "Export to PDF" is a stub, not a real PDF
**Finding:** Clicking "Export to PDF" doesn't generate a PDF — it just tells the user to use their browser's Print function (Ctrl+P) and calls `window.print()`. CSV export does work properly.

---

## ✅ What's genuinely solid and demo-ready

- **Consultation Plans:** creating and saving a plan (aside from the Archived bug), all field types, editing an existing plan
- **Consultation Register:** adding/editing/saving a record, filtering by year/qualification/sector/method (all four work), opening a record's detail view, PDF export of a record — all genuinely wired to real data
- **Surveys:** survey list, all seven templates, target audience field, adding questions and saving, viewing per-question results, "Log to CI" (raises a real continuous-improvement item)
- **Coverage Report:** totals, breakdowns, risk analysis, and both CSV/PDF exports are all real, live-computed data — this tab is demo-ready as-is
- **Dashboard:** genuinely read-only, two of four metrics ("Consultations this year," "Active plans") and the monthly trend chart are correctly wired
- **"Documenting decisions" (7.3.7):** outcome summary field → real storage; "Log to CI" → real insert into ci_register; but the closing claim about a "traceable trail" is **overstated** — rows do get written, but there's no real linked ID between a survey response and the CI entry, just a plain text note mentioning the source. Frame this as "how you'd act on findings," not as a literally traceable, clickable chain.

---

## Summary of pre-demo actions

1. **Skip or rework three steps in the script:**
   - "Auto-log feedback to Governance Register" toggle (4. above)
   - "Copy the public link" for survey sharing (5. above)
   - Either avoid the Dashboard metrics entirely, or fix them before tomorrow (6. above)

2. **Live DB checks completed:**
   - ✅ Record IDs generate correctly (contradicts code-reading concern)
   - ✅ Legacy Engagements table confirmed empty (0 ien_register rows, 1 surveys_itn row) — decide whether to seed data or reframe the talk

3. **Small fixes before demo (if time):**
   - Fix Archived status in Consultation Plans form (remove it or fix the enum)
   - Fix Dashboard metrics field names (3 line changes)
   - Remove/update ParticipantSection stale label

4. **During demo:**
   - When reaching "record the industry representative," go to Participants tab, not Details
   - Don't rely on the record ID example format if reading the script aloud (no hyphen)

---

## Decisions

- [ ] Seed legacy data into ien_register for Vivacity tenant, or reframe the Legacy Engagements talk track
- [ ] Fix Dashboard metrics or avoid them live
- [ ] Skip/rework Surveys auto-log and public-link steps
- [ ] Fix Consultation Plans Archived enum or just avoid it during demo

