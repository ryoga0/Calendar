from __future__ import annotations

from datetime import date, timedelta

from fastapi.testclient import TestClient


def register_user(client: TestClient, email: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123",
            "user_name": "テストユーザー",
            "phone": "09012345678",
        },
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def find_available_slot(
    client: TestClient,
    headers: dict[str, str],
    department_id: str,
    *,
    exclude_appointment_id: str | None = None,
    exclude_start_at: str | None = None,
) -> tuple[date, dict]:
    for offset in range(1, 15):
        target_date = date.today() + timedelta(days=offset)
        url = f"/api/v1/availability?department_id={department_id}&date={target_date.isoformat()}"
        if exclude_appointment_id:
            url += f"&exclude_appointment_id={exclude_appointment_id}"
        response = client.get(url, headers=headers)
        assert response.status_code == 200, response.text
        available_items = [
            item
            for item in response.json()["items"]
            if item["available"] and item["start_at"] != exclude_start_at
        ]
        if available_items:
            return target_date, available_items[0]
    raise AssertionError("次の14日間に予約可能時間が見つかりませんでした。")
