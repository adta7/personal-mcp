import { describe, expect, it } from "vitest";
import { getProject, listProjects } from "@/core/resolvers";

/**
 * The test that keeps the project's central promise.
 *
 * Once the web, REST, and MCP adapters exist, each of them will be asserted here to derive
 * from the same resolver call, so the three surfaces provably cannot drift. For now it
 * pins the invariant the adapters will be checked against: a list entry and a detail
 * fetch describe the same thing, differing only by the body.
 */
describe("surfaces derive from one source", () => {
  it("list entries and detail fetches agree on every shared field", async () => {
    const list = await listProjects();
    for (const summary of list) {
      const detail = await getProject(summary.slug);
      expect(detail).toBeDefined();
      const { body, ...detailWithoutBody } = detail!;
      expect(detailWithoutBody).toEqual(summary);
    }
  });
});
