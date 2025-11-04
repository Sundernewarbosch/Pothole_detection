import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { Crown, Medal } from "lucide-react";
import "./Leaderboard.css"; // 👈 Import the CSS

function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/leaderboard/`);
        const data = await res.json();
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

  return (
    <div className="leaderboard-container">
      <h1 className="leaderboard-title">
        <Crown className="leaderboard-icon" />
        Leaderboard
      </h1>

      <div className="leaderboard-list">
        {leaders.length === 0 ? (
          <p className="leaderboard-empty">No submissions yet.</p>
        ) : (
          leaders.map((user, index) => (
            <div
              key={user.username}
              className={`leaderboard-item ${
                index === 0
                  ? "first"
                  : index === 1
                  ? "second"
                  : index === 2
                  ? "third"
                  : ""
              }`}
            >
              <div className="leaderboard-user">
                {index < 3 ? (
                  <Medal
                    className={`medal ${
                      index === 0 ? "gold" : index === 1 ? "silver" : "bronze"
                    }`}
                  />
                ) : (
                  <span className="rank">#{index + 1}</span>
                )}
                <span className="username">{user.username}</span>
              </div>
              <span className="post-count">{user.post_count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
