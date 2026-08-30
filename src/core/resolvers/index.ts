/**
 * Resolvers are the only way anything reads content.
 *
 * The website, the REST API, and the MCP server all call these same functions. That is the
 * mechanism behind the project's central claim: a fact about Albert is resolved by exactly
 * one piece of code, so the three surfaces cannot disagree. If you find yourself reaching
 * for `loadContent()` inside an adapter, the logic belongs here instead.
 *
 * Everything is plain data in, plain data out -- no Request, no Response, no React.
 * `undefined` means "no such thing"; turning that into a 404 is an adapter's job, because
 * only the adapter knows what a 404 is.
 */
import { loadContent } from "../content/load";
import type { Now, Post, PostSummary, Profile, Project, ProjectSummary, Resume } from "../schema";

export async function getProfile(): Promise<Profile> {
  return (await loadContent()).profile;
}

export async function getNow(): Promise<Now> {
  return (await loadContent()).now;
}

export async function getResume(): Promise<Resume> {
  return (await loadContent()).resume;
}

export interface ListProjectsOptions {
  /** Restrict to featured projects only. */
  featured?: boolean;
  /** Restrict to a lifecycle status. */
  status?: Project["status"];
}

/** List views omit bodies: listing 20 projects should not return 20 essays. */
export async function listProjects(options: ListProjectsOptions = {}): Promise<ProjectSummary[]> {
  const { projects } = await loadContent();
  return projects
    .filter((p) => (options.featured === undefined ? true : p.featured === options.featured))
    .filter((p) => (options.status === undefined ? true : p.status === options.status))
    .map(({ body: _body, ...summary }) => summary);
}

export async function getProject(slug: string): Promise<Project | undefined> {
  const { projects } = await loadContent();
  return projects.find((p) => p.slug === slug);
}

export async function listPosts(): Promise<PostSummary[]> {
  const { posts } = await loadContent();
  return posts.map(({ body: _body, ...summary }) => summary);
}

export async function getPost(slug: string): Promise<Post | undefined> {
  const { posts } = await loadContent();
  return posts.find((p) => p.slug === slug);
}

export interface SearchHit {
  kind: "project" | "post";
  slug: string;
  title: string;
  summary: string;
  /** Count of query-term occurrences. Deliberately not presented as a relevance score. */
  matches: number;
}

/**
 * Substring search across titles, summaries, and bodies.
 *
 * Honest about what it is: term counting over a few dozen documents. At this corpus size a
 * real index would be more machinery than the problem has earned, and pretending the number
 * is a relevance score would mislead a consumer into weighting it.
 */
export async function search(query: string): Promise<SearchHit[]> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const { projects, posts } = await loadContent();
  const documents = [
    ...projects.map((p) => ({ kind: "project" as const, slug: p.slug, title: p.title, summary: p.summary, body: p.body })),
    ...posts.map((p) => ({ kind: "post" as const, slug: p.slug, title: p.title, summary: p.summary, body: p.body })),
  ];

  return documents
    .map(({ body, ...doc }) => {
      const haystack = `${doc.title}\n${doc.summary}\n${body}`.toLowerCase();
      const matches = terms.reduce(
        (total, term) => total + haystack.split(term).length - 1,
        0,
      );
      return { ...doc, matches };
    })
    .filter((hit) => hit.matches > 0)
    .sort((a, b) => b.matches - a.matches || a.slug.localeCompare(b.slug));
}
