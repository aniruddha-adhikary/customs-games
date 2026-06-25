import { useState } from "react";
import { CASE_014 } from "../../data/case014";
import {
  CopyableValue,
  DocumentHeader,
  DocumentField,
  DocumentSection,
  DocumentParty,
  DocumentWrapper,
} from "./DocumentStyles";

type Tab = "invoice" | "packing" | "bl";

export function CaseFilePanel() {
  const [tab, setTab] = useState<Tab>("invoice");
  const inv = CASE_014.invoice;
  const pl = CASE_014.packingList;
  const bl = CASE_014.billOfLading;

  return (
    <div className="bg-customs-panel border border-customs-border rounded-xl overflow-hidden h-full flex flex-col">
      <div className="bg-customs-surface px-3 py-2 flex items-center gap-2 border-b border-customs-border flex-shrink-0">
        <span className="text-xs text-customs-gold font-bold uppercase tracking-wider font-sans">
          Case File #014
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
              subtitle="Wine Import — Bordeaux AOC"
              documentNo={inv.invoiceNo}
            />

            <DocumentParty
              role="Seller"
              name={inv.seller}
              address={inv.sellerAddress}
              id={inv.sellerVAT}
              idLabel="VAT/EORI"
            />
            <DocumentParty
              role="Buyer"
              name={inv.buyer}
              address={inv.buyerAddress}
              id={inv.buyerUEN}
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
                          <CopyableValue value={`EUR ${l.unitPrice.toFixed(2)}`} className="text-white font-mono text-[10px]" />
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
              <DocumentField label="FOB Value (Le Havre)" value={`EUR ${inv.fobValue.toLocaleString()}.00`} mono />
              <DocumentField label="Ocean Freight" value={`EUR ${inv.oceanFreight.toLocaleString()}.00`} mono />
              <DocumentField label="Marine Insurance" value={`EUR ${inv.marineInsurance}.00`} mono />
              <div className="h-px bg-customs-border/30 my-1" />
              <DocumentField label="CIF Value (Singapore)" value={`EUR ${inv.cifValue.toLocaleString()}.00`} highlight mono />
              <DocumentField label="Exchange Rate" value={`EUR 1 = SGD ${inv.exchangeRate}`} mono />
              <DocumentField label="CIF Value in SGD" value={`SGD ${inv.cifValueSGD.toLocaleString()}`} highlight mono />
            </DocumentSection>

            <DocumentSection title="Shipment Details">
              <DocumentField label="Country of Origin" value={inv.countryOfOrigin} />
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
              subtitle="Chateau Merlande Grand Cru 2021"
            />

            <DocumentSection title="Packaging Details">
              <DocumentField label="Outer Packaging" value={pl.outerPack} highlight mono />
              <DocumentField label="Inner Packaging" value={pl.innerPack} mono />
              <DocumentField label="Total Quantity" value={pl.totalBottles} highlight mono />
            </DocumentSection>

            <div className="mt-3 p-2 bg-customs-gold/5 border border-customs-gold/20 rounded text-[10px] text-customs-muted font-sans italic">
              For dutiable liquor, packing must be declared to the smallest unit (bottle level).
            </div>
          </DocumentWrapper>
        )}

        {tab === "bl" && (
          <DocumentWrapper>
            <DocumentHeader
              title="Bill of Lading"
              subtitle="Ocean Transport — Le Havre to Singapore"
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
