<script>
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  export let address = {};
  export let index = 0;
  export let onUpdate = null;
  export let onDelete = null;

  const dispatch = createEventDispatcher();
  let editing = false;
  let draftAddress = address;

  const fields = [
    ['postalCode', 'CEP', 'text'],
    ['street', 'Street', 'text'],
    ['number', 'Number', 'text'],
    ['complement', 'Complement', 'text'],
    ['neighborhood', 'Neighbourhood', 'text'],
    ['city', 'City', 'text'],
    ['state', 'State', 'text'],
  ];

  const booleanFields = [
    ['default', 'Default address'],
    ['isHomeAddress', 'Home address'],
    ['isCommunityAddress', 'Community address'],
    ['canReceiveMail', 'Can receive mail'],
  ];

  function valueFor(key) {
    const value = (editing ? draftAddress : address)?.[key];
    return value === null || value === undefined ? '' : String(value);
  }

  function updateValue(key, value) {
    draftAddress = {
      ...draftAddress,
      [key]: value,
    };
    emitUpdate({
      index,
      address: draftAddress,
    });
  }

  function updateBoolean(key, checked) {
    draftAddress = {
      ...draftAddress,
      [key]: checked,
    };
    emitUpdate({
      index,
      address: draftAddress,
    });
  }

  function emitUpdate(detail) {
    onUpdate?.(detail);
    dispatch('update', detail);
  }

  function deleteAddress() {
    const detail = { index };
    onDelete?.(detail);
    dispatch('delete', detail);
  }

  $: if (!editing) {
    draftAddress = address;
  }

  $: addressLine = [
    valueFor('street'),
    valueFor('number'),
    valueFor('complement'),
  ].filter(Boolean).join(', ');

  $: localityLine = [
    valueFor('neighborhood'),
    valueFor('city'),
    valueFor('state'),
    valueFor('postalCode'),
  ].filter(Boolean).join(', ');
</script>

<ac-card variant="profile-array">
  <ac-card-header>
    <div>
      <strong>{addressLine || `Address ${index + 1}`}</strong>
      <span>{localityLine || 'No address details'}</span>
    </div>
    <ac-row>
      <button type="button" variant="secondary" aria-label={`Edit address ${addressLine || index + 1}`} on:click={() => (editing = true)}>
        Edit
      </button>
      <button type="button" variant="secondary" on:click={deleteAddress}>
        Delete
      </button>
    </ac-row>
  </ac-card-header>
</ac-card>

<Modal open={editing} title="Edit address" onClose={() => (editing = false)}>
  <ac-card-fields>
    {#each fields as [key, label, type]}
      <ac-field>
        <label for={`address-${index}-${key}`}>{label}</label>
        <input
          id={`address-${index}-${key}`}
          {type}
          value={valueFor(key)}
          on:input={(event) => updateValue(key, event.currentTarget.value)}
        >
      </ac-field>
    {/each}

    <ac-card-checkboxes>
      {#each booleanFields as [key, label]}
        <label class="checkbox-field" for={`address-${index}-${key}`}>
          <input
            id={`address-${index}-${key}`}
            type="checkbox"
            checked={draftAddress?.[key] === true}
            on:change={(event) => updateBoolean(key, event.currentTarget.checked)}
          >
          {label}
        </label>
      {/each}
    </ac-card-checkboxes>
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
  ac-field,
  ac-card-checkboxes {
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

    ac-card-fields {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    ac-card-checkboxes {
      grid-column: 1 / -1;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
