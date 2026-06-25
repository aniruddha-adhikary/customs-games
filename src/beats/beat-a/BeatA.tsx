import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { CaseFilePanel } from "./CaseFilePanel";
import {
  getFieldStatus,
  validatePermit,
  scorePermit,
  type ValidationError,
  type ScoringResult,
} from "./formRules";
import type { MessageType } from "../../data/case014";

type ScaffoldingLevel = 1 | 2;

const INITIAL_VALUES: Record<string, string> = {
  messageType: "",
  declarationType: "",
  declaringAgentUEN: "199804321D",
  importerUEN: "",
  consignee: "",
  supplier: "",
  placeOfReleaseFTZ: "",
  placeOfReceiptOthers: "",
  placeOfReceiptExemption: "",
  hsCode: "",
  hsQuantity: "",
  hsUnit: "",
  packingOuter: "",
  packingOuterUnit: "",
  packingInner: "",
  packingInnerUnit: "",
  cargoPackingType: "",
  transportMode: "",
  invoiceCurrency: "",
  exchangeRate: "",
  cifValue: "",
  freight: "",
  insurance: "",
  grossWeight: "",
  grossWeightUnit: "",
  paymentCondition: "",
};

const SCOREABLE_FIELDS = [
  "messageType", "declarationType", "importerUEN", "placeOfReleaseFTZ",
  "placeOfReceiptOthers", "hsCode", "hsQuantity", "hsUnit",
  "packingOuter", "packingOuterUnit", "packingInner", "packingInnerUnit",
  "cargoPackingType", "transportMode", "invoiceCurrency", "exchangeRate",
  "cifValue", "freight", "insurance", "grossWeight", "grossWeightUnit",
  "paymentCondition",
];

