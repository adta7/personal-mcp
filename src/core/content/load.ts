import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

import { Now, Post, Profile, Project, Resume, Slug } from "../schema";

/**
 * Reads `content/`, validates every file against the schema, and refuses to return
 * anything if a single file is wrong.
 *
 * This runs during `next build`. That placement is the whole point: content is untrusted
 * input like any other, and the cheapest moment to reject it is before a deploy exists.
 * A typo in front matter becomes a red CI run with a file path and a field name, rather
 * than a 500 on the resume endpoint three weeks later.
 */

const CONTENT_ROOT = path.join(process.cwd(), "content");

/** Thrown with enough detail to fix the file without opening the loader. */
export class ContentError extends Error {
  constructor(relPath: string, detail: string) {
    super(`Invalid content in ${relPath}\n\n${detail}\n`);
    this.name = "ContentError";
  }
}

function parse<T extends z.ZodType>(schema: T, data: unknown, relPath: string): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ContentError(relPath, z.prettifyError(result.error));
  return result.data;
}

async function readJsonFile<T extends z.ZodType>(relPath: string, schema: T): Promise<z.infer<T>> {
  const abs = path.join(CONTENT_ROOT, relPath);
  let raw: string;
  try {
    raw = await readFile(abs, "utf8");
  } catch {
    throw new ContentError(relPath, `File not found at ${abs}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new ContentError(relPath, `Not valid JSON: ${(err as Error).message}`);
  }
  return parse(schema, json, relPath);
}

/**
 * Slug comes from the filename, never from front matter. One source for identity means a
 * file can be renamed without silently orphaning its URL, and two files can never claim
 * the same slug.
 */
async function readMdxDir<T extends z.ZodType>(
  dir: string,
  schema: T,
): Promise<z.infer<T>[]> {
  const abs = path.join(CONTENT_ROOT, dir);
  let names: string[];
  try {
    names = await readdir(abs);
  } catch {
    return [];
  }

  const files = names.filter((n) => n.endsWith(".mdx")).sort();
  return Promise.all(
    files.map(async (name) => {
      const relPath = path.join(dir, name);
      const slug = parse(Slug, name.replace(/\.mdx$/, ""), relPath);
      const raw = await readFile(path.join(abs, name), "utf8");
      const { data, content } = matter(raw);
      return parse(schema, { ...data, slug, body: content.trim() }, relPath);
    }),
  );
}

export interface ContentGraph {
  profile: Profile;
  projects: Project[];
  posts: Post[];
  resume: Resume;
  now: Now;
}

async function read(): Promise<ContentGraph> {
  const [profile, resume, projects, posts, nowFile] = await Promise.all([
    readJsonFile("profile.json", Profile),
    readJsonFile("resume.json", Resume),
    readMdxDir("projects", Project),
    readMdxDir("writing", Post),
    (async () => {
      const raw = await readFile(path.join(CONTENT_ROOT, "now.mdx"), "utf8");
      const { data, content } = matter(raw);
      return parse(Now, { ...data, body: content.trim() }, "now.mdx");
    })(),
  ]);

  return {
    profile,
    resume,
    now: nowFile,
    // Newest first, so every consumer gets the same order without re-sorting.
    projects: projects.sort((a, b) => b.startedOn.localeCompare(a.startedOn)),
    posts: posts.sort((a, b) => b.publishedOn.localeCompare(a.publishedOn)),
  };
}

/**
 * Memoized for the lifetime of the process. Content is immutable between deploys -- a
 * change means a new build -- so re-reading disk per request would buy nothing.
 */
let cached: Promise<ContentGraph> | undefined;

export function loadContent(): Promise<ContentGraph> {
  cached ??= read();
  return cached;
}
