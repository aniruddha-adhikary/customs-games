import { useState } from "react";
import { CASE_014 } from "../../data/case014";

type Tab = "invoice" | "packing" | "bl";

export function CaseFilePanel() {
  const [tab, setTab] = useState<Tab>("invoice");
  const inv = CASE_014.invoice;
  const pl = CASE_014.packingList;
  const bl = CASE_014.billOfLading;

  return (
    <div className="bg-customs-panel border border-customs-border rounded-xl overflow-hidden h-full flex flex-col">
      <div className="bg-customs-surface px-3 py-2 flex items-center gap-2 border-b border-customs-border flex-shrink-0">
        <span className="text-xs text-customs-gold font-bold uppercase tracking-wider">
          Case File #014
        </span>
      </div>

      {/* Tabs */}
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
            className={`flex-1 py-2 text-xs font-medium border-b-2 cursor-pointer bg-transparent ${
              tab === key
                ? "border-customs-gold text-customs-gold"
                : "border-transparent text-customs-muted hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 text-xs font-mono">
        {tab === "invoice" && (
          <div className="space-y-2 text-customs-muted">
            <div className="border border-customs-border rounded p-2">
              <p className="text-customs-gold font-bold text-center mb-2">
                COMMERCIAL INVOICE
              </p>
              <div className="space-y-1">
                <p>
                  <span className="text-customs-muted">Seller:</span>{" "}
                  <span className="text-white">{inv.seller}</span>
                </p>
                <p className="text-[10px]">{inv.sellerAddress}</p>
                <p className="text-[10px]">VAT/EORI: {inv.sellerVAT}</p>
                <hr className="border-customs-border my-1" />
                <p>
                  <span className="text-customs-muted">Buyer:</span>{" "}
                  <span className="text-white">{inv.buyer}</span>
                </p>
                <p className="text-[10px]">{inv.buyerAddress}</p>
                <p className="text-[10px]">UEN: {inv.buyerUEN}</p>
                <hr className="border-customs-border my-1" />
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <p>Invoice No.: {inv.invoiceNo}</p>
                  <p>Date: {inv.invoiceDate}</p>
                  <p>B/L No.: {inv.blNo}</p>
                  <p>INCOTERM: {inv.incoterm}</p>
                </div>
              </div>
            </div>

            <div className="border border-customs-border rounded p-2">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-customs-gold">
                    <th className="text-left">Description</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.lines.map((l, i) => (
                    <tr key={i} className="text-white">
                      <td className="py-1 pr-2 max-w-[140px] break-words">
                        {l.description}
                      </td>
                      <td className="text-right">{l.qty.toLocaleString()}</td>
                      <td className="text-right">EUR {l.unitPrice.toFixed(2)}</td>
                      <td className="text-right">
                        EUR {l.lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-customs-border rounded p-2 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>FOB Value (Le Havre)</span>
                <span className="text-white">EUR {inv.fobValue.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between">
                <span>Ocean Freight (Le Havre &rarr; SGP)</span>
                <span className="text-white">EUR {inv.oceanFreight.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between">
                <span>Marine Insurance Premium</span>
                <span className="text-white">EUR {inv.marineInsurance}.00</span>
              </div>
              <hr className="border-customs-border" />
              <div className="flex justify-between font-bold">
                <span className="text-customs-gold">CIF Value (Singapore)</span>
                <span className="text-white">EUR {inv.cifValue.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span>Exchange Rate</span>
                <span className="text-white">EUR 1 = SGD {inv.exchangeRate}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-customs-gold">CIF Value in SGD</span>
                <span className="text-white">SGD {inv.cifValueSGD.toLocaleString()}</span>
              </div>
              <hr className="border-customs-border" />
              <p>Country of Origin: {inv.countryOfOrigin}</p>
              <p>Total Gross Weight: {inv.totalGrossWeight}</p>
              <p>Total Net Weight: {inv.totalNetWeight}</p>
              <p>Total Packages: {inv.totalPackages}</p>
            </div>
          </div>
        )}

        {tab === "packing" && (
          <div className="border border-customs-border rounded p-3 space-y-2">
            <p className="text-customs-gold font-bold text-center mb-2">
              PACKING LIST
            </p>
            <p className="text-white">{pl.outerPack}</p>
            <p className="text-white">{pl.innerPack}</p>
            <p className="text-white">= {pl.totalBottles}</p>
          </div>
        )}

        {tab === "bl" && (
          <div className="border border-customs-border rounded p-3 space-y-2">
            <p className="text-customs-gold font-bold text-center mb-2">
              BILL OF LADING
            </p>
            <div className="space-y-1">
              <p>
                <span className="text-customs-muted">Vessel:</span>{" "}
                <span className="text-white">{bl.vessel}</span>
              </p>
              <p>
                <span className="text-customs-muted">Voyage:</span>{" "}
                <span className="text-white">{bl.voyage}</span>
              </p>
              <p>
                <span className="text-customs-muted">Port of Loading:</span>{" "}
                <span className="text-white">{bl.portOfLoading}</span>
              </p>
              <p>
                <span className="text-customs-muted">Port of Discharge:</span>{" "}
                <span className="text-white">{bl.portOfDischarge}</span>
              </p>
              <p>
                <span className="text-customs-muted">Mode:</span>{" "}
                <span className="text-white">{bl.mode}</span>
              </p>
              <p>
                <span className="text-customs-muted">B/L No.:</span>{" "}
                <span className="text-white">{bl.blNo}</span>
              </p>
              <p>
                <span className="text-customs-muted">Container No.:</span>{" "}
                <span className="text-white">{bl.containerNo}</span>
              </p>
              <p>
                <span className="text-customs-muted">Gross Weight:</span>{" "}
                <span className="text-white">{bl.grossWeight}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
