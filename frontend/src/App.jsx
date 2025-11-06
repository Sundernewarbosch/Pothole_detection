import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import YoloTest from "./pages/YoloTest";
import SharePage from "./pages/SharePage";
import HeatMapView from "./pages/HeatMapView";
import Leaderboard from "./pages/Leaderboard";

function App() {
  return (
    <Router>
      <NavBar /> {/* ✅ useLocation is now safe inside NavBar */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/potholevision" element={<YoloTest />} />
        <Route path="/heatmap" element={<HeatMapView />} />
        <Route path="/share/:id" element={<SharePage />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </Router>
  );
}

export default App;
