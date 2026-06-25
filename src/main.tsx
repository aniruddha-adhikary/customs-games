import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { Landing } from "./Landing";
import { CaseLanding } from "./CaseLanding";
import { BeatB } from "./beats/beat-b/BeatB";
import { BeatA } from "./beats/beat-a/BeatA";
import { BeatC } from "./beats/beat-c/BeatC";
import { BeatA025 } from "./beats/beat-a/BeatA025";
import { BeatB025 } from "./beats/beat-b/BeatB025";
import { BeatC025 } from "./beats/beat-c/BeatC025";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* Case 014 routes (legacy flat paths kept) */}
        <Route path="/beat-b" element={<BeatB />} />
        <Route path="/beat-a" element={<BeatA />} />
        <Route path="/beat-c" element={<BeatC />} />
        <Route path="/case-014" element={<CaseLanding caseId="014" />} />
        <Route path="/case-014/beat-a" element={<BeatA />} />
        <Route path="/case-014/beat-b" element={<BeatB />} />
        <Route path="/case-014/beat-c" element={<BeatC />} />
        {/* Case 025 routes */}
        <Route path="/case-025" element={<CaseLanding caseId="025" />} />
        <Route path="/case-025/beat-a" element={<BeatA025 />} />
        <Route path="/case-025/beat-b" element={<BeatB025 />} />
        <Route path="/case-025/beat-c" element={<BeatC025 />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
