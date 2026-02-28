# VelvetDesk Dashboard — Operator Interface & Admin Panel

Customer-facing dashboard and admin panel for the VelvetDesk AI Voice Receptionist platform.  
Part of a production SaaS delivered end-to-end, solo, in under 12 months.

---

## What It Does

Gives business owners full control over their AI voice receptionist — without technical knowledge. Onboarding, configuration, call history, booking management, and payment — all in one interface.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 · TypeScript · Tailwind CSS |
| Backend | Supabase · PostgreSQL · Row Level Security |
| Auth | Supabase Auth · Magic Link |
| Payments | LemonSqueezy (EU Merchant of Record) |
| Email | Resend |
| Deployment | Vercel |

---

## Features

**Customer Dashboard**
- Business onboarding: services, staff, working hours, agent personality
- Google Calendar OAuth integration
- Call history with full transcripts
- Booking management UI (view, modify, cancel)
- Real-time availability overview

**Admin Panel**
- Waitlist management and customer approval flow
- Business configuration override
- Payment status and subscription tracking
- System-wide metrics view

**Automated Onboarding Flow**
- Waitlist → approval → payment invite → magic link → dashboard access
- Zero manual steps after initial approval

---

## Data Model — 9 Tables

| Table | Purpose |
|---|---|
| `businesses` | Core business profile and settings |
| `users` | Authentication and access control |
| `agent_settings` | AI agent personality and behavior config |
| `services` | Service catalogue per business |
| `staff` | Staff profiles and assignment rules |
| `working_hours` | Schedule and availability windows |
| `bookings` | Appointment records with status tracking |
| `calls` | Call log with transcripts and outcomes |
| `notification_settings` | Alert and notification preferences |

Row Level Security enforced: every query scoped to `business_id` derived from authenticated session.

---

## Multi-Tenant Architecture

Each business operates in full isolation:
- Dedicated `vapi_assistant_id` per business stored in Supabase
- All API routes resolve business context from assistant ID at runtime
- RLS enforced at database layer — no cross-tenant data exposure
- Supports unlimited businesses on shared infrastructure

---

## Delivery

- Part of a 0 → production build completed in under 12 months
- Launched, demonstrated to investors, formally handed over
- Exit completed without operational or reputational issues

---

## Related

→ [velvetdesk-landing](https://github.com/1Shmid/velvetdesk-landing) — project overview, architecture, and business model 
→ [Ivan Shmidik on LinkedIn](https://www.linkedin.com/in/ivan-shmidik)
