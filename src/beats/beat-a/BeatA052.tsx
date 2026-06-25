import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { CaseFilePanel052 } from "./CaseFilePanel052";
import { getFieldStatus } from "./formRules";
import type { MessageType } from "../../data/case014";

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

const INITIAL_VALUES: Record<string, string> = {
  messageType: "",
  declarationType: "",
  declaringAgentUEN: "199804321D",
  exporterUEN: "",
  consignee: "",
  supplier: "",
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
  fobValue: "",
  freight: "",
  insurance: "",
  grossWeight: "",
  grossWeightUnit: "",
  paymentCondition: "",
};

const SCOREABLE_FIELDS = [
  "messageType", "declarationType", "exporterUEN", "placeOfReceiptFTZ",
  "hsCode", "hsQuantity", "hsUnit",
  "packingOuter", "packingOuterUnit", "packingInner", "packingInnerUnit",
  "cargoPackingType", "transportMode", "invoiceCurrency", "exchangeRate",
  "fobValue", "grossWeight", "grossWeightUnit", "paymentCondition",
];

function validatePermit052(
  values: Record<string, string>,
  scaffolding: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const msgType = values.messageType;

  if (msgType && msgType !== "OUT") {
    errors.push({
      code: "T-O1",
      field: "messageType",
      message: "Case #052 is an export from Singapore. Message Type should be OUT.",
      severity: "soft",
    });
  }

  if (msgType === "OUT" && values.exporterUEN === "") {
    // No error yet — just empty
  }

  if (values.exporterUEN === "99991000000G" || values.exporterUEN === "99999000000N" || values.exporterUEN === "99999990000C") {
    errors.push({
      code: "UEN_GENERIC",
      field: "exporterUEN",
      message: "Generic UEN used — verify this is correct for your exporter. Real UENs required where available.",
      severity: scaffolding === 1 ? "soft" : "hard",
    });
  }

  if (values.hsQuantity === "0") {
    errors.push({
      code: "QTY_ZERO",
      field: "hsQuantity",
      message: "HS Qty '0' is not allowed. Enter actual quantity.",
      severity: "hard",
    });
  }

  if (values.hsQuantity === "-") {
    errors.push({
      code: "QTY_DASH",
      field: "hsQuantity",
      message: "'-' is not a valid HS Qty entry. Enter actual quantity.",
      severity: "hard",
    });
  }

  const hsQty = parseFloat(values.hsQuantity);
  if (values.hsUnit === "LTR" && !isNaN(hsQty)) {
    errors.push({
      code: "UOM_MISMATCH",
      field: "hsUnit",
      message: "The STCCED 2022 unit for HS 9001.90 (optical lenses) is U (units), not litres.",
      severity: scaffolding === 1 ? "soft" : "hard",
    });
  }

  const fobVal = parseFloat(values.fobValue);
  const freightVal = parseFloat(values.freight || "0");
  const insuranceVal = parseFloat(values.insurance || "0");

  if (!isNaN(fobVal) && fobVal > 0) {
    const expectedCif = 840000 * 1.46 + (3200 + 1680) * 1.46;
    if (Math.abs(fobVal - expectedCif) < 500) {
      errors.push({
        code: "T-O2",
        field: "fobValue",
        message: "For FOB exports, declare FOB value only. Do not add freight and insurance — those are the buyer's cost.",
        severity: scaffolding === 1 ? "soft" : "hard",
      });
    }
  }

  if (!isNaN(freightVal) && freightVal > 0 && !isNaN(insuranceVal) && insuranceVal > 0) {
    errors.push({
      code: "T-O3",
      field: "freight",
      message: "For FOB exports, freight and insurance are the buyer's cost and should not be declared on the export permit.",
      severity: "soft",
    });
  }

  if (values.paymentCondition === "G1" && msgType === "OUT") {
    errors.push({
      code: "T-O6",
      field: "paymentCondition",
      message: "Exports of non-dutiable goods use GF (GIRO), not G1 (pay on approval). No duty is payable.",
      severity: "soft",
    });
  }

  if (
    values.invoiceCurrency === "SGD" &&
    values.exchangeRate === "1"
  ) {
    errors.push({
      code: "CURRENCY_EXCH_ERROR",
      field: "invoiceCurrency",
      message: "Invoice is in EUR. Verify the exchange rate and declare the correct currency.",
      severity: "soft",
    });
  }

  if (
    values.grossWeightUnit === "KGM" &&
    values.transportMode === "1"
  ) {
    errors.push({
      code: "WEIGHT_UNIT_SEA",
      field: "grossWeightUnit",
      message: "For sea freight permits, gross weight is typically declared in TNE (metric tonnes).",
      severity: "soft",
    });
  }

  const grossWt = parseFloat(values.grossWeight);
  if (values.grossWeightUnit === "TNE" && !isNaN(grossWt) && grossWt > 100) {
    errors.push({
      code: "WEIGHT_UNIT_SEA",
      field: "grossWeight",
      message: "Weight seems too high. The B/L states 450 kg = 0.450 TNE for sea shipments.",
      severity: "soft",
    });
  }

  if (
    values.cargoPackingType === "5" &&
    values.transportMode === "1"
  ) {
    errors.push({
      code: "CARGO_PACK_TYPE_MISMATCH",
      field: "cargoPackingType",
      message: "Check the Bill of Lading — a container number is present. Containerised (9) is expected.",
      severity: "soft",
    });
  }

  return errors;
}

