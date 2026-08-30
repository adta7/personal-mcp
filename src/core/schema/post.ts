import { z } from "zod";
import { IsoDate, Markdown, NonEmpty, Slug } from "./primitives";

export const PostFrontmatter = z.object({
  title: NonEmpty,
  summary: NonEmpty.meta({
    description: "Standalone one-liner. Used in list responses and as the description a model reads before deciding to fetch the full post.",
  }),
  publishedOn: IsoDate,
  updatedOn: IsoDate.optional(),
  tags: z.array(NonEmpty).default([]),
});

export const Post = PostFrontmatter.extend({
  slug: Slug,
  body: Markdown,
}).meta({ id: "Post", description: "A piece of writing." });

export const PostSummary = Post.omit({ body: true }).meta({
  id: "PostSummary",
  description: "A post without its body, for list responses.",
});

export type Post = z.infer<typeof Post>;
export type PostSummary = z.infer<typeof PostSummary>;
