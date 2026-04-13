function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDateText(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    if (typeof value === "string" && value.includes("T")) {
      return value.split("T")[0];
    }
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildNameCandidates(log) {
  return [
    log.actor_user_name,
    log.actor_email,
    log.details?.patient_user_name,
    log.summary,
  ]
    .map(normalizeText)
    .filter(Boolean);
}

function buildDateCandidates(log) {
  return [log.created_at, log.details?.date, log.details?.start_at, log.details?.previous_start_at]
    .map(normalizeDateText)
    .filter(Boolean);
}

export function buildAuditLogDepartmentOptions(departments = []) {
  const names = new Set();

  departments.forEach((department) => {
    if (department?.name) {
      names.add(department.name);
    }
  });

  return [...names].sort((left, right) => left.localeCompare(right, "ja"));
}

export function filterAuditLogs(logs = [], filters = {}) {
  const department = String(filters.department || "").trim();
  const name = normalizeText(filters.name);
  const date = normalizeDateText(filters.date);

  return logs.filter((log) => {
    if (department && log.details?.department_name !== department) {
      return false;
    }

    if (name) {
      const matchesName = buildNameCandidates(log).some((candidate) => candidate.includes(name));
      if (!matchesName) {
        return false;
      }
    }

    if (date) {
      const matchesDate = buildDateCandidates(log).some((candidate) => candidate === date);
      if (!matchesDate) {
        return false;
      }
    }

    return true;
  });
}
