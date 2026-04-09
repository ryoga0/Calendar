from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone


DEPARTMENT_SEEDS = (
    {"name": "内科", "sort_order": 10},
    {"name": "外科", "sort_order": 20},
    {"name": "整形外科", "sort_order": 30},
)


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if value:
        return value
    raise RuntimeError(f"{name} を設定してください。")


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

    if list(departments.limit(1).stream()):
        print("departments コレクションに既存データがあるため seed をスキップしました。")
        return 0

    batch = db.batch()
    now = datetime.now(timezone.utc).isoformat()
    for item in DEPARTMENT_SEEDS:
        ref = departments.document(str(uuid.uuid4()))
        batch.set(
            ref,
            {
                "name": item["name"],
                "sort_order": item["sort_order"],
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )

    batch.commit()
    print(f"{len(DEPARTMENT_SEEDS)} 件の診療科を Firestore に登録しました。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
