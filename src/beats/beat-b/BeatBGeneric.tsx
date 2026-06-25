import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  MESSAGE_TYPE_LABELS,
  MESSAGE_TYPE_DESCRIPTIONS,
  type MessageType,
} from "../../data/case014";
import type { BeatBConfig } from "./beatBConfig";

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
    <div
      className={`flex items-center gap-1.5 text-xs ${isExpired ? "text-customs-muted" : "text-customs-gold"}`}
    >
      <span>{isExpired ? "\u23F0" : "\u26A1"}</span>
      <span>
        {isExpired ? "Speed bonus expired" : `Speed bonus: ${remaining}s`}
      </span>
      {!isExpired && (
        <div className="w-16 h-1 bg-customs-border rounded-full overflow-hidden">
          <div
            className="h-full bg-customs-gold rounded-full transition-all duration-1000"
            style={{ width: `${(remaining / 30) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function BeatBGeneric({ config }: { config: BeatBConfig }) {
  const [state, setState] = useState<BeatState>("INTRO");
  const [scaffolding, setScaffolding] = useState<ScaffoldingLevel>(1);
  const [selectedMsg, setSelectedMsg] = useState<MessageType | null>(null);
  const [gate3Choice, setGate3Choice] = useState<string | null>(null);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [gate2StartTime, setGate2StartTime] = useState(0);
  const [gate2EndTime, setGate2EndTime] = useState(0);
  const [showRulebook, setShowRulebook] = useState(false);
  const [showTshipSubs, setShowTshipSubs] = useState(false);
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
    if (selectedMsg === config.correctMessageType) {
      setState("GATE2_CORRECT");
      setShowTshipSubs(false);
      setLastWrongChoice(null);
    } else {
      setAttempts((a) => a + 1);
      const tag = `${config.errorTagPrefix}-MSG-${selectedMsg}`;
      setErrors((e) => [
        ...e,
        { tag, choice: selectedMsg, timestamp: Date.now() },
      ]);
      setState("GATE2_WRONG");
      setLastWrongChoice(selectedMsg);
      setShakeKey((k) => k + 1);
      if (selectedMsg === "TSHIP" && config.tshipSubtypes) setShowTshipSubs(true);
    }
  }, [selectedMsg, config.correctMessageType, config.errorTagPrefix, config.tshipSubtypes]);

  const handleTryAgain = useCallback(() => {
    setSelectedMsg(null);
    setShowTshipSubs(false);
    setState("GATE2_ACTIVE");
    setShakeKey(0);
  }, []);

  const handleGate3 = useCallback(() => {
    if (gate3Choice === config.gate3CorrectValue) {
      setState("GATE3_CORRECT");
    }
  }, [gate3Choice, config.gate3CorrectValue]);

  const computeScoreBreakdown = (): {
    accuracy: number;
    speed: number;
    confirmation: number;
    total: number;
  } => {
    let accuracy = 0;
    if (attempts === 0) accuracy = 60;
    else if (attempts === 1) accuracy = 40;
    else accuracy = 20;

    const confirmation = gate3Choice === config.gate3CorrectValue ? 20 : 0;

    const endTs = gate2EndTime > 0 ? gate2EndTime : Date.now();
    const speed =
      attempts === 0 && gate2StartTime > 0 && endTs - gate2StartTime < 30000
        ? 20
        : 0;

    return { accuracy, speed, confirmation, total: accuracy + speed + confirmation };
  };

  const legProgress = (leg: 1 | 2 | 3): "locked" | "animating" | "done" => {
    if (leg === 1) {
      if (state === "INTRO") return "locked";
      if (state === "LEG1_ANIMATING") return "animating";
      return "done";
    }
    if (leg === 2) {
      if (
        [
          "INTRO",
          "LEG1_ANIMATING",
          "LEG1_OPEN",
          "GATE2_ACTIVE",
          "GATE2_WRONG",
        ].includes(state)
      )
        return "locked";
      if (state === "GATE2_CORRECT" || state === "LEG2_ANIMATING")
        return "animating";
      return "done";
    }
    if (
      [
        "INTRO",
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

  const openCount = [1, 2, 3].filter(
    (l) => legProgress(l as 1 | 2 | 3) === "done",
  ).length;

  const handleReplay = useCallback(() => {
    setState("INTRO");
    setSelectedMsg(null);
    setGate3Choice(null);
    setErrors([]);
    setAttempts(0);
    setGate2StartTime(0);
    setGate2EndTime(0);
    setShowTshipSubs(false);
    setLastWrongChoice(null);
    setCaseCardOpen(false);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to={config.backLink}
            className="text-customs-muted hover:text-white text-sm no-underline"
          >
            &larr;
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-white">
            {config.caseTitle}
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
            {openCount}/3 {openCount === 3 ? "\u{1F513}" : "\u{1F512}"}
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-auto">
        {/* Journey Map */}
        <div className="bg-customs-panel border-b border-customs-border p-3 sm:p-4 flex-shrink-0">
          <div className="flex items-center justify-between max-w-3xl mx-auto gap-1 sm:gap-2">
            {config.mapNodes.map((node, i) => (
              <div key={node.label} className="flex items-center flex-1">
                <div
                  className={`flex flex-col items-center p-2 sm:p-3 rounded-lg border text-center flex-shrink-0 w-16 sm:w-24 transition-all duration-500 ${
                    i === 0 ||
                    legProgress((i || 1) as 1 | 2 | 3) === "done"
                      ? "border-customs-green/50 bg-customs-green/10"
                      : legProgress((i || 1) as 1 | 2 | 3) === "animating"
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
                      className={`h-0.5 flex-1 transition-colors duration-500 ${
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
                          ? config.legTransportIcons[i]
                          : "\u{1F512}"}
                    </span>
                    <div
                      className={`h-0.5 flex-1 transition-colors duration-500 ${
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
          {state === "INTRO" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-3xl mb-3">{config.introIcon}</p>
                <p className="text-customs-gold text-lg font-medium mb-2">
                  You are a Declaring Agent.
                </p>
                <p className="text-customs-muted text-sm mb-2">
                  {config.introDescription}
                </p>
                <p className="text-customs-muted text-xs mb-5">
                  No permit, no move. Choose wisely &mdash; your accuracy and
                  speed are scored.
                </p>
                <button
                  onClick={handleBegin}
                  className="w-full bg-customs-gold text-customs-dark font-bold py-3 rounded-lg hover:bg-customs-gold/90 transition-colors cursor-pointer animate-pulse-glow"
                >
                  BEGIN JOURNEY
                </button>
              </div>
            </div>
          )}

          {state === "LEG1_ANIMATING" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-green/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-customs-green text-lg font-medium mb-2">
                  {config.leg1AnimatingText}
                </p>
                <p className="text-customs-muted text-sm mt-2">
                  Gate 1 opens automatically for this leg.
                </p>
              </div>
            </div>
          )}

          {state === "LEG1_OPEN" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-green/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-4xl mb-3">{"\u{1F513}"}</p>
                <p className="text-customs-green text-lg font-medium mb-2">
                  Gate 1 opened automatically
                </p>
                {scaffolding === 1 && (
                  <p className="text-customs-muted text-sm mt-3 mb-4">
                    {config.leg1ScaffoldingHint}
                  </p>
                )}
                <button
                  onClick={handleLeg1Continue}
                  className="mt-2 w-full bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg hover:bg-customs-gold/90 transition-colors cursor-pointer"
                >
                  CONTINUE TO GATE 2
                </button>
              </div>
            </div>
          )}

          {(state === "GATE2_ACTIVE" || state === "GATE2_WRONG") && (
            <div className="animate-fade-in space-y-4" ref={gate2Ref}>
              <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="text-white font-bold text-base sm:text-lg">
                    {config.gate2Header}
                  </h2>
                  {attempts > 0 && (
                    <span className="text-xs text-customs-amber bg-customs-amber/10 px-2 py-0.5 rounded">
                      {attempts} {attempts === 1 ? "attempt" : "attempts"} used
                    </span>
                  )}
                </div>
                <p className="text-customs-muted text-sm mb-2">
                  {config.gate2Description}
                </p>
                <SpeedTimer startTime={gate2StartTime} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
                      ).map(([key, label]) => {
                        const wasWrong = errors.some((e) => e.choice === key);
                        return (
                          <label
                            key={key}
                            className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              selectedMsg === key
                                ? state === "GATE2_WRONG" &&
                                  selectedMsg !== config.correctMessageType
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
                              {wasWrong && selectedMsg !== key && (
                                <span className="ml-2 text-[10px] text-customs-red">
                                  {"\u2717"}
                                </span>
                              )}
                              {scaffolding === 1 && (
                                <p className="text-xs text-customs-muted mt-0.5">
                                  {MESSAGE_TYPE_DESCRIPTIONS[key]}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs text-customs-gold uppercase tracking-wider mb-2">
                      Step 2 &mdash; Declaration Type
                    </h3>
                    {!selectedMsg ? (
                      <p className="text-customs-muted text-sm italic">
                        Select a message type first...
                      </p>
                    ) : selectedMsg === config.correctMessageType ? (
                      <div className="p-3 rounded border border-customs-green/30 bg-customs-green/5">
                        <p className="text-sm text-customs-green">
                          {config.gate2CorrectText}
                        </p>
                      </div>
                    ) : selectedMsg === "TSHIP" && showTshipSubs && config.tshipSubtypes ? (
                      <div className="space-y-2">
                        {config.tshipSubtypes.map((st) => (
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

                {state === "GATE2_WRONG" &&
                  lastWrongChoice &&
                  config.wrongFeedback[lastWrongChoice] && (
                    <div
                      key={shakeKey}
                      className={`mt-4 p-3 rounded-lg border-2 ${config.wrongFeedback[lastWrongChoice].color} bg-customs-amber/5 animate-shake`}
                    >
                      <p className="text-sm text-customs-amber font-medium mb-1">
                        {"\u26A0\uFE0F"} Not quite right
                      </p>
                      <p className="text-sm text-customs-amber">
                        {config.wrongFeedback[lastWrongChoice].message}
                      </p>
                    </div>
                  )}

                <button
                  onClick={
                    state === "GATE2_WRONG"
                      ? handleTryAgain
                      : handleUnlockGate2
                  }
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
                <p className="text-4xl mb-3">{"\u{1F513}"}</p>
                <p className="text-customs-green text-lg font-medium">
                  Gate 2 unlocked! {config.gate2CorrectText}
                </p>
                {attempts === 0 && (
                  <p className="text-customs-gold text-sm mt-1">
                    {"\u2B50"} First try!
                  </p>
                )}
                <p className="text-customs-muted text-sm mt-2">
                  {state === "LEG2_ANIMATING"
                    ? config.gate2MovingText
                    : "Proceeding..."}
                </p>
              </div>
            </div>
          )}

          {state === "GATE3_ACTIVE" && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6">
                <h2 className="text-white font-bold text-base sm:text-lg mb-1">
                  {config.gate3Header}
                </h2>
                <p className="text-customs-muted text-sm mb-4">
                  {config.gate3Description}
                </p>
                <div className="flex gap-3">
                  {config.gate3Options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setGate3Choice(opt.value)}
                      className={`flex-1 py-3 rounded-lg border font-bold transition-colors cursor-pointer ${
                        gate3Choice === opt.value
                          ? opt.value !== config.gate3CorrectValue
                            ? "border-customs-red/60 bg-customs-red/10 text-customs-red"
                            : "border-customs-gold bg-customs-gold/10 text-customs-gold"
                          : "border-customs-border text-customs-muted hover:border-customs-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {gate3Choice && gate3Choice !== config.gate3CorrectValue && (
                  <p className="text-customs-amber text-sm mt-3 animate-fade-in">
                    {"\u26A0\uFE0F"} {config.gate3WrongFeedback}
                  </p>
                )}
                <button
                  onClick={handleGate3}
                  disabled={gate3Choice !== config.gate3CorrectValue}
                  className={`mt-4 w-full font-bold py-2.5 rounded-lg transition-colors cursor-pointer ${
                    gate3Choice === config.gate3CorrectValue
                      ? "bg-customs-gold text-customs-dark hover:bg-customs-gold/90"
                      : "bg-customs-surface text-customs-muted border border-customs-border cursor-not-allowed"
                  }`}
                >
                  {gate3Choice && gate3Choice !== config.gate3CorrectValue
                    ? config.gate3WrongButtonText
                    : gate3Choice === config.gate3CorrectValue
                      ? "CONFIRM"
                      : "SELECT A DIRECTION"}
                </button>
              </div>
            </div>
          )}

          {state === "GATE3_CORRECT" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-green/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-4xl mb-3">{"\u{1F513}"}</p>
                <p className="text-customs-green text-lg font-medium">
                  {config.gate3CorrectText}
                </p>
                <p className="text-customs-muted text-sm mt-2">
                  {config.gate3CorrectSubtext}
                </p>
              </div>
            </div>
          )}

          {state === "LEG3_ANIMATING" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-green/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-4xl mb-3">{config.leg3AnimatingIcon}</p>
                <p className="text-customs-green text-lg font-medium">
                  {config.leg3AnimatingText}
                </p>
              </div>
            </div>
          )}

          {state === "BEAT_COMPLETE" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-6 sm:p-8 text-center max-w-md animate-fade-in">
                <p className="text-3xl mb-2">{"\u{1F389}"}</p>
                <h2 className="text-customs-gold text-xl font-bold mb-4">
                  {config.completionTitle}
                </h2>
                <div className="space-y-2 mb-4">
                  {config.legSummaries.map((leg) => (
                    <div key={leg.label} className="flex justify-between text-sm">
                      <span className="text-customs-muted">{leg.label}</span>
                      <span className="text-customs-green">
                        {"\u{1F513}"} {leg.result}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-customs-border pt-4 space-y-2">
                  <h3 className="text-xs text-customs-gold uppercase tracking-wider mb-2">
                    Score Breakdown
                  </h3>
                  {(() => {
                    const breakdown = computeScoreBreakdown();
                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-customs-muted">
                            Accuracy ({attempts === 0 ? "1st try" : attempts === 1 ? "2nd try" : `${attempts + 1} tries`})
                          </span>
                          <span className={`font-bold ${breakdown.accuracy >= 60 ? "text-customs-green" : breakdown.accuracy >= 40 ? "text-customs-amber" : "text-customs-red"}`}>
                            {breakdown.accuracy} / 60
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-customs-muted">
                            Speed bonus (&lt;30s)
                          </span>
                          <span className={`font-bold ${breakdown.speed > 0 ? "text-customs-green" : "text-customs-muted"}`}>
                            {breakdown.speed} / 20
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-customs-muted">
                            Confirmation (Gate 3)
                          </span>
                          <span className={`font-bold ${breakdown.confirmation > 0 ? "text-customs-green" : "text-customs-muted"}`}>
                            {breakdown.confirmation} / 20
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-customs-border pt-2 mt-2">
                          <span className="text-white font-bold">
                            Total Faithfulness
                          </span>
                          <span className="text-white font-bold text-lg">
                            {breakdown.total} / 100
                          </span>
                        </div>
                      </>
                    );
                  })()}
                  {errors.length > 0 && (
                    <div className="flex justify-between text-sm pt-1">
                      <span className="text-customs-muted">Errors logged</span>
                      <span className="text-customs-amber font-bold">
                        {errors.length}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-6 space-y-2">
                  <button
                    onClick={handleReplay}
                    className="w-full bg-customs-surface border border-customs-border text-customs-gold font-bold py-2.5 rounded-lg hover:bg-customs-panel transition-colors cursor-pointer"
                  >
                    PLAY AGAIN
                  </button>
                  <Link
                    to={config.backLink}
                    className="block bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg no-underline hover:bg-customs-gold/90 transition-colors text-center"
                  >
                    HAND BACK TO FACILITATOR
                  </Link>
                </div>
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
            <span>
              CASE CARD{" "}
              <span className="text-customs-gold ml-1">
                {config.caseCardLabel}
              </span>
            </span>
            <span>{caseCardOpen ? "\u25B2" : "\u25BC"}</span>
          </button>
          {caseCardOpen && (
            <div className="px-3 sm:px-6 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-fade-in">
              {config.caseCardFields.map((field) => (
                <div key={field.label}>
                  <span className="text-customs-muted">{field.label}</span>
                  <p className={field.colorClass || "text-white"}>{field.value}</p>
                </div>
              ))}
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
              {config.rulebookContent === "transhipment" ? (
                <>
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
                    <p className="text-customs-muted text-xs">
                      Students often choose IN because goods are &ldquo;arriving.&rdquo; But IN = import for local consumption. If goods are just passing through to another country, it&apos;s TSHIP.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-customs-surface/50 rounded-lg p-3 border border-customs-border/50">
                    <h4 className="text-white font-medium mb-2">
                      {"\u{1F4CB}"} Message Types
                    </h4>
                    <ul className="text-customs-muted space-y-2 list-none p-0">
                      <li className="border-b border-customs-border/30 pb-2">
                        <strong className="text-white">IN (Import)</strong>
                        <br />
                        <span className="text-xs">
                          Goods arriving in Singapore for local consumption or
                          use. Requires an import permit.
                        </span>
                      </li>
                      <li className="border-b border-customs-border/30 pb-2">
                        <strong className="text-white">OUT (Export)</strong>
                        <br />
                        <span className="text-xs">
                          Goods leaving Singapore to an overseas destination.
                          Requires an export permit.
                        </span>
                      </li>
                      <li className="border-b border-customs-border/30 pb-2">
                        <strong className="text-white">
                          Transhipment/Movement
                        </strong>
                        <br />
                        <span className="text-xs">
                          Goods passing through Singapore to another country.
                          Covers movement within/between FTZs.
                        </span>
                      </li>
                      <li>
                        <strong className="text-white">
                          COO (Certificate of Origin)
                        </strong>
                        <br />
                        <span className="text-xs">
                          A trade document proving where goods were
                          manufactured. Not a movement permit.
                        </span>
                      </li>
                    </ul>
                  </div>
                  {config.tshipSubtypes && (
                    <div className="bg-customs-surface/50 rounded-lg p-3 border border-customs-border/50">
                      <h4 className="text-white font-medium mb-2">
                        {"\u{1F504}"} Transhipment Sub-types
                      </h4>
                      <ul className="text-customs-muted space-y-1 list-none p-0 text-xs">
                        <li>{"\u2022"} Through Transhipment (within same FTZ)</li>
                        <li>{"\u2022"} TTI &mdash; Inter-Gateway Movement</li>
                        <li>{"\u2022"} IGM &mdash; Inter-Gateway Movement</li>
                        <li>{"\u2022"} Removal (REM) &mdash; Licensed warehouses</li>
                        <li>
                          {"\u2022"} Blanket Removal (BRE) &mdash; Pre-approved bulk
                        </li>
                      </ul>
                    </div>
                  )}
                  <div className="bg-customs-surface/50 rounded-lg p-3 border border-customs-border/50">
                    <h4 className="text-white font-medium mb-2">
                      {"\u{1F4A1}"} Key Principle
                    </h4>
                    <p className="text-customs-muted text-xs">
                      {config.rulebookKeyPrinciple}
                    </p>
                  </div>
                </>
              )}
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
