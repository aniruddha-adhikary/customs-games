import type { BeatAConfig, ValidationError, ScoringResult, FieldStatus } from "./beatAConfig";
import type { MessageType } from "../../data/case014";
import { CaseFilePanel } from "./CaseFilePanel";
import { CaseFilePanel025 } from "./CaseFilePanel025";
import { CaseFilePanel038 } from "./CaseFilePanel038";
import { CaseFilePanel052 } from "./CaseFilePanel052";
import { CASE_038 } from "../../data/case038";

/* ───── shared field-visibility tables ───── */

const VIS_STANDARD: Record<string, Record<string, FieldStatus>> = {
  importerUEN: { IN: "R", OUT: "H", TSHIP: "H", COO: "H" },
  exporterUEN: { IN: "H", OUT: "R", TSHIP: "H", COO: "H" },
  placeOfReleaseFTZ: { IN: "R", OUT: "H", TSHIP: "R", COO: "H" },
  placeOfReleaseOthers: { IN: "H", OUT: "R", TSHIP: "H", COO: "H" },
  placeOfReceiptOthers: { IN: "R", OUT: "H", TSHIP: "H", COO: "H" },
  placeOfReceiptFTZ: { IN: "H", OUT: "R", TSHIP: "R", COO: "H" },
  placeOfReceiptLicence: { IN: "O", OUT: "H", TSHIP: "R", COO: "H" },
  placeOfReceiptExemption: { IN: "O", OUT: "H", TSHIP: "H", COO: "H" },
  paymentCondition: { IN: "R", OUT: "R", TSHIP: "H", COO: "H" },
  freight: { IN: "R", OUT: "O", TSHIP: "O", COO: "H" },
  insurance: { IN: "R", OUT: "O", TSHIP: "O", COO: "H" },
};

const ALWAYS_VISIBLE = [
  "messageType", "declarationType", "declaringAgentUEN", "consignee",
  "supplier", "hsCode", "hsQuantity", "hsUnit", "packingOuter",
  "packingOuterUnit", "packingInner", "packingInnerUnit", "cargoPackingType",
  "transportMode", "invoiceCurrency", "exchangeRate", "cifValue",
  "grossWeight", "grossWeightUnit",
];

function makeGetFieldStatus(vis: Record<string, Record<string, FieldStatus>>) {
  return (fieldId: string, messageType: MessageType | ""): FieldStatus => {
    if (ALWAYS_VISIBLE.includes(fieldId)) return "R";
    if (!messageType || !vis[fieldId]) return "H";
    return (vis[fieldId][messageType] as FieldStatus) || "H";
  };
}

const getFieldStatusStandard = makeGetFieldStatus(VIS_STANDARD);

const VIS_038: Record<string, Record<string, FieldStatus>> = {
  importerUEN: { IN: "R", OUT: "H", TSHIP: "H", COO: "H" },
  placeOfReleaseFTZ: { IN: "R", OUT: "H", TSHIP: "R", COO: "H" },
  placeOfReceiptOthers: { IN: "R", OUT: "H", TSHIP: "H", COO: "H" },
  placeOfReceiptFTZ: { IN: "H", OUT: "R", TSHIP: "R", COO: "H" },
  paymentCondition: { IN: "R", OUT: "R", TSHIP: "H", COO: "H" },
  freight: { IN: "R", OUT: "O", TSHIP: "O", COO: "H" },
  insurance: { IN: "R", OUT: "O", TSHIP: "O", COO: "H" },
};

const getFieldStatus038 = makeGetFieldStatus(VIS_038);

/* ───── shared option sets ───── */

const FTZ_OPTIONS = [
  { value: "T15", label: "T15 \u2014 Tanjong Pagar Terminal FTZ" },
  { value: "T16", label: "T16 \u2014 Keppel Terminal FTZ" },
  { value: "C01", label: "C01 \u2014 Changi Airfreight Centre" },
  { value: "PP1", label: "PP1 \u2014 Pasir Panjang Terminal FTZ" },
];

const RECEIPT_OTHERS_OPTIONS = [
  { value: "Others", label: "Others (general delivery)" },
  { value: "ME", label: "ME \u2014 Major Exporter scheme" },
  { value: "AISS", label: "AISS" },
  { value: "IGDS", label: "IGDS" },
  { value: "RCNOSTK", label: "RCNOSTK" },
  { value: "SPNOSTK", label: "SPNOSTK" },
  { value: "RELIEF", label: "RELIEF \u2014 controlled goods <= SGD 400" },
  { value: "TRADESP", label: "TRADESP \u2014 trade samples <= SGD 400" },
];

const DECL_TYPE_IMPORT = [
  // IN-PAYMENT (IPT) — duty and/or GST payable
  { value: "DNG", label: "DNG \u2014 Duty & GST" },
  { value: "GST", label: "GST \u2014 GST only (non-dutiable)" },
  { value: "DUT", label: "DUT \u2014 Duty only" },
  // IN-NON-PAYMENT (INP) — duty/GST suspended or exempted
  { value: "APS", label: "APS \u2014 Approved Premises/Schemes" },
  { value: "SFZ", label: "SFZ \u2014 Storage in FTZ" },
  { value: "GTR", label: "GTR \u2014 GST Relief / Duty Exemption" },
  { value: "REX", label: "REX \u2014 Re-export" },
];
const DECL_TYPE_EXPORT = [
  { value: "DRT", label: "DRT \u2014 Direct" },
  { value: "APS", label: "APS \u2014 Approved Premises/Schemes (from LW/ZGS)" },
];
const DECL_TYPE_TSHIP = [
  { value: "TTF", label: "TTF \u2014 Through Transhipment (same FTZ)" },
  { value: "TTI", label: "TTI \u2014 Through Transhipment (inter-gateway)" },
  { value: "IGM", label: "IGM \u2014 Inter-Gateway Movement" },
  { value: "REM", label: "REM \u2014 Removal (between LW/ZGS)" },
  { value: "BRE", label: "BRE \u2014 Blanket Removal" },
];

const STANDARD_DECL_OPTS: Record<string, { value: string; label: string }[]> = {
  IN: DECL_TYPE_IMPORT,
  OUT: DECL_TYPE_EXPORT,
  TSHIP: DECL_TYPE_TSHIP,
};

/* ───── Case #014: Bordeaux Wine Import ───── */

function validatePermit014(values: Record<string, string>, scaffolding: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const msgType = values.messageType;

  if (msgType && msgType !== "IN") {
    errors.push({ code: "CLASS_MSGTYPE", field: "messageType", message: "Case #014 is an import into Singapore. Message Type should be IN.", severity: "soft" });
  }
  if (values.importerUEN === "99991000000G" || values.importerUEN === "99999000000N" || values.importerUEN === "99999990000C") {
    errors.push({ code: "UEN_GENERIC", field: "importerUEN", message: "Generic UEN used \u2014 verify this is correct for your consignee. Real UENs required where available.", severity: scaffolding === 1 ? "soft" : "hard" });
  }
  if (values.hsQuantity === "0") {
    errors.push({ code: "QTY_ZERO", field: "hsQuantity", message: "HS Qty '0' is not allowed. Enter actual quantity.", severity: "hard" });
  }
  if (values.hsQuantity === "-") {
    errors.push({ code: "QTY_DASH", field: "hsQuantity", message: "'-' is not a valid HS Qty entry. Enter actual quantity.", severity: "hard" });
  }
  const hsQty = parseFloat(values.hsQuantity);
  if (values.hsUnit === "BOT" && !isNaN(hsQty)) {
    errors.push({ code: "UOM_MISMATCH", field: "hsUnit", message: "The STCCED 2022 unit for this HS code is litres (LTR), not bottles. Bottle count goes in the packing hierarchy. Enter litre quantity: 1,200 x 0.75 L = 900.000 LTR.", severity: scaffolding === 1 ? "soft" : "hard" });
  }
  if (values.hsUnit === "LTR" && !isNaN(hsQty) && (hsQty === 1200 || hsQty === 1200.0)) {
    errors.push({ code: "UOM_MISMATCH", field: "hsQuantity", message: "1200 is the bottle count. HS Qty in LTR = 1,200 x 0.75 = 900.000 LTR.", severity: "soft" });
  }
  const packOuter = parseFloat(values.packingOuter);
  const packInner = parseFloat(values.packingInner);
  if (packOuter > 0 && (isNaN(packInner) || packInner <= 0)) {
    errors.push({ code: "PACK_DEPTH_LIQUOR", field: "packingInner", message: "For dutiable liquors, packing must be declared down to the smallest unit (bottle/can). Add In-pack level.", severity: "hard" });
  }
  const cifVal = parseFloat(values.cifValue);
  const freightVal = parseFloat(values.freight || "0");
  const insuranceVal = parseFloat(values.insurance || "0");
  if (!isNaN(cifVal) && cifVal > 0) {
    if (cifVal <= 14.51 && cifVal >= 14.49) {
      errors.push({ code: "UNIT_PRICE_AS_TOTAL", field: "cifValue", message: "The declared value appears to be a unit price. Customs value must be the total transaction value for the entire shipment.", severity: "hard" });
    }
    const fobSgd = 17400 * 1.46;
    if (Math.abs(cifVal - fobSgd) < 50 && (freightVal > 0 || insuranceVal > 0)) {
      errors.push({ code: "INCOTERM_FOB_UNDERDECLARE", field: "cifValue", message: "Invoice terms are FOB. For Customs valuation, you must add freight and insurance to arrive at CIF. Customs value = FOB + Freight + Insurance.", severity: scaffolding === 1 ? "soft" : "hard" });
    }
  }
  if (values.invoiceCurrency === "SGD" && values.exchangeRate === "1") {
    errors.push({ code: "CURRENCY_EXCH_ERROR", field: "invoiceCurrency", message: "Invoice is in EUR. Verify the exchange rate and declare the correct currency.", severity: "soft" });
  }
  if (values.grossWeightUnit === "KGM" && values.transportMode === "1") {
    errors.push({ code: "WEIGHT_UNIT_SEA", field: "grossWeightUnit", message: "For sea freight IN permits, gross weight is typically declared in TNE (metric tonnes). Verify against transport document.", severity: "soft" });
  }
  const grossWt = parseFloat(values.grossWeight);
  if (values.grossWeightUnit === "TNE" && !isNaN(grossWt) && grossWt > 100) {
    errors.push({ code: "WEIGHT_UNIT_SEA", field: "grossWeight", message: "Weight 1920 TNE seems too high. The B/L states 1,920 kg = 1.920 TNE for sea shipments.", severity: "soft" });
  }
  if (values.cargoPackingType === "5" && values.transportMode === "1") {
    errors.push({ code: "CARGO_PACK_TYPE_MISMATCH", field: "cargoPackingType", message: "Check the Bill of Lading \u2014 a container number is present. Containerised (9) is expected.", severity: "soft" });
  }
  return errors;
}

