/**
 * High-level recurrence intent → Drupal recurring_events column shapes.
 * DRUPAL_CONTRACT mirrors the recurring_events FieldType/widget vocab; if Drupal
 * changes these, this block (and the drift test) must change with it. Sources:
 *   weekdays/full-lowercase: WeeklyRecurringDate widget getDayOptions()
 *   weekPositions: MonthlyRecurringDateWidget day_occurrence options
 *   months/"Mar": YearlyRecurringDateWidget month options (PHP `M` format)
 *   monthlyModes: MonthlyRecurringDate `type` discriminator
 */
export type Frequency = "daily" | "weekly" | "monthly" | "yearly" | "consecutive";

export interface RecurrenceIntent {
  frequency: Frequency;
  start_date: string;   // YYYY-MM-DD
  end_date: string;     // YYYY-MM-DD
  start_time?: string;  // HH:MM 24h (daily/weekly/monthly/yearly)
  duration_minutes?: number;
  ends_at?: string;     // HH:MM 24h — alternative to duration_minutes
  days?: string[];      // ["mon","wed"]
  monthly_mode?: "weekday" | "monthday";
  week_positions?: string[];
  days_of_month?: number[];
  year_interval?: number;
  months?: string[];    // ["mar","apr"]
  window_start?: string;  // HH:MM 24h (consecutive)
  window_end?: string;
  session_minutes?: number;
  gap_minutes?: number;
}

export const DRUPAL_CONTRACT = {
  weekdays: {
    mon: "monday", tue: "tuesday", wed: "wednesday", thu: "thursday",
    fri: "friday", sat: "saturday", sun: "sunday",
  } as Record<string, string>,
  weekPositions: ["first", "second", "third", "fourth", "last"],
  months: {
    jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr", may: "May", jun: "Jun",
    jul: "Jul", aug: "Aug", sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec",
  } as Record<string, string>,
  monthlyModes: ["weekday", "monthday"],
};
