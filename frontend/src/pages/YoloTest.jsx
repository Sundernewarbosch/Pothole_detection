import { useRef, useEffect, useState } from "react";

function YoloTest() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

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

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "20px",
    width: "100%",
  };

  const wrapperStyle = {
    position: "relative",
    width: isMobile ? "90%" : "80%",
    maxWidth: "800px",
    aspectRatio: isMobile ? "9/16" : "16/9",
  };

  const mediaStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
    objectFit: "cover",
  };

  const buttonStyle = {
    marginTop: "15px",
    padding: "12px 25px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#ff4d4f",
    color: "white",
    cursor: "pointer",
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ textAlign: "center" }}>Pothole Detection</h1>

      <div style={wrapperStyle}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ ...mediaStyle, display: streaming ? "block" : "none" }}
        />
        <canvas
          ref={canvasRef}
          style={{ ...mediaStyle, display: streaming ? "none" : "block" }}
        />
      </div>

      <button
        onClick={streaming ? captureAndDetect : resetCamera}
        style={buttonStyle}
      >
        {streaming ? "Capture Image" : "Resume Camera"}
      </button>
    </div>
  );
}

export default YoloTest;
