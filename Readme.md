# 病院予約カレンダーアプリ

React と Firebase で構成した、患者向けの病院予約カレンダーアプリです。  
現在の実行経路は **React SPA + Firebase Authentication + Cloud Firestore** です。  
FastAPI は通常利用の必須構成ではなく、`backend/` は移行前の検証コードと Firestore seed 補助に残しています。

この README は、**`Calendar` フォルダをそのまま渡された人が、そのままセットアップできること** を前提に書いています。  
`Calendar/` 直下からの相対手順だけを載せています。

## 1. 現在できること

- メールアドレスとパスワードで新規登録
- メールアドレスとパスワードでログイン
- プロフィール参照と更新
- 診療科一覧の表示
- 日付ごとの予約可能時間の表示
- 予約の登録
- 予約一覧の表示
- 予約詳細の表示
- 予約日時の変更
- 予約のキャンセル
- 管理者向けの診療科受付停止 / 再開
- 管理者向けの休診日登録 / 解除
- 管理者向けの日付別予約確認と代行キャンセル

通知機能は未実装です。

## 2. 技術スタック

### フロントエンド

- React 18
- Vite
- React Router
- Chakra UI
- react-day-picker
- Firebase JavaScript SDK

### Firebase

- Firebase Authentication
- Cloud Firestore
- Cloud Firestore Lite
- Firestore Security Rules

### 補助ツール

- Python 3.11 以上
- `firebase-admin` を使う seed スクリプト

## 3. ディレクトリ構成

```text
Calendar/
  backend/                     # 移行前の検証コードと seed 用依存
    app/
    tests/
    requirements.txt
  docs/
    01_要件定義書.md
    02_基本設計書.md
    03_詳細設計書.md
    04_画面フロー図.md
    05_Firebase移行準備.md
    実装計画書.md
  frontend/
    hospital-app/
      src/
      .env.example
      package.json
  firebase.json
  firestore.rules
  scripts/
    seed_firestore_departments.py
  Readme.md
```

## 4. 前提環境

- Node.js 20 以上推奨
- npm
- Firebase プロジェクト
- Firebase Authentication のメール/パスワード認証を有効化済み
- Cloud Firestore を作成済み
- Windows PowerShell または Cursor のターミナル

診療科 seed スクリプトを使う場合だけ、追加で次が必要です。

- Python 3.11 以上
- サービスアカウント JSON

## 5. 初回セットアップ

`Calendar` フォルダを開いた状態から始めます。

### 5.1 フロントエンド依存のインストール

```powershell
cd frontend\hospital-app
npm install
cd ..\..
```

### 5.2 フロントエンド環境変数の作成

`frontend/hospital-app/.env.example` を参考に、`frontend/hospital-app/.env` を作成します。

必要な値:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

任意:

- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`

例:

```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

### 5.3 Firebase プロジェクト側で必要な設定

1. Firebase Authentication の「メール / パスワード」を有効化する
2. Cloud Firestore を作成する
3. `firestore.rules` を Firebase へ反映する

Firebase CLI を使う場合の例:

```powershell
firebase deploy --only firestore:rules
```

### 5.4 管理者アカウントの有効化

管理者画面を使う場合だけ、通常の利用者登録に加えて `admins/{uid}` 文書を 1 件作成します。

手順:

1. まずアプリから通常どおり新規登録する
2. Firebase Console の `Authentication` で対象ユーザーの `UID` を確認する
3. Firestore Database の `admins` コレクションに、その `UID` をドキュメント ID として文書を作る
4. 文書の中身は空でもよいが、分かりやすさのため `email` などを入れてもよい
5. アプリを再読み込みすると、ホーム画面に `管理者画面` ボタンが出る

最小例:

- コレクション: `admins`
- ドキュメント ID: `Authentication` に表示される UID
- フィールド例: `email = admin@example.com`

## 6. 診療科データの投入

診療科が 0 件だと、ホーム画面に予約先が表示されません。  
次のどちらかで投入してください。

### 方法 A: Firebase Console で手動登録

`departments` コレクションに次の項目を作成します。

- `name`
- `sort_order`
- `is_active`

最小例:

- 内科 / 10 / true
- 外科 / 20 / true
- 整形外科 / 30 / true

### 方法 B: seed スクリプトを使う

