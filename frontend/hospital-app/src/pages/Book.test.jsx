import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import Book from "./Book";

const fetchAvailabilityMock = vi.fn();
const fetchAppointmentsMock = vi.fn();
const createAppointmentMock = vi.fn();
const useAuthMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("../api/availabilityApi", () => ({
  fetchAvailability: (...args) => fetchAvailabilityMock(...args),
}));

vi.mock("../api/appointmentApi", () => ({
  fetchAppointments: (...args) => fetchAppointmentsMock(...args),
  createAppointment: (...args) => createAppointmentMock(...args),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("Book", () => {
  beforeEach(() => {
    fetchAvailabilityMock.mockReset();
    fetchAppointmentsMock.mockReset();
    createAppointmentMock.mockReset();
    useAuthMock.mockReset();
    navigateMock.mockReset();
    useAuthMock.mockReturnValue({ token: "token" });
    fetchAppointmentsMock.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("空き時間を表示し、予約操作を実行できる", async () => {
    fetchAvailabilityMock.mockResolvedValueOnce({
      items: [
        { time: "09:00", start_at: "2026-04-10T09:00:00", available: true, reason: null },
        { time: "10:00", start_at: "2026-04-10T10:00:00", available: false, reason: "満員" },
      ],
    });
    createAppointmentMock.mockResolvedValueOnce({ id: "appt-1" });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/book/dep-1",
            state: { departmentName: "内科" },
          },
        ]}
      >
        <Routes>
          <Route path="/book/:departmentId" element={<Book />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("満員")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /09:00/ }));
    expect(createAppointmentMock).not.toHaveBeenCalled();
    expect(await screen.findByText("この内容で予約を確定してもよろしいですか。")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "この内容で予約する" }));

    await waitFor(() => {
      expect(createAppointmentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: "dep-1",
          token: "token",
        })
      );
    });

    expect(createAppointmentMock.mock.calls[0][0].startAt).toMatch(/T09:00:00$/);

    expect(navigateMock).toHaveBeenCalledWith("/appointments", {
      replace: true,
      state: { message: "予約が完了しました。" },
    });
  });

  it("候補がすべて予約不可のときは別日を促す", async () => {
    fetchAvailabilityMock.mockResolvedValueOnce({
      items: [
        { time: "09:00", start_at: "2026-04-10T09:00:00", available: false, reason: "満員" },
        { time: "10:00", start_at: "2026-04-10T10:00:00", available: false, reason: "受付終了" },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/book/dep-1"]}>
        <Routes>
          <Route path="/book/:departmentId" element={<Book />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText("この日はすべて埋まっています。別の日を選ぶと、他の日の空き状況を確認できます。")
    ).toBeInTheDocument();
  });

  it("同じ診療科の予約があると確認ダイアログを開かずにエラーを表示する", async () => {
    fetchAvailabilityMock.mockResolvedValueOnce({
      items: [{ time: "09:00", start_at: "2026-04-10T09:00:00", available: true, reason: null }],
    });
    fetchAppointmentsMock.mockResolvedValueOnce({
      items: [
        {
          id: "appt-1",
          department_id: "dep-1",
          start_at: "2026-04-12T09:00:00",
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/book/dep-1"]}>
        <Routes>
          <Route path="/book/:departmentId" element={<Book />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(await screen.findByRole("button", { name: /09:00/ }));

    expect(
      await screen.findByText("この診療科はすでに予約済みです。変更する場合は予約一覧からお進みください。")
    ).toBeInTheDocument();
    expect(screen.queryByText("この内容で予約を確定してもよろしいですか。")).not.toBeInTheDocument();
    expect(createAppointmentMock).not.toHaveBeenCalled();
  });
});