function scorePermit014(values: Record<string, string>): ScoringResult {
  const checks: { field: string; yours: () => string; expected: string; check: () => boolean }[] = [
    { field: "Message Type", yours: () => values.messageType || "\u2014", expected: "IN", check: () => values.messageType === "IN" },
    { field: "Declaration Type", yours: () => values.declarationType || "\u2014", expected: "DNG", check: () => values.declarationType === "DNG" },
    { field: "Importer UEN", yours: () => values.importerUEN || "\u2014", expected: "201835672K", check: () => values.importerUEN === "201835672K" },
    { field: "Place of Release", yours: () => values.placeOfReleaseFTZ || "\u2014", expected: "PP1 (Pasir Panjang FTZ)", check: () => values.placeOfReleaseFTZ === "PP1" },
    { field: "Place of Receipt", yours: () => values.placeOfReceiptOthers || "\u2014", expected: "Others", check: () => values.placeOfReceiptOthers === "Others" },
    { field: "HS Code", yours: () => values.hsCode || "\u2014", expected: "2204.21", check: () => values.hsCode?.startsWith("2204.21") || false },
    { field: "HS Quantity", yours: () => values.hsQuantity ? `${values.hsQuantity} ${values.hsUnit || "?"}` : "\u2014", expected: "900.000 LTR", check: () => { const q = parseFloat(values.hsQuantity); return !isNaN(q) && Math.abs(q - 900) < 5; } },
    { field: "HS Unit", yours: () => values.hsUnit || "\u2014", expected: "LTR", check: () => values.hsUnit === "LTR" },
    { field: "Packing Outer", yours: () => values.packingOuter ? `${values.packingOuter} ${values.packingOuterUnit || "?"}` : "\u2014", expected: "100 CTN", check: () => values.packingOuter === "100" && values.packingOuterUnit === "CTN" },
    { field: "Packing Inner", yours: () => values.packingInner ? `${values.packingInner} ${values.packingInnerUnit || "?"}` : "\u2014", expected: "12 BOT", check: () => values.packingInner === "12" && values.packingInnerUnit === "BOT" },
    { field: "Cargo Packing Type", yours: () => values.cargoPackingType === "9" ? "9 (Containerised)" : values.cargoPackingType === "5" ? "5 (Non-containerised)" : "\u2014", expected: "9 (Containerised)", check: () => values.cargoPackingType === "9" },
    { field: "Transport Mode", yours: () => values.transportMode === "1" ? "1 (Sea)" : values.transportMode === "4" ? "4 (Air)" : values.transportMode || "\u2014", expected: "1 (Sea)", check: () => values.transportMode === "1" },
    { field: "Invoice Currency", yours: () => values.invoiceCurrency || "\u2014", expected: "EUR", check: () => values.invoiceCurrency === "EUR" },
    { field: "Exchange Rate", yours: () => values.exchangeRate || "\u2014", expected: "1.46", check: () => { const r = parseFloat(values.exchangeRate); return !isNaN(r) && Math.abs(r - 1.46) / 1.46 < 0.005; } },
    { field: "CIF Value (SGD)", yours: () => values.cifValue || "\u2014", expected: "26,244.96", check: () => { const v = parseFloat(values.cifValue); return !isNaN(v) && Math.abs(v - 26244.96) / 26244.96 < 0.01; } },
    { field: "Freight", yours: () => values.freight || "\u2014", expected: "480", check: () => { const f = parseFloat(values.freight); return !isNaN(f) && Math.abs(f - 480) < 5; } },
    { field: "Insurance", yours: () => values.insurance || "\u2014", expected: "96", check: () => { const i = parseFloat(values.insurance); return !isNaN(i) && Math.abs(i - 96) < 5; } },
    { field: "Gross Weight", yours: () => values.grossWeight ? `${values.grossWeight} ${values.grossWeightUnit || "?"}` : "\u2014", expected: "1.920 TNE", check: () => { const w = parseFloat(values.grossWeight); return !isNaN(w) && Math.abs(w - 1.92) / 1.92 < 0.05; } },
    { field: "Gross Weight Unit", yours: () => values.grossWeightUnit || "\u2014", expected: "TNE", check: () => values.grossWeightUnit === "TNE" },
    { field: "Payment Condition", yours: () => values.paymentCondition === "G1" ? "G1 (Pay on approval)" : values.paymentCondition || "\u2014", expected: "G1", check: () => values.paymentCondition === "G1" },
  ];
  const details = checks.map((c) => ({ field: c.field, correct: c.check(), yours: c.yours(), expected: c.expected }));
  return { total: details.filter((d) => d.correct).length, max: checks.length, details };
}

