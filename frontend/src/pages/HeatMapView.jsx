import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import { API_BASE_URL } from "../config";
import { useLocation } from "react-router-dom";

export default function HeatMapView() {
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const sharedLat = params.get("lat");
  const sharedLng = params.get("lng");
  const sharedLocation =
    sharedLat && sharedLng
      ? [parseFloat(sharedLat), parseFloat(sharedLng)]
      : null;

  // Step 1: Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("User location:", latitude, longitude);
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to access your location. Enable GPS and refresh.");
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      alert("Your browser does not support location.");
    }
  }, []);

  // Step 2: Initialize map + load data
  useEffect(() => {
    const initialCenter = sharedLocation || userLocation;
    if (!initialCenter) return;

    const zoomLevel = sharedLocation ? 17 : 13; // zoom more for a specific pothole

    if (!mapRef.current) {
      mapRef.current = L.map("heatmap").setView(initialCenter, zoomLevel);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapRef.current);

      // Marker for shared coordinate
      if (sharedLocation) {
        L.marker(sharedLocation)
          .addTo(mapRef.current)
          .bindPopup("Reported pothole here!")
          .openPopup();
      }
    } else {
      // If userLocation not ready OR we are viewing a shared location, do nothing
      if (sharedLocation) return;

      // Only move map when userLocation updates normally
      if (userLocation) {
        mapRef.current.setView(userLocation, zoomLevel);
      }
    }

    // Fetch pothole data from backend
    fetch(`${API_BASE_URL}/potholes/`)
      .then((res) => res.json())
      .then((data) => {
        const heatData = data
          .filter(
            (d) =>
              d.latitude !== null &&
              d.longitude !== null &&
              !isNaN(d.latitude) &&
              !isNaN(d.longitude)
          )
          .map((d) => [parseFloat(d.latitude), parseFloat(d.longitude)]);

        if (heatLayerRef.current) {
          mapRef.current.removeLayer(heatLayerRef.current);
        }

        heatLayerRef.current = L.heatLayer(heatData, { radius: 25 }).addTo(
          mapRef.current
        );
      })
      .catch((err) => console.error("API error:", err));
  }, [userLocation]);

  return (
    <div
      id="heatmap"
      style={{
        height: "700px",
        width: "90%",
        backgroundColor: "#fafafa",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e0e0e0",
        overflow: "hidden",
        position: "relative",
        margin: "10px auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "24px",
          fontWeight: "600",
          fontSize: "1.1rem",
          color: "#333",
          zIndex: 1000,
        }}
      >
        Heatmap Visualization
      </div>
    </div>
  );
}
