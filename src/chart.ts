/**
 * Printable weekly chore chart, generated on-device with expo-print.
 * One section per person (plus "Anyone" for shared chores): each chore on a
 * row with a box on every day it's due that week. Made for the fridge door.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getMembers, getTasks, Member, prettyDate, shiftDate, shortWeekday, Task } from './db';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Days (YYYY-MM-DD) within [weekStart, weekStart+6] on which a chore falls due. */
export function dueDaysInWeek(task: Pick<Task, 'nextDue' | 'freqDays'>, weekStart: string): Set<string> {
  const out = new Set<string>();
  const weekEnd = shiftDate(weekStart, 6);
  // Anything already overdue lands on the first day of the week.
  let d = task.nextDue < weekStart ? weekStart : task.nextDue;
  if (task.freqDays <= 0) {
    // One-time chore: a single box on its day.
    if (d <= weekEnd) out.add(d);
    return out;
  }
  let guard = 0;
  while (d <= weekEnd && guard < 14) {
    out.add(d);
    d = shiftDate(d, task.freqDays);
    guard += 1;
  }
  return out;
}

function section(
  title: string,
  color: string,
  tasks: Task[],
  days: string[],
  weekStart: string
): string {
  if (tasks.length === 0) return '';
  const head = days.map((d) => `<th class="d">${shortWeekday(d).charAt(0)}</th>`).join('');
  const rows = tasks
    .map((t) => {
      const due = dueDaysInWeek(t, weekStart);
      const cells = days
        .map((d) => `<td class="c">${due.has(d) ? '<span class="box"></span>' : '<span class="dot">·</span>'}</td>`)
        .join('');
      return `<tr><td class="n">${esc(t.name)}<div class="room">${esc(t.roomEmoji)} ${esc(t.roomName)}</div></td>${cells}<td class="p">${t.points}</td></tr>`;
    })
    .join('');
  return `
  <div class="sec">
    <div class="who"><span class="swatch" style="background:${color}"></span>${esc(title)}</div>
    <table>
      <tr><th class="n">Chore</th>${head}<th class="p">Pts</th></tr>
      ${rows}
    </table>
    <div class="total">Points this week: <span class="line"></span></div>
  </div>`;
}

export function buildChartHtml(
  weekStart: string,
  members: Member[],
  tasks: Task[],
  householdName: string
): string {
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(weekStart, i));
  const weekEnd = days[6];
  // Only chores that come due this week make the chart.
  const inWeek = tasks.filter((t) => dueDaysInWeek(t, weekStart).size > 0);
  const sections: string[] = [];
  for (const m of members) {
    sections.push(section(m.name, m.color, inWeek.filter((t) => t.memberId === m.id), days, weekStart));
  }
  const shared = inWeek.filter((t) => t.memberId == null || !members.some((m) => m.id === t.memberId));
  sections.push(section(members.length ? 'Anyone' : householdName || 'Our home', '#2E7D5B', shared, days, weekStart));

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: letter portrait; margin: 30px; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #16231b; margin: 0; }
  h1 { font-size: 24px; margin: 0; letter-spacing: -0.3px; }
  .sub { color: #4b5d52; font-size: 12px; margin: 2px 0 14px; }
  .sec { page-break-inside: avoid; margin-bottom: 18px; border: 1.5px solid #d7e2d9; border-radius: 12px; padding: 10px 12px; }
  .who { font-size: 16px; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
  .swatch { display: inline-block; width: 14px; height: 14px; border-radius: 7px; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .4px; color: #4b5d52; border-bottom: 2px solid #2e7d5b; padding: 4px 4px; }
  th.n { text-align: left; }
  td { border-bottom: 1px solid #e3ebe5; padding: 6px 4px; font-size: 12px; vertical-align: middle; }
  td.n { width: 44%; }
  .room { font-size: 10px; color: #8a998f; margin-top: 1px; }
  th.d, td.c { width: 6.5%; text-align: center; }
  th.p, td.p { width: 6%; text-align: center; color: #4b5d52; }
  .box { display: inline-block; width: 16px; height: 16px; border: 1.8px solid #16231b; border-radius: 4px; }
  .dot { color: #c9d4cc; font-size: 14px; }
  .total { font-size: 11px; color: #4b5d52; margin-top: 8px; text-align: right; }
  .line { display: inline-block; width: 60px; border-bottom: 1px solid #16231b; }
  .footer { margin-top: 10px; color: #8a998f; font-size: 9px; text-align: center; }
</style></head>
<body>
  <h1>${esc(householdName || 'Our')} Chore Chart</h1>
  <div class="sub">Week of ${prettyDate(weekStart, true)} to ${prettyDate(weekEnd, true)} · Check a box when it’s done</div>
  ${sections.join('') || '<p>No chores due this week.</p>'}
  <div class="footer">Made with Chores: Cleaning Schedule for iPhone</div>
</body></html>`;
}

export async function printChart(weekStart: string, householdName: string): Promise<void> {
  const [members, tasks] = await Promise.all([getMembers(), getTasks()]);
  const html = buildChartHtml(weekStart, members, tasks, householdName);
  const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Chore chart', UTI: 'com.adobe.pdf' });
  }
}
