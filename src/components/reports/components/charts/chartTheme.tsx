/**
 * Shared chart palette and styling for the reports charts.
 *
 * WHY THIS FILE: the colours were previously hardcoded hex literals repeated
 * across five chart files, so a palette change meant editing each one and the
 * charts had already drifted apart.
 *
 * PALETTE — every entry is an existing @brainforgeau/theme token, not a new
 * hue:
 *   BLUE   #1868db  --color-blue   (the same blue as the New Ticket button)
 *   GREEN  #6a9a23  --color-green
 *   YELLOW #7f5f01  --color-yellow
 *
 * The one change from what was here before is YELLOW. The charts used #e2b203,
 * which is not a theme token and fails two accessibility checks against the
 * chart surface: it sits outside the usable lightness band (L 0.785 vs a
 * 0.43–0.77 ceiling) and lands at 1.93:1 contrast, below the 3:1 floor. That
 * is survivable for a 2px line and falls apart once the same colour is used as
 * a wash, which is exactly what the fills below do. `--color-yellow` (#7f5f01)
 * is the theme's own yellow and passes.
 *
 * Verified as a set, not by eye — worst adjacent pair is YELLOW↔GREEN at
 * ΔE 12.2 (deuteranopia) and 16.4 (normal vision), clear of the ΔE 8 target,
 * so the three series stay distinguishable for colour-blind readers.
 */
export const CHART_COLORS = {
  blue: '#1868db',
  green: '#6a9a23',
  yellow: '#7f5f01',
} as const;

/** Muted ink for axes and labels. Text never wears the series colour. */
export const CHART_INK = '#6b7280';
/** Hairline grid — present enough to read a value against, quiet enough to ignore. */
export const CHART_GRID = '#e5e7eb';

/**
 * Opacity for area fills.
 *
 * Deliberately low. A fill here is depth, not a second encoding: the line is
 * still what you read a value off. Anything heavier and overlapping series
 * start to occlude each other and the chart begins to imply the areas are
 * stacked (i.e. summing to a total) when they are independent.
 */
export const FILL_OPACITY_TOP = 0.22;
export const FILL_OPACITY_BOTTOM = 0.01;

/**
 * The gradient stops, as elements to drop inside a chart's own <defs>.
 *
 * Called as a function and placed inside a literal <defs> — NOT wrapped in its
 * own component. Recharts filters its children by component type and silently
 * discards ones it does not recognise, so a <ChartGradients /> element never
 * reached the DOM and every `url(#chart-fill-…)` resolved to nothing, leaving
 * the areas unfilled. A literal <defs> in the chart's JSX survives that filter.
 *
 * A flat fill reads as a solid block and fights the line above it; fading to
 * near-transparent at the baseline keeps the eye on the line and stops
 * overlapping washes turning into mud.
 */
export const gradientStops = () =>
  Object.entries(CHART_COLORS).map(([name, color]) => (
    <linearGradient
      key={name}
      id={`chart-fill-${name}`}
      x1="0"
      y1="0"
      x2="0"
      y2="1"
    >
      <stop offset="0%" stopColor={color} stopOpacity={FILL_OPACITY_TOP} />
      <stop offset="100%" stopColor={color} stopOpacity={FILL_OPACITY_BOTTOM} />
    </linearGradient>
  ));

/** Shared axis props: no axis line, no tick marks, muted ink, small type. */
export const axisProps = {
  stroke: CHART_INK,
  tickLine: false,
  axisLine: false,
  tick: { fill: CHART_INK, fontSize: 12 },
} as const;

/**
 * Tooltip styling. Recharts' default is an unstyled white box with a hard
 * border; this matches the app's surface treatment and keeps the label ink
 * neutral so the colour swatches beside each series carry the identity.
 */
export const tooltipProps = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontSize: 12,
  },
  labelStyle: { color: '#111827', fontWeight: 600, marginBottom: 4 },
  cursor: { stroke: CHART_INK, strokeWidth: 1, strokeDasharray: '3 3' },
} as const;
