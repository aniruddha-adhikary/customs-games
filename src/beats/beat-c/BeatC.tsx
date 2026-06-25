import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";

type PermitState = "APPROVED" | "UTILISED" | "AWAITING_CA_APPROVAL";
type ActionType = "AMEND" | "CANCEL" | "REFUND" | "MONITOR";
type RefundSubtype = "FULL" | "PARTIAL_SPECIFIC" | "PARTIAL_GENERAL";
interface Permit {
  id: string;
  title: string;
  goods: string;
  messageType: string;
  state: PermitState;
  paymentCondition: string;
  dutiable: boolean;
  dutyPaid: boolean;
  approvedAt: string;
  utilisedAt: string | null;
  windowDeadline: string | null;
  hasWindow: boolean;
  shortShipment: boolean;
  correctAction: { lever: ActionType; refundSubtype?: RefundSubtype; needsDocument?: boolean };
  badge?: string;
  actionsLocked: boolean;
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
    id: "C014",
    title: "Bordeaux Wine IN",
    goods: "Red wine, 1,200 BOT",
    messageType: "IN",
    state: "UTILISED",
    paymentCondition: "G1",
    dutiable: true,
    dutyPaid: true,
    approvedAt: "20:50",
    utilisedAt: "21:10",
    windowDeadline: null,
    hasWindow: false,
    shortShipment: true,
    correctAction: { lever: "REFUND", refundSubtype: "PARTIAL_SPECIFIC", needsDocument: true },
    badge: "SHORT SHIPMENT",
    actionsLocked: false,
  },
  {
    id: "P-220",
    title: "Printer Parts IN",
    goods: "Printer spare parts (non-dutiable)",
    messageType: "IN",
    state: "APPROVED",
    paymentCondition: "GF",
    dutiable: false,
    dutyPaid: false,
    approvedAt: "23:30",
    utilisedAt: null,
    windowDeadline: "23:59:59",
    hasWindow: true,
    shortShipment: false,
    correctAction: { lever: "AMEND" },
    badge: "WINDOW CLOSING",
    actionsLocked: false,
  },
  {
    id: "P-118",
    title: "Apparel IN",
    goods: "Clothing, cleared",
    messageType: "IN",
    state: "UTILISED",
    paymentCondition: "G1",
    dutiable: false,
    dutyPaid: false,
    approvedAt: "14:00",
    utilisedAt: "15:22",
    windowDeadline: null,
    hasWindow: false,
    shortShipment: false,
    correctAction: { lever: "MONITOR" },
    actionsLocked: true,
  },
  {
    id: "R-090",
    title: "Bonded Removal",
    goods: "Licensed warehouse goods",
    messageType: "REM",
    state: "AWAITING_CA_APPROVAL",
    paymentCondition: "G7",
    dutiable: false,
    dutyPaid: false,
    approvedAt: "—",
    utilisedAt: null,
    windowDeadline: null,
    hasWindow: false,
    shortShipment: false,
    correctAction: { lever: "MONITOR" },
    actionsLocked: false,
  },
];

const CORRECT_ACTION_EXPLANATIONS: Record<string, string> = {
  "C014": "Duty/GST was already paid under G1. With a short shipment of 100 bottles, the correct action is a Partial Refund (Specific) to recover overpaid SGD 2,187.08 for the missing quantity.",
  "P-220": "GF payment + non-dutiable + not utilised + same day = eligible for amendment before the 23:59:59 window closes.",
  "P-118": "Once utilised for cargo clearance (at 15:22), a permit is locked. No amendment, cancellation, or refund is possible. Monitor only.",
  "R-090": "Permit is still awaiting Competent Authority approval. Any premature action would disrupt the approval workflow. Monitor only.",
};

const CORRECT_ACTION_LABELS: Record<string, string> = {
  "C014": "Partial Refund (Specific)",
  "P-220": "Amend (within GF window)",
  "P-118": "Monitor (no action)",
  "R-090": "Monitor (no action)",
};

