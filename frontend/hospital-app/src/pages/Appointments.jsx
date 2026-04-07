// src/pages/Appointments.jsx
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function Appointments() {
  const { token } = useAuth();
  const [list, setList] = useState([]);

  const load = () => {
    apiFetch("/appointments", "GET", null, token)
      .then((res) => setList(res.items || res))
      .catch(() => alert("取得失敗"));
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id) => {
    if (!confirm("キャンセルしますか？")) return;

    try {
      await apiFetch(`/appointments/${id}`, "DELETE", null, token);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <h2>予約一覧</h2>

      {list.map((a) => (
        <div key={a.id}>
          {a.department_id} / {a.slot_id}
          <button onClick={() => cancel(a.id)}>キャンセル</button>
        </div>
      ))}
    </div>
  );
}