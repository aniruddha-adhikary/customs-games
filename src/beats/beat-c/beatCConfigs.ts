import type { BeatCConfig, ActionResult, ActionContext, ActionType } from "./beatCConfig";

/* ───── Case #014: Bordeaux Wine Import ───── */

function c014Action(permitId: string): (action: ActionType, ctx: ActionContext) => ActionResult {
  return (action, ctx) => {
    const now = ctx.formatSimTime(ctx.simTime);

    if (permitId === "P-118") {
      if (ctx.attemptCount >= 1) {
        return { type: "locked", feedback: "Permit P-118 was used for cargo clearance at 15:22. Once utilised, it cannot be amended, cancelled or refunded.", error: { tag: "S4-LOCK-01", message: "Tried to act on UTILISED permit P-118." }, markComplete: true, points: 0, maxPoints: 40 };
      }
      return { type: "locked", feedback: "Permit P-118 was used for cargo clearance at 15:22. Once utilised, it cannot be amended, cancelled or refunded." };
    }

    if (permitId === "C014") {
      if (action === "CANCEL") return { type: "feedback", feedback: "Cancellation not available \u2014 duty/GST already paid under G1. Use Refund.", error: { tag: "S4-CANCEL-VS-REFUND", message: "Chose cancel for paid C014 permit." } };
      if (action === "AMEND") return { type: "feedback", feedback: "Amendment updates the record, but does not recover overpaid duty/GST. You must also submit a Partial (Specific) Refund application." };
      if (action === "REFUND") {
        if (ctx.refundSubtype === "FULL") return { type: "feedback", feedback: "A full refund cancels the entire permit. Only 100 of 1,200 bottles are short \u2014 apply for Partial (Specific) Refund.", error: { tag: "S4-REFUND-TYPE", message: "Used Full refund for a short shipment." } };
        if (ctx.refundSubtype === "PARTIAL_GENERAL") return { type: "feedback", feedback: "Partial (General) is for value corrections (freight, exchange rate). A specific quantity shortfall uses Partial (Specific).", error: { tag: "S4-REFUND-TYPE", message: "Used Partial General for a short shipment." } };
        if (ctx.refundSubtype === "PARTIAL_SPECIFIC") {
          let pts = 60 + 60;
          if (!ctx.docAttached) {
            pts -= 20;
          } else {
            pts += 20;
          }
          const qty = parseInt(ctx.receivedQty);
          if (qty === 1100) pts += 20;
          return { type: "success", points: pts, maxPoints: 160, logMsg: `${now} \u2014 C014: Partial Refund (Specific) submitted. Delta 100 BOT.` };
        }
      }
      return { type: "feedback", feedback: "Select a refund sub-type to continue." };
    }

    if (permitId === "P-220") {
      if (ctx.timerExpired) return { type: "feedback", feedback: "GF same-day window expired at 23:59:59. Amendment no longer available." };
      if (action === "AMEND") return { type: "success", points: 70, maxPoints: 70, logMsg: `${now} \u2014 P-220: Amendment submitted within GF window.` };
      return { type: "feedback", feedback: "P-220 is eligible for amendment within the GF same-day window." };
    }

    if (permitId === "R-090") {
      if (action === "MONITOR") return { type: "success", points: 30, maxPoints: 30, logMsg: `${now} \u2014 R-090: Monitoring. No action taken.` };
      return { type: "feedback", feedback: "Permit R-090 is still awaiting CA approval. No clearance has occurred and no short-shipment event applies. Premature action could disrupt the approval workflow.", error: { tag: "S4-OVERACTION", message: "Acted on AWAITING-CA permit." }, markComplete: true, points: 0, maxPoints: 30 };
    }

    return { type: "feedback", feedback: "No valid action for this permit." };
  };
}

