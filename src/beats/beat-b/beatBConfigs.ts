import type { SingaporeMapConfig } from "./SingaporeMap";
import type { BeatBConfig } from "./beatBConfig";

// --- Map configs for each case ---

const MAP_014: SingaporeMapConfig = {
  routeLocations: [
    { id: "origin-france", x: 268, y: 485, label: "France", shortLabel: "FRANCE", type: "origin" },
    { id: "ftz-pp", x: 268, y: 347, label: "Pasir Panjang FTZ (PP1)", shortLabel: "PP1", type: "ftz" },
    { id: "lw-pp", x: 195, y: 370, label: "Licensed Warehouse (LW)", shortLabel: "LW", type: "lw" },
    { id: "dest-sg", x: 430, y: 250, label: "Consignee (Singapore)", shortLabel: "DELIVERED", type: "destination" },
  ],
  routeSegments: [
    { from: "origin-france", to: "ftz-pp", transportIcon: "\u{1F6A2}", legIndex: 1 },
    { from: "ftz-pp", to: "dest-sg", transportIcon: "\u{1F69B}", legIndex: 2 },
  ],
};

const MAP_025: SingaporeMapConfig = {
  routeLocations: [
    { id: "origin-usa", x: 770, y: 170, label: "USA", shortLabel: "USA", type: "origin" },
    { id: "ftz-changi", x: 629, y: 224, label: "Changi Airfreight (C01)", shortLabel: "C01", type: "ftz" },
    { id: "zgs-changi", x: 570, y: 270, label: "Zero-GST Warehouse", shortLabel: "ZGS", type: "zgs" },
    { id: "dest-sg", x: 430, y: 250, label: "Consignee (Singapore)", shortLabel: "DELIVERED", type: "destination" },
  ],
  routeSegments: [
    { from: "origin-usa", to: "ftz-changi", transportIcon: "\u2708\uFE0F", legIndex: 1 },
    { from: "ftz-changi", to: "dest-sg", transportIcon: "\u{1F69B}", legIndex: 2 },
  ],
};

const MAP_038: SingaporeMapConfig = {
  routeLocations: [
    { id: "origin-korea", x: 268, y: 485, label: "South Korea", shortLabel: "KOREA", type: "origin" },
    { id: "ftz-pp", x: 268, y: 347, label: "Pasir Panjang FTZ (PP1)", shortLabel: "PP1", type: "ftz" },
    { id: "ftz-jurong", x: 174, y: 275, label: "Jurong Port (JZ)", shortLabel: "JZ", type: "ftz" },
    { id: "dest-jakarta", x: 100, y: 485, label: "Jakarta", shortLabel: "JAKARTA", type: "destination" },
  ],
  routeSegments: [
    { from: "origin-korea", to: "ftz-pp", transportIcon: "\u{1F6A2}", legIndex: 1 },
    { from: "ftz-pp", to: "ftz-jurong", transportIcon: "\u{1F69B}", legIndex: 2 },
    { from: "ftz-jurong", to: "dest-jakarta", transportIcon: "\u{1F6A2}", legIndex: 3 },
  ],
};

const MAP_052: SingaporeMapConfig = {
  routeLocations: [
    { id: "factory-sg", x: 380, y: 245, label: "NanoOptics Factory", shortLabel: "FACTORY", type: "factory" },
    { id: "ftz-keppel", x: 380, y: 352, label: "Keppel Terminal", shortLabel: "KEP", type: "ftz" },
    { id: "dest-germany", x: 380, y: 485, label: "Germany", shortLabel: "GERMANY", type: "destination" },
  ],
  routeSegments: [
    { from: "factory-sg", to: "ftz-keppel", transportIcon: "\u{1F69B}", legIndex: 1 },
    { from: "ftz-keppel", to: "dest-germany", transportIcon: "\u{1F6A2}", legIndex: 2 },
  ],
};

