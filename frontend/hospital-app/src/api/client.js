// src/api/client.js
function defaultErrorMessage(status) {
  switch (status) {
    case 400:
      return "入力内容に問題があります。内容を確認してください。";
    case 401:
      return "ログイン情報が無効です。再度ログインしてください。";
    case 403:
      return "この操作を実行する権限がありません。";
    case 404:
      return "対象のデータが見つかりませんでした。";
    case 409:
      return "他の操作と競合しました。画面を更新して再度お試しください。";
    default:
      return "処理に失敗しました。時間をおいて再度お試しください。";
  }
}

export async function apiFetch(url, method = "GET", body, token) {
  const res = await fetch(`/api/v1${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.error?.message || data?.message || defaultErrorMessage(res.status);
    const error = new Error(message);
    error.code = data?.error?.code || data?.code || null;
    error.status = res.status;
    throw error;
  }

  return data;
}
