import { useRef, useEffect, useState } from "react";
import "./YoloTest.css";
import { API_BASE_URL, BASE_URL } from "../config";
import heartAnimation from "../assets/Hearts feedback.json";
import Lottie from "lottie-react";
import doubleTapInstruction from "../assets/Double-tap.json";
import dangerAnimation from "../assets/animation.json";

function YoloTest() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const dangerRef = useRef(null);
  const buttonRef = useRef(null);

  const [streaming, setStreaming] = useState(true);
  const [location, setLocation] = useState(null);
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const [play, setPlay] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  const [detections, setDetections] = useState([]);
  const [heartPos, setHeartPos] = useState(null);
  const [dangerVisible, setDangerVisible] = useState(false);
  const [dangerPos, setDangerPos] = useState(null);
  const [chatBubble, setChatBubble] = useState(null);

  // UUID
  function generateUUID() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
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

  /* ---------------- Camera Setup ---------------- */
  useEffect(() => {
    let stream;
    async function setupCamera() {
      try {
        const video = videoRef.current;
        if (!video) return;

        if (video.srcObject) {
          video.srcObject.getTracks().forEach((t) => t.stop());
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
        await video.play();
      } catch (err) {
        setError("Unable to start camera.");
      }
    }

    setupCamera();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, []);

  /* ---------------- Location ---------------- */
  useEffect(() => {
    async function fetchLocation() {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const { latitude, longitude } = pos.coords;
        setLocation({ latitude, longitude });

        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        setCity(
          data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.county ||
            "Unknown"
        );
      } catch (err) {
        setError("Location permission denied.");
      }
    }
    fetchLocation();
  }, []);

  /* ---------------- Capture + Detect ---------------- */
  const captureAndDetect = async () => {
    if (!localStorage.getItem("seen_double_tap_instruction")) {
      setShowInstruction(true);
      localStorage.setItem("seen_double_tap_instruction", "true");
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    setStreaming(false);

    const frame = canvas.toDataURL("image/jpeg");

    try {
      const res = await fetch(`${API_BASE_URL}/detect/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frame,
          latitude: location?.latitude,
          longitude: location?.longitude,
          city,
          deviceId,
        }),
      });

      const data = await res.json();

      if (!data.detections?.length) {
        showToast("No pothole detected.", "error");
      } else {
        setDetections(data.detections);
        setShowShare(true);
        setDangerVisible(true);

        dangerRef.current?.goToAndPlay(0, true);

        // Draw boxes
        // data.detections.forEach((d) => {
        //   const [x1, y1, x2, y2] = d.bbox;
        //   ctx.strokeStyle = "red";
        //   ctx.lineWidth = 3;
        //   ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        // });
        // Convert bounding box → wrapper coordinates for danger animation
        const wrapper = document.querySelector(".yolo-wrapper");
        const wrapperRect = wrapper.getBoundingClientRect();
        const canvas = canvasRef.current;
        const canvasRect = canvas.getBoundingClientRect();

        // Use the FIRST detected pothole for animation positioning
        const d = data.detections[0];
        const [x1, y1, x2, y2] = d.bbox;

        // bottom center of the box (in canvas coords)
        const boxCenterX = (x1 + x2) / 2;
        const bottomY = y2;

        // convert to wrapper/screen coords
        const screenX =
          (boxCenterX / canvas.width) * wrapperRect.width + wrapperRect.left;

        const screenY =
          (bottomY / canvas.height) * wrapperRect.height + wrapperRect.top + 20;
        // +20px below the bounding box

        if (window.innerWidth < 768) {
          setDangerPos({
            left: screenX,
            top: screenY - 150,
          });
          setChatBubble({
            left: screenX,
            top: screenY - 160,
            message: "Thank you for alerting us!!",
          });
        } else {
          setDangerPos({
            left: screenX,
            top: screenY,
          });
          setChatBubble({
            left: screenX - 80,
            top: screenY - 60,
            message: "Thank you for alerting us!!",
          });
        }

        // Auto hide after 3 seconds
        // setTimeout(() => {
        //   setChatBubble(null);
        // }, 3000);

        showToast("Great job! Pothole detected!");
      }
    } catch (err) {
      showToast("Detection failed.", "error");
    }
  };

  /* ---------------- Reset ---------------- */
  const resetCamera = () => {
    setStreaming(true);
    setShowShare(false);
    setShowInstruction(false);
    setDetections([]);
    setDangerVisible(false);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment" },
      })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      });
  };

  const shareDetection = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/latest/${deviceId}/`);
      if (!res.ok) throw new Error("Failed to fetch latest pothole");
      const data = await res.json();
      const shareUrl = BASE_URL + `/share/${data.share_uuid}`;
      const shareText = `Look what I spotted on the road! 🕵️‍♂️ A pothole in ${data.city}. Let’s keep our streets safe—see it here: ${shareUrl}`;

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

  /* ---------------- Share Button Highlight ---------------- */
  useEffect(() => {
    if (showShare) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showShare]);
  useEffect(() => {
    const updateCanvasSize = () => {
      const wrapper = document.querySelector(".yolo-wrapper");
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();

      document.documentElement.style.setProperty(
        "--canvas-w",
        `${rect.width}px`
      );
      document.documentElement.style.setProperty(
        "--canvas-h",
        `${rect.height}px`
      );
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  /* ---------------- Danger Animation Freeze ---------------- */
  const handleDangerComplete = () => {
    const total = dangerRef.current?.animationData?.op;
    if (total) dangerRef.current.goToAndStop(total - 1, true);
  };

  return (
    <div className="yolo-container">
      <h1>Pothole Detection</h1>

      <div className="yolo-wrapper">
        {/* LIVE Camera */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="yolo-video"
          style={{ display: streaming ? "block" : "none" }}
        />

        {/* Canvas ABOVE VIDEO */}
        <canvas ref={canvasRef} className="yolo-canvas" />

        {/* Overlay ABOVE canvas only when not streaming */}
        {!streaming && (
          <div className="overlay">
            <button onClick={resetCamera} className="close-overlay-btn">
              ✕
            </button>
          </div>
        )}

        {/* Danger Animation ABOVE everything */}
        {dangerVisible && dangerPos && (
          <div
            className="danger-animation-overlay"
            style={{
              opacity: 1,
              left: dangerPos.left + "px",
              top: dangerPos.top + "px",
            }}
          >
            <Lottie
              lottieRef={dangerRef}
              animationData={dangerAnimation}
              loop={false}
              className="danger-lottie"
              onComplete={handleDangerComplete}
            />
          </div>
        )}
        {chatBubble && dangerVisible && (
          <div
            className="chat-bubble"
            style={{
              left: chatBubble.left + "px",
              top: chatBubble.top + "px",
            }}
          >
            {chatBubble.message}
          </div>
        )}
      </div>
      {/* Share Button */}
      {showShare && (
        <button
          onClick={shareDetection}
          className={`share-button ${highlight ? "highlight" : ""}`}
        >
          <img src="/share.png" alt="Share" width="24" height="24" />
        </button>
      )}

      {/* Capture Button */}
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
          <p>{toast.message}</p>
        </div>
      )}
    </div>
  );
}

export default YoloTest;
