# Uni Manager

## Project overview

Uni Manager is a responsive personal university organizer for courses, schedules, tasks, assignments, notes, and course materials. It uses Supabase for user authentication and user-scoped data.

## Tech stack

- Next.js 14.2.35 with the App Router; React 18.3.1; JavaScript/JSX.
- Tailwind CSS 3.4.19 with shadcn/ui (JavaScript templates) and CSS-variable themes.
- Supabase JavaScript client 2.117.3 for authentication and the database.

## Setup & run commands

- `npm install`
- `npm run dev` (local server)
- `npm run build` (production build and Next.js validation)
- `npm run start` (serve a production build)
- Required environment variable names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Testing & quality

No dedicated test, lint, format, or standalone type-check scripts are currently configured. Run `npm run build` before committing; it includes Next.js linting and validity checks.

## Project structure

- `app/`: App Router routes, route layouts, and global CSS. Authenticated routes are in `app/(app)/`.
- `components/`: existing shared application components; `components/ui/` contains shadcn/ui primitives.
- `lib/`: Supabase client, data mutation helpers, date helpers, and `cn()` in `utils.js`.
- `supabase/schema.sql`: database schema, row-level-security policies, and table definitions.

## Code style & conventions

- Use JavaScript and JSX; name React components in PascalCase and helper functions in camelCase.
- Prefer the `@/*` alias for project-root imports.
- Keep route-specific code beside its route and reusable application components in `components/`.
- Handle Supabase mutation errors before updating UI state. Keep user data access scoped through Supabase and its RLS policies.

## UI & design system (shadcn/ui)

- Use components from `components/ui/` for all new UI; do not recreate controls shadcn/ui provides.
- Add primitives with `npx shadcn@latest add <component>`.
- Use Tailwind utilities and `cn()` from `@/lib/utils`; avoid inline styles and new component CSS files.
- Use theme utilities and tokens such as `bg-background`, `text-foreground`, and `bg-primary`, rather than hard-coded colors.
- The theme supports `.dark`; make new UI responsive by default, mobile first, with accessible labels, focus states, keyboard interaction, and sufficient contrast.
- Put custom shared components in `components/` with PascalCase filenames. Prefer composition; keep any edits to `components/ui/` minimal.

## Architecture & system design

Client route components query Supabase directly and hold view data in React state. Shared helpers in `lib/db.js` perform common updates and deletes; `lib/supabase.js` supplies the client. The authenticated layout observes the Supabase session and redirects unauthenticated visitors to `/login`. Database tables use `user_id` and RLS policies in `supabase/schema.sql` so users can access only their own rows.

## Git & PR rules

The repository is currently on `main` and defines no repository-specific branch, commit, or PR convention. Agree on a convention before introducing one; keep changes focused and describe validation in PRs.

## Security & off-limits

Never commit secrets or `.env.local`. Do not change Supabase auth logic, row-level-security policies, or `supabase/schema.sql` without asking first: schema changes can affect existing user data.

## Common gotchas

- The root page redirects to `/dashboard`; authenticated pages are protected by the `(app)` layout.
- The Supabase client has placeholder fallbacks so builds work without local credentials; real use still requires both public environment variables.
- There is an older custom `components/ui.jsx`; it is distinct from the new `components/ui/` directory and remains in use by existing pages.
