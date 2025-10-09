import { useRef, useEffect, useState } from "react";
import "./YoloTest.css";

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
          video: true,
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
    setShowShare(true);

    const frame = canvas.toDataURL("image/jpeg");

    try {
      // 🔹 Send image + location + city to backend
      const res = await fetch("http://127.0.0.1:8000/api/detect/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frame,
          latitude: location?.latitude,
          longitude: location?.longitude,
          city: city,
          username: deviceId,
        }),
      });

      const data = await res.json();
      console.log("Server response:", data);

      if (!Array.isArray(data.detections) || data.detections.length === 0) {
        showToast(data.message || "No pothole detected.");
      } else {
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (
        !navigator.canShare ||
        !navigator.canShare({
          files: [new File([blob], "pothole.jpg", { type: blob.type })],
        })
      ) {
        alert("Sharing not supported on this device/browser");
        return;
      }

      const message = prompt(
        "Enter a message to share with your detection:",
        "Check out this pothole I found!"
      );
      const inviteLink = "https://yourapp.com/invite";

      const file = new File([blob], "pothole.jpg", { type: blob.type });

      try {
        await navigator.share({
          files: [file],
          title: "Pothole Detection",
          text: `${message}\nJoin me here: ${inviteLink}`,
        });
        console.log("Shared successfully");
      } catch (err) {
        console.error("Error sharing:", err);
      }
    }, "image/jpeg");
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
