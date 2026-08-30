# personal-mcp

Albert Yan's homepage — a website, a REST API, and an MCP server that are the **same thing**.

Most personal sites that claim to be "API-accessible" are a site plus a bolted-on `/api`
folder that drifts out of sync within a month. This one is built on a single rule:

> **One content graph. One contract. Three renderers. Zero duplication.**

`content/` holds the facts. `src/core/` resolves them. `src/app/` renders them as HTML, as
JSON, and as MCP. A fact about me is defined once and reachable three ways — never
implemented three times.

## Talk to it

**As a human**

```
https://albertyan.dev
```

**As an agent (MCP)**

```bash
claude mcp add --transport http albert https://albertyan.dev/mcp
```

Exposes MCP **tools** (`get_profile`, `list_projects`, `get_resume`, `get_now`, `search`,
`leave_message`), **resources** (`albert://profile`, `albert://projects/{slug}`, …) so a
client can attach context without spending a tool call, and **prompts**.

**As a program (REST)**

```bash
curl https://albertyan.dev/api/v1                    # hypermedia root, links everything
curl https://albertyan.dev/api/v1/resume             # also ?format=jsonresume
curl -H 'Accept: application/json' https://albertyan.dev/projects/<slug>
```

Every page also answers to `Accept: application/json` and `text/markdown`, and has a `.md`
twin URL. Same resource, three representations — rather than a parallel `/api` universe.

Machine-readable entry points: [`/openapi.json`](https://albertyan.dev/openapi.json),
[`/llms.txt`](https://albertyan.dev/llms.txt),
[`/.well-known/mcp.json`](https://albertyan.dev/.well-known/mcp.json).

## How it works

```
content/        source of truth — MDX + JSON, validated at build, versioned by git
  ↓
src/core/       domain. framework-free. the only code that reads content.
  schema/         Zod, written once → TS types + build validation + OpenAPI + MCP schemas
  resolvers/      getProfile(), listProjects(), getResume(), …
  ↓
src/app/        adapters. thin. parse → resolve → serialize.
  (site)/         React Server Components  → HTML
  api/v1/         route handlers           → JSON
  api/mcp/        mcp-handler              → MCP
```

The arrows only point one way, and that is enforced by ESLint rather than by discipline —
`src/core` may not import React, Next, or any adapter. See `eslint.config.mjs`.

**There is no database.** Content is typed files in git, which already provides durable
storage, versioning, diffs, review, and revert for the ~200 facts that make up a person.
Zod occupies the slot an ORM usually would, and does it at build time: malformed content
fails CI instead of throwing in production.

Design decisions and their rationale live in [`docs/PLAN.md`](docs/PLAN.md).

## Develop

```bash
npm install
npm run dev            # http://localhost:3000
npm run check          # typecheck + lint + build — the same gate CI runs
```

```bash
cp .env.example .env.local
```

Requires Node ≥ 20.9 (CI and production run 24).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict, plus `noUncheckedIndexedAccess`) ·
Tailwind v4 · Zod · `mcp-handler` over the official MCP TypeScript SDK · Vercel Fluid Compute.

MCP transport is **Streamable HTTP**, per the current spec — not the deprecated HTTP+SSE
transport. A stdio proxy is published separately for clients that need one; it holds no
content of its own and therefore cannot go stale.

## License

MIT for the code. The content under `content/` is about a real person; please don't
misrepresent it.
