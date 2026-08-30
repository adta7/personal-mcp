# albertyan.dev — Plan

**Goal:** a personal homepage that is simultaneously a website, a versioned REST API, and a
remote MCP server — where all three are *renderings of one content graph*, not three codebases.

Status: DRAFT — awaiting approval. Nothing built yet.

---

## 1. The one idea

Most "API-accessible websites" are a site plus a bolted-on `/api` folder that drifts out of
sync within a month. The thing that makes this project worth building well is a single rule:

> **One content graph. One contract. Three renderers. Zero duplication.**

Everything else in this plan is machinery in service of that rule.

```
content/  →  core/  →  adapters/{web, rest, mcp, agent}
(data)      (domain)   (presentation)
```

Dependency direction is one-way and **enforced by lint**, not by discipline:
`adapters` may import `core`; `core` may import `content`; nothing imports backwards.
If a fact about Albert can be reached three ways, it is resolved by exactly one function.

---

## 2. Why this shape (the decision record)

| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Content store | Typed files in git (`content/`) | Postgres, headless CMS | Git gives free versioning, diffs, review, revert, and offline edit. A personal homepage has ~200 facts that change ~weekly. A database here buys nothing and costs migrations, secrets, and a second source of truth. |
| Contract definition | Zod schemas, once | Hand-written OpenAPI + separate TS types + separate MCP schemas | Zod is the only artifact that can *simultaneously* be the TS type, the build-time validator, the OpenAPI 3.1 doc, and the MCP tool `inputSchema`. Verified: `mcp-handler` accepts Zod directly; `zod-openapi` emits 3.1 from the same objects. This is the highest-leverage decision in the plan. |
| Admin writes | Commit to git via GitHub API | Write to a DB | Keeps one source of truth. Every agent-initiated edit becomes a real commit with an author and a diff you can revert. Cost: ~40s write latency (a deploy). Acceptable — you do not update a bio 50×/hour. |
| Inbound messages | Separate durable store, never git | Same path as admin writes | Untrusted input must never enter the repo. Physically separate lane, separate trust level. |
| MCP transport | Remote streamable HTTP **and** a published stdio *proxy* | stdio copy of the server | A stdio package that re-implements the content goes stale. A ~60-line stdio↔HTTP proxy cannot: it has no content of its own. Broad client compat, zero duplication. |
| API versioning | Frozen `/api/v1/*` | Unversioned | Once an agent hardcodes your endpoint, it is a contract. Version it from commit one; it costs one path segment. |

**Where I'd push back on myself:** §7 (git-commit writes) is the part most at risk of being
over-engineering. It is deliberately isolated — nothing else in the system depends on it —
so it can be deferred to after launch without touching a line of §4–§6.

---

## 3. Stack

