import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { CaseFilePanel038 } from "./CaseFilePanel038";
import type { MessageType } from "../../data/case014";
import { CASE_038 } from "../../data/case038";

type ScaffoldingLevel = 1 | 2;

interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: "hard" | "soft";
}

interface ScoringResult {
  total: number;
  max: number;
  details: { field: string; correct: boolean; yours: string; expected: string }[];
}

type FieldStatus = "R" | "O" | "H";

const FIELD_VIS: Record<string, Record<string, FieldStatus>> = {
  importerUEN: { IN: "R", OUT: "H", TSHIP: "H", COO: "H" },
  placeOfReleaseFTZ: { IN: "R", OUT: "H", TSHIP: "R", COO: "H" },
  placeOfReceiptOthers: { IN: "R", OUT: "H", TSHIP: "H", COO: "H" },
  placeOfReceiptFTZ: { IN: "H", OUT: "R", TSHIP: "R", COO: "H" },
  paymentCondition: { IN: "R", OUT: "R", TSHIP: "H", COO: "H" },
  freight: { IN: "R", OUT: "O", TSHIP: "O", COO: "H" },
  insurance: { IN: "R", OUT: "O", TSHIP: "O", COO: "H" },
};

function getFieldStatus(fieldId: string, messageType: MessageType | ""): FieldStatus {
  const alwaysVisible = [
    "messageType", "declarationType", "declaringAgentUEN", "consignee",
    "supplier", "hsCode", "hsQuantity", "hsUnit", "packingOuter",
    "packingOuterUnit", "packingInner", "packingInnerUnit", "cargoPackingType",
    "transportMode", "invoiceCurrency", "exchangeRate", "cifValue",
    "grossWeight", "grossWeightUnit",
  ];
  if (alwaysVisible.includes(fieldId)) return "R";
  if (!messageType || !FIELD_VIS[fieldId]) return "H";
  return FIELD_VIS[fieldId][messageType] || "H";
}

const INITIAL_VALUES: Record<string, string> = {
  messageType: "",
  declarationType: "",
  declaringAgentUEN: "201912345M",
  throughAgentUEN: "",
  consignee: "",
  supplier: "",
  placeOfReleaseFTZ: "",
  placeOfReceiptFTZ: "",
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
  "messageType", "declarationType", "placeOfReleaseFTZ",
  "placeOfReceiptFTZ", "hsCode", "hsQuantity", "hsUnit",
  "packingOuter", "packingOuterUnit", "packingInner", "packingInnerUnit",
  "cargoPackingType", "transportMode", "invoiceCurrency", "exchangeRate",
  "cifValue", "freight", "insurance", "grossWeight", "grossWeightUnit",
];

