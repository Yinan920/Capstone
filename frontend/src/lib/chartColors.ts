/**
 * Chart palette — the *validated* dataviz reference instance (light mode).
 *
 * Brand colors (indigo / violet / lime) are for UI chrome only. Data marks use
 * these roles so identity is CVD-safe. The You-vs-Competitor categorical pair
 * (#2a78d6 / #eb6834) passed the validator with worst-adjacent CVD ΔE ≈ 96.7.
 */
export const CHART = {
  // Status palette (sentiment is a state, so it legitimately uses status colors).
  positive: '#0ca30c',
  neutral: '#898781',
  warning: '#fab219',
  serious: '#ec835a',
  negative: '#d03b3b',

  // Categorical slots for "You vs Competitor" (2 entities).
  you: '#2a78d6', // slot 1 — blue
  competitor: '#eb6834', // slot 8 — orange

  // Sequential blue ramp for single-series magnitude (complaint volume bars).
  seq: {
    100: '#cde2fb',
    250: '#86b6ef',
    400: '#3987e5',
    500: '#256abf',
    600: '#184f95',
  },

  // Chrome / ink (recessive axes & grid).
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  ink: '#0b0b0b',
  surface: '#ffffff',
} as const;

export const SENTIMENT_COLOR: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: CHART.positive,
  neutral: CHART.neutral,
  negative: CHART.negative,
};

export const SEVERITY_COLOR = {
  warning: CHART.warning,
  serious: CHART.serious,
  critical: CHART.negative,
} as const;