export const BEAT_B_014: BeatBConfig = {
  caseId: "014",
  caseTitle: "CASE #014 \u2014 BORDEAUX WINE IMPORT",
  backLink: "/",

  mapNodes: [
    { label: "ORIGIN", sub: "France", icon: "\u{1F1EB}\u{1F1F7}" },
    { label: "FTZ", sub: "Pasir Panjang", icon: "\u2693" },
    { label: "FTZ GATE", sub: "Condition A1", icon: "\u{1F6C3}" },
    { label: "DELIVERED", sub: "Singapore", icon: "\u{1F3EA}" },
  ],
  legTransportIcons: ["\u{1F6A2}", "\u{1F69B}", "\u{1F69B}"],

  correctMessageType: "IN",
  wrongFeedback: {
    OUT: {
      color: "border-customs-amber",
      message:
        "OUT permits are for goods leaving Singapore. Your wine hasn\u2019t left \u2014 it\u2019s trying to come in. Flip the direction.",
    },
    TSHIP: {
      color: "border-customs-amber",
      message:
        "Transhipment permits are for goods passing through Singapore to another destination \u2014 not for goods being imported for consumption here. Your wine is staying in Singapore.",
    },
    COO: {
      color: "border-customs-amber",
      message:
        "A Certificate of Origin proves where goods were made \u2014 it\u2019s a trade document for tariff preference claims, not a movement permit. You need a permit, not a certificate.",
    },
  },
  errorTagPrefix: "B-S1",

  tshipSubtypes: [
    {
      label: "Through Transhipment within same FTZ",
      tooltip:
        "Only covers goods staying inside one FTZ \u2014 the wine needs to cross into Singapore proper.",
    },
    {
      label: "TTI \u2014 Inter-Gateway Movement",
      tooltip: "For moving goods between gateways, not for importing.",
    },
    {
      label: "IGM \u2014 Inter-Gateway Movement",
      tooltip: "For inter-gateway cargo routing.",
    },
    {
      label: "Removal (REM)",
      tooltip: "For removing goods from licensed warehouses.",
    },
    {
      label: "Blanket Removal (BRE)",
      tooltip: "For pre-approved bulk removals.",
    },
  ],

  introIcon: "\u{1F377}",
  introDescription:
    "A shipment of 1,200 bottles of Bordeaux wine has arrived from France at Pasir Panjang Terminal (FTZ). As a dutiable good (intoxicating liquor), it must clear Singapore Customs before delivery. Route it through the correct checkpoints.",

  leg1AnimatingText: "\u{1F6A2} MV Bordeaux Belle arriving at Pasir Panjang Terminal (FTZ)...",
  leg1ScaffoldingHint:
    "Goods arriving at an FTZ are outside Singapore\u2019s customs territory. No permit is needed until they leave the FTZ. But to enter Singapore proper, you\u2019ll need to submit an import (IN) permit via TradeNet.",

  gate2Header: "LEG 2: TRADENET PERMIT APPLICATION",
  gate2Description:
    "The wine is stored in the FTZ. To release it into Singapore\u2019s customs territory, you must submit a permit via TradeNet. What message type do you declare?",

  gate2CorrectText: "IN / Import is correct.",
  gate2MovingText: "\u{1F69B} Loading onto truck for FTZ gate clearance...",
  gate2ProcedureNote: "TradeNet approved your IN permit. The Cargo Clearance Permit (CCP) is printed. Payment condition: G1 (duty/GST must be paid at UOB before removal from FTZ). Next: present CCP + supporting documents at the FTZ OUT gate.",

  gate3Header: "LEG 3: FTZ GATE CLEARANCE (Condition A1)",
  gate3Description:
    "Your CCP is ready. Condition A1 applies: goods, permit, and supporting documents must be produced at the FTZ \u201CIN\u201D gate. What must you present to clear the checkpoint?",
  gate3Options: [
    { value: "CCP_FULL", label: "CCP + Invoice + Packing List + B/L" },
    { value: "CCP_ONLY", label: "CCP only (no supporting docs)", wrongFeedback: "Under condition A1, the CCP alone is not sufficient. You must also present the commercial invoice, packing list, and Bill of Lading to ICA officers at the gate." },
    { value: "NOTHING", label: "Nothing (auto-cleared for containers)", wrongFeedback: "Auto-clearance only applies to containerised cargo with no checkpoint condition. This conventional cargo shipment under condition A1 requires full document presentation." },
    { value: "COMPANY_ID", label: "Company ID + delivery order", wrongFeedback: "A company ID is not a valid clearance document. Singapore Customs requires the CCP (Cargo Clearance Permit) and supporting trade documents (invoice, packing list, B/L)." },
  ],
  gate3CorrectValue: "CCP_FULL",
  gate3WrongFeedback:
    "Under condition A1, you must produce the CCP together with invoice, packing list, and Bill of Lading at the FTZ gate.",
  gate3WrongButtonText: "TRY AGAIN",

  gate3CorrectText: "Correct! ICA officers verify documents and release the goods.",
  gate3CorrectSubtext: "\u{1F69B} Duty paid (G1). Goods cleared and en route to consignee...",

  leg3AnimatingIcon: "\u{1F69B}",
  leg3AnimatingText: "Delivering to Lumiere Cellars, Singapore...",

  completionTitle: "SHIPMENT DELIVERED \u2014 CASE #014",
  legSummaries: [
    { label: "LEG 1: France \u2192 FTZ (Pasir Panjang)", result: "No permit needed" },
    { label: "LEG 2: TradeNet IN permit", result: "CCP issued (G1)" },
    { label: "LEG 3: FTZ gate (A1)", result: "Docs presented" },
  ],

  completionProcedureNote: "Real-world steps: (1) Submit IN permit via TradeNet \u2192 (2) Pay duty/GST at UOB (G1 condition) \u2192 (3) Print CCP \u2192 (4) Present CCP + invoice + packing list + B/L to ICA at FTZ OUT gate \u2192 (5) ICA verifies and releases goods \u2192 (6) Truck delivers to consignee. CCP must be submitted back to shipping agent within 10 working days.",

  caseCardLabel: "Bordeaux Wine Import",
  caseCardFields: [
    { label: "Shipper", value: "Chateau Merlande, FR" },
    { label: "Consignee", value: "Lumiere Cellars Pte Ltd, SG" },
    { label: "Goods", value: "Bottled red wine (1,200 bottles)" },
    { label: "Mode", value: "Sea freight (conventional cargo)" },
    { label: "Origin", value: "France" },
    { label: "Destination", value: "Singapore" },
    { label: "INCOTERM", value: "FOB Le Havre" },
    { label: "Status", value: "Dutiable (intoxicating liquor)", colorClass: "text-customs-amber" },
    { label: "Condition", value: "A1 \u2014 Produce at FTZ gate", colorClass: "text-customs-gold" },
    { label: "Payment", value: "G1 \u2014 Pay at UOB before removal", colorClass: "text-customs-gold" },
  ],

  rulebookContent: "standard",
  rulebookKeyPrinciple:
    "Dutiable goods (liquor, tobacco, petroleum, motor vehicles) require payment of duty/GST before release. Under condition A1, the CCP and supporting documents (invoice, packing list, B/L) must be produced at the FTZ gate to ICA officers.",

  sgMapConfig: MAP_014,
};

