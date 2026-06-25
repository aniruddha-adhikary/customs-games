import type { BeatBConfig } from "./beatBConfig";

export const BEAT_B_014: BeatBConfig = {
  caseId: "014",
  caseTitle: "CASE #014 \u2014 BORDEAUX WINE IMPORT",
  backLink: "/",

  mapNodes: [
    { label: "ORIGIN", sub: "France", icon: "\u{1F1EB}\u{1F1F7}" },
    { label: "FTZ", sub: "Tanjong Pagar", icon: "\u2693" },
    { label: "CLEARANCE", sub: "Customs", icon: "\u{1F3DB}\uFE0F" },
    { label: "DELIVERED", sub: "Singapore", icon: "\u{1F3EA}" },
  ],
  legTransportIcons: ["\u{1F6A2}", "\u{1F6A2}", "\u{1F69B}"],

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
    "A shipment of 1,200 bottles of Bordeaux wine has arrived from France. Your job: route it through Singapore\u2019s trade checkpoints by choosing the correct permits at each gate.",

  leg1AnimatingText: "\u{1F6A2} Ship arriving at Tanjong Pagar FTZ...",
  leg1ScaffoldingHint:
    "Non-controlled goods moving within the same Free Trade Zone don\u2019t need a permit for the transhipment leg. Keep that in mind for Gate 2.",

  gate2Header: "LEG 2: FTZ \u2192 CLEARANCE",
  gate2Description:
    "Your wine needs to enter Singapore for consumption. Choose the right permit type to release it from the FTZ.",

  gate2CorrectText: "IN / Import is correct.",
  gate2MovingText: "\u{1F6A2} Goods moving to clearance...",

  gate3Header: "LEG 3: CLEARANCE \u2192 DELIVERED",
  gate3Description:
    "Permit approved. The goods are released. Which direction did your permit point \u2014 import INTO Singapore, or export OUT?",
  gate3Options: [
    { value: "IN", label: "Import INTO Singapore" },
    { value: "OUT", label: "Export OUT" },
  ],
  gate3CorrectValue: "IN",
  gate3WrongFeedback:
    "The wine came in, not out. This was an import permit. Select the correct direction above.",
  gate3WrongButtonText: "SELECT \u201CIMPORT\u201D ABOVE",

  gate3CorrectText: "Confirmed! Delivering to Singapore...",
  gate3CorrectSubtext: "\u{1F69B} Goods en route to final destination...",

  leg3AnimatingIcon: "\u{1F69B}",
  leg3AnimatingText: "Delivering to Singapore...",

  completionTitle: "SHIPMENT DELIVERED \u2014 CASE #014",
  legSummaries: [
    { label: "LEG 1: Origin \u2192 FTZ", result: "FREE" },
    { label: "LEG 2: FTZ \u2192 Clearance", result: "IN / Import" },
    { label: "LEG 3: Clearance \u2192 SGP", result: "Confirmed" },
  ],

  caseCardLabel: "Bordeaux Wine Import",
  caseCardFields: [
    { label: "Shipper", value: "Chateau Merlande, FR" },
    { label: "Consignee", value: "Lumiere Cellars Pte Ltd, SG" },
    { label: "Goods", value: "Bottled red wine (1,200 bottles)" },
    { label: "Mode", value: "Sea freight" },
    { label: "Origin", value: "France" },
    { label: "Destination", value: "Singapore" },
    { label: "INCOTERM", value: "FOB Le Havre" },
    { label: "Status", value: "Dutiable (liquor)", colorClass: "text-customs-amber" },
  ],

  rulebookContent: "standard",
  rulebookKeyPrinciple:
    "Non-controlled goods moving within the same Free Trade Zone don\u2019t need a permit. But once goods leave an FTZ to enter Singapore proper, an import (IN) permit is required.",
};

