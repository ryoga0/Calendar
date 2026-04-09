import { ja } from "react-day-picker/locale";

function formatFullWidthYear(date) {
  return new Intl.DateTimeFormat("ja-JP-u-nu-fullwide", {
    year: "numeric",
  }).format(date);
}

function formatFullWidthMonth(date) {
  return new Intl.DateTimeFormat("ja-JP-u-nu-fullwide", {
    month: "numeric",
  }).format(date);
}

export const dayPickerLocale = ja;

export const dayPickerFormatters = {
  formatCaption: (month) => `${formatFullWidthYear(month)} ${formatFullWidthMonth(month)}`,
  formatWeekdayName: (weekday) =>
    new Intl.DateTimeFormat("ja-JP", {
      weekday: "narrow",
    }).format(weekday),
};