function scorePermit052(values: Record<string, string>): ScoringResult {
  const checks: { field: string; yours: () => string; expected: string; check: () => boolean }[] = [
    { field: "Message Type", yours: () => values.messageType || "\u2014", expected: "OUT", check: () => values.messageType === "OUT" },
    { field: "Declaration Type", yours: () => values.declarationType || "\u2014", expected: "OUT_STD", check: () => values.declarationType === "OUT_STD" },
    { field: "Exporter UEN", yours: () => values.exporterUEN || "\u2014", expected: "201756789K", check: () => values.exporterUEN === "201756789K" },
    { field: "Place of Receipt (FTZ)", yours: () => values.placeOfReceiptFTZ || "\u2014", expected: "T16 (Keppel)", check: () => values.placeOfReceiptFTZ === "T16" },
    { field: "HS Code", yours: () => values.hsCode || "\u2014", expected: "9001.90", check: () => values.hsCode?.startsWith("9001.90") || false },
    { field: "HS Quantity", yours: () => values.hsQuantity ? `${values.hsQuantity} ${values.hsUnit || "?"}` : "\u2014", expected: "300 U", check: () => {
      const q = parseFloat(values.hsQuantity);
      return !isNaN(q) && Math.abs(q - 300) < 1;
    }},
    { field: "HS Unit", yours: () => values.hsUnit || "\u2014", expected: "U", check: () => values.hsUnit === "U" },
    { field: "Packing Outer", yours: () => values.packingOuter ? `${values.packingOuter} ${values.packingOuterUnit || "?"}` : "\u2014", expected: "15 CS", check: () => values.packingOuter === "15" && values.packingOuterUnit === "CS" },
    { field: "Packing Inner", yours: () => values.packingInner ? `${values.packingInner} ${values.packingInnerUnit || "?"}` : "\u2014", expected: "20 PCS", check: () => values.packingInner === "20" && values.packingInnerUnit === "PCS" },
    { field: "Cargo Packing Type", yours: () => values.cargoPackingType === "9" ? "9 (Containerised)" : values.cargoPackingType === "5" ? "5 (Non-containerised)" : "\u2014", expected: "9 (Containerised)", check: () => values.cargoPackingType === "9" },
    { field: "Transport Mode", yours: () => values.transportMode === "1" ? "1 (Sea)" : values.transportMode === "4" ? "4 (Air)" : values.transportMode || "\u2014", expected: "1 (Sea)", check: () => values.transportMode === "1" },
    { field: "Invoice Currency", yours: () => values.invoiceCurrency || "\u2014", expected: "EUR", check: () => values.invoiceCurrency === "EUR" },
    { field: "Exchange Rate", yours: () => values.exchangeRate || "\u2014", expected: "1.46", check: () => {
      const r = parseFloat(values.exchangeRate);
      return !isNaN(r) && Math.abs(r - 1.46) / 1.46 < 0.005;
    }},
    { field: "FOB Value (SGD)", yours: () => values.fobValue || "\u2014", expected: "1,226,400", check: () => {
      const v = parseFloat(values.fobValue);
      return !isNaN(v) && Math.abs(v - 1226400) / 1226400 < 0.01;
    }},
    { field: "Gross Weight", yours: () => values.grossWeight ? `${values.grossWeight} ${values.grossWeightUnit || "?"}` : "\u2014", expected: "0.450 TNE", check: () => {
      const w = parseFloat(values.grossWeight);
      return !isNaN(w) && Math.abs(w - 0.45) / 0.45 < 0.05;
    }},
    { field: "Gross Weight Unit", yours: () => values.grossWeightUnit || "\u2014", expected: "TNE", check: () => values.grossWeightUnit === "TNE" },
    { field: "Payment Condition", yours: () => values.paymentCondition === "G1" ? "G1 (Pay on approval)" : values.paymentCondition === "GF" ? "GF (GIRO)" : values.paymentCondition || "\u2014", expected: "GF", check: () => values.paymentCondition === "GF" },
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

export function BeatA052() {
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
          next.placeOfReceiptFTZ = "";
        }
        const errs = validatePermit052(next, scaffolding);
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
    const errs = validatePermit052(values, scaffolding);
    const hardErrors = errs.filter((e) => e.severity === "hard");
    if (hardErrors.length > 0) {
      setErrors(errs);
      return;
    }
    setShowStamp(true);
    setTimeout(() => {
      const result = scorePermit052(values);
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
          { value: "APS_PREF", label: "APS \u2014 Preferential Tariff" },
        ]
      : msgType === "OUT"
        ? [{ value: "OUT_STD", label: "Standard Export" }]
        : msgType === "TSHIP"
          ? [
              { value: "TTI", label: "TTI \u2014 Through Transhipment" },
              { value: "IGM", label: "IGM \u2014 Inter-Gateway Movement" },
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
                      {!d.correct && d.yours !== "\u2014" && (
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

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div
          className={`${showCaseFile ? "fixed inset-0 z-40 sm:relative sm:inset-auto" : "hidden"} sm:block sm:w-80 lg:w-96 flex-shrink-0 border-r border-customs-border overflow-auto bg-customs-dark`}
        >
          <button
            onClick={() => setShowCaseFile(false)}
            className="sm:hidden absolute top-2 right-2 z-50 text-customs-muted hover:text-white bg-customs-panel rounded-full w-8 h-8 flex items-center justify-center border border-customs-border cursor-pointer"
          >
            &times;
          </button>
          <CaseFilePanel052 />
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="max-w-xl mx-auto space-y-4">
            {!msgType && (
              <div className="bg-customs-panel border border-customs-gold/20 rounded-lg p-4 text-center animate-fade-in">
                <p className="text-customs-gold text-sm">
                  You are a Declaring Agent. Build the correct permit for Case
                  #052.
                </p>
                <p className="text-customs-muted text-xs mt-1">
                  Start by selecting Message Type below.
                </p>
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
                tooltip={
                  scaffolding === 1
                    ? "Message Type = direction of movement. Goods leaving Singapore = OUT."
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

            {msgType && (
              <FormSection title="PARTIES">
                <FormField
                  label="Declaring Agent UEN"
                  value={values.declaringAgentUEN}
                  onChange={(v) => setValue("declaringAgentUEN", v)}
                  disabled
                />
                {fieldVisible("exporterUEN") && (
                  <FormField
                    label="Exporter UEN"
                    value={values.exporterUEN}
                    onChange={(v) => setValue("exporterUEN", v)}
                    placeholder="e.g. 201756789K"
                    tooltip={
                      scaffolding === 1
                        ? "UEN = the exporter's registered entity number. Check the invoice."
                        : undefined
                    }
                    error={errors.find((e) => e.field === "exporterUEN")?.message}
                  />
                )}
                {fieldVisible("importerUEN") && (
                  <FormField
                    label="Importer UEN"
                    value={values.exporterUEN}
                    onChange={(v) => setValue("exporterUEN", v)}
                    placeholder="e.g. 201835672K"
                    tooltip={
                      scaffolding === 1
                        ? "This is an export case — the exporter field is on a different form section."
                        : undefined
                    }
                  />
                )}
                <FormField
                  label="Consignee / Buyer"
                  value={values.consignee}
                  onChange={(v) => setValue("consignee", v)}
                  placeholder="Overseas buyer"
                />
                <FormField
                  label="Shipper / Exporter"
                  value={values.supplier}
                  onChange={(v) => setValue("supplier", v)}
                  placeholder="Singapore exporter"
                />
              </FormSection>
            )}

            {msgType && (
              <FormSection title="PLACE OF RECEIPT">
                {fieldVisible("placeOfReceiptFTZ") && (
                  <FormSelect
                    label="Place of Receipt (FTZ)"
                    value={values.placeOfReceiptFTZ}
                    onChange={(v) => setValue("placeOfReceiptFTZ", v)}
                    options={[
                      { value: "T15", label: "T15 \u2014 Tanjong Pagar Terminal FTZ" },
                      { value: "T16", label: "T16 \u2014 Keppel Terminal FTZ" },
                      { value: "C01", label: "C01 \u2014 Changi Airfreight Centre" },
                      { value: "PP1", label: "PP1 \u2014 Pasir Panjang Terminal FTZ" },
                    ]}
                    tooltip={
                      scaffolding === 1
                        ? "For an OUT permit, 'Place of Receipt' = where goods enter the port FTZ for loading."
                        : undefined
                    }
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
                  placeholder="e.g. 9001.90"
                  tooltip={
                    scaffolding === 1
                      ? "Lenses (other than contact/spectacle) = Chapter 90, Heading 9001, sub-heading .90"
                      : undefined
                  }
                  error={errors.find((e) => e.field === "hsCode")?.message}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label="HS Quantity"
                    value={values.hsQuantity}
                    onChange={(v) => setValue("hsQuantity", v)}
                    placeholder="e.g. 300"
                    type="text"
                    tooltip={
                      scaffolding === 1
                        ? "Enter qty in STCCED-prescribed unit (U for optical lenses). 300 lenses = 300 U."
                        : undefined
                    }
                    error={errors.find((e) => e.field === "hsQuantity")?.message}
                  />
                  <FormSelect
                    label="HS Unit"
                    value={values.hsUnit}
                    onChange={(v) => setValue("hsUnit", v)}
                    options={[
                      { value: "U", label: "U (units)" },
                      { value: "PCS", label: "PCS (pieces)" },
                      { value: "KGM", label: "KGM (kg)" },
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
                    placeholder="e.g. 15"
                    type="text"
                  />
                  <FormSelect
                    label="Outer Pack Unit"
                    value={values.packingOuterUnit}
                    onChange={(v) => setValue("packingOuterUnit", v)}
                    options={[
                      { value: "CS", label: "CS (case)" },
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
                    tooltip={
                      scaffolding === 1
                        ? "Each case contains 20 individually wrapped lenses."
                        : undefined
                    }
                    error={errors.find((e) => e.field === "packingInner")?.message}
                  />
                  <FormSelect
                    label="In-Pack Unit"
                    value={values.packingInnerUnit}
                    onChange={(v) => setValue("packingInnerUnit", v)}
                    options={[
                      { value: "PCS", label: "PCS (pieces)" },
                      { value: "BOT", label: "BOT (bottle)" },
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
                    tooltip={
                      scaffolding === 1
                        ? "Check the Bill of Lading: vessel name, port of loading."
                        : undefined
                    }
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
                  label="FOB Value (SGD)"
                  value={values.fobValue}
                  onChange={(v) => setValue("fobValue", v)}
                  placeholder="Total FOB in SGD"
                  type="text"
                  tooltip={
                    scaffolding === 1
                      ? "Export = FOB value only. Do NOT add freight/insurance — those are buyer's costs under FOB terms."
                      : undefined
                  }
                  error={errors.find((e) => e.field === "fobValue")?.message}
                />
                {fieldVisible("freight") && (
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      label="Freight (EUR)"
                      value={values.freight}
                      onChange={(v) => setValue("freight", v)}
                      placeholder="buyer's cost"
                      type="text"
                    />
                    <FormField
                      label="Insurance (EUR)"
                      value={values.insurance}
                      onChange={(v) => setValue("insurance", v)}
                      placeholder="buyer's cost"
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
                    placeholder="e.g. 0.450"
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
                  tooltip={
                    scaffolding === 1
                      ? "GF = GIRO. Exports are non-dutiable, so GF is correct here."
                      : undefined
                  }
                  error={errors.find((e) => e.field === "paymentCondition")?.message}
                />
              </FormSection>
            )}

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
                <p>Optical lenses (other than contact/spectacle): 9001.90. Declare to full digit level per STCCED 2022.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">HS Qty Unit</h4>
                <p>STCCED 2022 unit for 9001.90 is U (units).</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Export Valuation (FOB)</h4>
                <p>For FOB exports, declare FOB value only. Freight and insurance are the buyer&apos;s cost and should NOT be added.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Gross Weight</h4>
                <p>Sea = TNE (metric tonnes). Air = KGM. Convert: kg &divide; 1000 = TNE.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Payment</h4>
                <p>G1 = pay at approval. GF/G7 = GIRO. Exports of non-dutiable goods use GF.</p>
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
        <option value="">&mdash; select &mdash;</option>
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
