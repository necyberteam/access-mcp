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

/** 24-hour "HH:MM" → Drupal's 12-hour uppercase "hh:MM AM/PM" (leading zero). */
export function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export interface RecurrenceError {
  code: "validation_error" | "over_fill" | "out_of_vocab";
  message: string;
}

const FREQUENCIES: Frequency[] = ["daily", "weekly", "monthly", "yearly", "consecutive"];
const DAILY_FAMILY = new Set<Frequency>(["daily", "weekly", "monthly", "yearly"]);

export function validateRecurrence(intent: RecurrenceIntent): { ok: boolean; errors: RecurrenceError[] } {
  const errors: RecurrenceError[] = [];
  const err = (code: RecurrenceError["code"], message: string) => errors.push({ code, message });

  if (!FREQUENCIES.includes(intent.frequency)) {
    err("validation_error", `Unknown frequency "${intent.frequency}". Use one of: ${FREQUENCIES.join(", ")}.`);
    return { ok: false, errors }; // nothing else is checkable without a valid frequency
  }
  const f = intent.frequency;

  // Always required.
  if (!intent.start_date) err("validation_error", "start_date is required.");
  if (!intent.end_date) err("validation_error", "end_date is required.");
  if (intent.start_date && intent.end_date && intent.end_date < intent.start_date) {
    err("out_of_vocab", "end_date is before start_date.");
  }

  // Daily-family time + length.
  if (DAILY_FAMILY.has(f)) {
    if (!intent.start_time) err("validation_error", "start_time is required for this frequency.");
    const hasDur = intent.duration_minutes != null;
    const hasEnds = intent.ends_at != null;
    if (!hasDur && !hasEnds) err("validation_error", "Provide exactly one of duration_minutes or ends_at.");
    if (hasDur && hasEnds) err("over_fill", "Provide only one of duration_minutes or ends_at, not both.");
    if (hasDur && intent.duration_minutes! < 0) err("out_of_vocab", "duration_minutes must be non-negative.");
    if (intent.start_time && intent.ends_at && intent.ends_at <= intent.start_time) {
      err("out_of_vocab", "ends_at must be after start_time.");
    }
  }

  // days vocab (weekly, weekday-mode).
  const checkDays = () => {
    for (const d of intent.days ?? []) {
      if (!DRUPAL_CONTRACT.weekdays[d]) err("out_of_vocab", `Unknown weekday "${d}". Use short lowercase: mon,tue,…,sun.`);
    }
  };

  if (f === "weekly") {
    if (!intent.days?.length) err("validation_error", "days is required for weekly.");
    checkDays();
  }

  if (f === "monthly" || f === "yearly") {
    if (!intent.monthly_mode) err("validation_error", "monthly_mode ('weekday' or 'monthday') is required.");
    if (intent.monthly_mode && !DRUPAL_CONTRACT.monthlyModes.includes(intent.monthly_mode)) {
      err("out_of_vocab", `monthly_mode must be 'weekday' or 'monthday'.`);
    }
    if (intent.monthly_mode === "weekday") {
      if (!intent.week_positions?.length) err("validation_error", "week_positions is required for weekday mode.");
      if (!intent.days?.length) err("validation_error", "days is required for weekday mode.");
      for (const p of intent.week_positions ?? []) {
        if (!DRUPAL_CONTRACT.weekPositions.includes(p)) err("out_of_vocab", `Unknown week_position "${p}". Use: ${DRUPAL_CONTRACT.weekPositions.join(",")}.`);
      }
      checkDays();
      if (intent.days_of_month != null) err("over_fill", "days_of_month is not applicable in weekday mode.");
    }
    if (intent.monthly_mode === "monthday") {
      if (!intent.days_of_month?.length) err("validation_error", "days_of_month is required for monthday mode.");
      for (const d of intent.days_of_month ?? []) {
        if (d !== -1 && (d < 1 || d > 31)) err("out_of_vocab", `day_of_month ${d} out of range (1..31 or -1 for last day).`);
      }
      if (intent.week_positions != null) err("over_fill", "week_positions is not applicable in monthday mode.");
      if (intent.days != null) err("over_fill", "days is not applicable in monthday mode.");
    }
  }

  if (f === "yearly") {
    if (intent.year_interval == null) err("validation_error", "year_interval is required for yearly.");
    if (intent.year_interval != null && intent.year_interval < 1) err("out_of_vocab", "year_interval must be >= 1.");
    if (!intent.months?.length) err("validation_error", "months is required for yearly.");
    for (const mo of intent.months ?? []) {
      if (!DRUPAL_CONTRACT.months[mo]) err("out_of_vocab", `Unknown month "${mo}". Use short lowercase: jan,feb,…,dec.`);
    }
  } else {
    if (intent.months != null) err("over_fill", "months is only applicable to yearly.");
    if (intent.year_interval != null) err("over_fill", "year_interval is only applicable to yearly.");
  }

  if (f === "consecutive") {
    for (const [k, v] of [["window_start", intent.window_start], ["window_end", intent.window_end], ["session_minutes", intent.session_minutes], ["gap_minutes", intent.gap_minutes]] as const) {
      if (v == null) err("validation_error", `${k} is required for consecutive.`);
    }
    if (intent.window_start && intent.window_end && intent.window_end <= intent.window_start) {
      err("out_of_vocab", "window_end must be after window_start.");
    }
  } else {
    for (const [k, v] of [["window_start", intent.window_start], ["window_end", intent.window_end], ["session_minutes", intent.session_minutes], ["gap_minutes", intent.gap_minutes]] as const) {
      if (v != null) err("over_fill", `${k} is only applicable to consecutive.`);
    }
  }

  // days is not applicable to daily or to monthday/monthly-non-weekday — reject stray days.
  if ((f === "daily") && intent.days != null) err("over_fill", "days is not applicable to daily.");

  return { ok: errors.length === 0, errors };
}
