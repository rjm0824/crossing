// ---------- "Remind me" calendar file (family page) ----------
// Builds a calendar file on the follower's phone and opens it, the method RJ
// tested on his iPhone on Nov 25 (Test 2 of next/calendar-test.html, commit
// 3678d9d): iPhone opens "Add to Calendar" with the alert set.
// Loaded as a plain script (defines the global CalendarFile) and by Node for tests.
var CalendarFile = (function () {
  'use strict';
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  // Calendar time in UTC, e.g. 20261125T231500Z
  function utc(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z';
  }
  // Calendar files allow 75 characters per line; longer lines continue on the next line after a space.
  function fold(line) {
    var out = [];
    while (line.length > 74) { out.push(line.slice(0, 74)); line = ' ' + line.slice(74); }
    out.push(line);
    return out.join('\r\n');
  }
  // Commas, semicolons and backslashes must be escaped in calendar text.
  function esc(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, function (m) { return '\\' + m; }).replace(/\n/g, '\\n');
  }

  // trip: { captain, overdueAt, startedAt }. link: the family link.
  // Start: the overdue time. Length: 15 minutes. Alert: at the start.
  function calendarFile(trip, link, nowMs) {
    var start = new Date(trip.overdueAt);
    var end = new Date(trip.overdueAt + 15 * 60e3);
    var title = 'Check on ' + (trip.captain || 'the captain') + '\'s trip';
    var note = 'Open the link to see where the boat is. The overdue time may have changed.\n' + link;
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Crossing preview//Remind me//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:crossing-trip-' + (trip.startedAt || 0) + '-' + trip.overdueAt + '@rjm0824.github.io',
      'DTSTAMP:' + utc(new Date(nowMs || Date.now())),
      'DTSTART:' + utc(start), 'DTEND:' + utc(end),
      'SUMMARY:' + esc(title), 'DESCRIPTION:' + esc(note), 'URL:' + link,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(title), 'TRIGGER:-PT0M', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].map(fold).join('\r\n') + '\r\n';
  }

  function openCalendarFile(text) {
    location.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
  }

  return { calendarFile: calendarFile, openCalendarFile: openCalendarFile, fold: fold, esc: esc, utc: utc };
})();
if (typeof module !== 'undefined') module.exports = CalendarFile;