export const BEAT_B_025: BeatBConfig = {
  caseId: "025",
  caseTitle: "CASE #025 \u2014 MACBOOK PRO IMPORT",
  backLink: "/case-025",

  mapNodes: [
    { label: "ORIGIN", sub: "USA", icon: "\u{1F1FA}\u{1F1F8}" },
    { label: "FTZ", sub: "Changi", icon: "\u2708\uFE0F" },
    { label: "CLEARANCE", sub: "Customs", icon: "\u{1F3DB}\uFE0F" },
    { label: "DELIVERED", sub: "Singapore", icon: "\u{1F3EA}" },
  ],
  legTransportIcons: ["\u2708\uFE0F", "\u2708\uFE0F", "\u{1F69B}"],

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
    "A shipment of 500 MacBook Pro laptops has arrived from the USA via air freight. Your job: route it through Singapore\u2019s trade checkpoints by choosing the correct permits at each gate.",

  leg1AnimatingText: "\u2708\uFE0F Flight arriving at Changi FTZ...",
  leg1ScaffoldingHint:
    "Goods arriving via air are unloaded at the airport FTZ. They need an import permit to leave the FTZ and enter Singapore for local sale.",

  gate2Header: "LEG 2: FTZ \u2192 CLEARANCE",
  gate2Description:
    "Your MacBooks need to enter Singapore for retail sale. Choose the right permit type to release them from the FTZ.",

  gate2CorrectText: "IN / Import is correct.",
  gate2MovingText: "\u2708\uFE0F Goods moving to clearance...",

  gate3Header: "LEG 3: CLEARANCE \u2192 DELIVERED",
  gate3Description:
    "Permit approved. The goods are released. Which direction did your permit point \u2014 import INTO Singapore, or export OUT?",
  gate3Options: [
    { value: "IN", label: "Import INTO Singapore" },
    { value: "OUT", label: "Export OUT" },
  ],
  gate3CorrectValue: "IN",
  gate3WrongFeedback:
    "The MacBooks came in, not out. This was an import permit. Select the correct direction above.",
  gate3WrongButtonText: "SELECT \u201CIMPORT\u201D ABOVE",

  gate3CorrectText: "Confirmed! Delivering to Singapore...",
  gate3CorrectSubtext: "\u{1F69B} Goods en route to final destination...",

  leg3AnimatingIcon: "\u{1F69B}",
  leg3AnimatingText: "Delivering to Singapore...",

  completionTitle: "SHIPMENT DELIVERED \u2014 CASE #025",
  legSummaries: [
    { label: "LEG 1: Origin \u2192 FTZ", result: "FREE" },
    { label: "LEG 2: FTZ \u2192 Clearance", result: "IN / Import" },
    { label: "LEG 3: Clearance \u2192 SGP", result: "Confirmed" },
  ],

  caseCardLabel: "MacBook Pro Import",
  caseCardFields: [
    { label: "Shipper", value: "Apple Inc, USA" },
    { label: "Consignee", value: "AppleSG Pte Ltd, SG" },
    { label: "Goods", value: 'MacBook Pro 16" (500 units)' },
    { label: "Mode", value: "Air freight" },
    { label: "Origin", value: "USA" },
    { label: "Destination", value: "Singapore" },
    { label: "INCOTERM", value: "CIF Singapore" },
    { label: "Status", value: "Non-dutiable", colorClass: "text-customs-green" },
  ],

  rulebookContent: "standard",
  rulebookKeyPrinciple:
    "Non-controlled goods moving within the same Free Trade Zone don\u2019t need a permit. But once goods leave an FTZ to enter Singapore proper, an import (IN) permit is required.",
};

