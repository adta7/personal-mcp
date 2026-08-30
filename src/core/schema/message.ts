import { z } from "zod";
import { Email, NonEmpty } from "./primitives";

/**
 * The one public write in the system. Treated as hostile input.
 *
 * Length caps are part of the contract rather than a runtime afterthought: because this
 * schema is also the MCP tool's `inputSchema`, a well-behaved client is told the limits
 * before it sends, and a badly-behaved one is rejected by the same rule.
 */
export const InboundMessageInput = z
  .object({
    fromName: NonEmpty.max(120).meta({ description: "Who is writing, or who they represent." }),
    fromEmail: Email.meta({ description: "Where Albert should reply. Never published." }),
    org: NonEmpty.max(160).optional(),
    subject: NonEmpty.max(200),
    body: NonEmpty.max(5000).meta({
      description: "The message. Include enough context that Albert can act without a follow-up round trip.",
    }),
  })
  .meta({
    id: "InboundMessageInput",
    description: "A message left for Albert by a person or an agent acting for one.",
  });

export const InboundMessageReceipt = z
  .object({
    id: NonEmpty.meta({ description: "Opaque identifier for the stored message." }),
    receivedAt: z.iso.datetime().meta({ description: "Server receipt time, UTC." }),
  })
  .meta({
    id: "InboundMessageReceipt",
    description:
      "Confirmation that a message was stored. Deliberately reveals nothing else -- a public endpoint must not become a way to read the inbox.",
  });

export type InboundMessageInput = z.infer<typeof InboundMessageInput>;
export type InboundMessageReceipt = z.infer<typeof InboundMessageReceipt>;
