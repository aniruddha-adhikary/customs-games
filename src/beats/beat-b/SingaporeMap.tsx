import { useEffect, useState, useRef } from "react";

export interface MapLocation {
  id: string;
  x: number;
  y: number;
  label: string;
  shortLabel?: string;
  type: "ftz" | "lw" | "zgs" | "origin" | "destination" | "factory";
}

export interface MapRouteSegment {
  from: string;
  to: string;
  transportIcon: string;
  legIndex: 1 | 2 | 3;
}

export interface SingaporeMapConfig {
  routeLocations: MapLocation[];
  routeSegments: MapRouteSegment[];
}

// All known FTZ/LW/ZGS locations (SVG coordinates in 800x497 space)
const ALL_LANDMARKS: MapLocation[] = [
  { id: "ftz-pp", x: 268, y: 347, label: "Pasir Panjang Terminal (PP1)", shortLabel: "PP1", type: "ftz" },
  { id: "ftz-changi", x: 629, y: 224, label: "Changi Airfreight Centre (C01)", shortLabel: "C01", type: "ftz" },
  { id: "ftz-jurong", x: 174, y: 275, label: "Jurong Port (JZ)", shortLabel: "JZ", type: "ftz" },
  { id: "ftz-keppel", x: 380, y: 352, label: "Keppel Terminal", shortLabel: "KEP", type: "ftz" },
  { id: "ftz-sembawang", x: 371, y: 37, label: "Sembawang Wharves", shortLabel: "SBW", type: "ftz" },
  { id: "ftz-brani", x: 345, y: 380, label: "Brani Terminal", shortLabel: "BRN", type: "ftz" },
  { id: "lw-area", x: 145, y: 335, label: "Licensed Warehouse (LW)", shortLabel: "LW", type: "lw" },
  { id: "zgs-area", x: 570, y: 270, label: "Zero-GST Warehouse (ZGS)", shortLabel: "ZGS", type: "zgs" },
];

const COLOR = {
  ftz: "#c8a94e",
  lw: "#f59e0b",
  zgs: "#3b82f6",
  origin: "#22c55e",
  destination: "#22c55e",
  factory: "#a855f7",
  routeLocked: "#2d3a4a",
  routeAnimating: "#f59e0b",
  routeDone: "#22c55e",
};

interface Props {
  mapConfig: SingaporeMapConfig;
  legProgress: (leg: 1 | 2 | 3) => "locked" | "animating" | "done";
  compact?: boolean;
}

