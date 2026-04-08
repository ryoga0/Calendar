## 環境構築

### 1. Backend (FastAPI)

`backend/` で実行:

```bash
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn
```

### 2. Frontend (React)

`frontend/` で実行:

```bash
python -m venv venv
venv\Scripts\activate
cd hospital-app
npm install react@18 react-dom@18
npm install react-day-picker
npm install @chakra-ui/react@2 @emotion/react @emotion/styled framer-motion
```

## 起動方法

### 1. Backend 起動

`backend/` で実行:

```bash
venv\Scripts\activate
uvicorn main:app --reload
```

API は `http://127.0.0.1:8000` で起動します。

### 2. Frontend 起動

`frontend/hospital-app/` で実行:

```bash
npm run dev 
```

ブラウザで `http://localhost:3000` を開きます。
