import { describe, it, expect } from "vitest";
import { AllocationsServer } from "./server.js";

/**
 * Ranking and the min_allocation threshold must use the ACCESS Credits amount,
 * not a cross-unit sum. Real projects mix units within one resource array
 * (e.g. 200000 ACCESS Credits + 45 Dollars + 1 "[Yes = 1, No = 0]" flag);
 * summing those (= 200046) is meaningless. The credits amount (200000) is the
 * one comparable magnitude.
 */

type Res = { resourceName: string; units: string | null; allocation: number | null; resourceId: number };

function res(resourceName: string, units: string | null, allocation: number | null): Res {
  return { resourceName, units, allocation, resourceId: 0 };
}

function creditsOf(server: AllocationsServer, resources: Res[]): number {
  return (
    server as unknown as { accessCreditsAmount: (p: { resources: Res[] }) => number }
  ).accessCreditsAmount({ resources });
}

describe("accessCreditsAmount", () => {
  const server = new AllocationsServer();

  it("returns only the ACCESS Credits line, ignoring dollars and flag units", () => {
    const amount = creditsOf(server, [
      res("ACCESS Credits", "ACCESS Credits", 200000),
      res("CloudBank Classroom", "Dollars", 45),
      res("MATCHPlus Pilot", "[Yes = 1, No = 0]", 1),
    ]);
    expect(amount).toBe(200000); // not 200046
  });

  it("does not blend SUs / GB into the credits amount", () => {
    const amount = creditsOf(server, [
      res("ACCESS Credits", "ACCESS Credits", 40000),
      res("Indiana Jetstream2", "SUs", 150000),
      res("Indiana Jetstream2 Storage", "GB", 10000),
    ]);
    expect(amount).toBe(40000); // not 200000
  });

  it("reports 0 for a legacy project with no ACCESS Credits line", () => {
    const amount = creditsOf(server, [res("Bridges-2", "SUs", 500000)]);
    expect(amount).toBe(0);
  });

  it("ranks a large-credits project above one with a bigger cross-unit blend", () => {
    // Project A: 200000 credits. Project B: 40000 credits but 150000 SUs + 10000 GB
    // (naive sum 200000) — a blended sort would tie/misorder them; credits ranks A first.
    const a = creditsOf(server, [res("ACCESS Credits", "ACCESS Credits", 200000)]);
    const b = creditsOf(server, [
      res("ACCESS Credits", "ACCESS Credits", 40000),
      res("X", "SUs", 150000),
      res("Y", "GB", 10000),
    ]);
    expect(a).toBeGreaterThan(b);
  });
});
