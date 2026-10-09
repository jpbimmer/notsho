import { useMemo, useState } from "react";
import { useElementWidth } from "../../lib/element-width";
import { ChartTooltip, type TipState } from "../chart-tooltip";
import styles from "./calendar-heatmap.module.css";

const DAY = 86_400_000;
const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const fmtMonth = new Intl.DateTimeFormat(undefined, { month: "short", timeZone: "UTC" });

/** Sequential, one hue: 0 is the empty well, 1–4 step up in accent. */
function level(n: number) {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n <= 4) return 3;
  return 4;
}
const LEVEL_LABEL = ["None", "1", "2", "3–4", "5+"];

/**
 * One year of days, weeks as columns (Sunday on top). Cells scale with the
 * container down to a 9px floor, below which the grid scrolls sideways.
 */
export function CalendarHeatmap({
  year,
  counts,
  onSelect,
  unit = ["item", "items"],
}: {
  year: number;
  counts: Map<string, number>;
  onSelect?: (date: string) => void;
  /** Singular and plural, for the tooltip. */
  unit?: [string, string];
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  return (
    <div className={styles.heatmapFrame}>
      <div ref={ref}>{width > 0 && <Inner year={year} counts={counts} width={width} onSelect={onSelect} unit={unit} />}</div>
      <div className={styles.legend} aria-hidden>
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={styles.cell} data-level={l} title={LEVEL_LABEL[l]} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function Inner({
  year,
  counts,
  width,
  onSelect,
  unit,
}: {
  year: number;
  counts: Map<string, number>;
  width: number;
  onSelect?: (date: string) => void;
  unit: [string, string];
}) {
  const [tip, setTip] = useState<TipState | null>(null);
  const LEFT = 28;
  const TOP = 18;
  const GAP = 3;

  const days = useMemo(() => {
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);
    const firstDow = new Date(start).getUTCDay();
    const out: { date: string; week: number; dow: number; n: number }[] = [];
    for (let t = start; t < end; t += DAY) {
      const d = new Date(t);
      const date = d.toISOString().slice(0, 10);
      const idx = (t - start) / DAY + firstDow;
      out.push({ date, week: Math.floor(idx / 7), dow: d.getUTCDay(), n: counts.get(date) ?? 0 });
    }
    return out;
  }, [year, counts]);

  const weeks = (days.at(-1)?.week ?? 52) + 1;
  const cell = Math.max(9, Math.min(16, Math.floor((width - LEFT) / weeks) - GAP));
  const step = cell + GAP;
  const svgW = LEFT + weeks * step;
  const svgH = TOP + 7 * step;
  const months = days.filter((d) => d.date.endsWith("-01"));

  return (
    <div className={styles.heatmapScroll} style={{ height: svgH + 4 }}>
      <svg
        width={svgW}
        height={svgH}
        role="img"
        aria-label={`${unit[1].charAt(0).toUpperCase()}${unit[1].slice(1)} per day in ${year}`}
        onMouseLeave={() => setTip(null)}
      >
        {months.map((m) => (
          <text key={m.date} x={LEFT + m.week * step} y={11} className={styles.axisLabel}>
            {fmtMonth.format(new Date(`${m.date}T00:00:00Z`))}
          </text>
        ))}
        {[1, 3, 5].map((dow) => (
          <text key={dow} x={0} y={TOP + dow * step + cell - 2} className={styles.axisLabel}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow]}
          </text>
        ))}
        {days.map((d) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: hover tooltips are a mouse enhancement; the same numbers are in the lists and day view
          <rect
            key={d.date}
            x={LEFT + d.week * step}
            y={TOP + d.dow * step}
            width={cell}
            height={cell}
            rx={Math.min(3, cell / 4)}
            className={styles.cell}
            data-level={level(d.n)}
            style={{ cursor: onSelect && d.n ? "pointer" : undefined }}
            onMouseEnter={() =>
              setTip({
                x: LEFT + d.week * step + cell / 2,
                y: TOP + d.dow * step + cell / 2,
                content: (
                  <>
                    <strong>{fmtDay.format(new Date(`${d.date}T00:00:00Z`))}</strong>
                    <span>{d.n ? `${d.n} ${d.n === 1 ? unit[0] : unit[1]}` : `No ${unit[1]}`}</span>
                  </>
                ),
              })
            }
            onClick={onSelect && d.n ? () => onSelect(d.date) : undefined}
          />
        ))}
      </svg>
      <ChartTooltip tip={tip} width={Math.min(width, svgW)} />
    </div>
  );
}
