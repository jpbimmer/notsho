import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { useState } from "react";
import { ChartTooltip, type TipState } from "../chart-tooltip";
import styles from "./column-chart.module.css";

export interface Column {
  key: string;
  /** Axis label; omit to leave a gap (e.g. label every 3rd hour). */
  label?: string;
  value: number;
  /** Tooltip heading, defaults to `key`. */
  title?: string;
}

const PAD = { top: 20, right: 4, bottom: 24, left: 4 };

/**
 * Single-series column chart: one hue, columns capped at 24px with 4px
 * rounded tops, a hairline baseline, the peak labeled, the rest on hover.
 */
export function ColumnChart({
  data,
  height = 180,
  unit = "items",
  format,
  onSelect,
}: {
  data: Column[];
  height?: number;
  unit?: string;
  /** Tooltip value, e.g. dollars. Defaults to "1,234 <unit>". */
  format?: (value: number) => string;
  onSelect?: (key: string) => void;
}) {
  return (
    <div className={styles.chart} style={{ height }}>
      <ParentSize debounceTime={50}>
        {({ width }) =>
          width > 0 ? <Inner data={data} width={width} height={height} unit={unit} format={format} onSelect={onSelect} /> : null
        }
      </ParentSize>
    </div>
  );
}

function Inner({
  data,
  width,
  height,
  unit,
  format,
  onSelect,
}: {
  data: Column[];
  width: number;
  height: number;
  unit: string;
  format?: (value: number) => string;
  onSelect?: (key: string) => void;
}) {
  const [tip, setTip] = useState<TipState | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const x = scaleBand({ domain: data.map((d) => d.key), range: [PAD.left, width - PAD.right], paddingInner: 0.25, paddingOuter: 0.1 });
  const max = Math.max(...data.map((d) => d.value), 1);
  const y = scaleLinear({ domain: [0, max], range: [height - PAD.bottom, PAD.top], nice: false });
  const bw = Math.min(24, x.bandwidth());
  const base = height - PAD.bottom;
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0] ?? { key: "", value: 0 });

  return (
    <>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${unit} per ${data.length} periods`}
        onMouseLeave={() => {
          setTip(null);
          setHover(null);
        }}
      >
        <line x1={PAD.left} x2={width - PAD.right} y1={base + 0.5} y2={base + 0.5} className={styles.baseline} />
        {data.map((d) => {
          const cx = (x(d.key) ?? 0) + x.bandwidth() / 2;
          const top = y(d.value);
          const h = base - top;
          const r = Math.min(4, h, bw / 2);
          const left = cx - bw / 2;
          const path =
            h <= 0
              ? ""
              : `M${left},${base} V${top + r} Q${left},${top} ${left + r},${top} H${left + bw - r} Q${left + bw},${top} ${left + bw},${top + r} V${base} Z`;
          return (
            <g key={d.key}>
              <path d={path} className={styles.column} data-dim={hover && hover !== d.key ? "" : undefined} />
              {d.label && (
                <text x={cx} y={base + 16} className={styles.axisLabel} textAnchor="middle">
                  {d.label}
                </text>
              )}
              {d.key === peak.key && d.value > 0 && (
                <text x={cx} y={top - 6} className={styles.valueLabel} textAnchor="middle">
                  {format ? format(d.value) : d.value.toLocaleString()}
                </text>
              )}
              {/* Hit target: the whole band, full height — bigger than the mark. */}
              {/* biome-ignore lint/a11y/noStaticElementInteractions: hover tooltips are a mouse enhancement; the same numbers are in the lists and day view */}
              <rect
                x={x(d.key)}
                y={PAD.top}
                width={x.bandwidth()}
                height={base - PAD.top}
                fill="transparent"
                style={{ cursor: onSelect ? "pointer" : undefined }}
                onMouseMove={() => {
                  setHover(d.key);
                  setTip({
                    x: cx,
                    y: Math.max(top, PAD.top + 12),
                    content: (
                      <>
                        <strong>{d.title ?? d.key}</strong>
                        <span>{format ? format(d.value) : `${d.value.toLocaleString()} ${unit}`}</span>
                      </>
                    ),
                  });
                }}
                onClick={onSelect ? () => onSelect(d.key) : undefined}
              />
            </g>
          );
        })}
      </svg>
      <ChartTooltip tip={tip} width={width} />
    </>
  );
}
