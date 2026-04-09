function buildError(message, code = "APP_ERROR", status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

export function unauthorizedError(message = "ログインが必要です。") {
  return buildError(message, "UNAUTHORIZED", 401);
}

export function firebaseErrorMessage(error, fallbackMessage) {
  const code = error?.code || "";

  switch (code) {
    case "auth/email-already-in-use":
      return buildError("このメールアドレスは既に登録されています。", "CONFLICT", 409);
    case "auth/invalid-email":
      return buildError("メールアドレスの形式が正しくありません。", "INVALID_EMAIL", 400);
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-login-credentials":
      return buildError("メールアドレスまたはパスワードが正しくありません。", "UNAUTHORIZED", 401);
    case "auth/weak-password":
      return buildError("パスワードは6文字以上で入力してください。", "INVALID_PASSWORD", 400);
    case "auth/too-many-requests":
      return buildError("操作が多すぎます。少し時間をおいて再度お試しください。", "TOO_MANY_REQUESTS", 429);
    case "auth/network-request-failed":
      return buildError("通信に失敗しました。ネットワーク状態を確認してください。", "NETWORK_ERROR", 503);
    case "permission-denied":
      return buildError("この操作を実行する権限がありません。", "FORBIDDEN", 403);
    case "unavailable":
      return buildError("Firebase に接続できません。時間をおいて再度お試しください。", "UNAVAILABLE", 503);
    default:
      return buildError(fallbackMessage, code || "APP_ERROR", 400);
  }
}

export function validationError(message, code = "VALIDATION_ERROR") {
  return buildError(message, code, 400);
}

export function conflictError(message, code = "CONFLICT") {
  return buildError(message, code, 409);
}

export function notFoundError(message = "対象のデータが見つかりませんでした。") {
  return buildError(message, "NOT_FOUND", 404);
}

export function wrapUnknownError(error, fallbackMessage) {
  if (
    error &&
    typeof error === "object" &&
    typeof error.code === "string" &&
    (error.code.includes("/") || error.code === "permission-denied" || error.code === "unavailable")
  ) {
    return firebaseErrorMessage(error, fallbackMessage);
  }
  if (error instanceof Error && error.message) {
    return error;
  }
  return buildError(fallbackMessage);
}