function validatePermit038(values: Record<string, string>, scaffolding: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const msgType = values.messageType;

  // T-T1: Wrong message type
  if (msgType && msgType !== "TSHIP") {
    errors.push({
      code: "T-T1",
      field: "messageType",
      message: "Case #038 is a transhipment — goods pass THROUGH Singapore. Message Type should be TSHIP, not IN.",
      severity: "soft",
    });
  }

  // T-T2: Wrong declaration type
  if (msgType === "TSHIP" && values.declarationType && values.declarationType !== "TTI") {
    errors.push({
      code: "T-T2",
      field: "declarationType",
      message: "For through-transhipment with an inward manifest, the correct declaration type is TTI.",
      severity: scaffolding === 1 ? "soft" : "hard",
    });
  }

  if (msgType === "IN" && values.declarationType === "APS") {
    errors.push({
      code: "T-T2",
      field: "declarationType",
      message: "APS is for imports into Singapore. These goods are transiting — they never enter Singapore's customs territory.",
      severity: "soft",
    });
  }

  // T-T3: Place of receipt should be FTZ
  if (msgType === "TSHIP" && values.placeOfReceiptFTZ === "Others") {
    errors.push({
      code: "T-T3",
      field: "placeOfReceiptFTZ",
      message: "For transhipment, goods stay in the FTZ for reloading. Place of Receipt should be an FTZ location, not 'Others'.",
      severity: scaffolding === 1 ? "soft" : "hard",
    });
  }

  // T-T4: Wrong currency
  if (values.invoiceCurrency && values.invoiceCurrency !== "KRW") {
    errors.push({
      code: "T-T4",
      field: "invoiceCurrency",
      message: "The invoice is in KRW (South Korean Won). Check the commercial invoice currency.",
      severity: "soft",
    });
  }

  // T-T5: Payment condition should not be set for TSHIP
  if (msgType === "TSHIP" && values.paymentCondition) {
    errors.push({
      code: "T-T5",
      field: "paymentCondition",
      message: "Payment condition is not applicable for transhipment permits. No duty/GST payable.",
      severity: "soft",
    });
  }

  // HS quantity sanity
  if (values.hsQuantity === "0") {
    errors.push({
      code: "QTY_ZERO",
      field: "hsQuantity",
      message: "HS Qty '0' is not allowed. Enter actual quantity.",
      severity: "hard",
    });
  }

  // Weight unit for sea
  if (values.grossWeightUnit === "KGM" && values.transportMode === "1") {
    errors.push({
      code: "WEIGHT_UNIT_SEA",
      field: "grossWeightUnit",
      message: "For sea freight, gross weight is typically declared in TNE (metric tonnes).",
      severity: "soft",
    });
  }

  // Cargo packing type mismatch
  if (values.cargoPackingType === "5" && values.transportMode === "1") {
    errors.push({
      code: "CARGO_PACK_TYPE_MISMATCH",
      field: "cargoPackingType",
      message: "Bill of Lading shows a container number — Containerised (9) is expected.",
      severity: "soft",
    });
  }

  return errors;
}

