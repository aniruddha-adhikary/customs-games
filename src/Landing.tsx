import { Link } from "react-router-dom";

const beats = [
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
      "Papers Please energy. Build a complete permit — every field, every trap.",
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
];

export function Landing() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
      <header className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">
          TradeNet Training
        </h1>
        <p className="text-customs-muted text-base sm:text-lg">
          &ldquo;Be the Declaring Agent&rdquo; &mdash; Case #014: Bordeaux Wine
          Import
        </p>
        <p className="text-customs-gold text-sm mt-2">
          Singapore Customs &bull; TradeNet Procedures (Mar 2026)
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl">
        {beats.map((beat) => (
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
