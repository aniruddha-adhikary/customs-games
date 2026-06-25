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

const SIM_SPEED = 10;
const SIM_START_SECONDS = 23 * 3600 + 41 * 60 + 7;
const P220_DEADLINE_SECONDS = 23 * 3600 + 59 * 60 + 59;

function formatSimTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600) % 24;
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function BeatC() {
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

  useEffect(() => {
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
  }, [p220Expired, completedPermits]);

  const p220TimeLeft = Math.max(0, P220_DEADLINE_SECONDS - simTime);
  const p220MinLeft = Math.floor(p220TimeLeft / 60);

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
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [completedPermits, beatComplete]);

  const totalScore = scores.reduce((a, s) => a + s.points, 0);
  const totalMax = 300;

  const timeColor = p220MinLeft < 5 ? "text-customs-red" : p220MinLeft < 20 ? "text-customs-amber" : "text-customs-green";

  if (beatComplete) {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">DISPATCHER BOARD &mdash; RESULTS</h1>
        </header>
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-4 sm:p-6 mb-4 animate-fade-in">
              <h2 className="text-customs-gold text-xl font-bold text-center mb-4">
                Score: {totalScore} / {totalMax}
              </h2>
              <div className="space-y-2">
                {scores.map((s, i) => (
                  <div key={i} className={`flex items-center justify-between p-2 rounded text-xs ${s.points === s.maxPoints ? "bg-customs-green/10 border border-customs-green/20" : s.points > 0 ? "bg-customs-amber/10 border border-customs-amber/20" : "bg-customs-red/10 border border-customs-red/20"}`}>
                    <span className="text-white font-medium">{s.permit}</span>
                    <div className="flex items-center gap-2">
                      {s.tag && <span className="text-customs-red text-[10px] font-mono">{s.tag}</span>}
                      <span className={s.points === s.maxPoints ? "text-customs-green" : "text-customs-amber"}>{s.points}/{s.maxPoints}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {errors.length > 0 && (
              <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6 mb-4">
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
      {/* Header */}
      <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">DISPATCHER BOARD</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`font-mono font-bold text-sm sm:text-base ${timeColor}`}>
            {formatSimTime(simTime)}
          </span>
          <button onClick={() => setShowRulebook(!showRulebook)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-gold hover:bg-customs-panel cursor-pointer">Rules</button>
          <button onClick={() => setScaffolding((s) => (s === 1 ? 2 : 1) as 1 | 2)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer">
            {scaffolding === 1 ? "Guided" : "Open"}
          </button>
          <span className="text-xs text-customs-muted">{totalScore}/{totalMax}</span>
        </div>
      </header>

      {/* Short shipment alert */}
      <div className="bg-customs-amber/10 border-b border-customs-amber/30 px-3 sm:px-6 py-2 text-xs text-customs-amber flex-shrink-0">
        <strong>SHORT-SHIPMENT ALERT</strong> — Case #014: 1,100 of 1,200 bottles received (surveyor report attached)
      </div>

      {/* Permit cards */}
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {PERMITS.map((p) => {
            const completed = completedPermits.has(p.id);
            const isSelected = selectedPermit === p.id;
            const expired = p.id === "P-220" && p220Expired;

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
                className={`bg-customs-panel border rounded-xl p-3 cursor-pointer transition-all ${
                  completed
                    ? "border-customs-green/30 opacity-60"
                    : isSelected
                      ? "border-customs-gold"
                      : expired
                        ? "border-customs-red/50"
                        : "border-customs-border hover:border-customs-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{p.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    p.state === "UTILISED" ? "bg-customs-red/20 text-customs-red" :
                    p.state === "APPROVED" ? "bg-customs-green/20 text-customs-green" :
                    "bg-customs-amber/20 text-customs-amber"
                  }`}>
                    {p.state.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-customs-muted mb-2">{p.title}</p>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-customs-muted">Payment</span>
                    <span className="text-white">{p.paymentCondition}</span>
                  </div>
                  {p.dutiable && (
                    <div className="flex justify-between">
                      <span className="text-customs-muted">Duty/GST</span>
                      <span className="text-customs-amber">PAID</span>
                    </div>
                  )}
                  {p.hasWindow && !expired && (
                    <div className="flex justify-between">
                      <span className="text-customs-muted">Window</span>
                      <span className={timeColor}>
                        {Math.floor(p220TimeLeft / 60)}m {p220TimeLeft % 60}s
                      </span>
                    </div>
                  )}
                  {expired && p.id === "P-220" && (
                    <div className="text-customs-red text-center font-bold">EXPIRED</div>
                  )}
                </div>
                {p.badge && !completed && (
                  <div className={`mt-2 text-center text-[10px] font-bold px-2 py-0.5 rounded ${
                    p.badge === "SHORT SHIPMENT" ? "bg-customs-amber/20 text-customs-amber" :
                    "bg-customs-red/20 text-customs-red"
                  }`}>
                    {p.badge}
                  </div>
                )}
                {completed && (
                  <div className="mt-2 text-center text-[10px] text-customs-green font-bold">RESOLVED</div>
                )}
                {p.actionsLocked && scaffolding === 1 && !completed && (
                  <div className="mt-2 text-center text-[10px] text-customs-muted">
                    {"\ud83d\udd12"} All actions locked
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Decision panel */}
        {selectedPermit && !completedPermits.has(selectedPermit) && (
          <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-4 sm:p-6 max-w-2xl mx-auto animate-fade-in">
            <h3 className="text-white font-bold mb-3">
              DECISION: {selectedPermit}
            </h3>

            {(() => {
              const permit = PERMITS.find((p) => p.id === selectedPermit)!;
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-customs-muted">Payment condition</span>
                      <p className="text-white">{permit.paymentCondition}</p>
                    </div>
                    <div>
                      <span className="text-customs-muted">Permit state</span>
                      <p className="text-white">{permit.state.replace("_", " ")}</p>
                    </div>
                    {permit.dutiable && (
                      <div>
                        <span className="text-customs-muted">Duty/GST paid?</span>
                        <p className="text-customs-amber">YES</p>
                      </div>
                    )}
                  </div>

                  {scaffolding === 1 && permit.id === "C014" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded p-2 text-customs-blue">
                      G1 = duty/GST collected at approval. Because it&apos;s already paid, recovery is via Refund, not Cancellation.
                    </div>
                  )}

                  {/* Action selector */}
                  <div>
                    <p className="text-xs text-customs-gold uppercase tracking-wider mb-2">Select Action</p>
                    <div className="flex flex-wrap gap-2">
                      {(["AMEND", "CANCEL", "REFUND", "MONITOR"] as ActionType[]).map((action) => (
                        <button
                          key={action}
                          onClick={() => {
                            setSelectedAction(action);
                            setRefundSubtype(null);
                            setShowFeedback(null);
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                            selectedAction === action
                              ? "border-customs-gold bg-customs-gold/10 text-customs-gold"
                              : "border-customs-border text-customs-muted hover:border-customs-muted"
                          }`}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Refund sub-type */}
                  {selectedAction === "REFUND" && (
                    <div className="animate-fade-in">
                      <p className="text-xs text-customs-gold uppercase tracking-wider mb-2">Refund Sub-type</p>
                      <div className="space-y-1">
                        {([
                          { value: "FULL" as RefundSubtype, label: "Full Refund", desc: scaffolding === 1 ? "Entire duty/GST returned — for a whole-consignment cancellation." : undefined },
                          { value: "PARTIAL_SPECIFIC" as RefundSubtype, label: "Partial (Specific)", desc: scaffolding === 1 ? "Duty/GST returned for a specific, identified shortfall — e.g. short shipment." : undefined },
                          { value: "PARTIAL_GENERAL" as RefundSubtype, label: "Partial (General)", desc: scaffolding === 1 ? "Correction for value errors, e.g. wrong freight or exchange rate." : undefined },
                        ]).map((opt) => (
                          <label key={opt.value} className={`flex items-start gap-2 p-2 rounded border cursor-pointer text-xs ${refundSubtype === opt.value ? "border-customs-gold bg-customs-gold/10" : "border-customs-border"}`}>
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
                    <div className="animate-fade-in space-y-2">
                      <div>
                        <label className="block text-xs text-customs-muted mb-1">Received Quantity (BOT)</label>
                        <input
                          type="number"
                          value={receivedQty}
                          onChange={(e) => setReceivedQty(e.target.value)}
                          placeholder="e.g. 1100"
                          className="w-full bg-customs-surface border border-customs-border rounded px-2.5 py-1.5 text-sm text-white placeholder-customs-muted/50 focus:outline-none focus:border-customs-gold"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-customs-muted cursor-pointer">
                        <input type="checkbox" checked={docAttached} onChange={(e) => setDocAttached(e.target.checked)} className="accent-[#c8a94e]" />
                        Attach surveyor&apos;s report as supporting document
                      </label>
                    </div>
                  )}

                  {/* Reason */}
                  {selectedAction && selectedAction !== "MONITOR" && (
                    <div>
                      <label className="block text-xs text-customs-muted mb-1">Reason</label>
                      <textarea
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        placeholder="Brief reason..."
                        rows={2}
                        className="w-full bg-customs-surface border border-customs-border rounded px-2.5 py-1.5 text-sm text-white placeholder-customs-muted/50 focus:outline-none focus:border-customs-gold resize-none"
                      />
                    </div>
                  )}

                  {/* Feedback */}
                  {showFeedback && (
                    <div className="bg-customs-red/10 border border-customs-red/30 rounded p-3 text-xs text-customs-red animate-fade-in">
                      {showFeedback}
                    </div>
                  )}

                  {/* Confirm */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirm}
                      disabled={!selectedAction}
                      className="flex-1 bg-customs-gold text-customs-dark font-bold py-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-customs-gold/90 transition-colors cursor-pointer text-sm"
                    >
                      CONFIRM & LOG
                    </button>
                    <button
                      onClick={() => { setSelectedPermit(null); setSelectedAction(null); setShowFeedback(null); }}
                      className="px-4 py-2 border border-customs-border rounded-lg text-customs-muted hover:text-white text-sm cursor-pointer bg-transparent"
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
          <h4 className="text-xs text-customs-gold uppercase tracking-wider mb-2">Action Log</h4>
          <div className="space-y-1 font-mono text-[10px] text-customs-muted max-h-32 overflow-auto">
            {actionLog.map((l, i) => (
              <p key={i}>&gt; {l}</p>
            ))}
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
            <div className="space-y-3 text-xs text-customs-muted">
              <div>
                <h4 className="text-white font-medium mb-1">Cancel vs Refund</h4>
                <p><strong className="text-customs-amber">Cancellation</strong> = duty/GST NOT yet paid</p>
                <p><strong className="text-customs-green">Refund</strong> = duty/GST HAD been paid</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Refund Types</h4>
                <p>Full: entire duty/GST returned</p>
                <p>Partial (Specific): identified shortfall (e.g. short shipment)</p>
                <p>Partial (General): value correction (freight, exchange rate)</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">GF/G7 Same-Day Window</h4>
                <p>Amend/cancel before 23:59:59 of approval day.</p>
                <p>Requires ALL four conditions:</p>
                <ul className="list-disc pl-4 mt-1">
                  <li>Payment = GF or G7</li>
                  <li>Goods = non-dutiable</li>
                  <li>Permit = not utilised</li>
                  <li>Within same day</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Utilisation</h4>
                <p>Once utilised for clearance: no amend, no cancel, no refund (except post-clearance refund for paid duty).</p>
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