function scorePermit038(values: Record<string, string>): ScoringResult {
  const cp = CASE_038.canonicalPermit;
  const checks: { field: string; yours: () => string; expected: string; check: () => boolean }[] = [
    { field: "Message Type", yours: () => values.messageType || "\u2014", expected: "TSHIP", check: () => values.messageType === "TSHIP" },
    { field: "Declaration Type", yours: () => values.declarationType || "\u2014", expected: "TTI", check: () => values.declarationType === "TTI" },
    { field: "Place of Release", yours: () => values.placeOfReleaseFTZ || "\u2014", expected: "PP1 (Pasir Panjang FTZ)", check: () => values.placeOfReleaseFTZ === "PP1" },
    { field: "Place of Receipt", yours: () => values.placeOfReceiptFTZ || "\u2014", expected: "PP1 (Pasir Panjang FTZ)", check: () => values.placeOfReceiptFTZ === "PP1" },
    { field: "HS Code", yours: () => values.hsCode || "\u2014", expected: "9013.80", check: () => values.hsCode?.startsWith("9013.80") || false },
    { field: "HS Quantity", yours: () => values.hsQuantity ? `${values.hsQuantity} ${values.hsUnit || "?"}` : "\u2014", expected: `${cp.hsQuantity} U`, check: () => {
      const q = parseFloat(values.hsQuantity);
      return !isNaN(q) && Math.abs(q - cp.hsQuantity) < 5;
    }},
    { field: "HS Unit", yours: () => values.hsUnit || "\u2014", expected: "U", check: () => values.hsUnit === "U" },
    { field: "Packing Outer", yours: () => values.packingOuter ? `${values.packingOuter} ${values.packingOuterUnit || "?"}` : "\u2014", expected: "100 CRT", check: () => values.packingOuter === "100" && values.packingOuterUnit === "CRT" },
    { field: "Packing Inner", yours: () => values.packingInner ? `${values.packingInner} ${values.packingInnerUnit || "?"}` : "\u2014", expected: "20 PCS", check: () => values.packingInner === "20" && values.packingInnerUnit === "PCS" },
    { field: "Cargo Packing Type", yours: () => values.cargoPackingType === "9" ? "9 (Containerised)" : values.cargoPackingType === "5" ? "5 (Non-containerised)" : "\u2014", expected: "9 (Containerised)", check: () => values.cargoPackingType === "9" },
    { field: "Transport Mode", yours: () => values.transportMode === "1" ? "1 (Sea)" : values.transportMode || "\u2014", expected: "1 (Sea)", check: () => values.transportMode === "1" },
    { field: "Invoice Currency", yours: () => values.invoiceCurrency || "\u2014", expected: "KRW", check: () => values.invoiceCurrency === "KRW" },
    { field: "Exchange Rate", yours: () => values.exchangeRate || "\u2014", expected: "0.00102", check: () => {
      const r = parseFloat(values.exchangeRate);
      return !isNaN(r) && Math.abs(r - 0.00102) / 0.00102 < 0.05;
    }},
    { field: "CIF Value (SGD)", yours: () => values.cifValue || "\u2014", expected: "1,788,570.00", check: () => {
      const v = parseFloat(values.cifValue);
      return !isNaN(v) && Math.abs(v - 1788570) / 1788570 < 0.01;
    }},
    { field: "Freight (KRW)", yours: () => values.freight || "\u2014", expected: "45,000,000", check: () => {
      const f = parseFloat(values.freight);
      return !isNaN(f) && Math.abs(f - 45000000) < 100000;
    }},
    { field: "Insurance (KRW)", yours: () => values.insurance || "\u2014", expected: "8,500,000", check: () => {
      const i = parseFloat(values.insurance);
      return !isNaN(i) && Math.abs(i - 8500000) < 100000;
    }},
    { field: "Gross Weight", yours: () => values.grossWeight ? `${values.grossWeight} ${values.grossWeightUnit || "?"}` : "\u2014", expected: "12.500 TNE", check: () => {
      const w = parseFloat(values.grossWeight);
      return !isNaN(w) && Math.abs(w - 12.5) / 12.5 < 0.05;
    }},
    { field: "Gross Weight Unit", yours: () => values.grossWeightUnit || "\u2014", expected: "TNE", check: () => values.grossWeightUnit === "TNE" },
  ];

  const details = checks.map((c) => ({
    field: c.field,
    correct: c.check(),
    yours: c.yours(),
    expected: c.expected,
  }));

  const correct = details.filter((d) => d.correct).length;
  return { total: correct, max: checks.length, details };
}

