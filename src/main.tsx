import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { ThemeProvider } from "./ThemeContext";
import { ThemeToggle } from "./ThemeToggle";
import { Landing } from "./Landing";
import { BeatB } from "./beats/beat-b/BeatB";
import { BeatA } from "./beats/beat-a/BeatA";
import { BeatC } from "./beats/beat-c/BeatC";
import { BeatA025 } from "./beats/beat-a/BeatA025";
import { BeatB025 } from "./beats/beat-b/BeatB025";
import { BeatC025 } from "./beats/beat-c/BeatC025";
import { BeatA038 } from "./beats/beat-a/BeatA038";
import { BeatB038 } from "./beats/beat-b/BeatB038";
import { BeatC038 } from "./beats/beat-c/BeatC038";
import { BeatA052 } from "./beats/beat-a/BeatA052";
import { BeatB052 } from "./beats/beat-b/BeatB052";
import { BeatC052 } from "./beats/beat-c/BeatC052";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ThemeToggle />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/beat-b" element={<BeatB />} />
          <Route path="/beat-a" element={<BeatA />} />
          <Route path="/beat-c" element={<BeatC />} />
          <Route path="/case-025/beat-a" element={<BeatA025 />} />
          <Route path="/case-025/beat-b" element={<BeatB025 />} />
          <Route path="/case-025/beat-c" element={<BeatC025 />} />
          <Route path="/case-038/beat-a" element={<BeatA038 />} />
          <Route path="/case-038/beat-b" element={<BeatB038 />} />
          <Route path="/case-038/beat-c" element={<BeatC038 />} />
          <Route path="/case-052/beat-a" element={<BeatA052 />} />
          <Route path="/case-052/beat-b" element={<BeatB052 />} />
          <Route path="/case-052/beat-c" element={<BeatC052 />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
