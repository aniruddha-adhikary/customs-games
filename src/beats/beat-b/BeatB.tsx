import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  MESSAGE_TYPE_LABELS,
  MESSAGE_TYPE_DESCRIPTIONS,
  type MessageType,
} from "../../data/case014";

type BeatState =
  | "INIT"
  | "LEG1_ANIMATING"
  | "LEG1_OPEN"
  | "GATE2_ACTIVE"
  | "GATE2_WRONG"
  | "GATE2_CORRECT"
  | "LEG2_ANIMATING"
  | "GATE3_ACTIVE"
  | "GATE3_CORRECT"
  | "LEG3_ANIMATING"
  | "BEAT_COMPLETE";

type ScaffoldingLevel = 1 | 2;

interface ErrorEntry {
  tag: string;
  choice: string;
  timestamp: number;
}

const WRONG_FEEDBACK: Record<string, { color: string; message: string }> = {
  OUT: {
    color: "border-customs-amber",
    message:
      "OUT permits are for goods leaving Singapore. Your wine hasn't left — it's trying to come in. Flip the direction.",
  },
  TSHIP: {
    color: "border-customs-amber",
    message:
      "Transhipment permits are for goods passing through Singapore to another destination — not for goods being imported for consumption here. Your wine is staying in Singapore.",
  },
  COO: {
    color: "border-customs-amber",
    message:
      "A Certificate of Origin proves where goods were made — it's a trade document for tariff preference claims, not a movement permit. You need a permit, not a certificate.",
  },
};

const TSHIP_SUBTYPES = [
  { label: "Through Transhipment within same FTZ", tooltip: "Only covers goods staying inside one FTZ — the wine needs to cross into Singapore proper." },
  { label: "TTI — Inter-Gateway Movement", tooltip: "For moving goods between gateways, not for importing." },
  { label: "IGM — Inter-Gateway Movement", tooltip: "For inter-gateway cargo routing." },
  { label: "Removal (REM)", tooltip: "For removing goods from licensed warehouses." },
  { label: "Blanket Removal (BRE)", tooltip: "For pre-approved bulk removals." },
];