export function BeatA038() {
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
    (f) => values[f] && values[f] !== "",
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
          next.placeOfReceiptFTZ = "";
        }
        const errs = validatePermit038(next, scaffolding);
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
    const errs = validatePermit038(values, scaffolding);
    const hardErrors = errs.filter((e) => e.severity === "hard");
    if (hardErrors.length > 0) {
      setErrors(errs);
      return;
    }
    setShowStamp(true);
    setTimeout(() => {
      const result = scorePermit038(values);
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
          { value: "APS", label: "APS \u2014 Standard Import Permit" },
        ]
      : msgType === "OUT"
        ? [{ value: "OUT_STD", label: "Standard Export" }]
        : msgType === "TSHIP"
          ? [
              { value: "TTI", label: "TTI \u2014 Through Transhipment (Inward)" },
              { value: "IGM", label: "IGM \u2014 Inter-Gateway Movement" },
              { value: "REM", label: "Removal (REM)" },
              { value: "BRE", label: "Blanket Removal (BRE)" },
            ]
          : [];

  if (submitted && score) {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">DECLARATION DESK &mdash; RESULTS</h1>
        </header>

        <div className="flex-1 overflow-auto p-3 sm:p-6 animate-stamp-flash">
          <div className="max-w-2xl mx-auto">
            {showStamp && (
              <div className="text-center mb-6">
                <div className="inline-block border-4 border-customs-red rounded-lg px-8 py-4 animate-stamp shadow-lg shadow-customs-red/20">
                  <span className="text-customs-red font-bold text-3xl tracking-widest">STAMPED</span>
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
                  <span className="text-customs-gold">Good work \u2014 review the red fields below.</span>
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
                      {!d.correct && d.yours !== "\u2014" && (
                        <span className="text-customs-red line-through">{d.yours}</span>
                      )}
                      <span className={d.correct ? "text-customs-green" : "text-customs-gold"}>
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
                    <div key={i} className="text-xs p-2 bg-customs-surface rounded border border-customs-border">
                      <span className="text-customs-amber font-mono">{e.code}</span>
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
      <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-customs-muted hover:text-white text-sm no-underline">&larr;</Link>
          <h1 className="text-sm sm:text-base font-bold text-white">DECLARATION DESK &mdash; CASE #038</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRulebook(!showRulebook)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-gold hover:bg-customs-panel cursor-pointer">Rulebook</button>
          <button onClick={() => setShowLedger(!showLedger)} className={`text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 hover:bg-customs-panel cursor-pointer ${errorLedger.length > 0 ? "text-customs-amber" : "text-customs-muted"}`}>Errors ({errorLedger.length})</button>
          <button onClick={() => setShowCaseFile(!showCaseFile)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer sm:hidden">Case</button>
          <button onClick={() => setScaffolding((s) => (s === 1 ? 2 : 1) as ScaffoldingLevel)} className="text-xs bg-customs-surface border border-customs-border rounded px-2 py-1 text-customs-muted hover:text-white cursor-pointer">
            {scaffolding === 1 ? "Guided" : "Open"}
          </button>
        </div>
      </header>

      {msgType && (
        <div className="bg-customs-navy px-3 sm:px-6 py-1.5 border-b border-customs-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-customs-muted whitespace-nowrap">{filledCount}/{totalFields} fields</span>
            <div className="flex-1 h-1.5 bg-customs-surface rounded-full overflow-hidden">
              <div className="h-full bg-customs-gold rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-[10px] text-customs-gold font-bold">{progressPct}%</span>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className={`${showCaseFile ? "fixed inset-0 z-40 sm:relative sm:inset-auto" : "hidden"} sm:block sm:w-80 lg:w-96 flex-shrink-0 border-r border-customs-border overflow-auto bg-customs-dark`}>
          <button onClick={() => setShowCaseFile(false)} className="sm:hidden absolute top-2 right-2 z-50 text-customs-muted hover:text-white bg-customs-panel rounded-full w-8 h-8 flex items-center justify-center border border-customs-border cursor-pointer">&times;</button>
          <CaseFilePanel038 />
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="max-w-xl mx-auto space-y-4">
            {!msgType && (
              <div className="bg-customs-panel border border-customs-gold/20 rounded-lg p-4 text-center animate-fade-in">
                <p className="text-customs-gold text-sm">You are a Declaring Agent. Build the correct permit for Case #038.</p>
                <p className="text-customs-muted text-xs mt-1">Samsung OLED panels transiting through Singapore to Jakarta. Start by selecting Message Type.</p>
              </div>
            )}

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
                tooltip={scaffolding === 1 ? "Are these goods entering Singapore for local use, or passing THROUGH to another country?" : undefined}
                error={errors.find((e) => e.field === "messageType")?.message}
              />
              {msgType && (
                <FormSelect
                  label="Declaration Type"
                  value={values.declarationType}
                  onChange={(v) => setValue("declarationType", v)}
                  options={declTypeOptions}
                  tooltip={scaffolding === 1 ? "TTI = Through Transhipment with Inward manifest. The goods arrive and depart without entering customs territory." : undefined}
                  error={errors.find((e) => e.field === "declarationType")?.message}
                />
              )}
            </FormSection>

            {msgType && (
              <FormSection title="PARTIES">
                <FormField
                  label="Declaring Agent / Through Agent UEN"
                  value={values.declaringAgentUEN}
                  onChange={(v) => setValue("declaringAgentUEN", v)}
                  disabled
                />
                <FormField
                  label="Consignee (Final)"
                  value={values.consignee}
                  onChange={(v) => setValue("consignee", v)}
                  placeholder="Final destination consignee"
                />
                <FormField
                  label="Supplier / Shipper"
                  value={values.supplier}
                  onChange={(v) => setValue("supplier", v)}
                  placeholder="Overseas supplier"
                />
              </FormSection>
            )}

            {msgType && (
              <FormSection title="PLACE OF RELEASE / RECEIPT">
                {fieldVisible("placeOfReleaseFTZ") && (
                  <FormSelect
                    label="Place of Release (FROM)"
                    value={values.placeOfReleaseFTZ}
                    onChange={(v) => setValue("placeOfReleaseFTZ", v)}
                    options={[
                      { value: "T15", label: "T15 \u2014 Tanjong Pagar Terminal FTZ" },
                      { value: "T16", label: "T16 \u2014 Keppel Terminal FTZ" },
                      { value: "C01", label: "C01 \u2014 Changi Airfreight Centre" },
                      { value: "PP1", label: "PP1 \u2014 Pasir Panjang Terminal FTZ" },
                    ]}
                    tooltip={scaffolding === 1 ? "For transhipment, 'release FROM' = the FTZ where goods arrive. Check the port of discharge." : undefined}
                  />
                )}
                {fieldVisible("placeOfReceiptFTZ") && (
                  <FormSelect
                    label="Place of Receipt (TO)"
                    value={values.placeOfReceiptFTZ}
                    onChange={(v) => setValue("placeOfReceiptFTZ", v)}
                    options={[
                      { value: "PP1", label: "PP1 \u2014 Pasir Panjang Terminal FTZ" },
                      { value: "T15", label: "T15 \u2014 Tanjong Pagar Terminal FTZ" },
                      { value: "T16", label: "T16 \u2014 Keppel Terminal FTZ" },
                      { value: "C01", label: "C01 \u2014 Changi Airfreight Centre" },
                      { value: "Others", label: "Others (general delivery)" },
                    ]}
                    tooltip={scaffolding === 1 ? "For transhipment, goods STAY in the FTZ for reloading onto the onward vessel. Receipt = FTZ, not 'Others'." : undefined}
                    error={errors.find((e) => e.field === "placeOfReceiptFTZ")?.message}
                  />
                )}
              </FormSection>
            )}

            {msgType && (
              <FormSection title="GOODS DESCRIPTION">
                <FormField
                  label="HS Code"
                  value={values.hsCode}
                  onChange={(v) => setValue("hsCode", v)}
                  placeholder="e.g. 9013.80"
                  tooltip={scaffolding === 1 ? "OLED flat panel displays = Chapter 90, Heading 9013 (optical devices), sub-heading .80" : undefined}
                  error={errors.find((e) => e.field === "hsCode")?.message}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label="HS Quantity"
                    value={values.hsQuantity}
                    onChange={(v) => setValue("hsQuantity", v)}
                    placeholder="e.g. 2000"
                    type="text"
                    tooltip={scaffolding === 1 ? "HS unit for 9013.80 is U (units). Enter the panel count." : undefined}
                    error={errors.find((e) => e.field === "hsQuantity")?.message}
                  />
                  <FormSelect
                    label="HS Unit"
                    value={values.hsUnit}
                    onChange={(v) => setValue("hsUnit", v)}
                    options={[
                      { value: "U", label: "U (units)" },
                      { value: "KGM", label: "KGM (kg)" },
                      { value: "PCS", label: "PCS (pieces)" },
                      { value: "LTR", label: "LTR (litres)" },
                    ]}
                    error={errors.find((e) => e.field === "hsUnit")?.message}
                  />
                </div>
              </FormSection>
            )}

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
                      { value: "CRT", label: "CRT (crate)" },
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
                    placeholder="e.g. 20"
                    type="text"
                  />
                  <FormSelect
                    label="In-Pack Unit"
                    value={values.packingInnerUnit}
                    onChange={(v) => setValue("packingInnerUnit", v)}
                    options={[
                      { value: "PCS", label: "PCS (pieces)" },
                      { value: "BOT", label: "BOT (bottle)" },
                      { value: "CAN", label: "CAN" },
                      { value: "PKT", label: "PKT (packet)" },
                    ]}
                  />
                </div>
              </FormSection>
            )}

            {msgType && (
              <FormSection title="TRANSPORT">
                <div className="grid grid-cols-2 gap-2">
                  <FormSelect
                    label="Cargo Packing Type"
                    value={values.cargoPackingType}
                    onChange={(v) => setValue("cargoPackingType", v)}
                    options={[
                      { value: "9", label: "9 \u2014 Containerised" },
                      { value: "5", label: "5 \u2014 Non-containerised" },
                    ]}
                    error={errors.find((e) => e.field === "cargoPackingType")?.message}
                  />
                  <FormSelect
                    label="Transport Mode"
                    value={values.transportMode}
                    onChange={(v) => setValue("transportMode", v)}
                    options={[
                      { value: "1", label: "1 \u2014 Sea" },
                      { value: "2", label: "2 \u2014 Rail" },
                      { value: "3", label: "3 \u2014 Road" },
                      { value: "4", label: "4 \u2014 Air" },
                      { value: "5", label: "5 \u2014 Post" },
                      { value: "7", label: "7 \u2014 Pipeline" },
                    ]}
                    tooltip={scaffolding === 1 ? "Check the Bill of Lading: vessel name = sea." : undefined}
                  />
                </div>
              </FormSection>
            )}

            {msgType && (
              <FormSection title="VALUE DECLARATION">
                <div className="grid grid-cols-2 gap-2">
                  <FormSelect
                    label="Invoice Currency"
                    value={values.invoiceCurrency}
                    onChange={(v) => setValue("invoiceCurrency", v)}
                    options={[
                      { value: "KRW", label: "KRW (Korean Won)" },
                      { value: "USD", label: "USD" },
                      { value: "SGD", label: "SGD" },
                      { value: "EUR", label: "EUR" },
                    ]}
                    error={errors.find((e) => e.field === "invoiceCurrency")?.message}
                  />
                  <FormField
                    label="Exchange Rate (to SGD)"
                    value={values.exchangeRate}
                    onChange={(v) => setValue("exchangeRate", v)}
                    placeholder="e.g. 0.00102"
                    type="text"
                  />
                </div>
                <FormField
                  label="CIF Value (SGD)"
                  value={values.cifValue}
                  onChange={(v) => setValue("cifValue", v)}
                  placeholder="Total CIF in SGD"
                  type="text"
                  tooltip={scaffolding === 1 ? "CIF = FOB + Freight + Insurance. Convert total to SGD using exchange rate." : undefined}
                  error={errors.find((e) => e.field === "cifValue")?.message}
                />
                {fieldVisible("freight") && (
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      label="Freight (KRW)"
                      value={values.freight}
                      onChange={(v) => setValue("freight", v)}
                      placeholder="e.g. 45000000"
                      type="text"
                    />
                    <FormField
                      label="Insurance (KRW)"
                      value={values.insurance}
                      onChange={(v) => setValue("insurance", v)}
                      placeholder="e.g. 8500000"
                      type="text"
                    />
                  </div>
                )}
              </FormSection>
            )}

            {msgType && (
              <FormSection title="WEIGHT">
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label="Gross Weight"
                    value={values.grossWeight}
                    onChange={(v) => setValue("grossWeight", v)}
                    placeholder="e.g. 12.500"
                    type="text"
                    tooltip={scaffolding === 1 ? "Use the B/L gross weight. Sea shipments = TNE." : undefined}
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

            {msgType && fieldVisible("paymentCondition") && (
              <FormSection title="PAYMENT">
                <FormSelect
                  label="Payment Condition"
                  value={values.paymentCondition}
                  onChange={(v) => setValue("paymentCondition", v)}
                  options={[
                    { value: "G1", label: "G1 \u2014 Pay on approval" },
                    { value: "GF", label: "GF \u2014 GIRO (IBG)" },
                    { value: "G7", label: "G7 \u2014 GIRO (IBG)" },
                  ]}
                  tooltip={scaffolding === 1 ? "Is payment condition applicable for transhipment permits?" : undefined}
                  error={errors.find((e) => e.field === "paymentCondition")?.message}
                />
              </FormSection>
            )}

            {msgType && (
              <div className="pb-6">
                {errors.filter((e) => touched.has(e.field)).length > 0 && (
                  <div className="mb-3 bg-customs-panel border border-customs-border rounded-lg p-3">
                    <h4 className="text-xs text-customs-amber font-bold mb-2">Validation Issues</h4>
                    {errors.filter((e) => touched.has(e.field)).map((e, i) => (
                      <div key={i} className={`text-xs p-1.5 rounded mb-1 ${e.severity === "hard" ? "bg-customs-red/10 text-customs-red" : "bg-customs-amber/10 text-customs-amber"}`}>
                        <span className="font-mono text-[10px] opacity-70">[{e.code}]</span> {e.message}
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
                  STAMP &amp; SUBMIT
                </button>
                {!isStampable && hardErrors.length > 0 && (
                  <p className="text-xs text-customs-red text-center mt-1">Clear all hard errors before submitting</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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

      {showRulebook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/50" onClick={() => setShowRulebook(false)} />
          <div className="w-80 sm:w-96 bg-customs-navy border-l border-customs-border overflow-auto animate-slide-in p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-customs-gold font-bold">Rulebook \u2014 Transhipment</h3>
              <button onClick={() => setShowRulebook(false)} className="text-customs-muted hover:text-white cursor-pointer bg-transparent border-0 text-lg">&times;</button>
            </div>
            <div className="space-y-3 text-xs text-customs-muted">
              <div>
                <h4 className="text-white font-medium mb-1">Transhipment (TSHIP)</h4>
                <p>Goods passing THROUGH Singapore to another destination. They never enter Singapore&apos;s customs territory for local consumption.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">TTI Declaration</h4>
                <p>Through Transhipment with Inward manifest \u2014 for goods arriving by sea/air and departing to final destination without entering customs territory.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Place of Release/Receipt</h4>
                <p>For transhipment, BOTH should be FTZ locations. Goods arrive at and depart from the FTZ \u2014 they never leave it.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">No Duty/GST</h4>
                <p>Transhipped goods never enter Singapore&apos;s customs territory. No duty or GST is payable. Payment condition field is hidden.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">HS Code 9013.80</h4>
                <p>Flat panel display devices (OLED). HS unit = U (units). Non-dutiable electronics component.</p>
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

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-customs-panel border border-customs-border rounded-lg overflow-hidden animate-fade-in">
      <div className="bg-customs-surface px-3 py-1.5 border-b border-customs-border">
        <h3 className="text-[10px] text-customs-gold uppercase tracking-wider font-bold">{title}</h3>
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text", tooltip, error, disabled }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; tooltip?: string; error?: string; disabled?: boolean;
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
        className={`w-full bg-customs-surface border rounded px-2.5 py-1.5 text-sm text-white placeholder-customs-muted/50 focus:outline-none focus:border-customs-gold ${error ? "border-customs-red" : "border-customs-border"} ${disabled ? "opacity-60" : ""}`}
      />
      {tooltip && <p className="text-[10px] text-customs-blue mt-0.5">{tooltip}</p>}
      {error && <p className="text-[10px] text-customs-red mt-0.5">{error}</p>}
    </div>
  );
}

function FormSelect({ label, value, onChange, options, tooltip, error }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; tooltip?: string; error?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-customs-muted mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-customs-surface border rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-customs-gold appearance-none cursor-pointer ${error ? "border-customs-red" : "border-customs-border"}`}
      >
        <option value="">\u2014 select \u2014</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {tooltip && <p className="text-[10px] text-customs-blue mt-0.5">{tooltip}</p>}
      {error && <p className="text-[10px] text-customs-red mt-0.5">{error}</p>}
    </div>
  );
}
