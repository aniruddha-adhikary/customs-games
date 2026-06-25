import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import type {
  BeatCConfig,
  ActionType,
  RefundSubtype,
  PermitState,
  ErrorEntry,
  ScoreEntry,
} from "./beatCConfig";

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

export function BeatCGeneric({ config }: { config: BeatCConfig }) {
  const [phase, setPhase] = useState<"briefing" | "playing" | "results">("briefing");
  const [simTime, setSimTime] = useState(config.timer?.startSeconds ?? 0);
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
  const [timerExpired, setTimerExpired] = useState(false);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [showRulebook, setShowRulebook] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>(config.initialActionLog);
  const [beatComplete, setBeatComplete] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const logEndRef = useRef<HTMLDivElement>(null);

  const timerCfg = config.timer;
  const timerPermitId = timerCfg?.permitId;

  useEffect(() => {
    if (phase !== "playing" || !timerCfg) return;
    timerRef.current = setInterval(() => {
      setSimTime((t) => {
        const next = t + timerCfg.simSpeed;
        if (next >= timerCfg.deadlineSeconds && !timerExpired) {
          setTimerExpired(true);
          if (timerPermitId && !completedPermits.has(timerPermitId)) {
            setErrors((e) => [...e, { tag: timerCfg.onExpire.errorTag, message: timerCfg.onExpire.errorMsg }]);
            setScores((s) => [...s, { permit: timerPermitId, points: 0, maxPoints: timerCfg.onExpire.maxPoints, tag: timerCfg.onExpire.errorTag }]);
            setCompletedPermits((c) => new Set([...c, timerPermitId]));
            setActionLog((l) => [...l, `${formatSimTime(next)} \u2014 ${timerCfg.onExpire.logMsg}`]);
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerExpired, completedPermits, phase, timerCfg, timerPermitId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [actionLog]);

  const timeLeft = timerCfg ? Math.max(0, timerCfg.deadlineSeconds - simTime) : 0;
  const timeMinLeft = Math.floor(timeLeft / 60);
  const timeColor = timeMinLeft < 5 ? "text-customs-red" : timeMinLeft < 10 ? "text-customs-amber" : "text-customs-green";
  const timePct = timerCfg ? Math.min(100, (timeLeft / (timerCfg.deadlineSeconds - timerCfg.startSeconds)) * 100) : 0;

  const handleConfirm = useCallback(() => {
    if (!selectedPermit || !selectedAction) return;
    const permit = config.permits.find((p) => p.id === selectedPermit)!;
    const count = attemptCounts[selectedPermit] || 0;

    const ctx = {
      timerExpired,
      attemptCount: count,
      refundSubtype,
      docAttached,
      receivedQty,
      formatSimTime,
      simTime,
    };

    setAttemptCounts((a) => ({ ...a, [selectedPermit]: count + 1 }));

    const result = permit.onAction(selectedAction, ctx);

    if (result.type === "success") {
      setScores((s) => [...s, { permit: permit.id, points: result.points!, maxPoints: result.maxPoints! }]);
      setCompletedPermits((c) => new Set([...c, permit.id]));
      setActionLog((l) => [...l, result.logMsg!]);
      setSelectedPermit(null);
      setSelectedAction(null);
      setShowFeedback(null);
      return;
    }

    if (result.type === "locked" || result.type === "feedback") {
      if (result.feedback) setShowFeedback(result.feedback);
      if (result.error) setErrors((e) => [...e, result.error!]);
      if (result.markComplete) {
        setScores((s) => [...s, { permit: permit.id, points: result.points ?? 0, maxPoints: result.maxPoints ?? permit.maxPoints, tag: result.error?.tag }]);
        setCompletedPermits((c) => new Set([...c, permit.id]));
      }
    }
  }, [selectedPermit, selectedAction, config.permits, attemptCounts, timerExpired, refundSubtype, docAttached, receivedQty, simTime]);

  useEffect(() => {
    if (completedPermits.size >= config.permits.length && !beatComplete) {
      setBeatComplete(true);
      setPhase("results");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [completedPermits, beatComplete, config.permits.length]);

  const totalScore = scores.reduce((a, s) => a + s.points, 0);

  if (phase === "briefing") {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Link to={config.backLink} className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">BEAT C &mdash; DISPATCHER{config.headerTitle ? ` (${config.headerTitle})` : ""}</h1>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center">
          <div className="max-w-lg w-full animate-fade-in">
            <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-5 sm:p-8 space-y-5">
              <div className="text-center space-y-2">
                <div className="text-3xl">&#128225;</div>
                <h2 className="text-customs-gold text-xl font-bold">Dispatcher Briefing</h2>
                {config.briefingSubtitle && <p className="text-customs-muted text-sm">{config.briefingSubtitle}</p>}
                <p className="text-customs-muted text-sm">
                  Your shift starts at <span className="text-white font-mono">{config.briefingStartTime}</span>.
                  {timerCfg && <> Time runs at <span className="text-customs-amber font-bold">{timerCfg.simSpeed}x</span> real speed.</>}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Your mission</p>
                  <p className="text-customs-muted">{config.briefingMission}</p>
                </div>

                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Key intel</p>
                  <ul className="text-customs-muted space-y-1.5 list-none">
                    {config.briefingIntel.map((item, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: item.text }} />
                    ))}
                  </ul>
                </div>

                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Scoring</p>
                  <p className="text-customs-muted">{config.briefingScoreText}</p>
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

  if (phase === "results") {
    const pct = Math.round((totalScore / config.totalMax) * 100);
    const grade = pct >= 90 ? "EXCELLENT" : pct >= 70 ? "GOOD" : pct >= 50 ? "FAIR" : "NEEDS WORK";
    const gradeColor = pct >= 90 ? "text-customs-green" : pct >= 70 ? "text-customs-gold" : pct >= 50 ? "text-customs-amber" : "text-customs-red";

    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Link to={config.backLink} className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">DISPATCHER BOARD &mdash; RESULTS</h1>
        </header>
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-4 sm:p-6 animate-fade-in text-center">
              <div className={`text-4xl font-bold ${gradeColor} mb-1`}>{grade}</div>
              <div className="text-customs-gold text-2xl font-bold mb-1">
                {totalScore} / {config.totalMax}
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
                {config.permits.map((permit) => {
                  const scoreEntry = scores.find((s) => s.permit === permit.id);
                  const pts = scoreEntry?.points ?? 0;
                  const max = scoreEntry?.maxPoints ?? permit.maxPoints;
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
                          <span className="text-customs-muted">Correct: <span className="text-white">{permit.correctActionLabel}</span></span>
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
                {actionLog.map((l, i) => (
                  <p key={i}>&gt; {l}</p>
                ))}
              </div>
            </div>

            <Link to={config.backLink} className="block bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg no-underline hover:bg-customs-gold/90 transition-colors text-center">
              RETURN
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Playing phase
  const selectedPermitData = selectedPermit ? config.permits.find((p) => p.id === selectedPermit) : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to={config.backLink} className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">DISPATCHER BOARD</h1>
          <ProgressDots completed={completedPermits.size} total={config.permits.length} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {timerCfg && (
            <div className={`font-mono font-bold text-sm sm:text-lg px-2 py-0.5 rounded ${timeColor} ${timeMinLeft < 5 ? "animate-pulse-glow bg-customs-red/10" : ""}`}>
              {formatSimTime(simTime)}
            </div>
          )}
          <button onClick={() => setShowRulebook(!showRulebook)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-gold hover:bg-customs-panel cursor-pointer">Rules</button>
          <button onClick={() => setScaffolding((s) => (s === 1 ? 2 : 1) as 1 | 2)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer">
            {scaffolding === 1 ? "Guided" : "Open"}
          </button>
          <span className="text-xs text-customs-muted font-mono">{totalScore}/{config.totalMax}</span>
        </div>
      </header>

      {config.alert && (
        <div className="bg-customs-amber/10 border-b border-customs-amber/30 px-3 sm:px-6 py-2 text-xs text-customs-amber flex-shrink-0 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-customs-amber animate-pulse flex-shrink-0" />
          <div dangerouslySetInnerHTML={{ __html: config.alert.text }} />
        </div>
      )}

      {timerCfg && timerPermitId && !completedPermits.has(timerPermitId) && !timerExpired && (
        <div className="bg-customs-dark border-b border-customs-border px-3 sm:px-6 py-1.5 flex-shrink-0">
          <div className="flex items-center justify-between text-[10px] mb-0.5">
            <span className={`font-medium ${timeMinLeft < 5 ? "text-customs-red" : "text-customs-amber"}`}>
              {timerCfg.deadlineLabel}
            </span>
            <span className={`font-mono font-bold ${timeMinLeft < 5 ? "text-customs-red animate-pulse" : "text-customs-amber"}`}>
              {Math.floor(timeLeft / 60)}m {timeLeft % 60}s remaining
            </span>
          </div>
          <div className="w-full bg-customs-surface rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-1000 ${timeMinLeft < 5 ? "bg-customs-red" : timeMinLeft < 10 ? "bg-customs-amber" : "bg-customs-green"}`}
              style={{ width: `${timePct}%` }}
            />
          </div>
        </div>
      )}
      {timerCfg && timerPermitId && timerExpired && !completedPermits.has(timerPermitId) && (
        <div className="bg-customs-red/10 border-b border-customs-red/30 px-3 sm:px-6 py-1.5 flex-shrink-0 text-[10px] text-customs-red font-bold text-center">
          {timerPermitId} GF WINDOW EXPIRED
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {config.permits.map((p) => {
            const completed = completedPermits.has(p.id);
            const isSelected = selectedPermit === p.id;
            const expired = p.isTimerPermit && timerExpired;
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
                  {p.paymentCondition && (
                    <div className="flex justify-between">
                      <span className="text-customs-muted">Payment</span>
                      <span className="text-white font-medium">{p.paymentCondition}</span>
                    </div>
                  )}
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
                  {p.hasWindow && !expired && !completed && timerCfg && (
                    <div className="flex justify-between">
                      <span className="text-customs-muted">Window</span>
                      <span className={`font-mono font-bold ${timeMinLeft < 5 ? "text-customs-red animate-pulse" : timeColor}`}>
                        {Math.floor(timeLeft / 60)}m {timeLeft % 60}s
                      </span>
                    </div>
                  )}
                  {expired && p.isTimerPermit && !completed && (
                    <div className="text-customs-red text-center font-bold py-0.5">WINDOW EXPIRED</div>
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
                        p.badge.includes("SHORT") ? "bg-customs-amber/20 text-customs-amber" :
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

        {selectedPermitData && !completedPermits.has(selectedPermitData.id) && (
          <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-4 sm:p-6 max-w-2xl mx-auto animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-bold text-base">
                    {selectedPermitData.id}: {selectedPermitData.title}
                  </h3>
                  <p className="text-xs text-customs-muted mt-0.5">{selectedPermitData.goods}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded font-bold flex-shrink-0 ${
                  selectedPermitData.state === "UTILISED" ? "bg-customs-red/20 text-customs-red" :
                  selectedPermitData.state === "APPROVED" ? "bg-customs-green/20 text-customs-green" :
                  "bg-customs-amber/20 text-customs-amber"
                }`}>
                  {formatStateLabel(selectedPermitData.state)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-customs-surface rounded-lg p-3">
                {selectedPermitData.paymentCondition && (
                  <div>
                    <span className="text-customs-muted block">Payment</span>
                    <p className="text-white font-medium">{selectedPermitData.paymentCondition}</p>
                  </div>
                )}
                <div>
                  <span className="text-customs-muted block">Permit state</span>
                  <p className="text-white font-medium">{formatStateLabel(selectedPermitData.state)}</p>
                </div>
                <div>
                  <span className="text-customs-muted block">Message type</span>
                  <p className="text-white font-medium">{selectedPermitData.messageType}</p>
                </div>
                {selectedPermitData.dutiable && (
                  <div>
                    <span className="text-customs-muted block">Duty/GST paid?</span>
                    <p className="text-customs-amber font-bold">YES</p>
                  </div>
                )}
                {selectedPermitData.utilisedAt && (
                  <div>
                    <span className="text-customs-muted block">Utilised at</span>
                    <p className="text-customs-red font-medium">{selectedPermitData.utilisedAt}</p>
                  </div>
                )}
                {selectedPermitData.hasWindow && timerCfg && (
                  <div>
                    <span className="text-customs-muted block">Window deadline</span>
                    <p className={`font-mono font-bold ${timerExpired ? "text-customs-red" : timeColor}`}>
                      {timerExpired ? "EXPIRED" : `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`}
                    </p>
                  </div>
                )}
              </div>

              {selectedPermitData.shortShipment && (
                <div className="text-xs bg-customs-amber/10 border border-customs-amber/20 rounded-lg p-3">
                  <p className="text-customs-amber font-medium mb-1">Short Shipment Details</p>
                  <div className="grid grid-cols-2 gap-1 text-customs-muted" dangerouslySetInnerHTML={{ __html: config.alert?.highlightText || "" }} />
                </div>
              )}

              {scaffolding === 1 && selectedPermitData.hint && (
                <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                  <span className="font-medium">Hint:</span> {selectedPermitData.hint}
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
                        onClick={() => { setSelectedAction(action); setRefundSubtype(null); setShowFeedback(null); }}
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

              {config.hasRefundSubtypes && selectedAction === "REFUND" && (
                <div className="animate-fade-in">
                  <p className="text-xs text-customs-gold uppercase tracking-wider mb-2 font-medium">Refund Sub-type</p>
                  <div className="space-y-1.5">
                    {([
                      { value: "FULL" as RefundSubtype, label: "Full Refund", desc: scaffolding === 1 ? "Entire duty/GST returned \u2014 for a whole-consignment cancellation." : undefined },
                      { value: "PARTIAL_SPECIFIC" as RefundSubtype, label: "Partial (Specific)", desc: scaffolding === 1 ? "Duty/GST returned for a specific, identified shortfall \u2014 e.g. short shipment." : undefined },
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

              {config.hasRefundDetails && selectedAction === "REFUND" && refundSubtype === "PARTIAL_SPECIFIC" && selectedPermitData.shortShipment && (
                <div className="animate-fade-in space-y-3 bg-customs-surface rounded-lg p-3">
                  <p className="text-xs text-customs-gold font-medium">Refund Application Details</p>
                  <div>
                    <label className="block text-xs text-customs-muted mb-1">Received Quantity</label>
                    <input
                      type="number"
                      value={receivedQty}
                      onChange={(e) => setReceivedQty(e.target.value)}
                      placeholder="How many were actually received?"
                      className="w-full bg-customs-dark border border-customs-border rounded-lg px-3 py-2 text-sm text-white placeholder-customs-muted/50 focus:outline-none focus:border-customs-gold transition-colors"
                    />
                    {scaffolding === 1 && (
                      <p className="text-[10px] text-customs-muted mt-1">Check the surveyor report for the confirmed received quantity.</p>
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
              <h3 className="text-customs-gold font-bold">{config.rulebookTitle}</h3>
              <button onClick={() => setShowRulebook(false)} className="text-customs-muted hover:text-white cursor-pointer bg-transparent border-0 text-lg">&times;</button>
            </div>
            <div className="space-y-4 text-xs text-customs-muted">
              {config.rulebookEntries.map((entry, i) => (
                <div key={i} className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <h4 className="text-white font-medium mb-1.5">{entry.title}</h4>
                  <p>{entry.content}</p>
                  {entry.listItems && (
                    <ul className="list-disc pl-4 space-y-0.5 mt-1">
                      {entry.listItems.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
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
