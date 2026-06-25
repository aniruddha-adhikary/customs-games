import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import type { MessageType } from "../../data/case014";
import type { BeatAConfig, ValidationError, ScoringResult } from "./beatAConfig";

type ScaffoldingLevel = 1 | 2;

export function BeatAGeneric({ config }: { config: BeatAConfig }) {
  const [values, setValues] = useState<Record<string, string>>(config.initialValues);
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

  const filledCount = config.scoreableFields.filter(
    (f) => values[f] && values[f] !== "",
  ).length;
  const totalFields = config.scoreableFields.length;
  const progressPct = Math.round((filledCount / totalFields) * 100);

  const setValue = useCallback(
    (field: string, value: string) => {
      setTouched((prev) => new Set(prev).add(field));
      setValues((prev) => {
        const next = { ...prev, [field]: value };
        if (field === "messageType") {
          for (const f of config.fieldsToResetOnMsgTypeChange) {
            next[f] = "";
          }
        }
        const errs = config.validatePermit(next, scaffolding);
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
    [scaffolding, config],
  );

  const handleSubmit = useCallback(() => {
    const errs = config.validatePermit(values, scaffolding);
    const hardErrors = errs.filter((e) => e.severity === "hard");
    if (hardErrors.length > 0) {
      setErrors(errs);
      return;
    }
    setShowStamp(true);
    setTimeout(() => {
      const result = config.scorePermit(values);
      setScore(result);
      setSubmitted(true);
    }, 1200);
  }, [values, scaffolding, config]);

  const handleRetry = useCallback(() => {
    setValues(config.initialValues);
    setErrors([]);
    setErrorLedger([]);
    setSubmitted(false);
    setScore(null);
    setShowStamp(false);
    setTouched(new Set());
  }, [config]);

  const hardErrors = errors.filter((e) => e.severity === "hard");
  const isStampable = hardErrors.length === 0 && msgType !== "";

  const fieldVisible = (fieldId: string) =>
    config.getFieldStatus(fieldId, msgType) !== "H";

  const declTypeOptions = config.declTypeOptions[msgType] || [];

  const CasePanel = config.CaseFilePanel;

  if (submitted && score) {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-customs-navy border-b border-customs-border px-3 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <Link to={config.backLink} className="text-customs-muted hover:text-white text-sm no-underline">
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
                  <span className="text-customs-gold">Good work &mdash; review the red fields below.</span>
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
                to={config.backLink}
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
          <Link to={config.backLink} className="text-customs-muted hover:text-white text-sm no-underline">
            &larr;
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-white">
            DECLARATION DESK{config.headerTitle ? ` \u2014 ${config.headerTitle}` : ""}
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
          <CasePanel />
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="max-w-xl mx-auto space-y-4">
            {!msgType && (
              <div className="bg-customs-panel border border-customs-gold/20 rounded-lg p-4 text-center animate-fade-in">
                <p className="text-customs-gold text-sm">
                  {config.introText}
                </p>
                <p className="text-customs-muted text-xs mt-1">
                  {config.introSubtext}
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
                tooltip={scaffolding === 1 ? config.messageTypeTooltip : undefined}
                error={errors.find((e) => e.field === "messageType")?.message}
              />
              {msgType && (
                <FormSelect
                  label="Declaration Type"
                  value={values.declarationType}
                  onChange={(v) => setValue("declarationType", v)}
                  options={declTypeOptions}
                  tooltip={scaffolding === 1 ? config.declarationTypeTooltip : undefined}
                  error={errors.find((e) => e.field === "declarationType")?.message}
                />
              )}
            </FormSection>

            {msgType && (
              <FormSection title="PARTIES">
                <FormField
                  label={config.agentLabel}
                  value={values.declaringAgentUEN || values.throughAgentUEN || ""}
                  onChange={() => {}}
                  disabled
                />
                {config.uenField && fieldVisible(config.uenField.visibilityFieldId) && (
                  <FormField
                    label={config.uenField.label}
                    value={values[config.uenField.fieldKey] || ""}
                    onChange={(v) => setValue(config.uenField!.fieldKey, v)}
                    placeholder={config.uenField.placeholder}
                    tooltip={scaffolding === 1 ? config.uenField.tooltip : undefined}
                    error={errors.find((e) => e.field === config.uenField!.fieldKey)?.message}
                  />
                )}
                {config.showImporterOnExport && fieldVisible("importerUEN") && (
                  <FormField
                    label={config.showImporterOnExport.label}
                    value={values[config.showImporterOnExport.fieldKey] || ""}
                    onChange={(v) => setValue(config.showImporterOnExport!.fieldKey, v)}
                    placeholder={config.showImporterOnExport.placeholder}
                    tooltip={scaffolding === 1 ? config.showImporterOnExport.tooltip : undefined}
                  />
                )}
                <FormField
                  label={config.consigneeLabel}
                  value={values.consignee}
                  onChange={(v) => setValue("consignee", v)}
                  placeholder={config.consigneePlaceholder}
                />
                <FormField
                  label={config.supplierLabel}
                  value={values.supplier}
                  onChange={(v) => setValue("supplier", v)}
                  placeholder={config.supplierPlaceholder}
                />
              </FormSection>
            )}

            {msgType && (
              <FormSection title={config.placeSectionTitle}>
                {config.placeFields.map((pf) =>
                  fieldVisible(pf.visibilityFieldId) ? (
                    <FormSelect
                      key={pf.fieldKey}
                      label={pf.label}
                      value={values[pf.fieldKey] || ""}
                      onChange={(v) => setValue(pf.fieldKey, v)}
                      options={pf.options}
                      tooltip={scaffolding === 1 ? pf.tooltip : undefined}
                      error={errors.find((e) => e.field === pf.fieldKey)?.message}
                    />
                  ) : null,
                )}
              </FormSection>
            )}

            {msgType && (
              <FormSection title="GOODS DESCRIPTION">
                <FormField
                  label="HS Code"
                  value={values.hsCode}
                  onChange={(v) => setValue("hsCode", v)}
                  placeholder={config.hsCodePlaceholder}
                  tooltip={scaffolding === 1 ? config.hsCodeTooltip : undefined}
                  error={errors.find((e) => e.field === "hsCode")?.message}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label="HS Quantity"
                    value={values.hsQuantity}
                    onChange={(v) => setValue("hsQuantity", v)}
                    placeholder={config.hsQuantityPlaceholder}
                    type="text"
                    tooltip={scaffolding === 1 ? config.hsQuantityTooltip : undefined}
                    error={errors.find((e) => e.field === "hsQuantity")?.message}
                  />
                  <FormSelect
                    label="HS Unit"
                    value={values.hsUnit}
                    onChange={(v) => setValue("hsUnit", v)}
                    options={config.hsUnitOptions}
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
                    placeholder={config.packingOuterPlaceholder}
                    type="text"
                  />
                  <FormSelect
                    label="Outer Pack Unit"
                    value={values.packingOuterUnit}
                    onChange={(v) => setValue("packingOuterUnit", v)}
                    options={config.packingOuterUnitOptions}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label="In-Pack Qty"
                    value={values.packingInner}
                    onChange={(v) => setValue("packingInner", v)}
                    placeholder={config.packingInnerPlaceholder}
                    type="text"
                    tooltip={scaffolding === 1 ? config.packingInnerTooltip : undefined}
                    error={errors.find((e) => e.field === "packingInner")?.message}
                  />
                  <FormSelect
                    label="In-Pack Unit"
                    value={values.packingInnerUnit}
                    onChange={(v) => setValue("packingInnerUnit", v)}
                    options={config.packingInnerUnitOptions}
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
                    options={config.cargoPackingOptions}
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
                    tooltip={scaffolding === 1 ? config.transportTooltip : undefined}
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
                    options={config.currencyOptions}
                    error={errors.find((e) => e.field === "invoiceCurrency")?.message}
                  />
                  <FormField
                    label="Exchange Rate (to SGD)"
                    value={values.exchangeRate}
                    onChange={(v) => setValue("exchangeRate", v)}
                    placeholder={config.valueSectionFields.valuePlaceholder.includes("Exchange") ? "e.g. 1.46" : "e.g. 1.46"}
                    type="text"
                  />
                </div>
                <FormField
                  label={config.valueSectionFields.valueLabel}
                  value={values[config.valueSectionFields.valueFieldKey] || ""}
                  onChange={(v) => setValue(config.valueSectionFields.valueFieldKey, v)}
                  placeholder={config.valueSectionFields.valuePlaceholder}
                  type="text"
                  tooltip={scaffolding === 1 ? config.valueSectionFields.valueTooltip : undefined}
                  error={errors.find((e) => e.field === config.valueSectionFields.valueFieldKey)?.message}
                />
                {fieldVisible("freight") && (
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      label={config.valueSectionFields.freightLabel}
                      value={values.freight}
                      onChange={(v) => setValue("freight", v)}
                      placeholder={config.valueSectionFields.freightPlaceholder}
                      type="text"
                    />
                    <FormField
                      label={config.valueSectionFields.insuranceLabel}
                      value={values.insurance}
                      onChange={(v) => setValue("insurance", v)}
                      placeholder={config.valueSectionFields.insurancePlaceholder}
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
                    placeholder={config.grossWeightPlaceholder}
                    type="text"
                    tooltip={scaffolding === 1 ? config.grossWeightTooltip : undefined}
                    error={errors.find((e) => e.field === "grossWeight")?.message}
                  />
                  <FormSelect
                    label="Gross Weight Unit"
                    value={values.grossWeightUnit}
                    onChange={(v) => setValue("grossWeightUnit", v)}
                    options={config.grossWeightUnitOptions}
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
                  options={config.paymentOptions}
                  tooltip={scaffolding === 1 ? config.paymentTooltip : undefined}
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
                  STAMP &amp; SUBMIT
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
              <h3 className="text-customs-gold font-bold">{config.rulebookTitle}</h3>
              <button onClick={() => setShowRulebook(false)} className="text-customs-muted hover:text-white cursor-pointer bg-transparent border-0 text-lg">&times;</button>
            </div>
            <div className="space-y-3 text-xs text-customs-muted">
              {config.rulebookEntries.map((entry, i) => (
                <div key={i}>
                  <h4 className="text-white font-medium mb-1">{entry.title}</h4>
                  <p>{entry.content}</p>
                  {entry.extra && (
                    <p className="text-customs-amber mt-1">{entry.extra}</p>
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
