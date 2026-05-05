> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** high — regulatory terms are stable; application-specific terms may drift as features evolve.

# Glossary

If you don't know these, you can't read the codebase or talk to the compliance team.

---

## Regulatory & Organisational

| Term | Meaning |
|---|---|
| **RTO** | Registered Training Organisation — a company licensed to deliver nationally recognised training in Australia |
| **ASQA** | Australian Skills Quality Authority — the federal regulator that audits RTOs |
| **Scope of Registration** | The list of qualifications/units an RTO is legally allowed to deliver |
| **AQF** | Australian Qualifications Framework — the levels (Cert I–IV, Diploma, etc.) |
| **Training Package** | A nationally endorsed bundle of qualifications and units for an industry (e.g. CHC for community services) |
| **Unit of Competency** | A single skill/module within a qualification (has a code like `BSBWHS411`) |

---

## Regulatory Processes

| Term | Meaning |
|---|---|
| **TGA / Training.gov.au** | The national register of VET data — source of truth for qualifications, units, and scope |
| **TAS** | Training and Adequacy/Suitability — a mandatory plan showing how an RTO will deliver a unit properly (trainer, resources, assessment, etc.) |
| **Self-Assurance** | Ongoing internal audit/review — ASQA now expects RTOs to do this continuously, not just before external audit |
| **Fit and Proper Person (FPP)** | A regulator check that key personnel have no disqualifying history |
| **Financial Viability (FVE)** | Evidence that the RTO is financially stable — required at registration/renewal |

---

## Compliance Registers (digital binders)

| Term | Meaning |
|---|---|
| **Governance Register** | Record of governance-level decisions, meetings, controls |
| **Risk Register** | Identified risks + mitigation plans |
| **OFI Register** | Opportunities for Improvement — things that aren't broken but could be better |
| **Complaints Register** | Student/stakeholder complaints + resolution tracking |
| **Appeals Register** | Formal appeals of assessment decisions |
| **CI Register / CI Cycle** | Continuous Improvement — must run on a regular cycle to pass audit |
| **Incidents Register** | Incidents/near-misses |
| **Complaints and Appeals (CAA)** | Often grouped together as a single register |
| **Training Product Register (TPROD)** | Catalogue of what the RTO delivers |
| **Workforce Register** | Trainer/assessor records |
| **Facilities Register** | Physical and virtual training locations and equipment |

---

## Trainer / Assessor Terms

| Term | Meaning |
|---|---|
| **Trainer** | Person who delivers training |
| **Assessor** | Person who assesses student competency (often the same person, but not always) |
| **PD / Professional Development** | Ongoing learning — trainers must maintain currency |
| **TAE** | Training and Education — the training package that trainers/assessors must themselves hold credentials from (TAE40122 etc.) |
| **Industry Currency** | Evidence that a trainer's industry knowledge is current |
| **Vocational Currency** | Evidence their training skills are current (PD, other delivery) |
| **Supervision** | A less-qualified trainer delivering under supervision of a fully-qualified one |
| **RPL** | Recognition of Prior Learning — student credit for existing skills/experience |

---

## Application-Specific Terms

| Term | Meaning |
|---|---|
| **Tenant** | An RTO customer account in the app (multi-tenant architecture) |
| **Workspace** | UI term for "tenant" — what users see when they "choose a workspace" |
| **ComplyBot** | The AI chatbot feature |
| **Support Mode** | Read-only impersonation mode used by ComplyHub staff to help customers |
| **Aligned Register** | A unified register pattern where multiple register types share a common entry structure |
| **Red Team / Red Team Testing** | Internal audit simulation — the app has TAS red team features |
| **FPP** | Fit and Proper Person (see above) — the app tracks evidence for this |
| **FVE** | Financial Viability Evidence — tracked documents |
| **LLN** | Language, Literacy, Numeracy — student support assessment |
| **SSO** | Student Support Officer (NOT Single Sign-On — context matters!) |

---

## Technical / Infrastructure

| Term | Meaning |
|---|---|
| **Supabase** | Backend platform — Postgres DB + auth + edge functions + storage |
| **Edge Function** | A serverless function running on Supabase (Deno-based) |
| **RLS** | Row-Level Security — Postgres feature that enforces per-user data access at the DB layer |
| **JWT Claim** | Custom data baked into the auth token — `active_tenant_id` is stored here |
| **RPC** | Remote Procedure Call — in Supabase, a callable Postgres function |
| **TGA Sync** | The process of pulling qualification/unit data from Training.gov.au |
| **Mailgun** | Email sending provider |
| **Lovable** | The AI coding tool used to build/modify the app |

---

## Common Acronyms in Code

| Acronym | Meaning |
|---|---|
| `ADC` | Assessment Decision Complaints |
| `AVR` | Assessment Validation Register |
| `CAA` | Complaints and Appeals |
| `CT` | Credit Transfer |
| `FRE` | Fee Refund |
| `OFI` | Opportunity for Improvement |
| `CI` | Continuous Improvement |
| `PD` | Professional Development |
| `TAS` | Training and Adequacy/Suitability |
| `TPROD` | Training Product |
| `RPL` | Recognition of Prior Learning |
| `IEN` | Industry Engagement |
| `FPP` | Fit and Proper Person |
| `FVE` | Financial Viability Evidence |
| `LLN` | Language, Literacy, Numeracy |
| `SSO` | Student Support Officer |
