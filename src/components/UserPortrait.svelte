<script>
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import { loadUserProfile } from '../lib/userProfiles.js';
  import { uploadUserPortrait, userPortraitUrl } from '../lib/userPortraits.js';

  export let profileId = '';
  export let label = '';
  export let canEdit = false;
  export let editPresentation = 'inline';

  const dispatch = createEventDispatcher();

  let loadedProfileId = '';
  let imageUrl = '';
  let loading = false;
  let saving = false;
  let errorMessage = '';
  let modalOpen = false;
  let cameraInput;
  let libraryInput;

  function initials(value) {
    return String(value || profileId || 'AC')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  async function loadPortrait() {
    if (!profileId) {
      loadedProfileId = '';
      imageUrl = '';
      return;
    }

    loading = true;
    errorMessage = '';
    loadedProfileId = profileId;

    try {
      const profile = await loadUserProfile(profileId);
      imageUrl = await userPortraitUrl(profile);
    } catch (error) {
      imageUrl = '';
      errorMessage = error.message || 'Portrait could not be loaded.';
    } finally {
      loading = false;
    }
  }

  async function handlePortraitChange(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    saving = true;
    errorMessage = '';

    try {
      const portraitPath = await uploadUserPortrait(profileId, file);
      imageUrl = await userPortraitUrl({ portraitPath });
      dispatch('uploaded', { portraitPath });
    } catch (error) {
      errorMessage = error.message || 'Portrait could not be saved.';
    } finally {
      saving = false;
    }
  }

  function openModal() {
    if (canEdit && editPresentation === 'modal') {
      modalOpen = true;
    }
  }

  function closeModal() {
    modalOpen = false;
  }

  $: usesModalActions = canEdit && editPresentation === 'modal';

  $: if (profileId && profileId !== loadedProfileId) {
    loadPortrait();
  }
</script>

<ac-user-portrait aria-busy={loading || saving}>
  {#if usesModalActions}
    <button
      class="portrait-trigger"
      type="button"
      aria-label="Open profile photo"
      disabled={loading}
      on:click={openModal}
    >
      <ac-user-portrait-frame>
        {#if imageUrl}
          <img src={imageUrl} alt={label ? `${label} profile portrait` : 'Employee profile portrait'}>
        {:else}
          <span>{loading ? '' : initials(label)}</span>
        {/if}
      </ac-user-portrait-frame>
    </button>
  {:else}
    <ac-user-portrait-frame>
      {#if imageUrl}
        <img src={imageUrl} alt={label ? `${label} profile portrait` : 'Employee profile portrait'}>
      {:else}
        <span>{loading ? '' : initials(label)}</span>
      {/if}
    </ac-user-portrait-frame>
  {/if}

  {#if canEdit}
    <input
      bind:this={cameraInput}
      class="portrait-file-input"
      type="file"
      accept="image/*"
      capture="environment"
      on:change={handlePortraitChange}
    >
    <input
      bind:this={libraryInput}
      class="portrait-file-input"
      type="file"
      accept="image/*"
      on:change={handlePortraitChange}
    >

    {#if !usesModalActions}
      <ac-user-portrait-actions>
        <button class="portrait-camera-action" type="button" variant="secondary" disabled={saving || loading} on:click={() => cameraInput?.click()}>
          Camera
        </button>
        <button type="button" variant="secondary" disabled={saving || loading} on:click={() => libraryInput?.click()}>
          Upload
        </button>
      </ac-user-portrait-actions>
    {/if}
  {/if}

  {#if errorMessage}
    <ac-user-portrait-message role="alert">{errorMessage}</ac-user-portrait-message>
  {/if}
</ac-user-portrait>

<Modal open={modalOpen} title="Profile photo" onClose={closeModal}>
  <ac-user-portrait-modal>
    <ac-user-portrait-preview>
      {#if imageUrl}
        <img src={imageUrl} alt={label ? `${label} profile portrait` : 'Employee profile portrait'}>
      {:else}
        <span>{loading ? '' : initials(label)}</span>
      {/if}
    </ac-user-portrait-preview>

    <ac-user-portrait-actions>
      <button class="portrait-camera-action" type="button" variant="secondary" disabled={saving || loading} on:click={() => cameraInput?.click()}>
        Camera
      </button>
      <button type="button" variant="secondary" disabled={saving || loading} on:click={() => libraryInput?.click()}>
        Upload
      </button>
    </ac-user-portrait-actions>

    {#if errorMessage}
      <ac-user-portrait-message role="alert">{errorMessage}</ac-user-portrait-message>
    {/if}
  </ac-user-portrait-modal>
</Modal>

<style>
  ac-user-portrait {
    display: grid;
    gap: calc(var(--ac-space) * 2);
  }

  ac-user-portrait-frame {
    display: grid;
    width: 4rem;
    aspect-ratio: 1;
    place-items: center;
    overflow: hidden;
    border: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper);
    color: var(--ac-color-red-dark);
    font-weight: 900;
  }

  ac-user-portrait-frame img,
  ac-user-portrait-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .portrait-trigger {
    display: block;
    min-height: 0;
    border: 0;
    background: transparent;
    color: inherit;
    padding: 0;
  }

  .portrait-trigger:hover {
    background: transparent;
    color: inherit;
  }

  .portrait-trigger:disabled {
    cursor: wait;
  }

  ac-user-portrait-modal {
    display: grid;
    justify-items: center;
    gap: calc(var(--ac-space) * 4);
    padding: calc(var(--ac-space) * 5);
  }

  ac-user-portrait-preview {
    display: grid;
    width: min(18rem, 100%);
    aspect-ratio: 1;
    place-items: center;
    overflow: hidden;
    border: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper);
    color: var(--ac-color-red-dark);
    font-size: 3rem;
    font-weight: 900;
  }

  ac-user-portrait-actions {
    display: flex;
    flex-wrap: wrap;
    gap: calc(var(--ac-space) * 2);
  }

  ac-user-portrait-actions button {
    min-height: 2.25rem;
    padding-inline: calc(var(--ac-space) * 3);
    font-size: 0.75rem;
  }

  .portrait-camera-action {
    display: none;
  }

  ac-user-portrait-message {
    color: var(--ac-color-red-dark);
    font-size: 0.75rem;
    font-weight: 900;
  }

  .portrait-file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  @media (max-width: 780px) {
    .portrait-camera-action {
      display: inline-flex;
    }
  }
</style>
