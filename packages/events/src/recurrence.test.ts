import { describe, it, expect } from "vitest";
import { DRUPAL_CONTRACT } from "./recurrence.js";

describe("DRUPAL_CONTRACT", () => {
  it("maps short weekdays to Drupal's full lowercase names", () => {
    expect(DRUPAL_CONTRACT.weekdays.mon).toBe("monday");
    expect(DRUPAL_CONTRACT.weekdays.sun).toBe("sunday");
    expect(Object.keys(DRUPAL_CONTRACT.weekdays)).toHaveLength(7);
  });
  it("maps short months to Drupal's capitalized 3-letter form", () => {
    expect(DRUPAL_CONTRACT.months.mar).toBe("Mar");
    expect(DRUPAL_CONTRACT.months.dec).toBe("Dec");
    expect(Object.keys(DRUPAL_CONTRACT.months)).toHaveLength(12);
  });
  it("lists all five week positions and both monthly modes", () => {
    expect(DRUPAL_CONTRACT.weekPositions).toEqual(["first","second","third","fourth","last"]);
    expect(DRUPAL_CONTRACT.monthlyModes).toEqual(["weekday","monthday"]);
  });
});
