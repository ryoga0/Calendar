import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";

const useAuthMock = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../api/departmentApi", () => ({
  fetchDepartments: vi.fn(),
}));

vi.mock("../api/appointmentApi", () => ({
  fetchAppointments: vi.fn(),
}));

describe("Home", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("未ログイン時はログインと新規登録を分けて案内する", () => {
    useAuthMock.mockReturnValue({
      token: null,
      user: null,
      logout: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText("ご利用案内")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログインする" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "はじめての方はこちら" })).toBeInTheDocument();
  });
});