export function BeatB() {
  const [state, setState] = useState<BeatState>("INIT");
  const [scaffolding, setScaffolding] = useState<ScaffoldingLevel>(1);
  const [selectedMsg, setSelectedMsg] = useState<MessageType | null>(null);
  const [gate3Choice, setGate3Choice] = useState<"IN" | "OUT" | null>(null);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [gate2StartTime, setGate2StartTime] = useState(0);
  const [showRulebook, setShowRulebook] = useState(false);
  const [showTshipSubs, setShowTshipSubs] = useState(false);
  const [caseCardOpen, setCaseCardOpen] = useState(true);

  useEffect(() => {
    if (state === "INIT") {
      const t = setTimeout(() => setState("LEG1_ANIMATING"), 1000);
      return () => clearTimeout(t);
    }
    if (state === "LEG1_ANIMATING") {
      const t = setTimeout(() => setState("LEG1_OPEN"), 4000);
      return () => clearTimeout(t);
    }
    if (state === "LEG1_OPEN") {
      const t = setTimeout(() => {
        setState("GATE2_ACTIVE");
        setGate2StartTime(Date.now());
      }, 2000);
      return () => clearTimeout(t);
    }
    if (state === "GATE2_CORRECT") {
      const t = setTimeout(() => setState("LEG2_ANIMATING"), 800);
      return () => clearTimeout(t);
    }
    if (state === "LEG2_ANIMATING") {
      const t = setTimeout(() => setState("GATE3_ACTIVE"), 3000);
      return () => clearTimeout(t);
    }
    if (state === "GATE3_CORRECT") {
      const t = setTimeout(() => setState("LEG3_ANIMATING"), 800);
      return () => clearTimeout(t);
    }
    if (state === "LEG3_ANIMATING") {
      const t = setTimeout(() => setState("BEAT_COMPLETE"), 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const handleUnlockGate2 = useCallback(() => {
    if (!selectedMsg) return;
    if (selectedMsg === "IN") {
      setState("GATE2_CORRECT");
      setShowTshipSubs(false);
    } else {
      setAttempts((a) => a + 1);
      const tag =
        selectedMsg === "OUT"
          ? "B-S1-MSG-OUT"
          : selectedMsg === "TSHIP"
            ? "B-S1-MSG-TSHIP"
            : "B-S1-MSG-COO";
      setErrors((e) => [
        ...e,
        { tag, choice: selectedMsg, timestamp: Date.now() },
      ]);
      setState("GATE2_WRONG");
      if (selectedMsg === "TSHIP") setShowTshipSubs(true);
    }
  }, [selectedMsg]);

  const handleGate3 = useCallback(() => {
    if (gate3Choice === "IN") {
      setState("GATE3_CORRECT");
    }
  }, [gate3Choice]);

  const computeScore = (): number => {
    let score = 0;
    if (attempts === 0) score += 60;
    else if (attempts === 1) score += 40;
    else score += 20;

    if (gate3Choice === "IN") score += 20;

    if (
      attempts === 0 &&
      gate2StartTime > 0 &&
      Date.now() - gate2StartTime < 30000
    ) {
      score += 20;
    }
    return score;
  };

  const legProgress = (leg: 1 | 2 | 3): "locked" | "animating" | "done" => {
    if (leg === 1) {
      if (state === "INIT") return "locked";
      if (state === "LEG1_ANIMATING") return "animating";
      return "done";
    }
    if (leg === 2) {
      if (
        ["INIT", "LEG1_ANIMATING", "LEG1_OPEN", "GATE2_ACTIVE", "GATE2_WRONG"].includes(state)
      )
        return "locked";
      if (state === "GATE2_CORRECT" || state === "LEG2_ANIMATING")
        return "animating";
      return "done";
    }
    if (
      [
        "INIT",
        "LEG1_ANIMATING",
        "LEG1_OPEN",
        "GATE2_ACTIVE",
        "GATE2_WRONG",
        "GATE2_CORRECT",
        "LEG2_ANIMATING",
        "GATE3_ACTIVE",
      ].includes(state)
    )
      return "locked";
    if (state === "GATE3_CORRECT" || state === "LEG3_ANIMATING")
      return "animating";
    return "done";
  };

  const openCount = [1, 2, 3].filter((l) => legProgress(l as 1 | 2 | 3) === "done").length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-customs-muted hover:text-white text-sm no-underline"
          >
            &larr;
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-white">
            CASE #014 &mdash; BORDEAUX WINE IMPORT
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowRulebook(!showRulebook)}
            className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-gold hover:bg-customs-panel cursor-pointer"
          >
            Rulebook
          </button>
          <button
            onClick={() =>
              setScaffolding((s) => (s === 1 ? 2 : 1) as ScaffoldingLevel)
            }
            className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer"
          >
            {scaffolding === 1 ? "Guided" : "Open"}
          </button>
          <span className="text-xs text-customs-muted">
            {openCount}/3{" "}
            {openCount === 3 ? "\u{1F513}" : "\u{1F512}"}
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-auto">
        {/* Journey Map */}
        <div className="bg-customs-panel border-b border-customs-border p-3 sm:p-4 flex-shrink-0">
          <div className="flex items-center justify-between max-w-3xl mx-auto gap-1 sm:gap-2">
            {[
              {
                label: "ORIGIN",
                sub: "France",
                icon: "\u{1F1EB}\u{1F1F7}",
                leg: 0 as const,
              },
              {
                label: "FTZ",
                sub: "Changi",
                icon: "\u2693",
                leg: 1 as const,
              },
              {
                label: "CLEARANCE",
                sub: "Customs",
                icon: "\u{1F3DB}\uFE0F",
                leg: 2 as const,
              },
              {
                label: "DELIVERED",
                sub: "Singapore",
                icon: "\u{1F3EA}",
                leg: 3 as const,
              },
            ].map((node, i) => (
              <div key={node.label} className="flex items-center flex-1">
                <div
                  className={`flex flex-col items-center p-2 sm:p-3 rounded-lg border text-center flex-shrink-0 w-16 sm:w-24 ${
                    node.leg === 0 ||
                    legProgress(
                      (node.leg || 1) as 1 | 2 | 3,
                    ) === "done"
                      ? "border-customs-green/50 bg-customs-green/10"
                      : legProgress(
                            (node.leg || 1) as 1 | 2 | 3,
                          ) === "animating"
                        ? "border-customs-amber/50 bg-customs-amber/10"
                        : "border-customs-border bg-customs-surface"
                  }`}
                >
                  <span className="text-lg sm:text-2xl">{node.icon}</span>
                  <span className="text-[10px] sm:text-xs font-bold text-white mt-1">
                    {node.label}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-customs-muted">
                    {node.sub}
                  </span>
                </div>
                {i < 3 && (
                  <div className="flex-1 flex items-center justify-center mx-1">
                    <div
                      className={`h-0.5 flex-1 ${
                        legProgress((i + 1) as 1 | 2 | 3) === "done"
                          ? "bg-customs-green"
                          : legProgress((i + 1) as 1 | 2 | 3) === "animating"
                            ? "bg-customs-amber"
                            : "bg-customs-border"
                      }`}
                    />
                    <span className="mx-1 text-sm">
                      {legProgress((i + 1) as 1 | 2 | 3) === "done"
                        ? "\u{1F513}"
                        : legProgress((i + 1) as 1 | 2 | 3) === "animating"
                          ? i === 2
                            ? "\u{1F69B}"
                            : "\u{1F6A2}"
                          : "\u{1F512}"}
                    </span>
                    <div
                      className={`h-0.5 flex-1 ${
                        legProgress((i + 1) as 1 | 2 | 3) === "done"
                          ? "bg-customs-green"
                          : "bg-customs-border"
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Active Gate Panel */}
        <div className="flex-1 flex flex-col p-3 sm:p-6 max-w-3xl mx-auto w-full">
          {/* Init overlay */}
          {state === "INIT" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-customs-gold text-lg font-medium mb-2">
                  You are a Declaring Agent.
                </p>
                <p className="text-customs-muted text-sm">
                  A new shipment has arrived. Move it through Singapore
                  &mdash; but no permit, no move.
                </p>
              </div>
            </div>
          )}

          {/* LEG 1 auto animation */}
          {(state === "LEG1_ANIMATING" || state === "LEG1_OPEN") && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-green/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-customs-green text-lg font-medium mb-2">
                  {state === "LEG1_ANIMATING"
                    ? "\u{1F6A2} Ship arriving at Changi FTZ..."
                    : "\u{1F513} Gate 1 opened automatically"}
                </p>
                {scaffolding === 1 && state === "LEG1_OPEN" && (
                  <p className="text-customs-muted text-sm mt-3">
                    Non-controlled goods moving within the same Free Trade Zone
                    don&apos;t need a permit for the transhipment leg. Keep that
                    in mind for Gate 2.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Gate 2 — Main challenge */}
          {(state === "GATE2_ACTIVE" || state === "GATE2_WRONG") && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6">
                <h2 className="text-white font-bold text-base sm:text-lg mb-1">
                  LEG 2: FTZ &rarr; CLEARANCE
                </h2>
                <p className="text-customs-muted text-sm mb-4">
                  Your wine needs to enter Singapore for consumption. Choose the
                  right permit type to release it from the FTZ.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Message Type */}
                  <div>
                    <h3 className="text-xs text-customs-gold uppercase tracking-wider mb-2">
                      Step 1 &mdash; Message Type
                    </h3>
                    <div className="space-y-2">
                      {(
                        Object.entries(MESSAGE_TYPE_LABELS) as [
                          MessageType,
                          string,
                        ][]
                      ).map(([key, label]) => (
                        <label
                          key={key}
                          className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                            selectedMsg === key
                              ? "border-customs-gold bg-customs-gold/10"
                              : "border-customs-border hover:border-customs-muted"
                          }`}
                        >
                          <input
                            type="radio"
                            name="msgType"
                            value={key}
                            checked={selectedMsg === key}
                            onChange={() => {
                              setSelectedMsg(key);
                              setState("GATE2_ACTIVE");
                              setShowTshipSubs(false);
                            }}
                            className="mt-1 accent-[#c8a94e]"
                          />
                          <div>
                            <span className="text-sm text-white font-medium">
                              {label}
                            </span>
                            {scaffolding === 1 && (
                              <p className="text-xs text-customs-muted mt-0.5">
                                {MESSAGE_TYPE_DESCRIPTIONS[key]}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Declaration Type (only after msg selected) */}
                  <div>
                    <h3 className="text-xs text-customs-gold uppercase tracking-wider mb-2">
                      Step 2 &mdash; Declaration Type
                    </h3>
                    {!selectedMsg ? (
                      <p className="text-customs-muted text-sm italic">
                        Select a message type first...
                      </p>
                    ) : selectedMsg === "IN" ? (
                      <div className="p-3 rounded border border-customs-green/30 bg-customs-green/5">
                        <p className="text-sm text-customs-green">
                          Import permit (standard) &mdash; confirmed
                        </p>
                      </div>
                    ) : selectedMsg === "TSHIP" && showTshipSubs ? (
                      <div className="space-y-2">
                        {TSHIP_SUBTYPES.map((st) => (
                          <div
                            key={st.label}
                            className="p-2 rounded border border-customs-border/50 opacity-50"
                            title={st.tooltip}
                          >
                            <span className="text-xs text-customs-muted line-through">
                              {st.label}
                            </span>
                            <p className="text-[10px] text-customs-red mt-0.5">
                              {st.tooltip}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-customs-muted text-sm italic">
                        Waiting for correct message type...
                      </p>
                    )}
                  </div>
                </div>

                {/* Wrong choice feedback */}
                {state === "GATE2_WRONG" && selectedMsg && selectedMsg !== "IN" && (
                  <div
                    className={`mt-4 p-3 rounded-lg border-2 ${WRONG_FEEDBACK[selectedMsg].color} bg-customs-amber/5 animate-fade-in`}
                  >
                    <p className="text-sm text-customs-amber">
                      {WRONG_FEEDBACK[selectedMsg].message}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleUnlockGate2}
                  disabled={!selectedMsg}
                  className="mt-4 w-full bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-customs-gold/90 transition-colors cursor-pointer"
                >
                  UNLOCK GATE
                </button>
              </div>
            </div>
          )}

          {/* Gate 2 correct animation */}
          {(state === "GATE2_CORRECT" || state === "LEG2_ANIMATING") && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-green/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-4xl mb-3">{"\ud83d\udd13"}</p>
                <p className="text-customs-green text-lg font-medium">
                  Gate 2 unlocked! IN / Import is correct.
                </p>
                <p className="text-customs-muted text-sm mt-2">
                  {state === "LEG2_ANIMATING"
                    ? "\u{1F6A2} Goods moving to clearance..."
                    : "Proceeding..."}
                </p>
              </div>
            </div>
          )}

          {/* Gate 3 — Confirmation */}
          {state === "GATE3_ACTIVE" && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6">
                <h2 className="text-white font-bold text-base sm:text-lg mb-1">
                  LEG 3: CLEARANCE &rarr; DELIVERED
                </h2>
                <p className="text-customs-muted text-sm mb-4">
                  Permit approved. The goods are released. Which direction did
                  your permit point &mdash; import INTO Singapore, or export
                  OUT?
                </p>
                <div className="flex gap-3">
                  {(["IN", "OUT"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setGate3Choice(opt)}
                      className={`flex-1 py-3 rounded-lg border font-bold transition-colors cursor-pointer ${
                        gate3Choice === opt
                          ? "border-customs-gold bg-customs-gold/10 text-customs-gold"
                          : "border-customs-border text-customs-muted hover:border-customs-muted"
                      }`}
                    >
                      {opt === "IN" ? "Import INTO Singapore" : "Export OUT"}
                    </button>
                  ))}
                </div>
                {gate3Choice === "OUT" && (
                  <p className="text-customs-amber text-sm mt-3 animate-fade-in">
                    The wine came in, not out. This was an import permit. Try
                    again.
                  </p>
                )}
                <button
                  onClick={handleGate3}
                  disabled={gate3Choice !== "IN"}
                  className="mt-4 w-full bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-customs-gold/90 transition-colors cursor-pointer"
                >
                  CONFIRM
                </button>
              </div>
            </div>
          )}

          {/* Beat complete */}
          {state === "BEAT_COMPLETE" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <h2 className="text-customs-gold text-xl font-bold mb-4">
                  SHIPMENT DELIVERED &mdash; CASE #014
                </h2>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-customs-muted">
                      LEG 1: Origin &rarr; FTZ
                    </span>
                    <span className="text-customs-green">
                      {"\ud83d\udd13"} FREE
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-customs-muted">
                      LEG 2: FTZ &rarr; Clearance
                    </span>
                    <span className="text-customs-green">
                      {"\ud83d\udd13"} IN / Import
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-customs-muted">
                      LEG 3: Clearance &rarr; SGP
                    </span>
                    <span className="text-customs-green">
                      {"\ud83d\udd13"} Confirmed
                    </span>
                  </div>
                </div>
                <div className="border-t border-customs-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-customs-muted">Faithfulness</span>
                    <span className="text-white font-bold">
                      {computeScore()} / 100
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-customs-muted">Errors logged</span>
                    <span className="text-white font-bold">
                      {errors.length}
                    </span>
                  </div>
                </div>
                <Link
                  to="/"
                  className="mt-6 block bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg no-underline hover:bg-customs-gold/90 transition-colors"
                >
                  HAND BACK TO FACILITATOR
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Case Card */}
        <div className="border-t border-customs-border bg-customs-navy flex-shrink-0">
          <button
            onClick={() => setCaseCardOpen(!caseCardOpen)}
            className="w-full px-3 sm:px-6 py-2 flex items-center justify-between text-xs text-customs-muted hover:text-white cursor-pointer bg-transparent border-0"
          >
            <span>CASE CARD</span>
            <span>{caseCardOpen ? "\u25B2" : "\u25BC"}</span>
          </button>
          {caseCardOpen && (
            <div className="px-3 sm:px-6 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-customs-muted">Shipper</span>
                <p className="text-white">Chateau Merlande, FR</p>
              </div>
              <div>
                <span className="text-customs-muted">Consignee</span>
                <p className="text-white">Lumiere Cellars Pte Ltd, SG</p>
              </div>
              <div>
                <span className="text-customs-muted">Goods</span>
                <p className="text-white">
                  Bottled red wine (1,200 bottles)
                </p>
              </div>
              <div>
                <span className="text-customs-muted">Mode</span>
                <p className="text-white">Sea freight</p>
              </div>
              <div>
                <span className="text-customs-muted">Origin</span>
                <p className="text-white">France</p>
              </div>
              <div>
                <span className="text-customs-muted">Destination</span>
                <p className="text-white">Singapore</p>
              </div>
              <div>
                <span className="text-customs-muted">INCOTERM</span>
                <p className="text-white">FOB Le Havre</p>
              </div>
              <div>
                <span className="text-customs-muted">Status</span>
                <p className="text-customs-amber">Dutiable (liquor)</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rulebook drawer */}
      {showRulebook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="flex-1 bg-black/50"
            onClick={() => setShowRulebook(false)}
          />
          <div className="w-80 sm:w-96 bg-customs-navy border-l border-customs-border overflow-auto animate-slide-in p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-customs-gold font-bold">Rulebook</h3>
              <button
                onClick={() => setShowRulebook(false)}
                className="text-customs-muted hover:text-white cursor-pointer bg-transparent border-0 text-lg"
              >
                &times;
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="text-white font-medium mb-1">Message Types</h4>
                <ul className="text-customs-muted space-y-1 list-none p-0">
                  <li>
                    <strong className="text-white">IN</strong> &mdash; Goods
                    arriving in Singapore
                  </li>
                  <li>
                    <strong className="text-white">OUT</strong> &mdash; Goods
                    leaving Singapore
                  </li>
                  <li>
                    <strong className="text-white">
                      Transhipment/Movement
                    </strong>{" "}
                    &mdash; Goods passing through
                  </li>
                  <li>
                    <strong className="text-white">COO</strong> &mdash;
                    Certificate of Origin
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">
                  Transhipment Sub-types
                </h4>
                <ul className="text-customs-muted space-y-1 list-none p-0 text-xs">
                  <li>Through Transhipment (same FTZ)</li>
                  <li>TTI &mdash; Inter-Gateway</li>
                  <li>IGM &mdash; Inter-Gateway</li>
                  <li>Removal (REM)</li>
                  <li>Blanket Removal (BRE)</li>
                </ul>
              </div>
              <div className="text-xs text-customs-muted border-t border-customs-border pt-3">
                Source: Singapore Customs, TradeNet Procedures (Mar 2026)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