export const BEAT_B_025: BeatBConfig = {
  caseId: "025",
  caseTitle: "CASE #025 \u2014 MACBOOK PRO IMPORT",
  backLink: "/case-025",

  mapNodes: [
    { label: "ORIGIN", sub: "USA", icon: "\u{1F1FA}\u{1F1F8}" },
    { label: "FTZ", sub: "Changi Airfreight", icon: "\u2708\uFE0F" },
    { label: "GATE", sub: "Condition GF", icon: "\u{1F6C3}" },
    { label: "DELIVERED", sub: "Singapore", icon: "\u{1F3EA}" },
  ],
  legTransportIcons: ["\u2708\uFE0F", "\u{1F69B}", "\u{1F69B}"],

  correctMessageType: "IN",
  wrongFeedback: {
    OUT: {
      color: "border-customs-amber",
      message:
        "OUT permits are for goods leaving Singapore. Your MacBooks haven\u2019t left \u2014 they\u2019re arriving from the USA. Flip the direction.",
    },
    TSHIP: {
      color: "border-customs-amber",
      message:
        "Transhipment permits are for goods passing through Singapore to another destination \u2014 not for goods being imported for retail sale here. The laptops are staying.",
    },
    COO: {
      color: "border-customs-amber",
      message:
        "A Certificate of Origin proves where goods were made \u2014 it\u2019s a trade document, not a movement permit. You need a permit to import.",
    },
  },
  errorTagPrefix: "B-S1",

  tshipSubtypes: [
    {
      label: "Through Transhipment within same FTZ",
      tooltip:
        "Only covers goods staying inside one FTZ \u2014 the MacBooks need to enter Singapore proper.",
    },
    {
      label: "TTI \u2014 Inter-Gateway Movement",
      tooltip: "For moving goods between gateways, not for importing.",
    },
    {
      label: "IGM \u2014 Inter-Gateway Movement",
      tooltip: "For inter-gateway cargo routing.",
    },
    {
      label: "Removal (REM)",
      tooltip: "For removing goods from licensed warehouses.",
    },
    {
      label: "Blanket Removal (BRE)",
      tooltip: "For pre-approved bulk removals.",
    },
  ],

  introIcon: "\u{1F4BB}",
  introDescription:
    "500 MacBook Pro laptops have arrived at Changi Airfreight Centre (FTZ) via Singapore Airlines Cargo from Cupertino. As non-dutiable goods, only GST applies. Route them through the correct air freight clearance checkpoints.",

  leg1AnimatingText: "\u2708\uFE0F SQ Cargo flight arriving at Changi Airfreight Centre (FTZ)...",
  leg1ScaffoldingHint:
    "Air cargo arrives at Changi Airfreight Centre (an FTZ). Goods remain outside customs territory until an import permit is obtained. For non-dutiable goods, GST (9%) applies but no excise duty.",

  gate2Header: "LEG 2: TRADENET PERMIT APPLICATION",
  gate2Description:
    "The MacBooks are held at Changi Airfreight Centre (FTZ). To release them for local sale, submit a permit via TradeNet. What message type?",

  gate2CorrectText: "IN / Import is correct.",
  gate2MovingText: "\u{1F69B} Arranging truck pickup from airfreight terminal...",
  gate2ProcedureNote: "TradeNet approved your IN permit. CCP issued with payment condition GF (GST deducted via GIRO from importer\u2019s account). For non-dutiable goods, no UOB payment is needed \u2014 GIRO auto-deducts. Present CCP at Changi Airfreight Centre gate.",

  gate3Header: "LEG 3: AIRFREIGHT CENTRE GATE",
  gate3Description:
    "Your CCP shows payment condition GF (GIRO). At the Changi Airfreight Centre exit gate, what do you need to present for release?",
  gate3Options: [
    { value: "CCP_AWB", label: "CCP + Air Waybill + Invoice" },
    { value: "CCP_ONLY", label: "CCP only (GIRO means auto-clear)", wrongFeedback: "Even with GIRO payment (GF condition), you still need to present the CCP together with supporting trade documents at the gate. Auto-clearance isn\u2019t automatic for air cargo." },
    { value: "AWB_ONLY", label: "Air Waybill only (no CCP needed)", wrongFeedback: "The CCP (Cargo Clearance Permit) is always required for gate clearance. An Air Waybill alone is just a transport document \u2014 it doesn\u2019t authorise customs release." },
  ],
  gate3CorrectValue: "CCP_AWB",
  gate3WrongFeedback:
    "At the airfreight centre gate, you need the CCP (proof of permit approval) plus supporting documents including the Air Waybill and commercial invoice.",
  gate3WrongButtonText: "TRY AGAIN",

  gate3CorrectText: "Correct! Gate officer verifies CCP and releases cargo.",
  gate3CorrectSubtext: "\u{1F69B} GST auto-deducted via GIRO (GF). Goods loaded for delivery...",

  leg3AnimatingIcon: "\u{1F69B}",
  leg3AnimatingText: "Delivering to AppleSG warehouse, Singapore...",

  completionTitle: "SHIPMENT DELIVERED \u2014 CASE #025",
  legSummaries: [
    { label: "LEG 1: USA \u2192 Changi FTZ", result: "No permit needed" },
    { label: "LEG 2: TradeNet IN permit", result: "CCP issued (GF)" },
    { label: "LEG 3: Airfreight gate", result: "CCP + AWB presented" },
  ],

  completionProcedureNote: "Real-world steps: (1) Submit IN permit via TradeNet \u2192 (2) GST auto-deducted via GIRO (condition GF \u2014 no manual payment needed) \u2192 (3) Print CCP \u2192 (4) Present CCP + Air Waybill + invoice at Changi Airfreight Centre exit gate \u2192 (5) Gate officer stamps and releases \u2192 (6) Truck delivers to consignee. Air freight uses KGM (not TNE) and goods are non-containerised.",

  caseCardLabel: "MacBook Pro Import",
  caseCardFields: [
    { label: "Shipper", value: "Apple Inc, USA" },
    { label: "Consignee", value: "AppleSG Pte Ltd, SG" },
    { label: "Goods", value: 'MacBook Pro 16" (500 units)' },
    { label: "Mode", value: "Air freight (non-containerised)" },
    { label: "Origin", value: "USA" },
    { label: "Destination", value: "Singapore" },
    { label: "INCOTERM", value: "CIF Singapore" },
    { label: "Status", value: "Non-dutiable (GST only)", colorClass: "text-customs-green" },
    { label: "Condition", value: "GF \u2014 GIRO deduction from importer", colorClass: "text-customs-gold" },
  ],

  rulebookContent: "standard",
  rulebookKeyPrinciple:
    "Non-dutiable goods still require an IN permit and payment of 9% GST. With payment condition GF, GST is deducted automatically via GIRO from the importer\u2019s bank account \u2014 no manual payment at UOB needed. CCP + trade documents must still be presented at the FTZ gate.",

  sgMapConfig: MAP_025,
};

