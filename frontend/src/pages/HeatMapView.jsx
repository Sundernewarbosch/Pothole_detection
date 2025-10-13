import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";

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
    fetch("http://127.0.0.1:8000/api/potholes/")
      .then((res) => res.json())
      .then((data) => {
        console.log("pothole data:", data);
        const heatData = data.map((d) => [d.latitude, d.longitude]);

        // If heat layer exists, remove it first
        if (heatLayerRef.current) {
          mapRef.current.removeLayer(heatLayerRef.current);
        }

        // Add new heat layer
        const testData = [
          [19.5331501, 81.26103],
          [19.5231602, 81.2610351],
          [19.5131405, 81.2610253],
          [19.5231557, 81.2610289],
          [19.533148, 81.2710325],
          [19.5231523, 81.2610278],
          [19.5131455, 81.2510342],
          [19.5331571, 81.2650294],
          [19.5431498, 81.251031],
          [19.5531535, 81.2610265],
          [19.533151, 81.2410331],
          [19.5231475, 81.261028],
          [19.513156, 81.2610328],
          [19.5231505, 81.2510292],
          [19.5231542, 81.271027],
          [19.5331487, 81.2610305],
          [19.5331528, 81.2510283],
          [19.533149, 81.2710317],
          [19.5231555, 81.2510268],
          [19.5331509, 81.261032],
        ];

        L.heatLayer(testData, { radius: 50, blur: 30 }).addTo(mapRef.current);

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
        width: "70vw",
      }}
    ></div>
  );
}