export const BEAT_B_038: BeatBConfig = {
  caseId: "038",
  caseTitle: "CASE #038 \u2014 SAMSUNG OLED TRANSHIPMENT",
  backLink: "/",

  mapNodes: [
    { label: "ORIGIN", sub: "Korea", icon: "\u{1F1F0}\u{1F1F7}" },
    { label: "FTZ", sub: "SG Transit", icon: "\u2693" },
    { label: "TRANSIT", sub: "Reloading", icon: "\u{1F6A2}" },
    { label: "DESTINATION", sub: "Jakarta", icon: "\u{1F1EE}\u{1F1E9}" },
  ],
  legTransportIcons: ["\u{1F6A2}", "\u{1F6A2}", "\u{1F6A2}"],

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
    "2,000 OLED panels from Korea are arriving in Singapore\u2019s FTZ, destined for Jakarta, Indonesia. They will NOT enter Singapore for local use \u2014 they\u2019re just passing through.",

  leg1AnimatingText: "\u{1F6A2} Ship arriving from Busan at Pasir Panjang FTZ...",
  leg1ScaffoldingHint:
    "The OLED panels are now in the Pasir Panjang FTZ. They need to be loaded onto another vessel bound for Jakarta. What kind of permit do you need?",

  gate2Header: "LEG 2: FTZ \u2192 TRANSIT RELOADING",
  gate2Description:
    "The OLED panels need to move from the inward vessel to the outward vessel, both within the FTZ. Choose the right permit type.",

  gate2CorrectText: "TSHIP / Transhipment is correct.",
  gate2MovingText: "\u{1F6A2} Goods being reloaded onto MV Java Express...",

  gate3Header: "LEG 3: FTZ \u2192 ONWARD DESTINATION",
  gate3Description:
    "Permit approved. Are these goods staying in Singapore or passing through to another destination?",
  gate3Options: [
    { value: "passing", label: "Passing through (Transhipment)" },
    { value: "staying", label: "Staying in Singapore" },
  ],
  gate3CorrectValue: "passing",
  gate3WrongFeedback:
    "These goods are NOT staying in Singapore. They\u2019re being reloaded onto MV Java Express bound for Jakarta. This is a transhipment.",
  gate3WrongButtonText: "SELECT \u201CPASSING THROUGH\u201D ABOVE",

  gate3CorrectText: "Confirmed! Goods departing to Jakarta...",
  gate3CorrectSubtext: "\u{1F6A2} MV Java Express departing for Tanjung Priok...",

  leg3AnimatingIcon: "\u{1F6A2}",
  leg3AnimatingText: "Departing to Jakarta...",

  completionTitle: "TRANSHIPMENT COMPLETE \u2014 CASE #038",
  legSummaries: [
    { label: "LEG 1: Korea \u2192 SG FTZ", result: "AUTO" },
    { label: "LEG 2: FTZ \u2192 Transit", result: "TSHIP" },
    { label: "LEG 3: Transit \u2192 Jakarta", result: "Confirmed" },
  ],

  caseCardLabel: "Samsung OLED Transhipment",
  caseCardFields: [
    { label: "Shipper", value: "Samsung Display, KR" },
    { label: "Consignee", value: "PT Elektronik Nusantara, ID" },
    { label: "Goods", value: "OLED Panels (2,000 pcs)" },
    { label: "Mode", value: "Sea freight" },
    { label: "Origin", value: "South Korea" },
    { label: "Final Destination", value: "Jakarta, Indonesia" },
    { label: "SG Role", value: "TRANSIT only", colorClass: "text-customs-amber" },
    { label: "Status", value: "Non-dutiable", colorClass: "text-customs-green" },
  ],

  rulebookContent: "transhipment",
  rulebookKeyPrinciple:
    "Goods passing through Singapore without entering customs territory require a Transhipment (TSHIP) permit, not an Import or Export permit.",
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
    "A shipment of 300 precision optical lenses is being exported from Singapore to Germany. Your job: route it through Singapore\u2019s trade checkpoints by choosing the correct permits at each gate.",

  leg1AnimatingText: "\u{1F69B} Goods arriving at Keppel FTZ for loading...",
  leg1ScaffoldingHint:
    "Moving goods from the factory to the port FTZ is a domestic transfer within Singapore. Now the goods need an export permit to leave.",

  gate2Header: "LEG 2: PORT FTZ \u2192 LOADED",
  gate2Description:
    "Your lenses need to leave Singapore for Germany. Choose the right permit type to load them onto the vessel.",

  gate2CorrectText: "OUT / Export is correct.",
  gate2MovingText: "\u{1F6A2} Goods being loaded onto vessel...",

  gate3Header: "LEG 3: LOADED \u2192 DELIVERED",
  gate3Description:
    "Permit approved. The goods are loaded. Which direction did your permit point \u2014 goods leaving Singapore or entering?",
  gate3Options: [
    { value: "OUT", label: "Leaving Singapore (Export)" },
    { value: "IN", label: "Entering Singapore (Import)" },
  ],
  gate3CorrectValue: "OUT",
  gate3WrongFeedback:
    "The lenses are leaving Singapore, not coming in. This was an export permit. Select the correct direction above.",
  gate3WrongButtonText: "SELECT \u201CLEAVING SINGAPORE\u201D ABOVE",

  gate3CorrectText: "Confirmed! Shipping to Germany...",
  gate3CorrectSubtext: "\u{1F6A2} Vessel departing for Hamburg...",

  leg3AnimatingIcon: "\u{1F6A2}",
  leg3AnimatingText: "En route to Hamburg, Germany...",

  completionTitle: "SHIPMENT DELIVERED \u2014 CASE #052",
  legSummaries: [
    { label: "LEG 1: Singapore \u2192 Port FTZ", result: "FREE" },
    { label: "LEG 2: Port FTZ \u2192 Loaded", result: "OUT / Export" },
    { label: "LEG 3: Loaded \u2192 Germany", result: "Confirmed" },
  ],

  caseCardLabel: "Precision Optics Export",
  caseCardFields: [
    { label: "Exporter", value: "NanoOptics Pte Ltd, SG" },
    { label: "Buyer", value: "Carl Zeiss AG, DE" },
    { label: "Goods", value: "Precision optical lenses (300 U)" },
    { label: "Mode", value: "Sea freight" },
    { label: "Origin", value: "Singapore" },
    { label: "Destination", value: "Hamburg, Germany" },
    { label: "INCOTERM", value: "FOB Singapore" },
    { label: "Status", value: "Non-dutiable", colorClass: "text-customs-green" },
  ],

  rulebookContent: "standard",
  rulebookKeyPrinciple:
    "Moving goods from a Singapore factory to a port FTZ is a domestic transfer. But once goods leave the FTZ to be loaded onto a vessel heading overseas, an export (OUT) permit is required.",
};