export const BEAT_C_014: BeatCConfig = {
  caseId: "014",
  backLink: "/",
  headerTitle: "",
  briefingStartTime: "23:41:07",
  briefingMission: 'Triage <span class="text-white font-bold">4 active CCPs (Cargo Clearance Permits)</span> on the board. Each CCP was issued via TradeNet. For each, decide the correct post-clearance action: <span class="text-customs-gold">Amend</span>, <span class="text-customs-gold">Cancel</span>, <span class="text-customs-gold">Refund</span>, or <span class="text-customs-gold">Monitor</span> (no action).',
  briefingIntel: [
    { icon: "", text: '&#9888;&#65039; A <span class="text-customs-amber font-medium">short shipment</span> has been reported — duty/GST was paid under G1 (pay-before-release)', highlightClass: "text-customs-amber" },
    { icon: "", text: '&#9203; One permit has a <span class="text-customs-red font-medium">same-day GF window</span> closing at midnight (GIRO deduction cutoff)', highlightClass: "text-customs-red" },
    { icon: "", text: '&#128274; Some CCPs may be locked after utilisation (goods already cleared through FTZ gate)', highlightClass: "" },
    { icon: "", text: '&#128209; A Competent Authority approval (e.g. AVA/HSA) is still pending', highlightClass: "" },
  ],
  briefingScoreText: '<span class="text-customs-gold font-bold">300 points</span> max. Points awarded for correct action, timing, and supporting evidence.',
  permits: [
    {
      id: "C014", title: "Bordeaux Wine IN", goods: "Red wine, 1,200 BOT", messageType: "IN",
      state: "UTILISED", paymentCondition: "G1", dutiable: true, dutyPaid: true,
      approvedAt: "20:50", utilisedAt: "21:10", hasWindow: false, badge: "SHORT SHIPMENT",
      actionsLocked: false, shortShipment: true, maxPoints: 160,
      correctActionLabel: "Partial Refund (Specific)",
      explanation: "Duty/GST was already paid under G1. With a short shipment of 100 bottles, the correct action is a Partial Refund (Specific) to recover overpaid SGD 2,187.08 for the missing quantity.",
      hint: "G1 = duty/GST collected at approval. Because it's already paid, recovery is via Refund, not Cancellation.",
      onAction: c014Action("C014"),
    },
    {
      id: "P-220", title: "Printer Parts IN", goods: "Printer spare parts (non-dutiable)", messageType: "IN",
      state: "APPROVED", paymentCondition: "GF", dutiable: false,
      approvedAt: "23:30", utilisedAt: null, hasWindow: true, badge: "WINDOW CLOSING",
      actionsLocked: false, maxPoints: 70, isTimerPermit: true,
      correctActionLabel: "Amend (within GF window)",
      explanation: "GF payment + non-dutiable + not utilised + same day = eligible for amendment before the 23:59:59 window closes.",
      hint: "GF same-day window conditions: GF payment + non-dutiable + not utilised + same day. All four are met.",
      onAction: c014Action("P-220"),
    },
    {
      id: "P-118", title: "Apparel IN", goods: "Clothing, cleared", messageType: "IN",
      state: "UTILISED", paymentCondition: "G1", dutiable: false,
      approvedAt: "14:00", utilisedAt: "15:22", actionsLocked: true, maxPoints: 40,
      correctActionLabel: "Monitor (no action)",
      explanation: "Once utilised for cargo clearance (at 15:22), a permit is locked. No amendment, cancellation, or refund is possible. Monitor only.",
      hint: "This permit was utilised for cargo clearance at 15:22. Once utilised, no modifications are possible.",
      onAction: c014Action("P-118"),
    },
    {
      id: "R-090", title: "Bonded Removal", goods: "Licensed warehouse goods", messageType: "REM",
      state: "AWAITING_CA_APPROVAL", paymentCondition: "G7", dutiable: false,
      approvedAt: "\u2014", utilisedAt: null, actionsLocked: false, maxPoints: 30,
      correctActionLabel: "Monitor (no action)",
      explanation: "Permit is still awaiting Competent Authority approval. Any premature action would disrupt the approval workflow. Monitor only.",
      hint: "This permit is awaiting Competent Authority approval. Acting prematurely could disrupt the workflow.",
      onAction: c014Action("R-090"),
    },
  ],
  totalMax: 300,
  timer: {
    permitId: "P-220",
    startSeconds: 23 * 3600 + 41 * 60 + 7,
    deadlineSeconds: 23 * 3600 + 59 * 60 + 59,
    simSpeed: 10,
    deadlineLabel: "P-220 GF Window",
    onExpire: { errorTag: "S4-WINDOW-MISS", errorMsg: "Missed P-220's GF same-day window.", maxPoints: 70, logMsg: "P-220 GF window EXPIRED. Amendment no longer available." },
  },
  alert: {
    text: '<strong>SHORT-SHIPMENT ALERT</strong> &mdash; Case #014: 1,100 of 1,200 bottles received. Overpaid <span class="text-white font-bold">SGD 2,187.08</span>. Surveyor report attached.',
    highlightText: '<span class="text-customs-muted">Declared: <span class="text-white">1,200 BOT</span></span><span class="text-customs-muted">Received: <span class="text-white">1,100 BOT</span></span><span class="text-customs-muted">Shortfall: <span class="text-customs-red font-bold">100 BOT</span></span><span class="text-customs-muted">Overpaid: <span class="text-customs-red font-bold">SGD 2,187.08</span></span>',
  },
  initialActionLog: [
    "21:10 \u2014 C014 devanned; short shipment 100 BOT (surveyor report attached)",
    "23:30 \u2014 P-220 approved (GF, non-dutiable, same-day window open)",
    "23:41 \u2014 Dispatcher shift start",
  ],
  hasRefundSubtypes: true,
  hasRefundDetails: true,
  rulebookTitle: "S4 Rules",
  rulebookEntries: [
    { title: "Cancel vs Refund", content: "Cancellation = duty/GST NOT yet paid. Refund = duty/GST HAS been paid." },
    { title: "Refund Types", content: "Full: entire duty/GST returned. Partial (Specific): identified shortfall (e.g. short shipment). Partial (General): value correction (freight, exchange rate)." },
    { title: "GF/G7 Same-Day Window", content: "Amend/cancel before 23:59:59 of approval day.", listItems: ["Payment = GF or G7", "Goods = non-dutiable", "Permit = not utilised", "Within same day"] },
    { title: "Utilisation", content: "Once utilised for clearance: no amend, no cancel, no refund (except post-clearance refund for paid duty)." },
    { title: "CA Approval", content: "Permits awaiting Competent Authority approval should not be acted upon. Premature action disrupts the approval workflow." },
  ],
};

