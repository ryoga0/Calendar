import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute, PublicOnlyRoute } from "./RouteGuards";

const useAuthMock = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

describe("RouteGuards", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("未ログイン時は保護ページからログイン画面へ遷移する", async () => {
    useAuthMock.mockReturnValue({
      token: null,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/appointments"]}>
        <Routes>
          <Route path="/login" element={<div>ログイン画面</div>} />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <div>予約一覧</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("ログイン画面")).toBeInTheDocument();
  });

  it("ログイン済み時は公開ページからホームへ戻す", async () => {
    useAuthMock.mockReturnValue({
      token: "token",
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/" element={<div>ホーム</div>} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <div>ログイン画面</div>
              </PublicOnlyRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("ホーム")).toBeInTheDocument();
  });
});
