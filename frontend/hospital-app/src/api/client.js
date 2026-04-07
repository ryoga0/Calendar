// src/api/client.js
export async function apiFetch(url, method = "GET", body, token) {
    const res = await fetch(`/api/v1${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });
  
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "エラー");
    }
  
    return res.json();
  }