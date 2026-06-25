import { useState } from "react";
import { CASE_038 } from "../../data/case038";
import {
  CopyableValue,
  DocumentHeader,
  DocumentField,
  DocumentSection,
  DocumentParty,
  DocumentWrapper,
} from "./DocumentStyles";

type Tab = "invoice" | "packing" | "bl";

export function CaseFilePanel038() {
  const [tab, setTab] = useState<Tab>("invoice");
  const inv = CASE_038.invoice;
  const pl = CASE_038.packingList;
  const bl = CASE_038.billOfLading;

  return (
    <div className="bg-customs-panel border border-customs-border rounded-xl overflow-hidden h-full flex flex-col">
      <div className="bg-customs-surface px-3 py-2 flex items-center gap-2 border-b border-customs-border flex-shrink-0">
        <span className="text-xs text-customs-gold font-bold uppercase tracking-wider font-sans">
          Case File #038 — Transhipment
        </span>
        <span className="text-[9px] text-customs-muted font-sans ml-auto">Click any value to copy</span>
      </div>

      <div className="flex border-b border-customs-border flex-shrink-0">
        {(
          [
            ["invoice", "Invoice"],
            ["packing", "Packing List"],
            ["bl", "Bill of Lading"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-xs font-medium border-b-2 cursor-pointer bg-transparent font-sans ${
              tab === key
                ? "border-customs-gold text-customs-gold"
                : "border-transparent text-customs-muted hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {tab === "invoice" && (
          <DocumentWrapper>
            <DocumentHeader
              title="Commercial Invoice"
              subtitle="Transhipment — OLED Panels (Korea to Indonesia via SG)"
              documentNo={inv.invoiceNo}
            />

            <DocumentParty
              role="Seller"
              name={inv.seller}
              address={inv.sellerAddress}
              id={inv.sellerBRN}
              idLabel="BRN"
            />
            <DocumentParty
              role="Buyer (Final)"
              name={inv.buyer}
              address={inv.buyerAddress}
            />
            <DocumentParty
              role="Through Agent (SG)"
              name={inv.throughAgent}
              address={inv.throughAgentAddress}
              id={inv.throughAgentUEN}
              idLabel="UEN"
            />

            <DocumentSection title="References">
              <DocumentField label="Invoice No." value={inv.invoiceNo} mono />
              <DocumentField label="Date" value={inv.invoiceDate} />
              <DocumentField label="B/L No." value={inv.blNo} mono />
              <DocumentField label="Incoterm" value={inv.incoterm} highlight />
            </DocumentSection>

            <DocumentSection title="Line Items">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-sans">
                  <thead>
                    <tr className="border-b border-customs-border/50">
                      <th className="text-left py-1.5 text-customs-muted font-medium uppercase text-[9px] tracking-wider">Description</th>
                      <th className="text-right py-1.5 text-customs-muted font-medium uppercase text-[9px] tracking-wider">Qty</th>
                      <th className="text-right py-1.5 text-customs-muted font-medium uppercase text-[9px] tracking-wider">Unit (KRW)</th>
                      <th className="text-right py-1.5 text-customs-muted font-medium uppercase text-[9px] tracking-wider">Total (KRW)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.lines.map((l, i) => (
                      <tr key={i} className="border-b border-customs-border/20">
                        <td className="py-2 pr-2 max-w-[160px] text-white font-sans text-[10px] leading-tight">
                          {l.description}
                        </td>
                        <td className="text-right py-2 font-mono text-white">
                          <CopyableValue value={l.qty.toLocaleString()} className="text-white font-mono text-[10px]" />
                        </td>
                        <td className="text-right py-2 font-mono text-white">
                          <CopyableValue value={l.unitPrice.toLocaleString()} className="text-white font-mono text-[10px]" />
                        </td>
                        <td className="text-right py-2 font-mono text-white">
                          <CopyableValue value={l.lineTotal.toLocaleString()} className="text-white font-mono text-[10px]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DocumentSection>

            <DocumentSection title="Valuation">
              <DocumentField label="FOB Value (Busan)" value={`KRW ${inv.fobValue.toLocaleString()}`} mono />
              <DocumentField label="Ocean Freight" value={`KRW ${inv.oceanFreight.toLocaleString()}`} mono />
              <DocumentField label="Marine Insurance" value={`KRW ${inv.marineInsurance.toLocaleString()}`} mono />
              <div className="h-px bg-customs-border/30 my-1" />
              <DocumentField label="CIF Value (Singapore)" value={`KRW ${inv.cifValue.toLocaleString()}`} highlight mono />
              <DocumentField label="Exchange Rate" value={`KRW 1 = SGD ${inv.exchangeRate}`} mono />
              <DocumentField label="CIF Value in SGD" value={`SGD ${inv.cifValueSGD.toLocaleString()}`} highlight mono />
            </DocumentSection>

            <DocumentSection title="Shipment Details">
              <DocumentField label="Country of Origin" value={inv.countryOfOrigin} />
              <DocumentField label="Gross Weight" value={inv.totalGrossWeight} />
              <DocumentField label="Net Weight" value={inv.totalNetWeight} />
              <DocumentField label="Total Packages" value={inv.totalPackages} />
            </DocumentSection>

            <div className="mt-2 p-2 bg-customs-amber/10 border border-customs-amber/30 rounded">
              <DocumentField label="Onward Destination" value={inv.portOnward} highlight />
            </div>
          </DocumentWrapper>
        )}

        {tab === "packing" && (
          <DocumentWrapper>
            <DocumentHeader
              title="Packing List"
              subtitle="Samsung OLED Display Panels"
            />

            <DocumentSection title="Packaging Details">
              <DocumentField label="Outer Packaging" value={pl.outerPack} highlight mono />
              <DocumentField label="Inner Packaging" value={pl.innerPack} mono />
              <DocumentField label="Total Quantity" value={pl.totalPanels} highlight mono />
            </DocumentSection>

            <div className="mt-3 p-2 bg-customs-gold/5 border border-customs-gold/20 rounded text-[10px] text-customs-muted font-sans italic">
              Electronics packed in crates. Non-dutiable goods.
            </div>
          </DocumentWrapper>
        )}

        {tab === "bl" && (
          <DocumentWrapper>
            <DocumentHeader
              title="Bill of Lading"
              subtitle="Ocean Transport — Busan to Singapore (Transhipment)"
              documentNo={bl.blNo}
            />

            <DocumentSection title="Inward Vessel">
              <DocumentField label="Vessel" value={bl.vesselInward} />
              <DocumentField label="Voyage" value={bl.voyageInward} mono />
            </DocumentSection>

            <DocumentSection title="Route">
              <DocumentField label="Port of Loading" value={bl.portOfLoading} />
              <DocumentField label="Port of Discharge" value={bl.portOfDischarge} />
            </DocumentSection>

            <div className="my-2 p-2 bg-customs-amber/10 border border-customs-amber/30 rounded">
              <p className="text-[9px] text-customs-amber font-sans font-semibold uppercase tracking-widest mb-1">Onward Routing</p>
              <DocumentField label="Onward Vessel" value={bl.vesselOnward} />
              <DocumentField label="Onward Port" value={bl.portOnward} highlight />
            </div>

            <DocumentSection title="Cargo Details">
              <DocumentField label="Transport Mode" value={bl.mode} highlight />
              <DocumentField label="B/L Number" value={bl.blNo} mono highlight />
              <DocumentField label="Container No." value={bl.containerNo} mono />
              <DocumentField label="Container Type" value={bl.containerType} />
              <DocumentField label="Gross Weight" value={bl.grossWeight} highlight mono />
            </DocumentSection>
          </DocumentWrapper>
        )}
      </div>
    </div>
  );
}
