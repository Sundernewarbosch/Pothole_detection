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
          video.srcObject.getTracks().forEach(track => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await new Promise(resolve => {
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setStreaming(false);

    const frame = canvas.toDataURL("image/jpeg");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/detect/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frame })
      });
      const data = await res.json();
      console.log("Detections:", data);

      if (data.detections) {
        data.detections.forEach(d => {
          const [x1, y1, x2, y2] = d.bbox;
          ctx.strokeStyle = "red";
          ctx.lineWidth = 3;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

          ctx.fillStyle = "red";
          ctx.font = `${Math.max(14, canvas.width / 50)}px Arial`;
          const text = `${d.class} (${(d.confidence * 100).toFixed(1)}%)`;
          ctx.fillText(text, x1, y1 > 20 ? y1 - 5 : y1 + 20);
        });
      }
    } catch (err) {
      console.error("Backend error:", err);
    }
  };

  const resetCamera = () => {
    setStreaming(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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

        {/* 🔹 Overlay location info */}
        <div className="location-overlay">
          {error && <p className="error-text">{error}</p>}
          {location ? (
            <>
              <p>
                <strong>{city}</strong>
              </p>
              <p>
                Lat: {location.latitude.toFixed(5)} <br />
                Lng: {location.longitude.toFixed(5)}
              </p>
            </>
          ) : (
            !error && <p>Requesting location...</p>
          )}
        </div>
      </div>

      <button
        onClick={streaming ? captureAndDetect : resetCamera}
        className="yolo-button"
      >
        {streaming ? "Capture Image" : "Resume Camera"}
      </button>
    </div>

  );
}

export default YoloTest;