/* ───── Case #025: MacBook Import ───── */

function c025Action(permitId: string): (action: ActionType, ctx: ActionContext) => ActionResult {
  return (action, ctx) => {
    const now = ctx.formatSimTime(ctx.simTime);

    if (permitId === "P-025") {
      if (action === "MONITOR") return { type: "success", points: 60, maxPoints: 60, logMsg: `${now} \u2014 P-025: Monitoring. No action taken (correct).` };
      return { type: "feedback", feedback: "P-025 is a healthy permit \u2014 GF payment, non-dutiable, no errors, no short shipment. There is nothing to amend, cancel, or refund. Monitor only.", error: { tag: "S4-OVERACTION-025", message: "Tried to act on healthy MacBook permit P-025." } };
    }

    if (permitId === "P-310") {
      if (action === "MONITOR") return { type: "success", points: 40, maxPoints: 40, logMsg: `${now} \u2014 P-310: Monitoring. No action taken (utilised, locked).` };
      if (ctx.attemptCount >= 1) {
        return { type: "locked", feedback: "Permit P-310 was used for cargo clearance at 08:45. Once utilised, it cannot be amended, cancelled or refunded.", error: { tag: "S4-LOCK-310", message: "Tried to act on UTILISED permit P-310." }, markComplete: true, points: 0, maxPoints: 40 };
      }
      return { type: "locked", feedback: "Permit P-310 was used for cargo clearance at 08:45. Once utilised, it cannot be amended, cancelled or refunded." };
    }

    if (permitId === "P-411") {
      if (ctx.timerExpired) return { type: "feedback", feedback: "GF same-day window expired at 23:59:59. Amendment no longer available." };
      if (action === "AMEND") return { type: "success", points: 70, maxPoints: 70, logMsg: `${now} \u2014 P-411: Amendment submitted within GF window.` };
      if (action === "MONITOR") return { type: "feedback", feedback: "P-411 has a GF same-day window closing at 23:59:59. An amendment is needed before the window expires." };
      return { type: "feedback", feedback: "P-411 is GF, non-dutiable, and not utilised. The correct action is to Amend within the same-day window." };
    }

    if (permitId === "P-502") {
      if (action === "MONITOR") return { type: "success", points: 30, maxPoints: 30, logMsg: `${now} \u2014 P-502: Monitoring. No action taken.` };
      return { type: "feedback", feedback: "Permit P-502 is awaiting HSA (Competent Authority) approval. Premature action could disrupt the approval workflow.", error: { tag: "S4-OVERACTION", message: "Acted on AWAITING-CA permit P-502." }, markComplete: true, points: 0, maxPoints: 30 };
    }

    return { type: "feedback", feedback: "No valid action for this permit." };
  };
}

