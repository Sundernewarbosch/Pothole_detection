import { useRef, useEffect, useState } from "react";
import "./YoloTest.css";
import { API_BASE_URL, BASE_URL } from "../config";

function YoloTest() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [location, setLocation] = useState(null);
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showShare, setShowShare] = useState(false);

  // Run once during app load
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("device_id", deviceId);
  }

  const showToast = (message, duration = 2000) => {
    setToast(message);
    setTimeout(() => setToast(""), duration); // auto-hide after `duration` ms
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function setupCamera() {
      try {
        const video = videoRef.current;
        if (video.srcObject) {
          video.srcObject.getTracks().forEach((track) => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        });
        video.srcObject = stream;
        await new Promise((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
        video.muted = true;
        await video.play();
      } catch (err) {
        console.error("Camera error:", err.name, err.message);
      }
    }

    setupCamera();
  }, []);

  useEffect(() => {
    async function fetchLocation() {
      if (!("geolocation" in navigator)) {
        setError("Geolocation is not supported by your browser.");
        return;
      }

      try {
        const getPosition = () =>
          new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });

        const position = await getPosition();
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });

        // Fetch city name using reverse geocoding (OpenStreetMap API)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        const cityName =
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.county ||
          "Unknown location";
        setCity(cityName);
      } catch (err) {
        setError("Permission denied or unable to fetch location.");
      }
    }

    fetchLocation();
  }, []);

  const captureAndDetect = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!video || !canvas) return;

    // Capture frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (location) {
      const ctx = canvas.getContext("2d");
      const locationText = `${city}\nLat: ${location.latitude.toFixed(
        5
      )}, Lng: ${location.longitude.toFixed(5)}`;
      const lines = locationText.split("\n");

      // Calculate box height
      const lineHeight = 20;
      const padding = 8;
      const boxHeight = lines.length * lineHeight + padding * 2;
      const boxWidth = 250;

      // Draw translucent black rectangle
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // semi-transparent black
      ctx.fillRect(10, 10, boxWidth, boxHeight);

      // Draw white text
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      lines.forEach((line, i) => {
        ctx.fillText(
          line,
          10 + padding,
          10 + padding + (i + 1) * lineHeight - 5
        );
      });
    }

    setStreaming(false);

    const frame = canvas.toDataURL("image/jpeg");

    try {
      // 🔹 Send image + location + city to backend
      const res = await fetch(`${API_BASE_URL}/detect/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frame,
          latitude: location?.latitude,
          longitude: location?.longitude,
          city: city,
          deviceId: deviceId,
        }),
      });

      const data = await res.json();
      console.log("Server response:", data);

      if (!Array.isArray(data.detections) || data.detections.length === 0) {
        showToast(data.message || "No pothole detected.");
      } else {
        setShowShare(true);
        data.detections.forEach((d) => {
          const [x1, y1, x2, y2] = d.bbox;
          ctx.strokeStyle = "red";
          ctx.lineWidth = 3;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

          ctx.fillStyle = "red";
          ctx.font = `${Math.max(14, canvas.width / 50)}px Arial`;
          const text = `${d.class} (${(d.confidence * 100).toFixed(1)}%)`;
          ctx.fillText(text, x1, y1 > 20 ? y1 - 5 : y1 + 20);
        });
        showToast("Pothole detected and saved!");
      }
    } catch (err) {
      console.error("Backend error:", err);
      showToast("Error during detection. Check console for details.");
    }
  };

  const resetCamera = () => {
    setStreaming(true);
    setShowShare(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const shareDetection = async () => {
    try {
      // 🔹 Send image + location + city to backend
      const res = await fetch(`${API_BASE_URL}/latest/${deviceId}/`);
      if (!res.ok) throw new Error("Failed to fetch latest pothole");

      const data = await res.json();
      const potholeId = data.id;
      const shareUrl = BASE_URL + `/share/${potholeId}`;
      const shareText = `Look what I spotted on the road! 🕵️‍♂️ A pothole in ${data.city}. Let’s keep our streets safe—see it here: ${shareUrl}`;

      // Check if the browser supports Web Share API
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Pothole Detection",
            text: shareText,
          });
          console.log("Share successful!");
        } catch (err) {
          console.error("Share failed:", err);
        }
      } else {
        // Fallback: copy link to clipboard
        try {
          await navigator.clipboard.writeText(shareText);
          alert("Share URL copied to clipboard: " + shareText);
        } catch (err) {
          console.error("Failed to copy share URL:", err);
        }
      }
    } catch (err) {
      console.error("Backend error:", err);
    }
  };

  return (
    <div className="yolo-container">
      <h1>Pothole Detection</h1>

      <div className="yolo-wrapper">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="yolo-video"
          style={{ display: streaming ? "block" : "none" }}
        />
        <canvas
          ref={canvasRef}
          className="yolo-canvas"
          style={{ display: streaming ? "none" : "block" }}
        />

        {/* 🔹 Share button overlay */}
        {showShare && (
          <button onClick={shareDetection} className="share-button">
            <img
              src="/share.png"
              alt="Share"
              style={{ width: "24px", height: "24px" }}
            />
          </button>
        )}
      </div>

      {/* 🔹 Capture / Resume button below the canvas */}
      <button
        onClick={streaming ? captureAndDetect : resetCamera}
        className="yolo-button"
      >
        {streaming ? "Capture Image" : "Resume Camera"}
      </button>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default YoloTest;
