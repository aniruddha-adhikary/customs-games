import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";

type PermitState = "APPROVED" | "UTILISED" | "AWAITING_CA_APPROVAL";
type ActionType = "AMEND" | "CANCEL" | "REFUND" | "MONITOR";

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
  correctAction: { lever: ActionType; detail?: string };
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
    id: "E-052",
    title: "Optics OUT",
    goods: "Precision optical lenses, 300 U",
    messageType: "OUT",
    state: "APPROVED",
    paymentCondition: "GF",
    dutiable: false,
    dutyPaid: false,
    approvedAt: "14:30",
    utilisedAt: null,
    windowDeadline: null,
    hasWindow: false,
    correctAction: { lever: "AMEND", detail: "Container number correction" },
    badge: "CONTAINER ERROR",
    actionsLocked: false,
  },
  {
    id: "P-330",
    title: "Chemicals OUT",
    goods: "Industrial chemicals, containerised",
    messageType: "OUT",
    state: "UTILISED",
    paymentCondition: "G1",
    dutiable: false,
    dutyPaid: false,
    approvedAt: "09:00",
    utilisedAt: "10:45",
    windowDeadline: null,
    hasWindow: false,
    correctAction: { lever: "MONITOR" },
    actionsLocked: true,
  },
  {
    id: "P-660",
    title: "Machinery IN",
    goods: "CNC machinery parts, non-dutiable",
    messageType: "IN",
    state: "APPROVED",
    paymentCondition: "GF",
    dutiable: false,
    dutyPaid: false,
    approvedAt: "11:20",
    utilisedAt: null,
    windowDeadline: null,
    hasWindow: false,
    correctAction: { lever: "CANCEL", detail: "Order cancelled by buyer" },
    badge: "ORDER CANCELLED",
    actionsLocked: false,
  },
  {
    id: "R-100",
    title: "Strategic Goods",
    goods: "Controlled items, export licence pending",
    messageType: "OUT",
    state: "AWAITING_CA_APPROVAL",
    paymentCondition: "GF",
    dutiable: false,
    dutyPaid: false,
    approvedAt: "\u2014",
    utilisedAt: null,
    windowDeadline: null,
    hasWindow: false,
    correctAction: { lever: "MONITOR" },
    actionsLocked: false,
  },
];

const CORRECT_ACTION_EXPLANATIONS: Record<string, string> = {
  "E-052": "GF payment + non-dutiable + not utilised + export permit = eligible for amendment. The container number (EURU4456789) needs correction before the vessel departs.",
  "P-330": "Once utilised for cargo clearance (at 10:45), a permit is locked. No amendment, cancellation, or refund is possible. Monitor only.",
  "P-660": "GF payment + non-dutiable + not utilised + buyer cancelled = eligible for cancellation. Cancel the permit before goods arrive.",
  "R-100": "Permit is still awaiting Competent Authority approval for strategic goods export. Any premature action would disrupt the approval workflow. Monitor only.",
};

const CORRECT_ACTION_LABELS: Record<string, string> = {
  "E-052": "Amend (container number)",
  "P-330": "Monitor (no action)",
  "P-660": "Cancel (order cancelled)",
  "R-100": "Monitor (no action)",
};

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