- **Next.js 16, App Router, TypeScript strict** — RSC lets one resolver feed HTML and JSON.
- **Vercel, Fluid Compute, Node 24** — MCP streaming needs a real Node runtime, not edge.
- **Tailwind v4** for the page. Deliberately minimal; the site is text.
- **Zod 4** (`zod`), **`zod-openapi`** (OpenAPI 3.1), **`mcp-handler`** (Vercel's MCP adapter),
  **`@modelcontextprotocol/sdk`**.
- **MDX** for prose content. `pnpm`. No database in v1.

---

## 4. Repository layout

```
content/                      # SOURCE OF TRUTH — humans and agents edit here
  profile.json                # name, headline, links, location, pronouns
  now.mdx                     # current focus + availability (front-matter typed)
  experience.json             # roles, dates, scope, outcomes
  education.json
  projects/<slug>.mdx         # front-matter: title, summary, stack, links, dates, featured
  writing/<slug>.mdx          # front-matter: title, date, tags, summary

src/
  core/                       # DOMAIN — pure, framework-free, no Request/Response types
    schema/                   # Zod: profile, project, post, role, now, message, errors
      index.ts                #   → TS types, validators, OpenAPI, MCP input schemas
    content/
      load.ts                 # read + parse + VALIDATE at build; throws on bad content
      hash.ts                 # stable content hash → ETag / Last-Modified
    resolvers/                # the ONLY way anything reads content
      profile.ts projects.ts resume.ts writing.ts now.ts search.ts
    writes/
      authored.ts             # schema-check → GitHub Contents API commit (allowlisted paths)
      inbound.ts              # rate-limited append to message store + notify
    auth/
      verify.ts               # bearer → AuthInfo{clientId, scopes}. One swap point for OAuth.

  app/
    (site)/                   # WEB ADAPTER — RSC pages
      page.tsx  projects/[slug]/page.tsx  writing/[slug]/page.tsx  resume/page.tsx  now/page.tsx
      api-docs/page.tsx       # human-readable "how to talk to this site as a machine"
    api/v1/                   # REST ADAPTER — thin: parse → resolver → serialize
      route.ts                #   hypermedia root; links every endpoint
      profile/ projects/ projects/[slug]/ resume/ writing/ writing/[slug]/ now/ search/
      messages/route.ts       #   POST only, public, rate-limited
      admin/                  #   authenticated mutations
    api/mcp/route.ts          # MCP ADAPTER — tools + resources + prompts
    openapi.json/route.ts     # generated, never hand-edited
    llms.txt/route.ts
    llms-full.txt/route.ts
    .well-known/mcp.json/route.ts
    .well-known/oauth-protected-resource/route.ts

tests/
  contract/parity.test.ts     # ← the test that keeps the promise (see §10)
packages/
  mcp-stdio-proxy/            # published npm pkg; ~60 lines, zero content
```

---

## 5. The contract layer (§the crux)

One Zod object per entity, annotated with `.meta({ id, description, example })`. From that
single definition we derive **five** artifacts mechanically:

1. TypeScript types — `z.infer<typeof Project>`
2. Build-time content validation — a malformed `content/` file **fails the build**, not production
3. `/openapi.json` — `createDocument({ openapi: '3.1.0', paths: … })`
4. MCP tool `inputSchema` — passed straight into `server.registerTool`
5. `/api/v1/schema/<entity>` — raw JSON Schema, so an agent can self-orient

The `.describe()` text on every field is not decoration: it becomes the OpenAPI description
*and* the text an LLM reads to decide how to call the tool. Field descriptions are written
for a model, not for a developer.

---

## 6. Read surfaces

### 6a. REST (`/api/v1`)
- Hypermedia root at `/api/v1` linking every resource — an agent needs one URL to discover all.
- `profile`, `projects`, `projects/{slug}`, `resume` (+ `?format=jsonresume`), `writing`,
  `writing/{slug}`, `now`, `search?q=`.
- **Conditional GETs:** ETag from the content hash + `Cache-Control: s-maxage, stale-while-revalidate`.
  A polling agent gets `304 Not Modified` and costs nothing.
- **Errors:** RFC 9457 `application/problem+json`. No stack traces, no internal IDs.
- **CORS:** `*` on read GETs only; writes are same-origin/bearer.
- `Link: </openapi.json>; rel="service-desc"` header on every API response.

### 6b. Content negotiation on human URLs
`GET /projects/foo` returns HTML to a browser, JSON to `Accept: application/json`, and raw
Markdown to `Accept: text/markdown`. Plus `.md` twin URLs (`/projects/foo.md`) for agents that
cannot set headers. Same URL, three representations — this is what "API-accessible website"
should actually mean, rather than a parallel `/api` universe.

### 6c. MCP (`https://<domain>/mcp` → `/api/mcp`)
- **Tools (anonymous):** `get_profile`, `list_projects`, `get_project`, `get_resume`,
  `get_now`, `list_writing`, `get_post`, `search`, `leave_message`.
- **Resources:** `albert://profile`, `albert://projects/{slug}`, `albert://resume`,
  `albert://now`, `albert://writing/{slug}` — so a client can attach context *without*
  burning a tool call. Most personal MCP servers skip resources; that is the low-hanging-fruit
  version and it makes them worse.
- **Prompts:** `introduce_albert`, `screen_for_role`, `draft_outreach` — reusable, parameterized.
- Add: `claude mcp add --transport http albert https://<domain>/mcp`

### 6d. Discoverability for machines
`/llms.txt` + `/llms-full.txt`, `/openapi.json`, `/.well-known/mcp.json`, JSON-LD `Person`
+ `CreativeWork` in the HTML head, `robots.txt` permitting agent crawlers, and a human
`/api-docs` page that shows the four ways to consume the site side by side.

---

## 7. Write surfaces — two lanes, deliberately unequal

**Lane A — authored (you, or Claude Code acting as you).** Bearer token with scopes.
`update_now`, `set_availability`, `upsert_project`, `publish_post`, `update_profile`.
Flow: validate against the same Zod schema → serialize → **GitHub Contents API commit** to an
allowlisted path under `content/` → Vercel rebuilds. Git is the database; every write has an
author, a timestamp, a diff, and a one-click revert.
Guards: caller never supplies a file path (derived from slug + entity type); commit paths are
allowlisted; schema failure = 422 before any write.

**Lane B — inbound (anyone).** `POST /api/v1/messages` and the `leave_message` MCP tool.
Unauthenticated, rate-limited, size-capped, spam-guarded. Appends to a private store and
notifies you. **Never touches git, never rendered publicly.** Untrusted input stays in its own
lane at its own trust level — that separation is the whole point.

**Auth:** start with a single high-entropy bearer token in Vercel env, verified into a proper
`AuthInfo { clientId, scopes }` shape via `withMcpAuth`. Because everything downstream reads
*scopes* and not the token, upgrading to full OAuth 2.1 later is a change to one function
(`core/auth/verify.ts`) and nothing else. Cheap-to-change boundary, placed on purpose.

---

## 8. Build phases

| # | Phase | Deliverable | Independently shippable? |
|---|---|---|---|
| 0 | Scaffold | Next 16 + TS strict + Tailwind + lint boundary rule + CI | — |
| 1 | Contract + content | Zod schemas, `content/` populated with real facts, loader that fails the build on bad data | — |
| 2 | Resolvers | `core/resolvers/*` fully unit-tested with zero web dependencies | — |
| 3 | Web | The actual homepage. Accessible, fast, dark/light. | ✅ ship |
| 4 | REST | `/api/v1/*` + ETags + `/openapi.json` + problem+json | ✅ ship |
| 5 | MCP read | tools + resources + prompts at `/mcp` | ✅ ship |
| 6 | Discovery | llms.txt, well-known, JSON-LD, `.md` twins, `/api-docs` | ✅ ship |
| 7 | Writes | bearer auth, Lane A git commits, Lane B message store | ✅ ship |
| 8 | stdio proxy | `npx @albertyan/mcp` published | ✅ ship |

Phases 3–8 each end in a deployable state. Nothing after phase 2 blocks anything else.

---

## 9. What I need from you before phase 0

1. **Domain** — `albertyan.dev`? Something else? (Affects canonical URLs baked into MCP/JSON-LD.)
2. **GitHub repo** name + public or private. Public is better here: the repo becomes part of the
   portfolio and makes Lane A commits legible. `gh` is installed and authed.
3. **Message store for Lane B** — Upstash Redis (best: durable, rate-limit primitives built in),
   Vercel Blob (fewer vendors), or email-only via Resend (simplest, not queryable). My pick: Upstash.
4. **`vercel` CLI is not installed.** Run `npm i -g vercel` when convenient — needed for
   `vercel env pull` / `vercel deploy` from here.
5. **Your actual content.** I can scaffold the schema with placeholders and you fill it in, or
   you paste a résumé/LinkedIn export and I structure it. The latter is faster and better.

---

## 10. How we verify it actually works

- **Content validation in CI** — bad content breaks the build, never production.
- **Parity test (the one that matters):** for every entity, assert that the HTML page, the REST
  JSON, and the MCP tool output all derive from the same resolver call. This is the automated
  guarantee that the three surfaces cannot drift. If this test passes, the core promise holds.
- **OpenAPI lint** (`redocly lint`) + a test asserting every documented path returns 2xx.
- **Live MCP handshake test** — a script that connects to the deployed endpoint, lists
  tools/resources/prompts, and snapshot-asserts the result.
- **Accessibility + visual smoke** via the `/browse` skill against a preview deploy.
- **Auth negative tests** — admin tools must 401 anonymous and 403 on missing scope.
