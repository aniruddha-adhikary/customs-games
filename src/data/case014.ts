export const CASE_014 = {
  narrative: {
    client: "Lumiere Cellars Pte. Ltd.",
    clientUEN: "201835672K",
    supplier: "Chateau Merlande",
    supplierAddress: "5 Route des Vignobles, 33580 Moulis-en-Medoc, France",
    goodsDescription: "Bottled red wine — Chateau Merlande Grand Cru 2021, Bordeaux AOC, 750 ml per bottle, 13.5% ABV",
    quantityBottles: 1200,
    cartonsCount: 100,
    bottlesPerCarton: 12,
    route: "Bordeaux (France) -> Port of Singapore (PSA Tanjong Pagar Terminal)",
    vessel: "MV Vieux Port",
    voyage: "VX-0614 S",
    blNumber: "MSCFR0614SGP01",
    containerNo: "MSCU7234581",
    containerType: "20' Dry",
    incoterm: "FOB Le Havre",
    invoiceCurrency: "EUR",
    exchangeRate: 1.46,
    fobValue: 17400,
    unitPrice: 14.50,
    freight: 480,
    insurance: 96,
    cifEUR: 17976,
    cifSGD: 26244.96,
    grossWeightKg: 1920,
    grossWeightTNE: 1.920,
    netWeightKg: 1500,
    totalPackages: 100,
  },

  canonicalPermit: {
    messageType: "IN" as const,
    declarationType: "APS",
    importerUEN: "201835672K",
    declaringAgentUEN: "199804321D",
    supplier: "Chateau Merlande, France",
    placeOfRelease: "T15",
    placeOfReleaseLabel: "Tanjong Pagar Terminal FTZ",
    placeOfReceipt: "Others",
    hsCode: "2204.21",
    hsQuantity: 900.0,
    hsUnit: "LTR",
    packingOuter: { qty: 100, unit: "CTN" },
    packingInner: { qty: 12, unit: "BOT" },
    cargoPackingType: "9",
    transportMode: "1",
    invoiceCurrency: "EUR",
    exchangeRate: 1.46,
    cifValueSGD: 26244.96,
    freight: 480,
    insurance: 96,
    grossWeight: 1.92,
    grossWeightUnit: "TNE",
    paymentCondition: "G1",
  },

  shortShipment: {
    declaredQtyBot: 1200,
    receivedQtyBot: 1100,
    deltaBot: 100,
    hsQtyLtrDeclared: 900.0,
    hsQtyLtrActual: 825.0,
    cifOriginalSGD: 26244.96,
    cifActualSGD: 24057.88,
    overpaidSGD: 2187.08,
  },

  invoice: {
    seller: "Chateau Merlande",
    sellerAddress: "5 Route des Vignobles, 33580 Moulis-en-Medoc, France",
    sellerVAT: "FR44820016810",
    buyer: "Lumiere Cellars Pte. Ltd.",
    buyerAddress: "18 Duxton Hill, #03-01, Singapore 089601",
    buyerUEN: "201835672K",
    invoiceNo: "CME-2026-0614",
    invoiceDate: "10 Jun 2026",
    blNo: "MSCFR0614SGP01",
    incoterm: "FOB Le Havre",
    portOfLoading: "Le Havre, France",
    portOfDischarge: "Singapore (PSA Tanjong Pagar)",
    lines: [
      {
        description: "Chateau Merlande Grand Cru 2021, Bordeaux AOC, 750 ml, 13.5% ABV, Packed: 12 btl/CTN, HS (FR export): 2204.21",
        qty: 1200,
        unitPrice: 14.50,
        lineTotal: 17400,
      },
    ],
    fobValue: 17400,
    oceanFreight: 480,
    marineInsurance: 96,
    cifValue: 17976,
    exchangeRate: 1.46,
    cifValueSGD: 26244.96,
    countryOfOrigin: "France",
    totalGrossWeight: "1,920 kg",
    totalNetWeight: "1,500 kg",
    totalPackages: "100 cartons",
  },

  packingList: {
    outerPack: "100 CTN",
    innerPack: "12 BOT per CTN",
    totalBottles: "1,200 BOT total",
  },

  billOfLading: {
    vessel: "MV Vieux Port",
    voyage: "VX-0614 S",
    portOfLoading: "Le Havre, France",
    portOfDischarge: "Singapore (PSA Tanjong Pagar)",
    mode: "Sea",
    blNo: "MSCFR0614SGP01",
    containerNo: "MSCU7234581",
    grossWeight: "1,920 kg",
  },
} as const;

export type MessageType = "IN" | "OUT" | "TSHIP" | "COO";
export type DeclarationType = "APS" | "TTI" | "IGM" | "REM" | "BRE";
export type PaymentCondition = "G1" | "GF" | "G7";
export type TransportMode = "1" | "2" | "3" | "4" | "5" | "7";
export type WeightUnit = "KGM" | "TNE";
export type CargoPackingType = "5" | "9";

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  IN: "IN (Import)",
  OUT: "OUT (Export)",
  TSHIP: "Transhipment / Movement",
  COO: "Certificate of Origin",
};

export const MESSAGE_TYPE_DESCRIPTIONS: Record<MessageType, string> = {
  IN: "Goods arriving in Singapore for local consumption or use.",
  OUT: "Goods leaving Singapore to an overseas destination.",
  TSHIP: "Goods passing through Singapore to another destination.",
  COO: "Certificate proving where goods were manufactured.",
};

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  "1": "Sea",
  "2": "Rail",
  "3": "Road",
  "4": "Air",
  "5": "Post",
  "7": "Pipeline",
};

export const GENERIC_UENS = ["99991000000G", "99999000000N", "99999990000C"];
