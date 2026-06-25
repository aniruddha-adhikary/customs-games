import type { ComponentType } from "react";
import type { MessageType } from "../../data/case014";

export type FieldStatus = "R" | "O" | "H";

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: "hard" | "soft";
}

export interface ScoringResult {
  total: number;
  max: number;
  details: { field: string; correct: boolean; yours: string; expected: string }[];
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface RulebookEntry {
  title: string;
  content: string;
  extra?: string;
}

export interface PlaceFieldConfig {
  fieldKey: string;
  label: string;
  options: SelectOption[];
  tooltip?: string;
  visibilityFieldId: string;
}

export interface BeatAConfig {
  caseId: string;
  backLink: string;
  headerTitle: string;
  introText: string;
  introSubtext: string;

  validatePermit: (values: Record<string, string>, scaffolding: number) => ValidationError[];
  scorePermit: (values: Record<string, string>) => ScoringResult;
  getFieldStatus: (fieldId: string, messageType: MessageType | "") => FieldStatus;

  CaseFilePanel: ComponentType;

  initialValues: Record<string, string>;
  scoreableFields: string[];
  fieldsToResetOnMsgTypeChange: string[];

  declTypeOptions: Partial<Record<string, SelectOption[]>>;

  agentLabel: string;
  uenField?: { fieldKey: string; label: string; placeholder: string; tooltip: string; visibilityFieldId: string };
  showImporterOnExport?: { fieldKey: string; label: string; placeholder: string; tooltip: string };
  consigneeLabel: string;
  consigneePlaceholder: string;
  supplierLabel: string;
  supplierPlaceholder: string;

  placeSectionTitle: string;
  placeFields: PlaceFieldConfig[];

  hsCodePlaceholder: string;
  hsCodeTooltip: string;
  hsQuantityPlaceholder: string;
  hsQuantityTooltip: string;
  hsUnitOptions: SelectOption[];

  packingOuterPlaceholder: string;
  packingOuterUnitOptions: SelectOption[];
  packingInnerPlaceholder: string;
  packingInnerTooltip: string;
  packingInnerUnitOptions: SelectOption[];

  cargoPackingOptions: SelectOption[];
  transportTooltip: string;

  currencyOptions: SelectOption[];
  valueSectionFields: {
    valueFieldKey: string;
    valueLabel: string;
    valuePlaceholder: string;
    valueTooltip: string;
    freightLabel: string;
    freightPlaceholder: string;
    insuranceLabel: string;
    insurancePlaceholder: string;
  };

  grossWeightPlaceholder: string;
  grossWeightTooltip: string;
  grossWeightUnitOptions: SelectOption[];

  paymentOptions: SelectOption[];
  paymentTooltip: string;

  messageTypeTooltip: string;
  declarationTypeTooltip: string;

  rulebookTitle: string;
  rulebookEntries: RulebookEntry[];
}
