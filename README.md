# Vite + tRPC + Firebase template

A minimal monorepo for a full-stack TypeScript application. 

- **Frontend** - React and Vite with TanStack Router and Tailwind CSS, in
  `packages/frontend`.
- **Backend** - tRPC on Express, on Firebase Cloud Functions, in `packages/backend`.
- **Shared code** - types and arktype schemas, in `packages/common`.

## Before you start

Install these tools first:

| Tool    | Version                                                |
| ------- | ------------------------------------------------------ |
| Node.js | 22 or later                                            |
| pnpm    | 11 or later                                            |
| Java    | 21 or later (the Auth and Firestore emulators need it) |

You do not need a Firebase account to start. The template uses the project ID
`demo-vtf-template`. Firebase treats a `demo-` project as an offline project.

## Install

```sh
pnpm install
```

## Start the development environment

```sh
pnpm dev
```

This command starts three processes:

- Vite, on <http://127.0.0.1:5173>.
- The esbuild watcher, which bundles the backend after each change.
- The Firebase emulators. The Emulator UI is on <http://127.0.0.1:4000>.

Open <http://127.0.0.1:5173>. The demo has two pages:

- **Home** shows a public procedure, a protected procedure, and a sign-in
  form. The form makes the account if the account does not exist.
- **Notes** shows notes from Firestore. Each note belongs to one user.

The emulators show a warning about Node.js 22 and Node.js 24. This is safe.
Cloud Functions runs Node.js 22. Your computer can run a later version.

## Check the code

```sh
pnpm checks      # lint, format, types, and unit tests
pnpm test:e2e    # Playwright, against the emulators
```

You can also run each check alone:

```sh
pnpm lint
pnpm format         # write the changes
pnpm format:check   # only report the problems
pnpm typecheck
pnpm test
```

`pnpm test:e2e` starts the development environment if it is not running.

## How a request finds the API

The frontend always calls the relative path `/api/trpc`.

- In development, Vite sends `/api` to the Functions emulator.
- In production, Firebase Hosting sends `/api/**` to the `api` function.

Express receives the same path in the two conditions. The tRPC client does not
examine the environment.

## Add a page

TanStack Router reads the files in `packages/frontend/src/routes`. The name of
the file gives the URL.

1. Make a file, for example `src/routes/about.tsx`.
2. Export a route from it:

   ```tsx
   export const Route = createFileRoute("/about")({ component: About });
   ```

The Vite plugin writes `src/routeTree.gen.ts` again after each change. Keep
that file in Git, because `pnpm typecheck` reads it but does not make it.
Do not change it by hand.

`<Link to="...">` accepts only a known route. An unknown route is an error at
compile time.

## Add a style

Tailwind CSS v4 needs no configuration file. `src/index.css` has one line,
`@import "tailwindcss"`. Put your utility classes directly in the JSX. To make
a theme value, use the `@theme` block in `src/index.css`.

## Import paths

Do not use a relative path. Use one of these aliases:

| Alias         | Points to                 |
| ------------- | ------------------------- |
| `@common/*`   | `packages/common/src/*`   |
| `@backend/*`  | `packages/backend/src/*`  |
| `@frontend/*` | `packages/frontend/src/*` |
| `@e2e/*`      | `e2e/*`                   |

```ts
import { auth } from "@frontend/lib/firebase.ts"; // good
import { auth } from "../lib/firebase.ts"; // error
```

For a different package, use the package name, for example `@repo/common`.

`pnpm lint` gives an error for each relative path. The aliases are in
`tsconfig.base.json`. Two other files copy them: `vite.config.ts` and
`vitest.config.ts`. Change all three files together.

Each package has its own alias, because one alias cannot point to three
different directories. TypeScript reads the source of the other packages, so
the names must be different.

## Add a procedure

1. Put the input schema in `packages/common/src/schemas.ts`.
2. Add the procedure to `packages/backend/src/routers/index.ts`. Use
   `publicProcedure` for open access. Use `protectedProcedure` to make a
   Firebase ID token necessary.
3. Call the procedure from the frontend with `trpc.<name>.queryOptions()`.

The editor shows the new types immediately. No build step is necessary,
because each package exports its TypeScript source.

For a test of the new procedure, copy the pattern in
`packages/backend/src/routers/index.test.ts`. These tests call the procedures
directly. They do not need the emulators.

## Connect to a real Firebase project

1. Make a project in the [Firebase console](https://console.firebase.google.com).
2. Turn on Authentication, Firestore, Hosting, and Cloud Functions.
3. Set the project for the Firebase CLI:

   ```sh
   pnpm exec firebase use --add
   ```

4. Copy `.env.example` to `.env`.
5. Put your web app configuration in `.env`.

## Deploy

```sh
pnpm deploy
```

The command does two steps. First it builds the two packages. Then it sends
them to Firebase.

esbuild puts the backend and `@repo/common` into one file,
`packages/backend/dist/index.js`. The build also writes a small
`package.json` next to it. That file has no `workspace:*` dependency, so
Firebase can install it. This is necessary, because Firebase cannot read a
pnpm workspace.

`.github/workflows/deploy.yaml` does the same steps after each push to `main`.
Add these values to the repository first:

- Secret `FIREBASE_SERVICE_ACCOUNT` - a service account key, in JSON.
- Secret `VITE_FIREBASE_API_KEY`.
- Variables `FIREBASE_PROJECT_ID`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`.

## Make the CI checks blocking

`.github/workflows/checks.yaml` runs six jobs on each pull request. GitHub does
not block a merge until you make the jobs necessary. Do this one time:

```sh
gh api -X POST repos/:owner/:repo/rulesets \
  -f name='main' -f target='branch' -f enforcement='active' \
  -F 'conditions[ref_name][include][]=~DEFAULT_BRANCH' \
  -f 'rules[][type]=pull_request' \
  -f 'rules[][type]=required_status_checks' \
  -F 'rules[][parameters][strict_required_status_checks_policy]=true' \
  -f 'rules[][parameters][required_status_checks][][context]=Typecheck' \
  -f 'rules[][parameters][required_status_checks][][context]=Lint' \
  -f 'rules[][parameters][required_status_checks][][context]=Format' \
  -f 'rules[][parameters][required_status_checks][][context]=Unit Tests' \
  -f 'rules[][parameters][required_status_checks][][context]=E2E Tests' \
  -f 'rules[][parameters][required_status_checks][][context]=Full Build'
```

## Keep `firebase-functions` in the root

The root `package.json` has `firebase-functions` in `devDependencies`. Do not
remove it. The Functions emulator looks for the `firebase-functions` program
in the root `node_modules/.bin`. Without it, the emulator cannot load the
function.

## Layout

```
packages/common     Types and arktype schemas. No build step.
packages/backend    tRPC router, Express app, auth middleware.
packages/frontend   React application, routes, and tRPC client.
e2e                 Playwright tests.
firebase.json       Emulators, Hosting rewrite, and function source.
turbo.json          The build, typecheck, and lint tasks.
vitest.config.ts    One unit-test runner for all packages.
```
