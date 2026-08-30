import { z } from "zod";
import { Markdown, NonEmpty, Slug, YearMonth } from "./primitives";
import { Link } from "./profile";

/** The part an author writes by hand, in MDX front matter. */
export const ProjectFrontmatter = z.object({
  title: NonEmpty.meta({ description: "Project name as Albert refers to it." }),
  summary: NonEmpty.meta({
    description:
      "One or two sentences on what it is and why it exists. Written to stand alone -- this is what gets quoted when the full body is too long to include.",
  }),
  stack: z.array(NonEmpty).meta({
    description: "Notable technologies. For filtering and matching, not an exhaustive dependency list.",
    example: ["TypeScript", "Next.js", "MCP"],
  }),
  role: NonEmpty.optional().meta({
    description: "Albert's role, when the project had more than one person.",
    example: "Sole author",
  }),
  status: z.enum(["active", "shipped", "archived", "experiment"]).meta({
    description:
      "Lifecycle stage. `archived` means intentionally no longer maintained -- not that it failed.",
  }),
  // Month precision, like employment spans: a day-level project start date implies more
  // precision than anyone actually means, and invites invented specificity.
  startedOn: YearMonth,
  completedOn: YearMonth.optional().meta({
    description: "Absent while a project is still `active`.",
  }),
  featured: z.boolean().default(false).meta({
    description: "Whether this leads the homepage. Keep the count small or the signal disappears.",
  }),
  links: z.array(Link).default([]),
});

/** What a resolver returns: front matter plus the identity and body derived from the file. */
export const Project = ProjectFrontmatter.extend({
  slug: Slug,
  body: Markdown.meta({ description: "Full project write-up, as Markdown source." }),
}).meta({
  id: "Project",
  description: "Something Albert built. The `body` is the long form; `summary` is the quotable one.",
});

/** List views omit `body` -- an agent listing 20 projects should not receive 20 essays. */
export const ProjectSummary = Project.omit({ body: true }).meta({
  id: "ProjectSummary",
  description: "A project without its body text, for list responses.",
});

export type Project = z.infer<typeof Project>;
export type ProjectSummary = z.infer<typeof ProjectSummary>;
