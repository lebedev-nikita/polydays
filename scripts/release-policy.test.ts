import { describe, expect, it } from "vitest";
import { releasePolicy } from "./release-policy";

describe("release publication policy", () => {
  it("keeps numbered release candidates as drafts and prereleases", () => {
    for (const version of ["0.2.0-rc.1", "0.2.0-rc.12", "1.0.0-rc.1"]) {
      const policy = releasePolicy(version);
      expect(policy.tag).toBe(`v${version}`);
      expect(policy.createArgs).toEqual(
        expect.arrayContaining(["--draft", "--prerelease", "--latest=false"]),
      );
      expect(policy.publishArgs).toEqual([]);
      expect(policy.pushToMain).toBe(false);
    }
  });

  it("retains stable publication after the draft asset check", () => {
    const policy = releasePolicy("0.2.0");
    expect(policy.createArgs).toContain("--draft");
    expect(policy.createArgs).not.toContain("--prerelease");
    expect(policy.publishArgs).toEqual(["release", "edit", "v0.2.0", "--draft=false", "--latest"]);
    expect(policy.pushToMain).toBe(true);
  });

  it("rejects unsupported or ambiguous versions before any release command", () => {
    for (const version of [
      "0.2",
      "v0.2.0",
      "00.2.0",
      "0.2.0-rc",
      "0.2.0-rc.0",
      "0.2.0-rc.01",
      "0.2.0-beta.1",
      "0.2.0-rc.1\n--draft=false",
    ]) {
      expect(() => releasePolicy(version)).toThrow();
    }
  });
});
