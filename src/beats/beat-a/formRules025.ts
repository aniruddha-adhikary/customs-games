export type { ValidationError, ScoringResult } from "./formRules";
export { getFieldStatus } from "./formRules";

import type { ValidationError, ScoringResult } from "./formRules";

export function validatePermit025(
  values: Record<string, string>,
  scaffolding: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const msgType = values.messageType;

  if (msgType && msgType !== "IN") {
    errors.push({
      code: "CLASS_MSGTYPE",
      field: "messageType",
      message:
        "Case #025 is an import into Singapore. Message Type should be IN.",
      severity: "soft",
    });
  }

  if (
    values.importerUEN === "99991000000G" ||
    values.importerUEN === "99999000000N" ||
    values.importerUEN === "99999990000C"
  ) {
    errors.push({
      code: "UEN_GENERIC",
      field: "importerUEN",
      message:
        "Generic UEN used — verify this is correct for your consignee. Real UENs required where available.",
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

  // T-A5: Wrong HS unit — laptops are U (units), not KGM or PCS
  if (values.hsUnit === "KGM") {
    errors.push({
      code: "UOM_MISMATCH",
      field: "hsUnit",
      message:
        "The STCCED unit for HS 8471.30 (portable data processing machines) is U (units/pieces), not KGM. Weight goes in the gross weight field.",
      severity: scaffolding === 1 ? "soft" : "hard",
    });
  }

  if (values.hsUnit === "PCS") {
    errors.push({
      code: "UOM_MISMATCH_PCS",
      field: "hsUnit",
      message:
        "Close, but the STCCED 2022 prescribed unit for HS 8471.30 is U (units), not PCS. U is the standard unit code.",
      severity: scaffolding === 1 ? "soft" : "hard",
    });
  }

  if (values.hsUnit === "LTR") {
    errors.push({
      code: "UOM_MISMATCH_LTR",
      field: "hsUnit",
      message:
        "LTR (litres) is for liquids. Laptops use U (units) as the HS quantity unit.",
      severity: "hard",
    });
  }

  // T-A1: CIF double-count — invoice is CIF, so freight/insurance must NOT be added
  const cifVal = parseFloat(values.cifValue);
  const freightVal = parseFloat(values.freight || "0");
  const insuranceVal = parseFloat(values.insurance || "0");

  if (!isNaN(cifVal) && cifVal > 0 && (freightVal > 0 || insuranceVal > 0)) {
    errors.push({
      code: "CIF_DOUBLE_COUNT",
      field: "cifValue",
      message:
        "Invoice INCOTERM is CIF — freight and insurance are ALREADY included in the invoice price. Do NOT add them again or you will double-count.",
      severity: scaffolding === 1 ? "soft" : "hard",
    });
  }

  // T-A2: Wrong payment condition — GF for non-dutiable, not G1
  if (values.paymentCondition === "G1") {
    errors.push({
      code: "PAYMENT_DUTIABLE_MISMATCH",
      field: "paymentCondition",
      message:
        "G1 (Pay on approval) is for dutiable goods. Laptops are non-dutiable in Singapore — use GF (GIRO).",
      severity: scaffolding === 1 ? "soft" : "hard",
    });
  }

  // T-A3: Wrong weight unit — air freight uses KGM, not TNE
  if (
    values.grossWeightUnit === "TNE" &&
    values.transportMode === "4"
  ) {
    errors.push({
      code: "WEIGHT_UNIT_AIR",
      field: "grossWeightUnit",
      message:
        "For air freight, gross weight is declared in KGM (kilograms), not TNE (metric tonnes). Check the Air Waybill.",
      severity: "soft",
    });
  }

  const grossWt = parseFloat(values.grossWeight);
  if (values.grossWeightUnit === "KGM" && !isNaN(grossWt) && grossWt < 10) {
    errors.push({
      code: "WEIGHT_TOO_LOW",
      field: "grossWeight",
      message:
        "Weight seems too low for 500 laptops. The AWB states 1,250 kg gross weight.",
      severity: "soft",
    });
  }

  // T-A4: Wrong cargo packing type — air = non-containerised (5)
  if (
    values.cargoPackingType === "9" &&
    values.transportMode === "4"
  ) {
    errors.push({
      code: "CARGO_PACK_TYPE_MISMATCH",
      field: "cargoPackingType",
      message:
        "Air freight uses pallets, not sea containers. Cargo packing type should be 5 (Non-containerised).",
      severity: "soft",
    });
  }

  // T-A6: Wrong place of release — air freight arrives at Changi (C01)
  if (
    values.placeOfReleaseFTZ === "T15" &&
    (values.transportMode === "4" || msgType === "IN")
  ) {
    const isAir = values.transportMode === "4";
    if (isAir) {
      errors.push({
        code: "PLACE_RELEASE_AIR",
        field: "placeOfReleaseFTZ",
        message:
          "T15 is Tanjong Pagar (sea port). Air freight arrives at Changi Airfreight Centre (C01).",
        severity: "soft",
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
        "Invoice is in USD. Verify the exchange rate and declare the correct currency.",
      severity: "soft",
    });
  }

  return errors;
}

export function scorePermit025(
  values: Record<string, string>,
): ScoringResult {
  const checks: {
    field: string;
    yours: () => string;
    expected: string;
    check: () => boolean;
  }[] = [
    {
      field: "Message Type",
      yours: () => values.messageType || "\u2014",
      expected: "IN",
      check: () => values.messageType === "IN",
    },
    {
      field: "Declaration Type",
      yours: () => values.declarationType || "\u2014",
      expected: "APS",
      check: () => values.declarationType === "APS",
    },
    {
      field: "Importer UEN",
      yours: () => values.importerUEN || "\u2014",
      expected: "200412345D",
      check: () => values.importerUEN === "200412345D",
    },
    {
      field: "Place of Release",
      yours: () => values.placeOfReleaseFTZ || "\u2014",
      expected: "C01 (Changi)",
      check: () => values.placeOfReleaseFTZ === "C01",
    },
    {
      field: "Place of Receipt",
      yours: () => values.placeOfReceiptOthers || "\u2014",
      expected: "Others",
      check: () => values.placeOfReceiptOthers === "Others",
    },
    {
      field: "HS Code",
      yours: () => values.hsCode || "\u2014",
      expected: "8471.30",
      check: () => values.hsCode?.startsWith("8471.30") || false,
    },
    {
      field: "HS Quantity",
      yours: () =>
        values.hsQuantity
          ? `${values.hsQuantity} ${values.hsUnit || "?"}`
          : "\u2014",
      expected: "500 U",
      check: () => {
        const q = parseFloat(values.hsQuantity);
        return !isNaN(q) && Math.abs(q - 500) < 5;
      },
    },
    {
      field: "HS Unit",
      yours: () => values.hsUnit || "\u2014",
      expected: "U",
      check: () => values.hsUnit === "U",
    },
    {
      field: "Packing Outer",
      yours: () =>
        values.packingOuter
          ? `${values.packingOuter} ${values.packingOuterUnit || "?"}`
          : "\u2014",
      expected: "50 PLT",
      check: () =>
        values.packingOuter === "50" && values.packingOuterUnit === "PLT",
    },
    {
      field: "Packing Inner",
      yours: () =>
        values.packingInner
          ? `${values.packingInner} ${values.packingInnerUnit || "?"}`
          : "\u2014",
      expected: "10 PCS",
      check: () =>
        values.packingInner === "10" && values.packingInnerUnit === "PCS",
    },
    {
      field: "Cargo Packing Type",
      yours: () =>
        values.cargoPackingType === "9"
          ? "9 (Containerised)"
          : values.cargoPackingType === "5"
            ? "5 (Non-containerised)"
            : "\u2014",
      expected: "5 (Non-containerised)",
      check: () => values.cargoPackingType === "5",
    },
    {
      field: "Transport Mode",
      yours: () =>
        values.transportMode === "1"
          ? "1 (Sea)"
          : values.transportMode === "4"
            ? "4 (Air)"
            : values.transportMode || "\u2014",
      expected: "4 (Air)",
      check: () => values.transportMode === "4",
    },
    {
      field: "Invoice Currency",
      yours: () => values.invoiceCurrency || "\u2014",
      expected: "USD",
      check: () => values.invoiceCurrency === "USD",
    },
    {
      field: "Exchange Rate",
      yours: () => values.exchangeRate || "\u2014",
      expected: "1.35",
      check: () => {
        const r = parseFloat(values.exchangeRate);
        return !isNaN(r) && Math.abs(r - 1.35) / 1.35 < 0.005;
      },
    },
    {
      field: "CIF Value (SGD)",
      yours: () => values.cifValue || "\u2014",
      expected: "2,361,825.00",
      check: () => {
        const v = parseFloat(values.cifValue);
        return !isNaN(v) && Math.abs(v - 2361825) / 2361825 < 0.01;
      },
    },
    {
      field: "Freight",
      yours: () => values.freight || "\u2014",
      expected: "0 (CIF)",
      check: () => {
        const f = parseFloat(values.freight || "0");
        return isNaN(f) || f === 0;
      },
    },
    {
      field: "Insurance",
      yours: () => values.insurance || "\u2014",
      expected: "0 (CIF)",
      check: () => {
        const ins = parseFloat(values.insurance || "0");
        return isNaN(ins) || ins === 0;
      },
    },
    {
      field: "Gross Weight",
      yours: () =>
        values.grossWeight
          ? `${values.grossWeight} ${values.grossWeightUnit || "?"}`
          : "\u2014",
      expected: "1,250 KGM",
      check: () => {
        const w = parseFloat(values.grossWeight);
        return !isNaN(w) && Math.abs(w - 1250) / 1250 < 0.05;
      },
    },
    {
      field: "Gross Weight Unit",
      yours: () => values.grossWeightUnit || "\u2014",
      expected: "KGM",
      check: () => values.grossWeightUnit === "KGM",
    },
    {
      field: "Payment Condition",
      yours: () =>
        values.paymentCondition === "G1"
          ? "G1 (Pay on approval)"
          : values.paymentCondition === "GF"
            ? "GF (GIRO)"
            : values.paymentCondition || "\u2014",
      expected: "GF",
      check: () => values.paymentCondition === "GF",
    },
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
