import { describe, expect, it } from "vitest";
import { buildAuditLogDepartmentOptions, filterAuditLogs } from "./auditLogs";

const sampleLogs = [
  {
    id: "log-1",
    actor_user_name: "管理者A",
    actor_email: "admin@example.com",
    summary: "内科 の予約を登録しました。",
    created_at: "2026-04-13T08:30:00",
    details: {
      department_name: "内科",
      patient_user_name: "山田太郎",
      start_at: "2026-04-20T09:00:00",
    },
  },
  {
    id: "log-2",
    actor_user_name: "管理者B",
    actor_email: "staff@example.com",
    summary: "皮膚科 の休診日を登録しました。",
    created_at: "2026-04-14T10:45:00",
    details: {
      department_name: "皮膚科",
      patient_user_name: null,
      date: "2026-04-20",
      start_at: null,
    },
  },
];

describe("auditLogs utilities", () => {
  it("診療科の候補を重複なしで組み立てる", () => {
    expect(buildAuditLogDepartmentOptions([{ name: "内科" }, { name: "眼科" }])).toEqual(["眼科", "内科"]);
  });

  it("診療科、名前、日付でログを絞り込める", () => {
    expect(filterAuditLogs(sampleLogs, { department: "内科" })).toHaveLength(1);
    expect(filterAuditLogs(sampleLogs, { name: "山田" })).toEqual([sampleLogs[0]]);
    expect(filterAuditLogs(sampleLogs, { date: "2026-04-20" })).toEqual(sampleLogs);
    expect(filterAuditLogs(sampleLogs, { date: "2026-04-14" })).toEqual([sampleLogs[1]]);
  });
});
