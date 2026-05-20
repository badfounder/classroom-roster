/**
 * Inline SVG illustrations. Kept here (not imported from a third-party
 * pack) so the app stays fully self-hosted and the visual style stays
 * consistent — same neutral palette, same indigo brand accent, same
 * line weight everywhere.
 */
import * as React from "react";

/**
 * Hero illustration for the landing page: a stylized classroom layout
 * with rows of seats, a chalkboard at the top, and a few seats glowing
 * indigo to represent students you'll learn to recognize.
 */
export function ClassroomHero({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 320"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="hero-title"
      className={className}
    >
      <title id="hero-title">A classroom with rows of seats facing a chalkboard</title>
      {/* Room outline */}
      <rect
        x="20"
        y="20"
        width="440"
        height="280"
        rx="18"
        fill="var(--brand-50)"
        stroke="var(--brand-200)"
        strokeWidth="2"
      />
      {/* Chalkboard */}
      <rect
        x="80"
        y="42"
        width="320"
        height="44"
        rx="6"
        fill="var(--brand-700)"
        opacity="0.92"
      />
      <text
        x="240"
        y="71"
        textAnchor="middle"
        fontFamily="var(--font-mono), monospace"
        fontSize="14"
        fill="var(--brand-100)"
        opacity="0.85"
      >
        BIO 101 — Welcome
      </text>
      {/* Teacher's desk */}
      <rect
        x="200"
        y="108"
        width="80"
        height="18"
        rx="3"
        fill="var(--brand-200)"
        stroke="var(--brand-400)"
        strokeWidth="1.2"
      />
      {/* Rows of seats — 4 rows × 7 cols, with a few seats highlighted */}
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 7 }).map((_, col) => {
          const x = 80 + col * 50;
          const y = 160 + row * 36;
          // Sprinkle a handful of "learned" seats in brand color
          const highlighted =
            (row === 0 && col === 2) ||
            (row === 1 && col === 5) ||
            (row === 2 && col === 1) ||
            (row === 2 && col === 4) ||
            (row === 3 && col === 6);
          return (
            <g key={`${row}-${col}`}>
              {/* desk */}
              <rect
                x={x - 12}
                y={y - 4}
                width="24"
                height="10"
                rx="2"
                fill="var(--brand-100)"
                stroke="var(--brand-300)"
                strokeWidth="1"
              />
              {/* chair / seat dot */}
              <circle
                cx={x}
                cy={y + 18}
                r="8"
                fill={highlighted ? "var(--brand-600)" : "white"}
                stroke={highlighted ? "var(--brand-700)" : "var(--brand-300)"}
                strokeWidth="1.5"
              />
              {highlighted ? (
                <circle cx={x} cy={y + 18} r="3" fill="white" opacity="0.85" />
              ) : null}
            </g>
          );
        })
      )}
      {/* Door */}
      <rect
        x="30"
        y="235"
        width="14"
        height="48"
        rx="2"
        fill="var(--brand-200)"
        stroke="var(--brand-400)"
        strokeWidth="1.2"
      />
      <circle cx="40" cy="259" r="1.5" fill="var(--brand-700)" />
    </svg>
  );
}

/**
 * Empty-state for the dashboard: a stylized roster card with a placeholder
 * photo and a few faint lines. Used when the teacher hasn't created any
 * classes yet.
 */
export function EmptyClassesIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="empty-classes-title"
      className={className}
    >
      <title id="empty-classes-title">An empty class card</title>
      <rect
        x="20"
        y="20"
        width="160"
        height="120"
        rx="14"
        fill="white"
        stroke="var(--brand-200)"
        strokeWidth="2"
      />
      <rect x="36" y="36" width="44" height="44" rx="22" fill="var(--brand-100)" />
      <circle cx="58" cy="56" r="10" fill="var(--brand-300)" />
      <rect x="58" y="72" width="0" height="0" />
      <path
        d="M40 80 Q58 64 76 80 L76 84 L40 84 Z"
        fill="var(--brand-300)"
      />
      <rect x="92" y="40" width="68" height="8" rx="3" fill="var(--brand-100)" />
      <rect x="92" y="56" width="48" height="6" rx="3" fill="var(--brand-100)" />
      <rect x="36" y="96" width="128" height="8" rx="3" fill="#f4f4f5" />
      <rect x="36" y="112" width="88" height="8" rx="3" fill="#f4f4f5" />
      {/* Plus icon overlay in the corner */}
      <circle cx="156" cy="36" r="14" fill="var(--brand-600)" />
      <path
        d="M156 30 L156 42 M150 36 L162 36"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Empty-state for the roster panel: a small clipboard with a pencil,
 * indicating "no students yet."
 */
export function EmptyRosterIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="empty-roster-title"
      className={className}
    >
      <title id="empty-roster-title">An empty roster clipboard</title>
      {/* Clipboard body */}
      <rect
        x="50"
        y="30"
        width="100"
        height="120"
        rx="8"
        fill="white"
        stroke="var(--brand-200)"
        strokeWidth="2"
      />
      {/* Clip */}
      <rect
        x="82"
        y="22"
        width="36"
        height="18"
        rx="4"
        fill="var(--brand-600)"
      />
      <rect x="92" y="14" width="16" height="12" rx="2" fill="var(--brand-700)" />
      {/* Lines */}
      <rect x="64" y="58" width="72" height="6" rx="3" fill="#f4f4f5" />
      <rect x="64" y="74" width="56" height="6" rx="3" fill="#f4f4f5" />
      <rect x="64" y="90" width="64" height="6" rx="3" fill="#f4f4f5" />
      <rect x="64" y="106" width="48" height="6" rx="3" fill="#f4f4f5" />
      <rect x="64" y="122" width="60" height="6" rx="3" fill="#f4f4f5" />
      {/* Pencil */}
      <g transform="rotate(35 138 130)">
        <rect x="118" y="124" width="36" height="8" rx="1.5" fill="var(--accent-warm)" />
        <polygon
          points="154,124 162,128 154,132"
          fill="var(--brand-700)"
        />
        <rect x="118" y="124" width="4" height="8" fill="var(--brand-400)" />
      </g>
    </svg>
  );
}
