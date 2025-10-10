import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import YoloTest from "./pages/YoloTest";
import SharePage from "./pages/SharePage";

function App() {
  return (
    <Router>
      <nav style={{ textAlign: "center", marginTop: "20px" }}>
        <Link to="/" style={{ margin: "0 10px" }}>
          Home
        </Link>
        <Link to="/yolo" style={{ margin: "0 10px" }}>
          YOLO Test
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/yolo" element={<YoloTest />} />
        <Route path="share/:id" element={<SharePage />} />
      </Routes>
    </Router>
  );
}

export default App;