export function SingaporeMap({ mapConfig, legProgress, compact }: Props) {
  const [animOffset, setAnimOffset] = useState(0);
  const [svgPaths, setSvgPaths] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load SVG paths from the file
  useEffect(() => {
    fetch("/singapore.svg")
      .then((r) => r.text())
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const paths = doc.querySelectorAll("path");
        const pathData: string[] = [];
        paths.forEach((p) => {
          const d = p.getAttribute("d");
          if (d) pathData.push(d);
        });
        setSvgPaths(pathData);
      });
  }, []);

  // Animate dashed lines
  useEffect(() => {
    const id = setInterval(() => setAnimOffset((o) => (o + 1) % 100), 50);
    return () => clearInterval(id);
  }, []);

  const allPoints = new Map<string, MapLocation>();
  for (const loc of ALL_LANDMARKS) allPoints.set(loc.id, loc);
  for (const loc of mapConfig.routeLocations) allPoints.set(loc.id, loc);

  const routePointIds = new Set(
    mapConfig.routeSegments.flatMap((s) => [s.from, s.to])
  );

  const isLight =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "light";

  const mapFill = isLight ? "rgba(148, 163, 184, 0.25)" : "rgba(45, 58, 74, 0.7)";
  const mapStroke = isLight ? "rgba(100, 116, 139, 0.5)" : "rgba(75, 95, 120, 0.6)";

  const height = compact ? 200 : 280;

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden" style={{ height }}>
      <svg
        viewBox="50 0 720 497"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow-sm">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="water-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isLight ? "rgba(219, 234, 254, 0.2)" : "rgba(15, 23, 42, 0.3)"} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Water background */}
        <rect x="50" y="0" width="720" height="497" fill="url(#water-bg)" />

        {/* Singapore island from loaded SVG */}
        {svgPaths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={mapFill}
            stroke={mapStroke}
            strokeWidth="1"
          />
        ))}

        {/* Route segments */}
        {mapConfig.routeSegments.map((seg, i) => {
          const from = allPoints.get(seg.from);
          const to = allPoints.get(seg.to);
          if (!from || !to) return null;

          const progress = legProgress(seg.legIndex);
          const strokeColor =
            progress === "done"
              ? COLOR.routeDone
              : progress === "animating"
                ? COLOR.routeAnimating
                : COLOR.routeLocked;

          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.sqrt(dx * dx + dy * dy);

          // Curve control point for curved routes
          const midX = from.x + dx * 0.5;
          const midY = from.y + dy * 0.5;
          const perpX = -dy / len * 20;
          const perpY = dx / len * 20;
          const cpX = midX + perpX;
          const cpY = midY + perpY;

          const pathD = `M ${from.x} ${from.y} Q ${cpX} ${cpY} ${to.x} ${to.y}`;

          return (
            <g key={`seg-${i}`}>
              {/* Route line */}
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={progress === "locked" ? 1.5 : 2.5}
                strokeDasharray={progress === "locked" ? "6 4" : progress === "animating" ? "8 4" : "none"}
                strokeDashoffset={progress === "animating" ? -animOffset : 0}
                opacity={progress === "locked" ? 0.3 : 0.85}
                strokeLinecap="round"
              />
              {/* Transport icon on animating segments */}
              {progress === "animating" && (
                <text
                  x={cpX}
                  y={cpY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="18"
                  filter="url(#glow-sm)"
                >
                  {seg.transportIcon}
                </text>
              )}
              {/* Arrow on done segments */}
              {progress === "done" && len > 40 && (
                <polygon
                  points={(() => {
                    const t = 0.6;
                    const mx = from.x * (1 - t) * (1 - t) + 2 * (1 - t) * t * cpX + t * t * to.x;
                    const my = from.y * (1 - t) * (1 - t) + 2 * (1 - t) * t * cpY + t * t * to.y;
                    const tx = 2 * (1 - t) * (cpX - from.x) + 2 * t * (to.x - cpX);
                    const ty = 2 * (1 - t) * (cpY - from.y) + 2 * t * (to.y - cpY);
                    const angle = Math.atan2(ty, tx);
                    const size = 6;
                    return `${mx + size * Math.cos(angle)},${my + size * Math.sin(angle)} ${mx + size * Math.cos(angle + 2.5)},${my + size * Math.sin(angle + 2.5)} ${mx + size * Math.cos(angle - 2.5)},${my + size * Math.sin(angle - 2.5)}`;
                  })()}
                  fill={COLOR.routeDone}
                  opacity="0.8"
                />
              )}
            </g>
          );
        })}

        {/* Background FTZ markers (not on current route) */}
        {ALL_LANDMARKS.filter((l) => !routePointIds.has(l.id)).map((loc) => (
          <g key={loc.id} opacity="0.25">
            <circle cx={loc.x} cy={loc.y} r={3} fill={COLOR[loc.type]} />
            {!compact && (
              <text
                x={loc.x}
                y={loc.y - 7}
                textAnchor="middle"
                fill={COLOR[loc.type]}
                fontSize="7"
                fontWeight="500"
              >
                {loc.shortLabel}
              </text>
            )}
          </g>
        ))}

        {/* Active route location markers */}
        {mapConfig.routeLocations.map((loc) => {
          if (!routePointIds.has(loc.id)) return null;

          const toSeg = mapConfig.routeSegments.find((s) => s.to === loc.id);
          const isReached = toSeg
            ? legProgress(toSeg.legIndex) === "done" || legProgress(toSeg.legIndex) === "animating"
            : true; // first node is always "reached"

          const fill = COLOR[loc.type];
          const radius = loc.type === "origin" || loc.type === "destination" || loc.type === "factory" ? 5 : 7;
          const showGlow = isReached;

          return (
            <g key={loc.id}>
              {/* Pulse ring */}
              {showGlow && (
                <circle cx={loc.x} cy={loc.y} r={radius + 4} fill="none" stroke={fill} strokeWidth="1" opacity="0.3">
                  <animate attributeName="r" values={`${radius + 2};${radius + 7};${radius + 2}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Main marker */}
              {loc.type === "lw" ? (
                <rect
                  x={loc.x - radius * 0.7}
                  y={loc.y - radius * 0.7}
                  width={radius * 1.4}
                  height={radius * 1.4}
                  fill={fill}
                  stroke={isLight ? "#ffffff" : "#0f1923"}
                  strokeWidth="2"
                  rx="2"
                  opacity={isReached ? 1 : 0.4}
                  filter={showGlow ? "url(#glow-sm)" : undefined}
                />
              ) : loc.type === "zgs" ? (
                <polygon
                  points={`${loc.x},${loc.y - radius} ${loc.x + radius * 0.87},${loc.y + radius * 0.5} ${loc.x - radius * 0.87},${loc.y + radius * 0.5}`}
                  fill={fill}
                  stroke={isLight ? "#ffffff" : "#0f1923"}
                  strokeWidth="2"
                  opacity={isReached ? 1 : 0.4}
                  filter={showGlow ? "url(#glow-sm)" : undefined}
                />
              ) : (
                <circle
                  cx={loc.x}
                  cy={loc.y}
                  r={radius}
                  fill={fill}
                  stroke={isLight ? "#ffffff" : "#0f1923"}
                  strokeWidth="2"
                  opacity={isReached ? 1 : 0.4}
                  filter={showGlow ? "url(#glow-sm)" : undefined}
                />
              )}
              {/* Label */}
              <text
                x={loc.x}
                y={loc.y - radius - 5}
                textAnchor="middle"
                fill={isLight ? "#334155" : "#e2e8f0"}
                fontSize="9"
                fontWeight="600"
              >
                {loc.shortLabel || loc.label}
              </text>
              {/* Sublabel for FTZ/LW/ZGS */}
              {(loc.type === "ftz" || loc.type === "lw" || loc.type === "zgs") && !compact && (
                <text
                  x={loc.x}
                  y={loc.y + radius + 11}
                  textAnchor="middle"
                  fill={isLight ? "#64748b" : "#94a3b8"}
                  fontSize="7"
                >
                  {loc.type === "ftz" ? "Free Trade Zone" : loc.type === "lw" ? "Licensed WH" : "Zero-GST WH"}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-1 right-2 flex gap-3 text-[9px] text-customs-muted opacity-80">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLOR.ftz }} />
          FTZ
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: COLOR.lw }} />
          LW
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent" style={{ borderBottomColor: COLOR.zgs }} />
          ZGS
        </span>
      </div>
    </div>
  );
}
