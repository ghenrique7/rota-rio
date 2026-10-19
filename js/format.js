const MONTHS_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Local calendar date as YYYY-MM-DD (avoids UTC midnight shifts). */
export function todayIsoDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 0 = Sunday … 6 = Saturday, same as Date.getDay() and rota.dias_semana. */
export function weekdayFromIsoDate(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  const weekday = date.getDay();
  if (Number.isNaN(weekday)) {
    throw new Error(`Data inválida: ${isoDate}`);
  }
  return weekday;
}

/** "06:30:00" or "06:30" → "06:30" */
export function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

/** Adds minutes to a time string; wraps past midnight (20:00 + 330 → 01:30). */
export function addMinutesToTime(timeValue, minutes) {
  const [hoursText, minutesText] = formatTime(timeValue).split(":");
  const start = Number(hoursText) * 60 + Number(minutesText);
  const total = start + Number(minutes);
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(wrapped / 60);
  const mins = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** 150 → "2h30", 60 → "1h", 45 → "45min" */
export function formatDuration(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total < 0) return "";
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, "0")}`;
}

/** 90 → "R$ 90,00" */
export function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return currencyFormatter.format(amount);
}

/**
 * Same calendar day as today → "Hoje, 27 ago"
 * Other days → "Seg, 28 ago"
 */
export function formatDateLabel(isoDate, today = todayIsoDate()) {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate();
  const month = MONTHS_PT[date.getMonth()];
  if (isoDate === today) return `Hoje, ${day} ${month}`;
  return `${WEEKDAYS_PT[date.getDay()]}, ${day} ${month}`;
}

/** timestamptz → "Atualizado em 20/08" */
export function formatUpdatedOn(isoTimestamp) {
  if (!isoTimestamp) return "";
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `Atualizado em ${day}/${month}`;
}

export function digitsOnly(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

function withBrazilCountryCode(digits) {
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/** https://wa.me/55XXXXXXXXXXX */
export function whatsappUrl(phone) {
  const digits = withBrazilCountryCode(digitsOnly(phone));
  if (!digits) return "";
  return `https://wa.me/${digits}`;
}

/** tel:+55XXXXXXXXXXX */
export function telUrl(phone) {
  const digits = withBrazilCountryCode(digitsOnly(phone));
  if (!digits) return "";
  return `tel:+${digits}`;
}