export const BEAT_C_025: BeatCConfig = {
  caseId: "025",
  backLink: "/",
  headerTitle: "CASE #025",
  briefingSubtitle: "Case #025: Apple MacBook Import",
  briefingStartTime: "23:41:07",
  briefingMission: 'Triage <span class="text-white font-bold">4 active CCPs</span> on the board. These were issued via TradeNet for imports. For each, decide: <span class="text-customs-gold">Amend</span>, <span class="text-customs-gold">Cancel</span>, <span class="text-customs-gold">Refund</span>, or <span class="text-customs-gold">Monitor</span>.',
  briefingIntel: [
    { icon: "", text: '&#9989; A <span class="text-customs-green font-medium">healthy CCP</span> (GF payment, non-dutiable) — no action needed', highlightClass: "text-customs-green" },
    { icon: "", text: '&#9203; One CCP has a <span class="text-customs-red font-medium">same-day GF window</span> closing at midnight (GIRO cutoff)', highlightClass: "text-customs-red" },
    { icon: "", text: '&#128274; One CCP is <span class="text-customs-red font-medium">locked</span> — already used at FTZ gate (utilised)', highlightClass: "text-customs-red" },
    { icon: "", text: '&#128209; An <span class="text-customs-amber font-medium">HSA approval</span> is pending (health products CA)', highlightClass: "text-customs-amber" },
  ],
  briefingScoreText: '<span class="text-customs-gold font-bold">200 points</span> max. Points awarded for correct action and timing.',
  permits: [
    {
      id: "P-025", title: "MacBook IN", goods: 'MacBook Pro 16", 500 U, non-dutiable', messageType: "IN",
      state: "APPROVED", paymentCondition: "GF", dutiable: false,
      approvedAt: "09:15", utilisedAt: null, actionsLocked: false, maxPoints: 60,
      correctActionLabel: "Monitor (no action)",
      explanation: "This is a healthy permit \u2014 GF payment, non-dutiable, APPROVED. No short shipment, no errors. The correct action is to Monitor (no action needed).",
      hint: "This is a healthy permit \u2014 no errors, no short shipment, no issues. Does it need any action?",
      onAction: c025Action("P-025"),
    },
    {
      id: "P-310", title: "Auto Parts IN", goods: "Car engine components, dutiable", messageType: "IN",
      state: "UTILISED", paymentCondition: "G1", dutiable: true, dutyPaid: true,
      approvedAt: "08:00", utilisedAt: "08:45", actionsLocked: true, maxPoints: 40,
      correctActionLabel: "Monitor (no action)",
      explanation: "Once utilised for cargo clearance (at 08:45), a permit is locked. No amendment, cancellation, or refund is possible. Monitor only.",
      hint: "This permit was utilised at 08:45. Once utilised, no modifications are possible.",
      onAction: c025Action("P-310"),
    },
    {
      id: "P-411", title: "Textiles OUT", goods: "Fabric rolls for export", messageType: "OUT",
      state: "APPROVED", paymentCondition: "GF", dutiable: false,
      approvedAt: "23:30", utilisedAt: null, hasWindow: true, badge: "WINDOW CLOSING",
      actionsLocked: false, maxPoints: 70, isTimerPermit: true,
      correctActionLabel: "Amend (within GF window)",
      explanation: "GF payment + non-dutiable + not utilised + same day = eligible for amendment before the 23:59:59 window closes.",
      hint: "GF same-day window conditions: GF payment + non-dutiable + not utilised + same day. All four are met.",
      onAction: c025Action("P-411"),
    },
    {
      id: "P-502", title: "Medical Devices", goods: "Surgical instruments, pending HSA", messageType: "IN",
      state: "AWAITING_CA_APPROVAL", paymentCondition: "GF", dutiable: false,
      approvedAt: "\u2014", utilisedAt: null, actionsLocked: false, maxPoints: 30,
      correctActionLabel: "Monitor (no action)",
      explanation: "Permit is still awaiting Competent Authority (HSA) approval. Any premature action would disrupt the approval workflow. Monitor only.",
      hint: "This permit is awaiting HSA approval. Acting prematurely could disrupt the workflow.",
      onAction: c025Action("P-502"),
    },
  ],
  totalMax: 200,
  timer: {
    permitId: "P-411",
    startSeconds: 23 * 3600 + 41 * 60 + 7,
    deadlineSeconds: 23 * 3600 + 59 * 60 + 59,
    simSpeed: 10,
    deadlineLabel: "P-411 GF Window",
    onExpire: { errorTag: "S4-WINDOW-MISS", errorMsg: "Missed P-411's GF same-day window.", maxPoints: 70, logMsg: "P-411 GF window EXPIRED. Amendment no longer available." },
  },
  initialActionLog: [
    "09:15 \u2014 P-025 approved (GF, non-dutiable, MacBook import)",
    "23:30 \u2014 P-411 approved (GF, non-dutiable, textile export, same-day window open)",
    "23:41 \u2014 Dispatcher shift start",
  ],
  hasRefundSubtypes: false,
  hasRefundDetails: false,
  rulebookTitle: "S4 Rules",
  rulebookEntries: [
    { title: "Cancel vs Refund", content: "Cancellation = duty/GST NOT yet paid. Refund = duty/GST HAS been paid." },
    { title: "GF/G7 Same-Day Window", content: "Amend/cancel before 23:59:59 of approval day.", listItems: ["Payment = GF or G7", "Goods = non-dutiable", "Permit = not utilised", "Within same day"] },
    { title: "Utilisation", content: "Once utilised for clearance: no amend, no cancel, no refund." },
    { title: "CA Approval", content: "Permits awaiting Competent Authority approval should not be acted upon." },
  ],
};

