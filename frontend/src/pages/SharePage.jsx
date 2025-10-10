import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL, BASE_URL } from "../config";
import "./SharePage.css";

export default function SharePage() {
  const { id } = useParams(); // capture ID from /share/:id route
  const [pothole, setPothole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch pothole details from Django backend
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/share/${id}/`);
        if (!res.ok) throw new Error("Failed to fetch pothole");
        const data = await res.json();
        setPothole(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <p className="text-center mt-8">Loading...</p>;
  if (error) return <p className="text-center mt-8 text-red-600">{error}</p>;
  if (!pothole) return <p className="text-center mt-8">No pothole found.</p>;

  return (
    <div className="share-page">
      <div className="share-card">
        <h1>Pothole Detected in {pothole.city || "Unknown Location"}</h1>

        <img src={pothole.image_url} alt="Pothole" />

        <p>
          <strong>Detected At:</strong>{" "}
          {new Date(pothole.detected_at).toLocaleString()}
        </p>

        <p>
          This pothole was detected automatically using the Pothole Detection
          System.
        </p>

        <a
          href={`https://maps.google.com/?q=${pothole.latitude},${pothole.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on Map
        </a>
      </div>
    </div>
  );
}
