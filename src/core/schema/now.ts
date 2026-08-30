import { z } from "zod";
import { IsoDate, Markdown, NonEmpty } from "./primitives";

export const AvailabilityStatus = z
  .enum(["open-to-work", "open-to-consulting", "selectively-open", "not-looking"])
  .meta({
    id: "AvailabilityStatus",
    description:
      "Whether Albert is open to new work. A closed enum on purpose: this is the field agents will branch on, and free text would force every consumer to guess.",
  });

export const Now = z
  .object({
    updatedOn: IsoDate.meta({
      description:
        "When this was last revised. Exposed because a stale `now` page is worse than none -- a consumer should be able to discount it.",
    }),
    availability: z.object({
      status: AvailabilityStatus,
      detail: NonEmpty.optional().meta({
        description: "Free-text nuance qualifying the status. Never a substitute for it.",
      }),
    }),
    focus: z.array(NonEmpty).default([]).meta({
      description: "What Albert is actively working on right now, most important first.",
    }),
    body: Markdown,
  })
  .meta({
    id: "Now",
    description:
      "Current status and availability. The highest-value thing an agent can ask about a person, and the thing a static resume never knows.",
  });

export type Now = z.infer<typeof Now>;
