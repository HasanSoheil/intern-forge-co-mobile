import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from "react-native-svg";

export interface RevenuePoint {
  period: string;
  revenue: number;
}

const fmt = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`;

/**
 * Cumulative-revenue area chart (single series). Colors come in as props so the
 * caller can pass validated theme tokens for the current scheme; all text uses
 * ink tokens, never the series color.
 */
export function RevenueChart({
  points, color, grid, ink, inkStrong,
}: {
  points: RevenuePoint[];
  color: string;
  grid: string;
  ink: string;
  inkStrong: string;
}) {
  const [w, setW] = useState(0);
  const H = 190;
  const padL = 46, padR = 16, padT = 18, padB = 28;
  const iw = Math.max(0, w - padL - padR);
  const ih = H - padT - padB;
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const x = (i: number) => padL + (points.length === 1 ? 0 : (i / (points.length - 1)) * iw);
  const y = (v: number) => padT + ih - (v / max) * ih;

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.revenue).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${(padT + ih).toFixed(1)} L ${padL} ${(padT + ih).toFixed(1)} Z`;

  const last = points[points.length - 1];
  const firstLabeled = points.find((p) => p.period);
  const ticks = [0, max / 2, max];

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Svg width={w} height={H}>
          <Defs>
            <LinearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>

          {/* recessive grid + muted $ ticks */}
          {ticks.map((t) => (
            <Line key={`g${t}`} x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={1} />
          ))}
          {ticks.map((t) => (
            <SvgText key={`t${t}`} x={padL - 8} y={y(t) + 3.5} fontSize={10} fill={ink} textAnchor="end">
              {fmt(t)}
            </SvgText>
          ))}

          <Path d={area} fill="url(#revFill)" />
          <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />

          {/* direct label on the latest point only */}
          <Circle cx={x(points.length - 1)} cy={y(last.revenue)} r={4} fill={color} />
          <SvgText
            x={Math.min(x(points.length - 1), w - padR - 4)}
            y={Math.max(y(last.revenue) - 8, 12)}
            fontSize={11}
            fontWeight="700"
            fill={inkStrong}
            textAnchor="end"
          >
            {fmt(last.revenue)}
          </SvgText>

          {firstLabeled ? (
            <SvgText x={padL} y={H - 8} fontSize={10} fill={ink} textAnchor="start">
              {firstLabeled.period}
            </SvgText>
          ) : null}
          {last.period ? (
            <SvgText x={w - padR} y={H - 8} fontSize={10} fill={ink} textAnchor="end">
              {last.period}
            </SvgText>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
