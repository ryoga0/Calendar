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

  // デフォルト時間
  const defaultTimes = [
    "09:00",
    "10:00",
    "11:00",
    "13:00",
    "14:00",
    "15:00",
  ];

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
      .then((res) => {
        const items = res.items || [];

        // DB空のとき
        if (items.length === 0) {
          const generated = defaultTimes.map((time, i) => ({
            id: i,
            start_at: `${date}T${time}:00`,
            is_default: true,
          }));

          setSlots(generated);
        } else {
          // DBにある予約時間を除外
          const bookedTimes = items.map((s) =>
            new Date(s.start_at).toTimeString().slice(0, 5)
          );

          const available = defaultTimes
            .filter((t) => !bookedTimes.includes(t))
            .map((time, i) => ({
              id: i,
              start_at: `${date}T${time}:00`,
              is_default: true,
            }));

          setSlots(available);
        }
      })
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
          {new Date(s.start_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          <button onClick={() => alert("予約処理")}>
            予約
          </button>
        </div>
      ))}

      {slots.length === 0 && <div>予約できる時間がありません</div>}
    </div>
  );
}