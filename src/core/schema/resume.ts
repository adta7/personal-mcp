import { z } from "zod";
import { Markdown, NonEmpty, Url, YearMonth } from "./primitives";

export const Role = z
  .object({
    org: NonEmpty.meta({ description: "Employer or client name." }),
    title: NonEmpty,
    location: NonEmpty.optional(),
    url: Url.optional(),
    startedOn: YearMonth,
    endedOn: YearMonth.optional().meta({
      description: "Absent means current. Do not substitute today's date -- absence is the signal.",
    }),
    summary: NonEmpty.meta({ description: "What the role was, in one or two sentences." }),
    highlights: z.array(NonEmpty).default([]).meta({
      description:
        "Concrete outcomes, one per entry. Outcomes rather than responsibilities -- what changed, not what was assigned.",
    }),
    stack: z.array(NonEmpty).default([]),
  })
  .meta({ id: "Role" });

export const Education = z
  .object({
    institution: NonEmpty,
    credential: NonEmpty.meta({ description: "Degree or program name.", example: "B.S. Computer Science" }),
    startedOn: YearMonth.optional(),
    endedOn: YearMonth.optional(),
    notes: Markdown.optional(),
  })
  .meta({ id: "Education" });

/**
 * The aggregate an agent asks for when screening Albert for something.
 *
 * Note what is NOT here: JSON Resume field names. That standard is a *serialization*, so it
 * lives in the REST adapter behind `?format=jsonresume`. Letting an external format dictate
 * the domain shape would invert the dependency this project is built to keep straight.
 */
export const Resume = z
  .object({
    roles: z.array(Role).meta({ description: "Reverse-chronological: most recent first." }),
    education: z.array(Education),
  })
  .meta({ id: "Resume", description: "Structured work history and education." });

export type Role = z.infer<typeof Role>;
export type Education = z.infer<typeof Education>;
export type Resume = z.infer<typeof Resume>;
