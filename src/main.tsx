import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { Landing } from "./Landing";
import { BeatB } from "./beats/beat-b/BeatB";
import { BeatA } from "./beats/beat-a/BeatA";
import { BeatC } from "./beats/beat-c/BeatC";
import { BeatA052 } from "./beats/beat-a/BeatA052";
import { BeatB052 } from "./beats/beat-b/BeatB052";
import { BeatC052 } from "./beats/beat-c/BeatC052";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/beat-b" element={<BeatB />} />
        <Route path="/beat-a" element={<BeatA />} />
        <Route path="/beat-c" element={<BeatC />} />
        <Route path="/case-052/beat-a" element={<BeatA052 />} />
        <Route path="/case-052/beat-b" element={<BeatB052 />} />
        <Route path="/case-052/beat-c" element={<BeatC052 />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
