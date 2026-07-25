/**
 * User-composable alert rules over the terms the dashboard already shows.
 *
 * Replaces the single hardcoded "tomorrow's max air temp >= threshold" check.
 * Deliberately narrow: a rule is one term, one direction, one threshold — the
 * ledger's own vocabulary, not a general query language.
 */

export const RULE_TERMS = ['trueFeel', 'airTemp', 'dewPoint', 'uvIndex'] as const
export const RULE_DIRECTIONS = ['above', 'below'] as const

export type RuleTerm = (typeof RULE_TERMS)[number]
export type RuleDirection = (typeof RULE_DIRECTIONS)[number]

export interface AlertRule {
  term: RuleTerm
  direction: RuleDirection
  threshold: number
}

/** Plausible bounds per term, so a typo can't create an alert that never fires
 *  (or fires every day). UV is unitless and tops out near 13 in practice. */
const TERM_RANGE: Record<RuleTerm, { min: number; max: number }> = {
  trueFeel: { min: -60, max: 60 },
  airTemp: { min: -60, max: 60 },
  dewPoint: { min: -60, max: 60 },
  uvIndex: { min: 0, max: 20 },
}

const TERM_LABEL: Record<RuleTerm, string> = {
  trueFeel: 'True Feel',
  airTemp: 'Air temperature',
  dewPoint: 'Dew point',
  uvIndex: 'UV index',
}

/** Degrees for the thermal terms; UV index is unitless. */
const TERM_UNIT: Record<RuleTerm, string> = {
  trueFeel: '°',
  airTemp: '°',
  dewPoint: '°',
  uvIndex: '',
}

export function isAlertRule(value: unknown): value is AlertRule {
  if (typeof value !== 'object' || value === null) return false
  const { term, direction, threshold } = value as Record<string, unknown>
  if (!RULE_TERMS.includes(term as RuleTerm)) return false
  if (!RULE_DIRECTIONS.includes(direction as RuleDirection)) return false
  if (typeof threshold !== 'number' || !Number.isFinite(threshold)) return false
  const range = TERM_RANGE[term as RuleTerm]
  return threshold >= range.min && threshold <= range.max
}

/**
 * Does this rule fire over a day's hourly values?
 *
 * Missing hours are skipped rather than coerced — a null hour read as 0 would
 * trigger every "below" rule in the system.
 */
export function ruleFires(rule: AlertRule, values: readonly (number | null)[]): boolean {
  return values.some((v) => {
    if (v === null || !Number.isFinite(v)) return false
    return rule.direction === 'above' ? v >= rule.threshold : v <= rule.threshold
  })
}

/** The rule read back as the sentence the user built, for UI and notifications. */
export function ruleSummary(rule: AlertRule): string {
  const verb = rule.direction === 'above' ? 'goes above' : 'drops below'
  return `${TERM_LABEL[rule.term]} ${verb} ${rule.threshold}${TERM_UNIT[rule.term]}`
}
