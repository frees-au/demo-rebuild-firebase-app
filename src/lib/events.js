import { collection, doc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore';
import { db } from './firestore.js';
import { defaultTimezone, timezoneOptions } from './preferenceOptions.js';

const fallbackEventDate = new Date();
const eventPaletteSize = 8;
const previewEventMinutes = 30;
const eventTypeLabels = {
  shift: 'Shift',
  'shift-open': 'Available Shift',
  medical: 'Medical appointment',
  'check-in': 'Check in',
  'check-out': 'Check out',
};

function normalizeDateString(value) {
  return String(value).replace(/\sat\s/i, ' ');
}

function toDate(value) {
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;

  const parsed = new Date(normalizeDateString(value || ''));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function profileLabel(reference) {
  const path = reference?.path || String(reference || '');
  return path.split('/').pop() || '';
}

function employeeName(profile, fallback) {
  if (!profile) return fallback;

  return [
    profile.preferredName,
    [profile.givenNames, profile.surname].filter(Boolean).join(' '),
    profile.email,
    fallback,
  ]
    .map((name) => String(name || '').trim())
    .find(Boolean);
}

function eventTypeValue(eventType) {
  const type = String(eventType || 'shift').trim();
  if (type === 'Shift') return 'shift';
  if (type.toLowerCase() === 'check in') return 'check-in';
  if (type.toLowerCase() === 'check out') return 'check-out';
  return type || 'shift';
}

function eventTypeKey(eventType) {
  return eventTypeValue(eventType).toLowerCase();
}

function isAttendanceEvent(eventType) {
  return ['check-in', 'check-out'].includes(eventTypeValue(eventType));
}

function eventTypeCssClass(index) {
  return `ac-calendar-event-color-${(index % eventPaletteSize) + 1}`;
}

function eventTypeLabel(eventType) {
  const type = eventTypeValue(eventType);
  return eventTypeLabels[type] || type || 'Event';
}

function attendanceEventText(name, eventType) {
  const type = eventTypeValue(eventType);
  if (type === 'check-in') return `${name} (started)`;
  if (type === 'check-out') return `${name} (finished)`;
  return name;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function safeTimezone(timezone) {
  return timezoneOptions.some((option) => option.value === timezone) ? timezone : defaultTimezone;
}

function timezoneParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function timezoneOffsetMs(date, timezone) {
  const parts = timezoneParts(date, timezone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

  return asUtc - date.getTime();
}

function zonedInstantToLocalDate(date, timezone) {
  const parts = timezoneParts(date, timezone);

  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, date.getMilliseconds());
}

function localDateToZonedInstant(date, timezone) {
  const utcGuess = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
  const guess = new Date(utcGuess);

  return new Date(utcGuess - timezoneOffsetMs(guess, timezone));
}

function eventSpansMultipleHours(event) {
  return event.end.getTime() - event.start.getTime() > 60 * 60 * 1000;
}

function sameDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function displayTime(date) {
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

async function loadProfileNames() {
  const snapshot = await getDocs(collection(db, 'userProfiles'));

  return snapshot.docs.reduce((profiles, document) => {
    const data = document.data();
    profiles.set(document.id, employeeName(data, data.employeeCode || document.id));
    return profiles;
  }, new Map());
}

export async function loadEmployeeOptions() {
  const snapshot = await getDocs(query(collection(db, 'userProfiles'), orderBy('employeeCode')));

  return snapshot.docs
    .map((document) => {
      const data = document.data();
      const profileId = document.id;
      const employeeCode = data.employeeCode || '';

      return {
        employeeCode: profileId,
        employeeNumber: employeeCode,
        name: employeeName(data, employeeCode),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.employeeNumber.localeCompare(b.employeeNumber));
}

export async function loadCalendarEvents() {
  const [snapshot, profileNames] = await Promise.all([
    getDocs(query(collection(db, 'events'), orderBy('dateStart'))),
    loadProfileNames(),
  ]);

  return calendarEventsFromSnapshot(snapshot, profileNames);
}

export async function loadUpcomingShiftEventsForEmployee(profileId, now = new Date()) {
  const cleanProfileId = String(profileId || '').trim();
  if (!cleanProfileId) return [];

  const snapshot = await getDocs(query(
    collection(db, 'events'),
    where('eventType', '==', 'shift'),
    where('userProfile', '==', doc(db, 'userProfiles', cleanProfileId)),
    where('dateStart', '>=', now),
    orderBy('dateStart'),
  ));

  return calendarEventsFromSnapshot(snapshot, new Map());
}

function calendarEventsFromSnapshot(snapshot, profileNames) {
  const eventTypes = new Map();

  return snapshot.docs
    .map((document) => {
      const data = document.data();
      const start = toDate(data.dateStart);
      const end = isAttendanceEvent(data.eventType) ? toDate(data.dateEnd) || start : toDate(data.dateEnd);

      if (!start || !end) return null;

      const typeKey = eventTypeKey(data.eventType);
      const typeValue = eventTypeValue(data.eventType);
      if (!eventTypes.has(typeKey)) {
        eventTypes.set(typeKey, eventTypeCssClass(eventTypes.size));
      }

      const employeeCode = profileLabel(data.userProfile);
      const name = profileNames.get(employeeCode) || employeeCode || eventTypeLabel(data.eventType);
      const displayName = attendanceEventText(name, typeValue);

      return {
        id: document.id,
        start,
        end,
        originalEventId: document.id,
        text: displayName,
        details: eventTypeLabel(data.eventType),
        eventType: eventTypeLabel(data.eventType),
        eventTypeValue: typeValue,
        employeeCode,
        employeeName: displayName,
        userProfile: displayName,
        notes: data.notes || '',
        css: eventTypes.get(typeKey),
      };
    })
    .filter(Boolean);
}

export function monthCalendarEvents(events) {
  return events.map((event) => {
    const start = sameDay(event.start);
    start.setHours(12, 0, 0, 0);

    return {
      ...event,
      id: `${event.id}-month-start`,
      originalEventId: event.id,
      start,
      end: addMinutes(start, previewEventMinutes),
      text: event.employeeName || event.text,
    };
  });
}

export function calendarEventsForTimezone(events, timezone) {
  return events.map((event) => ({
    ...event,
    start: zonedInstantToLocalDate(event.start, timezone),
    end: zonedInstantToLocalDate(event.end, timezone),
  }));
}

export function calendarEventForStorage(event, timezone) {
  return {
    ...event,
    start: localDateToZonedInstant(event.start, timezone),
    end: localDateToZonedInstant(event.end, timezone),
  };
}

export function weekCalendarEvents(events) {
  return events.flatMap((event) => {
    const name = event.employeeName || event.text;
    const labelMultiHourShift = event.eventTypeValue === 'shift' && eventSpansMultipleHours(event);
    const startEvent = {
      ...event,
      id: `${event.id}-week-start`,
      originalEventId: event.id,
      end: addMinutes(event.start, previewEventMinutes),
      text: labelMultiHourShift ? `${name} (start)` : name,
    };

    if (isAttendanceEvent(event.eventTypeValue)) return [startEvent];

    return [
      startEvent,
      {
        ...event,
        id: `${event.id}-week-end`,
        originalEventId: event.id,
        start: event.end,
        end: addMinutes(event.end, previewEventMinutes),
        text: labelMultiHourShift ? `${name} (end)` : name,
      },
    ];
  });
}

export function shiftsForDay(events, date) {
  const target = sameDay(date).getTime();

  return events
    .filter((event) => sameDay(event.start).getTime() === target)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

export function shiftTimeLabel(event) {
  return `${displayTime(event.start)}-${displayTime(event.end)}`;
}

export function upcomingShiftsForEmployee(events, employeeCode, now = new Date()) {
  const profileId = String(employeeCode || '').trim();
  if (!profileId) return [];

  return events
    .filter((event) => (
      event.eventTypeValue === 'shift'
      && event.employeeCode === profileId
      && event.start >= now
    ))
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

export function initialCalendarDate(events) {
  return events[0]?.start || fallbackEventDate;
}

export function calendarEventTypes(events) {
  return Array.from(
    events.reduce((types, event) => {
      if (!types.has(event.eventType)) {
        types.set(event.eventType, event.css);
      }

      return types;
    }, new Map()),
    ([label, css]) => ({ label, css }),
  );
}

export async function saveCalendarEvent(event) {
  const eventRef = event.id ? doc(db, 'events', event.id) : doc(collection(db, 'events'));
  const typeValue = eventTypeValue(event.eventType);
  const userProfile = typeValue === 'shift-open' ? '' : doc(db, 'userProfiles', event.employeeCode);
  const eventData = {
    dateStart: event.start,
    eventType: typeValue,
    userProfile,
    notes: event.notes || '',
  };

  if (!isAttendanceEvent(typeValue)) {
    eventData.dateEnd = event.end;
  }

  await setDoc(eventRef, eventData);

  return eventRef.id;
}

export function defaultCalendarEvent(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9);

  return {
    id: null,
    start,
    end: addMinutes(start, 8 * 60),
    eventType: 'Shift',
    eventTypeValue: 'shift',
    employeeCode: '',
    notes: '',
  };
}
