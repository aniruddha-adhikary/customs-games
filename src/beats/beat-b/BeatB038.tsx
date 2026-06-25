import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  MESSAGE_TYPE_LABELS,
  MESSAGE_TYPE_DESCRIPTIONS,
  type MessageType,
} from "../../data/case014";

type BeatState =
  | "INTRO"
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
  IN: {
    color: "border-customs-amber",
    message:
      "IN permits are for goods entering Singapore for local consumption. These OLED panels are just passing through to Jakarta \u2014 they never enter Singapore\u2019s customs territory.",
  },
  OUT: {
    color: "border-customs-amber",
    message:
      "OUT permits are for goods leaving Singapore that were previously imported. These goods originated from Korea, not Singapore \u2014 they\u2019re transiting through.",
  },
  COO: {
    color: "border-customs-amber",
    message:
      "A Certificate of Origin proves where goods were manufactured \u2014 it\u2019s a trade document, not a movement permit. You need a transhipment permit.",
  },
};

function SpeedTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startTime <= 0) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const remaining = Math.max(0, 30 - elapsed);
  const isExpired = remaining === 0;

  return (
    <div className={`flex items-center gap-1.5 text-xs ${isExpired ? "text-customs-muted" : "text-customs-gold"}`}>
      <span>{isExpired ? "\u23F0" : "\u26A1"}</span>
      <span>{isExpired ? "Speed bonus expired" : `Speed bonus: ${remaining}s`}</span>
      {!isExpired && (
        <div className="w-16 h-1 bg-customs-border rounded-full overflow-hidden">
          <div className="h-full bg-customs-gold rounded-full transition-all duration-1000" style={{ width: `${(remaining / 30) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export function BeatB038() {
  const [state, setState] = useState<BeatState>("INTRO");
  const [scaffolding, setScaffolding] = useState<ScaffoldingLevel>(1);
  const [selectedMsg, setSelectedMsg] = useState<MessageType | null>(null);
  const [gate3Choice, setGate3Choice] = useState<"passing" | "staying" | null>(null);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [gate2StartTime, setGate2StartTime] = useState(0);
  const [gate2EndTime, setGate2EndTime] = useState(0);
  const [showRulebook, setShowRulebook] = useState(false);
  const [caseCardOpen, setCaseCardOpen] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [lastWrongChoice, setLastWrongChoice] = useState<string | null>(null);
  const gate2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === "LEG1_ANIMATING") {
      const t = setTimeout(() => setState("LEG1_OPEN"), 4000);
      return () => clearTimeout(t);
    }
    if (state === "GATE2_CORRECT") {
      setGate2EndTime(Date.now());
      const t = setTimeout(() => setState("LEG2_ANIMATING"), 1200);
      return () => clearTimeout(t);
    }
    if (state === "LEG2_ANIMATING") {
      const t = setTimeout(() => setState("GATE3_ACTIVE"), 3000);
      return () => clearTimeout(t);
    }
    if (state === "GATE3_CORRECT") {
      const t = setTimeout(() => setState("LEG3_ANIMATING"), 1200);
      return () => clearTimeout(t);
    }
    if (state === "LEG3_ANIMATING") {
      const t = setTimeout(() => setState("BEAT_COMPLETE"), 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const handleBegin = useCallback(() => {
    setState("LEG1_ANIMATING");
  }, []);

  const handleLeg1Continue = useCallback(() => {
    setState("GATE2_ACTIVE");
    setGate2StartTime(Date.now());
  }, []);

  const handleUnlockGate2 = useCallback(() => {
    if (!selectedMsg) return;
    if (selectedMsg === "TSHIP") {
      setState("GATE2_CORRECT");
      setLastWrongChoice(null);
    } else {
      setAttempts((a) => a + 1);
      const tag =
        selectedMsg === "IN"
          ? "B-T1-MSG-IN"
          : selectedMsg === "OUT"
            ? "B-T1-MSG-OUT"
            : "B-T1-MSG-COO";
      setErrors((e) => [...e, { tag, choice: selectedMsg, timestamp: Date.now() }]);
      setState("GATE2_WRONG");
      setLastWrongChoice(selectedMsg);
      setShakeKey((k) => k + 1);
    }
  }, [selectedMsg]);

  const handleTryAgain = useCallback(() => {
    setSelectedMsg(null);
    setState("GATE2_ACTIVE");
    setShakeKey(0);
  }, []);

  const handleGate3 = useCallback(() => {
    if (gate3Choice === "passing") {
      setState("GATE3_CORRECT");
    }
  }, [gate3Choice]);

  const computeScoreBreakdown = (): {
    accuracy: number; speed: number; confirmation: number; total: number;
  } => {
    let accuracy = 0;
    if (attempts === 0) accuracy = 60;
    else if (attempts === 1) accuracy = 40;
    else accuracy = 20;

    const confirmation = gate3Choice === "passing" ? 20 : 0;

    const endTs = gate2EndTime > 0 ? gate2EndTime : Date.now();
    const speed =
      attempts === 0 && gate2StartTime > 0 && endTs - gate2StartTime < 30000 ? 20 : 0;

    return { accuracy, speed, confirmation, total: accuracy + speed + confirmation };
  };

  const legProgress = (leg: 1 | 2 | 3): "locked" | "animating" | "done" => {
    if (leg === 1) {
      if (state === "INTRO") return "locked";
      if (state === "LEG1_ANIMATING") return "animating";
      return "done";
    }
    if (leg === 2) {
      if (["INTRO", "LEG1_ANIMATING", "LEG1_OPEN", "GATE2_ACTIVE", "GATE2_WRONG"].includes(state)) return "locked";
      if (state === "GATE2_CORRECT" || state === "LEG2_ANIMATING") return "animating";
      return "done";
    }
    if (["INTRO", "LEG1_ANIMATING", "LEG1_OPEN", "GATE2_ACTIVE", "GATE2_WRONG", "GATE2_CORRECT", "LEG2_ANIMATING", "GATE3_ACTIVE"].includes(state)) return "locked";
    if (state === "GATE3_CORRECT" || state === "LEG3_ANIMATING") return "animating";
    return "done";
  };

  const openCount = [1, 2, 3].filter((l) => legProgress(l as 1 | 2 | 3) === "done").length;

  const handleReplay = useCallback(() => {
    setState("INTRO");
    setSelectedMsg(null);
    setGate3Choice(null);
    setErrors([]);
    setAttempts(0);
    setGate2StartTime(0);
    setGate2EndTime(0);
    setLastWrongChoice(null);
    setCaseCardOpen(false);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">CASE #038 &mdash; SAMSUNG OLED TRANSHIPMENT</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setShowRulebook(!showRulebook)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-gold hover:bg-customs-panel cursor-pointer">Rulebook</button>
          <button onClick={() => setScaffolding((s) => (s === 1 ? 2 : 1) as ScaffoldingLevel)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer">
            {scaffolding === 1 ? "Guided" : "Open"}
          </button>
          <span className="text-xs text-customs-muted">{openCount}/3 {openCount === 3 ? "\uD83D\uDD13" : "\uD83D\uDD12"}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-auto">
        {/* Journey Map: Korea -> SG FTZ (TRANSIT) -> Jakarta */}
        <div className="bg-customs-panel border-b border-customs-border p-3 sm:p-4 flex-shrink-0">
          <div className="flex items-center justify-between max-w-3xl mx-auto gap-1 sm:gap-2">
            {[
              { label: "ORIGIN", sub: "Korea", icon: "\uD83C\uDDF0\uD83C\uDDF7", leg: 0 as const },
              { label: "FTZ", sub: "SG Transit", icon: "\u2693", leg: 1 as const },
              { label: "TRANSIT", sub: "Reloading", icon: "\uD83D\uDEA2", leg: 2 as const },
              { label: "DESTINATION", sub: "Jakarta", icon: "\uD83C\uDDEE\uD83C\uDDE9", leg: 3 as const },
            ].map((node, i) => (
              <div key={node.label} className="flex items-center flex-1">
                <div
                  className={`flex flex-col items-center p-2 sm:p-3 rounded-lg border text-center flex-shrink-0 w-16 sm:w-24 transition-all duration-500 ${
                    node.leg === 0 || legProgress((node.leg || 1) as 1 | 2 | 3) === "done"
                      ? "border-customs-green/50 bg-customs-green/10"
                      : legProgress((node.leg || 1) as 1 | 2 | 3) === "animating"
                        ? "border-customs-amber/50 bg-customs-amber/10"
                        : "border-customs-border bg-customs-surface"
                  }`}
                >
                  <span className="text-lg sm:text-2xl">{node.icon}</span>
                  <span className="text-[10px] sm:text-xs font-bold text-white mt-1">{node.label}</span>
                  <span className="text-[9px] sm:text-[10px] text-customs-muted">{node.sub}</span>
                </div>
                {i < 3 && (
                  <div className="flex-1 flex items-center justify-center mx-1">
                    <div className={`h-0.5 flex-1 transition-colors duration-500 ${legProgress((i + 1) as 1 | 2 | 3) === "done" ? "bg-customs-green" : legProgress((i + 1) as 1 | 2 | 3) === "animating" ? "bg-customs-amber" : "bg-customs-border"}`} />
                    <span className="mx-1 text-sm">
                      {legProgress((i + 1) as 1 | 2 | 3) === "done" ? "\uD83D\uDD13" : legProgress((i + 1) as 1 | 2 | 3) === "animating" ? "\uD83D\uDEA2" : "\uD83D\uDD12"}
                    </span>
                    <div className={`h-0.5 flex-1 transition-colors duration-500 ${legProgress((i + 1) as 1 | 2 | 3) === "done" ? "bg-customs-green" : "bg-customs-border"}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Active Gate Panel */}
        <div className="flex-1 flex flex-col p-3 sm:p-6 max-w-3xl mx-auto w-full">
          {state === "INTRO" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-3xl mb-3">{"\uD83D\uDCE6"}</p>
                <p className="text-customs-gold text-lg font-medium mb-2">You are a Declaring Agent.</p>
                <p className="text-customs-muted text-sm mb-2">
                  2,000 OLED panels from Korea are arriving in Singapore&apos;s FTZ, destined for Jakarta, Indonesia. They will NOT enter Singapore for local use &mdash; they&apos;re just passing through.
                </p>
                <p className="text-customs-muted text-xs mb-5">
                  Route these goods through Singapore&apos;s trade checkpoints by choosing the correct permit at each gate.
                </p>
                <button onClick={handleBegin} className="w-full bg-customs-gold text-customs-dark font-bold py-3 rounded-lg hover:bg-customs-gold/90 transition-colors cursor-pointer animate-pulse-glow">
                  BEGIN JOURNEY
                </button>
              </div>
            </div>
          )}

          {state === "LEG1_ANIMATING" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-green/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-customs-green text-lg font-medium mb-2">{"\uD83D\uDEA2"} Ship arriving from Busan at Pasir Panjang FTZ...</p>
                <p className="text-customs-muted text-sm mt-2">Gate 1 opens automatically for FTZ entry.</p>
              </div>
            </div>
          )}

          {state === "LEG1_OPEN" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-green/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-4xl mb-3">{"\uD83D\uDD13"}</p>
                <p className="text-customs-green text-lg font-medium mb-2">Gate 1 opened &mdash; goods in FTZ</p>
                {scaffolding === 1 && (
                  <p className="text-customs-muted text-sm mt-3 mb-4">
                    The OLED panels are now in the Pasir Panjang FTZ. They need to be loaded onto another vessel bound for Jakarta. What kind of permit do you need?
                  </p>
                )}
                <button onClick={handleLeg1Continue} className="mt-2 w-full bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg hover:bg-customs-gold/90 transition-colors cursor-pointer">
                  CONTINUE TO GATE 2
                </button>
              </div>
            </div>
          )}

          {(state === "GATE2_ACTIVE" || state === "GATE2_WRONG") && (
            <div className="animate-fade-in space-y-4" ref={gate2Ref}>
              <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="text-white font-bold text-base sm:text-lg">LEG 2: FTZ &rarr; TRANSIT RELOADING</h2>
                  {attempts > 0 && (
                    <span className="text-xs text-customs-amber bg-customs-amber/10 px-2 py-0.5 rounded">{attempts} {attempts === 1 ? "attempt" : "attempts"} used</span>
                  )}
                </div>
                <p className="text-customs-muted text-sm mb-2">
                  The OLED panels need to move from the inward vessel to the outward vessel, both within the FTZ. Choose the right permit type.
                </p>
                <SpeedTimer startTime={gate2StartTime} />

                <div className="mt-4">
                  <h3 className="text-xs text-customs-gold uppercase tracking-wider mb-2">Select Message Type</h3>
                  <div className="space-y-2">
                    {(Object.entries(MESSAGE_TYPE_LABELS) as [MessageType, string][]).map(([key, label]) => {
                      const wasWrong = errors.some((e) => e.choice === key);
                      return (
                        <label
                          key={key}
                          className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                            selectedMsg === key
                              ? state === "GATE2_WRONG" && selectedMsg !== "TSHIP"
                                ? "border-customs-red/60 bg-customs-red/10"
                                : "border-customs-gold bg-customs-gold/10"
                              : wasWrong
                                ? "border-customs-red/20 bg-customs-red/5 opacity-60"
                                : "border-customs-border hover:border-customs-muted"
                          }`}
                        >
                          <input
                            type="radio"
                            name="msgType"
                            value={key}
                            checked={selectedMsg === key}
                            onChange={() => { setSelectedMsg(key); setState("GATE2_ACTIVE"); }}
                            className="mt-1 accent-[#c8a94e]"
                          />
                          <div>
                            <span className="text-sm text-white font-medium">{label}</span>
                            {wasWrong && selectedMsg !== key && <span className="ml-2 text-[10px] text-customs-red">{"\u2717"}</span>}
                            {scaffolding === 1 && (
                              <p className="text-xs text-customs-muted mt-0.5">{MESSAGE_TYPE_DESCRIPTIONS[key]}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {state === "GATE2_WRONG" && lastWrongChoice && WRONG_FEEDBACK[lastWrongChoice] && (
                  <div key={shakeKey} className={`mt-4 p-3 rounded-lg border-2 ${WRONG_FEEDBACK[lastWrongChoice].color} bg-customs-amber/5 animate-shake`}>
                    <p className="text-sm text-customs-amber font-medium mb-1">{"\u26A0\uFE0F"} Not quite right</p>
                    <p className="text-sm text-customs-amber">{WRONG_FEEDBACK[lastWrongChoice].message}</p>
                  </div>
                )}

                <button
                  onClick={state === "GATE2_WRONG" ? handleTryAgain : handleUnlockGate2}
                  disabled={state !== "GATE2_WRONG" && !selectedMsg}
                  className="mt-4 w-full bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-customs-gold/90 transition-colors cursor-pointer"
                >
                  {state === "GATE2_WRONG" ? "TRY AGAIN" : "UNLOCK GATE"}
                </button>
              </div>
            </div>
          )}

          {(state === "GATE2_CORRECT" || state === "LEG2_ANIMATING") && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-green/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-4xl mb-3">{"\uD83D\uDD13"}</p>
                <p className="text-customs-green text-lg font-medium">Gate 2 unlocked! TSHIP / Transhipment is correct.</p>
                {attempts === 0 && <p className="text-customs-gold text-sm mt-1">{"\u2B50"} First try!</p>}
                <p className="text-customs-muted text-sm mt-2">
                  {state === "LEG2_ANIMATING" ? "\uD83D\uDEA2 Goods being reloaded onto MV Java Express..." : "Proceeding..."}
                </p>
              </div>
            </div>
          )}

          {state === "GATE3_ACTIVE" && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6">
                <h2 className="text-white font-bold text-base sm:text-lg mb-1">LEG 3: FTZ &rarr; ONWARD DESTINATION</h2>
                <p className="text-customs-muted text-sm mb-4">
                  Permit approved. Are these goods staying in Singapore or passing through to another destination?
                </p>
                <div className="flex gap-3">
                  {(["passing", "staying"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setGate3Choice(opt)}
                      className={`flex-1 py-3 rounded-lg border font-bold transition-colors cursor-pointer ${
                        gate3Choice === opt
                          ? opt === "staying"
                            ? "border-customs-red/60 bg-customs-red/10 text-customs-red"
                            : "border-customs-gold bg-customs-gold/10 text-customs-gold"
                          : "border-customs-border text-customs-muted hover:border-customs-muted"
                      }`}
                    >
                      {opt === "passing" ? "Passing through (Transhipment)" : "Staying in Singapore"}
                    </button>
                  ))}
                </div>
                {gate3Choice === "staying" && (
                  <p className="text-customs-amber text-sm mt-3 animate-fade-in">
                    {"\u26A0\uFE0F"} These goods are NOT staying in Singapore. They&apos;re being reloaded onto MV Java Express bound for Jakarta. This is a transhipment.
                  </p>
                )}
                <button
                  onClick={handleGate3}
                  disabled={gate3Choice !== "passing"}
                  className={`mt-4 w-full font-bold py-2.5 rounded-lg transition-colors cursor-pointer ${
                    gate3Choice === "passing"
                      ? "bg-customs-gold text-customs-dark hover:bg-customs-gold/90"
                      : "bg-customs-surface text-customs-muted border border-customs-border cursor-not-allowed"
                  }`}
                >
                  {gate3Choice === "staying" ? "SELECT \u201CPASSING THROUGH\u201D ABOVE" : gate3Choice === "passing" ? "CONFIRM" : "SELECT AN ANSWER"}
                </button>
              </div>
            </div>
          )}

          {state === "GATE3_CORRECT" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-green/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-4xl mb-3">{"\uD83D\uDD13"}</p>
                <p className="text-customs-green text-lg font-medium">Confirmed! Goods departing to Jakarta...</p>
                <p className="text-customs-muted text-sm mt-2">{"\uD83D\uDEA2"} MV Java Express departing for Tanjung Priok...</p>
              </div>
            </div>
          )}

          {state === "LEG3_ANIMATING" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-green/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-4xl mb-3">{"\uD83D\uDEA2"}</p>
                <p className="text-customs-green text-lg font-medium">Departing to Jakarta...</p>
              </div>
            </div>
          )}

          {state === "BEAT_COMPLETE" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-3xl mb-2">{"\uD83C\uDF89"}</p>
                <h2 className="text-customs-gold text-xl font-bold mb-4">TRANSHIPMENT COMPLETE &mdash; CASE #038</h2>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-customs-muted">LEG 1: Korea &rarr; SG FTZ</span>
                    <span className="text-customs-green">{"\uD83D\uDD13"} AUTO</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-customs-muted">LEG 2: FTZ &rarr; Transit</span>
                    <span className="text-customs-green">{"\uD83D\uDD13"} TSHIP</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-customs-muted">LEG 3: Transit &rarr; Jakarta</span>
                    <span className="text-customs-green">{"\uD83D\uDD13"} Confirmed</span>
                  </div>
                </div>
                <div className="border-t border-customs-border pt-4 space-y-2">
                  <h3 className="text-xs text-customs-gold uppercase tracking-wider mb-2">Score Breakdown</h3>
                  {(() => {
                    const breakdown = computeScoreBreakdown();
                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-customs-muted">Accuracy ({attempts === 0 ? "1st try" : attempts === 1 ? "2nd try" : `${attempts + 1} tries`})</span>
                          <span className={`font-bold ${breakdown.accuracy >= 60 ? "text-customs-green" : breakdown.accuracy >= 40 ? "text-customs-amber" : "text-customs-red"}`}>{breakdown.accuracy} / 60</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-customs-muted">Speed bonus (&lt;30s)</span>
                          <span className={`font-bold ${breakdown.speed > 0 ? "text-customs-green" : "text-customs-muted"}`}>{breakdown.speed} / 20</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-customs-muted">Confirmation (Gate 3)</span>
                          <span className={`font-bold ${breakdown.confirmation > 0 ? "text-customs-green" : "text-customs-muted"}`}>{breakdown.confirmation} / 20</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-customs-border pt-2 mt-2">
                          <span className="text-white font-bold">Total Faithfulness</span>
                          <span className="text-white font-bold text-lg">{breakdown.total} / 100</span>
                        </div>
                      </>
                    );
                  })()}
                  {errors.length > 0 && (
                    <div className="flex justify-between text-sm pt-1">
                      <span className="text-customs-muted">Errors logged</span>
                      <span className="text-customs-amber font-bold">{errors.length}</span>
                    </div>
                  )}
                </div>
                <div className="mt-6 space-y-2">
                  <button onClick={handleReplay} className="w-full bg-customs-surface border border-customs-border text-customs-gold font-bold py-2.5 rounded-lg hover:bg-customs-panel transition-colors cursor-pointer">PLAY AGAIN</button>
                  <Link to="/" className="block bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg no-underline hover:bg-customs-gold/90 transition-colors text-center">HAND BACK TO FACILITATOR</Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Case Card */}
        <div className="border-t border-customs-border bg-customs-navy flex-shrink-0">
          <button onClick={() => setCaseCardOpen(!caseCardOpen)} className="w-full px-3 sm:px-6 py-2 flex items-center justify-between text-xs text-customs-muted hover:text-white cursor-pointer bg-transparent border-0">
            <span>CASE CARD <span className="text-customs-gold ml-1">Samsung OLED Transhipment</span></span>
            <span>{caseCardOpen ? "\u25B2" : "\u25BC"}</span>
          </button>
          {caseCardOpen && (
            <div className="px-3 sm:px-6 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-fade-in">
              <div><span className="text-customs-muted">Shipper</span><p className="text-white">Samsung Display, KR</p></div>
              <div><span className="text-customs-muted">Consignee</span><p className="text-white">PT Elektronik Nusantara, ID</p></div>
              <div><span className="text-customs-muted">Goods</span><p className="text-white">OLED Panels (2,000 pcs)</p></div>
              <div><span className="text-customs-muted">Mode</span><p className="text-white">Sea freight</p></div>
              <div><span className="text-customs-muted">Origin</span><p className="text-white">South Korea</p></div>
              <div><span className="text-customs-muted">Final Destination</span><p className="text-white">Jakarta, Indonesia</p></div>
              <div><span className="text-customs-muted">SG Role</span><p className="text-customs-amber">TRANSIT only</p></div>
              <div><span className="text-customs-muted">Status</span><p className="text-customs-green">Non-dutiable</p></div>
            </div>
          )}
        </div>
      </div>

      {showRulebook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/50" onClick={() => setShowRulebook(false)} />
          <div className="w-80 sm:w-96 bg-customs-navy border-l border-customs-border overflow-auto animate-slide-in p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-customs-gold font-bold">Rulebook</h3>
              <button onClick={() => setShowRulebook(false)} className="text-customs-muted hover:text-white cursor-pointer bg-transparent border-0 text-lg">&times;</button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="bg-customs-surface/50 rounded-lg p-3 border border-customs-border/50">
                <h4 className="text-white font-medium mb-2">Transhipment Key Facts</h4>
                <ul className="text-customs-muted space-y-2 list-none p-0 text-xs">
                  <li>Goods pass THROUGH Singapore without entering customs territory</li>
                  <li>Correct message type: <strong className="text-customs-gold">TSHIP</strong></li>
                  <li>Declaration type: <strong className="text-customs-gold">TTI</strong> (Through Transhipment, Inward manifest)</li>
                  <li>No duty/GST payable</li>
                  <li>Both Place of Release AND Receipt = FTZ</li>
                </ul>
              </div>
              <div className="bg-customs-surface/50 rounded-lg p-3 border border-customs-border/50">
                <h4 className="text-white font-medium mb-2">Common Mistake</h4>
                <p className="text-customs-muted text-xs">Students often choose IN because goods are &ldquo;arriving.&rdquo; But IN = import for local consumption. If goods are just passing through to another country, it&apos;s TSHIP.</p>
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
