# TKCLCLAB Backend Plan

## Goal

This document defines the second-stage back-end plan for turning the public TKCLCLAB site into a secure learning platform with real operations.

## Phase 2 Objectives

1. Replace all browser-only logic with secure server-side services.
2. Add real inquiry capture, CRM-ready contact flows, and admin-safe content management.
3. Reintroduce learner accounts, course progress, and AI tutoring behind authenticated APIs.

## Recommended Architecture

### Frontend

- Keep the current public site as a static frontend deployed on Vercel.
- Add a private app area later under a separate route such as `/app`.
- Use the same visual system but split public marketing pages and authenticated product pages.

### Backend

- Runtime: Next.js API routes or a separate Node.js service on Vercel / Railway / Render
- Database: PostgreSQL
- ORM: Prisma
- Auth: NextAuth or Clerk
- File storage: Vercel Blob, S3, or Cloudinary
- Email: Resend
- AI proxy: server-side OpenAI or Gemini integration
- Analytics: Plausible or GA4

## Core Modules

### 1. Public Inquiry Flow

Purpose:
Convert the current email CTA into a real form and pipeline.

Minimum scope:

- Inquiry form with name, email, organization, country, learner type, and message
- Server-side validation
- Store inquiry records in PostgreSQL
- Send notification email to the team
- Send branded confirmation email to the inquirer
- Optional webhook to HubSpot / Airtable / Notion

Suggested tables:

- `inquiries`
- `organizations`

### 2. CMS for Public Content

Purpose:
Allow course/program content to be edited safely without touching source files.

Minimum scope:

- Admin login with role protection
- CRUD for course cards, program pages, FAQ items, testimonials, and contact settings
- Draft / published status
- Audit log for edits

Suggested tables:

- `users`
- `roles`
- `courses`
- `programs`
- `faqs`
- `testimonials`
- `site_settings`
- `audit_logs`

### 3. Learner Accounts

Purpose:
Bring back sign-in safely.

Minimum scope:

- Email magic link or password auth
- Role model: admin, staff, learner, partner
- Secure sessions
- Profile page

Suggested tables:

- `users`
- `sessions`
- `learner_profiles`

### 4. Enrollment and Progress

Purpose:
Replace the old `localStorage` progress system.

Minimum scope:

- Enrollment per learner per course
- Completion status per lesson or module
- Last viewed timestamp
- Dashboard summaries

Suggested tables:

- `enrollments`
- `course_modules`
- `lesson_progress`
- `activity_events`

### 5. AI Tutor Service

Purpose:
Reintroduce AI tutoring without exposing API keys in the browser.

Minimum scope:

- Authenticated API endpoint for AI tutor requests
- Rate limiting per learner
- Conversation logging
- Course-specific system prompts stored server-side
- Usage monitoring and error handling

Suggested tables:

- `ai_conversations`
- `ai_messages`
- `ai_prompt_templates`
- `ai_usage_logs`

Security requirements:

- Never expose model API keys to the browser
- Add abuse controls and content logging
- Add per-user quotas and timeout handling

### 6. Admin Dashboard

Purpose:
Give staff a real operations surface instead of fake front-end admin controls.

Minimum scope:

- Inquiry management
- Course publishing
- Learner overview
- AI usage review
- Contact form funnel stats

## Data Model Summary

Recommended first schema groups:

- Identity: `users`, `roles`, `sessions`
- Marketing: `inquiries`, `organizations`, `site_settings`
- Content: `courses`, `course_modules`, `programs`, `faqs`, `testimonials`
- Learning: `enrollments`, `lesson_progress`, `activity_events`
- AI: `ai_conversations`, `ai_messages`, `ai_usage_logs`

## Delivery Roadmap

### Stage 2A: Business-ready backend

- Build contact form API
- Add PostgreSQL
- Add email notifications
- Add CMS for public content

Outcome:
The current public website becomes operational for leads and content updates.

### Stage 2B: Private learner platform

- Add auth
- Add learner dashboard
- Add enrollments and progress tracking

Outcome:
The site becomes a real product, not only a marketing site.

### Stage 2C: Secure AI tutor

- Add AI proxy endpoints
- Add conversation persistence
- Add role/rate limits

Outcome:
AI tutoring returns in a production-safe form.

## API Sketch

Suggested initial endpoints:

- `POST /api/inquiries`
- `GET /api/admin/inquiries`
- `GET /api/courses`
- `POST /api/admin/courses`
- `POST /api/auth/sign-in`
- `GET /api/me`
- `POST /api/enrollments`
- `PATCH /api/progress/:moduleId`
- `POST /api/ai/chat`

## Priority Recommendation

If we want the fastest path with the highest value:

1. Contact form + database + email
2. CMS for public content
3. Auth + learner records
4. AI tutor proxy

## Suggested Stack Choice

If you want the simplest future build from this static version:

- Frontend + backend: Next.js
- DB: PostgreSQL + Prisma
- Auth: Clerk or NextAuth
- Email: Resend
- AI: server-side OpenAI Responses API or Gemini via proxy
- Hosting: Vercel

This keeps deployment simple and matches the public site hosting target.
