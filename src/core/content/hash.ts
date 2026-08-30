import { createHash } from "node:crypto";

/**
 * Stable fingerprint of a value, used as an HTTP ETag.
 *
 * This is what makes the API cheap to poll. An agent that checks whether Albert is open to
 * work every hour should be answered with `304 Not Modified` and no body until something
 * actually changes. Weak validators keep the semantics honest: two responses with the same
 * tag are semantically equivalent, not necessarily byte-identical.
 */
export function etagOf(value: unknown): string {
  const json = JSON.stringify(value);
  return `W/"${createHash("sha256").update(json).digest("base64url").slice(0, 22)}"`;
}
