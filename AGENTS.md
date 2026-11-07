# Workspace Agent Guidelines

All AI agents working in this workspace must read this file before starting an
assignment. Before changing code, inspect the relevant implementation and
existing documentation; keep changes focused and preserve established behavior.

## Architecture

- `frontend/` is the Next.js 15 application. Its App Router pages and API
  handlers live under `frontend/src/app/`; shared UI components live under
  `frontend/src/components/`, and service clients, hooks, and integrations live
  under `frontend/src/lib/`.
- Supabase is the authoritative authentication and database backend.
  PostgreSQL schema changes are versioned in `supabase/migrations/`; Edge
  Functions live in `supabase/functions/`. Authorization belongs in reviewed
  PostgreSQL RLS policies and functions, not only in the UI.
- Product and operational guidance lives in `docs/`. See
  [the Supabase setup guide](supabase/README.md),
  [the frontend contract](docs/FRONTEND_CONTRACT.md), and
  [the pending tasks](docs/PENDING_TASKS.md) before changing related areas.

## Coding Standards

- Use TypeScript and follow the local formatting, naming, and error-handling
  patterns. Prefer explicit types and clear failure states; do not silently
  swallow errors or report success after a failed operation.
- Keep secrets out of source control and browser code. The frontend may use
  Supabase's public anon key; never expose the service-role key. Enforce data
  access in Supabase policies and functions as well as at the appropriate
  application boundary.
- Prefer small, cohesive changes. Preserve existing behavior unless a change
  is intentional, and update directly related documentation and tests.

## Component Conventions

- Follow the Next.js App Router conventions already used in `frontend/src/app/`.
  Keep components server-rendered by default; add `"use client"` only where
  state, effects, event handlers, or browser APIs require it.
- Put reusable UI in `frontend/src/components/` and feature-specific UI near
  its route. Use CSS Modules for component and page styles, following nearby
  component patterns rather than introducing a new styling system.
- Use semantic HTML, accessible names and keyboard interactions, and provide
  appropriate loading, empty, and error states for interactive data views.

## Environment Setup and Validation

- Install frontend dependencies from `frontend/` with `npm install`; run the
  development server with `npm run dev`, production build with `npm run build`,
  and lint with `npm run lint`.
- Copy `frontend/.env.example` to `frontend/.env.local` and configure the
  Supabase project URL and public anon key for authenticated data access. Do
  not commit local environment files or credentials.
- For local database work, follow [the Supabase setup guide](supabase/README.md)
  and the checked-in `supabase/config.toml`; local Supabase commands require
  the Supabase CLI and Docker Desktop.
- Run the smallest relevant validation for a change and report any validation
  that could not be completed.

## Shared Memory and Assignment Logging

- Before every assignment, read this `AGENTS.md` and the current
  [project roadmap](docs/ROADMAP.md).
- On finishing every assignment, append a date-stamped entry to
  `docs/ROADMAP.md` under **Session Change Logs** with the task outcome and key
  modifications. Record architectural, API, schema, or structural choices
  under **Decision Log (ADRs)**, and explicitly describe any breaking changes.
  If none were introduced, say so when relevant. Keep sprint statuses current
  when the assignment changes them.