export const BEAT_A_014: BeatAConfig = {
  caseId: "014",
  backLink: "/",
  headerTitle: "",
  introText: "You are a Declaring Agent submitting a TradeNet permit for Case #014 (Bordeaux wine import). Once approved, a Cargo Clearance Permit (CCP) will be issued.",
  introSubtext: "Start by selecting Message Type. Payment condition G1 applies (duty/GST paid before FTZ release).",
  validatePermit: validatePermit014,
  scorePermit: scorePermit014,
  getFieldStatus: getFieldStatusStandard,
  CaseFilePanel: CaseFilePanel,
  initialValues: {
    messageType: "", declarationType: "", declaringAgentUEN: "199804321D",
    importerUEN: "", consignee: "", supplier: "",
    placeOfReleaseFTZ: "", placeOfReceiptOthers: "", placeOfReceiptExemption: "",
    hsCode: "", hsQuantity: "", hsUnit: "",
    packingOuter: "", packingOuterUnit: "", packingInner: "", packingInnerUnit: "",
    cargoPackingType: "", transportMode: "",
    invoiceCurrency: "", exchangeRate: "", cifValue: "", freight: "", insurance: "",
    grossWeight: "", grossWeightUnit: "", paymentCondition: "",
  },
  scoreableFields: [
    "messageType", "declarationType", "importerUEN", "placeOfReleaseFTZ",
    "placeOfReceiptOthers", "hsCode", "hsQuantity", "hsUnit",
    "packingOuter", "packingOuterUnit", "packingInner", "packingInnerUnit",
    "cargoPackingType", "transportMode", "invoiceCurrency", "exchangeRate",
    "cifValue", "freight", "insurance", "grossWeight", "grossWeightUnit",
    "paymentCondition",
  ],
  fieldsToResetOnMsgTypeChange: ["declarationType", "placeOfReleaseFTZ", "placeOfReceiptOthers"],
  declTypeOptions: STANDARD_DECL_OPTS,
  agentLabel: "Declaring Agent UEN",
  uenField: { fieldKey: "importerUEN", label: "Importer UEN", placeholder: "e.g. 201835672K", tooltip: "UEN = the importer's registered entity number. Check the invoice.", visibilityFieldId: "importerUEN" },
  consigneeLabel: "Consignee",
  consigneePlaceholder: "Consignee name",
  supplierLabel: "Supplier / Shipper",
  supplierPlaceholder: "Overseas supplier",
  placeSectionTitle: "PLACE OF RELEASE / RECEIPT",
  placeFields: [
    { fieldKey: "placeOfReleaseFTZ", label: "Place of Release (FROM)", options: FTZ_OPTIONS, tooltip: "For an IN permit, 'release FROM' = where goods leave Customs control.", visibilityFieldId: "placeOfReleaseFTZ" },
    { fieldKey: "placeOfReceiptOthers", label: "Place of Receipt (TO)", options: RECEIPT_OTHERS_OPTIONS, tooltip: "For an IN permit, 'receipt TO' = where goods go next. Standard delivery = Others.", visibilityFieldId: "placeOfReceiptOthers" },
  ],
  hsCodePlaceholder: "e.g. 2204.21",
  hsCodeTooltip: "Wine = Chapter 22, Heading 2204. 750ml still bottles = sub-heading .21",
  hsQuantityPlaceholder: "e.g. 900.000",
  hsQuantityTooltip: "Enter qty in STCCED-prescribed unit (LTR for wine). 1,200 x 0.75 = 900.000",
  hsUnitOptions: [
    { value: "LTR", label: "LTR (litres)" },
    { value: "BOT", label: "BOT (bottles)" },
    { value: "KGM", label: "KGM (kg)" },
    { value: "PCS", label: "PCS (pieces)" },
  ],
  packingOuterPlaceholder: "e.g. 100",
  packingOuterUnitOptions: [
    { value: "CTN", label: "CTN (carton)" },
    { value: "PLT", label: "PLT (pallet)" },
    { value: "BOX", label: "BOX" },
  ],
  packingInnerPlaceholder: "e.g. 12",
  packingInnerTooltip: "Dutiable liquor requires packing declared to the bottle.",
  packingInnerUnitOptions: [
    { value: "BOT", label: "BOT (bottle)" },
    { value: "CAN", label: "CAN" },
    { value: "PKT", label: "PKT (packet)" },
  ],
  cargoPackingOptions: [
    { value: "9", label: "9 \u2014 Containerised" },
    { value: "5", label: "5 \u2014 Non-containerised" },
  ],
  transportTooltip: "Check the Bill of Lading: vessel name, port of loading.",
  currencyOptions: [
    { value: "EUR", label: "EUR" },
    { value: "USD", label: "USD" },
    { value: "SGD", label: "SGD" },
    { value: "GBP", label: "GBP" },
  ],
  valueSectionFields: {
    valueFieldKey: "cifValue",
    valueLabel: "CIF Value (SGD)",
    valuePlaceholder: "Total CIF in SGD",
    valueTooltip: "The invoice says FOB. CIF = FOB + Freight + Insurance. Both are on the documents.",
    freightLabel: "Freight (EUR)",
    freightPlaceholder: "e.g. 480",
    insuranceLabel: "Insurance (EUR)",
    insurancePlaceholder: "e.g. 96",
  },
  grossWeightPlaceholder: "e.g. 1.920",
  grossWeightTooltip: "Use the B/L gross weight. Sea shipments = TNE.",
  grossWeightUnitOptions: [
    { value: "TNE", label: "TNE (metric tonnes)" },
    { value: "KGM", label: "KGM (kilograms)" },
  ],
  paymentOptions: [
    { value: "G1", label: "G1 \u2014 Pay on approval" },
    { value: "GF", label: "GF \u2014 GIRO (IBG)" },
    { value: "G7", label: "G7 \u2014 GIRO (IBG)" },
  ],
  paymentTooltip: "G1 = pay now. Wine is dutiable, so G1 is correct here.",
  messageTypeTooltip: "Message Type = direction of movement. Goods entering Singapore = IN.",
  declarationTypeTooltip: "IN-PAYMENT types: DNG (Duty & GST) for dutiable goods, GST for non-dutiable. IN-NON-PAYMENT: APS for warehouse/scheme movements. Wine is dutiable \u2192 DNG.",
  rulebookTitle: "Rulebook",
  rulebookEntries: [
    { title: "Message Types", content: "IN = Import, OUT = Export, Transhipment/Movement, COO" },
    { title: "IN Declaration Types", content: "IN-PAYMENT: DNG (Duty & GST) for dutiable goods, GST for non-dutiable, DUT for duty-only. IN-NON-PAYMENT: APS (Approved Premises/Schemes) for LW/ZGS/MES movements, SFZ (FTZ storage), GTR (relief/exemption), REX (re-export)." },
    { title: "HS Code", content: "Still wine in containers \u2264 2L: 2204.21. Declare to full digit level per STCCED 2022." },
    { title: "HS Qty Unit", content: "STCCED 2022 unit for 2204.21 is LTR (litres), not bottles. Convert: bottles x 0.75L." },
    { title: "Packing (Liquor)", content: "Dutiable liquor must be declared to bottle level. Outer: CTN, In-pack: BOT. Cigarettes/cigars must go down to the stick (STK)." },
    { title: "Valuation (FOB)", content: "When INCOTERM = FOB, add freight + insurance to get CIF. CIF = FOB + Freight + Insurance. Common error: omitting freight/insurance or using unit price instead of total value." },
    { title: "Gross Weight", content: "Sea = TNE (metric tonnes). Air = KGM. For IN/TNP: weight is based on the INWARD leg. For OUT: based on OUTWARD leg." },
    { title: "Payment", content: "G1 = pay at approval (dutiable goods). GF/G7 = GIRO (non-dutiable). GF/G7 same-day amendment window. Breach of G1/GF conditions is an offence under the Customs Act." },
    { title: "Common Errors", content: "Top errors per Singapore Customs: (1) Wrong declaration type, (2) Incorrect Place of Release/Receipt, (3) Wrong container number, (4) Incorrect UEN, (5) Wrong HS code or non-itemisation, (6) Wrong HS Qty/UOM, (7) Wrong CIF value due to incorrect currency, omitted invoices, or INCOTERM confusion." },
    { title: "Permit Conditions", content: "Once CCP is issued, you must: present permit at FTZ checkpoint for endorsement, return Z02/Z06/Z18 documents within 48 hrs, and pay duty/GST per G1/GF condition. Failure = offence under Customs Act (Cap 70) or RIEA (Cap 272A)." },
  ],
};

/* ───── Case #025: MacBook Pro Import ───── */

function validatePermit025(values: Record<string, string>, scaffolding: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const msgType = values.messageType;

  if (msgType && msgType !== "IN") {
    errors.push({ code: "CLASS_MSGTYPE", field: "messageType", message: "Case #025 is an import into Singapore. Message Type should be IN.", severity: "soft" });
  }
  if (values.importerUEN === "99991000000G" || values.importerUEN === "99999000000N" || values.importerUEN === "99999990000C") {
    errors.push({ code: "UEN_GENERIC", field: "importerUEN", message: "Generic UEN used \u2014 verify this is correct for your consignee. Real UENs required where available.", severity: scaffolding === 1 ? "soft" : "hard" });
  }
  if (values.hsQuantity === "0") {
    errors.push({ code: "QTY_ZERO", field: "hsQuantity", message: "HS Qty '0' is not allowed. Enter actual quantity.", severity: "hard" });
  }
  if (values.hsQuantity === "-") {
    errors.push({ code: "QTY_DASH", field: "hsQuantity", message: "'-' is not a valid HS Qty entry. Enter actual quantity.", severity: "hard" });
  }
  if (values.hsUnit === "KGM") {
    errors.push({ code: "UOM_MISMATCH", field: "hsUnit", message: "The STCCED unit for HS 8471.30 (portable data processing machines) is U (units/pieces), not KGM. Weight goes in the gross weight field.", severity: scaffolding === 1 ? "soft" : "hard" });
  }
  if (values.hsUnit === "PCS") {
    errors.push({ code: "UOM_MISMATCH_PCS", field: "hsUnit", message: "Close, but the STCCED 2022 prescribed unit for HS 8471.30 is U (units), not PCS. U is the standard unit code.", severity: scaffolding === 1 ? "soft" : "hard" });
  }
  if (values.hsUnit === "LTR") {
    errors.push({ code: "UOM_MISMATCH_LTR", field: "hsUnit", message: "LTR (litres) is for liquids. Laptops use U (units) as the HS quantity unit.", severity: "hard" });
  }
  const cifVal = parseFloat(values.cifValue);
  const freightVal = parseFloat(values.freight || "0");
  const insuranceVal = parseFloat(values.insurance || "0");
  if (!isNaN(cifVal) && cifVal > 0 && (freightVal > 0 || insuranceVal > 0)) {
    errors.push({ code: "CIF_DOUBLE_COUNT", field: "cifValue", message: "Invoice INCOTERM is CIF \u2014 freight and insurance are ALREADY included in the invoice price. Do NOT add them again or you will double-count.", severity: scaffolding === 1 ? "soft" : "hard" });
  }
  if (values.paymentCondition === "G1") {
    errors.push({ code: "PAYMENT_DUTIABLE_MISMATCH", field: "paymentCondition", message: "G1 (Pay on approval) is for dutiable goods. Laptops are non-dutiable in Singapore \u2014 use GF (GIRO).", severity: scaffolding === 1 ? "soft" : "hard" });
  }
  if (values.grossWeightUnit === "TNE" && values.transportMode === "4") {
    errors.push({ code: "WEIGHT_UNIT_AIR", field: "grossWeightUnit", message: "For air freight, gross weight is declared in KGM (kilograms), not TNE (metric tonnes). Check the Air Waybill.", severity: "soft" });
  }
  const grossWt = parseFloat(values.grossWeight);
  if (values.grossWeightUnit === "KGM" && !isNaN(grossWt) && grossWt < 10) {
    errors.push({ code: "WEIGHT_TOO_LOW", field: "grossWeight", message: "Weight seems too low for 500 laptops. The AWB states 1,250 kg gross weight.", severity: "soft" });
  }
  if (values.cargoPackingType === "9" && values.transportMode === "4") {
    errors.push({ code: "CARGO_PACK_TYPE_MISMATCH", field: "cargoPackingType", message: "Air freight uses pallets, not sea containers. Cargo packing type should be 5 (Non-containerised).", severity: "soft" });
  }
  if (values.placeOfReleaseFTZ === "T15" && values.transportMode === "4") {
    errors.push({ code: "PLACE_RELEASE_AIR", field: "placeOfReleaseFTZ", message: "T15 is Tanjong Pagar (sea port). Air freight arrives at Changi Airfreight Centre (C01).", severity: "soft" });
  }
  if (values.invoiceCurrency === "SGD" && values.exchangeRate === "1") {
    errors.push({ code: "CURRENCY_EXCH_ERROR", field: "invoiceCurrency", message: "Invoice is in USD. Verify the exchange rate and declare the correct currency.", severity: "soft" });
  }
  return errors;
}

