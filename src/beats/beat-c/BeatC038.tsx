import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";

type PermitState = "APPROVED" | "UTILISED" | "AWAITING_CA_APPROVAL";
type ActionType = "AMEND" | "CANCEL" | "REFUND" | "MONITOR";

interface Permit {
  id: string;
  title: string;
  goods: string;
  messageType: string;
  declarationType: string;
  state: PermitState;
  dutiable: boolean;
  utilisedAt: string | null;
  correctAction: { lever: ActionType };
  badge?: string;
  actionsLocked: boolean;
  hint: string;
  explanation: string;
  correctLabel: string;
}

interface ErrorEntry {
  tag: string;
  message: string;
}

interface ScoreEntry {
  permit: string;
  points: number;
  maxPoints: number;
  tag?: string;
}

const PERMITS: Permit[] = [
  {
    id: "T-038",
    title: "Samsung OLED TSHIP",
    goods: "OLED Panels, 2,000 U (transhipment)",
    messageType: "TSHIP",
    declarationType: "TTI",
    state: "APPROVED",
    dutiable: false,
    utilisedAt: null,
    correctAction: { lever: "AMEND" },
    badge: "VESSEL DELAY",
    actionsLocked: false,
    hint: "The onward vessel MV Java Express has been delayed. The permit must be updated with new vessel/voyage details.",
    explanation: "Transhipment permits can be amended when vessel schedules change. The onward vessel is delayed, requiring amendment with new vessel/voyage details.",
    correctLabel: "Amend (vessel/voyage update)",
  },
  {
    id: "P-140",
    title: "Electronics IN",
    goods: "Circuit boards, non-dutiable",
    messageType: "IN",
    declarationType: "G1",
    state: "UTILISED",
    dutiable: false,
    utilisedAt: "14:30",
    correctAction: { lever: "MONITOR" },
    badge: undefined,
    actionsLocked: true,
    hint: "This permit was utilised for cargo clearance at 14:30. Once utilised, it cannot be amended, cancelled or refunded.",
    explanation: "Once utilised for cargo clearance (at 14:30), a permit is locked. No amendment, cancellation, or refund is possible. Monitor only.",
    correctLabel: "Monitor (no action)",
  },
  {
    id: "P-555",
    title: "Pharma IN",
    goods: "Pharmaceutical supplies, non-dutiable",
    messageType: "IN",
    declarationType: "GF",
    state: "APPROVED",
    dutiable: false,
    utilisedAt: null,
    correctAction: { lever: "CANCEL" },
    badge: "WINDOW CLOSING",
    actionsLocked: false,
    hint: "GF payment + non-dutiable + not utilised + same day = eligible for cancellation before the window closes.",
    explanation: "GF same-day window is closing. The shipment has been cancelled by the supplier. Cancel the permit before the window expires to avoid charges.",
    correctLabel: "Cancel (before window closes)",
  },
  {
    id: "R-200",
    title: "Bonded Storage",
    goods: "Controlled goods, bonded warehouse",
    messageType: "REM",
    declarationType: "G7",
    state: "AWAITING_CA_APPROVAL",
    dutiable: false,
    utilisedAt: null,
    correctAction: { lever: "MONITOR" },
    badge: undefined,
    actionsLocked: false,
    hint: "Permit is awaiting Competent Authority approval. Any premature action would disrupt the approval workflow.",
    explanation: "Permit is still awaiting Competent Authority approval. Any premature action would disrupt the approval workflow. Monitor only.",
    correctLabel: "Monitor (no action)",
  },
];

const SIM_SPEED = 10;
const SIM_START_SECONDS = 10 * 3600 + 15 * 60;
const P555_DEADLINE_SECONDS = 11 * 3600 + 59 * 60 + 59;

function formatSimTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600) % 24;
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatStateLabel(state: PermitState): string {
  return state.replace(/_/g, " ");
}

