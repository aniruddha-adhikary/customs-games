import { useState, useCallback } from "react";

export function CopyableValue({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }, [value]);

  return (
    <span
      onClick={handleCopy}
      className={`cursor-pointer relative inline-flex items-center gap-1 group ${className}`}
      title="Click to copy"
    >
      <span className="group-hover:text-customs-gold transition-colors">{value}</span>
      <span className="opacity-0 group-hover:opacity-60 text-[9px] transition-opacity select-none">
        {copied ? "\u2705" : "\u{1F4CB}"}
      </span>
      {copied && (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-customs-green bg-customs-surface px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap animate-fade-in">
          Copied!
        </span>
      )}
    </span>
  );
}

export function DocumentHeader({ title, subtitle, documentNo }: { title: string; subtitle?: string; documentNo?: string }) {
  return (
    <div className="text-center pb-3 mb-3 border-b-2 border-double border-customs-border/60">
      <h2 className="font-document text-sm font-bold text-white tracking-wide uppercase">
        {title}
      </h2>
      {subtitle && (
        <p className="font-document text-[10px] text-customs-muted italic mt-0.5">{subtitle}</p>
      )}
      {documentNo && (
        <p className="font-mono text-[10px] text-customs-gold mt-1">
          <CopyableValue value={documentNo} className="text-customs-gold" />
        </p>
      )}
    </div>
  );
}

export function DocumentField({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className={`flex justify-between items-baseline py-1 px-2 rounded ${highlight ? "bg-customs-gold/5 border border-customs-gold/20" : ""}`}>
      <span className="text-[10px] text-customs-muted font-sans uppercase tracking-wider shrink-0 mr-2">
        {label}
      </span>
      <CopyableValue
        value={value}
        className={`text-[11px] text-right ${highlight ? "text-customs-gold font-semibold" : "text-white"} ${mono ? "font-mono" : "font-sans"}`}
      />
    </div>
  );
}

export function DocumentSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      {title && (
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-px flex-1 bg-customs-border/50" />
          <span className="text-[9px] font-sans font-semibold text-customs-muted uppercase tracking-widest">
            {title}
          </span>
          <div className="h-px flex-1 bg-customs-border/50" />
        </div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function DocumentParty({ role, name, address, id, idLabel }: { role: string; name: string; address: string; id?: string; idLabel?: string }) {
  return (
    <div className="py-2 px-2 border-l-2 border-customs-gold/30 mb-2">
      <p className="text-[9px] text-customs-muted font-sans uppercase tracking-widest mb-0.5">{role}</p>
      <p className="text-[12px] text-white font-sans font-semibold">
        <CopyableValue value={name} className="text-white font-semibold" />
      </p>
      <p className="text-[10px] text-customs-muted font-sans mt-0.5">{address}</p>
      {id && (
        <p className="text-[10px] mt-0.5">
          <span className="text-customs-muted font-sans">{idLabel || "ID"}: </span>
          <CopyableValue value={id} className="text-customs-gold font-mono text-[10px]" />
        </p>
      )}
    </div>
  );
}

export function DocumentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#1c2635] border border-customs-border/40 rounded-lg p-4 shadow-inner relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,255,255,0.05) 24px)" }}
      />
      <div className="relative">
        {children}
      </div>
    </div>
  );
}