function scorePermit025(values: Record<string, string>): ScoringResult {
  const checks: { field: string; yours: () => string; expected: string; check: () => boolean }[] = [
    { field: "Message Type", yours: () => values.messageType || "\u2014", expected: "IN", check: () => values.messageType === "IN" },
    { field: "Declaration Type", yours: () => values.declarationType || "\u2014", expected: "GST", check: () => values.declarationType === "GST" },
    { field: "Importer UEN", yours: () => values.importerUEN || "\u2014", expected: "200412345D", check: () => values.importerUEN === "200412345D" },
    { field: "Place of Release", yours: () => values.placeOfReleaseFTZ || "\u2014", expected: "C01 (Changi)", check: () => values.placeOfReleaseFTZ === "C01" },
    { field: "Place of Receipt", yours: () => values.placeOfReceiptOthers || "\u2014", expected: "Others", check: () => values.placeOfReceiptOthers === "Others" },
    { field: "HS Code", yours: () => values.hsCode || "\u2014", expected: "8471.30", check: () => values.hsCode?.startsWith("8471.30") || false },
    { field: "HS Quantity", yours: () => values.hsQuantity ? `${values.hsQuantity} ${values.hsUnit || "?"}` : "\u2014", expected: "500 U", check: () => { const q = parseFloat(values.hsQuantity); return !isNaN(q) && Math.abs(q - 500) < 5; } },
    { field: "HS Unit", yours: () => values.hsUnit || "\u2014", expected: "U", check: () => values.hsUnit === "U" },
    { field: "Packing Outer", yours: () => values.packingOuter ? `${values.packingOuter} ${values.packingOuterUnit || "?"}` : "\u2014", expected: "50 PLT", check: () => values.packingOuter === "50" && values.packingOuterUnit === "PLT" },
    { field: "Packing Inner", yours: () => values.packingInner ? `${values.packingInner} ${values.packingInnerUnit || "?"}` : "\u2014", expected: "10 PCS", check: () => values.packingInner === "10" && values.packingInnerUnit === "PCS" },
    { field: "Cargo Packing Type", yours: () => values.cargoPackingType === "9" ? "9 (Containerised)" : values.cargoPackingType === "5" ? "5 (Non-containerised)" : "\u2014", expected: "5 (Non-containerised)", check: () => values.cargoPackingType === "5" },
    { field: "Transport Mode", yours: () => values.transportMode === "1" ? "1 (Sea)" : values.transportMode === "4" ? "4 (Air)" : values.transportMode || "\u2014", expected: "4 (Air)", check: () => values.transportMode === "4" },
    { field: "Invoice Currency", yours: () => values.invoiceCurrency || "\u2014", expected: "USD", check: () => values.invoiceCurrency === "USD" },
    { field: "Exchange Rate", yours: () => values.exchangeRate || "\u2014", expected: "1.35", check: () => { const r = parseFloat(values.exchangeRate); return !isNaN(r) && Math.abs(r - 1.35) / 1.35 < 0.005; } },
    { field: "CIF Value (SGD)", yours: () => values.cifValue || "\u2014", expected: "2,361,825.00", check: () => { const v = parseFloat(values.cifValue); return !isNaN(v) && Math.abs(v - 2361825) / 2361825 < 0.01; } },
    { field: "Freight", yours: () => values.freight || "\u2014", expected: "0 (CIF)", check: () => { const f = parseFloat(values.freight || "0"); return isNaN(f) || f === 0; } },
    { field: "Insurance", yours: () => values.insurance || "\u2014", expected: "0 (CIF)", check: () => { const ins = parseFloat(values.insurance || "0"); return isNaN(ins) || ins === 0; } },
    { field: "Gross Weight", yours: () => values.grossWeight ? `${values.grossWeight} ${values.grossWeightUnit || "?"}` : "\u2014", expected: "1,250 KGM", check: () => { const w = parseFloat(values.grossWeight); return !isNaN(w) && Math.abs(w - 1250) / 1250 < 0.05; } },
    { field: "Gross Weight Unit", yours: () => values.grossWeightUnit || "\u2014", expected: "KGM", check: () => values.grossWeightUnit === "KGM" },
    { field: "Payment Condition", yours: () => values.paymentCondition === "G1" ? "G1 (Pay on approval)" : values.paymentCondition === "GF" ? "GF (GIRO)" : values.paymentCondition || "\u2014", expected: "GF", check: () => values.paymentCondition === "GF" },
  ];
  const details = checks.map((c) => ({ field: c.field, correct: c.check(), yours: c.yours(), expected: c.expected }));
  return { total: details.filter((d) => d.correct).length, max: checks.length, details };
}