/* ───── Case #038: Samsung OLED Transhipment ───── */

function c038Action(permitId: string): (action: ActionType, ctx: ActionContext) => ActionResult {
  return (action, ctx) => {
    const now = ctx.formatSimTime(ctx.simTime);

    if (permitId === "P-140") {
      if (ctx.attemptCount >= 1) {
        return { type: "locked", feedback: "Permit P-140 was used for cargo clearance at 14:30. Once utilised, it cannot be amended, cancelled or refunded.", error: { tag: "S4-LOCK-01", message: "Tried to act on UTILISED permit P-140." }, markComplete: true, points: 0, maxPoints: 40 };
      }
      return { type: "locked", feedback: "Permit P-140 was used for cargo clearance at 14:30. Once utilised, it cannot be amended, cancelled or refunded." };
    }

    if (permitId === "T-038") {
      if (action === "AMEND") return { type: "success", points: 80, maxPoints: 80, logMsg: `${now} \u2014 T-038: Amendment submitted (new vessel/voyage details).` };
      if (action === "CANCEL") return { type: "feedback", feedback: "Cancellation is not appropriate here. The shipment is still valid \u2014 only the vessel has changed. Amend the permit with new vessel details.", error: { tag: "S4-CANCEL-VESSEL", message: "Tried to cancel instead of amend for vessel delay." } };
      if (action === "REFUND") return { type: "feedback", feedback: "No duty/GST was paid for this transhipment. Refund is not applicable.", error: { tag: "S4-REFUND-TSHIP", message: "Attempted refund on non-dutiable transhipment." } };
      if (action === "MONITOR") return { type: "feedback", feedback: "The vessel delay requires action. If you don't update the permit, the goods can't be loaded onto the new vessel.", error: { tag: "S4-MONITOR-DELAY", message: "Chose monitor when amendment needed for vessel delay." } };
    }

    if (permitId === "P-555") {
      if (ctx.timerExpired) return { type: "feedback", feedback: "GF same-day window expired. Cancellation no longer available." };
      if (action === "CANCEL") return { type: "success", points: 60, maxPoints: 60, logMsg: `${now} \u2014 P-555: Cancelled within GF window.` };
      if (action === "AMEND") return { type: "feedback", feedback: "The shipment has been cancelled by the supplier. Amendment won't help \u2014 you need to cancel the permit entirely.", error: { tag: "S4-AMEND-CANCEL", message: "Tried to amend a cancelled shipment." } };
      return { type: "feedback", feedback: "The supplier cancelled the shipment. Cancel the permit before the window closes." };
    }

    if (permitId === "R-200") {
      if (action === "MONITOR") return { type: "success", points: 30, maxPoints: 30, logMsg: `${now} \u2014 R-200: Monitoring. No action taken.` };
      return { type: "feedback", feedback: "Permit R-200 is still awaiting CA approval. Premature action could disrupt the approval workflow.", error: { tag: "S4-OVERACTION", message: "Acted on AWAITING-CA permit." }, markComplete: true, points: 0, maxPoints: 30 };
    }

    return { type: "feedback", feedback: "No valid action for this permit." };
  };
}

