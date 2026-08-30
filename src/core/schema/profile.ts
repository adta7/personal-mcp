import { z } from "zod";
import { Email, Markdown, NonEmpty, Url } from "./primitives";

export const Link = z
  .object({
    label: NonEmpty.meta({ description: "Human-facing name for the destination.", example: "GitHub" }),
    url: Url,
    kind: z
      .enum(["github", "linkedin", "x", "email", "website", "resume", "other"])
      .meta({
        description:
          "Coarse category, so a consumer can find the GitHub link without string-matching the label.",
      }),
  })
  .meta({ id: "Link" });

export const Profile = z
  .object({
    name: NonEmpty.meta({ description: "Full name.", example: "Albert Yan" }),
    headline: NonEmpty.meta({
      description:
        "One line answering 'who is this person, professionally'. The single most quoted field -- an agent introducing Albert will almost always reach for this first.",
      example: "Software engineer building agent-accessible systems.",
    }),
    pronouns: NonEmpty.optional().meta({ description: "Preferred pronouns, if stated.", example: "he/him" }),
    location: NonEmpty.optional().meta({
      description: "City-level location. Deliberately not more precise than that.",
      example: "New York, NY",
    }),
    summary: Markdown.meta({
      description: "A few paragraphs of background. Longer prose than `headline`.",
    }),
    email: Email.optional(),
    links: z.array(Link).meta({ description: "External profiles, ordered by how much Albert wants them seen." }),
  })
  .meta({
    id: "Profile",
    description: "Core identity: who Albert is and how to reach him.",
  });

export type Profile = z.infer<typeof Profile>;
export type Link = z.infer<typeof Link>;
