> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** high — stable product overview; update when major features ship or business model changes.

# Project Overview — ComplyHub / RTO Compass Hub

## What Is ComplyHub?

A **multi-tenant SaaS platform** that helps Australian **Registered Training Organisations (RTOs)** stay compliant with their regulator, **ASQA** (Australian Skills Quality Authority).

In plain English: Australian companies that deliver vocational training (TAFE-style courses, certificates, diplomas) have to prove they're running things properly — tracking trainers, managing risk, recording complaints, handling continuous improvement, auditing their own processes. ComplyHub is the digital binder and AI assistant for all of that.

---

## Who's The Customer?

Each **RTO** is a **tenant** in the system. A tenant has:
- A compliance team (compliance officers, quality managers)
- Trainers and assessors (the people delivering training)
- Executives (CEO, Training Manager) who want dashboards
- Sometimes students — but the platform is mostly B2B

Some users belong to **multiple tenants** — typically external **consultants** who help multiple RTOs, or **ComplyHub internal staff** who support customers.

---

## Core Value Propositions

1. **Compliance registers** — digital versions of all the registers ASQA wants to see (governance, risk, OFI, complaints, CI, training products, facilities, etc.)
2. **Trainer management** — track credentials, PD, supervision, monthly reports
3. **Audit readiness** — one-click generation of governance packs, audit packs, board reports
4. **AI assistance (ComplyBot)** — ask questions about regulations, documents, and your own data
5. **TAS engine** — auto-analyse Training and Adequacy/Suitability for units (a major ASQA audit focus)
6. **Evidence management** — upload, tag, and organise compliance evidence
7. **Governance meetings** — schedule, prep, run, and document regulator-required meetings

---

## Business Model / Tiers

| Tier | Notes |
|---|---|
| Trial | Time-limited demo accounts |
| Founders | Early-adopter legacy pricing |
| Diamond | Premium tier |
| Standard | Standard paid tiers |

Billing handled via **Stripe** with edge functions (`stripe-webhook`, `stripe-checkout`, `billing-gate`).

---

## Key Product Surfaces

| Surface | What it is |
|---|---|
| **Dashboard** | Role-based landing — admin, trainer, consultant, auditor each get different views |
| **Registers** | Governance, risk, OFI, complaints, CI, appeals, incidents, training products, facilities, workforce |
| **Trainer Portal** | Trainers log their own PD, credentials, monthly reports |
| **Consultant Portal** | External consultants see multiple tenants' data |
| **SuperAdmin Portal** | ComplyHub internal staff — tenant management, analytics |
| **Governance Meeting Manager** | Schedule and document compliance meetings |
| **Assessment Validation** | Peer validation of assessments (ASQA requirement) |
| **ComplyBot** | AI chat interface over the user's data |
| **Evidence Repository** | Document storage with AI tagging |

---

## Mental Model (one paragraph)

ComplyHub is a **multi-tenant SaaS** where each RTO is a **tenant**. Users log in, pick a workspace (tenant), and see dashboards, registers, trainer management, and audit trails. Key integrations: **Supabase** (DB + auth + edge functions), **Stripe** (billing), **Mailgun** (email), **Training.gov.au/TGA** (regulatory data), **Anthropic Claude API** (AI features — document analysis, report generation, ComplyBot).

---

## Key Risk Areas

- **Multi-tenancy is the #1 risk surface.** A bug that leaks one RTO's data to another is a compliance catastrophe. Every feature, every PR — ask: "does this respect tenant boundaries?"
- **Permission boundaries are #2.** Roles (admin, trainer, consultant, super_admin) have different allowed actions. Test and code defensively.
- **Regulators read this data.** Users present outputs from this app directly to ASQA auditors. Wrong or missing data can fail an audit.
- **AI features need human-in-the-loop checks.** ComplyBot and AI-generated reports can hallucinate. Any AI output shown without a "verify before using" notice is a gap.
