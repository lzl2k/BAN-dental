import { useState, useCallback } from "react";

// ══ ARCH PARAMETERS ══
const UA = { cx: 200, cy: 148, rx: 154, ry: 112 }; // Upper arch
const LA = { cx: 200, cy: 315, rx: 138, ry: 98 };  // Lower arch

// Tooth angles along arch (standard math degrees)
// Upper: 18→11 (left side) then 21→28 (right side)
const UA_DEG = [200,213,225,236,246,255,263,269, 271,277,285,294,304,315,327,340];
// Lower: 48→41 (left side) then 31→38 (right side)
const LA_DEG = [160,147,133,121,110,101, 94, 91,  89, 86, 79, 70, 59, 47, 33, 20];

const UPPER = [
  {n:18,t:'M'},{n:17,t:'M'},{n:16,t:'M'},{n:15,t:'P'},{n:14,t:'P'},
  {n:13,t:'C'},{n:12,t:'L'},{n:11,t:'I'},
  {n:21,t:'I'},{n:22,t:'L'},{n:23,t:'C'},
  {n:24,t:'P'},{n:25,t:'P'},{n:26,t:'M'},{n:27,t:'M'},{n:28,t:'M'},
];
const LOWER = [
  {n:48,t:'M'},{n:47,t:'M'},{n:46,t:'M'},{n:45,t:'P'},{n:44,t:'P'},
  {n:43,t:'C'},{n:42,t:'L'},{n:41,t:'I'},
  {n:31,t:'I'},{n:32,t:'L'},{n:33,t:'C'},
  {n:34,t:'P'},{n:35,t:'P'},{n:36,t:'M'},{n:37,t:'M'},{n:38,t:'M'},
];

// Convert degree → SVG position + rotation angle
function archPos(arch, deg) {
  const r = (deg * Math.PI) / 180;
  const x = arch.cx + arch.rx * Math.cos(r);
  const y = arch.cy - arch.ry * Math.sin(r);
  // Rotate so tooth biting surface faces arch center
  const rot = Math.atan2(arch.cy - y, arch.cx - x) * 180 / Math.PI + 90;
  return { x, y, rot };
}

// Compute arch guide path (polyline along ellipse)
function archPath(arch, d0, d1, steps = 30) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const deg = d0 + ((d1 - d0) * i) / steps;
    const r = (deg * Math.PI) / 180;
    pts.push(`${(arch.cx + arch.rx * Math.cos(r)).toFixed(1)},${(arch.cy - arch.ry * Math.sin(r)).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")}`;
}

// ══ TOOTH SHAPES (local coords, biting surface at -y) ══
// Each shape is a filled SVG path — clearly visible, large touch target
const SHAPE = {
  // Molar: wide rounded rect
  M: [
    "M-11,12 C-11,14.5 -8,16 -3,16 L3,16 C8,16 11,14.5 11,12",
    "L11,-10 C11,-14 7.5,-16 3,-16 L-3,-16 C-7.5,-16 -11,-14 -11,-10 Z"
  ].join(" "),

  // Premolar: oval
  P: [
    "M-8,11 C-8,13.5 -4.5,15 0,15 C4.5,15 8,13.5 8,11",
    "L8,-9 C8,-13 4.5,-14.5 0,-14.5 C-4.5,-14.5 -8,-13 -8,-9 Z"
  ].join(" "),

  // Canine: pointed
  C: "M0,-17 C3.5,-17 7,-12 7,-6 L7,11 C7,13.5 4,15 0,15 C-4,15 -7,13.5 -7,11 L-7,-6 C-7,-12 -3.5,-17 0,-17 Z",

  // Lateral incisor: small trapezoid
  L: "M-5.5,-12.5 C-3.5,-14.5 3.5,-14.5 5.5,-12.5 L6,10.5 C6,13 3.5,14 0,14 C-3.5,14 -6,13 -6,10.5 Z",

  // Central incisor: wider trapezoid
  I: "M-7.5,-11 C-5,-13.5 5,-13.5 7.5,-11 L7.5,11 C7.5,13.5 4.5,15 0,15 C-4.5,15 -7.5,13.5 -7.5,11 Z",
};

