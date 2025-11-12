import React from "react";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-container">
      <div>
        <h1>Welcome to Pothole Detection Web App </h1>
        <p>
          A smart, community-driven tool that helps detect and report road
          potholes using AI and geolocation — making roads safer for everyone.
        </p>

        <h2>Key Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>Detect Potholes</h3>
            <p>
              Upload or capture road images to identify potholes automatically.
            </p>
          </div>
          <div className="feature-card">
            <h3>Track Reports</h3>
            <p>View heatmaps of reported potholes in your area.</p>
          </div>
          <div className="feature-card">
            <h3>Leaderboard</h3>
            <p>Earn points for every report and climb the ranks!</p>
          </div>
        </div>

        <div className="goal-section">
          <h2>Our Goal</h2>
          <p>
            To make roads safer through AI-powered detection and community
            reporting. Together, we can help authorities identify and repair
            potholes faster.
          </p>
        </div>

        <h2>How to Use</h2>
        <ol>
          <li>Click “Detect Potholes” in the navigation bar.</li>
          <li>Upload or capture a road image.</li>
          <li>Wait for AI detection and see highlighted potholes.</li>
          <li>Submit or share your report to help others.</li>
          <li>Track your rank on the leaderboard!</li>
        </ol>

        <button onClick={() => (window.location.href = "/potholevision")}>
          Start Detecting Potholes
        </button>

        <p className="footer-text">
          Together, let’s make our roads safer and smoother for everyone.
        </p>
      </div>
    </div>
  );
}
