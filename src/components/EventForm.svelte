<script>
  export let eventRecord = null;
  export let employees = [];
  export let saving = false;
  export let saveError = '';
  export let onSave = () => {};
  export let onCancel = () => {};

  const eventTypeOptions = [
    { value: 'shift', label: 'Shift' },
    { value: 'shift-open', label: 'Available Shift' },
    { value: 'medical', label: 'Medical appointment' },
    { value: 'check-in', label: 'Check in' },
    { value: 'check-out', label: 'Check out' },
  ];

  let draft = makeDraft(eventRecord);
  let lastDraftKey = draftKey(eventRecord);

  $: currentDraftKey = draftKey(eventRecord);
  $: if (currentDraftKey !== lastDraftKey) {
    draft = makeDraft(eventRecord);
    lastDraftKey = currentDraftKey;
  }
  $: wasAvailableShift = draftRecordEventType(eventRecord) === 'shift-open';
  $: isNewEvent = !eventRecord?.id;
  $: availableShiftSelected = draft.eventType === 'shift-open';
  $: visibleEventTypeOptions = eventTypeOptions.filter((option) => option.value !== 'shift-open' || isNewEvent || wasAvailableShift);
  $: endLocked = ['check-in', 'check-out'].includes(draft.eventType);
  $: employeeRequired = !availableShiftSelected;

  function draftKey(record) {
    if (!record) return 'empty';
    return [
      record.id || 'new',
      record.start?.getTime?.() || record.start || '',
      record.end?.getTime?.() || record.end || '',
      record.eventType || '',
      record.employeeCode || '',
    ].join(':');
  }

  function makeDraft(record) {
    const start = record?.start || defaultStart();
    const eventType = record?.eventTypeValue || normalizeEventType(record?.eventType) || 'shift';
    const end = ['check-in', 'check-out'].includes(eventType)
      ? start
      : record?.end || new Date(start.getTime() + 8 * 60 * 60 * 1000);

    return {
      employeeCode: eventType === 'shift-open' ? '' : record?.employeeCode || '',
      eventType,
      start: toDateTimeInput(start),
      end: toDateTimeInput(end),
      notes: record?.notes || '',
    };
  }

  function defaultStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9);
  }

  function normalizeEventType(value) {
    const type = String(value || '').trim();
    if (type === 'Shift') return 'shift';
    if (type.toLowerCase() === 'check in') return 'check-in';
    if (type.toLowerCase() === 'check out') return 'check-out';
    return type;
  }

  function draftRecordEventType(record) {
    return record?.eventTypeValue || normalizeEventType(record?.eventType);
  }

  function toDateTimeInput(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (part) => String(part).padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function setDraftValue(field, value) {
    draft = { ...draft, [field]: value };

    if (field === 'eventType' && value === 'shift-open') {
      draft = { ...draft, employeeCode: '' };
    }

    if ((field === 'eventType' && ['check-in', 'check-out'].includes(value)) || (field === 'start' && endLocked)) {
      draft = { ...draft, end: draft.start };
    }
  }

  function handleSubmit() {
    const start = new Date(draft.start);
    const end = endLocked ? start : new Date(draft.end);

    onSave({
      id: eventRecord?.id || null,
      employeeCode: draft.employeeCode,
      eventType: draft.eventType,
      start,
      end,
      notes: draft.notes.trim(),
    });
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <ac-form-grid>
    <ac-field>
      <label for="event-employee">Employee</label>
      <select
        id="event-employee"
        required={employeeRequired}
        value={draft.employeeCode}
        on:change={(event) => setDraftValue('employeeCode', event.currentTarget.value)}
        disabled={availableShiftSelected}
      >
        {#if availableShiftSelected}
          <option value="">N/A</option>
        {:else}
          <option value="" disabled>Select employee</option>
        {/if}
        {#each employees as employee}
          <option value={employee.employeeCode}>{employee.name} ({employee.employeeNumber || employee.employeeCode})</option>
        {/each}
      </select>
    </ac-field>

    <ac-field>
      <label for="event-type">Event type</label>
      <select
        id="event-type"
        required
        value={draft.eventType}
        on:change={(event) => setDraftValue('eventType', event.currentTarget.value)}
      >
        {#each visibleEventTypeOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </ac-field>

    <ac-field>
      <label for="event-start">Start</label>
      <input
        id="event-start"
        type="datetime-local"
        required
        value={draft.start}
        on:input={(event) => setDraftValue('start', event.currentTarget.value)}
      />
    </ac-field>

    {#if !endLocked}
      <ac-field>
        <label for="event-end">End</label>
        <input
          id="event-end"
          type="datetime-local"
          required
          value={draft.end}
          on:input={(event) => setDraftValue('end', event.currentTarget.value)}
        />
      </ac-field>
    {/if}

    <ac-field span="full">
      <label for="event-notes">Notes</label>
      <textarea
        id="event-notes"
        rows="4"
        value={draft.notes}
        on:input={(event) => setDraftValue('notes', event.currentTarget.value)}
      ></textarea>
    </ac-field>
  </ac-form-grid>

  {#if saveError}
    <ac-form-error>{saveError}</ac-form-error>
  {/if}

  <ac-form-actions>
    <button type="button" variant="secondary" on:click={onCancel}>Cancel</button>
    <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save event'}</button>
  </ac-form-actions>
</form>

<style>
  form {
    display: grid;
    gap: calc(var(--ac-space) * 4);
    padding: calc(var(--ac-space) * 4);
  }

  ac-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: calc(var(--ac-space) * 4);
  }

  ac-field {
    display: grid;
    gap: calc(var(--ac-space) * 2);
  }

  ac-field[span="full"] {
    grid-column: 1 / -1;
  }

  textarea {
    padding-block: calc(var(--ac-space) * 3);
    resize: vertical;
  }

  input:disabled,
  select:disabled {
    background: var(--ac-color-paper);
    color: var(--ac-color-ink-soft);
  }

  ac-form-error {
    display: block;
    border: var(--ac-border-width) solid var(--ac-color-red);
    background: var(--ac-color-red-wash);
    padding: calc(var(--ac-space) * 3);
    color: var(--ac-color-ink);
    font-weight: 900;
  }

  ac-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: calc(var(--ac-space) * 3);
  }

  @media (max-width: 780px) {
    ac-form-grid {
      grid-template-columns: 1fr;
    }

    ac-form-actions {
      align-items: stretch;
      flex-direction: column-reverse;
    }
  }
</style>