export const BEAT_B_038: BeatBConfig = {
  caseId: "038",
  caseTitle: "CASE #038 \u2014 SAMSUNG OLED TRANSHIPMENT",
  backLink: "/",

  mapNodes: [
    { label: "ORIGIN", sub: "Korea", icon: "\u{1F1F0}\u{1F1F7}" },
    { label: "FTZ 1", sub: "Pasir Panjang", icon: "\u2693" },
    { label: "FTZ 2", sub: "Jurong Port", icon: "\u{1F69B}" },
    { label: "DESTINATION", sub: "Jakarta", icon: "\u{1F1EE}\u{1F1E9}" },
  ],
  legTransportIcons: ["\u{1F6A2}", "\u{1F69B}", "\u{1F6A2}"],

  correctMessageType: "TSHIP",
  wrongFeedback: {
    IN: {
      color: "border-customs-amber",
      message:
        "IN permits are for goods entering Singapore for local consumption. These OLED panels are just passing through to Jakarta \u2014 they never enter Singapore\u2019s customs territory.",
    },
    OUT: {
      color: "border-customs-amber",
      message:
        "OUT permits are for goods leaving Singapore that were previously imported. These goods originated from Korea, not Singapore \u2014 they\u2019re transiting through.",
    },
    COO: {
      color: "border-customs-amber",
      message:
        "A Certificate of Origin proves where goods were manufactured \u2014 it\u2019s a trade document, not a movement permit. You need a transhipment permit.",
    },
  },
  errorTagPrefix: "B-T1",

  introIcon: "\u{1F4E6}",
  introDescription:
    "2,000 OLED panels from Samsung Display Korea are arriving at Pasir Panjang Terminal (FTZ). They\u2019re destined for Jakarta \u2014 just passing through Singapore. The outward vessel departs from Jurong Port, so an inter-FTZ truck movement is needed.",

  leg1AnimatingText: "\u{1F6A2} MV Korea Star arriving at Pasir Panjang Terminal (FTZ)...",
  leg1ScaffoldingHint:
    "Goods in an FTZ are outside customs territory. Since these OLED panels are NOT for Singapore, you need a Transhipment (TSHIP) permit. No duty/GST applies \u2014 the goods never enter Singapore proper.",

  gate2Header: "LEG 2: TRADENET TRANSHIPMENT PERMIT",
  gate2Description:
    "The OLED panels need to move from Pasir Panjang FTZ to Jurong Port FTZ for loading onto MV Java Express (bound for Jakarta). What permit type?",

  gate2CorrectText: "TSHIP / Transhipment is correct.",
  gate2MovingText: "\u{1F69B} Preparing inter-gateway truck movement to Jurong Port...",
  gate2ProcedureNote: "TSHIP permit approved (TTI \u2014 Inter-Gateway Movement). No payment condition applies (goods stay outside customs territory). For inter-FTZ road movement, condition A9 requires a sealed bonded truck. The 48-hour rule (AX) applies: goods must arrive at destination FTZ within 48 hours.",

  gate3Header: "LEG 3: INTER-FTZ TRUCK MOVEMENT (Condition A9)",
  gate3Description:
    "Your TSHIP permit is approved. The goods must be trucked from Pasir Panjang FTZ \u2192 Jurong Port FTZ. Condition A9 applies. What does this require?",
  gate3Options: [
    { value: "BONDED_SEALED", label: "Bonded truck with customs seal (A9)" },
    { value: "ANY_TRUCK", label: "Any truck \u2014 goods stay in FTZ zone", wrongFeedback: "Wrong \u2014 when goods leave one FTZ on public roads to reach another FTZ, they temporarily cross customs territory. Condition A9 requires the truck to be bonded and sealed by Customs officers to prevent pilferage." },
    { value: "CONTAINER_ONLY", label: "FCL container (no sealing needed)", wrongFeedback: "Even FCL containers require sealing under condition A9 for inter-gateway movement. Customs officers seal the container/truck at the origin FTZ gate and verify the seal at the destination FTZ." },
    { value: "NO_PERMIT", label: "No transport requirement (same island)", wrongFeedback: "Singapore may be small, but goods moving between FTZs on public roads temporarily leave the free-trade zone. A bonded truck with customs sealing (A9) and the 48-hour window (AX) are mandatory." },
  ],
  gate3CorrectValue: "BONDED_SEALED",
  gate3WrongFeedback:
    "Condition A9 requires a bonded truck sealed by Customs officers. Goods on public roads between FTZs temporarily leave free-trade zone coverage.",
  gate3WrongButtonText: "TRY AGAIN",

  gate3CorrectText: "Correct! Sealed truck departs. Must arrive at Jurong Port within 48 hours (AX).",
  gate3CorrectSubtext: "\u{1F69B} Customs-sealed truck en route Pasir Panjang \u2192 Jurong Port...",

  leg3AnimatingIcon: "\u{1F6A2}",
  leg3AnimatingText: "Goods loaded onto MV Java Express. Departing to Jakarta...",

  completionTitle: "TRANSHIPMENT COMPLETE \u2014 CASE #038",
  legSummaries: [
    { label: "LEG 1: Korea \u2192 Pasir Panjang FTZ", result: "No permit needed" },
    { label: "LEG 2: TSHIP permit (TTI)", result: "Approved" },
    { label: "LEG 3: Inter-FTZ truck (A9)", result: "Sealed & delivered" },
  ],

  completionProcedureNote: "Real-world steps: (1) Submit TSHIP permit via TradeNet (type: TTI \u2014 Inter-Gateway) \u2192 (2) No payment (goods never enter customs territory) \u2192 (3) Arrange bonded truck \u2192 (4) Customs officer seals truck at Pasir Panjang exit gate \u2192 (5) Truck drives to Jurong Port (must arrive within 48 hours, condition AX) \u2192 (6) Customs verifies seal at Jurong Port entry gate \u2192 (7) Goods loaded onto outbound vessel. If seal is broken \u2192 investigation + penalties.",

  caseCardLabel: "Samsung OLED Transhipment",
  caseCardFields: [
    { label: "Shipper", value: "Samsung Display, KR" },
    { label: "Consignee", value: "PT Elektronik Nusantara, ID" },
    { label: "Goods", value: "OLED Panels (2,000 pcs)" },
    { label: "Mode", value: "Sea \u2192 Road (inter-FTZ) \u2192 Sea" },
    { label: "Origin", value: "South Korea" },
    { label: "Final Destination", value: "Jakarta, Indonesia" },
    { label: "SG Role", value: "TRANSIT only (inter-FTZ via truck)", colorClass: "text-customs-amber" },
    { label: "Condition", value: "A9 \u2014 Bonded truck with sealing", colorClass: "text-customs-gold" },
    { label: "Time Limit", value: "AX \u2014 48-hour inter-checkpoint window", colorClass: "text-customs-gold" },
  ],

  rulebookContent: "transhipment",
  rulebookKeyPrinciple:
    "Goods transshipping through Singapore stay outside customs territory (no duty/GST). But if moved between FTZs by road, condition A9 (bonded truck with customs sealing) and AX (48-hour deadline) apply to prevent diversion into Singapore.",

  sgMapConfig: MAP_038,
};

