import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      // ログインを試す
      const data = await apiFetch("/auth/login", "POST", {
        email,
        password,
      });

      login(data);
      navigate("/");
    } catch (e) {
      try {
        // ログイン失敗 → 登録を試す
        const data = await apiFetch("/auth/register", "POST", {
          email,
          password,
        });

        login(data);
        navigate("/");
      } catch (err) {
        alert("ログインまたは登録に失敗しました");
      }
    }
  };

  return (
    <div>
      <h2>ログイン</h2>

      <input
        type="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>
        ログイン
      </button>
    </div>
  );
}