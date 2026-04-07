import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function Book() {
  const { id } = useParams();
  const { token } = useAuth();
  const [slots, setSlots] = useState([]);
  const [searchParams] = useSearchParams();

  const rawDate = searchParams.get("date");

  // YYYY-MM-DD に変換
  const date = rawDate ? rawDate.split("T")[0] : null;

  useEffect(() => {
    if (!date) {
      alert("日付がありません");
      return;
    }

    apiFetch(
      `/slots?department_id=${id}&from_date=${date}&to_date=${date}`,
      "GET",
      null,
      token
    )
      .then((res) => setSlots(res.items))
      .catch((e) => {
        console.error(e);
        alert("取得失敗");
      });
  }, [date]);

  return (
    <div>
      <h2>時間選択</h2>

      {!date && <div>日付が選択されていません</div>}

      {slots.map((s) => (
        <div key={s.id}>
          {new Date(s.start_at).toLocaleTimeString()}
          <button onClick={() => alert("予約処理")}>
            予約
          </button>
        </div>
      ))}
    </div>
  );
}