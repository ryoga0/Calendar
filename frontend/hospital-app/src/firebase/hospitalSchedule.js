const WEEKDAY_TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
const SATURDAY_TIMES = ["09:00", "10:00", "11:00"];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function parseDateParts(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return {
    year,
    month,
    day,
  };
}

function parseStartAt(startAt) {
  const [dateValue, timeValue] = startAt.split("T");
  if (!dateValue || !timeValue) {
    throw new Error("日時の形式が正しくありません。");
  }

  const { year, month, day } = parseDateParts(dateValue);
  const [hour, minute] = timeValue.split(":").map(Number);

  return {
    dateValue,
    year,
    month,
    day,
    hour,
    minute,
  };
}

function getTokyoNowParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  };
}

export function normalizeDateValue(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }

  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  throw new Error("日付の形式が正しくありません。");
}

export function normalizeStartAt(startAt) {
  const { dateValue, hour, minute } = parseStartAt(startAt);
  return `${dateValue}T${pad2(hour)}:${pad2(minute)}:00`;
}

export function timeFromStartAt(startAt) {
  const { hour, minute } = parseStartAt(startAt);
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function buildStartAt(dateValue, timeValue) {
  return `${normalizeDateValue(dateValue)}T${timeValue}:00`;
}

export function buildSlotKey(dateValue, timeValue) {
  const normalizedDate = normalizeDateValue(dateValue).replaceAll("-", "");
  const normalizedTime = timeValue.replace(":", "");
  return `${normalizedDate}T${normalizedTime}`;
}

export function slotKeyFromStartAt(startAt) {
  const normalizedStartAt = normalizeStartAt(startAt);
  return buildSlotKey(normalizedStartAt.split("T")[0], timeFromStartAt(normalizedStartAt));
}

export function comparableSlotValue(dateValue, timeValue) {
  const slotKey = buildSlotKey(dateValue, timeValue);
  return slotKey.replace("T", "");
}

export function nowComparableSlotValue() {
  const now = getTokyoNowParts();
  return `${now.year}${now.month}${now.day}${now.hour}${now.minute}`;
}

export function isFutureSlot(dateValue, timeValue) {
  return comparableSlotValue(dateValue, timeValue) > nowComparableSlotValue();
}

export function scheduleTimesForDate(dateValue) {
  const { year, month, day } = parseDateParts(normalizeDateValue(dateValue));
  const weekday = new Date(year, month - 1, day).getDay();

  if (weekday >= 1 && weekday <= 5) {
    return WEEKDAY_TIMES;
  }
  if (weekday === 6) {
    return SATURDAY_TIMES;
  }
  return [];
}

export function addOneHour(startAt) {
  const { year, month, day, hour, minute } = parseStartAt(startAt);
  const next = new Date(year, month - 1, day, hour, minute, 0);
  next.setHours(next.getHours() + 1);
  return `${next.getFullYear()}-${pad2(next.getMonth() + 1)}-${pad2(next.getDate())}T${pad2(next.getHours())}:${pad2(next.getMinutes())}:00`;
}
