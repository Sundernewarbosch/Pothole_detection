import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import { API_BASE_URL, BASE_URL } from "../config";

export default function HeatMapView() {
  const mapRef = useRef(null); // store the map instance
  const heatLayerRef = useRef(null); // store heat layer

  useEffect(() => {
    // Only initialize the map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map("heatmap").setView(
        [20.994817780218884, 78.46284180718987],
        4.5
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapRef.current);
    }

    // Fetch pothole data from backend
    fetch(`${API_BASE_URL}/potholes/`)
      .then((res) => res.json())
      .then((data) => {
        console.log("pothole data:", data);

        // Filter valid coordinates only
        const heatData = data
          .filter(
            (d) =>
              d.latitude !== null &&
              d.longitude !== null &&
              !isNaN(d.latitude) &&
              !isNaN(d.longitude)
          )
          .map((d) => [parseFloat(d.latitude), parseFloat(d.longitude)]);

        console.log("Valid heatmap points:", heatData.length);

        if (heatLayerRef.current) {
          mapRef.current.removeLayer(heatLayerRef.current);
        }

        heatLayerRef.current = L.heatLayer(heatData, { radius: 25 }).addTo(
          mapRef.current
        );
      })
      .catch((err) => console.error("API error:", err));
  }, []); // empty dependency array ensures this runs only once

  return (
    <div
      id="heatmap"
      style={{
        height: "700px",
        width: "100%",
      }}
    ></div>
  );
}