const SIM_SPEED = 10;
const SIM_START_SECONDS = 23 * 3600 + 41 * 60 + 7;
const P220_DEADLINE_SECONDS = 23 * 3600 + 59 * 60 + 59;

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
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i < completed ? "bg-customs-green" : "bg-customs-surface"
          }`}
        />
      ))}
      <span className="text-[10px] text-customs-muted ml-1">{completed}/{total}</span>
    </div>
  );
}

export function BeatC() {
  const [phase, setPhase] = useState<"briefing" | "playing" | "results">("briefing");
  const [simTime, setSimTime] = useState(SIM_START_SECONDS);
  const [scaffolding, setScaffolding] = useState<1 | 2>(1);
  const [selectedPermit, setSelectedPermit] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [refundSubtype, setRefundSubtype] = useState<RefundSubtype | null>(null);
  const [docAttached, setDocAttached] = useState(false);
  const [receivedQty, setReceivedQty] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [completedPermits, setCompletedPermits] = useState<Set<string>>(new Set());
  const [p220Expired, setP220Expired] = useState(false);
  const [p118Attempts, setP118Attempts] = useState(0);
  const [showRulebook, setShowRulebook] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([
    "21:10 — C014 devanned; short shipment 100 BOT (surveyor report attached)",
    "23:30 — P-220 approved (GF, non-dutiable, same-day window open)",
    "23:41 — Dispatcher shift start",
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
        if (next >= P220_DEADLINE_SECONDS && !p220Expired) {
          setP220Expired(true);
          if (!completedPermits.has("P-220")) {
            setErrors((e) => [...e, { tag: "S4-WINDOW-MISS", message: "Missed P-220's GF same-day window." }]);
            setScores((s) => [...s, { permit: "P-220", points: 0, maxPoints: 70, tag: "S4-WINDOW-MISS" }]);
            setCompletedPermits((c) => new Set([...c, "P-220"]));
            setActionLog((l) => [...l, `${formatSimTime(next)} — P-220 GF window EXPIRED. Amendment no longer available.`]);
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [p220Expired, completedPermits, phase]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [actionLog]);

  const p220TimeLeft = Math.max(0, P220_DEADLINE_SECONDS - simTime);

  const handleConfirm = useCallback(() => {
    if (!selectedPermit || !selectedAction) return;
    const permit = PERMITS.find((p) => p.id === selectedPermit)!;
    const now = formatSimTime(simTime);

    if (permit.id === "P-118") {
      setP118Attempts((a) => a + 1);
      if (p118Attempts >= 1) {
        setErrors((e) => [...e, { tag: "S4-LOCK-01", message: "Tried to act on UTILISED permit P-118." }]);
        setScores((s) => [...s, { permit: "P-118", points: 0, maxPoints: 40, tag: "S4-LOCK-01" }]);
        setCompletedPermits((c) => new Set([...c, "P-118"]));
      }
      setShowFeedback("Permit P-118 was used for cargo clearance at 15:22. Once utilised, it cannot be amended, cancelled or refunded.");
      return;
    }

    if (permit.id === "C014") {
      if (selectedAction === "CANCEL") {
        setShowFeedback("Cancellation not available — duty/GST already paid under G1. Use Refund.");
        setErrors((e) => [...e, { tag: "S4-CANCEL-VS-REFUND", message: "Chose cancel for paid C014 permit." }]);
        return;
      }
      if (selectedAction === "AMEND" && !refundSubtype) {
        setShowFeedback("Amendment updates the record, but does not recover overpaid duty/GST. You must also submit a Partial (Specific) Refund application.");
        return;
      }
      if (selectedAction === "REFUND") {
        if (refundSubtype === "FULL") {
          setShowFeedback("A full refund cancels the entire permit. Only 100 of 1,200 bottles are short — apply for Partial (Specific) Refund.");
          setErrors((e) => [...e, { tag: "S4-REFUND-TYPE", message: "Used Full refund for a short shipment." }]);
          return;
        }
        if (refundSubtype === "PARTIAL_GENERAL") {
          setShowFeedback("Partial (General) is for value corrections (freight, exchange rate). A specific quantity shortfall uses Partial (Specific).");
          setErrors((e) => [...e, { tag: "S4-REFUND-TYPE", message: "Used Partial General for a short shipment." }]);
          return;
        }
        if (refundSubtype === "PARTIAL_SPECIFIC") {
          let pts = 60 + 60;
          if (!docAttached) {
            setErrors((e) => [...e, { tag: "S4-REFUND-EVIDENCE", message: "Submitted refund without supporting document." }]);
            pts -= 20;
          } else {
            pts += 20;
          }
          const qty = parseInt(receivedQty);
          if (qty === 1100) {
            pts += 20;
          } else {
            setErrors((e) => [...e, { tag: "S4-QTY-DELTA", message: "Wrong received-quantity figure." }]);
          }
          setScores((s) => [...s, { permit: "C014", points: pts, maxPoints: 160 }]);
          setCompletedPermits((c) => new Set([...c, "C014"]));
          setActionLog((l) => [...l, `${now} — C014: Partial Refund (Specific) submitted. Delta 100 BOT.`]);
          setSelectedPermit(null);
          setSelectedAction(null);
          setShowFeedback(null);
          return;
        }
      }
    }

    if (permit.id === "P-220") {
      if (p220Expired) {
        setShowFeedback("GF same-day window expired at 23:59:59. Amendment no longer available.");
        return;
      }
      if (selectedAction === "AMEND") {
        setScores((s) => [...s, { permit: "P-220", points: 70, maxPoints: 70 }]);
        setCompletedPermits((c) => new Set([...c, "P-220"]));
        setActionLog((l) => [...l, `${now} — P-220: Amendment submitted within GF window.`]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
    }

    if (permit.id === "R-090") {
      if (selectedAction === "MONITOR") {
        setScores((s) => [...s, { permit: "R-090", points: 30, maxPoints: 30 }]);
        setCompletedPermits((c) => new Set([...c, "R-090"]));
        setActionLog((l) => [...l, `${now} — R-090: Monitoring. No action taken.`]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
      setShowFeedback("Permit R-090 is still awaiting CA approval. No clearance has occurred and no short-shipment event applies. Premature action could disrupt the approval workflow.");
      setErrors((e) => [...e, { tag: "S4-OVERACTION", message: "Acted on AWAITING-CA permit." }]);
      setScores((s) => [...s, { permit: "R-090", points: 0, maxPoints: 30, tag: "S4-OVERACTION" }]);
      setCompletedPermits((c) => new Set([...c, "R-090"]));
      return;
    }
  }, [selectedPermit, selectedAction, refundSubtype, docAttached, receivedQty, simTime, p220Expired, p118Attempts]);

  useEffect(() => {
    if (completedPermits.size >= 4 && !beatComplete) {
      setBeatComplete(true);
      setPhase("results");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [completedPermits, beatComplete]);

  const totalScore = scores.reduce((a, s) => a + s.points, 0);
  const totalMax = 300;

  const p220MinLeft = Math.floor(p220TimeLeft / 60);
  const timeColor = p220MinLeft < 5 ? "text-customs-red" : p220MinLeft < 10 ? "text-customs-amber" : "text-customs-green";
  const p220Pct = Math.min(100, (p220TimeLeft / (P220_DEADLINE_SECONDS - SIM_START_SECONDS)) * 100);

  // Briefing screen
  if (phase === "briefing") {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">BEAT C &mdash; DISPATCHER</h1>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center">
          <div className="max-w-lg w-full animate-fade-in">
            <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-5 sm:p-8 space-y-5">
              <div className="text-center space-y-2">
                <div className="text-3xl">&#128225;</div>
                <h2 className="text-customs-gold text-xl font-bold">Dispatcher Briefing</h2>
                <p className="text-customs-muted text-sm">Your shift starts at <span className="text-white font-mono">23:41:07</span>. Time runs at <span className="text-customs-amber font-bold">10x</span> real speed.</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Your mission</p>
                  <p className="text-customs-muted">Triage <span className="text-white font-bold">4 active permits</span> on the board. For each permit, decide the correct post-clearance action: <span className="text-customs-gold">Amend</span>, <span className="text-customs-gold">Cancel</span>, <span className="text-customs-gold">Refund</span>, or <span className="text-customs-gold">Monitor</span> (no action).</p>
                </div>

                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Key intel</p>
                  <ul className="text-customs-muted space-y-1.5 list-none">
                    <li>&#9888;&#65039; A <span className="text-customs-amber font-medium">short shipment</span> has been reported on Case #014</li>
                    <li>&#9203; One permit has a <span className="text-customs-red font-medium">same-day window</span> closing at midnight</li>
                    <li>&#128274; Some permits may be locked due to utilisation</li>
                    <li>&#128209; An approval from a Competent Authority is still pending</li>
                  </ul>
                </div>

                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Scoring</p>
                  <p className="text-customs-muted"><span className="text-customs-gold font-bold">300 points</span> max. Points awarded for correct action, timing, and supporting evidence.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setScaffolding(1); setPhase("playing"); }}
                  className="flex-1 bg-customs-gold text-customs-dark font-bold py-3 rounded-lg hover:bg-customs-gold/90 transition-colors cursor-pointer text-sm"
                >
                  START (Guided)
                </button>
                <button
                  onClick={() => { setScaffolding(2); setPhase("playing"); }}
                  className="flex-1 bg-customs-surface border border-customs-border text-customs-muted font-bold py-3 rounded-lg hover:text-white hover:border-customs-muted transition-colors cursor-pointer text-sm"
                >
                  START (Open)
                </button>
              </div>
              <p className="text-[10px] text-customs-muted text-center">Guided mode shows hints; Open mode is unassisted.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
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
            {/* Score summary */}
            <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-4 sm:p-6 animate-fade-in text-center">
              <div className={`text-4xl font-bold ${gradeColor} mb-1`}>{grade}</div>
              <div className="text-customs-gold text-2xl font-bold mb-1">
                {totalScore} / {totalMax}
              </div>
              <div className="w-full bg-customs-surface rounded-full h-3 mb-4">
                <div
                  className={`h-3 rounded-full transition-all ${pct >= 70 ? "bg-customs-green" : pct >= 50 ? "bg-customs-amber" : "bg-customs-red"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Per-permit breakdown */}
            <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6 animate-fade-in">
              <h3 className="text-white font-bold text-sm mb-3">Permit Breakdown</h3>
              <div className="space-y-3">
                {PERMITS.map((permit) => {
                  const scoreEntry = scores.find((s) => s.permit === permit.id);
                  const pts = scoreEntry?.points ?? 0;
                  const max = scoreEntry?.maxPoints ?? (permit.id === "C014" ? 160 : permit.id === "P-220" ? 70 : permit.id === "P-118" ? 40 : 30);
                  const perfect = pts === max;
                  const zero = pts === 0;

                  return (
                    <div key={permit.id} className={`rounded-lg border p-3 ${perfect ? "bg-customs-green/5 border-customs-green/20" : zero ? "bg-customs-red/5 border-customs-red/20" : "bg-customs-amber/5 border-customs-amber/20"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{permit.id}</span>
                          <span className="text-customs-muted text-xs">{permit.title}</span>
                        </div>
                        <span className={`font-bold text-sm ${perfect ? "text-customs-green" : zero ? "text-customs-red" : "text-customs-amber"}`}>
                          {pts}/{max}
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-start gap-1.5">
                          <span className="text-customs-green mt-0.5 flex-shrink-0">&#10003;</span>
                          <span className="text-customs-muted">Correct: <span className="text-white">{CORRECT_ACTION_LABELS[permit.id]}</span></span>
                        </div>
                        <p className="text-customs-muted pl-5">{CORRECT_ACTION_EXPLANATIONS[permit.id]}</p>
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

            {/* Error ledger */}
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

            {/* Action log replay */}
            <div className="bg-customs-navy border border-customs-border rounded-xl p-4 sm:p-6">
              <h3 className="text-customs-gold font-bold text-sm mb-3">Session Log</h3>
              <div className="space-y-1 font-mono text-[10px] text-customs-muted">
                {actionLog.map((l, i) => (
                  <p key={i}>&gt; {l}</p>
                ))}
              </div>
            </div>

            <Link to="/" className="block bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg no-underline hover:bg-customs-gold/90 transition-colors text-center">
              RETURN
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">DISPATCHER BOARD</h1>
          <ProgressDots completed={completedPermits.size} total={4} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`font-mono font-bold text-sm sm:text-lg px-2 py-0.5 rounded ${timeColor} ${p220MinLeft < 5 ? "animate-pulse-glow bg-customs-red/10" : ""}`}>
            {formatSimTime(simTime)}
          </div>
          <button onClick={() => setShowRulebook(!showRulebook)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-gold hover:bg-customs-panel cursor-pointer">Rules</button>
          <button onClick={() => setScaffolding((s) => (s === 1 ? 2 : 1) as 1 | 2)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer">
            {scaffolding === 1 ? "Guided" : "Open"}
          </button>
          <span className="text-xs text-customs-muted font-mono">{totalScore}/{totalMax}</span>
        </div>
      </header>

      {/* Short shipment alert */}
      <div className="bg-customs-amber/10 border-b border-customs-amber/30 px-3 sm:px-6 py-2 text-xs text-customs-amber flex-shrink-0 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-customs-amber animate-pulse flex-shrink-0" />
        <div>
          <strong>SHORT-SHIPMENT ALERT</strong> &mdash; Case #014: 1,100 of 1,200 bottles received. Overpaid <span className="text-white font-bold">SGD 2,187.08</span>. Surveyor report attached.
        </div>
      </div>

      {/* P-220 deadline bar */}
      {!completedPermits.has("P-220") && !p220Expired && (
        <div className="bg-customs-dark border-b border-customs-border px-3 sm:px-6 py-1.5 flex-shrink-0">
          <div className="flex items-center justify-between text-[10px] mb-0.5">
            <span className={`font-medium ${p220MinLeft < 5 ? "text-customs-red" : "text-customs-amber"}`}>
              P-220 GF Window
            </span>
            <span className={`font-mono font-bold ${p220MinLeft < 5 ? "text-customs-red animate-pulse" : "text-customs-amber"}`}>
              {Math.floor(p220TimeLeft / 60)}m {p220TimeLeft % 60}s remaining
            </span>
          </div>
          <div className="w-full bg-customs-surface rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-1000 ${p220MinLeft < 5 ? "bg-customs-red" : p220MinLeft < 10 ? "bg-customs-amber" : "bg-customs-green"}`}
              style={{ width: `${p220Pct}%` }}
            />
          </div>
        </div>
      )}
      {p220Expired && !completedPermits.has("P-220") && (
        <div className="bg-customs-red/10 border-b border-customs-red/30 px-3 sm:px-6 py-1.5 flex-shrink-0 text-[10px] text-customs-red font-bold text-center">
          P-220 GF WINDOW EXPIRED
        </div>
      )}

      {/* Permit cards + decision panel */}
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {PERMITS.map((p) => {
            const completed = completedPermits.has(p.id);
            const isSelected = selectedPermit === p.id;
            const expired = p.id === "P-220" && p220Expired;
            const scoreEntry = completed ? scores.find((s) => s.permit === p.id) : null;

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!completed) {
                    setSelectedPermit(p.id);
                    setSelectedAction(null);
                    setRefundSubtype(null);
                    setDocAttached(false);
                    setReceivedQty("");
                    setReasonText("");
                    setShowFeedback(null);
                  }
                }}
                className={`bg-customs-panel border rounded-xl p-3 transition-all ${
                  completed
                    ? "border-customs-green/30 opacity-60 cursor-default"
                    : isSelected
                      ? "border-customs-gold animate-pulse-glow cursor-pointer"
                      : expired
                        ? "border-customs-red/50 cursor-pointer"
                        : "border-customs-border hover:border-customs-muted cursor-pointer"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{p.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    p.state === "UTILISED" ? "bg-customs-red/20 text-customs-red" :
                    p.state === "APPROVED" ? "bg-customs-green/20 text-customs-green" :
                    "bg-customs-amber/20 text-customs-amber"
                  }`}>
                    {formatStateLabel(p.state)}
                  </span>
                </div>
                <p className="text-xs text-customs-muted mb-1">{p.title}</p>
                <p className="text-[10px] text-customs-muted/70 mb-2 truncate">{p.goods}</p>

                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-customs-muted">Payment</span>
                    <span className="text-white font-medium">{p.paymentCondition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-customs-muted">Type</span>
                    <span className="text-white">{p.messageType}</span>
                  </div>
                  {p.dutiable && (
                    <div className="flex justify-between">
                      <span className="text-customs-muted">Duty/GST</span>
                      <span className="text-customs-amber font-bold">PAID</span>
                    </div>
                  )}
                  {p.utilisedAt && (
                    <div className="flex justify-between">
                      <span className="text-customs-muted">Used at</span>
                      <span className="text-customs-red">{p.utilisedAt}</span>
                    </div>
                  )}
                  {p.hasWindow && !expired && !completed && (
                    <div className="flex justify-between">
                      <span className="text-customs-muted">Window</span>
                      <span className={`font-mono font-bold ${p220MinLeft < 5 ? "text-customs-red animate-pulse" : timeColor}`}>
                        {Math.floor(p220TimeLeft / 60)}m {p220TimeLeft % 60}s
                      </span>
                    </div>
                  )}
                  {expired && p.id === "P-220" && !completed && (
                    <div className="text-customs-red text-center font-bold py-0.5">WINDOW EXPIRED</div>
                  )}
                </div>

                {/* Badge / status footer */}
                {completed ? (
                  <div className={`mt-2 text-center text-[10px] font-bold px-2 py-1 rounded ${
                    scoreEntry && scoreEntry.points === scoreEntry.maxPoints
                      ? "bg-customs-green/10 text-customs-green"
                      : scoreEntry && scoreEntry.points > 0
                        ? "bg-customs-amber/10 text-customs-amber"
                        : "bg-customs-red/10 text-customs-red"
                  }`}>
                    RESOLVED {scoreEntry ? `(${scoreEntry.points}/${scoreEntry.maxPoints})` : ""}
                  </div>
                ) : (
                  <>
                    {p.badge && (
                      <div className={`mt-2 text-center text-[10px] font-bold px-2 py-1 rounded ${
                        p.badge === "SHORT SHIPMENT" ? "bg-customs-amber/20 text-customs-amber" :
                        "bg-customs-red/20 text-customs-red"
                      }`}>
                        {p.badge}
                      </div>
                    )}
                    {p.actionsLocked && (
                      <div className="mt-2 text-center text-[10px] text-customs-muted bg-customs-surface rounded py-1">
                        &#128274; Actions locked (utilised)
                      </div>
                    )}
                    {p.state === "AWAITING_CA_APPROVAL" && scaffolding === 1 && (
                      <div className="mt-2 text-center text-[10px] text-customs-amber bg-customs-amber/5 rounded py-1">
                        Pending external approval
                      </div>
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
                  {/* Header with permit context */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-bold text-base">
                        {selectedPermit}: {permit.title}
                      </h3>
                      <p className="text-xs text-customs-muted mt-0.5">{permit.goods}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded font-bold flex-shrink-0 ${
                      permit.state === "UTILISED" ? "bg-customs-red/20 text-customs-red" :
                      permit.state === "APPROVED" ? "bg-customs-green/20 text-customs-green" :
                      "bg-customs-amber/20 text-customs-amber"
                    }`}>
                      {formatStateLabel(permit.state)}
                    </span>
                  </div>

                  {/* Key facts grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-customs-surface rounded-lg p-3">
                    <div>
                      <span className="text-customs-muted block">Payment</span>
                      <p className="text-white font-medium">{permit.paymentCondition}</p>
                    </div>
                    <div>
                      <span className="text-customs-muted block">Permit state</span>
                      <p className="text-white font-medium">{formatStateLabel(permit.state)}</p>
                    </div>
                    <div>
                      <span className="text-customs-muted block">Message type</span>
                      <p className="text-white font-medium">{permit.messageType}</p>
                    </div>
                    {permit.dutiable && (
                      <div>
                        <span className="text-customs-muted block">Duty/GST paid?</span>
                        <p className="text-customs-amber font-bold">YES</p>
                      </div>
                    )}
                    {permit.utilisedAt && (
                      <div>
                        <span className="text-customs-muted block">Utilised at</span>
                        <p className="text-customs-red font-medium">{permit.utilisedAt}</p>
                      </div>
                    )}
                    {permit.hasWindow && (
                      <div>
                        <span className="text-customs-muted block">Window deadline</span>
                        <p className={`font-mono font-bold ${p220Expired ? "text-customs-red" : timeColor}`}>
                          {p220Expired ? "EXPIRED" : `${Math.floor(p220TimeLeft / 60)}m ${p220TimeLeft % 60}s`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* C014 short-shipment context */}
                  {permit.shortShipment && (
                    <div className="text-xs bg-customs-amber/10 border border-customs-amber/20 rounded-lg p-3">
                      <p className="text-customs-amber font-medium mb-1">Short Shipment Details</p>
                      <div className="grid grid-cols-2 gap-1 text-customs-muted">
                        <span>Declared: <span className="text-white">1,200 BOT</span></span>
                        <span>Received: <span className="text-white">1,100 BOT</span></span>
                        <span>Shortfall: <span className="text-customs-red font-bold">100 BOT</span></span>
                        <span>Overpaid: <span className="text-customs-red font-bold">SGD 2,187.08</span></span>
                      </div>
                    </div>
                  )}

                  {/* Guided hints */}
                  {scaffolding === 1 && permit.id === "C014" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> G1 = duty/GST collected at approval. Because it&apos;s already paid, recovery is via Refund, not Cancellation.
                    </div>
                  )}
                  {scaffolding === 1 && permit.id === "P-220" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> GF same-day window conditions: GF payment + non-dutiable + not utilised + same day. All four are met.
                    </div>
                  )}
                  {scaffolding === 1 && permit.id === "P-118" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> This permit was utilised for cargo clearance at 15:22. Once utilised, no modifications are possible.
                    </div>
                  )}
                  {scaffolding === 1 && permit.id === "R-090" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> This permit is awaiting Competent Authority approval. Acting prematurely could disrupt the workflow.
                    </div>
                  )}

                  {/* Action selector */}
                  <div>
                    <p className="text-xs text-customs-gold uppercase tracking-wider mb-2 font-medium">Select Action</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["AMEND", "CANCEL", "REFUND", "MONITOR"] as ActionType[]).map((action) => {
                        const descriptions: Record<ActionType, string> = {
                          AMEND: "Correct permit details",
                          CANCEL: "Void the permit",
                          REFUND: "Recover duty/GST paid",
                          MONITOR: "No action needed",
                        };
                        return (
                          <button
                            key={action}
                            onClick={() => {
                              setSelectedAction(action);
                              setRefundSubtype(null);
                              setShowFeedback(null);
                            }}
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

                  {/* Refund sub-type */}
                  {selectedAction === "REFUND" && (
                    <div className="animate-fade-in">
                      <p className="text-xs text-customs-gold uppercase tracking-wider mb-2 font-medium">Refund Sub-type</p>
                      <div className="space-y-1.5">
                        {([
                          { value: "FULL" as RefundSubtype, label: "Full Refund", desc: scaffolding === 1 ? "Entire duty/GST returned — for a whole-consignment cancellation." : undefined },
                          { value: "PARTIAL_SPECIFIC" as RefundSubtype, label: "Partial (Specific)", desc: scaffolding === 1 ? "Duty/GST returned for a specific, identified shortfall — e.g. short shipment." : undefined },
                          { value: "PARTIAL_GENERAL" as RefundSubtype, label: "Partial (General)", desc: scaffolding === 1 ? "Correction for value errors, e.g. wrong freight or exchange rate." : undefined },
                        ]).map((opt) => (
                          <label key={opt.value} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${refundSubtype === opt.value ? "border-customs-gold bg-customs-gold/10" : "border-customs-border hover:border-customs-muted"}`}>
                            <input type="radio" name="refundSubtype" value={opt.value} checked={refundSubtype === opt.value} onChange={() => { setRefundSubtype(opt.value); setShowFeedback(null); }} className="mt-0.5 accent-[#c8a94e]" />
                            <div>
                              <span className="text-white font-medium">{opt.label}</span>
                              {opt.desc && <p className="text-customs-muted mt-0.5">{opt.desc}</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* C014 refund fields */}
                  {selectedAction === "REFUND" && refundSubtype === "PARTIAL_SPECIFIC" && permit.id === "C014" && (
                    <div className="animate-fade-in space-y-3 bg-customs-surface rounded-lg p-3">
                      <p className="text-xs text-customs-gold font-medium">Refund Application Details</p>
                      <div>
                        <label className="block text-xs text-customs-muted mb-1">Received Quantity (BOT)</label>
                        <input
                          type="number"
                          value={receivedQty}
                          onChange={(e) => setReceivedQty(e.target.value)}
                          placeholder="How many bottles were actually received?"
                          className="w-full bg-customs-dark border border-customs-border rounded-lg px-3 py-2 text-sm text-white placeholder-customs-muted/50 focus:outline-none focus:border-customs-gold transition-colors"
                        />
                        {scaffolding === 1 && (
                          <p className="text-[10px] text-customs-muted mt-1">The surveyor confirmed 1,100 of 1,200 bottles received.</p>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-xs text-customs-muted cursor-pointer p-2 bg-customs-dark rounded-lg border border-customs-border">
                        <input type="checkbox" checked={docAttached} onChange={(e) => setDocAttached(e.target.checked)} className="accent-[#c8a94e]" />
                        <div>
                          <span className="text-white">Attach surveyor&apos;s report</span>
                          <span className="block text-[10px]">Supporting document for refund claim</span>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Reason */}
                  {selectedAction && selectedAction !== "MONITOR" && (
                    <div>
                      <label className="block text-xs text-customs-muted mb-1">Reason (optional)</label>
                      <textarea
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        placeholder="Brief reason for this action..."
                        rows={2}
                        className="w-full bg-customs-surface border border-customs-border rounded-lg px-3 py-2 text-sm text-white placeholder-customs-muted/50 focus:outline-none focus:border-customs-gold resize-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Feedback */}
                  {showFeedback && (
                    <div className="bg-customs-red/10 border border-customs-red/30 rounded-lg p-3 text-xs animate-fade-in flex items-start gap-2">
                      <span className="text-customs-red flex-shrink-0 mt-0.5 text-sm">&#9888;</span>
                      <span className="text-customs-red">{showFeedback}</span>
                    </div>
                  )}

                  {/* Confirm / Back buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleConfirm}
                      disabled={!selectedAction}
                      className="flex-1 bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-customs-gold/90 transition-colors cursor-pointer text-sm"
                    >
                      {selectedAction ? `CONFIRM ${selectedAction}` : "SELECT AN ACTION"}
                    </button>
                    <button
                      onClick={() => { setSelectedPermit(null); setSelectedAction(null); setShowFeedback(null); }}
                      className="px-4 py-2.5 border border-customs-border rounded-lg text-customs-muted hover:text-white text-sm cursor-pointer bg-transparent transition-colors"
                    >
                      BACK
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Action log */}
        <div className="mt-4 bg-customs-navy border border-customs-border rounded-xl p-3 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs text-customs-gold uppercase tracking-wider font-medium">Action Log</h4>
            <span className="text-[10px] text-customs-muted">{actionLog.length} entries</span>
          </div>
          <div className="space-y-1 font-mono text-[10px] text-customs-muted max-h-32 overflow-auto">
            {actionLog.map((l, i) => (
              <p key={i} className={i === actionLog.length - 1 ? "text-customs-gold" : ""}>&gt; {l}</p>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* Rules sidebar */}
      {showRulebook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/50" onClick={() => setShowRulebook(false)} />
          <div className="w-80 sm:w-96 bg-customs-navy border-l border-customs-border overflow-auto animate-slide-in p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-customs-gold font-bold">S4 Rules</h3>
              <button onClick={() => setShowRulebook(false)} className="text-customs-muted hover:text-white cursor-pointer bg-transparent border-0 text-lg">&times;</button>
            </div>
            <div className="space-y-4 text-xs text-customs-muted">
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">Cancel vs Refund</h4>
                <p><strong className="text-customs-amber">Cancellation</strong> = duty/GST NOT yet paid</p>
                <p><strong className="text-customs-green">Refund</strong> = duty/GST HAS been paid</p>
              </div>
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">Refund Types</h4>
                <div className="space-y-1">
                  <p><span className="text-white">Full:</span> entire duty/GST returned</p>
                  <p><span className="text-white">Partial (Specific):</span> identified shortfall (e.g. short shipment)</p>
                  <p><span className="text-white">Partial (General):</span> value correction (freight, exchange rate)</p>
                </div>
              </div>
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">GF/G7 Same-Day Window</h4>
                <p className="mb-1">Amend/cancel before 23:59:59 of approval day.</p>
                <p className="text-white font-medium mb-1">Requires ALL four conditions:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Payment = GF or G7</li>
                  <li>Goods = non-dutiable</li>
                  <li>Permit = not utilised</li>
                  <li>Within same day</li>
                </ul>
              </div>
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">Utilisation</h4>
                <p>Once utilised for clearance: no amend, no cancel, no refund (except post-clearance refund for paid duty).</p>
              </div>
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">CA Approval</h4>
                <p>Permits awaiting Competent Authority approval should not be acted upon. Premature action disrupts the approval workflow.</p>
              </div>
              <div className="border-t border-customs-border pt-2 text-[10px]">
                Source: Singapore Customs, TradeNet Procedures (Mar 2026)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