export const BEAT_C_038: BeatCConfig = {
  caseId: "038",
  backLink: "/",
  headerTitle: "CASE #038",
  briefingSubtitle: "Case #038: Samsung OLED Transhipment",
  briefingStartTime: "10:15:00",
  briefingMission: 'Triage <span class="text-white font-bold">4 active CCPs/TSHIP permits</span> on the board. For each, decide: <span class="text-customs-gold">Amend</span>, <span class="text-customs-gold">Cancel</span>, <span class="text-customs-gold">Refund</span>, or <span class="text-customs-gold">Monitor</span>.',
  briefingIntel: [
    { icon: "", text: '&#9888;&#65039; A <span class="text-customs-amber font-medium">vessel delay</span> affects the TSHIP permit — bonded truck (A9) already en route to Jurong Port', highlightClass: "text-customs-amber" },
    { icon: "", text: '&#9203; One CCP has a <span class="text-customs-red font-medium">same-day GF window</span> closing (GIRO cutoff)', highlightClass: "text-customs-red" },
    { icon: "", text: '&#128274; Some CCPs may be locked after utilisation (goods cleared through FTZ gate)', highlightClass: "" },
    { icon: "", text: '&#128209; A Competent Authority approval is still pending', highlightClass: "" },
  ],
  briefingScoreText: '<span class="text-customs-gold font-bold">210 points</span> max. Points for correct action and timing.',
  permits: [
    {
      id: "T-038", title: "Samsung OLED TSHIP", goods: "OLED Panels, 2,000 U (transhipment)", messageType: "TSHIP",
      state: "APPROVED", dutiable: false, approvedAt: "09:45", utilisedAt: null,
      badge: "VESSEL DELAY", actionsLocked: false, maxPoints: 80,
      correctActionLabel: "Amend (vessel/voyage update)",
      explanation: "Transhipment permits can be amended when vessel schedules change. The onward vessel is delayed, requiring amendment with new vessel/voyage details.",
      hint: "The onward vessel MV Java Express has been delayed. The permit must be updated with new vessel/voyage details.",
      onAction: c038Action("T-038"),
    },
    {
      id: "P-140", title: "Electronics IN", goods: "Circuit boards, non-dutiable", messageType: "IN",
      state: "UTILISED", dutiable: false, approvedAt: "10:00", utilisedAt: "14:30",
      actionsLocked: true, maxPoints: 40,
      correctActionLabel: "Monitor (no action)",
      explanation: "Once utilised for cargo clearance (at 14:30), a permit is locked. No amendment, cancellation, or refund is possible. Monitor only.",
      hint: "This permit was utilised for cargo clearance at 14:30. Once utilised, no modifications are possible.",
      onAction: c038Action("P-140"),
    },
    {
      id: "P-555", title: "Pharma IN", goods: "Pharmaceutical supplies, non-dutiable", messageType: "IN",
      state: "APPROVED", dutiable: false, approvedAt: "10:10", utilisedAt: null,
      hasWindow: true, badge: "WINDOW CLOSING", actionsLocked: false, maxPoints: 60, isTimerPermit: true,
      correctActionLabel: "Cancel (before window closes)",
      explanation: "GF same-day window is closing. The shipment has been cancelled by the supplier. Cancel the permit before the window expires to avoid charges.",
      hint: "GF payment + non-dutiable + not utilised + same day = eligible for cancellation before the window closes.",
      onAction: c038Action("P-555"),
    },
    {
      id: "R-200", title: "Bonded Storage", goods: "Controlled goods, bonded warehouse", messageType: "REM",
      state: "AWAITING_CA_APPROVAL", dutiable: false, approvedAt: "\u2014", utilisedAt: null,
      actionsLocked: false, maxPoints: 30,
      correctActionLabel: "Monitor (no action)",
      explanation: "Permit is still awaiting Competent Authority approval. Any premature action would disrupt the approval workflow. Monitor only.",
      hint: "Permit is awaiting Competent Authority approval. Any premature action would disrupt the approval workflow.",
      onAction: c038Action("R-200"),
    },
  ],
  totalMax: 210,
  timer: {
    permitId: "P-555",
    startSeconds: 10 * 3600 + 15 * 60,
    deadlineSeconds: 11 * 3600 + 59 * 60 + 59,
    simSpeed: 10,
    deadlineLabel: "P-555 GF Window",
    onExpire: { errorTag: "S4-WINDOW-MISS", errorMsg: "Missed P-555's GF same-day window.", maxPoints: 60, logMsg: "P-555 GF window EXPIRED." },
  },
  initialActionLog: [
    "09:45 \u2014 T-038 approved (TTI, Samsung OLED transhipment)",
    "10:00 \u2014 MV Java Express delayed. Vessel ETA revised.",
    "10:10 \u2014 P-555 approved (GF, non-dutiable, same-day window open)",
    "10:15 \u2014 Dispatcher shift start",
  ],
  hasRefundSubtypes: false,
  hasRefundDetails: false,
  rulebookTitle: "S4 Rules",
  rulebookEntries: [
    { title: "Cancel vs Refund", content: "Cancellation = duty/GST NOT yet paid. Refund = duty/GST HAS been paid." },
    { title: "Transhipment Amendments", content: "Transhipment permits can be amended for vessel changes, quantity corrections, or other operational updates." },
    { title: "GF/G7 Same-Day Window", content: "Amend/cancel before window closes on approval day.", listItems: ["Payment = GF or G7", "Goods = non-dutiable", "Permit = not utilised", "Within same day"] },
    { title: "Utilisation", content: "Once utilised for clearance: no amend, no cancel, no refund." },
    { title: "CA Approval", content: "Permits awaiting Competent Authority approval should not be acted upon." },
  ],
};

