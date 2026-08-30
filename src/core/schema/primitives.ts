import { z } from "zod";

/**
 * Shared scalars.
 *
 * Every schema in this directory is written once and consumed four ways: as a TypeScript
 * type, as a build-time validator for `content/`, as an OpenAPI 3.1 component, and as an
 * MCP tool `inputSchema`. That is the single highest-leverage decision in this codebase --
 * there is no hand-maintained API spec to drift from the implementation.
 *
 * A consequence worth internalizing: the `description` on each field is not a code comment.
 * It is rendered into `/openapi.json` AND handed to a language model deciding whether and
 * how to call a tool. Write descriptions for that reader.
 */

export const Slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slugs are lowercase alphanumeric words joined by single hyphens.",
  )
  .meta({
    id: "Slug",
    description:
      "URL-safe identifier for a single item. Stable over time -- once published, a slug is a permalink and is never reused for different content.",
    example: "personal-mcp",
  });

export const IsoDate = z.iso.date().meta({
  id: "IsoDate",
  description: "Calendar date in ISO 8601 `YYYY-MM-DD` form. Always interpreted as UTC.",
  example: "2026-08-29",
});

export const YearMonth = z
  .string()
  .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, "Expected `YYYY-MM`.")
  .meta({
    id: "YearMonth",
    description:
      "Month precision, `YYYY-MM`. Used for employment and education spans, where a day-level date implies more precision than anyone actually means.",
    example: "2024-06",
  });

export const Url = z.url().meta({
  id: "Url",
  description: "Absolute URL including scheme.",
  example: "https://github.com/adta7/personal-mcp",
});

export const Email = z.email().meta({
  id: "Email",
  description: "Contact email address.",
  example: "yan.albert.us@gmail.com",
});

export const Markdown = z.string().meta({
  id: "Markdown",
  description:
    "CommonMark text. Returned raw rather than as rendered HTML so that a consuming model reads the source, not markup.",
});

/** Non-empty trimmed string -- catches the `""` that YAML front matter silently produces. */
export const NonEmpty = z.string().trim().min(1);