export const BEAT_A_025: BeatAConfig = {
  caseId: "025",
  backLink: "/case-025",
  headerTitle: "CASE #025",
  introText: "You are a Declaring Agent submitting a TradeNet permit for Case #025 (MacBook Pro import). Once approved, a CCP with payment condition GF (GIRO) will be issued.",
  introSubtext: "Non-dutiable goods: only 9% GST applies, auto-deducted via GIRO. Start by selecting Message Type.",
  validatePermit: validatePermit025,
  scorePermit: scorePermit025,
  getFieldStatus: getFieldStatusStandard,
  CaseFilePanel: CaseFilePanel025,
  initialValues: {
    messageType: "", declarationType: "", declaringAgentUEN: "199804321D",
    importerUEN: "", consignee: "", supplier: "",
    placeOfReleaseFTZ: "", placeOfReceiptOthers: "", placeOfReceiptExemption: "",
    hsCode: "", hsQuantity: "", hsUnit: "",
    packingOuter: "", packingOuterUnit: "", packingInner: "", packingInnerUnit: "",
    cargoPackingType: "", transportMode: "",
    invoiceCurrency: "", exchangeRate: "", cifValue: "", freight: "", insurance: "",
    grossWeight: "", grossWeightUnit: "", paymentCondition: "",
  },
  scoreableFields: [
    "messageType", "declarationType", "importerUEN", "placeOfReleaseFTZ",
    "placeOfReceiptOthers", "hsCode", "hsQuantity", "hsUnit",
    "packingOuter", "packingOuterUnit", "packingInner", "packingInnerUnit",
    "cargoPackingType", "transportMode", "invoiceCurrency", "exchangeRate",
    "cifValue", "freight", "insurance", "grossWeight", "grossWeightUnit",
    "paymentCondition",
  ],
  fieldsToResetOnMsgTypeChange: ["declarationType", "placeOfReleaseFTZ", "placeOfReceiptOthers"],
  declTypeOptions: STANDARD_DECL_OPTS,
  agentLabel: "Declaring Agent UEN",
  uenField: { fieldKey: "importerUEN", label: "Importer UEN", placeholder: "e.g. 200412345D", tooltip: "UEN = the importer's registered entity number. Check the invoice.", visibilityFieldId: "importerUEN" },
  consigneeLabel: "Consignee",
  consigneePlaceholder: "Consignee name",
  supplierLabel: "Supplier / Shipper",
  supplierPlaceholder: "Overseas supplier",
  placeSectionTitle: "PLACE OF RELEASE / RECEIPT",
  placeFields: [
    { fieldKey: "placeOfReleaseFTZ", label: "Place of Release (FROM)", options: FTZ_OPTIONS, tooltip: "Air freight arrives at Changi. Check the Air Waybill for the port of discharge.", visibilityFieldId: "placeOfReleaseFTZ" },
    { fieldKey: "placeOfReceiptOthers", label: "Place of Receipt (TO)", options: RECEIPT_OTHERS_OPTIONS, tooltip: "For an IN permit, 'receipt TO' = where goods go next. Standard delivery = Others.", visibilityFieldId: "placeOfReceiptOthers" },
  ],
  hsCodePlaceholder: "e.g. 8471.30",
  hsCodeTooltip: "Portable digital automatic data processing machines (laptops, weight \u2264 10kg) = HS 8471.30",
  hsQuantityPlaceholder: "e.g. 500",
  hsQuantityTooltip: "Enter quantity in STCCED-prescribed unit. For laptops, it's U (units).",
  hsUnitOptions: [
    { value: "U", label: "U (units)" },
    { value: "KGM", label: "KGM (kg)" },
    { value: "PCS", label: "PCS (pieces)" },
    { value: "LTR", label: "LTR (litres)" },
  ],
  packingOuterPlaceholder: "e.g. 50",
  packingOuterUnitOptions: [
    { value: "PLT", label: "PLT (pallet)" },
    { value: "CTN", label: "CTN (carton)" },
    { value: "BOX", label: "BOX" },
  ],
  packingInnerPlaceholder: "e.g. 10",
  packingInnerTooltip: "Each pallet contains 10 individually-boxed laptops.",
  packingInnerUnitOptions: [
    { value: "PCS", label: "PCS (piece)" },
    { value: "BOX", label: "BOX" },
    { value: "PKT", label: "PKT (packet)" },
  ],
  cargoPackingOptions: [
    { value: "5", label: "5 \u2014 Non-containerised" },
    { value: "9", label: "9 \u2014 Containerised" },
  ],
  transportTooltip: "Check the Air Waybill: flight number, port of loading.",
  currencyOptions: [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "SGD", label: "SGD" },
    { value: "GBP", label: "GBP" },
  ],
  valueSectionFields: {
    valueFieldKey: "cifValue",
    valueLabel: "CIF Value (SGD)",
    valuePlaceholder: "Total CIF in SGD",
    valueTooltip: "The invoice is CIF \u2014 freight & insurance are ALREADY included. Do NOT add them again.",
    freightLabel: "Freight (USD)",
    freightPlaceholder: "0 (included in CIF)",
    insuranceLabel: "Insurance (USD)",
    insurancePlaceholder: "0 (included in CIF)",
  },
  grossWeightPlaceholder: "e.g. 1250",
  grossWeightTooltip: "Use the AWB gross weight. Air shipments = KGM.",
  grossWeightUnitOptions: [
    { value: "KGM", label: "KGM (kilograms)" },
    { value: "TNE", label: "TNE (metric tonnes)" },
  ],
  paymentOptions: [
    { value: "GF", label: "GF \u2014 GIRO (IBG)" },
    { value: "G1", label: "G1 \u2014 Pay on approval" },
    { value: "G7", label: "G7 \u2014 GIRO (IBG)" },
  ],
  paymentTooltip: "G1 = dutiable. GF = non-dutiable (GIRO). Laptops are NOT dutiable in Singapore.",
  messageTypeTooltip: "Message Type = direction of movement. Goods entering Singapore = IN.",
  declarationTypeTooltip: "IN-PAYMENT types: DNG (Duty & GST) for dutiable goods, GST for non-dutiable. Laptops are non-dutiable \u2192 GST.",
  rulebookTitle: "Rulebook",
  rulebookEntries: [
    { title: "Message Types", content: "IN = Import, OUT = Export, Transhipment/Movement, COO" },
    { title: "IN Declaration Types", content: "IN-PAYMENT: DNG (Duty & GST) for dutiable goods, GST for non-dutiable, DUT for duty-only. IN-NON-PAYMENT: APS (Approved Premises/Schemes) for LW/ZGS/MES movements, SFZ (FTZ storage), GTR (relief/exemption), REX (re-export). Laptops are non-dutiable \u2192 GST." },
    { title: "HS Code", content: "Portable data processing machines (laptops) \u2264 10kg: 8471.30. Declare to full digit level per STCCED 2022." },
    { title: "HS Qty Unit", content: "STCCED 2022 unit for 8471.30 is U (units). Not KGM, not PCS." },
    { title: "CIF vs FOB", content: "When INCOTERM = CIF, freight + insurance are INCLUDED. Do NOT add separately.", extra: "When INCOTERM = FOB, you must ADD freight + insurance to get CIF." },
    { title: "Gross Weight", content: "Air freight = KGM (kilograms). Sea = TNE (metric tonnes). Common error: using TNE for air shipments." },
    { title: "Cargo Packing Type", content: "Sea (containers) = 9. Air (pallets) = 5 (Non-containerised). Declaring 9 for air freight is a common mistake." },
    { title: "Payment", content: "G1 = pay at approval (dutiable goods). GF = GIRO (non-dutiable).", extra: "Laptops are NOT dutiable. Only alcohol, tobacco, motor vehicles, petroleum are dutiable." },
    { title: "Common Errors", content: "Top errors: (1) Wrong declaration type, (2) Incorrect Place of Release/Receipt, (3) Wrong HS code, (4) Value errors from wrong currency/exchange rate, (5) Omitting freight & insurance when INCOTERM is FOB, (6) Using unit price as total value, (7) Wrong gross weight unit for transport mode." },
    { title: "GF Amendment Rules", content: "GF/G7 (GIRO) permits for non-dutiable goods: payment-related fields (currency, freight, insurance, CIF value, importer UEN) can be amended SAME DAY ONLY (before 23:59:59). Must submit within office hours." },
  ],
};

/* ───── Case #038: Samsung OLED Transhipment ───── */

