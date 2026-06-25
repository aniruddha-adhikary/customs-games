import { Link } from "react-router-dom";

const cases = [
  {
    id: "014",
    title: "Case #014",
    subtitle: "Bordeaux Wine Import",
    description:
      "Import 1,200 bottles of Chateau Merlande Grand Cru from France via sea freight. Dutiable goods, FOB valuation, G1 payment.",
    icon: "\u{1F377}",
    color: "from-purple-600 to-red-600",
    tags: ["IN", "Sea", "Dutiable", "FOB"],
  },
  {
    id: "025",
    title: "Case #025",
    subtitle: "Apple MacBook Pro Import",
    description:
      "Import 500 MacBook Pro laptops from Apple Inc (USA) via air freight. Non-dutiable goods, CIF valuation, GF payment.",
    icon: "\u{1F4BB}",
    color: "from-blue-600 to-indigo-600",
    tags: ["IN", "Air", "Non-dutiable", "CIF"],
  },
];

const beats = [
  {
    id: "beat-b",
    title: "Beat B",
    subtitle: "Goods Journey",
    duration: "~10 min",
    icon: "\u{1F6A2}",
    color: "from-blue-600 to-cyan-600",
    order: "Opening Beat",
  },
  {
    id: "beat-a",
    title: "Beat A",
    subtitle: "Declaration Desk",
    duration: "~20 min",
    icon: "\u{1F4CB}",
    color: "from-amber-600 to-orange-600",
    order: "Spine Beat",
  },
  {
    id: "beat-c",
    title: "Beat C",
    subtitle: "Dispatcher",
    duration: "~12 min",
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
          &ldquo;Be the Declaring Agent&rdquo;
        </p>
        <p className="text-customs-gold text-sm mt-2">
          Singapore Customs &bull; TradeNet Procedures (Mar 2026)
        </p>
      </header>

      {/* Case selector */}
      <div className="w-full max-w-4xl mb-8 sm:mb-12">
        <h2 className="text-xs text-customs-gold uppercase tracking-wider font-bold mb-4 text-center">
          Select a Training Case
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {cases.map((c) => (
            <Link
              key={c.id}
              to={`/case-${c.id}`}
              className="group relative bg-customs-panel border border-customs-border rounded-xl p-5 sm:p-6 hover:border-customs-gold/50 transition-all duration-300 no-underline"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white mb-0.5">
                    {c.title}
                  </h3>
                  <p className="text-customs-gold text-sm font-medium mb-2">
                    {c.subtitle}
                  </p>
                  <p className="text-customs-muted text-sm leading-relaxed mb-3">
                    {c.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-customs-surface border border-customs-border text-customs-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    {beats.map((b) => (
                      <span
                        key={b.id}
                        className="text-[10px] text-customs-muted"
                      >
                        {b.icon} {b.subtitle}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div
                className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${c.color} rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity`}
              />
            </Link>
          ))}
        </div>
      </div>

      <footer className="mt-8 sm:mt-12 text-center text-customs-muted text-xs">
        <p>
          All rules from Singapore Customs, TradeNet Procedures (Mar 2026).
        </p>
      </footer>
    </div>
  );
}
