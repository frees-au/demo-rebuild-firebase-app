<script>
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  export let telephone = {};
  export let index = 0;
  export let onUpdate = null;
  export let onDelete = null;

  const dispatch = createEventDispatcher();
  let editing = false;
  let draftTelephone = telephone;

  function valueFor(key) {
    const value = (editing ? draftTelephone : telephone)?.[key];
    return value === null || value === undefined ? '' : String(value);
  }

  function updateValue(key, value) {
    draftTelephone = {
      ...draftTelephone,
      [key]: value,
    };
    emitUpdate({
      index,
      telephone: draftTelephone,
    });
  }

  function updateBoolean(key, checked) {
    draftTelephone = {
      ...draftTelephone,
      [key]: checked,
    };
    emitUpdate({
      index,
      telephone: draftTelephone,
    });
  }

  function emitUpdate(detail) {
    onUpdate?.(detail);
    dispatch('update', detail);
  }

  function deleteTelephone() {
    const detail = { index };
    onDelete?.(detail);
    dispatch('delete', detail);
  }

  $: if (!editing) {
    draftTelephone = telephone;
  }
</script>

<ac-card variant="profile-array">
  <ac-card-header>
    <div>
      <strong>{valueFor('label') || `Telephone ${index + 1}`}</strong>
      <span>{valueFor('telephone') || 'No number'}</span>
    </div>
    <ac-row>
      <button type="button" variant="secondary" aria-label={`Edit telephone ${valueFor('label') || index + 1}`} on:click={() => (editing = true)}>
        Edit
      </button>
      <button type="button" variant="secondary" on:click={deleteTelephone}>
        Delete
      </button>
    </ac-row>
  </ac-card-header>
</ac-card>

<Modal open={editing} title="Edit telephone" onClose={() => (editing = false)}>
  <ac-card-fields>
    <ac-field>
      <label for={`telephone-${index}-label`}>Label</label>
      <input
        id={`telephone-${index}-label`}
        type="text"
        value={valueFor('label')}
        on:input={(event) => updateValue('label', event.currentTarget.value)}
      >
    </ac-field>

    <ac-field>
      <label for={`telephone-${index}-number`}>Telephone</label>
      <input
        id={`telephone-${index}-number`}
        type="tel"
        value={valueFor('telephone')}
        on:input={(event) => updateValue('telephone', event.currentTarget.value)}
      >
    </ac-field>

    <label class="checkbox-field" for={`telephone-${index}-default`}>
      <input
        id={`telephone-${index}-default`}
        type="checkbox"
        checked={draftTelephone?.default === true}
        on:change={(event) => updateBoolean('default', event.currentTarget.checked)}
      >
      Default telephone
    </label>
  </ac-card-fields>
</Modal>

<style>
  ac-card[variant="profile-array"] {
    display: grid;
    gap: calc(var(--ac-space) * 4);
    border: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper);
    padding: calc(var(--ac-space) * 4);
  }

  ac-card-header {
    display: grid;
    gap: calc(var(--ac-space) * 3);
  }

  ac-card-header strong,
  ac-card-header span {
    display: block;
  }

  ac-card-header strong {
    font-weight: 900;
    text-transform: uppercase;
  }

  ac-card-header span {
    color: var(--ac-color-ink-soft);
  }

  ac-card-fields,
  ac-field {
    display: grid;
    gap: calc(var(--ac-space) * 3);
  }

  ac-card-fields {
    border-block-start: var(--ac-border-width) solid var(--ac-color-line);
    padding: calc(var(--ac-space) * 4);
  }

  .checkbox-field {
    display: flex;
    align-items: center;
    gap: calc(var(--ac-space) * 3);
  }

  .checkbox-field input {
    width: 1.25rem;
    min-height: 1.25rem;
  }

  @media (min-width: 768px) {
    ac-card-header {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
    }
  }
</style>