function validatePermit038(values: Record<string, string>, scaffolding: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const msgType = values.messageType;

  if (msgType && msgType !== "TSHIP") {
    errors.push({ code: "T-T1", field: "messageType", message: "Case #038 is a transhipment \u2014 goods pass THROUGH Singapore. Message Type should be TSHIP, not IN.", severity: "soft" });
  }
  if (msgType === "TSHIP" && values.declarationType && values.declarationType !== "TTI") {
    errors.push({ code: "T-T2", field: "declarationType", message: "For through-transhipment with an inward manifest, the correct declaration type is TTI.", severity: scaffolding === 1 ? "soft" : "hard" });
  }
  if (msgType === "IN" && (values.declarationType === "DNG" || values.declarationType === "GST" || values.declarationType === "APS")) {
    errors.push({ code: "T-T2", field: "declarationType", message: "IN declaration types are for imports into Singapore. These goods are transiting \u2014 they never enter Singapore's customs territory. Use TSHIP.", severity: "soft" });
  }
  if (msgType === "TSHIP" && values.placeOfReceiptFTZ === "Others") {
    errors.push({ code: "T-T3", field: "placeOfReceiptFTZ", message: "For transhipment, goods stay in the FTZ for reloading. Place of Receipt should be an FTZ location, not 'Others'.", severity: scaffolding === 1 ? "soft" : "hard" });
  }
  if (values.invoiceCurrency && values.invoiceCurrency !== "KRW") {
    errors.push({ code: "T-T4", field: "invoiceCurrency", message: "The invoice is in KRW (South Korean Won). Check the commercial invoice currency.", severity: "soft" });
  }
  if (msgType === "TSHIP" && values.paymentCondition) {
    errors.push({ code: "T-T5", field: "paymentCondition", message: "Payment condition is not applicable for transhipment permits. No duty/GST payable.", severity: "soft" });
  }
  if (values.hsQuantity === "0") {
    errors.push({ code: "QTY_ZERO", field: "hsQuantity", message: "HS Qty '0' is not allowed. Enter actual quantity.", severity: "hard" });
  }
  if (values.grossWeightUnit === "KGM" && values.transportMode === "1") {
    errors.push({ code: "WEIGHT_UNIT_SEA", field: "grossWeightUnit", message: "For sea freight, gross weight is typically declared in TNE (metric tonnes).", severity: "soft" });
  }
  if (values.cargoPackingType === "5" && values.transportMode === "1") {
    errors.push({ code: "CARGO_PACK_TYPE_MISMATCH", field: "cargoPackingType", message: "Bill of Lading shows a container number \u2014 Containerised (9) is expected.", severity: "soft" });
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
    { field: "HS Quantity", yours: () => values.hsQuantity ? `${values.hsQuantity} ${values.hsUnit || "?"}` : "\u2014", expected: `${cp.hsQuantity} U`, check: () => { const q = parseFloat(values.hsQuantity); return !isNaN(q) && Math.abs(q - cp.hsQuantity) < 5; } },
    { field: "HS Unit", yours: () => values.hsUnit || "\u2014", expected: "U", check: () => values.hsUnit === "U" },
    { field: "Packing Outer", yours: () => values.packingOuter ? `${values.packingOuter} ${values.packingOuterUnit || "?"}` : "\u2014", expected: "100 CRT", check: () => values.packingOuter === "100" && values.packingOuterUnit === "CRT" },
    { field: "Packing Inner", yours: () => values.packingInner ? `${values.packingInner} ${values.packingInnerUnit || "?"}` : "\u2014", expected: "20 PCS", check: () => values.packingInner === "20" && values.packingInnerUnit === "PCS" },
    { field: "Cargo Packing Type", yours: () => values.cargoPackingType === "9" ? "9 (Containerised)" : values.cargoPackingType === "5" ? "5 (Non-containerised)" : "\u2014", expected: "9 (Containerised)", check: () => values.cargoPackingType === "9" },
    { field: "Transport Mode", yours: () => values.transportMode === "1" ? "1 (Sea)" : values.transportMode || "\u2014", expected: "1 (Sea)", check: () => values.transportMode === "1" },
    { field: "Invoice Currency", yours: () => values.invoiceCurrency || "\u2014", expected: "KRW", check: () => values.invoiceCurrency === "KRW" },
    { field: "Exchange Rate", yours: () => values.exchangeRate || "\u2014", expected: "0.00102", check: () => { const r = parseFloat(values.exchangeRate); return !isNaN(r) && Math.abs(r - 0.00102) / 0.00102 < 0.05; } },
    { field: "CIF Value (SGD)", yours: () => values.cifValue || "\u2014", expected: "1,788,570.00", check: () => { const v = parseFloat(values.cifValue); return !isNaN(v) && Math.abs(v - 1788570) / 1788570 < 0.01; } },
    { field: "Freight (KRW)", yours: () => values.freight || "\u2014", expected: "45,000,000", check: () => { const f = parseFloat(values.freight); return !isNaN(f) && Math.abs(f - 45000000) < 100000; } },
    { field: "Insurance (KRW)", yours: () => values.insurance || "\u2014", expected: "8,500,000", check: () => { const i = parseFloat(values.insurance); return !isNaN(i) && Math.abs(i - 8500000) < 100000; } },
    { field: "Gross Weight", yours: () => values.grossWeight ? `${values.grossWeight} ${values.grossWeightUnit || "?"}` : "\u2014", expected: "12.500 TNE", check: () => { const w = parseFloat(values.grossWeight); return !isNaN(w) && Math.abs(w - 12.5) / 12.5 < 0.05; } },
    { field: "Gross Weight Unit", yours: () => values.grossWeightUnit || "\u2014", expected: "TNE", check: () => values.grossWeightUnit === "TNE" },
  ];
  const details = checks.map((c) => ({ field: c.field, correct: c.check(), yours: c.yours(), expected: c.expected }));
  return { total: details.filter((d) => d.correct).length, max: checks.length, details };
}

export const BEAT_A_038: BeatAConfig = {
  caseId: "038",
  backLink: "/",
  headerTitle: "CASE #038",
  introText: "You are a Declaring Agent submitting a TradeNet TSHIP permit for Case #038 (Samsung OLED transhipment). No CCP payment — goods stay outside customs territory.",
  introSubtext: "Inter-gateway movement (TTI): goods move between FTZs via bonded truck (condition A9, 48h deadline AX). Select Message Type.",
  validatePermit: validatePermit038,
  scorePermit: scorePermit038,
  getFieldStatus: getFieldStatus038,
  CaseFilePanel: CaseFilePanel038,
  initialValues: {
    messageType: "", declarationType: "", declaringAgentUEN: "201912345M",
    throughAgentUEN: "", consignee: "", supplier: "",
    placeOfReleaseFTZ: "", placeOfReceiptFTZ: "",
    hsCode: "", hsQuantity: "", hsUnit: "",
    packingOuter: "", packingOuterUnit: "", packingInner: "", packingInnerUnit: "",
    cargoPackingType: "", transportMode: "",
    invoiceCurrency: "", exchangeRate: "", cifValue: "", freight: "", insurance: "",
    grossWeight: "", grossWeightUnit: "", paymentCondition: "",
  },
  scoreableFields: [
    "messageType", "declarationType", "placeOfReleaseFTZ",
    "placeOfReceiptFTZ", "hsCode", "hsQuantity", "hsUnit",
    "packingOuter", "packingOuterUnit", "packingInner", "packingInnerUnit",
    "cargoPackingType", "transportMode", "invoiceCurrency", "exchangeRate",
    "cifValue", "freight", "insurance", "grossWeight", "grossWeightUnit",
  ],
  fieldsToResetOnMsgTypeChange: ["declarationType", "placeOfReleaseFTZ", "placeOfReceiptFTZ"],
  declTypeOptions: {
    IN: DECL_TYPE_IMPORT,
    OUT: DECL_TYPE_EXPORT,
    TSHIP: DECL_TYPE_TSHIP,
  },
  agentLabel: "Declaring Agent / Through Agent UEN",
  uenField: undefined,
  consigneeLabel: "Consignee (Final)",
  consigneePlaceholder: "Final destination consignee",
  supplierLabel: "Supplier / Shipper",
  supplierPlaceholder: "Overseas supplier",
  placeSectionTitle: "PLACE OF RELEASE / RECEIPT",
  placeFields: [
    { fieldKey: "placeOfReleaseFTZ", label: "Place of Release (FROM)", options: FTZ_OPTIONS, tooltip: "For transhipment, 'release FROM' = the FTZ where goods arrive. Check the port of discharge.", visibilityFieldId: "placeOfReleaseFTZ" },
    {
      fieldKey: "placeOfReceiptFTZ", label: "Place of Receipt (TO)",
      options: [
        { value: "PP1", label: "PP1 \u2014 Pasir Panjang Terminal FTZ" },
        { value: "T15", label: "T15 \u2014 Tanjong Pagar Terminal FTZ" },
        { value: "T16", label: "T16 \u2014 Keppel Terminal FTZ" },
        { value: "C01", label: "C01 \u2014 Changi Airfreight Centre" },
        { value: "Others", label: "Others (general delivery)" },
      ],
      tooltip: "For transhipment, goods STAY in the FTZ for reloading onto the onward vessel. Receipt = FTZ, not 'Others'.",
      visibilityFieldId: "placeOfReceiptFTZ",
    },
  ],
  hsCodePlaceholder: "e.g. 9013.80",
  hsCodeTooltip: "OLED flat panel displays = Chapter 90, Heading 9013 (optical devices), sub-heading .80",
  hsQuantityPlaceholder: "e.g. 2000",
  hsQuantityTooltip: "HS unit for 9013.80 is U (units). Enter the panel count.",
  hsUnitOptions: [
    { value: "U", label: "U (units)" },
    { value: "KGM", label: "KGM (kg)" },
    { value: "PCS", label: "PCS (pieces)" },
    { value: "LTR", label: "LTR (litres)" },
  ],
  packingOuterPlaceholder: "e.g. 100",
  packingOuterUnitOptions: [
    { value: "CRT", label: "CRT (crate)" },
    { value: "CTN", label: "CTN (carton)" },
    { value: "PLT", label: "PLT (pallet)" },
    { value: "BOX", label: "BOX" },
  ],
  packingInnerPlaceholder: "e.g. 20",
  packingInnerTooltip: "",
  packingInnerUnitOptions: [
    { value: "PCS", label: "PCS (pieces)" },
    { value: "BOT", label: "BOT (bottle)" },
    { value: "CAN", label: "CAN" },
    { value: "PKT", label: "PKT (packet)" },
  ],
  cargoPackingOptions: [
    { value: "9", label: "9 \u2014 Containerised" },
    { value: "5", label: "5 \u2014 Non-containerised" },
  ],
  transportTooltip: "Check the Bill of Lading: vessel name = sea.",
  currencyOptions: [
    { value: "KRW", label: "KRW (Korean Won)" },
    { value: "USD", label: "USD" },
    { value: "SGD", label: "SGD" },
    { value: "EUR", label: "EUR" },
  ],
  valueSectionFields: {
    valueFieldKey: "cifValue",
    valueLabel: "CIF Value (SGD)",
    valuePlaceholder: "Total CIF in SGD",
    valueTooltip: "CIF = FOB + Freight + Insurance. Convert total to SGD using exchange rate.",
    freightLabel: "Freight (KRW)",
    freightPlaceholder: "e.g. 45000000",
    insuranceLabel: "Insurance (KRW)",
    insurancePlaceholder: "e.g. 8500000",
  },
  grossWeightPlaceholder: "e.g. 12.500",
  grossWeightTooltip: "Use the B/L gross weight. Sea shipments = TNE.",
  grossWeightUnitOptions: [
    { value: "TNE", label: "TNE (metric tonnes)" },
    { value: "KGM", label: "KGM (kilograms)" },
  ],
  paymentOptions: [
    { value: "G1", label: "G1 \u2014 Pay on approval" },
    { value: "GF", label: "GF \u2014 GIRO (IBG)" },
    { value: "G7", label: "G7 \u2014 GIRO (IBG)" },
  ],
  paymentTooltip: "Is payment condition applicable for transhipment permits?",
  messageTypeTooltip: "Are these goods entering Singapore for local use, or passing THROUGH to another country?",
  declarationTypeTooltip: "TSHIP types: TTF (same FTZ, controlled goods), TTI (inter-gateway), IGM (inter-gateway movement), REM (between LW/ZGS), BRE (blanket removal). This is inter-gateway \u2192 TTI.",
  rulebookTitle: "Rulebook \u2014 Transhipment",
  rulebookEntries: [
    { title: "Transhipment (TSHIP)", content: "Goods passing THROUGH Singapore to another destination. They never enter Singapore's customs territory for local consumption." },
    { title: "TSHIP Declaration Types", content: "TTF = Through Transhipment within same FTZ (controlled goods only). TTI = Through Transhipment with Inter-Gateway Movement (covered by Through B/L or MAWB). IGM = Inter-Gateway Movement (previously on INP-SFZ permits, LCL consolidation). REM = Removal between licensed premises (LW\u2194LW, ZGS\u2194ZGS). BRE = Blanket Removal (multiple movements within same month)." },
    { title: "Place of Release/Receipt", content: "For transhipment, BOTH should be FTZ locations. Goods arrive at and depart from the FTZ \u2014 they never leave it." },
    { title: "No Duty/GST", content: "Transhipped goods never enter Singapore's customs territory. No duty or GST is payable. Payment condition field is hidden." },
    { title: "HS Code 9013.80", content: "Flat panel display devices (OLED). HS unit = U (units). Non-dutiable electronics component." },
    { title: "No Manipulation", content: "During inter-gateway movement, no manipulation of goods is allowed en route (no re-packing, sorting, or re-labeling). Goods must arrive intact at destination FTZ." },
  ],
};