export const BEAT_B_052: BeatBConfig = {
  caseId: "052",
  caseTitle: "CASE #052 \u2014 PRECISION OPTICS EXPORT",
  backLink: "/",

  mapNodes: [
    { label: "ORIGIN", sub: "Singapore", icon: "\u{1F1F8}\u{1F1EC}" },
    { label: "PORT FTZ", sub: "Keppel", icon: "\u2693" },
    { label: "LOADED", sub: "Vessel", icon: "\u{1F6A2}" },
    { label: "DELIVERED", sub: "Germany", icon: "\u{1F1E9}\u{1F1EA}" },
  ],
  legTransportIcons: ["\u{1F69B}", "\u{1F6A2}", "\u{1F6A2}"],

  correctMessageType: "OUT",
  wrongFeedback: {
    IN: {
      color: "border-customs-amber",
      message:
        "IN permits are for goods entering Singapore. Your lenses are manufactured in Singapore and leaving \u2014 they\u2019re being exported. Flip the direction.",
    },
    TSHIP: {
      color: "border-customs-amber",
      message:
        "Transhipment permits are for goods passing through Singapore to another destination \u2014 not for goods manufactured here and shipped overseas. Your lenses originated in Singapore.",
    },
    COO: {
      color: "border-customs-amber",
      message:
        "A Certificate of Origin proves where goods were made \u2014 it\u2019s a trade document, not a movement permit. You need an export permit to ship these lenses out.",
    },
  },
  errorTagPrefix: "B-E1",

  tshipSubtypes: [
    {
      label: "Through Transhipment within same FTZ",
      tooltip:
        "Only covers goods staying inside one FTZ \u2014 these lenses need to leave Singapore entirely.",
    },
    {
      label: "TTI \u2014 Inter-Gateway Movement",
      tooltip: "For moving goods between gateways, not for exporting.",
    },
    {
      label: "IGM \u2014 Inter-Gateway Movement",
      tooltip: "For inter-gateway cargo routing.",
    },
    {
      label: "Removal (REM)",
      tooltip: "For removing goods from licensed warehouses.",
    },
    {
      label: "Blanket Removal (BRE)",
      tooltip: "For pre-approved bulk removals.",
    },
  ],

  introIcon: "\u{1F52C}",
  introDescription:
    "300 precision optical lenses manufactured by NanoOptics in Singapore are being exported to Carl Zeiss in Hamburg, Germany. The goods will be trucked from the factory to Keppel Terminal (FTZ) and loaded onto MV Europa Carrier.",

  leg1AnimatingText: "\u{1F69B} Truck carrying lenses from NanoOptics factory to Keppel Terminal (FTZ)...",
  leg1ScaffoldingHint:
    "Moving goods from a Singapore factory to a port FTZ is a domestic transfer \u2014 no permit needed yet. But to load onto an outbound vessel, you\u2019ll need an export (OUT) permit submitted to TradeNet before the vessel departs.",

  gate2Header: "LEG 2: TRADENET EXPORT PERMIT",
  gate2Description:
    "The lenses have arrived at Keppel Terminal (FTZ). To load them onto MV Europa Carrier bound for Hamburg, you must submit a permit via TradeNet. What message type?",

  gate2CorrectText: "OUT / Export is correct.",
  gate2MovingText: "\u{1F6A2} Arranging container loading at Keppel berth...",
  gate2ProcedureNote: "TradeNet approved your OUT permit. CCP issued with payment condition GF (GIRO). For exports, the CCP must be produced at the port gate BEFORE the vessel departs. Singapore Customs requires the export permit to be submitted at least 24 hours before vessel ETD.",

  gate3Header: "LEG 3: PORT GATE CLEARANCE (Export)",
  gate3Description:
    "Your CCP is ready. Before the container is loaded onto MV Europa Carrier, what must you produce at the port gate?",
  gate3Options: [
    { value: "CCP_EXPORT", label: "CCP + Commercial Invoice + Packing List" },
    { value: "CCP_ONLY", label: "CCP only (export is simpler)", wrongFeedback: "Exports still require supporting documents. The commercial invoice and packing list must accompany the CCP at the port gate for verification against the declared goods." },
    { value: "NOTHING", label: "Nothing \u2014 auto-cleared for exports", wrongFeedback: "Export shipments are NOT auto-cleared. The CCP must be produced at the port/FTZ gate to authorise loading onto the outbound vessel. Without it, the shipping line won\u2019t accept the cargo." },
  ],
  gate3CorrectValue: "CCP_EXPORT",
  gate3WrongFeedback:
    "You must present the CCP together with the commercial invoice and packing list at the port gate before the vessel departs.",
  gate3WrongButtonText: "TRY AGAIN",

  gate3CorrectText: "Correct! Port authority verifies CCP and authorises loading.",
  gate3CorrectSubtext: "\u{1F6A2} Container loaded. MV Europa Carrier departing for Hamburg...",

  leg3AnimatingIcon: "\u{1F6A2}",
  leg3AnimatingText: "MV Europa Carrier departing Keppel for Hamburg...",

  completionTitle: "EXPORT COMPLETE \u2014 CASE #052",
  legSummaries: [
    { label: "LEG 1: Factory \u2192 Keppel FTZ", result: "Domestic (no permit)" },
    { label: "LEG 2: TradeNet OUT permit", result: "CCP issued (GF)" },
    { label: "LEG 3: Port gate", result: "CCP + docs presented" },
  ],

  completionProcedureNote: "Real-world steps: (1) Submit OUT permit via TradeNet at least 24 hours before vessel ETD \u2192 (2) CCP issued with payment condition GF \u2192 (3) Truck delivers goods to Keppel Terminal (FTZ) \u2192 (4) Present CCP + invoice + packing list at port gate \u2192 (5) Port authority verifies and authorises container loading \u2192 (6) Container loaded onto vessel \u2192 (7) Vessel departs. Note: FOB value only (freight/insurance are buyer\u2019s cost).",

  caseCardLabel: "Precision Optics Export",
  caseCardFields: [
    { label: "Exporter", value: "NanoOptics Pte Ltd, SG" },
    { label: "Buyer", value: "Carl Zeiss AG, DE" },
    { label: "Goods", value: "Precision optical lenses (300 U)" },
    { label: "Mode", value: "Sea freight (FCL)" },
    { label: "Origin", value: "Singapore" },
    { label: "Destination", value: "Hamburg, Germany" },
    { label: "INCOTERM", value: "FOB Singapore" },
    { label: "Status", value: "Non-dutiable (no export duty)", colorClass: "text-customs-green" },
    { label: "Condition", value: "GF \u2014 GIRO payment", colorClass: "text-customs-gold" },
    { label: "Timing", value: "Permit 24h before vessel ETD", colorClass: "text-customs-gold" },
  ],

  rulebookContent: "standard",
  rulebookKeyPrinciple:
    "Exports require an OUT permit submitted via TradeNet before vessel departure. The CCP and supporting documents (invoice, packing list) must be presented at the port gate to authorise loading. Singapore has no export duties, but permits are mandatory for trade compliance and statistics.",

  sgMapConfig: MAP_052,
};
