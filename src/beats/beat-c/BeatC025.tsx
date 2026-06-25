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
  correctAction: { lever: ActionType };
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
    id: "P-025",
    title: "MacBook IN",
    goods: "MacBook Pro 16\", 500 U, non-dutiable",
    messageType: "IN",
    state: "APPROVED",
    paymentCondition: "GF",
    dutiable: false,
    dutyPaid: false,
    approvedAt: "09:15",
    utilisedAt: null,
    windowDeadline: null,
    hasWindow: false,
    correctAction: { lever: "MONITOR" },
    actionsLocked: false,
  },
  {
    id: "P-310",
    title: "Auto Parts IN",
    goods: "Car engine components, dutiable",
    messageType: "IN",
    state: "UTILISED",
    paymentCondition: "G1",
    dutiable: true,
    dutyPaid: true,
    approvedAt: "08:00",
    utilisedAt: "08:45",
    windowDeadline: null,
    hasWindow: false,
    correctAction: { lever: "MONITOR" },
    actionsLocked: true,
  },
  {
    id: "P-411",
    title: "Textiles OUT",
    goods: "Fabric rolls for export",
    messageType: "OUT",
    state: "APPROVED",
    paymentCondition: "GF",
    dutiable: false,
    dutyPaid: false,
    approvedAt: "23:30",
    utilisedAt: null,
    windowDeadline: "23:59:59",
    hasWindow: true,
    correctAction: { lever: "AMEND" },
    badge: "WINDOW CLOSING",
    actionsLocked: false,
  },
  {
    id: "P-502",
    title: "Medical Devices",
    goods: "Surgical instruments, pending HSA",
    messageType: "IN",
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
  "P-025":
    "This is a healthy permit \u2014 GF payment, non-dutiable, APPROVED. No short shipment, no errors. The correct action is to Monitor (no action needed).",
  "P-310":
    "Once utilised for cargo clearance (at 08:45), a permit is locked. No amendment, cancellation, or refund is possible. Monitor only.",
  "P-411":
    "GF payment + non-dutiable + not utilised + same day = eligible for amendment before the 23:59:59 window closes.",
  "P-502":
    "Permit is still awaiting Competent Authority (HSA) approval. Any premature action would disrupt the approval workflow. Monitor only.",
};

const CORRECT_ACTION_LABELS: Record<string, string> = {
  "P-025": "Monitor (no action)",
  "P-310": "Monitor (no action)",
  "P-411": "Amend (within GF window)",
  "P-502": "Monitor (no action)",
};

const SIM_SPEED = 10;
const SIM_START_SECONDS = 23 * 3600 + 41 * 60 + 7;
const P411_DEADLINE_SECONDS = 23 * 3600 + 59 * 60 + 59;

function formatSimTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600) % 24;
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatStateLabel(state: PermitState): string {
  return state.replace(/_/g, " ");
}

function ProgressDots({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
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
      <span className="text-[10px] text-customs-muted ml-1">
        {completed}/{total}
      </span>
    </div>
  );
}