function ProgressDots({ completed, total }: { completed: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < completed ? "bg-customs-green" : "bg-customs-surface"}`} />
      ))}
      <span className="text-[10px] text-customs-muted ml-1">{completed}/{total}</span>
    </div>
  );
}

export function BeatC038() {
  const [phase, setPhase] = useState<"briefing" | "playing" | "results">("briefing");
  const [simTime, setSimTime] = useState(SIM_START_SECONDS);
  const [scaffolding, setScaffolding] = useState<1 | 2>(1);
  const [selectedPermit, setSelectedPermit] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [completedPermits, setCompletedPermits] = useState<Set<string>>(new Set());
  const [p555Expired, setP555Expired] = useState(false);
  const [p140Attempts, setP140Attempts] = useState(0);
  const [showRulebook, setShowRulebook] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([
    "09:45 \u2014 T-038 approved (TTI, Samsung OLED transhipment)",
    "10:00 \u2014 MV Java Express delayed. Vessel ETA revised.",
    "10:10 \u2014 P-555 approved (GF, non-dutiable, same-day window open)",
    "10:15 \u2014 Dispatcher shift start",
  ]);
  const [beatComplete, setBeatComplete] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setSimTime((t) => {
        const next = t + SIM_SPEED;
        if (next >= P555_DEADLINE_SECONDS && !p555Expired) {
          setP555Expired(true);
          if (!completedPermits.has("P-555")) {
            setErrors((e) => [...e, { tag: "S4-WINDOW-MISS", message: "Missed P-555's GF same-day window." }]);
            setScores((s) => [...s, { permit: "P-555", points: 0, maxPoints: 60, tag: "S4-WINDOW-MISS" }]);
            setCompletedPermits((c) => new Set([...c, "P-555"]));
            setActionLog((l) => [...l, `${formatSimTime(next)} \u2014 P-555 GF window EXPIRED.`]);
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [p555Expired, completedPermits, phase]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [actionLog]);

  const p555TimeLeft = Math.max(0, P555_DEADLINE_SECONDS - simTime);

  const handleConfirm = useCallback(() => {
    if (!selectedPermit || !selectedAction) return;
    const permit = PERMITS.find((p) => p.id === selectedPermit)!;
    const now = formatSimTime(simTime);

    // P-140: locked (utilised)
    if (permit.id === "P-140") {
      setP140Attempts((a) => a + 1);
      if (p140Attempts >= 1) {
        setErrors((e) => [...e, { tag: "S4-LOCK-01", message: "Tried to act on UTILISED permit P-140." }]);
        setScores((s) => [...s, { permit: "P-140", points: 0, maxPoints: 40, tag: "S4-LOCK-01" }]);
        setCompletedPermits((c) => new Set([...c, "P-140"]));
      }
      setShowFeedback("Permit P-140 was used for cargo clearance at 14:30. Once utilised, it cannot be amended, cancelled or refunded.");
      return;
    }

    // T-038: Amend for vessel delay
    if (permit.id === "T-038") {
      if (selectedAction === "AMEND") {
        setScores((s) => [...s, { permit: "T-038", points: 80, maxPoints: 80 }]);
        setCompletedPermits((c) => new Set([...c, "T-038"]));
        setActionLog((l) => [...l, `${now} \u2014 T-038: Amendment submitted (new vessel/voyage details).`]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
      if (selectedAction === "CANCEL") {
        setShowFeedback("Cancellation is not appropriate here. The shipment is still valid \u2014 only the vessel has changed. Amend the permit with new vessel details.");
        setErrors((e) => [...e, { tag: "S4-CANCEL-VESSEL", message: "Tried to cancel instead of amend for vessel delay." }]);
        return;
      }
      if (selectedAction === "REFUND") {
        setShowFeedback("No duty/GST was paid for this transhipment. Refund is not applicable.");
        setErrors((e) => [...e, { tag: "S4-REFUND-TSHIP", message: "Attempted refund on non-dutiable transhipment." }]);
        return;
      }
      if (selectedAction === "MONITOR") {
        setShowFeedback("The vessel delay requires action. If you don't update the permit, the goods can't be loaded onto the new vessel.");
        setErrors((e) => [...e, { tag: "S4-MONITOR-DELAY", message: "Chose monitor when amendment needed for vessel delay." }]);
        return;
      }
    }

    // P-555: Cancel before window
    if (permit.id === "P-555") {
      if (p555Expired) {
        setShowFeedback("GF same-day window expired. Cancellation no longer available.");
        return;
      }
      if (selectedAction === "CANCEL") {
        setScores((s) => [...s, { permit: "P-555", points: 60, maxPoints: 60 }]);
        setCompletedPermits((c) => new Set([...c, "P-555"]));
        setActionLog((l) => [...l, `${now} \u2014 P-555: Cancelled within GF window.`]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
      if (selectedAction === "AMEND") {
        setShowFeedback("The shipment has been cancelled by the supplier. Amendment won't help \u2014 you need to cancel the permit entirely.");
        setErrors((e) => [...e, { tag: "S4-AMEND-CANCEL", message: "Tried to amend a cancelled shipment." }]);
        return;
      }
    }

    // R-200: Monitor only
    if (permit.id === "R-200") {
      if (selectedAction === "MONITOR") {
        setScores((s) => [...s, { permit: "R-200", points: 30, maxPoints: 30 }]);
        setCompletedPermits((c) => new Set([...c, "R-200"]));
        setActionLog((l) => [...l, `${now} \u2014 R-200: Monitoring. No action taken.`]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
      setShowFeedback("Permit R-200 is still awaiting CA approval. Premature action could disrupt the approval workflow.");
      setErrors((e) => [...e, { tag: "S4-OVERACTION", message: "Acted on AWAITING-CA permit." }]);
      setScores((s) => [...s, { permit: "R-200", points: 0, maxPoints: 30, tag: "S4-OVERACTION" }]);
      setCompletedPermits((c) => new Set([...c, "R-200"]));
      return;
    }
  }, [selectedPermit, selectedAction, simTime, p555Expired, p140Attempts]);

  useEffect(() => {
    if (completedPermits.size >= 4 && !beatComplete) {
      setBeatComplete(true);
      setPhase("results");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [completedPermits, beatComplete]);

  const totalScore = scores.reduce((a, s) => a + s.points, 0);
  const totalMax = 210;

  const p555MinLeft = Math.floor(p555TimeLeft / 60);
  const timeColor = p555MinLeft < 5 ? "text-customs-red" : p555MinLeft < 10 ? "text-customs-amber" : "text-customs-green";
  const p555Pct = Math.min(100, (p555TimeLeft / (P555_DEADLINE_SECONDS - SIM_START_SECONDS)) * 100);

  // Briefing
  if (phase === "briefing") {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">BEAT C &mdash; DISPATCHER (CASE #038)</h1>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center">
          <div className="max-w-lg w-full animate-fade-in">
            <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-5 sm:p-8 space-y-5">
              <div className="text-center space-y-2">
                <div className="text-3xl">&#128225;</div>
                <h2 className="text-customs-gold text-xl font-bold">Dispatcher Briefing</h2>
                <p className="text-customs-muted text-sm">Your shift starts at <span className="text-white font-mono">10:15:00</span>. Time runs at <span className="text-customs-amber font-bold">10x</span> real speed.</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Your mission</p>
                  <p className="text-customs-muted">Triage <span className="text-white font-bold">4 active permits</span> on the board. For each, decide: <span className="text-customs-gold">Amend</span>, <span className="text-customs-gold">Cancel</span>, <span className="text-customs-gold">Refund</span>, or <span className="text-customs-gold">Monitor</span>.</p>
                </div>

                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Key intel</p>
                  <ul className="text-customs-muted space-y-1.5 list-none">
                    <li>&#9888;&#65039; A <span className="text-customs-amber font-medium">vessel delay</span> affects the Samsung transhipment</li>
                    <li>&#9203; One permit has a <span className="text-customs-red font-medium">same-day window</span> closing</li>
                    <li>&#128274; Some permits may be locked due to utilisation</li>
                    <li>&#128209; An approval from a Competent Authority is still pending</li>
                  </ul>
                </div>

                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Scoring</p>
                  <p className="text-customs-muted"><span className="text-customs-gold font-bold">210 points</span> max. Points for correct action and timing.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setScaffolding(1); setPhase("playing"); }} className="flex-1 bg-customs-gold text-customs-dark font-bold py-3 rounded-lg hover:bg-customs-gold/90 transition-colors cursor-pointer text-sm">START (Guided)</button>
                <button onClick={() => { setScaffolding(2); setPhase("playing"); }} className="flex-1 bg-customs-surface border border-customs-border text-customs-muted font-bold py-3 rounded-lg hover:text-white hover:border-customs-muted transition-colors cursor-pointer text-sm">START (Open)</button>
              </div>
              <p className="text-[10px] text-customs-muted text-center">Guided mode shows hints; Open mode is unassisted.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results
  if (phase === "results") {
    const pct = Math.round((totalScore / totalMax) * 100);
    const grade = pct >= 90 ? "EXCELLENT" : pct >= 70 ? "GOOD" : pct >= 50 ? "FAIR" : "NEEDS WORK";
    const gradeColor = pct >= 90 ? "text-customs-green" : pct >= 70 ? "text-customs-gold" : pct >= 50 ? "text-customs-amber" : "text-customs-red";

    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">DISPATCHER BOARD &mdash; RESULTS</h1>
        </header>
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-4 sm:p-6 animate-fade-in text-center">
              <div className={`text-4xl font-bold ${gradeColor} mb-1`}>{grade}</div>
              <div className="text-customs-gold text-2xl font-bold mb-1">{totalScore} / {totalMax}</div>
              <div className="w-full bg-customs-surface rounded-full h-3 mb-4">
                <div className={`h-3 rounded-full transition-all ${pct >= 70 ? "bg-customs-green" : pct >= 50 ? "bg-customs-amber" : "bg-customs-red"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6 animate-fade-in">
              <h3 className="text-white font-bold text-sm mb-3">Permit Breakdown</h3>
              <div className="space-y-3">
                {PERMITS.map((permit) => {
                  const scoreEntry = scores.find((s) => s.permit === permit.id);
                  const pts = scoreEntry?.points ?? 0;
                  const max = scoreEntry?.maxPoints ?? (permit.id === "T-038" ? 80 : permit.id === "P-555" ? 60 : permit.id === "P-140" ? 40 : 30);
                  const perfect = pts === max;
                  const zero = pts === 0;

                  return (
                    <div key={permit.id} className={`rounded-lg border p-3 ${perfect ? "bg-customs-green/5 border-customs-green/20" : zero ? "bg-customs-red/5 border-customs-red/20" : "bg-customs-amber/5 border-customs-amber/20"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{permit.id}</span>
                          <span className="text-customs-muted text-xs">{permit.title}</span>
                        </div>
                        <span className={`font-bold text-sm ${perfect ? "text-customs-green" : zero ? "text-customs-red" : "text-customs-amber"}`}>{pts}/{max}</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-start gap-1.5">
                          <span className="text-customs-green mt-0.5 flex-shrink-0">&#10003;</span>
                          <span className="text-customs-muted">Correct: <span className="text-white">{permit.correctLabel}</span></span>
                        </div>
                        <p className="text-customs-muted pl-5">{permit.explanation}</p>
                        {scoreEntry?.tag && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-customs-red mt-0.5 flex-shrink-0">&#10007;</span>
                            <span className="text-customs-red font-mono text-[10px]">{scoreEntry.tag}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {errors.length > 0 && (
              <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6">
                <h3 className="text-customs-amber font-bold text-sm mb-3">Error Ledger ({errors.length})</h3>
                <div className="space-y-2">
                  {errors.map((e, i) => (
                    <div key={i} className="text-xs p-2 bg-customs-surface rounded border border-customs-border">
                      <span className="text-customs-amber font-mono">{e.tag}</span>
                      <p className="text-customs-muted mt-0.5">{e.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-customs-navy border border-customs-border rounded-xl p-4 sm:p-6">
              <h3 className="text-customs-gold font-bold text-sm mb-3">Session Log</h3>
              <div className="space-y-1 font-mono text-[10px] text-customs-muted">
                {actionLog.map((l, i) => (<p key={i}>&gt; {l}</p>))}
              </div>
            </div>

            <Link to="/" className="block bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg no-underline hover:bg-customs-gold/90 transition-colors text-center">RETURN</Link>
          </div>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">DISPATCHER BOARD</h1>
          <ProgressDots completed={completedPermits.size} total={4} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`font-mono font-bold text-sm sm:text-lg px-2 py-0.5 rounded ${timeColor} ${p555MinLeft < 5 ? "animate-pulse-glow bg-customs-red/10" : ""}`}>{formatSimTime(simTime)}</div>
          <button onClick={() => setShowRulebook(!showRulebook)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-gold hover:bg-customs-panel cursor-pointer">Rules</button>
          <button onClick={() => setScaffolding((s) => (s === 1 ? 2 : 1) as 1 | 2)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer">{scaffolding === 1 ? "Guided" : "Open"}</button>
          <span className="text-xs text-customs-muted font-mono">{totalScore}/{totalMax}</span>
        </div>
      </header>

      {/* Vessel delay alert */}
      <div className="bg-customs-amber/10 border-b border-customs-amber/30 px-3 sm:px-6 py-2 text-xs text-customs-amber flex-shrink-0 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-customs-amber animate-pulse flex-shrink-0" />
        <div><strong>VESSEL DELAY ALERT</strong> &mdash; T-038: MV Java Express delayed. Onward vessel schedule changed. Permit requires update.</div>
      </div>

      {/* P-555 deadline bar */}
      {!completedPermits.has("P-555") && !p555Expired && (
        <div className="bg-customs-dark border-b border-customs-border px-3 sm:px-6 py-1.5 flex-shrink-0">
          <div className="flex items-center justify-between text-[10px] mb-0.5">
            <span className={`font-medium ${p555MinLeft < 5 ? "text-customs-red" : "text-customs-amber"}`}>P-555 GF Window</span>
            <span className={`font-mono font-bold ${p555MinLeft < 5 ? "text-customs-red animate-pulse" : "text-customs-amber"}`}>{Math.floor(p555TimeLeft / 60)}m {p555TimeLeft % 60}s remaining</span>
          </div>
          <div className="w-full bg-customs-surface rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all duration-1000 ${p555MinLeft < 5 ? "bg-customs-red" : p555MinLeft < 10 ? "bg-customs-amber" : "bg-customs-green"}`} style={{ width: `${p555Pct}%` }} />
          </div>
        </div>
      )}
      {p555Expired && !completedPermits.has("P-555") && (
        <div className="bg-customs-red/10 border-b border-customs-red/30 px-3 sm:px-6 py-1.5 flex-shrink-0 text-[10px] text-customs-red font-bold text-center">P-555 GF WINDOW EXPIRED</div>
      )}

      {/* Permit cards + decision panel */}
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {PERMITS.map((p) => {
            const completed = completedPermits.has(p.id);
            const isSelected = selectedPermit === p.id;
            const expired = p.id === "P-555" && p555Expired;
            const scoreEntry = completed ? scores.find((s) => s.permit === p.id) : null;

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!completed) {
                    setSelectedPermit(p.id);
                    setSelectedAction(null);
                    setShowFeedback(null);
                  }
                }}
                className={`bg-customs-panel border rounded-xl p-3 transition-all ${
                  completed ? "border-customs-green/30 opacity-60 cursor-default"
                    : isSelected ? "border-customs-gold animate-pulse-glow cursor-pointer"
                      : expired ? "border-customs-red/50 cursor-pointer"
                        : "border-customs-border hover:border-customs-muted cursor-pointer"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{p.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    p.state === "UTILISED" ? "bg-customs-red/20 text-customs-red" :
                    p.state === "APPROVED" ? "bg-customs-green/20 text-customs-green" :
                    "bg-customs-amber/20 text-customs-amber"
                  }`}>{formatStateLabel(p.state)}</span>
                </div>
                <p className="text-xs text-customs-muted mb-1">{p.title}</p>
                <p className="text-[10px] text-customs-muted/70 mb-2 truncate">{p.goods}</p>

                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-customs-muted">Type</span>
                    <span className="text-white font-medium">{p.messageType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-customs-muted">Decl.</span>
                    <span className="text-white">{p.declarationType}</span>
                  </div>
                  {p.utilisedAt && (
                    <div className="flex justify-between">
                      <span className="text-customs-muted">Used at</span>
                      <span className="text-customs-red">{p.utilisedAt}</span>
                    </div>
                  )}
                  {p.id === "P-555" && !expired && !completed && (
                    <div className="flex justify-between">
                      <span className="text-customs-muted">Window</span>
                      <span className={`font-mono font-bold ${p555MinLeft < 5 ? "text-customs-red animate-pulse" : timeColor}`}>{Math.floor(p555TimeLeft / 60)}m {p555TimeLeft % 60}s</span>
                    </div>
                  )}
                  {expired && p.id === "P-555" && !completed && (
                    <div className="text-customs-red text-center font-bold py-0.5">WINDOW EXPIRED</div>
                  )}
                </div>

                {completed ? (
                  <div className={`mt-2 text-center text-[10px] font-bold px-2 py-1 rounded ${
                    scoreEntry && scoreEntry.points === scoreEntry.maxPoints ? "bg-customs-green/10 text-customs-green" :
                    scoreEntry && scoreEntry.points > 0 ? "bg-customs-amber/10 text-customs-amber" :
                    "bg-customs-red/10 text-customs-red"
                  }`}>RESOLVED {scoreEntry ? `(${scoreEntry.points}/${scoreEntry.maxPoints})` : ""}</div>
                ) : (
                  <>
                    {p.badge && (
                      <div className={`mt-2 text-center text-[10px] font-bold px-2 py-1 rounded ${
                        p.badge === "VESSEL DELAY" ? "bg-customs-amber/20 text-customs-amber" : "bg-customs-red/20 text-customs-red"
                      }`}>{p.badge}</div>
                    )}
                    {p.actionsLocked && (
                      <div className="mt-2 text-center text-[10px] text-customs-muted bg-customs-surface rounded py-1">&#128274; Actions locked (utilised)</div>
                    )}
                    {p.state === "AWAITING_CA_APPROVAL" && scaffolding === 1 && (
                      <div className="mt-2 text-center text-[10px] text-customs-amber bg-customs-amber/5 rounded py-1">Pending external approval</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Decision panel */}
        {selectedPermit && !completedPermits.has(selectedPermit) && (
          <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-4 sm:p-6 max-w-2xl mx-auto animate-fade-in">
            {(() => {
              const permit = PERMITS.find((p) => p.id === selectedPermit)!;
              return (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-bold text-base">{selectedPermit}: {permit.title}</h3>
                      <p className="text-xs text-customs-muted mt-0.5">{permit.goods}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded font-bold flex-shrink-0 ${
                      permit.state === "UTILISED" ? "bg-customs-red/20 text-customs-red" :
                      permit.state === "APPROVED" ? "bg-customs-green/20 text-customs-green" :
                      "bg-customs-amber/20 text-customs-amber"
                    }`}>{formatStateLabel(permit.state)}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-customs-surface rounded-lg p-3">
                    <div><span className="text-customs-muted block">Message type</span><p className="text-white font-medium">{permit.messageType}</p></div>
                    <div><span className="text-customs-muted block">Decl. type</span><p className="text-white font-medium">{permit.declarationType}</p></div>
                    <div><span className="text-customs-muted block">Permit state</span><p className="text-white font-medium">{formatStateLabel(permit.state)}</p></div>
                    <div><span className="text-customs-muted block">Dutiable?</span><p className="text-customs-green font-bold">NO</p></div>
                    {permit.utilisedAt && (
                      <div><span className="text-customs-muted block">Utilised at</span><p className="text-customs-red font-medium">{permit.utilisedAt}</p></div>
                    )}
                  </div>

                  {scaffolding === 1 && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> {permit.hint}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-customs-gold uppercase tracking-wider mb-2 font-medium">Select Action</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["AMEND", "CANCEL", "REFUND", "MONITOR"] as ActionType[]).map((action) => {
                        const descriptions: Record<ActionType, string> = {
                          AMEND: "Update permit details",
                          CANCEL: "Void the permit",
                          REFUND: "Recover duty/GST paid",
                          MONITOR: "No action needed",
                        };
                        return (
                          <button
                            key={action}
                            onClick={() => { setSelectedAction(action); setShowFeedback(null); }}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer text-left ${
                              selectedAction === action
                                ? "border-customs-gold bg-customs-gold/10 text-customs-gold"
                                : "border-customs-border text-customs-muted hover:border-customs-muted hover:text-white"
                            }`}
                          >
                            <span className="block font-bold">{action}</span>
                            <span className="block text-[10px] opacity-70 mt-0.5">{descriptions[action]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {showFeedback && (
                    <div className="text-xs bg-customs-amber/10 border border-customs-amber/20 rounded-lg p-3 text-customs-amber animate-fade-in">
                      {showFeedback}
                    </div>
                  )}

                  <button
                    onClick={handleConfirm}
                    disabled={!selectedAction}
                    className="w-full bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-customs-gold/90 transition-colors cursor-pointer"
                  >
                    CONFIRM ACTION
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Action log */}
        <div className="mt-4 bg-customs-navy border border-customs-border rounded-xl p-3 max-w-2xl mx-auto">
          <h3 className="text-customs-gold font-bold text-xs mb-2">Session Log</h3>
          <div className="space-y-0.5 font-mono text-[10px] text-customs-muted max-h-24 overflow-auto">
            {actionLog.map((l, i) => (<p key={i}>&gt; {l}</p>))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {showRulebook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/50" onClick={() => setShowRulebook(false)} />
          <div className="w-80 sm:w-96 bg-customs-navy border-l border-customs-border overflow-auto animate-slide-in p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-customs-gold font-bold">Rules</h3>
              <button onClick={() => setShowRulebook(false)} className="text-customs-muted hover:text-white cursor-pointer bg-transparent border-0 text-lg">&times;</button>
            </div>
            <div className="space-y-3 text-xs text-customs-muted">
              <div>
                <h4 className="text-white font-medium mb-1">Transhipment Permits</h4>
                <p>Can be amended when vessel schedules change. No duty/GST is payable, so refund never applies.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">GF Same-Day Window</h4>
                <p>GF payment + non-dutiable + not utilised + same day = eligible for cancellation/amendment within the window.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Utilised Permits</h4>
                <p>Once utilised for cargo clearance, a permit is locked. No amendment, cancellation, or refund is possible.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Awaiting CA Approval</h4>
                <p>Do not act prematurely on permits still awaiting Competent Authority approval.</p>
              </div>
              <div className="border-t border-customs-border pt-2 text-[10px]">Source: Singapore Customs, TradeNet Procedures (Mar 2026)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
