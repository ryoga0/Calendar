# 病院予約カレンダーアプリ

React と FastAPI で構築している、患者向けの病院予約カレンダーアプリです。  
現在は **FastAPI + SQLite** で機能検証を進めており、将来的に **Firebase** へ移行する前提で設計しています。

この README は、**`Calendar` フォルダをそのまま渡された人が、そのままセットアップできること** を前提に書いています。  
個人の絶対パスは使わず、`Calendar/` 直下からの相対手順だけを載せています。

## 1. 現在できること

- メールアドレスとパスワードで新規登録
- メールアドレスとパスワードでログイン
- プロフィールの参照と更新
- 診療科一覧の表示
- 日付ごとの予約可能時間の表示
- 予約の登録
- 予約一覧の表示
- 予約詳細の表示
- 予約日時の変更
- 予約のキャンセル

現在は **患者向け機能** が中心です。  
管理者画面、通知、休診日管理、Firebase 本番移行は今後のフェーズです。

## 2. 技術スタック

### フロントエンド

- React 18
- Vite
- React Router
- Chakra UI
- react-day-picker

### バックエンド

- FastAPI
- SQLAlchemy
- SQLite
- python-jose
- passlib / bcrypt

### 将来移行予定

- Firebase Authentication
- Cloud Firestore

## 3. ディレクトリ構成

```text
Calendar/
  backend/
    app/
    tests/
    calendar.db
    requirements.txt
  docs/
    01_要件定義書.md
    02_基本設計書.md
    03_詳細設計書.md
    04_画面フロー図.md
    実装計画書.md
  frontend/
    hospital-app/
      src/
      package.json
  Readme.md
```

## 4. 前提環境

- Python 3.11 以上推奨
- Node.js 20 以上推奨
- npm
- Windows PowerShell または Cursor のターミナル

## 5. 初回セットアップ

`Calendar` フォルダを開いた状態から始めます。

### 5.1 バックエンド

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..
```

### 5.2 フロントエンド

```powershell
cd frontend\hospital-app
npm install
cd ..\..
```

## 6. 起動方法

ターミナルを 2 つ使います。  
どちらも `Calendar` フォルダを開いた状態から始めてください。

### 6.1 バックエンド起動

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

起動確認:

- `http://127.0.0.1:8000/api/v1/departments`

### 6.2 フロントエンド起動

別ターミナルで実行します。

```powershell
cd frontend\hospital-app
npm run dev -- --host 127.0.0.1 --port 5173
```

ブラウザで開く URL:

- `http://127.0.0.1:5173`

## 7. 初回起動時の動作

バックエンド起動時に次が自動で行われます。

- SQLite ファイル `backend/calendar.db` の初期化
- テーブル作成
- 診療科のシード投入

初期投入される診療科:

- 内科
- 外科
- 整形外科

テストユーザーは自動作成しないため、画面から新規登録してください。

## 8. 使い方の確認手順

1. `http://127.0.0.1:5173` を開く
2. 新規登録する
3. ホームで診療科を選ぶ
4. 日付を選び、空いている時間を選ぶ
5. 予約一覧で登録結果を見る
6. 予約詳細から日時変更する
7. 予約詳細または一覧からキャンセルする

## 9. 現在の予約ルール

- 予約は **1時間単位**
- `Slot` テーブルは持たず、予約可能時間は動的生成
- 平日: `09:00 / 10:00 / 11:00 / 13:00 / 14:00 / 15:00 / 16:00`
- 土曜: `09:00 / 10:00 / 11:00`
- 日曜: 予約不可
- 同じ診療科に対して、同時に複数の有効予約は持てない
- 同じ利用者は、同じ時間に別の予約を持てない
- 過去日時には予約できない
- キャンセル時は DB から予約データを削除する

## 10. 主要 API

ベース URL は `http://127.0.0.1:8000/api/v1` です。

### 認証

- `POST /auth/register`
- `POST /auth/login`

### ユーザー

- `GET /users/me`
- `PATCH /users/me`

### 診療科

- `GET /departments`

### 空き状況

- `GET /availability?department_id={id}&date=YYYY-MM-DD`
- `GET /availability?department_id={id}&date=YYYY-MM-DD&exclude_appointment_id={id}`

