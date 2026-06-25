export function formatAnnouncementEventDate(eventDate: string): {
  day: string;
  month: string;
} {
  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) {
    return { day: "—", month: "" };
  }
  return {
    day: String(date.getDate()),
    month: date.toLocaleString("en-AU", { month: "short" }).toUpperCase(),
  };
}
