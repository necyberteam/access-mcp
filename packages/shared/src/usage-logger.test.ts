import { describe, it, expect } from "vitest";
import { hashActor } from "./usage-logger.js";

describe("hashActor", () => {
  it("returns null for an anonymous (undefined) actor", () => {
    expect(hashActor(undefined)).toBeNull();
  });

  it("treats an empty-string actor as anonymous (null)", () => {
    expect(hashActor("")).toBeNull();
  });

  it("is deterministic — same actor, same hash", () => {
    expect(hashActor("alice@access-ci.org")).toBe(hashActor("alice@access-ci.org"));
  });

  it("differs for different actors", () => {
    expect(hashActor("alice@access-ci.org")).not.toBe(hashActor("bob@access-ci.org"));
  });

  it("is not the raw identity (irreversible — no PII in output)", () => {
    const h = hashActor("alice@access-ci.org");
    expect(h).not.toContain("alice");
    expect(h).not.toContain("access-ci.org");
  });

  it("produces a fixed-width hex digest", () => {
    expect(hashActor("alice@access-ci.org")).toMatch(/^[0-9a-f]{16}$/);
  });
});
