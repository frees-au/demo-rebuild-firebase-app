<script>
  import { onMount } from 'svelte';
  import AppShell from '../components/AppShell.svelte';
  import { loadUpcomingShiftEventsForEmployee, shiftTimeLabel } from '../lib/events.js';

  export let pathname;
  export let user = null;
  export let onNavigate = () => {};
  export let onLogout = () => {};

  let events = [];
  let loadState = 'loading';
  let loadError = '';

  $: profileId = user?.uid || '';
  $: shifts = events;
  $: nextShift = shifts[0] || null;
  $: laterShifts = shifts.slice(1);

  onMount(async () => {
    try {
      events = await loadUpcomingShiftEventsForEmployee(profileId);
      loadState = 'ready';
    } catch (error) {
      loadError = error.message || 'Shifts could not be loaded.';
      loadState = 'error';
    }
  });

  function dateLabel(value) {
    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(value);
  }

  function compactDateLabel(value) {
    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(value);
  }
</script>

<AppShell eyebrow="Employee" title="Upcoming shifts" {pathname} {user} {onNavigate} {onLogout}>
  {#if loadState === 'loading'}
    <ac-panel>Loading shifts...</ac-panel>
  {:else if loadState === 'error'}
    <ac-panel emphasis="alert" role="alert">{loadError}</ac-panel>
  {:else if !profileId}
    <ac-panel emphasis="alert" role="alert">
      This account is not linked to an employee profile.
    </ac-panel>
  {:else if !shifts.length}
    <ac-panel surface="paper">
      No upcoming shifts found.
    </ac-panel>
  {:else}
    <ac-my-shifts-layout>
      <ac-panel>
        <ac-shift-summary>
          <div>
            <ac-eyebrow>Next shift</ac-eyebrow>
            <h2><ac-heading>{dateLabel(nextShift.start)}</ac-heading></h2>
            <strong>{shiftTimeLabel(nextShift)}</strong>
            {#if nextShift.notes}
              <ac-copy>{nextShift.notes}</ac-copy>
            {/if}
          </div>
        </ac-shift-summary>
      </ac-panel>

      <ac-panel>
        <h2><ac-heading compact>Schedule</ac-heading></h2>
        {#if laterShifts.length}
          <ac-shift-list>
            {#each laterShifts as shift}
              <ac-shift-item>
                <div>
                  <strong>{compactDateLabel(shift.start)}</strong>
                  <span>{shiftTimeLabel(shift)}</span>
                </div>
                {#if shift.notes}
                  <ac-copy>{shift.notes}</ac-copy>
                {/if}
              </ac-shift-item>
            {/each}
          </ac-shift-list>
        {:else}
          <ac-panel surface="paper">No later shifts found.</ac-panel>
        {/if}
      </ac-panel>
    </ac-my-shifts-layout>
  {/if}
</AppShell>

<style>
  ac-my-shifts-layout,
  ac-shift-list {
    display: grid;
    gap: calc(var(--ac-space) * 4);
  }

  ac-shift-summary {
    display: block;
  }

  ac-shift-summary strong {
    display: block;
    margin-block: calc(var(--ac-space) * 3);
    color: var(--ac-color-red);
    font-size: 2rem;
    font-weight: 900;
    line-height: 1;
  }

  ac-shift-item {
    display: grid;
    gap: calc(var(--ac-space) * 2);
    border-block-start: var(--ac-border-width) solid var(--ac-color-line);
    padding-block-start: calc(var(--ac-space) * 4);
  }

  ac-shift-item div {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: calc(var(--ac-space) * 3);
  }

  ac-shift-item strong {
    font-size: 1.125rem;
    font-weight: 900;
  }

  ac-shift-item span {
    color: var(--ac-color-ink-soft);
    font-weight: 900;
  }

  @media (min-width: 900px) {
    ac-my-shifts-layout {
      grid-template-columns: minmax(18rem, 0.85fr) minmax(0, 1.15fr);
      align-items: start;
    }
  }
</style>
