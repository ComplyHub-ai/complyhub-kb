# ComplyHub UI Navigation Reference

> Use this file when instructing someone where to go in the ComplyHub platform.
> Always give click-path instructions — not raw URLs, not sidebar colour descriptions.
>
> This file covers two role views: **Super Admin** (`@vivacity.com.au` accounts) and **Administrator** (tenant admin accounts).
> Other roles (Compliance Manager, Governing Person, Trainer, etc.) see a reduced sidebar and may not have access to all sections listed here.
> Screenshots confirmed as at 1 July 2026.

---

## Super Admin sidebar structure

Super Admin is the Vivacity staff view (`brian@vivacity.com.au`). It has **no access to tenant registers or content** — RLS deny policies block this. To test as a tenant user, log in directly as that user or use Man as User from a tenant Administrator account (not from Super Admin — Man as User does not appear in the Super Admin sidebar).

| Section | Items |
|---|---|
| COMMAND CENTRE | Dashboard, Control Centre, Tenants Hub, Affiliate management, Support Tickets |
| OPERATIONS | Support Workflow, Tenant Health, Failed Jobs, Security Events, Platform Insights, QA Tracker |
| REVENUE | Sales Dashboard, Billing, Risk Monitor |
| CONTENT & COMMS | Release Notes, Knowledge Base, Notifications, Help Centre |
| SYSTEM | Users & Roles, Email Domains, Orphan Recovery, System Logs, Error Monitor, Audit Trail, Access Audit, Feature Flags, Settings |
| DEV TOOLS | Work Packages, Delivery Console, Compliance Graph, Optimisation, TAS Lab, Test Console, Tenant Context, Templates, Email Templates, NCVER Upload, Webhook Events, Enforcement Log, Email Monitoring, Dev Interface |

---

## Compliance Manager sidebar structure

Tenant: shown in top-left header. Role shown below tenant name.

| Section | Items |
|---|---|
| QUICK ACTIONS | Log Compliance Issue, Schedule Review, Upload Evidence |
| Dashboard & Monitoring | Compliance Dashboard, Compliance Calendar, Registers Overview |
| Governance & Risk | Risk Management, Continuous Improvement, Governance Meetings |
| Compliance Registers | Complaints & Appeals, Assessment Validation, Material Change Notification, Opportunities for Improvement, Audit Register, WHS Register |
| VET Workforce | Trainers Matrix Engine, Trainers Credentials, Delivery Overview |
| Documents & Evidence | Document Repository, Documents Register, Evidence Library |
| Tools & Reports | Smart Compliance Actions, Compliance Intelligence |

> ⚠️ **There is no "Students & Support" section in the Compliance Manager sidebar.** Wellbeing & Safety and Adjustment Plans are not directly accessible from this role's navigation. If a Compliance Manager needs to reach those pages, check whether they are accessible via Registers Overview or a direct URL.

---

## Administrator sidebar structure (tenant admin view)

The left sidebar is divided into named sections. Sections are always visible; items within each section are listed directly (no accordion — just scroll).

| Section | Items (examples) |
|---|---|
| QUICK ACTIONS | Admin Dashboard, Compliance Overview, Calendar, Tasks, Help Centre |
| Training & Assessment | QSI Quality Engine, Industry Consultation, Assessment Matrix, Assessment Tools, CT Register, RPL Register, RTO Register |
| Students & Support | (student-related items) |
| VET Workforce | Trainers Metrics Engine, Trainer Credentials, PD Register, Staff Turnover, Trainer Availability, Profile Management, PD Recommendations, Expert Engagements |
| Governance & Risk | CEO Governance Portal, Governance Meetings |
| **Governance Registers** | Annual Declaration (ADC), Material Change Notification, Fit & Proper Person, Prepaid Fee Protection, Quality Indicator Reporting, Audit & Internal Review, Regulatory Intelligence |
| Documents & Compliance | Documents Register, Document Repository, Marketing & Information, Support Tickets Triage |
| AI & Automation | Compliance Intelligence, Assessor Performance |
| User Management | Users, Roles & Permissions, Residential Box, Man as User, User Portals Hub |
| Role Portals | Trainer Portal, Student Support Portal, Student Portal, Employer Portal, Regulatory Officer Portal |

> Note: There is NO "Quality Area 1/2/3/4" accordion in the live UI. Registers are listed flat under "Governance Registers".

---

## Register navigation — click paths

### Material Change Notification Register
1. Log in to ComplyHub
2. In the left sidebar, scroll down to the **Governance Registers** section
3. Click **Material Change Notification**

### Annual Declaration of Compliance (ADC)
1. Left sidebar → **Governance Registers** → **Annual Declaration (ADC)**

### Fit & Proper Person Register
1. Left sidebar → **Governance Registers** → **Fit & Proper Person**

### Prepaid Fee Protection Register
1. Left sidebar → **Governance Registers** → **Prepaid Fee Protection**

### Quality Indicator Reporting
1. Left sidebar → **Governance Registers** → **Quality Indicator Reporting**

### Audit & Internal Review
1. Left sidebar → **Governance Registers** → **Audit & Internal Review**

### Regulatory Intelligence
1. Left sidebar → **Governance Registers** → **Regulatory Intelligence**

---

## Training & Assessment register navigation

### CT Register (Currency & Training)
1. Left sidebar → **Training & Assessment** → **CT Register**

### RPL Register
1. Left sidebar → **Training & Assessment** → **RPL Register**

### RTO Register
1. Left sidebar → **Training & Assessment** → **RTO Register**

### Assessment Matrix
1. Left sidebar → **Training & Assessment** → **Assessment Matrix**

---

## Governance tools (not registers)

### CEO Governance Portal
1. Left sidebar → **Governance & Risk** → **CEO Governance Portal**

### Governance Meetings
1. Left sidebar → **Governance & Risk** → **Governance Meetings**

---

## User Management

### View / edit a user's role
1. Left sidebar → **User Management** → **Users**
2. Find the user by name or email
3. Click their row to open their profile

### Roles & Permissions
1. Left sidebar → **User Management** → **Roles & Permissions**

### Man as User (impersonate)
1. Left sidebar → **User Management** → **Man as User**

---

## Role Portals

| Portal | Path |
|---|---|
| Trainer Portal | Left sidebar → **Role Portals** → **Trainer Portal** |
| Student Support Portal | Left sidebar → **Role Portals** → **Student Support Portal** |
| Student Portal | Left sidebar → **Role Portals** → **Student Portal** |
| Employer Portal | Left sidebar → **Role Portals** → **Employer Portal** |
| Regulatory Officer Portal | Left sidebar → **Role Portals** → **Regulatory Officer Portal** |

---

## Notes

- **Super Admin** (`brian@vivacity.com.au`) cannot access tenant registers or content — RLS deny policies enforce this. To QA as a tenant user, either log in directly as that user or use Man as User from a tenant Administrator account.
- **Man as User** is available in the tenant Administrator sidebar only — it does not appear in the Super Admin sidebar.
- The Administrator sidebar reflects the full tenant admin view. Other tenant roles (Compliance Manager, Governing Person, Trainer, etc.) see a reduced sidebar.
- Sidebar sections are always visible on desktop; collapsed to section headings on mobile/narrow viewports.
