import { useState } from "react";
import { Link } from "react-router-dom";

interface CaseConfig {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  beats: {
    id: string;
    title: string;
    subtitle: string;
    duration: string;
    description: string;
    icon: string;
    color: string;
    order: string;
  }[];
}

const CASES: CaseConfig[] = [
  {
    id: "case-014",
    title: "Case #014",
    subtitle: "Bordeaux Wine Import",
    tag: "IN \u2014 Dutiable",
    beats: [
      {
        id: "beat-b",
        title: "Beat B",
        subtitle: "Goods Journey",
        duration: "~10 min",
        description:
          "Route a shipment through Singapore. Classify the permit to unlock each gate.",
        icon: "\u{1F6A2}",
        color: "from-blue-600 to-cyan-600",
        order: "Opening Beat",
      },
      {
        id: "beat-a",
        title: "Beat A",
        subtitle: "Declaration Desk",
        duration: "~20 min",
        description:
          "Papers Please energy. Build a complete permit \u2014 every field, every trap.",
        icon: "\u{1F4CB}",
        color: "from-amber-600 to-orange-600",
        order: "Spine Beat",
      },
      {
        id: "beat-c",
        title: "Beat C",
        subtitle: "Dispatcher",
        duration: "~12 min",
        description:
          "Four live permits. A short shipment. A ticking clock. Triage correctly.",
        icon: "\u23F1\uFE0F",
        color: "from-red-600 to-rose-600",
        order: "Finale Beat",
      },
    ],
  },
  {
    id: "case-052",
    title: "Case #052",
    subtitle: "Precision Optics Export",
    tag: "OUT \u2014 Non-dutiable",
    beats: [
      {
        id: "case-052/beat-b",
        title: "Beat B",
        subtitle: "Goods Journey",
        duration: "~10 min",
        description:
          "Route an export shipment from Singapore to Germany. Reverse direction from imports.",
        icon: "\u{1F6A2}",
        color: "from-blue-600 to-cyan-600",
        order: "Opening Beat",
      },
      {
        id: "case-052/beat-a",
        title: "Beat A",
        subtitle: "Declaration Desk",
        duration: "~20 min",
        description:
          "Build an export permit \u2014 FOB valuation, exporter UEN, different field visibility.",
        icon: "\u{1F4CB}",
        color: "from-amber-600 to-orange-600",
        order: "Spine Beat",
      },
      {
        id: "case-052/beat-c",
        title: "Beat C",
        subtitle: "Dispatcher",
        duration: "~12 min",
        description:
          "Four permits. A container error. A cancelled order. Triage correctly.",
        icon: "\u23F1\uFE0F",
        color: "from-red-600 to-rose-600",
        order: "Finale Beat",
      },
    ],
  },
];

export function Landing() {
  const [selectedCase, setSelectedCase] = useState(CASES[0]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
      <header className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">
          TradeNet Training
        </h1>
        <p className="text-customs-muted text-base sm:text-lg">
          &ldquo;Be the Declaring Agent&rdquo;
        </p>
        <p className="text-customs-gold text-sm mt-2">
          Singapore Customs &bull; TradeNet Procedures (Mar 2026)
        </p>
      </header>

      {/* Case selector */}
      <div className="flex gap-3 mb-6 sm:mb-8">
        {CASES.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCase(c)}
            className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
              selectedCase.id === c.id
                ? "border-customs-gold bg-customs-gold/10 text-customs-gold"
                : "border-customs-border text-customs-muted hover:border-customs-muted hover:text-white"
            }`}
          >
            <span className="block font-bold">{c.title}</span>
            <span className="block text-[10px] opacity-70 mt-0.5">{c.subtitle}</span>
            <span className={`block text-[9px] mt-1 ${
              selectedCase.id === c.id ? "text-customs-gold/70" : "text-customs-muted/50"
            }`}>{c.tag}</span>
          </button>
        ))}
      </div>

      <p className="text-customs-muted text-sm mb-4">
        {selectedCase.title}: {selectedCase.subtitle}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl">
        {selectedCase.beats.map((beat) => (
          <Link
            key={beat.id}
            to={`/${beat.id}`}
            className="group relative bg-customs-panel border border-customs-border rounded-xl p-5 sm:p-6 hover:border-customs-gold/50 transition-all duration-300 no-underline"
          >
            <div className="text-xs text-customs-muted uppercase tracking-wider mb-3">
              {beat.order} &bull; {beat.duration}
            </div>
            <div className="text-3xl sm:text-4xl mb-3">{beat.icon}</div>
            <h2 className="text-xl font-bold text-white mb-1">{beat.title}</h2>
            <h3 className="text-customs-gold text-sm font-medium mb-3">
              {beat.subtitle}
            </h3>
            <p className="text-customs-muted text-sm leading-relaxed">
              {beat.description}
            </p>
            <div
              className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${beat.color} rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity`}
            />
          </Link>
        ))}
      </div>

      <footer className="mt-8 sm:mt-12 text-center text-customs-muted text-xs">
        <p>
          All rules from Singapore Customs, TradeNet Procedures (Mar 2026).
        </p>
      </footer>
    </div>
  );
}