/* ───── Case #052: Precision Optics Export ───── */

function c052Action(permitId: string): (action: ActionType, ctx: ActionContext) => ActionResult {
  return (action, ctx) => {
    const now = "14:4" + Math.floor(Math.random() * 10);

    if (permitId === "P-330") {
      if (ctx.attemptCount >= 1) {
        return { type: "locked", feedback: "Permit P-330 was used for cargo clearance at 10:45. Once utilised, it cannot be amended, cancelled or refunded.", error: { tag: "S4-LOCK-01", message: "Tried to act on UTILISED permit P-330." }, markComplete: true, points: 0, maxPoints: 40 };
      }
      return { type: "locked", feedback: "Permit P-330 was used for cargo clearance at 10:45. Once utilised, it cannot be amended, cancelled or refunded." };
    }

    if (permitId === "E-052") {
      if (action === "AMEND") return { type: "success", points: 80, maxPoints: 80, logMsg: `${now} \u2014 E-052: Amendment submitted. Container number corrected.` };
      if (action === "CANCEL") return { type: "feedback", feedback: "Cancellation would void the entire permit. The shipment is still going \u2014 only the container number needs correcting. Use Amend.", error: { tag: "S4-CANCEL-VS-AMEND", message: "Chose cancel instead of amend for E-052." } };
      if (action === "REFUND") return { type: "feedback", feedback: "No duty/GST was paid (non-dutiable export with GF). There is nothing to refund. The container number just needs amending.", error: { tag: "S4-REFUND-NOPAY", message: "Tried to refund non-dutiable export E-052." } };
      if (action === "MONITOR") return { type: "feedback", feedback: "The shipping agent flagged a container number error. If uncorrected, the vessel may depart with the wrong container reference. Act before it\u2019s too late.", error: { tag: "S4-UNDERACTION", message: "Chose to monitor E-052 despite container error." } };
    }

    if (permitId === "P-660") {
      if (action === "CANCEL") return { type: "success", points: 80, maxPoints: 80, logMsg: `${now} \u2014 P-660: Permit cancelled. Order cancelled by buyer.` };
      if (action === "AMEND") return { type: "feedback", feedback: "Amendment updates permit details, but the entire order has been cancelled by the buyer. The permit should be cancelled outright.", error: { tag: "S4-AMEND-VS-CANCEL", message: "Chose amend instead of cancel for P-660." } };
      if (action === "REFUND") return { type: "feedback", feedback: "No duty/GST was paid (non-dutiable, GF payment). There is nothing to refund \u2014 cancel the permit instead.", error: { tag: "S4-REFUND-NOPAY", message: "Tried to refund non-dutiable import P-660." } };
      if (action === "MONITOR") return { type: "feedback", feedback: "The buyer has cancelled the order. Leaving the permit active wastes quota and may cause issues at clearance. Cancel it.", error: { tag: "S4-UNDERACTION", message: "Chose to monitor P-660 despite order cancellation." } };
    }

    if (permitId === "R-100") {
      if (action === "MONITOR") return { type: "success", points: 40, maxPoints: 40, logMsg: `${now} \u2014 R-100: Monitoring. No action taken.` };
      return { type: "feedback", feedback: "Permit R-100 is still awaiting Competent Authority approval for strategic goods export. Premature action could disrupt the approval workflow.", error: { tag: "S4-OVERACTION", message: "Acted on AWAITING-CA permit R-100." }, markComplete: true, points: 0, maxPoints: 40 };
    }

    return { type: "feedback", feedback: "No valid action for this permit." };
  };
}

