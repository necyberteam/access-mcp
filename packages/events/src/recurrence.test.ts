import { describe, it, expect } from "vitest";
import { DRUPAL_CONTRACT, fmt12 } from "./recurrence.js";

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

describe("fmt12", () => {
  it("converts 24h HH:MM to Drupal 12-hour uppercase", () => {
    expect(fmt12("14:00")).toBe("02:00 PM");
    expect(fmt12("09:00")).toBe("09:00 AM");
    expect(fmt12("00:00")).toBe("12:00 AM");
    expect(fmt12("12:00")).toBe("12:00 PM");
    expect(fmt12("23:30")).toBe("11:30 PM");
  });
});
