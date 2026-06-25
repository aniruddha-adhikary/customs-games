import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { Landing } from "./Landing";
import { BeatB } from "./beats/beat-b/BeatB";
import { BeatA } from "./beats/beat-a/BeatA";
import { BeatC } from "./beats/beat-c/BeatC";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/beat-b" element={<BeatB />} />
        <Route path="/beat-a" element={<BeatA />} />
        <Route path="/beat-c" element={<BeatC />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
