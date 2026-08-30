import { describe, expect, it } from "vitest";
import { loadContent } from "@/core/content/load";

/**
 * The guarantee this file exists to make: `content/` is valid, and it is valid according
 * to the same schemas the API and MCP server serve. If someone edits front matter into a
 * shape the contract does not allow, this fails before a deploy exists.
 */
describe("content graph", () => {
  it("loads and validates every file in content/", async () => {
    const graph = await loadContent();
    expect(graph.profile.name).toBe("Albert Yan");
    expect(graph.projects.length).toBeGreaterThan(0);
    expect(graph.resume.roles.length).toBeGreaterThan(0);
  });

  it("derives project slugs from filenames", async () => {
    const { projects } = await loadContent();
    const slugs = projects.map((p) => p.slug);
    expect(slugs).toContain("personal-mcp");
    // Identity comes from one place, so duplicates are impossible by construction.
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("orders projects newest first", async () => {
    const { projects } = await loadContent();
    const dates = projects.map((p) => p.startedOn);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
