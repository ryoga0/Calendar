// src/pages/Login.jsx
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
      const data = await apiFetch("/auth/login", "POST", {
        email,
        password,
      });
      login(data);
      navigate("/");
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <h2>ログイン</h2>
      <input onChange={(e) => setEmail(e.target.value)} placeholder="email" />
      <input type="password" onChange={(e) => setPassword(e.target.value)} placeholder="password" />
      <button onClick={handleLogin}>ログイン</button>
    </div>
  );
}