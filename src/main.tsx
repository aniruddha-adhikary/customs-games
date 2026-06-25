import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { Landing } from "./Landing";
import { BeatB } from "./beats/beat-b/BeatB";
import { BeatA } from "./beats/beat-a/BeatA";
import { BeatC } from "./beats/beat-c/BeatC";
import { BeatA038 } from "./beats/beat-a/BeatA038";
import { BeatB038 } from "./beats/beat-b/BeatB038";
import { BeatC038 } from "./beats/beat-c/BeatC038";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/beat-b" element={<BeatB />} />
        <Route path="/beat-a" element={<BeatA />} />
        <Route path="/beat-c" element={<BeatC />} />
        <Route path="/case-038/beat-a" element={<BeatA038 />} />
        <Route path="/case-038/beat-b" element={<BeatB038 />} />
        <Route path="/case-038/beat-c" element={<BeatC038 />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