最初に Python 依存を入れます。

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..
```

次に環境変数を設定して seed します。

```powershell
$env:FIREBASE_PROJECT_ID="your-project-id"
$env:FIREBASE_CREDENTIALS_PATH=".\service-account.json"
.\backend\venv\Scripts\python.exe scripts\seed_firestore_departments.py
```

このスクリプトは `departments` が空のときだけ、次の診療科を入れます。

- 内科
- 外科
- 整形外科

## 7. 起動方法

通常利用では FastAPI は不要です。  
フロントエンドだけ起動します。

```powershell
cd frontend\hospital-app
npm run dev -- --host 127.0.0.1 --port 5173
```

ブラウザで開く URL:

- `http://127.0.0.1:5173`

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
- 永続化された `Slot` テーブルは持たない
- 予約可能時間は診療ルールから動的生成する
- 平日: `09:00 / 10:00 / 11:00 / 13:00 / 14:00 / 15:00 / 16:00`
- 土曜: `09:00 / 10:00 / 11:00`
- 日曜: 予約不可
- 同じ利用者は、同じ診療科を同時に複数予約できない
- 同じ利用者は、同じ時間に複数予約できない
- 過去日時には予約できない
- 休診日に設定された日付には予約できない
- キャンセル時は予約データを Firestore から削除する

## 10. Firestore データ構成

### `admins/{uid}`

- 管理者権限の付与用ドキュメント
- この文書が存在するユーザーだけ管理者画面へ入れる

### `users/{uid}`

- `email`
- `user_name`
- `phone`
- `created_at`
- `updated_at`

### `users/{uid}/appointments/{appointmentId}`

- `user_id`
- `department_id`
- `department_name`
- `status`
- `slot_key`
- `start_at`
- `created_at`
- `updated_at`

### `departments/{departmentId}`

- `name`
- `sort_order`
- `is_active`

### `department_closures/{departmentId}_{YYYY-MM-DD}`

- `department_id`
- `department_name`
- `date`
- `reason`
- `created_by`
- `created_at`
- `updated_at`

### ロック用コレクション

予約の重複を防ぐために、次も使います。

- `user_department_locks`
- `user_slot_locks`
- `department_slot_locks`

## 11. テスト

### 11.1 フロントエンドテスト

```powershell
cd frontend\hospital-app
npm test
```

### 11.2 フロントエンドビルド

```powershell
cd frontend\hospital-app
npm run build
```

### 11.3 seed スクリプト構文確認

```powershell
.\backend\venv\Scripts\python.exe -m py_compile scripts\seed_firestore_departments.py
```

## 12. よくあるエラー

### 12.1 `VITE_FIREBASE_* が未設定です`

`frontend/hospital-app/.env` が不足しています。  
`.env.example` を見ながら必要な値を設定してください。

### 12.2 `Missing or insufficient permissions`

Firestore Security Rules が未反映か、ルールに合わない書き込みをしています。  
まず `firestore.rules` をデプロイしてください。

### 12.3 `Firebase: Error (auth/invalid-credential)`

メールアドレスまたはパスワードが正しくありません。

### 12.4 `spawn EPERM`

Vite や Vitest の子プロセス生成が Windows の権限で止められている状態です。  
通常の PowerShell で再実行するか、権限付きで起動してください。

### 12.5 `ERR_BLOCKED_BY_CLIENT` や `Listen/channel` のエラー

Firestore の通常 SDK 通信が PC やネットワーク環境に止められている状態です。  
このリポジトリでは回避のため Firestore Lite を使う構成へ寄せています。最新コードへ更新し、開発サーバーを再起動してください。

## 13. 補足

- `backend/` は通常起動では使いません
- `backend/` を削除していないのは、移行前の検証コードと Python 補助ツールを残しているためです
- 現在の Firestore Security Rules はベースラインです。より厳密な改ざん耐性が必要なら、予約作成・変更・削除を Cloud Functions 化するのが次の選択肢です

## 14. 参照資料

- [01_要件定義書](docs/01_要件定義書.md)
- [02_基本設計書](docs/02_基本設計書.md)
- [03_詳細設計書](docs/03_詳細設計書.md)
- [04_画面フロー図](docs/04_画面フロー図.md)
- [05_Firebase移行準備](docs/05_Firebase移行準備.md)
- [実装計画書](docs/実装計画書.md)
