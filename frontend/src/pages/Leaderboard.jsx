import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { Crown, Medal } from "lucide-react";
import "./Leaderboard.css";

function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/leaderboard/`);
        const data = await res.json();

        // Replace this with your actual device ID retrieval
        const storedDevice = localStorage.getItem("device_id");
        setCurrentUser(storedDevice);

        setLeaders(data);
      } catch (error) {
        console.error("Failed to load leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) return <div className="leaderboard-loading">Loading...</div>;

  if (leaders.length === 0)
    return <p className="leaderboard-empty">No submissions yet.</p>;

  // Find user index using deviceId instead of username ✅
  const userIndex = leaders.findIndex((u) => u.deviceId === currentUser);

  // Compute visible leaders (max 5)
  let visibleLeaders = [];
  if (userIndex === -1 || userIndex < 5) {
    visibleLeaders = leaders.slice(0, 5);
  } else {
    visibleLeaders = [
      ...leaders.slice(0, 4),
      leaders[userIndex], // Show the user at 5th
    ];
  }

  return (
    <div className="leaderboard-container">
      <h1 className="leaderboard-title">
        <Crown className="leaderboard-icon" />
        Leaderboard
      </h1>

      <div className="leaderboard-list">
        {visibleLeaders.map((user, index) => {
          // Calculate correct global rank
          const globalRank =
            userIndex >= 5 && index === 4 ? userIndex + 1 : index + 1;

          const isCurrentUser = user.deviceId === currentUser;

          return (
            <div
              key={user.deviceId}
              className={`leaderboard-item ${
                globalRank === 1
                  ? "first"
                  : globalRank === 2
                  ? "second"
                  : globalRank === 3
                  ? "third"
                  : ""
              } ${isCurrentUser ? "highlight" : ""}`}
            >
              <div className="leaderboard-user">
                {globalRank <= 3 ? (
                  <Medal
                    className={`medal ${
                      globalRank === 1
                        ? "gold"
                        : globalRank === 2
                        ? "silver"
                        : "bronze"
                    }`}
                  />
                ) : (
                  <span className="rank">#{globalRank}</span>
                )}
                <span className="username">{user.username}</span>
              </div>
              <span className="post-count">{user.post_count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Leaderboard;