export function BeatC052() {
  const [phase, setPhase] = useState<"briefing" | "playing" | "results">("briefing");
  const [scaffolding, setScaffolding] = useState<1 | 2>(1);
  const [selectedPermit, setSelectedPermit] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [completedPermits, setCompletedPermits] = useState<Set<string>>(new Set());
  const [p330Attempts, setP330Attempts] = useState(0);
  const [showRulebook, setShowRulebook] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([
    "14:30 \u2014 E-052 approved (Optics OUT, GF, container EURU4456789)",
    "14:35 \u2014 Shipping agent reports container number error on E-052",
    "14:40 \u2014 Dispatcher shift start",
  ]);
  const [beatComplete, setBeatComplete] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [actionLog]);

  const handleConfirm = useCallback(() => {
    if (!selectedPermit || !selectedAction) return;
    const permit = PERMITS.find((p) => p.id === selectedPermit)!;
    const now = "14:4" + Math.floor(Math.random() * 10);

    if (permit.id === "P-330") {
      setP330Attempts((a) => a + 1);
      if (p330Attempts >= 1) {
        setErrors((e) => [...e, { tag: "S4-LOCK-01", message: "Tried to act on UTILISED permit P-330." }]);
        setScores((s) => [...s, { permit: "P-330", points: 0, maxPoints: 40, tag: "S4-LOCK-01" }]);
        setCompletedPermits((c) => new Set([...c, "P-330"]));
      }
      setShowFeedback("Permit P-330 was used for cargo clearance at 10:45. Once utilised, it cannot be amended, cancelled or refunded.");
      return;
    }

    if (permit.id === "E-052") {
      if (selectedAction === "AMEND") {
        setScores((s) => [...s, { permit: "E-052", points: 80, maxPoints: 80 }]);
        setCompletedPermits((c) => new Set([...c, "E-052"]));
        setActionLog((l) => [...l, `${now} \u2014 E-052: Amendment submitted. Container number corrected.`]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
      if (selectedAction === "CANCEL") {
        setShowFeedback("Cancellation would void the entire permit. The shipment is still going \u2014 only the container number needs correcting. Use Amend.");
        setErrors((e) => [...e, { tag: "S4-CANCEL-VS-AMEND", message: "Chose cancel instead of amend for E-052." }]);
        return;
      }
      if (selectedAction === "REFUND") {
        setShowFeedback("No duty/GST was paid (non-dutiable export with GF). There is nothing to refund. The container number just needs amending.");
        setErrors((e) => [...e, { tag: "S4-REFUND-NOPAY", message: "Tried to refund non-dutiable export E-052." }]);
        return;
      }
      if (selectedAction === "MONITOR") {
        setShowFeedback("The shipping agent flagged a container number error. If uncorrected, the vessel may depart with the wrong container reference. Act before it\u2019s too late.");
        setErrors((e) => [...e, { tag: "S4-UNDERACTION", message: "Chose to monitor E-052 despite container error." }]);
        return;
      }
    }

    if (permit.id === "P-660") {
      if (selectedAction === "CANCEL") {
        setScores((s) => [...s, { permit: "P-660", points: 80, maxPoints: 80 }]);
        setCompletedPermits((c) => new Set([...c, "P-660"]));
        setActionLog((l) => [...l, `${now} \u2014 P-660: Permit cancelled. Order cancelled by buyer.`]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
      if (selectedAction === "AMEND") {
        setShowFeedback("Amendment updates permit details, but the entire order has been cancelled by the buyer. The permit should be cancelled outright.");
        setErrors((e) => [...e, { tag: "S4-AMEND-VS-CANCEL", message: "Chose amend instead of cancel for P-660." }]);
        return;
      }
      if (selectedAction === "REFUND") {
        setShowFeedback("No duty/GST was paid (non-dutiable, GF payment). There is nothing to refund \u2014 cancel the permit instead.");
        setErrors((e) => [...e, { tag: "S4-REFUND-NOPAY", message: "Tried to refund non-dutiable import P-660." }]);
        return;
      }
      if (selectedAction === "MONITOR") {
        setShowFeedback("The buyer has cancelled the order. Leaving the permit active wastes quota and may cause issues at clearance. Cancel it.");
        setErrors((e) => [...e, { tag: "S4-UNDERACTION", message: "Chose to monitor P-660 despite order cancellation." }]);
        return;
      }
    }

    if (permit.id === "R-100") {
      if (selectedAction === "MONITOR") {
        setScores((s) => [...s, { permit: "R-100", points: 40, maxPoints: 40 }]);
        setCompletedPermits((c) => new Set([...c, "R-100"]));
        setActionLog((l) => [...l, `${now} \u2014 R-100: Monitoring. No action taken.`]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
      setShowFeedback("Permit R-100 is still awaiting Competent Authority approval for strategic goods export. Premature action could disrupt the approval workflow.");
      setErrors((e) => [...e, { tag: "S4-OVERACTION", message: "Acted on AWAITING-CA permit R-100." }]);
      setScores((s) => [...s, { permit: "R-100", points: 0, maxPoints: 40, tag: "S4-OVERACTION" }]);
      setCompletedPermits((c) => new Set([...c, "R-100"]));
      return;
    }
  }, [selectedPermit, selectedAction, p330Attempts]);

  useEffect(() => {
    if (completedPermits.size >= 4 && !beatComplete) {
      setBeatComplete(true);
      setPhase("results");
    }
  }, [completedPermits, beatComplete]);

  const totalScore = scores.reduce((a, s) => a + s.points, 0);
  const totalMax = 240;

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
                <p className="text-customs-muted text-sm">Case #052: Precision Optics Export</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Your mission</p>
                  <p className="text-customs-muted">Triage <span className="text-white font-bold">4 active permits</span> on the board. For each permit, decide the correct post-clearance action: <span className="text-customs-gold">Amend</span>, <span className="text-customs-gold">Cancel</span>, <span className="text-customs-gold">Refund</span>, or <span className="text-customs-gold">Monitor</span> (no action).</p>
                </div>

                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Key intel</p>
                  <ul className="text-customs-muted space-y-1.5 list-none">
                    <li>&#9888;&#65039; A <span className="text-customs-amber font-medium">container number error</span> has been flagged on E-052</li>
                    <li>&#128274; One permit is <span className="text-customs-red font-medium">locked</span> due to utilisation</li>
                    <li>&#10060; A buyer has <span className="text-customs-amber font-medium">cancelled an order</span></li>
                    <li>&#128209; A <span className="text-customs-amber font-medium">strategic goods</span> CA approval is pending</li>
                  </ul>
                </div>

                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Scoring</p>
                  <p className="text-customs-muted"><span className="text-customs-gold font-bold">240 points</span> max. Points awarded for correct action selection.</p>
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

            <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6 animate-fade-in">
              <h3 className="text-white font-bold text-sm mb-3">Permit Breakdown</h3>
              <div className="space-y-3">
                {PERMITS.map((permit) => {
                  const scoreEntry = scores.find((s) => s.permit === permit.id);
                  const pts = scoreEntry?.points ?? 0;
                  const max = scoreEntry?.maxPoints ?? (permit.id === "E-052" ? 80 : permit.id === "P-660" ? 80 : permit.id === "P-330" ? 40 : 40);
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">DISPATCHER BOARD</h1>
          <ProgressDots completed={completedPermits.size} total={4} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setShowRulebook(!showRulebook)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-gold hover:bg-customs-panel cursor-pointer">Rules</button>
          <button onClick={() => setScaffolding((s) => (s === 1 ? 2 : 1) as 1 | 2)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer">
            {scaffolding === 1 ? "Guided" : "Open"}
          </button>
          <span className="text-xs text-customs-muted font-mono">{totalScore}/{totalMax}</span>
        </div>
      </header>

      <div className="bg-customs-amber/10 border-b border-customs-amber/30 px-3 sm:px-6 py-2 text-xs text-customs-amber flex-shrink-0 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-customs-amber animate-pulse flex-shrink-0" />
        <div>
          <strong>CONTAINER ERROR ALERT</strong> &mdash; E-052: Shipping agent reports wrong container number on export permit. Vessel departs in 2 hours.
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {PERMITS.map((p) => {
            const completed = completedPermits.has(p.id);
            const isSelected = selectedPermit === p.id;
            const scoreEntry = completed ? scores.find((s) => s.permit === p.id) : null;

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!completed) {
                    setSelectedPermit(p.id);
                    setSelectedAction(null);
                    setReasonText("");
                    setShowFeedback(null);
                  }
                }}
                className={`bg-customs-panel border rounded-xl p-3 transition-all ${
                  completed
                    ? "border-customs-green/30 opacity-60 cursor-default"
                    : isSelected
                      ? "border-customs-gold animate-pulse-glow cursor-pointer"
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
                  {p.utilisedAt && (
                    <div className="flex justify-between">
                      <span className="text-customs-muted">Used at</span>
                      <span className="text-customs-red">{p.utilisedAt}</span>
                    </div>
                  )}
                </div>

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
                        p.badge === "CONTAINER ERROR" || p.badge === "ORDER CANCELLED" ? "bg-customs-amber/20 text-customs-amber" :
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

        {selectedPermit && !completedPermits.has(selectedPermit) && (
          <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-4 sm:p-6 max-w-2xl mx-auto animate-fade-in">
            {(() => {
              const permit = PERMITS.find((p) => p.id === selectedPermit)!;
              return (
                <div className="space-y-4">
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
                    {permit.utilisedAt && (
                      <div>
                        <span className="text-customs-muted block">Utilised at</span>
                        <p className="text-customs-red font-medium">{permit.utilisedAt}</p>
                      </div>
                    )}
                  </div>

                  {permit.id === "E-052" && (
                    <div className="text-xs bg-customs-amber/10 border border-customs-amber/20 rounded-lg p-3">
                      <p className="text-customs-amber font-medium mb-1">Container Error Details</p>
                      <p className="text-customs-muted">Shipping agent reports the container number on E-052 is incorrect. Vessel MV Europa Express departs in 2 hours. Container number must be corrected before departure.</p>
                    </div>
                  )}

                  {permit.id === "P-660" && (
                    <div className="text-xs bg-customs-amber/10 border border-customs-amber/20 rounded-lg p-3">
                      <p className="text-customs-amber font-medium mb-1">Order Cancellation</p>
                      <p className="text-customs-muted">Buyer (overseas) has cancelled the order for CNC machinery parts. Goods have not arrived yet. The approved import permit is no longer needed.</p>
                    </div>
                  )}

                  {scaffolding === 1 && permit.id === "E-052" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> GF payment + non-dutiable + not utilised = eligible for amendment. The shipment is still going, only the container number is wrong.
                    </div>
                  )}
                  {scaffolding === 1 && permit.id === "P-330" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> This permit was utilised for cargo clearance at 10:45. Once utilised, no modifications are possible.
                    </div>
                  )}
                  {scaffolding === 1 && permit.id === "P-660" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> GF payment + non-dutiable + not utilised + order cancelled = the entire permit can be cancelled.
                    </div>
                  )}
                  {scaffolding === 1 && permit.id === "R-100" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> This permit is awaiting Competent Authority approval for strategic goods. Acting prematurely could disrupt the workflow.
                    </div>
                  )}

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

                  {showFeedback && (
                    <div className="bg-customs-red/10 border border-customs-red/30 rounded-lg p-3 text-xs animate-fade-in flex items-start gap-2">
                      <span className="text-customs-red flex-shrink-0 mt-0.5 text-sm">&#9888;</span>
                      <span className="text-customs-red">{showFeedback}</span>
                    </div>
                  )}

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
                <h4 className="text-white font-medium mb-1.5">Amend vs Cancel</h4>
                <p><strong className="text-customs-amber">Amend</strong> = correct details on an active permit (e.g. container number)</p>
                <p><strong className="text-customs-red">Cancel</strong> = void the entire permit (e.g. order cancelled)</p>
              </div>
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">Cancel vs Refund</h4>
                <p><strong className="text-customs-amber">Cancellation</strong> = duty/GST NOT yet paid (or non-dutiable)</p>
                <p><strong className="text-customs-green">Refund</strong> = duty/GST HAS been paid</p>
              </div>
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">Non-Dutiable Exports</h4>
                <p>Most exports are non-dutiable. No duty/GST is collected, so refunds do not apply. Use amend or cancel as appropriate.</p>
              </div>
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">Utilisation</h4>
                <p>Once utilised for clearance: no amend, no cancel, no refund. Monitor only.</p>
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
