import type { MessageType } from "../../data/case014";

export type FieldStatus = "R" | "O" | "H";

export interface FieldDef {
  id: string;
  label: string;
  section: string;
  type: "select" | "text" | "number";
  options?: { value: string; label: string }[];
  placeholder?: string;
  tooltip?: string;
}

type FieldVisibility = Record<string, Record<string, FieldStatus>>;

const VIS: FieldVisibility = {
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
  "messageType",
  "declarationType",
  "declaringAgentUEN",
  "consignee",
  "supplier",
  "hsCode",
  "hsQuantity",
  "hsUnit",
  "packingOuter",
  "packingOuterUnit",
  "packingInner",
  "packingInnerUnit",
  "cargoPackingType",
  "transportMode",
  "invoiceCurrency",
  "exchangeRate",
  "cifValue",
  "grossWeight",
  "grossWeightUnit",
];

export function getFieldStatus(
  fieldId: string,
  messageType: MessageType | "",
): FieldStatus {
  if (ALWAYS_VISIBLE.includes(fieldId)) return "R";
  if (!messageType || !VIS[fieldId]) return "H";
  return VIS[fieldId][messageType] || "H";
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: "hard" | "soft";
}

export function validatePermit(
  values: Record<string, string>,
  scaffolding: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const msgType = values.messageType;

  if (msgType && msgType !== "IN") {
    errors.push({
      code: "CLASS_MSGTYPE",
      field: "messageType",
      message: "Case #014 is an import into Singapore. Message Type should be IN.",
      severity: "soft",
    });
  }

  if (values.importerUEN === "99991000000G" || values.importerUEN === "99999000000N" || values.importerUEN === "99999990000C") {
    errors.push({
      code: "UEN_GENERIC",
      field: "importerUEN",
      message: "Generic UEN used — verify this is correct for your consignee. Real UENs required where available.",
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
  if (values.hsUnit === "BOT" && !isNaN(hsQty)) {
    errors.push({
      code: "UOM_MISMATCH",
      field: "hsUnit",
      message:
        "The STCCED 2022 unit for this HS code is litres (LTR), not bottles. Bottle count goes in the packing hierarchy. Enter litre quantity: 1,200 x 0.75 L = 900.000 LTR.",
      severity: scaffolding === 1 ? "soft" : "hard",
    });
  }

  if (
    values.hsUnit === "LTR" &&
    !isNaN(hsQty) &&
    (hsQty === 1200 || hsQty === 1200.0)
  ) {
    errors.push({
      code: "UOM_MISMATCH",
      field: "hsQuantity",
      message:
        "1200 is the bottle count. HS Qty in LTR = 1,200 x 0.75 = 900.000 LTR.",
      severity: "soft",
    });
  }

  const packOuter = parseFloat(values.packingOuter);
  const packInner = parseFloat(values.packingInner);
  if (packOuter > 0 && (isNaN(packInner) || packInner <= 0)) {
    errors.push({
      code: "PACK_DEPTH_LIQUOR",
      field: "packingInner",
      message:
        "For dutiable liquors, packing must be declared down to the smallest unit (bottle/can). Add In-pack level.",
      severity: "hard",
    });
  }

  const cifVal = parseFloat(values.cifValue);
  const freightVal = parseFloat(values.freight || "0");
  const insuranceVal = parseFloat(values.insurance || "0");

  if (!isNaN(cifVal) && cifVal > 0) {
    if (cifVal <= 14.51 && cifVal >= 14.49) {
      errors.push({
        code: "UNIT_PRICE_AS_TOTAL",
        field: "cifValue",
        message:
          "The declared value appears to be a unit price. Customs value must be the total transaction value for the entire shipment.",
        severity: "hard",
      });
    }

    const fobSgd = 17400 * 1.46;
    if (
      Math.abs(cifVal - fobSgd) < 50 &&
      (freightVal > 0 || insuranceVal > 0)
    ) {
      errors.push({
        code: "INCOTERM_FOB_UNDERDECLARE",
        field: "cifValue",
        message:
          "Invoice terms are FOB. For Customs valuation, you must add freight and insurance to arrive at CIF. Customs value = FOB + Freight + Insurance.",
        severity: scaffolding === 1 ? "soft" : "hard",
      });
    }
  }

  if (
    values.invoiceCurrency === "SGD" &&
    values.exchangeRate === "1"
  ) {
    errors.push({
      code: "CURRENCY_EXCH_ERROR",
      field: "invoiceCurrency",
      message:
        "Invoice is in EUR. Verify the exchange rate and declare the correct currency.",
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
      message:
        "For sea freight IN permits, gross weight is typically declared in TNE (metric tonnes). Verify against transport document.",
      severity: "soft",
    });
  }

  const grossWt = parseFloat(values.grossWeight);
  if (values.grossWeightUnit === "TNE" && !isNaN(grossWt) && grossWt > 100) {
    errors.push({
      code: "WEIGHT_UNIT_SEA",
      field: "grossWeight",
      message:
        "Weight 1920 TNE seems too high. The B/L states 1,920 kg = 1.920 TNE for sea shipments.",
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
      message:
        "Check the Bill of Lading — a container number is present. Containerised (9) is expected.",
      severity: "soft",
    });
  }

  return errors;
}

export interface ScoringResult {
  total: number;
  max: number;
  details: { field: string; correct: boolean; yours: string; expected: string }[];
}

export function scorePermit(values: Record<string, string>): ScoringResult {
  const checks: { field: string; yours: () => string; expected: string; check: () => boolean }[] = [
    { field: "Message Type", yours: () => values.messageType || "—", expected: "IN", check: () => values.messageType === "IN" },
    { field: "Declaration Type", yours: () => values.declarationType || "—", expected: "APS", check: () => values.declarationType === "APS" },
    { field: "Importer UEN", yours: () => values.importerUEN || "—", expected: "201835672K", check: () => values.importerUEN === "201835672K" },
    { field: "Place of Release", yours: () => values.placeOfReleaseFTZ || "—", expected: "T15 (FTZ)", check: () => values.placeOfReleaseFTZ === "T15" },
    { field: "Place of Receipt", yours: () => values.placeOfReceiptOthers || "—", expected: "Others", check: () => values.placeOfReceiptOthers === "Others" },
    { field: "HS Code", yours: () => values.hsCode || "—", expected: "2204.21", check: () => values.hsCode?.startsWith("2204.21") || false },
    { field: "HS Quantity", yours: () => values.hsQuantity ? `${values.hsQuantity} ${values.hsUnit || "?"}` : "—", expected: "900.000 LTR", check: () => {
      const q = parseFloat(values.hsQuantity);
      return !isNaN(q) && Math.abs(q - 900) < 5;
    }},
    { field: "HS Unit", yours: () => values.hsUnit || "—", expected: "LTR", check: () => values.hsUnit === "LTR" },
    { field: "Packing Outer", yours: () => values.packingOuter ? `${values.packingOuter} ${values.packingOuterUnit || "?"}` : "—", expected: "100 CTN", check: () => values.packingOuter === "100" && values.packingOuterUnit === "CTN" },
    { field: "Packing Inner", yours: () => values.packingInner ? `${values.packingInner} ${values.packingInnerUnit || "?"}` : "—", expected: "12 BOT", check: () => values.packingInner === "12" && values.packingInnerUnit === "BOT" },
    { field: "Cargo Packing Type", yours: () => values.cargoPackingType === "9" ? "9 (Containerised)" : values.cargoPackingType === "5" ? "5 (Non-containerised)" : "—", expected: "9 (Containerised)", check: () => values.cargoPackingType === "9" },
    { field: "Transport Mode", yours: () => values.transportMode === "1" ? "1 (Sea)" : values.transportMode === "4" ? "4 (Air)" : values.transportMode || "—", expected: "1 (Sea)", check: () => values.transportMode === "1" },
    { field: "Invoice Currency", yours: () => values.invoiceCurrency || "—", expected: "EUR", check: () => values.invoiceCurrency === "EUR" },
    { field: "Exchange Rate", yours: () => values.exchangeRate || "—", expected: "1.46", check: () => {
      const r = parseFloat(values.exchangeRate);
      return !isNaN(r) && Math.abs(r - 1.46) / 1.46 < 0.005;
    }},
    { field: "CIF Value (SGD)", yours: () => values.cifValue || "—", expected: "26,244.96", check: () => {
      const v = parseFloat(values.cifValue);
      return !isNaN(v) && Math.abs(v - 26244.96) / 26244.96 < 0.01;
    }},
    { field: "Freight", yours: () => values.freight || "—", expected: "480", check: () => {
      const f = parseFloat(values.freight);
      return !isNaN(f) && Math.abs(f - 480) < 5;
    }},
    { field: "Insurance", yours: () => values.insurance || "—", expected: "96", check: () => {
      const i = parseFloat(values.insurance);
      return !isNaN(i) && Math.abs(i - 96) < 5;
    }},
    { field: "Gross Weight", yours: () => values.grossWeight ? `${values.grossWeight} ${values.grossWeightUnit || "?"}` : "—", expected: "1.920 TNE", check: () => {
      const w = parseFloat(values.grossWeight);
      return !isNaN(w) && Math.abs(w - 1.92) / 1.92 < 0.05;
    }},
    { field: "Gross Weight Unit", yours: () => values.grossWeightUnit || "—", expected: "TNE", check: () => values.grossWeightUnit === "TNE" },
    { field: "Payment Condition", yours: () => values.paymentCondition === "G1" ? "G1 (Pay on approval)" : values.paymentCondition || "—", expected: "G1", check: () => values.paymentCondition === "G1" },
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
