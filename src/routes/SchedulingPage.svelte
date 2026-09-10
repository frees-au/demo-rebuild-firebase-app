<script>
  import { onMount, tick } from 'svelte';
  import { Calendar, Willow } from '@svar-ui/svelte-calendar';
  import AppShell from '../components/AppShell.svelte';
  import EventForm from '../components/EventForm.svelte';
  import Modal from '../components/Modal.svelte';
  import {
    calendarEventForStorage,
    calendarEventsForTimezone,
    calendarEventTypes,
    defaultCalendarEvent,
    initialCalendarDate,
    loadCalendarEvents,
    loadEmployeeOptions,
    monthCalendarEvents,
    saveCalendarEvent,
    shiftTimeLabel,
    shiftsForDay,
    weekCalendarEvents,
  } from '../lib/events.js';
  import { loadAppConfig, timezoneOptions } from '../lib/appConfig.js';
  import { loadUserProfile } from '../lib/userProfiles.js';

  export let pathname;
  export let user = null;
  export let onNavigate = () => {};
  export let onLogout = () => {};

  const views = [
    {
      id: 'week',
      label: 'Week',
      sections: {
        timeGrid: {
          yScale: {
            startHour: 0,
            endHour: 24,
          },
        },
      },
    },
    { id: 'month', label: 'Month' },
    { id: 'hours', label: 'Hours' },
  ];
  const eventTypeFilters = [
    { id: 'all', label: 'All', eventTypes: [] },
    { id: 'shifts', label: 'Shifts', eventTypes: ['shift'] },
    { id: 'unfilled', label: 'Unfilled', eventTypes: ['shift-open'] },
    { id: 'in-out', label: 'In/Out', eventTypes: ['check-in', 'check-out'] },
    { id: 'other', label: 'Other', eventTypes: ['medical'] },
  ];

  let events = [];
  let employees = [];
  let date = new Date();
  let activeView = 'week';
  let activeEventTypeFilter = 'all';
  let activeEmployeeFilter = 'all';
  let loadState = 'loading';
  let loadError = '';
  let modalEvent = null;
  let modalOpen = false;
  let savingEvent = false;
  let saveError = '';
  let suppressNextAddEventClick = false;
  let calendarShellElement;
  let lastWeekScrollKey = '';
  let calendarTimezone = timezoneOptions[0].value;

  $: selectedEventTypeFilter = eventTypeFilters.find((filter) => filter.id === activeEventTypeFilter) || eventTypeFilters[0];
  $: filteredSourceEvents = filterEvents(events, selectedEventTypeFilter, activeEmployeeFilter);
  $: filteredEvents = calendarEventsForTimezone(filteredSourceEvents, calendarTimezone);
  $: eventTypes = calendarEventTypes(filteredEvents);
  $: calendarViews = views.filter((view) => view.id === activeView);
  $: displayedEvents = activeView === 'month' ? monthCalendarEvents(filteredEvents) : weekCalendarEvents(filteredEvents);
  $: dayShifts = shiftsForDay(filteredEvents, date);
  $: selectedDateValue = formatDateInput(date);
  $: dayLabel = new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  $: visibleStartHour = firstVisibleHour(dayShifts);
  $: hours = Array.from({ length: 24 - visibleStartHour }, (_, index) => visibleStartHour + index);
  $: if (loadState === 'ready' && activeView === 'week') {
    scrollWeekViewToHour(`${date.getTime()}:${displayedEvents.length}`);
  }

  onMount(async () => {
    try {
      const [loadedEvents, loadedEmployees, appConfig] = await Promise.all([
        loadCalendarEvents(),
        loadEmployeeOptions(),
        loadAppConfig(),
      ]);
      let defaultCalendarTimezone = appConfig.timezone;

      if (user?.uid) {
        const profile = await loadUserProfile(user.uid, {
          localTimezone: appConfig.timezone,
          calendarTimezone: appConfig.timezone,
          preferredLanguage: appConfig.defaultLanguage,
        });
        defaultCalendarTimezone = profile.calendarTimezone;
      }

      events = loadedEvents;
      employees = loadedEmployees;
      calendarTimezone = defaultCalendarTimezone;
      date = initialCalendarDate(calendarEventsForTimezone(events, calendarTimezone));
      loadState = 'ready';
    } catch (error) {
      loadError = error.message || 'Calendar events could not be loaded.';
      loadState = 'error';
    }
  });

  function formatDateInput(value) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function updateSelectedDate(event) {
    const [year, month, day] = event.currentTarget.value.split('-').map(Number);
    date = new Date(year, month - 1, day);
  }

  function moveDay(direction) {
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + direction);
  }

  function filterEvents(sourceEvents, eventTypeFilter, employeeFilter) {
    return sourceEvents.filter((event) => {
      const matchesType = !eventTypeFilter.eventTypes.length || eventTypeFilter.eventTypes.includes(event.eventTypeValue);
      const matchesEmployee = employeeFilter === 'all' || event.employeeCode === employeeFilter;

      return matchesType && matchesEmployee;
    });
  }

  function handleCalendarNavigate(payload) {
    if (payload.date) {
      date = payload.date;
    }

    if (payload.view === 'day' && payload.date) {
      if (suppressNextAddEventClick) {
        suppressNextAddEventClick = false;
        return;
      }

      openAddEvent(payload.date);
    }
  }

  function handleCalendarEventSelect(payload) {
    if (!payload.id) return;
    suppressNextAddEventClick = true;
    openExistingEvent(payload.id);
  }

  function openAddEvent(value = date) {
    modalEvent = defaultCalendarEvent(value);
    saveError = '';
    modalOpen = true;
  }

  function openExistingEvent(eventId) {
    const selectedEvent = findEvent(eventId);
    if (!selectedEvent) return;

    modalEvent = selectedEvent;
    saveError = '';
    modalOpen = true;
  }

  function findEvent(eventId) {
    const renderedEvent = displayedEvents.find((item) => item.id === eventId);
    const originalId = renderedEvent?.originalEventId || eventId;
    return filteredEvents.find((item) => item.id === originalId);
  }

  function closeModal() {
    modalOpen = false;
    modalEvent = null;
    saveError = '';
  }

  async function handleSaveEvent(event) {
    savingEvent = true;
    saveError = '';

    try {
      await saveCalendarEvent(calendarEventForStorage(event, calendarTimezone));
      events = await loadCalendarEvents();
      closeModal();
    } catch (error) {
      saveError = error.message || 'Event could not be saved.';
    } finally {
      savingEvent = false;
    }
  }

  function minutesFromDayStart(value) {
    return value.getHours() * 60 + value.getMinutes();
  }

  function firstVisibleHour(shifts) {
    const earliestStart = shifts.reduce((earliest, shift) => {
      const hour = shift.start.getHours();
      return Math.min(earliest, hour);
    }, 5);

    return Math.max(0, Math.min(5, earliestStart));
  }

  function shiftBarStyle(shift) {
    const visibleStart = visibleStartHour * 60;
    const visibleDuration = 24 * 60 - visibleStart;
    const start = Math.max(visibleStart, minutesFromDayStart(shift.start));
    const end = Math.min(24 * 60, minutesFromDayStart(shift.end));
    const duration = Math.max(15, end - start);

    return `left: ${((start - visibleStart) / visibleDuration) * 100}%; width: ${(duration / visibleDuration) * 100}%;`;
  }

  async function scrollWeekViewToHour(key, hour = 8) {
    if (key === lastWeekScrollKey) return;
    lastWeekScrollKey = key;

    await tick();
    requestAnimationFrame(() => {
      if (activeView !== 'week' || !calendarShellElement) return;

      const scroller = calendarShellElement.querySelector('.wx-sections');
      const header = calendarShellElement.querySelector('.wx-x-headers-row');
      const timeGrid = calendarShellElement.querySelector('.wx-section:not(.wx-section-sticky)');
      const hourCells = timeGrid?.querySelectorAll('.wx-y-header-cell') || [];
      const firstHourCell = hourCells[0];

      if (!scroller || !timeGrid || !firstHourCell) return;

      const hourHeight = firstHourCell.getBoundingClientRect().height;
      const headerHeight = header?.getBoundingClientRect().height || 0;
      scroller.scrollTop = Math.max(0, timeGrid.offsetTop + hourHeight * hour - headerHeight);
    });
  }