/* ───── Case #052: Precision Optics Export ───── */

function validatePermit052(values: Record<string, string>, scaffolding: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const msgType = values.messageType;

  if (msgType && msgType !== "OUT") {
    errors.push({ code: "T-O1", field: "messageType", message: "Case #052 is an export from Singapore. Message Type should be OUT.", severity: "soft" });
  }
  if (values.exporterUEN === "99991000000G" || values.exporterUEN === "99999000000N" || values.exporterUEN === "99999990000C") {
    errors.push({ code: "UEN_GENERIC", field: "exporterUEN", message: "Generic UEN used \u2014 verify this is correct for your exporter. Real UENs required where available.", severity: scaffolding === 1 ? "soft" : "hard" });
  }
  if (values.hsQuantity === "0") {
    errors.push({ code: "QTY_ZERO", field: "hsQuantity", message: "HS Qty '0' is not allowed. Enter actual quantity.", severity: "hard" });
  }
  if (values.hsQuantity === "-") {
    errors.push({ code: "QTY_DASH", field: "hsQuantity", message: "'-' is not a valid HS Qty entry. Enter actual quantity.", severity: "hard" });
  }
  const hsQty = parseFloat(values.hsQuantity);
  if (values.hsUnit === "LTR" && !isNaN(hsQty)) {
    errors.push({ code: "UOM_MISMATCH", field: "hsUnit", message: "The STCCED 2022 unit for HS 9001.90 (optical lenses) is U (units), not litres.", severity: scaffolding === 1 ? "soft" : "hard" });
  }
  const fobVal = parseFloat(values.fobValue);
  const freightVal = parseFloat(values.freight || "0");
  const insuranceVal = parseFloat(values.insurance || "0");
  if (!isNaN(fobVal) && fobVal > 0) {
    const expectedCif = 840000 * 1.46 + (3200 + 1680) * 1.46;
    if (Math.abs(fobVal - expectedCif) < 500) {
      errors.push({ code: "T-O2", field: "fobValue", message: "For FOB exports, declare FOB value only. Do not add freight and insurance \u2014 those are the buyer's cost.", severity: scaffolding === 1 ? "soft" : "hard" });
    }
  }
  if (!isNaN(freightVal) && freightVal > 0 && !isNaN(insuranceVal) && insuranceVal > 0) {
    errors.push({ code: "T-O3", field: "freight", message: "For FOB exports, freight and insurance are the buyer's cost and should not be declared on the export permit.", severity: "soft" });
  }
  if (values.paymentCondition === "G1" && msgType === "OUT") {
    errors.push({ code: "T-O6", field: "paymentCondition", message: "Exports of non-dutiable goods use GF (GIRO), not G1 (pay on approval). No duty is payable.", severity: "soft" });
  }
  if (values.invoiceCurrency === "SGD" && values.exchangeRate === "1") {
    errors.push({ code: "CURRENCY_EXCH_ERROR", field: "invoiceCurrency", message: "Invoice is in EUR. Verify the exchange rate and declare the correct currency.", severity: "soft" });
  }
  if (values.grossWeightUnit === "KGM" && values.transportMode === "1") {
    errors.push({ code: "WEIGHT_UNIT_SEA", field: "grossWeightUnit", message: "For sea freight permits, gross weight is typically declared in TNE (metric tonnes).", severity: "soft" });
  }
  const grossWt = parseFloat(values.grossWeight);
  if (values.grossWeightUnit === "TNE" && !isNaN(grossWt) && grossWt > 100) {
    errors.push({ code: "WEIGHT_UNIT_SEA", field: "grossWeight", message: "Weight seems too high. The B/L states 450 kg = 0.450 TNE for sea shipments.", severity: "soft" });
  }
  if (values.cargoPackingType === "5" && values.transportMode === "1") {
    errors.push({ code: "CARGO_PACK_TYPE_MISMATCH", field: "cargoPackingType", message: "Check the Bill of Lading \u2014 a container number is present. Containerised (9) is expected.", severity: "soft" });
  }
  return errors;
}

function scorePermit052(values: Record<string, string>): ScoringResult {
  const checks: { field: string; yours: () => string; expected: string; check: () => boolean }[] = [
    { field: "Message Type", yours: () => values.messageType || "\u2014", expected: "OUT", check: () => values.messageType === "OUT" },
    { field: "Declaration Type", yours: () => values.declarationType || "\u2014", expected: "DRT", check: () => values.declarationType === "DRT" },
    { field: "Exporter UEN", yours: () => values.exporterUEN || "\u2014", expected: "201756789K", check: () => values.exporterUEN === "201756789K" },
    { field: "Place of Receipt (FTZ)", yours: () => values.placeOfReceiptFTZ || "\u2014", expected: "T16 (Keppel)", check: () => values.placeOfReceiptFTZ === "T16" },
    { field: "HS Code", yours: () => values.hsCode || "\u2014", expected: "9001.90", check: () => values.hsCode?.startsWith("9001.90") || false },
    { field: "HS Quantity", yours: () => values.hsQuantity ? `${values.hsQuantity} ${values.hsUnit || "?"}` : "\u2014", expected: "300 U", check: () => { const q = parseFloat(values.hsQuantity); return !isNaN(q) && Math.abs(q - 300) < 1; } },
    { field: "HS Unit", yours: () => values.hsUnit || "\u2014", expected: "U", check: () => values.hsUnit === "U" },
    { field: "Packing Outer", yours: () => values.packingOuter ? `${values.packingOuter} ${values.packingOuterUnit || "?"}` : "\u2014", expected: "15 CS", check: () => values.packingOuter === "15" && values.packingOuterUnit === "CS" },
    { field: "Packing Inner", yours: () => values.packingInner ? `${values.packingInner} ${values.packingInnerUnit || "?"}` : "\u2014", expected: "20 PCS", check: () => values.packingInner === "20" && values.packingInnerUnit === "PCS" },
    { field: "Cargo Packing Type", yours: () => values.cargoPackingType === "9" ? "9 (Containerised)" : values.cargoPackingType === "5" ? "5 (Non-containerised)" : "\u2014", expected: "9 (Containerised)", check: () => values.cargoPackingType === "9" },
    { field: "Transport Mode", yours: () => values.transportMode === "1" ? "1 (Sea)" : values.transportMode === "4" ? "4 (Air)" : values.transportMode || "\u2014", expected: "1 (Sea)", check: () => values.transportMode === "1" },
    { field: "Invoice Currency", yours: () => values.invoiceCurrency || "\u2014", expected: "EUR", check: () => values.invoiceCurrency === "EUR" },
    { field: "Exchange Rate", yours: () => values.exchangeRate || "\u2014", expected: "1.46", check: () => { const r = parseFloat(values.exchangeRate); return !isNaN(r) && Math.abs(r - 1.46) / 1.46 < 0.005; } },
    { field: "FOB Value (SGD)", yours: () => values.fobValue || "\u2014", expected: "1,226,400", check: () => { const v = parseFloat(values.fobValue); return !isNaN(v) && Math.abs(v - 1226400) / 1226400 < 0.01; } },
    { field: "Gross Weight", yours: () => values.grossWeight ? `${values.grossWeight} ${values.grossWeightUnit || "?"}` : "\u2014", expected: "0.450 TNE", check: () => { const w = parseFloat(values.grossWeight); return !isNaN(w) && Math.abs(w - 0.45) / 0.45 < 0.05; } },
    { field: "Gross Weight Unit", yours: () => values.grossWeightUnit || "\u2014", expected: "TNE", check: () => values.grossWeightUnit === "TNE" },
    { field: "Payment Condition", yours: () => values.paymentCondition === "G1" ? "G1 (Pay on approval)" : values.paymentCondition === "GF" ? "GF (GIRO)" : values.paymentCondition || "\u2014", expected: "GF", check: () => values.paymentCondition === "GF" },
  ];
  const details = checks.map((c) => ({ field: c.field, correct: c.check(), yours: c.yours(), expected: c.expected }));
  return { total: details.filter((d) => d.correct).length, max: checks.length, details };
}