export function BeatC025() {
  const [phase, setPhase] = useState<"briefing" | "playing" | "results">(
    "briefing",
  );
  const [simTime, setSimTime] = useState(SIM_START_SECONDS);
  const [scaffolding, setScaffolding] = useState<1 | 2>(1);
  const [selectedPermit, setSelectedPermit] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [completedPermits, setCompletedPermits] = useState<Set<string>>(
    new Set(),
  );
  const [p411Expired, setP411Expired] = useState(false);
  const [p310Attempts, setP310Attempts] = useState(0);
  const [showRulebook, setShowRulebook] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([
    "09:15 \u2014 P-025 approved (GF, non-dutiable, MacBook import)",
    "23:30 \u2014 P-411 approved (GF, non-dutiable, textile export, same-day window open)",
    "23:41 \u2014 Dispatcher shift start",
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
        if (next >= P411_DEADLINE_SECONDS && !p411Expired) {
          setP411Expired(true);
          if (!completedPermits.has("P-411")) {
            setErrors((e) => [
              ...e,
              {
                tag: "S4-WINDOW-MISS",
                message: "Missed P-411's GF same-day window.",
              },
            ]);
            setScores((s) => [
              ...s,
              { permit: "P-411", points: 0, maxPoints: 70, tag: "S4-WINDOW-MISS" },
            ]);
            setCompletedPermits((c) => new Set([...c, "P-411"]));
            setActionLog((l) => [
              ...l,
              `${formatSimTime(next)} \u2014 P-411 GF window EXPIRED. Amendment no longer available.`,
            ]);
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [p411Expired, completedPermits, phase]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [actionLog]);

  const p411TimeLeft = Math.max(0, P411_DEADLINE_SECONDS - simTime);

  const handleConfirm = useCallback(() => {
    if (!selectedPermit || !selectedAction) return;
    const permit = PERMITS.find((p) => p.id === selectedPermit)!;
    const now = formatSimTime(simTime);

    // P-025: healthy permit, correct = MONITOR
    if (permit.id === "P-025") {
      if (selectedAction === "MONITOR") {
        setScores((s) => [
          ...s,
          { permit: "P-025", points: 60, maxPoints: 60 },
        ]);
        setCompletedPermits((c) => new Set([...c, "P-025"]));
        setActionLog((l) => [
          ...l,
          `${now} \u2014 P-025: Monitoring. No action taken (correct).`,
        ]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
      setShowFeedback(
        "P-025 is a healthy permit \u2014 GF payment, non-dutiable, no errors, no short shipment. There is nothing to amend, cancel, or refund. Monitor only.",
      );
      setErrors((e) => [
        ...e,
        {
          tag: "S4-OVERACTION-025",
          message: "Tried to act on healthy MacBook permit P-025.",
        },
      ]);
      return;
    }

    // P-310: utilised, locked
    if (permit.id === "P-310") {
      setP310Attempts((a) => a + 1);
      if (selectedAction === "MONITOR") {
        setScores((s) => [
          ...s,
          { permit: "P-310", points: 40, maxPoints: 40 },
        ]);
        setCompletedPermits((c) => new Set([...c, "P-310"]));
        setActionLog((l) => [
          ...l,
          `${now} \u2014 P-310: Monitoring. No action taken (utilised, locked).`,
        ]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
      if (p310Attempts >= 1) {
        setErrors((e) => [
          ...e,
          {
            tag: "S4-LOCK-310",
            message: "Tried to act on UTILISED permit P-310.",
          },
        ]);
        setScores((s) => [
          ...s,
          { permit: "P-310", points: 0, maxPoints: 40, tag: "S4-LOCK-310" },
        ]);
        setCompletedPermits((c) => new Set([...c, "P-310"]));
      }
      setShowFeedback(
        "Permit P-310 was used for cargo clearance at 08:45. Once utilised, it cannot be amended, cancelled or refunded.",
      );
      return;
    }

    // P-411: amend before window closes
    if (permit.id === "P-411") {
      if (p411Expired) {
        setShowFeedback(
          "GF same-day window expired at 23:59:59. Amendment no longer available.",
        );
        return;
      }
      if (selectedAction === "AMEND") {
        setScores((s) => [
          ...s,
          { permit: "P-411", points: 70, maxPoints: 70 },
        ]);
        setCompletedPermits((c) => new Set([...c, "P-411"]));
        setActionLog((l) => [
          ...l,
          `${now} \u2014 P-411: Amendment submitted within GF window.`,
        ]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
      if (selectedAction === "MONITOR") {
        setShowFeedback(
          "P-411 has a GF same-day window closing at 23:59:59. An amendment is needed before the window expires.",
        );
        return;
      }
      setShowFeedback(
        "P-411 is GF, non-dutiable, and not utilised. The correct action is to Amend within the same-day window.",
      );
      return;
    }

    // P-502: awaiting CA approval
    if (permit.id === "P-502") {
      if (selectedAction === "MONITOR") {
        setScores((s) => [
          ...s,
          { permit: "P-502", points: 30, maxPoints: 30 },
        ]);
        setCompletedPermits((c) => new Set([...c, "P-502"]));
        setActionLog((l) => [
          ...l,
          `${now} \u2014 P-502: Monitoring. No action taken.`,
        ]);
        setSelectedPermit(null);
        setSelectedAction(null);
        setShowFeedback(null);
        return;
      }
      setShowFeedback(
        "Permit P-502 is still awaiting CA (HSA) approval. No clearance has occurred. Premature action could disrupt the approval workflow.",
      );
      setErrors((e) => [
        ...e,
        { tag: "S4-OVERACTION-502", message: "Acted on AWAITING-CA permit." },
      ]);
      setScores((s) => [
        ...s,
        { permit: "P-502", points: 0, maxPoints: 30, tag: "S4-OVERACTION" },
      ]);
      setCompletedPermits((c) => new Set([...c, "P-502"]));
      return;
    }
  }, [selectedPermit, selectedAction, simTime, p411Expired, p310Attempts]);

  useEffect(() => {
    if (completedPermits.size >= 4 && !beatComplete) {
      setBeatComplete(true);
      setPhase("results");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [completedPermits, beatComplete]);

  const totalScore = scores.reduce((a, s) => a + s.points, 0);
  const totalMax = 200;

  const p411MinLeft = Math.floor(p411TimeLeft / 60);
  const timeColor =
    p411MinLeft < 5
      ? "text-customs-red"
      : p411MinLeft < 10
        ? "text-customs-amber"
        : "text-customs-green";
  const p411Pct = Math.min(
    100,
    (p411TimeLeft / (P411_DEADLINE_SECONDS - SIM_START_SECONDS)) * 100,
  );

  // Briefing screen
  if (phase === "briefing") {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Link
            to="/case-025"
            className="text-customs-muted hover:text-white text-sm no-underline"
          >
            &larr;
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-white">
            BEAT C &mdash; DISPATCHER (CASE #025)
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center">
          <div className="max-w-lg w-full animate-fade-in">
            <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-5 sm:p-8 space-y-5">
              <div className="text-center space-y-2">
                <div className="text-3xl">&#128225;</div>
                <h2 className="text-customs-gold text-xl font-bold">
                  Dispatcher Briefing
                </h2>
                <p className="text-customs-muted text-sm">
                  Your shift starts at{" "}
                  <span className="text-white font-mono">23:41:07</span>. Time
                  runs at{" "}
                  <span className="text-customs-amber font-bold">10x</span> real
                  speed.
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Your mission</p>
                  <p className="text-customs-muted">
                    Triage{" "}
                    <span className="text-white font-bold">
                      4 active permits
                    </span>{" "}
                    on the board. For each permit, decide the correct
                    post-clearance action:{" "}
                    <span className="text-customs-gold">Amend</span>,{" "}
                    <span className="text-customs-gold">Cancel</span>,{" "}
                    <span className="text-customs-gold">Refund</span>, or{" "}
                    <span className="text-customs-gold">Monitor</span> (no
                    action).
                  </p>
                </div>

                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Key intel</p>
                  <ul className="text-customs-muted space-y-1.5 list-none">
                    <li>
                      &#128187; A{" "}
                      <span className="text-customs-green font-medium">
                        healthy MacBook permit
                      </span>{" "}
                      (P-025) &mdash; is any action needed?
                    </li>
                    <li>
                      &#9203; One permit has a{" "}
                      <span className="text-customs-red font-medium">
                        same-day window
                      </span>{" "}
                      closing at midnight
                    </li>
                    <li>
                      &#128274; Some permits may be locked due to utilisation
                    </li>
                    <li>
                      &#128209; An approval from a Competent Authority is still
                      pending
                    </li>
                  </ul>
                </div>

                <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                  <p className="text-white font-medium mb-1">Scoring</p>
                  <p className="text-customs-muted">
                    <span className="text-customs-gold font-bold">
                      200 points
                    </span>{" "}
                    max. Points awarded for correct action and timing.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setScaffolding(1);
                    setPhase("playing");
                  }}
                  className="flex-1 bg-customs-gold text-customs-dark font-bold py-3 rounded-lg hover:bg-customs-gold/90 transition-colors cursor-pointer text-sm"
                >
                  START (Guided)
                </button>
                <button
                  onClick={() => {
                    setScaffolding(2);
                    setPhase("playing");
                  }}
                  className="flex-1 bg-customs-surface border border-customs-border text-customs-muted font-bold py-3 rounded-lg hover:text-white hover:border-customs-muted transition-colors cursor-pointer text-sm"
                >
                  START (Open)
                </button>
              </div>
              <p className="text-[10px] text-customs-muted text-center">
                Guided mode shows hints; Open mode is unassisted.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (phase === "results") {
    const pct = Math.round((totalScore / totalMax) * 100);
    const grade =
      pct >= 90
        ? "EXCELLENT"
        : pct >= 70
          ? "GOOD"
          : pct >= 50
            ? "FAIR"
            : "NEEDS WORK";
    const gradeColor =
      pct >= 90
        ? "text-customs-green"
        : pct >= 70
          ? "text-customs-gold"
          : pct >= 50
            ? "text-customs-amber"
            : "text-customs-red";

    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Link
            to="/case-025"
            className="text-customs-muted hover:text-white text-sm no-underline"
          >
            &larr;
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-white">
            DISPATCHER BOARD &mdash; RESULTS
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-4 sm:p-6 animate-fade-in text-center">
              <div className={`text-4xl font-bold ${gradeColor} mb-1`}>
                {grade}
              </div>
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
              <h3 className="text-white font-bold text-sm mb-3">
                Permit Breakdown
              </h3>
              <div className="space-y-3">
                {PERMITS.map((permit) => {
                  const scoreEntry = scores.find(
                    (s) => s.permit === permit.id,
                  );
                  const pts = scoreEntry?.points ?? 0;
                  const max =
                    scoreEntry?.maxPoints ??
                    (permit.id === "P-025"
                      ? 60
                      : permit.id === "P-310"
                        ? 40
                        : permit.id === "P-411"
                          ? 70
                          : 30);
                  const perfect = pts === max;
                  const zero = pts === 0;

                  return (
                    <div
                      key={permit.id}
                      className={`rounded-lg border p-3 ${perfect ? "bg-customs-green/5 border-customs-green/20" : zero ? "bg-customs-red/5 border-customs-red/20" : "bg-customs-amber/5 border-customs-amber/20"}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">
                            {permit.id}
                          </span>
                          <span className="text-customs-muted text-xs">
                            {permit.title}
                          </span>
                        </div>
                        <span
                          className={`font-bold text-sm ${perfect ? "text-customs-green" : zero ? "text-customs-red" : "text-customs-amber"}`}
                        >
                          {pts}/{max}
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-start gap-1.5">
                          <span className="text-customs-green mt-0.5 flex-shrink-0">
                            &#10003;
                          </span>
                          <span className="text-customs-muted">
                            Correct:{" "}
                            <span className="text-white">
                              {CORRECT_ACTION_LABELS[permit.id]}
                            </span>
                          </span>
                        </div>
                        <p className="text-customs-muted pl-5">
                          {CORRECT_ACTION_EXPLANATIONS[permit.id]}
                        </p>
                        {scoreEntry?.tag && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-customs-red mt-0.5 flex-shrink-0">
                              &#10007;
                            </span>
                            <span className="text-customs-red font-mono text-[10px]">
                              {scoreEntry.tag}
                            </span>
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
                <h3 className="text-customs-amber font-bold text-sm mb-3">
                  Error Ledger ({errors.length})
                </h3>
                <div className="space-y-2">
                  {errors.map((e, i) => (
                    <div
                      key={i}
                      className="text-xs p-2 bg-customs-surface rounded border border-customs-border"
                    >
                      <span className="text-customs-amber font-mono">
                        {e.tag}
                      </span>
                      <p className="text-customs-muted mt-0.5">{e.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-customs-navy border border-customs-border rounded-xl p-4 sm:p-6">
              <h3 className="text-customs-gold font-bold text-sm mb-3">
                Session Log
              </h3>
              <div className="space-y-1 font-mono text-[10px] text-customs-muted">
                {actionLog.map((l, i) => (
                  <p key={i}>&gt; {l}</p>
                ))}
              </div>
            </div>

            <Link
              to="/case-025"
              className="block bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg no-underline hover:bg-customs-gold/90 transition-colors text-center"
            >
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
      <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/case-025"
            className="text-customs-muted hover:text-white text-sm no-underline"
          >
            &larr;
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-white">
            DISPATCHER BOARD
          </h1>
          <ProgressDots completed={completedPermits.size} total={4} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`font-mono font-bold text-sm sm:text-lg px-2 py-0.5 rounded ${timeColor} ${p411MinLeft < 5 ? "animate-pulse-glow bg-customs-red/10" : ""}`}
          >
            {formatSimTime(simTime)}
          </div>
          <button
            onClick={() => setShowRulebook(!showRulebook)}
            className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-gold hover:bg-customs-panel cursor-pointer"
          >
            Rules
          </button>
          <button
            onClick={() =>
              setScaffolding((s) => (s === 1 ? 2 : 1) as 1 | 2)
            }
            className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer"
          >
            {scaffolding === 1 ? "Guided" : "Open"}
          </button>
          <span className="text-xs text-customs-muted font-mono">
            {totalScore}/{totalMax}
          </span>
        </div>
      </header>

      {/* P-411 deadline bar */}
      {!completedPermits.has("P-411") && !p411Expired && (
        <div className="bg-customs-dark border-b border-customs-border px-3 sm:px-6 py-1.5 flex-shrink-0">
          <div className="flex items-center justify-between text-[10px] mb-0.5">
            <span
              className={`font-medium ${p411MinLeft < 5 ? "text-customs-red" : "text-customs-amber"}`}
            >
              P-411 GF Window
            </span>
            <span
              className={`font-mono font-bold ${p411MinLeft < 5 ? "text-customs-red animate-pulse" : "text-customs-amber"}`}
            >
              {Math.floor(p411TimeLeft / 60)}m {p411TimeLeft % 60}s remaining
            </span>
          </div>
          <div className="w-full bg-customs-surface rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-1000 ${p411MinLeft < 5 ? "bg-customs-red" : p411MinLeft < 10 ? "bg-customs-amber" : "bg-customs-green"}`}
              style={{ width: `${p411Pct}%` }}
            />
          </div>
        </div>
      )}
      {p411Expired && !completedPermits.has("P-411") && (
        <div className="bg-customs-red/10 border-b border-customs-red/30 px-3 sm:px-6 py-1.5 flex-shrink-0 text-[10px] text-customs-red font-bold text-center">
          P-411 GF WINDOW EXPIRED
        </div>
      )}

      {/* Permit cards + decision panel */}
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {PERMITS.map((p) => {
            const completed = completedPermits.has(p.id);
            const isSelected = selectedPermit === p.id;
            const expired = p.id === "P-411" && p411Expired;
            const scoreEntry = completed
              ? scores.find((s) => s.permit === p.id)
              : null;

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
                      : expired
                        ? "border-customs-red/50 cursor-pointer"
                        : "border-customs-border hover:border-customs-muted cursor-pointer"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{p.id}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      p.state === "UTILISED"
                        ? "bg-customs-red/20 text-customs-red"
                        : p.state === "APPROVED"
                          ? "bg-customs-green/20 text-customs-green"
                          : "bg-customs-amber/20 text-customs-amber"
                    }`}
                  >
                    {formatStateLabel(p.state)}
                  </span>
                </div>
                <p className="text-xs text-customs-muted mb-1">{p.title}</p>
                <p className="text-[10px] text-customs-muted/70 mb-2 truncate">
                  {p.goods}
                </p>

                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-customs-muted">Payment</span>
                    <span className="text-white font-medium">
                      {p.paymentCondition}
                    </span>
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
                      <span
                        className={`font-mono font-bold ${p411MinLeft < 5 ? "text-customs-red animate-pulse" : timeColor}`}
                      >
                        {Math.floor(p411TimeLeft / 60)}m {p411TimeLeft % 60}s
                      </span>
                    </div>
                  )}
                  {expired && p.id === "P-411" && !completed && (
                    <div className="text-customs-red text-center font-bold py-0.5">
                      WINDOW EXPIRED
                    </div>
                  )}
                </div>

                {completed ? (
                  <div
                    className={`mt-2 text-center text-[10px] font-bold px-2 py-1 rounded ${
                      scoreEntry && scoreEntry.points === scoreEntry.maxPoints
                        ? "bg-customs-green/10 text-customs-green"
                        : scoreEntry && scoreEntry.points > 0
                          ? "bg-customs-amber/10 text-customs-amber"
                          : "bg-customs-red/10 text-customs-red"
                    }`}
                  >
                    RESOLVED{" "}
                    {scoreEntry
                      ? `(${scoreEntry.points}/${scoreEntry.maxPoints})`
                      : ""}
                  </div>
                ) : (
                  <>
                    {p.badge && (
                      <div className="mt-2 text-center text-[10px] font-bold px-2 py-1 rounded bg-customs-red/20 text-customs-red">
                        {p.badge}
                      </div>
                    )}
                    {p.actionsLocked && (
                      <div className="mt-2 text-center text-[10px] text-customs-muted bg-customs-surface rounded py-1">
                        &#128274; Actions locked (utilised)
                      </div>
                    )}
                    {p.state === "AWAITING_CA_APPROVAL" &&
                      scaffolding === 1 && (
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
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-bold text-base">
                        {selectedPermit}: {permit.title}
                      </h3>
                      <p className="text-xs text-customs-muted mt-0.5">
                        {permit.goods}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-1 rounded font-bold flex-shrink-0 ${
                        permit.state === "UTILISED"
                          ? "bg-customs-red/20 text-customs-red"
                          : permit.state === "APPROVED"
                            ? "bg-customs-green/20 text-customs-green"
                            : "bg-customs-amber/20 text-customs-amber"
                      }`}
                    >
                      {formatStateLabel(permit.state)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-customs-surface rounded-lg p-3">
                    <div>
                      <span className="text-customs-muted block">Payment</span>
                      <p className="text-white font-medium">
                        {permit.paymentCondition}
                      </p>
                    </div>
                    <div>
                      <span className="text-customs-muted block">
                        Permit state
                      </span>
                      <p className="text-white font-medium">
                        {formatStateLabel(permit.state)}
                      </p>
                    </div>
                    <div>
                      <span className="text-customs-muted block">
                        Message type
                      </span>
                      <p className="text-white font-medium">
                        {permit.messageType}
                      </p>
                    </div>
                    {permit.dutiable && (
                      <div>
                        <span className="text-customs-muted block">
                          Duty/GST paid?
                        </span>
                        <p className="text-customs-amber font-bold">YES</p>
                      </div>
                    )}
                    {permit.utilisedAt && (
                      <div>
                        <span className="text-customs-muted block">
                          Utilised at
                        </span>
                        <p className="text-customs-red font-medium">
                          {permit.utilisedAt}
                        </p>
                      </div>
                    )}
                    {permit.hasWindow && (
                      <div>
                        <span className="text-customs-muted block">
                          Window deadline
                        </span>
                        <p
                          className={`font-mono font-bold ${p411Expired ? "text-customs-red" : timeColor}`}
                        >
                          {p411Expired
                            ? "EXPIRED"
                            : `${Math.floor(p411TimeLeft / 60)}m ${p411TimeLeft % 60}s`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Guided hints */}
                  {scaffolding === 1 && permit.id === "P-025" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> This permit
                      looks healthy. GF payment, non-dutiable, approved, no
                      short shipment. Is any action actually needed?
                    </div>
                  )}
                  {scaffolding === 1 && permit.id === "P-310" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> This permit
                      was utilised for cargo clearance at 08:45. Once utilised,
                      no modifications are possible.
                    </div>
                  )}
                  {scaffolding === 1 && permit.id === "P-411" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> GF same-day
                      window conditions: GF payment + non-dutiable + not
                      utilised + same day. All four are met.
                    </div>
                  )}
                  {scaffolding === 1 && permit.id === "P-502" && (
                    <div className="text-xs bg-customs-blue/10 border border-customs-blue/20 rounded-lg p-3 text-customs-blue">
                      <span className="font-medium">Hint:</span> This permit is
                      awaiting Competent Authority (HSA) approval. Acting
                      prematurely could disrupt the workflow.
                    </div>
                  )}

                  {/* Action selector */}
                  <div>
                    <p className="text-xs text-customs-gold uppercase tracking-wider mb-2 font-medium">
                      Select Action
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        ["AMEND", "CANCEL", "REFUND", "MONITOR"] as ActionType[]
                      ).map((action) => {
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
                            <span className="block text-[10px] opacity-70 mt-0.5">
                              {descriptions[action]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reason */}
                  {selectedAction && selectedAction !== "MONITOR" && (
                    <div>
                      <label className="block text-xs text-customs-muted mb-1">
                        Reason (optional)
                      </label>
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
                      <span className="text-customs-red flex-shrink-0 mt-0.5 text-sm">
                        &#9888;
                      </span>
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
                      {selectedAction
                        ? `CONFIRM ${selectedAction}`
                        : "SELECT AN ACTION"}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPermit(null);
                        setSelectedAction(null);
                        setShowFeedback(null);
                      }}
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
            <h4 className="text-xs text-customs-gold uppercase tracking-wider font-medium">
              Action Log
            </h4>
            <span className="text-[10px] text-customs-muted">
              {actionLog.length} entries
            </span>
          </div>
          <div className="space-y-1 font-mono text-[10px] text-customs-muted max-h-32 overflow-auto">
            {actionLog.map((l, i) => (
              <p
                key={i}
                className={i === actionLog.length - 1 ? "text-customs-gold" : ""}
              >
                &gt; {l}
              </p>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* Rules sidebar */}
      {showRulebook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="flex-1 bg-black/50"
            onClick={() => setShowRulebook(false)}
          />
          <div className="w-80 sm:w-96 bg-customs-navy border-l border-customs-border overflow-auto animate-slide-in p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-customs-gold font-bold">S4 Rules</h3>
              <button
                onClick={() => setShowRulebook(false)}
                className="text-customs-muted hover:text-white cursor-pointer bg-transparent border-0 text-lg"
              >
                &times;
              </button>
            </div>
            <div className="space-y-4 text-xs text-customs-muted">
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">
                  Cancel vs Refund
                </h4>
                <p>
                  <strong className="text-customs-amber">Cancellation</strong> =
                  duty/GST NOT yet paid
                </p>
                <p>
                  <strong className="text-customs-green">Refund</strong> =
                  duty/GST HAS been paid
                </p>
              </div>
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">
                  GF/G7 Same-Day Window
                </h4>
                <p className="mb-1">
                  Amend/cancel before 23:59:59 of approval day.
                </p>
                <p className="text-white font-medium mb-1">
                  Requires ALL four conditions:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Payment = GF or G7</li>
                  <li>Goods = non-dutiable</li>
                  <li>Permit = not utilised</li>
                  <li>Within same day</li>
                </ul>
              </div>
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">Utilisation</h4>
                <p>
                  Once utilised for clearance: no amend, no cancel, no refund
                  (except post-clearance refund for paid duty).
                </p>
              </div>
              <div className="bg-customs-surface rounded-lg p-3 border border-customs-border">
                <h4 className="text-white font-medium mb-1.5">CA Approval</h4>
                <p>
                  Permits awaiting Competent Authority approval should not be
                  acted upon. Premature action disrupts the approval workflow.
                </p>
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
