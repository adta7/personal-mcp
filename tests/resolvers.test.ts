import { describe, expect, it } from "vitest";
import {
  getNow,
  getProfile,
  getProject,
  getResume,
  listProjects,
  search,
} from "@/core/resolvers";
import { Now, Profile, Project, ProjectSummary, Resume } from "@/core/schema";

/**
 * Resolvers are tested against the contract, not against fixtures. Asserting that every
 * return value re-validates under its own schema is what guarantees the OpenAPI document
 * and the MCP tool descriptions are telling the truth about what callers receive.
 */
describe("resolvers honour the contract", () => {
  it("returns a Profile that validates as a Profile", async () => {
    expect(Profile.safeParse(await getProfile()).success).toBe(true);
  });

  it("returns a Resume and a Now that validate", async () => {
    expect(Resume.safeParse(await getResume()).success).toBe(true);
    expect(Now.safeParse(await getNow()).success).toBe(true);
  });

  it("omits bodies from list views", async () => {
    const list = await listProjects();
    expect(list.length).toBeGreaterThan(0);
    for (const item of list) {
      expect(ProjectSummary.safeParse(item).success).toBe(true);
      expect(item).not.toHaveProperty("body");
    }
  });

  it("returns the full body from a detail view", async () => {
    const project = await getProject("personal-mcp");
    expect(project).toBeDefined();
    expect(Project.safeParse(project).success).toBe(true);
    expect(project?.body.length).toBeGreaterThan(0);
  });

  it("returns undefined for a missing slug rather than throwing", async () => {
    // Adapters turn this into a 404; core has no opinion about HTTP.
    expect(await getProject("does-not-exist")).toBeUndefined();
  });

  it("filters by featured and status", async () => {
    expect((await listProjects({ featured: true })).every((p) => p.featured)).toBe(true);
    expect((await listProjects({ status: "archived" })).every((p) => p.status === "archived")).toBe(true);
  });

  it("finds content by term and returns nothing for an empty query", async () => {
    const hits = await search("MCP");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.matches).toBeGreaterThan(0);
    expect(await search("   ")).toEqual([]);
  });
});