export const BEAT_A_052: BeatAConfig = {
  caseId: "052",
  backLink: "/",
  headerTitle: "",
  introText: "You are a Declaring Agent submitting a TradeNet OUT permit for Case #052 (Precision Optics export). CCP must be produced at port gate before vessel departure.",
  introSubtext: "Export permits must be submitted 24h before vessel ETD. Payment condition GF (GIRO). Start by selecting Message Type.",
  validatePermit: validatePermit052,
  scorePermit: scorePermit052,
  getFieldStatus: getFieldStatusStandard,
  CaseFilePanel: CaseFilePanel052,
  initialValues: {
    messageType: "", declarationType: "", declaringAgentUEN: "199804321D",
    exporterUEN: "", consignee: "", supplier: "",
    placeOfReceiptFTZ: "",
    hsCode: "", hsQuantity: "", hsUnit: "",
    packingOuter: "", packingOuterUnit: "", packingInner: "", packingInnerUnit: "",
    cargoPackingType: "", transportMode: "",
    invoiceCurrency: "", exchangeRate: "", fobValue: "", freight: "", insurance: "",
    grossWeight: "", grossWeightUnit: "", paymentCondition: "",
  },
  scoreableFields: [
    "messageType", "declarationType", "exporterUEN", "placeOfReceiptFTZ",
    "hsCode", "hsQuantity", "hsUnit",
    "packingOuter", "packingOuterUnit", "packingInner", "packingInnerUnit",
    "cargoPackingType", "transportMode", "invoiceCurrency", "exchangeRate",
    "fobValue", "grossWeight", "grossWeightUnit", "paymentCondition",
  ],
  fieldsToResetOnMsgTypeChange: ["declarationType", "placeOfReceiptFTZ"],
  declTypeOptions: STANDARD_DECL_OPTS,
  agentLabel: "Declaring Agent UEN",
  uenField: { fieldKey: "exporterUEN", label: "Exporter UEN", placeholder: "e.g. 201756789K", tooltip: "UEN = the exporter's registered entity number. Check the invoice.", visibilityFieldId: "exporterUEN" },
  showImporterOnExport: { fieldKey: "exporterUEN", label: "Importer UEN", placeholder: "e.g. 201835672K", tooltip: "This is an export case \u2014 the exporter field is on a different form section." },
  consigneeLabel: "Consignee / Buyer",
  consigneePlaceholder: "Overseas buyer",
  supplierLabel: "Shipper / Exporter",
  supplierPlaceholder: "Singapore exporter",
  placeSectionTitle: "PLACE OF RECEIPT",
  placeFields: [
    { fieldKey: "placeOfReceiptFTZ", label: "Place of Receipt (FTZ)", options: FTZ_OPTIONS, tooltip: "For an OUT permit, 'Place of Receipt' = where goods enter the port FTZ for loading.", visibilityFieldId: "placeOfReceiptFTZ" },
  ],
  hsCodePlaceholder: "e.g. 9001.90",
  hsCodeTooltip: "Lenses (other than contact/spectacle) = Chapter 90, Heading 9001, sub-heading .90",
  hsQuantityPlaceholder: "e.g. 300",
  hsQuantityTooltip: "Enter qty in STCCED-prescribed unit (U for optical lenses). 300 lenses = 300 U.",
  hsUnitOptions: [
    { value: "U", label: "U (units)" },
    { value: "PCS", label: "PCS (pieces)" },
    { value: "KGM", label: "KGM (kg)" },
    { value: "LTR", label: "LTR (litres)" },
  ],
  packingOuterPlaceholder: "e.g. 15",
  packingOuterUnitOptions: [
    { value: "CS", label: "CS (case)" },
    { value: "CTN", label: "CTN (carton)" },
    { value: "PLT", label: "PLT (pallet)" },
    { value: "BOX", label: "BOX" },
  ],
  packingInnerPlaceholder: "e.g. 20",
  packingInnerTooltip: "Each case contains 20 individually wrapped lenses.",
  packingInnerUnitOptions: [
    { value: "PCS", label: "PCS (pieces)" },
    { value: "BOT", label: "BOT (bottle)" },
    { value: "PKT", label: "PKT (packet)" },
  ],
  cargoPackingOptions: [
    { value: "9", label: "9 \u2014 Containerised" },
    { value: "5", label: "5 \u2014 Non-containerised" },
  ],
  transportTooltip: "Check the Bill of Lading: vessel name, port of loading.",
  currencyOptions: [
    { value: "EUR", label: "EUR" },
    { value: "USD", label: "USD" },
    { value: "SGD", label: "SGD" },
    { value: "GBP", label: "GBP" },
  ],
  valueSectionFields: {
    valueFieldKey: "fobValue",
    valueLabel: "FOB Value (SGD)",
    valuePlaceholder: "Total FOB in SGD",
    valueTooltip: "Export = FOB value only. Do NOT add freight/insurance \u2014 those are buyer's costs under FOB terms.",
    freightLabel: "Freight (EUR)",
    freightPlaceholder: "buyer's cost",
    insuranceLabel: "Insurance (EUR)",
    insurancePlaceholder: "buyer's cost",
  },
  grossWeightPlaceholder: "e.g. 0.450",
  grossWeightTooltip: "Use the B/L gross weight. Sea shipments = TNE.",
  grossWeightUnitOptions: [
    { value: "TNE", label: "TNE (metric tonnes)" },
    { value: "KGM", label: "KGM (kilograms)" },
  ],
  paymentOptions: [
    { value: "G1", label: "G1 \u2014 Pay on approval" },
    { value: "GF", label: "GF \u2014 GIRO (IBG)" },
    { value: "G7", label: "G7 \u2014 GIRO (IBG)" },
  ],
  paymentTooltip: "GF = GIRO. Exports are non-dutiable, so GF is correct here.",
  messageTypeTooltip: "Message Type = direction of movement. Goods leaving Singapore = OUT.",
  declarationTypeTooltip: "OUT types: DRT (Direct) for locally manufactured or GST-paid goods. APS for exports from LW/ZGS warehouses. This is a direct export \u2192 DRT.",
  rulebookTitle: "Rulebook",
  rulebookEntries: [
    { title: "Message Types", content: "IN = Import, OUT = Export, Transhipment/Movement, COO" },
    { title: "OUT Declaration Types", content: "DRT (Direct) = locally manufactured or GST-paid goods exported directly, or re-exported from FTZ storage. APS = exports from Licensed Warehouse or Zero-GST Warehouse. BKT = blanket arrangement. TCR/TCO/TCS/TCE/TCI = temporary consignment re-export under TIS." },
    { title: "HS Code", content: "Optical lenses (other than contact/spectacle): 9001.90. Declare to full digit level per STCCED 2022." },
    { title: "HS Qty Unit", content: "STCCED 2022 unit for 9001.90 is U (units)." },
    { title: "Export Valuation (FOB)", content: "For FOB exports, declare FOB value only. Freight and insurance are the buyer's cost and should NOT be added. Common error: including freight/insurance in export value." },
    { title: "Place of Release/Receipt", content: "For OUT: Place of Release = where goods depart FROM (Others, Licence No, or FTZ). Place of Receipt = FTZ (where goods go for export)." },
    { title: "Gross Weight", content: "For OUT permits: total gross weight based on OUTWARD transport leg. Sea = TNE. Air = KGM." },
    { title: "Payment", content: "G1 = pay at approval. GF/G7 = GIRO. Exports of non-dutiable goods use GF. No duty/GST on exports (GST-free supply)." },
  ],
};
