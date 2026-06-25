export type PermitState = "APPROVED" | "UTILISED" | "AWAITING_CA_APPROVAL";
export type ActionType = "AMEND" | "CANCEL" | "REFUND" | "MONITOR";
export type RefundSubtype = "FULL" | "PARTIAL_SPECIFIC" | "PARTIAL_GENERAL";

export interface ErrorEntry {
  tag: string;
  message: string;
}

export interface ScoreEntry {
  permit: string;
  points: number;
  maxPoints: number;
  tag?: string;
}

export interface ActionResult {
  type: "success" | "feedback" | "locked";
  points?: number;
  maxPoints?: number;
  logMsg?: string;
  feedback?: string;
  error?: { tag: string; message: string };
  markComplete?: boolean;
}

export interface ActionContext {
  timerExpired: boolean;
  attemptCount: number;
  refundSubtype: RefundSubtype | null;
  docAttached: boolean;
  receivedQty: string;
  formatSimTime: (t: number) => string;
  simTime: number;
}

export interface PermitConfig {
  id: string;
  title: string;
  goods: string;
  messageType: string;
  state: PermitState;
  paymentCondition?: string;
  dutiable: boolean;
  dutyPaid?: boolean;
  approvedAt: string;
  utilisedAt: string | null;
  hasWindow?: boolean;
  badge?: string;
  actionsLocked: boolean;
  shortShipment?: boolean;
  correctActionLabel: string;
  explanation: string;
  hint?: string;
  maxPoints: number;
  isTimerPermit?: boolean;

  onAction: (action: ActionType, ctx: ActionContext) => ActionResult;
}

export interface TimerConfig {
  permitId: string;
  startSeconds: number;
  deadlineSeconds: number;
  simSpeed: number;
  deadlineLabel: string;
  onExpire: { errorTag: string; errorMsg: string; maxPoints: number; logMsg: string };
}

export interface AlertConfig {
  text: string;
  highlightText?: string;
}

export interface BriefingIntel {
  icon: string;
  text: string;
  highlightClass: string;
}

export interface RulebookEntry {
  title: string;
  content: string;
  listItems?: string[];
}

export interface BeatCConfig {
  caseId: string;
  backLink: string;
  headerTitle: string;
  briefingSubtitle?: string;
  briefingStartTime: string;
  briefingMission: string;
  briefingIntel: BriefingIntel[];
  briefingScoreText: string;

  permits: PermitConfig[];
  totalMax: number;

  timer?: TimerConfig;
  alert?: AlertConfig;

  initialActionLog: string[];

  hasRefundSubtypes: boolean;
  hasRefundDetails: boolean;

  rulebookTitle: string;
  rulebookEntries: RulebookEntry[];
}
