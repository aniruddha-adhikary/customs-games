import { useState } from "react";
import { CASE_052 } from "../../data/case052";
import {
  CopyableValue,
  DocumentHeader,
  DocumentField,
  DocumentSection,
  DocumentParty,
  DocumentWrapper,
} from "./DocumentStyles";

type Tab = "invoice" | "packing" | "bl";

export function CaseFilePanel052() {
  const [tab, setTab] = useState<Tab>("invoice");
  const inv = CASE_052.invoice;
  const pl = CASE_052.packingList;
  const bl = CASE_052.billOfLading;

  return (
    <div className="bg-customs-panel border border-customs-border rounded-xl overflow-hidden h-full flex flex-col">
      <div className="bg-customs-surface px-3 py-2 flex items-center gap-2 border-b border-customs-border flex-shrink-0">
        <span className="text-xs text-customs-gold font-bold uppercase tracking-wider font-sans">
          Case File #052
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
              title="Commercial Invoice (Export)"
              subtitle="Precision Optics — Singapore to Germany"
              documentNo={inv.invoiceNo}
            />

            <DocumentParty
              role="Seller / Exporter"
              name={inv.seller}
              address={inv.sellerAddress}
              id={inv.sellerUEN}
              idLabel="UEN"
            />
            <DocumentParty
              role="Buyer / Consignee"
              name={inv.buyer}
              address={inv.buyerAddress}
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
                      <th className="text-right py-1.5 text-customs-muted font-medium uppercase text-[9px] tracking-wider">Unit Price</th>
                      <th className="text-right py-1.5 text-customs-muted font-medium uppercase text-[9px] tracking-wider">Total</th>
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
                          <CopyableValue value={`EUR ${l.unitPrice.toLocaleString()}.00`} className="text-white font-mono text-[10px]" />
                        </td>
                        <td className="text-right py-2 font-mono text-white">
                          <CopyableValue value={`EUR ${l.lineTotal.toLocaleString()}`} className="text-white font-mono text-[10px]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DocumentSection>

            <DocumentSection title="Valuation">
              <DocumentField label="FOB Value (Singapore)" value={`EUR ${inv.fobValue.toLocaleString()}.00`} highlight mono />
              <DocumentField label="Freight (buyer's cost)" value={`EUR ${inv.freight.toLocaleString()}.00`} mono />
              <DocumentField label="Insurance (buyer's cost)" value={`EUR ${inv.insurance.toLocaleString()}.00`} mono />
              <div className="h-px bg-customs-border/30 my-1" />
              <DocumentField label="Exchange Rate" value={`EUR 1 = SGD ${inv.exchangeRate}`} mono />
              <DocumentField label="FOB Value in SGD" value={`SGD ${inv.fobValueSGD.toLocaleString()}.00`} highlight mono />
            </DocumentSection>

            <DocumentSection title="Shipment Details">
              <DocumentField label="Country of Destination" value={inv.countryOfDestination} />
              <DocumentField label="Gross Weight" value={inv.totalGrossWeight} />
              <DocumentField label="Net Weight" value={inv.totalNetWeight} />
              <DocumentField label="Total Packages" value={inv.totalPackages} />
            </DocumentSection>
          </DocumentWrapper>
        )}

        {tab === "packing" && (
          <DocumentWrapper>
            <DocumentHeader
              title="Packing List"
              subtitle="Precision Optical Lenses"
            />

            <DocumentSection title="Packaging Details">
              <DocumentField label="Outer Packaging" value={pl.outerPack} highlight mono />
              <DocumentField label="Inner Packaging" value={pl.innerPack} mono />
              <DocumentField label="Total Quantity" value={pl.totalLenses} highlight mono />
            </DocumentSection>

            <div className="mt-3 p-2 bg-customs-gold/5 border border-customs-gold/20 rounded text-[10px] text-customs-muted font-sans italic">
              Each lens individually wrapped in anti-static foam within cases.
            </div>
          </DocumentWrapper>
        )}

        {tab === "bl" && (
          <DocumentWrapper>
            <DocumentHeader
              title="Bill of Lading"
              subtitle="Ocean Transport — Singapore to Hamburg"
              documentNo={bl.blNo}
            />

            <DocumentSection title="Vessel & Voyage">
              <DocumentField label="Vessel" value={bl.vessel} />
              <DocumentField label="Voyage" value={bl.voyage} mono />
            </DocumentSection>

            <DocumentSection title="Route">
              <DocumentField label="Port of Loading" value={bl.portOfLoading} />
              <DocumentField label="Port of Discharge" value={bl.portOfDischarge} />
            </DocumentSection>

            <DocumentSection title="Cargo Details">
              <DocumentField label="Transport Mode" value={bl.mode} highlight />
              <DocumentField label="B/L Number" value={bl.blNo} mono highlight />
              <DocumentField label="Container No." value={bl.containerNo} mono />
              <DocumentField label="Gross Weight" value={bl.grossWeight} highlight mono />
            </DocumentSection>
          </DocumentWrapper>
        )}
      </div>
    </div>
  );
}
