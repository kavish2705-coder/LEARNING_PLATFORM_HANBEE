# Supabase staging project setup

The repository's RLS workflow uses a fresh, local Supabase stack in GitHub
Actions. It does not connect to staging or production and needs no GitHub
Actions secrets. A separate staging project is still useful for manually
checking deployment behavior before production.

## Create the project

1. In the Supabase Dashboard, select the HANBEE organization and choose **New
   project**.
2. Name it `hanbee-staging`, choose the region closest to the team, and create
   a new, unique database password. Save that password in the team's password
   manager; do not reuse the production password.
3. Wait until the project status is **Healthy**. Do not add production data or
   production users to this project.

## Apply the repository schema

Install the Supabase CLI and authenticate it with an account authorized for
this staging project. From the repository root, link the CLI to the new
project, then apply the checked-in migrations in their numbered order:

```powershell
supabase login
supabase link --project-ref <staging-project-ref>
supabase db push
```

Use the database password created above if the CLI prompts for it. Review the
pending migration list and confirm that the linked project is the new staging
project before approving the push. `supabase db push` applies the repository's
pending files in `supabase/migrations/` and records them in Supabase's
migration history; do not manually paste files out of order in the SQL Editor.

To verify the applied migration history:

```powershell
supabase migration list
```

The RLS tests use disposable local databases in CI rather than this shared
staging project, so concurrent CI runs cannot interfere with each other.

## Find the project API values

In the staging project's Dashboard, open **Project Settings → API** (or
**API Keys**, depending on the Dashboard layout):

- **Project URL** is the staging `SUPABASE_URL`.
- The publishable/anon key is the client-side `SUPABASE_ANON_KEY`.
- The `service_role` key is the privileged `SUPABASE_SERVICE_ROLE_KEY`.

The service-role key bypasses RLS. Keep it in the password manager and in
trusted server-side deployment settings only. Never commit it, put it in a
frontend environment variable, or add it to this repository's GitHub Actions
secrets for the local RLS workflow.
