import type { MessageType } from "../../data/case014";

export interface MapNode {
  label: string;
  sub: string;
  icon: string;
}

export interface Gate3Option {
  value: string;
  label: string;
}

export interface CaseCardField {
  label: string;
  value: string;
  colorClass?: string;
}

export interface LegSummary {
  label: string;
  result: string;
}

export interface TshipSubtype {
  label: string;
  tooltip: string;
}

export interface BeatBConfig {
  caseId: string;
  caseTitle: string;
  backLink: string;

  mapNodes: [MapNode, MapNode, MapNode, MapNode];
  legTransportIcons: [string, string, string];

  correctMessageType: MessageType;
  wrongFeedback: Record<string, { color: string; message: string }>;
  errorTagPrefix: string;

  tshipSubtypes?: TshipSubtype[];

  introIcon: string;
  introDescription: string;

  leg1AnimatingText: string;
  leg1ScaffoldingHint: string;

  gate2Header: string;
  gate2Description: string;

  gate2CorrectText: string;
  gate2MovingText: string;

  gate3Header: string;
  gate3Description: string;
  gate3Options: [Gate3Option, Gate3Option];
  gate3CorrectValue: string;
  gate3WrongFeedback: string;
  gate3WrongButtonText: string;

  gate3CorrectText: string;
  gate3CorrectSubtext: string;

  leg3AnimatingIcon: string;
  leg3AnimatingText: string;

  completionTitle: string;
  legSummaries: [LegSummary, LegSummary, LegSummary];

  caseCardLabel: string;
  caseCardFields: CaseCardField[];

  rulebookContent: "standard" | "transhipment";
  rulebookKeyPrinciple: string;
}
