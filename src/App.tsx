import React from "react";
import { Route, Routes } from "react-router-dom";
import "./assets/css/style.scss";
import Home from "./components/home/Home";
import Monopoly from "./components/monopoly/monopoly";
import NotFound from "./components/not_found/NotFound";

function App() {
  return (
      <div className="App">
        <Routes >
          <Route path="/monopoly" element={<Monopoly />} />
          <Route path="/" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
  );
}

export default App;
