import { describe, expect, it } from "vitest";
import { z } from "zod";
import { InboundMessageInput, Now, Project, Slug } from "@/core/schema";

/**
 * The loader's promise is "bad content cannot reach production". That promise is only
 * worth as much as the schemas' willingness to reject things, so these tests assert the
 * refusals rather than the happy path.
 */
describe("the contract rejects malformed content", () => {
  it("rejects slugs that would not survive a URL", () => {
    expect(Slug.safeParse("Personal MCP").success).toBe(false);
    expect(Slug.safeParse("trailing-").success).toBe(false);
    expect(Slug.safeParse("personal-mcp").success).toBe(true);
  });

  it("rejects an unknown project status instead of passing it through", () => {
    const result = Project.safeParse({
      slug: "x",
      title: "X",
      summary: "s",
      stack: [],
      status: "in-progress", // not a member of the enum
      startedOn: "2026-01-01",
      body: "b",
    });
    expect(result.success).toBe(false);
  });

  it("rejects free-text availability, which consumers would have to guess at", () => {
    const base = { updatedOn: "2026-08-29", focus: [], body: "b" };
    expect(Now.safeParse({ ...base, availability: { status: "maybe?" } }).success).toBe(false);
    expect(Now.safeParse({ ...base, availability: { status: "not-looking" } }).success).toBe(true);
  });

  it("caps inbound message size at the contract, not at runtime", () => {
    const valid = {
      fromName: "A Recruiter",
      fromEmail: "someone@example.com",
      subject: "Role",
      body: "Hello",
    };
    expect(InboundMessageInput.safeParse(valid).success).toBe(true);
    expect(
      InboundMessageInput.safeParse({ ...valid, body: "x".repeat(5001) }).success,
    ).toBe(false);
    expect(InboundMessageInput.safeParse({ ...valid, fromEmail: "not-an-email" }).success).toBe(false);
  });

  it("produces an error a human can act on", () => {
    const result = Project.safeParse({ slug: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pretty = z.prettifyError(result.error);
      // The message must name the missing field, since it is what CI prints on failure.
      expect(pretty).toContain("title");
    }
  });
});