// Inner highlight masks (gives 3D feel)
const HIGHLIGHT = {
  M: "M-7,12 C-7,13.5 -4.5,14.5 -1,14.5 L1,14.5 C4.5,14.5 7,13.5 7,12 L7,-8 C7,-11.5 5,-13.5 2,-13.5 L-2,-13.5 C-5,-13.5 -7,-11.5 -7,-8 Z",
  P: "M-5,11 C-5,12.5 -3,13.5 0,13.5 C3,13.5 5,12.5 5,11 L5,-7 C5,-10.5 3,-12 0,-12 C-3,-12 -5,-10.5 -5,-7 Z",
  C: "M0,-13 C2.5,-13 5,-9 5,-5 L5,9 C5,11.5 3,13 0,13 C-3,13 -5,11.5 -5,9 L-5,-5 C-5,-9 -2.5,-13 0,-13 Z",
  L: "M-3.5,-10 C-2,-12 2,-12 3.5,-10 L4,9 C4,11 2.5,12 0,12 C-2.5,12 -4,11 -4,9 Z",
  I: "M-5,-8.5 C-3.5,-11 3.5,-11 5,-8.5 L5,9 C5,11.5 3,13 0,13 C-3,13 -5,11.5 -5,9 Z",
};

// Cusp detail lines for molars/premolars (visible when selected)
const CUSPS = {
  M: [[-6,-4,6,-4],[-6,2,6,2],  [0,-14,0,-4]],
  P: [[-4,-5,4,-5],[0,-14,0,-5]],
  C: [],
  L: [],
  I: [],
};

