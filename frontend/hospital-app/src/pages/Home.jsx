// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const { token, logout } = useAuth();
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/departments", "GET", null, token)
      .then((res) => setDepartments(res.items))
      .catch(() => alert("取得失敗"));
  }, []);

  return (
    <div>
      <h2>診療科</h2>

      <button onClick={() => navigate("/appointments")}>
        予約一覧
      </button>

      {!token && (
        <button onClick={() => navigate("/login")}>
          ログイン
        </button>
      )}

      {token && (
        <button onClick={logout}>
          ログアウト
        </button>
      )}

      {departments.map((d) => (
        <div key={d.id}>
          <button onClick={() => navigate(`/book/${d.id}`)}>
            {d.name}
          </button>
        </div>
      ))}
    </div>
  );
}