export const BEAT_C_052: BeatCConfig = {
  caseId: "052",
  backLink: "/",
  headerTitle: "",
  briefingSubtitle: "Case #052: Precision Optics Export",
  briefingStartTime: "14:40",
  briefingMission: 'Triage <span class="text-white font-bold">4 active CCPs</span> on the board. Each was issued via TradeNet for export. For each permit, decide the correct post-clearance action: <span class="text-customs-gold">Amend</span>, <span class="text-customs-gold">Cancel</span>, <span class="text-customs-gold">Refund</span>, or <span class="text-customs-gold">Monitor</span> (no action).',
  briefingIntel: [
    { icon: "", text: '&#9888;&#65039; A <span class="text-customs-amber font-medium">container number error</span> on CCP E-052 (must correct before vessel ETD)', highlightClass: "text-customs-amber" },
    { icon: "", text: '&#128274; One CCP is <span class="text-customs-red font-medium">locked</span> — already presented at port gate and utilised', highlightClass: "text-customs-red" },
    { icon: "", text: '&#10060; A buyer has <span class="text-customs-amber font-medium">cancelled an order</span> — goods not yet loaded', highlightClass: "text-customs-amber" },
    { icon: "", text: '&#128209; A <span class="text-customs-amber font-medium">strategic goods</span> CA approval pending (export control)', highlightClass: "text-customs-amber" },
  ],
  briefingScoreText: '<span class="text-customs-gold font-bold">240 points</span> max. Points awarded for correct action selection.',
  permits: [
    {
      id: "E-052", title: "Optics OUT", goods: "Precision optical lenses, 300 U", messageType: "OUT",
      state: "APPROVED", paymentCondition: "GF", dutiable: false,
      approvedAt: "14:30", utilisedAt: null, badge: "CONTAINER ERROR",
      actionsLocked: false, maxPoints: 80,
      correctActionLabel: "Amend (container number)",
      explanation: "GF payment + non-dutiable + not utilised + export permit = eligible for amendment. The container number (EURU4456789) needs correction before the vessel departs.",
      hint: "The shipping agent flagged a container number error. The container number EURU4456789 needs correction.",
      onAction: c052Action("E-052"),
    },
    {
      id: "P-330", title: "Chemicals OUT", goods: "Industrial chemicals, containerised", messageType: "OUT",
      state: "UTILISED", paymentCondition: "G1", dutiable: false,
      approvedAt: "09:00", utilisedAt: "10:45", actionsLocked: true, maxPoints: 40,
      correctActionLabel: "Monitor (no action)",
      explanation: "Once utilised for cargo clearance (at 10:45), a permit is locked. No amendment, cancellation, or refund is possible. Monitor only.",
      hint: "This permit was utilised at 10:45. Once utilised, no modifications are possible.",
      onAction: c052Action("P-330"),
    },
    {
      id: "P-660", title: "Machinery IN", goods: "CNC machinery parts, non-dutiable", messageType: "IN",
      state: "APPROVED", paymentCondition: "GF", dutiable: false,
      approvedAt: "11:20", utilisedAt: null, badge: "ORDER CANCELLED",
      actionsLocked: false, maxPoints: 80,
      correctActionLabel: "Cancel (order cancelled)",
      explanation: "GF payment + non-dutiable + not utilised + buyer cancelled = eligible for cancellation. Cancel the permit before goods arrive.",
      hint: "The buyer has cancelled the order. The permit should be cancelled to avoid wasting quota.",
      onAction: c052Action("P-660"),
    },
    {
      id: "R-100", title: "Strategic Goods", goods: "Controlled items, export licence pending", messageType: "OUT",
      state: "AWAITING_CA_APPROVAL", paymentCondition: "GF", dutiable: false,
      approvedAt: "\u2014", utilisedAt: null, actionsLocked: false, maxPoints: 40,
      correctActionLabel: "Monitor (no action)",
      explanation: "Permit is still awaiting Competent Authority approval for strategic goods export. Any premature action would disrupt the approval workflow. Monitor only.",
      hint: "This permit is awaiting CA approval for strategic goods export. Acting prematurely could disrupt the workflow.",
      onAction: c052Action("R-100"),
    },
  ],
  totalMax: 240,
  initialActionLog: [
    "14:30 \u2014 E-052 approved (Optics OUT, GF, container EURU4456789)",
    "14:35 \u2014 Shipping agent reports container number error on E-052",
    "14:40 \u2014 Dispatcher shift start",
  ],
  hasRefundSubtypes: false,
  hasRefundDetails: false,
  rulebookTitle: "S4 Rules",
  rulebookEntries: [
    { title: "Cancel vs Refund", content: "Cancellation = duty/GST NOT yet paid. Refund = duty/GST HAS been paid." },
    { title: "GF/G7 Same-Day Window", content: "Amend/cancel before window closes on approval day.", listItems: ["Payment = GF or G7", "Goods = non-dutiable", "Permit = not utilised", "Within same day"] },
    { title: "Utilisation", content: "Once utilised for clearance: no amend, no cancel, no refund." },
    { title: "CA Approval", content: "Permits awaiting Competent Authority approval should not be acted upon." },
    { title: "Container Corrections", content: "If a container number error is identified before utilisation, amend the permit. Cancellation voids the entire permit unnecessarily." },
  ],
};