</script>

<AppShell eyebrow="Management" title="Calendar" {pathname} {user} {onNavigate} {onLogout}>
  {#if loadState === 'loading'}
    <ac-panel>Loading calendar...</ac-panel>
  {:else if loadState === 'error'}
    <ac-panel emphasis="alert">{loadError}</ac-panel>
  {:else}
    <ac-scheduling-layout>
      <ac-scheduling-toolbar>
        <ac-view-switcher aria-label="Calendar view">
          {#each views as item}
            <button
              type="button"
              variant={activeView === item.id ? undefined : 'secondary'}
              aria-pressed={activeView === item.id}
              on:click={() => activeView = item.id}
            >
              {item.label}
            </button>
          {/each}
        </ac-view-switcher>

        <button type="button" on:click={() => openAddEvent()}>Add</button>
      </ac-scheduling-toolbar>

      <ac-calendar-filters aria-label="Calendar filters">
        <ac-filter-group aria-label="Event type filters">
          {#each eventTypeFilters as filter}
            <button
              type="button"
              variant={activeEventTypeFilter === filter.id ? undefined : 'secondary'}
              aria-pressed={activeEventTypeFilter === filter.id}
              on:click={() => activeEventTypeFilter = filter.id}
            >
              {filter.label}
            </button>
          {/each}
        </ac-filter-group>

        <ac-select-filters>
          <ac-staff-filter>
            <label for="calendar-staff-filter">Staff</label>
            <select
              id="calendar-staff-filter"
              value={activeEmployeeFilter}
              on:change={(event) => activeEmployeeFilter = event.currentTarget.value}
            >
              <option value="all">All staff</option>
              {#each employees as employee}
                <option value={employee.employeeCode}>{employee.name} ({employee.employeeNumber || employee.employeeCode})</option>
              {/each}
            </select>
          </ac-staff-filter>

          <ac-staff-filter>
            <label for="calendar-timezone-filter">Calendar timezone</label>
            <select
              id="calendar-timezone-filter"
              value={calendarTimezone}
              on:change={(event) => calendarTimezone = event.currentTarget.value}
            >
              {#each timezoneOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </ac-staff-filter>
        </ac-select-filters>
      </ac-calendar-filters>

      {#if activeView === 'hours'}
        <ac-hours-shell>
          <ac-hours-toolbar>
            <button type="button" variant="secondary" aria-label="Previous day" on:click={() => moveDay(-1)}>
              Previous
            </button>
            <strong>{dayLabel}</strong>
            <input type="date" value={selectedDateValue} on:change={updateSelectedDate} aria-label="Hours view date" />
            <button type="button" variant="secondary" aria-label="Next day" on:click={() => moveDay(1)}>
              Next
            </button>
          </ac-hours-toolbar>

          <ac-hours-scroll>
            <ac-hours-grid style={`--ac-shift-count: ${Math.max(dayShifts.length, 1)}; --ac-hour-count: ${hours.length};`}>
              <ac-hours-label></ac-hours-label>
              {#each hours as hour}
                <ac-hour-header>{String(hour).padStart(2, '0')}:00</ac-hour-header>
              {/each}

              {#if dayShifts.length}
                {#each dayShifts as shift}
                  <ac-shift-name>
                    <strong>{shift.employeeName}</strong>
                    <span>{shiftTimeLabel(shift)}</span>
                  </ac-shift-name>
                  <ac-shift-track>
                    <ac-shift-bar class={shift.css} style={shiftBarStyle(shift)}>
                      <strong>{shift.employeeName}</strong>
                      <span>{shiftTimeLabel(shift)}</span>
                    </ac-shift-bar>
                  </ac-shift-track>
                {/each}
              {:else}
                <ac-hours-empty>No shifts start on this day.</ac-hours-empty>
              {/if}
            </ac-hours-grid>
          </ac-hours-scroll>
        </ac-hours-shell>
      {:else}
        <ac-calendar-shell view={activeView} bind:this={calendarShellElement}>
          <Willow>
            <Calendar
              {date}
              events={displayedEvents}
              views={calendarViews}
              view={activeView}
              readonly
              onnavigateto={handleCalendarNavigate}
              onselectevent={handleCalendarEventSelect}
            />
          </Willow>
        </ac-calendar-shell>
      {/if}

      {#if eventTypes.length}
        <ac-calendar-legend aria-label="Event type colours">
          {#each eventTypes as item}
            <span>
              <i class={item.css} aria-hidden="true"></i>
              {item.label}
            </span>
          {/each}
        </ac-calendar-legend>
      {/if}
    </ac-scheduling-layout>
  {/if}
</AppShell>

<Modal open={modalOpen} title={modalEvent?.id ? 'Edit event' : 'Add event'} onClose={closeModal}>
  <EventForm
    eventRecord={modalEvent}
    {employees}
    saving={savingEvent}
    {saveError}
    onSave={handleSaveEvent}
    onCancel={closeModal}
  />
</Modal>

<style>
  ac-scheduling-layout {
    display: grid;
    gap: calc(var(--ac-space) * 4);
  }

  ac-scheduling-toolbar,
  ac-view-switcher,
  ac-filter-group,
  ac-calendar-filters,
  ac-hours-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: calc(var(--ac-space) * 3);
  }

  ac-view-switcher button[aria-pressed="true"] {
    background: var(--ac-color-red);
  }

  ac-scheduling-toolbar,
  ac-calendar-filters {
    justify-content: space-between;
  }

  ac-select-filters {
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-end;
    gap: var(--ac-space);
  }

  ac-filter-group button[aria-pressed="true"] {
    background: var(--ac-color-red);
  }

  ac-staff-filter {
    display: grid;
    width: min(13rem, 100%);
    gap: calc(var(--ac-space) * 2);
  }

  ac-calendar-shell {
    display: block;
    height: min(48rem, calc(100vh - 11rem));
    min-height: 36rem;
    border: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper-hard);
    overflow: hidden;
  }

  ac-calendar-shell :global(.wx-willow-theme) {
    height: 100%;
    --wx-border-radius: 0;
    --wx-color-primary: var(--ac-color-red);
    --wx-color-primary-font: var(--ac-color-paper-hard);
    --wx-color-font: var(--ac-color-ink);
    --wx-color-font-alt: var(--ac-color-ink-soft);
    --wx-border: var(--ac-border-width) solid var(--ac-color-line);
    --wx-calendar-grid-color: var(--ac-color-steel);
    --wx-calendar-weekend-background: var(--ac-color-paper);
    font-family: var(--ac-font-sans);
  }

  ac-calendar-shell :global(.wx-calendar) {
    height: 100%;
  }

  ac-calendar-shell :global(.wx-box-event),
  ac-calendar-shell :global(.wx-bar-event) {
    border: var(--ac-border-width) solid var(--ac-color-line);
    border-radius: 0;
    box-shadow: none;
    font-weight: 900;
  }

  ac-calendar-shell[view="month"] :global(.wx-bar-time) {
    display: none;
  }

  ac-calendar-shell :global(.ac-calendar-event-color-1),
  ac-hours-shell :global(.ac-calendar-event-color-1),
  ac-calendar-legend :global(.ac-calendar-event-color-1) {
    background: #7f1111;
    color: #fffdf7;
  }

  ac-calendar-shell :global(.ac-calendar-event-color-2),
  ac-hours-shell :global(.ac-calendar-event-color-2),
  ac-calendar-legend :global(.ac-calendar-event-color-2) {
    background: #0f5c56;
    color: #fffdf7;
  }

  ac-calendar-shell :global(.ac-calendar-event-color-3),
  ac-hours-shell :global(.ac-calendar-event-color-3),
  ac-calendar-legend :global(.ac-calendar-event-color-3) {
    background: #5c3b0f;
    color: #fffdf7;
  }

  ac-calendar-shell :global(.ac-calendar-event-color-4),
  ac-hours-shell :global(.ac-calendar-event-color-4),
  ac-calendar-legend :global(.ac-calendar-event-color-4) {
    background: #193f7a;
    color: #fffdf7;
  }

  ac-calendar-shell :global(.ac-calendar-event-color-5),
  ac-hours-shell :global(.ac-calendar-event-color-5),
  ac-calendar-legend :global(.ac-calendar-event-color-5) {
    background: #33302c;
    color: #fffdf7;
  }

  ac-calendar-shell :global(.ac-calendar-event-color-6),
  ac-hours-shell :global(.ac-calendar-event-color-6),
  ac-calendar-legend :global(.ac-calendar-event-color-6) {
    background: #52236b;
    color: #fffdf7;
  }

  ac-calendar-shell :global(.ac-calendar-event-color-7),
  ac-hours-shell :global(.ac-calendar-event-color-7),
  ac-calendar-legend :global(.ac-calendar-event-color-7) {
    background: #6b2e19;
    color: #fffdf7;
  }

  ac-calendar-shell :global(.ac-calendar-event-color-8),
  ac-hours-shell :global(.ac-calendar-event-color-8),
  ac-calendar-legend :global(.ac-calendar-event-color-8) {
    background: #2f5f1f;
    color: #fffdf7;
  }

  ac-calendar-legend {
    display: flex;
    flex-wrap: wrap;
    gap: calc(var(--ac-space) * 3);
  }

  ac-calendar-legend span {
    display: inline-flex;
    align-items: center;
    gap: calc(var(--ac-space) * 2);
    font-size: 0.875rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  ac-calendar-legend i {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: var(--ac-border-width) solid var(--ac-color-line);
  }

  ac-hours-shell {
    display: grid;
    gap: calc(var(--ac-space) * 4);
    border: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper-hard);
    padding: calc(var(--ac-space) * 4);
  }

  ac-hours-toolbar strong {
    font-weight: 900;
  }

  ac-hours-toolbar input {
    width: auto;
    min-width: 11rem;
  }

  ac-hours-scroll {
    display: block;
    overflow-x: auto;
    border: var(--ac-border-width) solid var(--ac-color-line);
  }

  ac-hours-grid {
    display: grid;
    min-width: 76rem;
    grid-template-columns: 12rem repeat(var(--ac-hour-count), minmax(3.75rem, 1fr));
    grid-template-rows: 3rem repeat(var(--ac-shift-count), 3.75rem);
    background:
      repeating-linear-gradient(
        to right,
        transparent 0,
        transparent calc((100% - 12rem) / var(--ac-hour-count) - var(--ac-border-width)),
        var(--ac-color-steel) calc((100% - 12rem) / var(--ac-hour-count) - var(--ac-border-width)),
        var(--ac-color-steel) calc((100% - 12rem) / var(--ac-hour-count))
      );
  }

  ac-hours-label,
  ac-hour-header,
  ac-shift-name,
  ac-hours-empty {
    display: flex;
    align-items: center;
    border-block-end: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper-hard);
    padding-inline: calc(var(--ac-space) * 3);
  }

  ac-hours-label,
  ac-hour-header {
    position: sticky;
    top: 0;
    z-index: 2;
    border-block-end: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-ink);
    color: var(--ac-color-paper-hard);
    font-size: 0.75rem;
    font-weight: 900;
  }

  ac-hours-label {
    left: 0;
    z-index: 3;
    grid-column: 1;
  }

  ac-hour-header {
    justify-content: center;
  }

  ac-shift-name {
    position: sticky;
    left: 0;
    z-index: 1;
    grid-column: 1;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: var(--ac-space);
    border-inline-end: var(--ac-border-width) solid var(--ac-color-line);
  }

  ac-shift-name strong,
  ac-shift-bar strong {
    font-size: 0.875rem;
    font-weight: 900;
  }

  ac-shift-name span,
  ac-shift-bar span {
    font-size: 0.75rem;
    font-weight: 700;
  }

  ac-shift-track {
    position: relative;
    display: block;
    grid-column: 2 / -1;
    min-width: 0;
    border-block-end: var(--ac-border-width) solid var(--ac-color-line);
  }

  ac-shift-bar {
    position: absolute;
    inset-block-start: calc(var(--ac-space) * 2);
    display: flex;
    height: calc(100% - var(--ac-space) * 4);
    min-width: 4rem;
    flex-direction: column;
    justify-content: center;
    border: var(--ac-border-width) solid var(--ac-color-line);
    padding-inline: calc(var(--ac-space) * 3);
    overflow: hidden;
    white-space: nowrap;
  }

  ac-hours-empty {
    grid-column: 1 / -1;
    justify-content: center;
    color: var(--ac-color-ink-soft);
    font-weight: 900;
  }

  @media (max-width: 780px) {
    ac-calendar-shell {
      height: 38rem;
      min-height: 0;
    }

    ac-hours-toolbar {
      align-items: stretch;
    }

    ac-filter-group,
    ac-scheduling-toolbar,
    ac-scheduling-toolbar > button,
    ac-calendar-filters,
    ac-select-filters,
    ac-hours-toolbar input,
    ac-staff-filter,
    ac-hours-toolbar button {
      width: 100%;
    }

    ac-select-filters {
      flex-wrap: wrap;
    }
  }
</style>
