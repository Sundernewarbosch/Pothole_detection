import { Link, useLocation } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">PotholeVision</div>
        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            Home
          </Link>
          <Link
            to="/potholevision"
            className={`nav-link ${
              location.pathname === "/potholevision" ? "active" : ""
            }`}
          >
            Detect Potholes
          </Link>
          <Link
            to="/heatmap"
            className={`nav-link ${
              location.pathname === "/heatmap" ? "active" : ""
            }`}
          >
            Heatmap
          </Link>
          <Link
            to="/leaderboard"
            className={`nav-link ${
              location.pathname === "/leaderboard" ? "active" : ""
            }`}
          >
            Leaderboard
          </Link>
        </div>
      </div>
    </nav>
  );
}
