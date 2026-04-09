# 病院予約カレンダーアプリ Firebase メモ

| 文書ID | HOSP-CAL-FB-001 |
|--------|-----------------|
| 版数 | 2.0 |
| 作成日 | 2026-04-09 |
| 最終更新 | 2026-04-09 |

---

## 1. この文書の位置づけ

この文書は、他人に見せるための概要資料ではなく、**開発者向けの内部メモ** である。  
Firebase へ完全移行したあとに、運用上どこを見ればよいかを整理している。

---

## 2. 現在の状態

- アプリ本体は React から Firebase を直接利用する
- 認証は Firebase Authentication
- データ保存は Cloud Firestore
- 予約整合性は Firestore トランザクション + ロック文書で維持する
- FastAPI は通常利用経路から外している

---

## 3. 主要な Firebase 資産

### 3.1 Authentication

- メール / パスワード認証を利用

### 3.2 Firestore コレクション

- `users`
- `departments`
- `users/{uid}/appointments`
- `user_department_locks`
- `user_slot_locks`
- `department_slot_locks`

### 3.3 ルール

- `firestore.rules`

### 3.4 補助ファイル

- `firebase.json`
- `scripts/seed_firestore_departments.py`

---

## 4. 実装済みの移行内容

- Firebase JavaScript SDK を導入
- `AuthContext` を Firebase セッション監視へ変更
- 診療科、空き状況、予約、プロフィール取得を Firestore 直結へ変更
- 予約作成、変更、削除を Firestore トランザクションへ変更
- `vite.config.js` から FastAPI プロキシを削除
- seed スクリプトと Firestore Rules を追加

---

## 5. まだ運用で必要な作業

1. Firebase Authentication のメール / パスワードを有効化する
2. Firestore を作成する
3. `firestore.rules` を Firebase へ反映する
4. `departments` を seed する
5. フロントの `.env` に Firebase 接続値を入れる

---

## 6. 残っている技術的な論点

### 6.1 Security Rules の強化

現在の Rules は「本人以外のデータへ触れない」ことを中心にしたベースライン。  
より強い改ざん耐性が必要なら、予約作成・変更・削除を Cloud Functions に寄せる。

### 6.2 監査ログ

現状は監査ログ未実装。  
運用要件が厳しくなるなら、予約変更履歴やキャンセル履歴の追加が必要。

### 6.3 管理者機能

患者向け UI のみ実装済み。  
診療科管理や休診運用は別フェーズ。

---

## 7. 参考

- [Readme.md](../Readme.md)
- [01_要件定義書.md](01_要件定義書.md)
- [02_基本設計書.md](02_基本設計書.md)
- [03_詳細設計書.md](03_詳細設計書.md)

---

## 改訂履歴

| 版数 | 日付 | 変更内容 |
|------|------|----------|
| 1.1 | 2026-04-09 | Firebase 移行準備メモとして整理 |
| 2.0 | 2026-04-09 | Firebase 完全移行後の内部メモに更新 |