export default function DentalSelector() {
  const [sel, setSel] = useState(new Set());
  const [hov, setHov] = useState(null);

  const toggle = useCallback((n) => {
    setSel(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  }, []);

  const clearAll = () => setSel(new Set());

  const selArr = Array.from(sel).sort((a, b) => a - b);

  // Single tooth component
  const Tooth = ({ n, t, x, y, rot }) => {
    const on = sel.has(n);
    const ho = hov === n;
    const gid = `sg${n}`;

    return (
      <g
        transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)})`}
        onClick={() => toggle(n)}
        onPointerEnter={() => setHov(n)}
        onPointerLeave={() => setHov(null)}
        style={{ cursor: "pointer", touchAction: "manipulation" }}
      >
        {/* Outer glow when selected */}
        {on && (
          <path
            d={SHAPE[t]}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={11}
            strokeOpacity={0.18}
            strokeLinejoin="round"
          />
        )}

        {/* Drop shadow */}
        <path
          d={SHAPE[t]}
          fill="rgba(30,50,90,0.10)"
          transform="translate(0.5,1.5)"
          strokeLinejoin="round"
        />

        {/* Main tooth body */}
        <path
          d={SHAPE[t]}
          fill={on ? `url(#${gid})` : ho ? "#d4dce9" : "#e9edf5"}
          stroke={on ? "#1a44c8" : ho ? "#607090" : "#b8c4d8"}
          strokeWidth={on ? 1.8 : 1.2}
          strokeLinejoin="round"
        />

        {/* Inner highlight (gives depth) */}
        {!on && (
          <path
            d={HIGHLIGHT[t]}
            fill="rgba(255,255,255,0.55)"
            strokeLinejoin="round"
          />
        )}

        {/* Selected: inner highlight */}
        {on && (
          <path
            d={HIGHLIGHT[t]}
            fill="rgba(255,255,255,0.15)"
            strokeLinejoin="round"
          />
        )}

        {/* Cusp lines */}
        {on && CUSPS[t]?.map(([x1,y1,x2,y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(255,255,255,0.30)" strokeWidth="0.8" strokeLinecap="round"/>
        ))}

        {/* Hover ring */}
        {ho && !on && (
          <path d={SHAPE[t]} fill="none" stroke="#4a6fa5" strokeWidth="1.5"
            strokeLinejoin="round" strokeOpacity="0.5"/>
        )}

        {/* Gradient def */}
        <defs>
          <linearGradient id={gid} x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ab8ff"/>
            <stop offset="40%" stopColor="#2d6ef5"/>
            <stop offset="100%" stopColor="#1435c0"/>
          </linearGradient>
        </defs>

        {/* Tooth number */}
        <text
          textAnchor="middle"
          dy="0.36em"
          fontSize={t === "M" ? 7.5 : 7}
          fontWeight={on ? "700" : "500"}
          fill={on ? "#fff" : ho ? "#2d4060" : "#5a6a82"}
          fontFamily="'Helvetica Neue',Arial,sans-serif"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {n}
        </text>
      </g>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm" style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif" }}>

        {/* Header */}
        <div className="mb-3 text-center">
          <h2 className="text-sm font-bold text-slate-600 tracking-widest uppercase">
            Tooth Selection
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">FDI Numbering System</p>
        </div>

        {/* Selected teeth chips */}
        <div className="mb-3 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 min-h-[52px] flex items-center flex-wrap gap-1.5">
          {selArr.length === 0 ? (
            <span className="text-slate-400 text-xs w-full text-center">
              اضغط على السن لتحديده — Tap a tooth to select
            </span>
          ) : (
            <>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">
                {selArr.length} selected
              </span>
              {selArr.map(n => (
                <button
                  key={n}
                  onClick={() => toggle(n)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full text-[11px] font-bold transition-colors"
                >
                  {n}
                  <span className="text-blue-300 text-[10px]">×</span>
                </button>
              ))}
              <button
                onClick={clearAll}
                className="ml-auto text-[10px] text-slate-400 hover:text-red-400 transition-colors font-medium"
              >
                Clear all
              </button>
            </>
          )}
        </div>

        {/* SVG Dental Chart */}
        <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 rounded-3xl border border-slate-200 shadow-md overflow-hidden">
          <svg
            viewBox="0 0 400 462"
            style={{ width: "100%", display: "block", touchAction: "none" }}
          >
            <defs>
              <radialGradient id="chartBg" cx="50%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#eef2f8" />
              </radialGradient>
            </defs>

            {/* Background */}
            <rect width="400" height="462" fill="url(#chartBg)" />

            {/* Section labels */}
            <text x="200" y="20" textAnchor="middle" fontSize="8.5" fill="#b0bcd0"
              fontFamily="inherit" letterSpacing="2.5" fontWeight="600">UPPER / الفك العلوي</text>
            <text x="200" y="450" textAnchor="middle" fontSize="8.5" fill="#b0bcd0"
              fontFamily="inherit" letterSpacing="2.5" fontWeight="600">LOWER / الفك السفلي</text>

            {/* Quadrant labels */}
            {[["Q1",55,36,"left"],["Q2",345,36,"right"],["Q4",55,434,"left"],["Q3",345,434,"right"]].map(([lbl,lx,ly,ta])=>(
              <text key={lbl} x={lx} y={ly} textAnchor={ta==="right"?"end":"start"}
                fontSize="7.5" fill="#d4dce8" fontFamily="inherit" fontWeight="700">{lbl}</text>
            ))}

            {/* Arch guide lines */}
            <path d={archPath(UA, 197, 343)} fill="none" stroke="#dde5f2"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d={archPath(LA, 163, 17)} fill="none" stroke="#dde5f2"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>

            {/* Outer arch rings */}
            <path d={archPath({...UA, rx:UA.rx+20, ry:UA.ry+18}, 198, 342)}
              fill="none" stroke="#edf1f8" strokeWidth="1" strokeLinecap="round"/>
            <path d={archPath({...LA, rx:LA.rx+20, ry:LA.ry+18}, 162, 18)}
              fill="none" stroke="#edf1f8" strokeWidth="1" strokeLinecap="round"/>

            {/* Midline indicator */}
            <line x1="200" y1="220" x2="200" y2="238" stroke="#c8d4e8"
              strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2,3"/>
            <circle cx="200" cy="229" r="2.5" fill="#dde5f2"/>

            {/* Upper teeth */}
            {UPPER.map((tooth, i) => {
              const pos = archPos(UA, UA_DEG[i]);
              return <Tooth key={tooth.n} {...tooth} {...pos} />;
            })}

            {/* Lower teeth */}
            {LOWER.map((tooth, i) => {
              const pos = archPos(LA, LA_DEG[i]);
              return <Tooth key={tooth.n} {...tooth} {...pos} />;
            })}
          </svg>
        </div>

        {/* Footer info */}
        <div className="mt-2 flex justify-between items-center px-1">
          <span className="text-[11px] text-slate-400">
            {selArr.length > 0
              ? `${selArr.length} tooth${selArr.length > 1 ? "teeth" : ""} selected`
              : "Tap or drag to select"}
          </span>
          <span className="text-[11px] text-slate-300 font-mono">
            [{selArr.join(",")}]
          </span>
        </div>

        {/* Confirm button */}
        {selArr.length > 0 && (
          <button
            className="mt-3 w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl text-sm font-bold tracking-wide transition-colors shadow-md shadow-blue-200"
            onClick={() => alert(`Selected: [${selArr.join(", ")}]`)}
          >
            Confirm Selection — تأكيد الاختيار
          </button>
        )}
      </div>
    </div>
  );
}
