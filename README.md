# Vite + tRPC + Firebase template

A minimal monorepo for a full-stack TypeScript application.

- **Frontend** - React and Vite with [TanStack Router](https://tanstack.com/router) and Tailwind CSS, in
  `packages/frontend`.
- **Backend** - [tRPC](https://trpc.io) on Express, on Firebase Cloud Functions, in `packages/backend`.
- **Shared code** - types and arktype schemas, in `packages/common`.

Monorepo tooling is provided by [Turborepo](https://turborepo.dev).

## What's included?

- Basic routing setup with some example pages and protected routes
- Basic database setup with Firestore
- Minimal login/logout flow
- Authentication state provided through the router context
- Demo procedures, queries, and mutations
- Sample unit and E2E tests

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

## Why use this stack?

### TanStack Query

[TanStack Query](https://tanstack.com/query/latest) is the standard library for fetching data from your frontend
and managing related state. It provides query and mutation hooks that simplify
the data fetching lifecycle by handling caching and loading + error states for
you.

Instead of fetching in a `useEffect`, always use query and mutation hooks to
manage state between your frontend and backend.

### TanStack Router

[TanStack Router](https://tanstack.com/router/latest) is a typesafe page router. It uses file based routing, meaning
the route map of your app is defined by the directory structure of your
pages.

TanStack Router also provides powerful validation, data loading, context management,
and type checking features that ensure your routing is more robust. For example,
linking to a non-existent page in your app becomes a type error that you can catch at
build time.

### tRPC

[tRPC](https://trpc.io) is a typesafe remote procedure call framework. It allows you to define
procedures on your backend (think of these as functions) and call them
from your frontend.

tRPC differentiates itself from other frameworks by ensuring that you can only
call your backend with input that adheres to the expected schema. Likewise, tRPC
makes your frontend aware of the exact schema that each procedure will return.

Combined, this provides a better developer experience (your editor will show you
the types each procedure accepts and returns) and rules out an entire class of bugs
at build time (you can no longer give your backend bad data!).

tRPC is tightly integrated with TanStack Query, allowing you to easily turn your
procedures into queries and mutations. You'll see examples of this in the template.

### ArkType

[ArkType](https://arktype.io/) is a schema validator that prioritizes performance
and similarity to TypeScript syntax. It is used at the boundary between the frontend
and backend to ensure data is the correct shape and structure as it's passed
across the wire.

It is highly recommended that you define all your data models as schemas first, then
infer their associated type with `.infer`. This reduces duplication and eliminates drift
between the schema and its associated TypeScript type.

ArkType adheres to the standard schema spec. Thus, you can drop in any equivalent schema
validator if you prefer, like Zod.

### oxc

[oxc](https://oxc.rs/) provides a collection of fast tooling for JavaScript and TypeScript.
This template uses `oxlint` for linting and `oxfmt` for formatting. `oxlint` is mostly
compatible with `eslint` and `oxfmt` is fully compatible with `prettier`.

## How a request finds the API

The frontend always calls the relative path `/api/trpc`.

- In development, Vite sends `/api` to the Functions emulator.
- In production, Firebase Hosting sends `/api/**` to the `api` function.

Express receives the same path in the two conditions. The tRPC client does not
examine the environment.

## Add a page

TanStack Router reads the files in `packages/frontend/src/routes`. The name of
the file and its path gives the URL.

1. Ensure the dev environment is running
1. Make a file, for example `src/routes/about.tsx`.
1. Vite will autogenerate the route scaffold in the file for you.

The Vite plugin writes `src/routeTree.gen.ts` again after each change.

## Import paths

Lint rules ban relative import path s. Use one of these aliases instead:

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