### 予約

- `GET /appointments`
- `GET /appointments/{id}`
- `POST /appointments`
- `PATCH /appointments/{id}`
- `DELETE /appointments/{id}`

## 11. リクエスト例

### 11.1 新規登録

```json
{
  "email": "user@example.com",
  "password": "Password123",
  "user_name": "山田 太郎",
  "phone": "09012345678"
}
```

### 11.2 予約登録

```json
{
  "department_id": "department-uuid",
  "start_at": "2026-04-10T09:00:00"
}
```

### 11.3 予約変更

```json
{
  "start_at": "2026-04-10T10:00:00"
}
```

## 12. エラー応答

現在のバックエンドは、業務エラーを次の形式で返します。

```json
{
  "code": "FULL",
  "message": "この日時は満員です。別の日時をお選びください。"
}
```

フロントはこの `message` をそのまま表示し、利用者が理由を理解しやすいようにしています。

## 13. 環境変数

`backend/app/config.py` では、以下の設定値を環境変数または `.env` で上書きできます。

| 変数名 | 既定値 | 用途 |
|--------|--------|------|
| `APP_NAME` | `Hospital Calendar API` | アプリ名 |
| `DATABASE_URL` | `sqlite:///./calendar.db` | DB 接続先 |
| `SECRET_KEY` | 開発用固定値 | JWT 署名キー |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | トークン有効期限 |
| `ALGORITHM` | `HS256` | JWT アルゴリズム |
| `TIMEZONE` | `Asia/Tokyo` | 病院の基準タイムゾーン |
| `CANCEL_CHANGE_DEADLINE_HOURS` | `24` | 将来の締切制御用設定 |

最小構成では `.env` がなくても起動できます。

## 14. データモデル

### users

- `id`
- `email`
- `password_hash`
- `user_name`
- `phone`
- `created_at`
- `updated_at`

### departments

- `id`
- `name`
- `sort_order`
- `is_active`

### appointments

- `id`
- `user_id`
- `department_id`
- `status`
- `start_at`
- `created_at`
- `updated_at`

`end_at` は DB には保存せず、API レスポンスで `start_at + 1時間` として扱っています。

## 15. テスト

### 15.1 バックエンドテスト

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest
```

主な確認内容:

- 新規登録とログイン
- 空き状況取得
- 予約作成
- 予約変更
- 予約削除
- 同一診療科の重複予約拒否
- 同時刻の重複予約拒否
- 他人の予約参照拒否

### 15.2 フロントエンドテスト

```powershell
cd frontend\hospital-app
npm test
```

主な確認内容:

- 認証ガード
- 公開トップの導線
- 新しい予約画面の空き時間表示
- 新しい予約画面からの予約操作

### 15.3 フロントエンドビルド

```powershell
cd frontend\hospital-app
npm run build
```

## 16. よくあるエラー

### 16.1 `ERROR: [WinError 10013]`

Windows がそのポートの待受を許可していない状態です。  
主な原因は、ポート競合か権限制限です。

対処例:

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

フロントのプロキシ先も必要に応じて `frontend/hospital-app/vite.config.js` で変更してください。

### 16.2 `spawn EPERM`

主に Vite 起動時に、子プロセス生成が権限で止められている状態です。  
Cursor の制限付き環境や、Windows のセキュリティ設定で起きることがあります。

対処例:

- 通常の PowerShell で `npm run dev` を実行する
- 権限付きターミナルで起動する
- 一度 `npm run build` が通るか確認する

### 16.3 API に接続できない

次を確認してください。

- バックエンドが `127.0.0.1:8000` で起動しているか
- フロントが `127.0.0.1:5173` で起動しているか
- `frontend/hospital-app/vite.config.js` の API プロキシ先が正しいか

## 17. 今後の予定

- 患者向け UI の追加改善
- 休診日や受付締切のルール追加
- 管理者向け運用画面
- Firebase への移行

## 18. 参照資料

- [01_要件定義書](docs/01_要件定義書.md)
- [02_基本設計書](docs/02_基本設計書.md)
- [03_詳細設計書](docs/03_詳細設計書.md)
- [04_画面フロー図](docs/04_画面フロー図.md)
- [実装計画書](docs/実装計画書.md)
