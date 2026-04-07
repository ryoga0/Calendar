// src/pages/SelectDate.jsx
import { useParams, useNavigate } from "react-router-dom";

export default function SelectDate() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 簡易：今日から7日分
  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div>
      <h2>日付を選択</h2>

      {days.map((d, i) => (
        <button
          key={i}
          onClick={() =>
            navigate(`/book/${id}/time?date=${d.toISOString()}`)
          }
        >
          {d.toLocaleDateString()}
        </button>
      ))}
    </div>
  );
}