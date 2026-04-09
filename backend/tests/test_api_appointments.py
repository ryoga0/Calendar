from __future__ import annotations

import uuid

from .helpers import find_available_slot, register_user


def test_register_and_login(client):
    email = f"phase3-{uuid.uuid4().hex[:8]}@example.com"

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123",
            "user_name": "山田 太郎",
            "phone": "09011112222",
        },
    )
    assert register_response.status_code == 200
    register_data = register_response.json()
    assert register_data["user"]["email"] == email
    assert register_data["user"]["user_name"] == "山田 太郎"

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "Password123",
        },
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["email"] == email


def test_availability_returns_items(client):
    headers = register_user(client, f"availability-{uuid.uuid4().hex[:8]}@example.com")

    departments = client.get("/api/v1/departments", headers=headers)
    assert departments.status_code == 200
    department_id = departments.json()["items"][0]["id"]

    target_date, slot = find_available_slot(client, headers, department_id)
    assert target_date
    assert slot["time"]
    assert slot["available"] is True


def test_appointment_create_update_delete_flow(client):
    headers = register_user(client, f"flow-{uuid.uuid4().hex[:8]}@example.com")

    departments = client.get("/api/v1/departments", headers=headers)
    department_id = departments.json()["items"][0]["id"]

    _, first_slot = find_available_slot(client, headers, department_id)

    create_response = client.post(
        "/api/v1/appointments",
        json={
            "department_id": department_id,
            "start_at": first_slot["start_at"],
        },
        headers=headers,
    )
    assert create_response.status_code == 200, create_response.text
    created = create_response.json()

    detail_response = client.get(f"/api/v1/appointments/{created['id']}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["department_id"] == department_id

    _, second_slot = find_available_slot(
        client,
        headers,
        department_id,
        exclude_appointment_id=created["id"],
        exclude_start_at=created["start_at"],
    )

    update_response = client.patch(
        f"/api/v1/appointments/{created['id']}",
        json={"start_at": second_slot["start_at"]},
        headers=headers,
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["start_at"] == second_slot["start_at"]

    delete_response = client.delete(f"/api/v1/appointments/{created['id']}", headers=headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "ok"

    missing_response = client.get(f"/api/v1/appointments/{created['id']}", headers=headers)
    assert missing_response.status_code == 404


def test_same_department_second_appointment_is_rejected(client):
    headers = register_user(client, f"dept-limit-{uuid.uuid4().hex[:8]}@example.com")

    departments = client.get("/api/v1/departments", headers=headers)
    department_id = departments.json()["items"][0]["id"]

    _, first_slot = find_available_slot(client, headers, department_id)

    first_response = client.post(
        "/api/v1/appointments",
        json={
            "department_id": department_id,
            "start_at": first_slot["start_at"],
        },
        headers=headers,
    )
    assert first_response.status_code == 200, first_response.text

    _, second_slot = find_available_slot(client, headers, department_id)
    second_response = client.post(
        "/api/v1/appointments",
        json={
            "department_id": department_id,
            "start_at": second_slot["start_at"],
        },
        headers=headers,
    )
    assert second_response.status_code == 400
    assert second_response.json()["code"] == "ALREADY_EXISTS"


def test_same_time_other_department_is_rejected(client):
    headers = register_user(client, f"time-conflict-{uuid.uuid4().hex[:8]}@example.com")

    departments = client.get("/api/v1/departments", headers=headers).json()["items"]
    first_department_id = departments[0]["id"]
    second_department_id = departments[1]["id"]

    _, first_slot = find_available_slot(client, headers, first_department_id)

    first_response = client.post(
        "/api/v1/appointments",
        json={
            "department_id": first_department_id,
            "start_at": first_slot["start_at"],
        },
        headers=headers,
    )
    assert first_response.status_code == 200, first_response.text

    second_response = client.post(
        "/api/v1/appointments",
        json={
            "department_id": second_department_id,
            "start_at": first_slot["start_at"],
        },
        headers=headers,
    )
    assert second_response.status_code == 400
    assert second_response.json()["code"] == "TIME_CONFLICT"


def test_cannot_read_other_users_appointment(client):
    first_headers = register_user(client, f"owner-{uuid.uuid4().hex[:8]}@example.com")
    second_headers = register_user(client, f"other-{uuid.uuid4().hex[:8]}@example.com")

    departments = client.get("/api/v1/departments", headers=first_headers).json()["items"]
    department_id = departments[0]["id"]
    _, slot = find_available_slot(client, first_headers, department_id)

    create_response = client.post(
        "/api/v1/appointments",
        json={
            "department_id": department_id,
            "start_at": slot["start_at"],
        },
        headers=first_headers,
    )
    assert create_response.status_code == 200, create_response.text
    appointment_id = create_response.json()["id"]

    other_response = client.get(f"/api/v1/appointments/{appointment_id}", headers=second_headers)
    assert other_response.status_code == 404
