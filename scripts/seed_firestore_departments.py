from __future__ import annotations

import os
import sys
from datetime import datetime, timezone


DEPARTMENT_SEEDS = (
    {"code": "internal-medicine", "name": "内科", "sort_order": 10, "is_active": True},
    {"code": "surgery", "name": "外科", "sort_order": 20, "is_active": True},
    {"code": "orthopedics", "name": "整形外科", "sort_order": 30, "is_active": True},
    {"code": "pediatrics", "name": "小児科", "sort_order": 40, "is_active": True},
    {"code": "dermatology", "name": "皮膚科", "sort_order": 50, "is_active": True},
    {"code": "ophthalmology", "name": "眼科", "sort_order": 60, "is_active": True},
    {"code": "otolaryngology", "name": "耳鼻咽喉科", "sort_order": 70, "is_active": True},
    {"code": "cardiology", "name": "循環器内科", "sort_order": 80, "is_active": True},
    {"code": "respiratory", "name": "呼吸器内科", "sort_order": 90, "is_active": True},
    {"code": "gastroenterology", "name": "消化器内科", "sort_order": 100, "is_active": True},
    {"code": "urology", "name": "泌尿器科", "sort_order": 110, "is_active": True},
    {"code": "gynecology", "name": "婦人科", "sort_order": 120, "is_active": True},
)


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if value:
        return value
    raise RuntimeError(f"{name} を設定してください。")


def _build_department_payload(item: dict[str, object], now: str, created_at: str | None = None) -> dict[str, object]:
    return {
        "code": item["code"],
        "name": item["name"],
        "sort_order": item["sort_order"],
        "is_active": item.get("is_active", True),
        "created_at": created_at or now,
        "updated_at": now,
    }


def main() -> int:
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError as exc:
        print("firebase-admin が見つかりません。backend/venv の依存をインストールしてください。", file=sys.stderr)
        raise SystemExit(1) from exc

    project_id = _require_env("FIREBASE_PROJECT_ID")
    credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")

    options = {"projectId": project_id}

    try:
        firebase_admin.get_app("calendar-seed")
    except ValueError:
        if credentials_path:
            cred = credentials.Certificate(credentials_path)
            firebase_admin.initialize_app(cred, options, name="calendar-seed")
        else:
            firebase_admin.initialize_app(options=options, name="calendar-seed")

    app = firebase_admin.get_app("calendar-seed")
    db = firestore.client(app=app)
    departments = db.collection("departments")
    existing_docs = list(departments.stream())

    existing_by_code = {
        (doc.to_dict() or {}).get("code"): doc
        for doc in existing_docs
        if (doc.to_dict() or {}).get("code")
    }
    existing_by_name = {
        (doc.to_dict() or {}).get("name"): doc
        for doc in existing_docs
        if (doc.to_dict() or {}).get("name")
    }

    batch = db.batch()
    now = datetime.now(timezone.utc).isoformat()
    created_count = 0
    updated_count = 0

    for item in DEPARTMENT_SEEDS:
        existing_doc = existing_by_code.get(item["code"]) or existing_by_name.get(item["name"])
        if existing_doc:
            current = existing_doc.to_dict() or {}
            payload = _build_department_payload(item, now, current.get("created_at"))
            batch.set(existing_doc.reference, payload, merge=True)
            updated_count += 1
            continue

        ref = departments.document(str(item["code"]))
        batch.set(ref, _build_department_payload(item, now))
        created_count += 1

    batch.commit()
    print(
        f"診療科の同期が完了しました。作成: {created_count} 件 / 更新: {updated_count} 件 / 定義総数: {len(DEPARTMENT_SEEDS)} 件"
    )
    print("seed に存在しない既存診療科は削除していません。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
