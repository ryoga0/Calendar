export function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}

export function formatTime(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value) {
  return `${formatDate(value)} ${formatTime(value)}`;
}

export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildLocalDateTime(date, time) {
  const [hour, minute] = time.split(":").map(Number);
  return `${toDateInputValue(date)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

export function parseDateInput(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getAppointmentCalendarDisabledDays(referenceDate = new Date()) {
  return [{ before: startOfDay(referenceDate) }, { dayOfWeek: [0] }];
}

export function getNextSelectableAppointmentDate(referenceDate = new Date()) {
  const date = startOfDay(referenceDate);

  while (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}
