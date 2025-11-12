import { useRef, useEffect, useState } from "react";
import "./YoloTest.css";
import { API_BASE_URL, BASE_URL } from "../config";
import heartAnimation from "../assets/Hearts feedback.json";
import Lottie from "lottie-react";
import doubleTapInstruction from "../assets/Double-tap.json";

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
  const [highlight, setHighlight] = useState(false);
  const [play, setPlay] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  const [detections, setDetections] = useState([]);
  const [heartPos, setHeartPos] = useState(null); // {left, top, size}

  // localStorage.removeItem("seen_double_tap_instruction"); // for testing the instruction animation
  // Run once during app load
  function generateUUID() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    // fallback for older browsers or non-HTTPS
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem("device_id", deviceId);
  }

  const showToast = (message, type = "success", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let stream; // local variable to keep track

    async function setupCamera() {
      try {
        const video = videoRef.current;
        if (!video) return;

        // stop any previous streams
        if (video.srcObject) {
          video.srcObject.getTracks().forEach((track) => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
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
        console.log("Camera started");
      } catch (err) {
        console.error("Camera error:", err.name, err.message);
      }
    }

    setupCamera();

    // ✅ Cleanup: Stop the camera when component unmounts or route changes
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        console.log("Camera stopped (unmount cleanup)");
      }
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video || !video.srcObject) return;

      if (document.hidden) {
        // Pause camera when tab is hidden
        video.srcObject.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
        console.log("Camera stopped due to tab switch");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
  useEffect(() => {
    fetchLocation();
  }, []);

  const captureAndDetect = async () => {
    // 🔹 Show instruction only the first time
    if (!localStorage.getItem("seen_double_tap_instruction")) {
      setShowInstruction(true);
      localStorage.setItem("seen_double_tap_instruction", "true");
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!video || !canvas) return;

    fetchLocation();
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
        showToast("No pothole detected.", "error");
      } else {
        setShowShare(true);
        setDetections(data.detections);
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
        const positiveMessages = [
          "🚀 Great job! You just helped detect a pothole!",
          "👏 Awesome! You're making roads safer!",
          "💪 Thanks for contributing to a safer city!",
          "🌟 Very good! You helped detect a pothole!",
          "🕵️ Nice catch! Pothole recorded successfully!",
        ];

        const randomMessage =
          positiveMessages[Math.floor(Math.random() * positiveMessages.length)];

        showToast(randomMessage);
        // setPlay(true); // trigger heart animation or similar feedback
        setTimeout(() => setPlay(false), 1500);
      }
    } catch (err) {
      console.error("Backend error:", err);
      showToast("Error during detection. Check console for details.", "error");
    }
  };

  const resetCamera = () => {
    setStreaming(true);
    setShowShare(false);
    setShowInstruction(false);
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
      const shareUrl = BASE_URL + `/share/${data.share_uuid}`;
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

  useEffect(() => {
    if (showShare) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showShare]);

  const buttonRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (buttonRef.current) {
        buttonRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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
          onDoubleClick={(event) => {
            if (!detections.length) return;

            const canvas = canvasRef.current;
            const wrapper = canvas.parentElement; // .yolo-wrapper
            const canvasRect = canvas.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();

            // Convert event client coords -> canvas coordinate space
            const canvasX =
              ((event.clientX - canvasRect.left) / canvasRect.width) *
              canvas.width;
            const canvasY =
              ((event.clientY - canvasRect.top) / canvasRect.height) *
              canvas.height;

            // Find tapped detection (canvas coordinate space)
            const tappedBox = detections.find((d) => {
              const [x1, y1, x2, y2] = d.bbox;
              return (
                canvasX >= x1 && canvasX <= x2 && canvasY >= y1 && canvasY <= y2
              );
            });

            if (!tappedBox) {
              console.log("Tapped outside pothole area");
              return;
            }

            // Calculate wrapper-relative pixel coordinates for positioning the heart
            // Map canvas (pixel) to wrapper/client coords:
            const relativeXOnWrapper =
              wrapperRect.left + (canvasX / canvas.width) * wrapperRect.width;
            const relativeYOnWrapper =
              wrapperRect.top + (canvasY / canvas.height) * wrapperRect.height;

            // Optional: size the heart based on box size (nice polish)
            const [bx1, by1, bx2, by2] = tappedBox.bbox;
            const boxW = Math.abs(bx2 - bx1);
            const boxH = Math.abs(by2 - by1);

            // Convert box bottom Y to wrapper-local pixels
            const bottomYOnWrapper = (by2 / canvas.height) * wrapperRect.height;
            // Center X of the box
            const boxCenterX =
              ((bx1 + bx2) / 2 / canvas.width) * wrapperRect.width;
            console.log(detections);
            console.log(boxCenterX);

            // Map box dimensions to wrapper coordinate space
            const wrapperBoxW = (boxW / canvas.width) * wrapperRect.width;
            const wrapperBoxH = (boxH / canvas.height) * wrapperRect.height;

            // Align heart to bottom of box
            let left = boxCenterX;
            let top = bottomYOnWrapper - wrapperBoxH; // start from top of box

            // Clamp within wrapper bounds
            // left = Math.max(
            //   wrapperBoxW / 2,
            //   Math.min(left, wrapperRect.width - wrapperBoxW / 2)
            // );
            left = detections[0].bbox[0] / 1.6;
            top = Math.max(0, Math.min(top, wrapperRect.height - wrapperBoxH));

            // Save both width & height
            setHeartPos({ left, top, width: wrapperBoxW, height: wrapperBoxH });

            // Show heart
            setPlay(true);
            setShowInstruction(false);

            // automatically hide after animation
            setTimeout(() => {
              setPlay(false);
              setHeartPos(null);
            }, 2500);
          }}
          style={{ display: streaming ? "none" : "block" }}
        />
        {showInstruction && (
          <div className="instruction-overlay">
            <div className="double-tap-instruction">
              <Lottie
                animationData={doubleTapInstruction}
                loop={true}
                className="double-tap-anim"
              />
              <p className="double-tap-text">Double tap the pothole ❤️</p>
            </div>
          </div>
        )}

        {play && showShare && heartPos && (
          <div
            className="heart-container"
            style={{
              left: `${heartPos.left}px`,
              // left: "184px",
              top: `${heartPos.top}px`,
              width: `${heartPos.width}px`,
              height: `${heartPos.height}px`,
            }}
          >
            <Lottie
              animationData={heartAnimation}
              loop={false}
              style={{ width: "100%", height: "100%", objectFit: "fill" }}
              rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
            />
          </div>
        )}

        {/* 🔹 Share button overlay */}
        {showShare && (
          <button
            onClick={shareDetection}
            className={`share-button ${highlight ? "highlight" : ""}`}
          >
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
        ref={buttonRef}
        onClick={streaming ? captureAndDetect : resetCamera}
        className="yolo-button"
      >
        {streaming ? "Capture Image" : "Resume Camera"}
      </button>

      {toast && (
        <div
          className={`toast ${
            toast.type === "error" ? "error-toast" : "success-toast"
          }`}
        >
          <div className="toast-content">
            <div className="toast-icon">
              {toast.type === "error" ? "❌" : "✅"}
            </div>
            <div>
              <h4 className="toast-title">
                {toast.type === "error" ? "Error!" : "Congratulations!"}
              </h4>
              <p className="toast-message">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default YoloTest;