export function BeatA() {
  const [values, setValues] = useState<Record<string, string>>(INITIAL_VALUES);
  const [scaffolding, setScaffolding] = useState<ScaffoldingLevel>(1);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [errorLedger, setErrorLedger] = useState<ValidationError[]>([]);
  const [showLedger, setShowLedger] = useState(false);
  const [showRulebook, setShowRulebook] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<ScoringResult | null>(null);
  const [showCaseFile, setShowCaseFile] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const msgType = values.messageType as MessageType | "";

  const filledCount = SCOREABLE_FIELDS.filter(
    (f) => values[f] && values[f] !== ""
  ).length;
  const totalFields = SCOREABLE_FIELDS.length;
  const progressPct = Math.round((filledCount / totalFields) * 100);

  const setValue = useCallback(
    (field: string, value: string) => {
      setTouched((prev) => new Set(prev).add(field));
      setValues((prev) => {
        const next = { ...prev, [field]: value };
        if (field === "messageType") {
          next.declarationType = "";
          next.placeOfReleaseFTZ = "";
          next.placeOfReceiptOthers = "";
        }
        const errs = validatePermit(next, scaffolding);
        setErrors(errs);
        errs.forEach((e) => {
          setErrorLedger((ledger) => {
            if (ledger.some((l) => l.code === e.code)) return ledger;
            return [...ledger, e];
          });
        });
        return next;
      });
    },
    [scaffolding],
  );

  const handleSubmit = useCallback(() => {
    const errs = validatePermit(values, scaffolding);
    const hardErrors = errs.filter((e) => e.severity === "hard");
    if (hardErrors.length > 0) {
      setErrors(errs);
      return;
    }
    setShowStamp(true);
    setTimeout(() => {
      const result = scorePermit(values);
      setScore(result);
      setSubmitted(true);
    }, 1200);
  }, [values, scaffolding]);

  const handleRetry = useCallback(() => {
    setValues(INITIAL_VALUES);
    setErrors([]);
    setErrorLedger([]);
    setSubmitted(false);
    setScore(null);
    setShowStamp(false);
    setTouched(new Set());
  }, []);

  const hardErrors = errors.filter((e) => e.severity === "hard");
  const isStampable = hardErrors.length === 0 && msgType !== "";

  const fieldVisible = (fieldId: string) =>
    getFieldStatus(fieldId, msgType) !== "H";

  const declTypeOptions =
    msgType === "IN"
      ? [
          { value: "APS", label: "APS — Standard Import Permit" },
          { value: "APS_PREF", label: "APS — Preferential Tariff" },
        ]
      : msgType === "OUT"
        ? [{ value: "OUT_STD", label: "Standard Export" }]
        : msgType === "TSHIP"
          ? [
              { value: "TTI", label: "TTI — Through Transhipment" },
              { value: "IGM", label: "IGM — Inter-Gateway Movement" },
              { value: "REM", label: "Removal (REM)" },
              { value: "BRE", label: "Blanket Removal (BRE)" },
            ]
          : [];

  if (submitted && score) {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">
            &larr;
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-white">
            DECLARATION DESK &mdash; RESULTS
          </h1>
        </header>

        <div className="flex-1 overflow-auto p-3 sm:p-6 animate-stamp-flash">
          <div className="max-w-2xl mx-auto">
            {showStamp && (
              <div className="text-center mb-6">
                <div className="inline-block border-4 border-customs-red rounded-lg px-8 py-4 animate-stamp shadow-lg shadow-customs-red/20">
                  <span className="text-customs-red font-bold text-3xl tracking-widest">
                    STAMPED
                  </span>
                </div>
              </div>
            )}

            <div className="bg-customs-panel border border-customs-gold/30 rounded-xl p-4 sm:p-6 mb-4 animate-score-reveal">
              <h2 className="text-customs-gold text-xl font-bold text-center mb-2">
                Faithfulness: {Math.round((score.total / score.max) * 100)}%
              </h2>
              <p className="text-center text-customs-muted text-sm mb-1">
                {score.total} of {score.max} fields correct
              </p>
              <p className="text-center text-xs mb-4">
                {score.total === score.max ? (
                  <span className="text-customs-green font-bold">Perfect declaration!</span>
                ) : score.total >= score.max * 0.8 ? (
                  <span className="text-customs-gold">Good work — review the red fields below.</span>
                ) : (
                  <span className="text-customs-amber">Review the case file and try again.</span>
                )}
              </p>

              <div className="space-y-1">
                {score.details.map((d) => (
                  <div
                    key={d.field}
                    className={`flex items-center justify-between p-2 rounded text-xs ${
                      d.correct
                        ? "bg-customs-green/10 border border-customs-green/20"
                        : "bg-customs-red/10 border border-customs-red/20"
                    }`}
                  >
                    <span className="text-white font-medium">{d.field}</span>
                    <div className="flex items-center gap-2 text-right">
                      {!d.correct && d.yours !== "—" && (
                        <span className="text-customs-red line-through">
                          {d.yours}
                        </span>
                      )}
                      <span
                        className={
                          d.correct ? "text-customs-green" : "text-customs-gold"
                        }
                      >
                        {d.correct ? d.yours : d.expected}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {errorLedger.length > 0 && (
              <div className="bg-customs-panel border border-customs-border rounded-xl p-4 sm:p-6 mb-4">
                <h3 className="text-customs-amber font-bold text-sm mb-3">
                  Error Ledger ({errorLedger.length} traps hit)
                </h3>
                <div className="space-y-2">
                  {errorLedger.map((e, i) => (
                    <div
                      key={i}
                      className="text-xs p-2 bg-customs-surface rounded border border-customs-border"
                    >
                      <span className="text-customs-amber font-mono">
                        {e.code}
                      </span>
                      <p className="text-customs-muted mt-0.5">{e.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center text-[10px] text-customs-muted border-t border-customs-border pt-3 mb-4">
              An untrue, inaccurate, or incomplete declaration is an offence
              under the Customs Act (Cap 70) and the Regulation of Imports and
              Exports Act (Cap 272A).
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 bg-customs-surface border border-customs-gold text-customs-gold font-bold py-2.5 rounded-lg hover:bg-customs-gold/10 transition-colors cursor-pointer"
              >
                TRY AGAIN
              </button>
              <Link
                to="/"
                className="flex-1 bg-customs-gold text-customs-dark font-bold py-2.5 rounded-lg no-underline hover:bg-customs-gold/90 transition-colors text-center"
              >
                RETURN
              </Link>
            </div>
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
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">
            &larr;
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-white">
            DECLARATION DESK
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRulebook(!showRulebook)}
            className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-gold hover:bg-customs-panel cursor-pointer"
          >
            Rulebook
          </button>
          <button
            onClick={() => setShowLedger(!showLedger)}
            className={`text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 hover:bg-customs-panel cursor-pointer ${errorLedger.length > 0 ? "text-customs-amber" : "text-customs-muted"}`}
          >
            Errors ({errorLedger.length})
          </button>
          <button
            onClick={() => setShowCaseFile(!showCaseFile)}
            className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer sm:hidden"
          >
            Case
          </button>
          <button
            onClick={() => setScaffolding((s) => (s === 1 ? 2 : 1) as ScaffoldingLevel)}
            className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer"
          >
            {scaffolding === 1 ? "Guided" : "Open"}
          </button>
        </div>
      </header>

      {/* Progress bar */}
      {msgType && (
        <div className="bg-customs-navy px-3 sm:px-6 py-1.5 border-b border-customs-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-customs-muted whitespace-nowrap">
              {filledCount}/{totalFields} fields
            </span>
            <div className="flex-1 h-1.5 bg-customs-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-customs-gold rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] text-customs-gold font-bold">
              {progressPct}%
            </span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Case file — left panel (desktop), overlay (mobile) */}
        <div
          className={`${showCaseFile ? "fixed inset-0 z-40 sm:relative sm:inset-auto" : "hidden"} sm:block sm:w-80 lg:w-96 flex-shrink-0 border-r border-customs-border overflow-auto bg-customs-dark`}
        >
          <button
            onClick={() => setShowCaseFile(false)}
            className="sm:hidden absolute top-2 right-2 z-50 text-customs-muted hover:text-white bg-customs-panel rounded-full w-8 h-8 flex items-center justify-center border border-customs-border cursor-pointer"
          >
            &times;
          </button>
          <CaseFilePanel />
        </div>

        {/* Permit form — right panel */}
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="max-w-xl mx-auto space-y-4">
            {/* Intro card */}
            {!msgType && (
              <div className="bg-customs-panel border border-customs-gold/20 rounded-lg p-4 text-center animate-fade-in">
                <p className="text-customs-gold text-sm">
                  You are a Declaring Agent. Build the correct permit for Case
                  #014.
                </p>
                <p className="text-customs-muted text-xs mt-1">
                  Start by selecting Message Type below.
                </p>
              </div>
            )}

            {/* Classification section */}
            <FormSection title="CLASSIFICATION">
              <FormSelect
                label="Message Type"
                value={values.messageType}
                onChange={(v) => setValue("messageType", v)}
                options={[
                  { value: "IN", label: "IN (Import)" },
                  { value: "OUT", label: "OUT (Export)" },
                  { value: "TSHIP", label: "Transhipment / Movement" },
                  { value: "COO", label: "Certificate of Origin" },
                ]}
                tooltip={
                  scaffolding === 1
                    ? "Message Type = direction of movement. Goods entering Singapore = IN."
                    : undefined
                }
                error={errors.find((e) => e.field === "messageType")?.message}
              />
              {msgType && (
                <FormSelect
                  label="Declaration Type"
                  value={values.declarationType}
                  onChange={(v) => setValue("declarationType", v)}
                  options={declTypeOptions}
                  tooltip={
                    scaffolding === 1
                      ? "Declaration Type narrows what fields TradeNet requires. Watch the form change."
                      : undefined
                  }
                />
              )}
            </FormSection>

            {/* Parties section */}
            {msgType && (
              <FormSection title="PARTIES">
                <FormField
                  label="Declaring Agent UEN"
                  value={values.declaringAgentUEN}
                  onChange={(v) => setValue("declaringAgentUEN", v)}
                  disabled
                />
                {fieldVisible("importerUEN") && (
                  <FormField
                    label="Importer UEN"
                    value={values.importerUEN}
                    onChange={(v) => setValue("importerUEN", v)}
                    placeholder="e.g. 201835672K"
                    tooltip={
                      scaffolding === 1
                        ? "UEN = the importer's registered entity number. Check the invoice."
                        : undefined
                    }
                    error={errors.find((e) => e.field === "importerUEN")?.message}
                  />
                )}
                <FormField
                  label="Consignee"
                  value={values.consignee}
                  onChange={(v) => setValue("consignee", v)}
                  placeholder="Consignee name"
                />
                <FormField
                  label="Supplier / Shipper"
                  value={values.supplier}
                  onChange={(v) => setValue("supplier", v)}
                  placeholder="Overseas supplier"
                />
              </FormSection>
            )}

            {/* Place of Release / Receipt */}
            {msgType && (
              <FormSection title="PLACE OF RELEASE / RECEIPT">
                {fieldVisible("placeOfReleaseFTZ") && (
                  <FormSelect
                    label="Place of Release (FROM)"
                    value={values.placeOfReleaseFTZ}
                    onChange={(v) => setValue("placeOfReleaseFTZ", v)}
                    options={[
                      { value: "T15", label: "T15 — Tanjong Pagar Terminal FTZ" },
                      { value: "T16", label: "T16 — Keppel Terminal FTZ" },
                      { value: "C01", label: "C01 — Changi Airfreight Centre" },
                      { value: "PP1", label: "PP1 — Pasir Panjang Terminal FTZ" },
                    ]}
                    tooltip={
                      scaffolding === 1
                        ? "For an IN permit, 'release FROM' = where goods leave Customs control."
                        : undefined
                    }
                  />
                )}
                {fieldVisible("placeOfReceiptOthers") && (
                  <FormSelect
                    label="Place of Receipt (TO)"
                    value={values.placeOfReceiptOthers}
                    onChange={(v) => setValue("placeOfReceiptOthers", v)}
                    options={[
                      { value: "Others", label: "Others (general delivery)" },
                      { value: "ME", label: "ME — Major Exporter scheme" },
                      { value: "AISS", label: "AISS" },
                      { value: "IGDS", label: "IGDS" },
                      { value: "RCNOSTK", label: "RCNOSTK" },
                      { value: "SPNOSTK", label: "SPNOSTK" },
                      { value: "RELIEF", label: "RELIEF — controlled goods <= SGD 400" },
                      { value: "TRADESP", label: "TRADESP — trade samples <= SGD 400" },
                    ]}
                    tooltip={
                      scaffolding === 1
                        ? "For an IN permit, 'receipt TO' = where goods go next. Standard delivery = Others."
                        : undefined
                    }
                  />
                )}
              </FormSection>
            )}

            {/* Goods description */}
            {msgType && (
              <FormSection title="GOODS DESCRIPTION">
                <FormField
                  label="HS Code"
                  value={values.hsCode}
                  onChange={(v) => setValue("hsCode", v)}
                  placeholder="e.g. 2204.21"
                  tooltip={
                    scaffolding === 1
                      ? "Wine = Chapter 22, Heading 2204. 750ml still bottles = sub-heading .21"
                      : undefined
                  }
                  error={errors.find((e) => e.field === "hsCode")?.message}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label="HS Quantity"
                    value={values.hsQuantity}
                    onChange={(v) => setValue("hsQuantity", v)}
                    placeholder="e.g. 900.000"
                    type="text"
                    tooltip={
                      scaffolding === 1
                        ? "Enter qty in STCCED-prescribed unit (LTR for wine). 1,200 x 0.75 = 900.000"
                        : undefined
                    }
                    error={errors.find((e) => e.field === "hsQuantity")?.message}
                  />
                  <FormSelect
                    label="HS Unit"
                    value={values.hsUnit}
                    onChange={(v) => setValue("hsUnit", v)}
                    options={[
                      { value: "LTR", label: "LTR (litres)" },
                      { value: "BOT", label: "BOT (bottles)" },
                      { value: "KGM", label: "KGM (kg)" },
                      { value: "PCS", label: "PCS (pieces)" },
                    ]}
                    error={errors.find((e) => e.field === "hsUnit")?.message}
                  />
                </div>
              </FormSection>
            )}

            {/* Packing */}
            {msgType && (
              <FormSection title="PACKING HIERARCHY">
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label="Outer Pack Qty"
                    value={values.packingOuter}
                    onChange={(v) => setValue("packingOuter", v)}
                    placeholder="e.g. 100"
                    type="text"
                  />
                  <FormSelect
                    label="Outer Pack Unit"
                    value={values.packingOuterUnit}
                    onChange={(v) => setValue("packingOuterUnit", v)}
                    options={[
                      { value: "CTN", label: "CTN (carton)" },
                      { value: "PLT", label: "PLT (pallet)" },
                      { value: "BOX", label: "BOX" },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label="In-Pack Qty"
                    value={values.packingInner}
                    onChange={(v) => setValue("packingInner", v)}
                    placeholder="e.g. 12"
                    type="text"
                    tooltip={
                      scaffolding === 1
                        ? "Dutiable liquor requires packing declared to the bottle."
                        : undefined
                    }
                    error={errors.find((e) => e.field === "packingInner")?.message}
                  />
                  <FormSelect
                    label="In-Pack Unit"
                    value={values.packingInnerUnit}
                    onChange={(v) => setValue("packingInnerUnit", v)}
                    options={[
                      { value: "BOT", label: "BOT (bottle)" },
                      { value: "CAN", label: "CAN" },
                      { value: "PKT", label: "PKT (packet)" },
                    ]}
                  />
                </div>
              </FormSection>
            )}

            {/* Transport */}
            {msgType && (
              <FormSection title="TRANSPORT">
                <div className="grid grid-cols-2 gap-2">
                  <FormSelect
                    label="Cargo Packing Type"
                    value={values.cargoPackingType}
                    onChange={(v) => setValue("cargoPackingType", v)}
                    options={[
                      { value: "9", label: "9 — Containerised" },
                      { value: "5", label: "5 — Non-containerised" },
                    ]}
                    error={errors.find((e) => e.field === "cargoPackingType")?.message}
                  />
                  <FormSelect
                    label="Transport Mode"
                    value={values.transportMode}
                    onChange={(v) => setValue("transportMode", v)}
                    options={[
                      { value: "1", label: "1 — Sea" },
                      { value: "2", label: "2 — Rail" },
                      { value: "3", label: "3 — Road" },
                      { value: "4", label: "4 — Air" },
                      { value: "5", label: "5 — Post" },
                      { value: "7", label: "7 — Pipeline" },
                    ]}
                    tooltip={
                      scaffolding === 1
                        ? "Check the Bill of Lading: vessel name, port of loading."
                        : undefined
                    }
                  />
                </div>
              </FormSection>
            )}

            {/* Value declaration */}
            {msgType && (
              <FormSection title="VALUE DECLARATION">
                <div className="grid grid-cols-2 gap-2">
                  <FormSelect
                    label="Invoice Currency"
                    value={values.invoiceCurrency}
                    onChange={(v) => setValue("invoiceCurrency", v)}
                    options={[
                      { value: "EUR", label: "EUR" },
                      { value: "USD", label: "USD" },
                      { value: "SGD", label: "SGD" },
                      { value: "GBP", label: "GBP" },
                    ]}
                    error={errors.find((e) => e.field === "invoiceCurrency")?.message}
                  />
                  <FormField
                    label="Exchange Rate (to SGD)"
                    value={values.exchangeRate}
                    onChange={(v) => setValue("exchangeRate", v)}
                    placeholder="e.g. 1.46"
                    type="text"
                  />
                </div>
                <FormField
                  label="CIF Value (SGD)"
                  value={values.cifValue}
                  onChange={(v) => setValue("cifValue", v)}
                  placeholder="Total CIF in SGD"
                  type="text"
                  tooltip={
                    scaffolding === 1
                      ? "The invoice says FOB. CIF = FOB + Freight + Insurance. Both are on the documents."
                      : undefined
                  }
                  error={errors.find((e) => e.field === "cifValue")?.message}
                />
                {fieldVisible("freight") && (
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      label="Freight (EUR)"
                      value={values.freight}
                      onChange={(v) => setValue("freight", v)}
                      placeholder="e.g. 480"
                      type="text"
                    />
                    <FormField
                      label="Insurance (EUR)"
                      value={values.insurance}
                      onChange={(v) => setValue("insurance", v)}
                      placeholder="e.g. 96"
                      type="text"
                    />
                  </div>
                )}
              </FormSection>
            )}

            {/* Gross weight */}
            {msgType && (
              <FormSection title="WEIGHT">
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label="Gross Weight"
                    value={values.grossWeight}
                    onChange={(v) => setValue("grossWeight", v)}
                    placeholder="e.g. 1.920"
                    type="text"
                    tooltip={
                      scaffolding === 1
                        ? "Use the B/L gross weight. Sea shipments = TNE."
                        : undefined
                    }
                    error={errors.find((e) => e.field === "grossWeight")?.message}
                  />
                  <FormSelect
                    label="Gross Weight Unit"
                    value={values.grossWeightUnit}
                    onChange={(v) => setValue("grossWeightUnit", v)}
                    options={[
                      { value: "TNE", label: "TNE (metric tonnes)" },
                      { value: "KGM", label: "KGM (kilograms)" },
                    ]}
                    error={errors.find((e) => e.field === "grossWeightUnit")?.message}
                  />
                </div>
              </FormSection>
            )}

            {/* Payment */}
            {msgType && fieldVisible("paymentCondition") && (
              <FormSection title="PAYMENT">
                <FormSelect
                  label="Payment Condition"
                  value={values.paymentCondition}
                  onChange={(v) => setValue("paymentCondition", v)}
                  options={[
                    { value: "G1", label: "G1 — Pay on approval" },
                    { value: "GF", label: "GF — GIRO (IBG)" },
                    { value: "G7", label: "G7 — GIRO (IBG)" },
                  ]}
                  tooltip={
                    scaffolding === 1
                      ? "G1 = pay now. Wine is dutiable, so G1 is correct here."
                      : undefined
                  }
                />
              </FormSection>
            )}

            {/* Submit button */}
            {msgType && (
              <div className="pb-6">
                {errors.filter((e) => touched.has(e.field)).length > 0 && (
                  <div className="mb-3 bg-customs-panel border border-customs-border rounded-lg p-3">
                    <h4 className="text-xs text-customs-amber font-bold mb-2">
                      Validation Issues
                    </h4>
                    {errors.filter((e) => touched.has(e.field)).map((e, i) => (
                      <div
                        key={i}
                        className={`text-xs p-1.5 rounded mb-1 ${
                          e.severity === "hard"
                            ? "bg-customs-red/10 text-customs-red"
                            : "bg-customs-amber/10 text-customs-amber"
                        }`}
                      >
                        <span className="font-mono text-[10px] opacity-70">[{e.code}]</span>{" "}
                        {e.message}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!isStampable}
                  className={`w-full py-3 rounded-lg font-bold text-lg transition-colors cursor-pointer ${
                    isStampable
                      ? "bg-customs-red text-white hover:bg-customs-red/90 animate-pulse-glow"
                      : "bg-customs-surface text-customs-muted cursor-not-allowed"
                  }`}
                >
                  STAMP & SUBMIT
                </button>
                {!isStampable && hardErrors.length > 0 && (
                  <p className="text-xs text-customs-red text-center mt-1">
                    Clear all hard errors before submitting
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Ledger drawer */}
      {showLedger && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/50" onClick={() => setShowLedger(false)} />
          <div className="w-80 sm:w-96 bg-customs-navy border-l border-customs-border overflow-auto animate-slide-in p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-customs-amber font-bold">Error Ledger</h3>
              <button onClick={() => setShowLedger(false)} className="text-customs-muted hover:text-white cursor-pointer bg-transparent border-0 text-lg">&times;</button>
            </div>
            {errorLedger.length === 0 ? (
              <p className="text-customs-muted text-sm">No errors recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {errorLedger.map((e, i) => (
                  <div key={i} className="text-xs p-2 bg-customs-surface rounded border border-customs-border">
                    <span className="text-customs-amber font-mono">{e.code}</span>
                    <p className="text-customs-muted mt-0.5">{e.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rulebook drawer */}
      {showRulebook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/50" onClick={() => setShowRulebook(false)} />
          <div className="w-80 sm:w-96 bg-customs-navy border-l border-customs-border overflow-auto animate-slide-in p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-customs-gold font-bold">Rulebook</h3>
              <button onClick={() => setShowRulebook(false)} className="text-customs-muted hover:text-white cursor-pointer bg-transparent border-0 text-lg">&times;</button>
            </div>
            <div className="space-y-3 text-xs text-customs-muted">
              <div>
                <h4 className="text-white font-medium mb-1">Message Types</h4>
                <p>IN = Import, OUT = Export, Transhipment/Movement, COO</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">HS Code</h4>
                <p>Still wine in containers &le; 2L: 2204.21. Declare to full digit level per STCCED 2022.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">HS Qty Unit</h4>
                <p>STCCED 2022 unit for 2204.21 is LTR (litres), not bottles. Convert: bottles x 0.75L.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Packing (Liquor)</h4>
                <p>Dutiable liquor must be declared to bottle level. Outer: CTN, In-pack: BOT.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Valuation (FOB)</h4>
                <p>When INCOTERM = FOB, add freight + insurance to get CIF. CIF = FOB + Freight + Insurance.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Gross Weight</h4>
                <p>Sea = TNE (metric tonnes). Air = KGM. Convert: kg &divide; 1000 = TNE.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Payment</h4>
                <p>G1 = pay at approval. GF/G7 = GIRO. GF/G7 same-day window for non-dutiable only.</p>
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

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-customs-panel border border-customs-border rounded-lg overflow-hidden animate-fade-in">
      <div className="bg-customs-surface px-3 py-1.5 border-b border-customs-border">
        <h3 className="text-[10px] text-customs-gold uppercase tracking-wider font-bold">
          {title}
        </h3>
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  tooltip,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  tooltip?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-customs-muted mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-customs-surface border rounded px-2.5 py-1.5 text-sm text-white placeholder-customs-muted/50 focus:outline-none focus:border-customs-gold ${
          error ? "border-customs-red" : "border-customs-border"
        } ${disabled ? "opacity-60" : ""}`}
      />
      {tooltip && (
        <p className="text-[10px] text-customs-blue mt-0.5">{tooltip}</p>
      )}
      {error && (
        <p className="text-[10px] text-customs-red mt-0.5">{error}</p>
      )}
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  tooltip,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  tooltip?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-customs-muted mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-customs-surface border rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-customs-gold appearance-none cursor-pointer ${
          error ? "border-customs-red" : "border-customs-border"
        }`}
      >
        <option value="">— select —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {tooltip && (
        <p className="text-[10px] text-customs-blue mt-0.5">{tooltip}</p>
      )}
      {error && (
        <p className="text-[10px] text-customs-red mt-0.5">{error}</p>
      )}
    </div>
  );
}
