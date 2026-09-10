<script>
  import AppShell from '../components/AppShell.svelte';
  import { deleteFirestoreDocument } from '../lib/admin.js';
  import { isAdmin } from '../lib/auth.js';

  export let pathname;
  export let user = null;
  export let onNavigate = () => {};
  export let onLogout = () => {};

  let documentPath = '';
  let confirmation = '';
  let recursive = false;
  let deleting = false;
  let deleteMessage = '';
  let deleteError = '';

  function documentPathError(path) {
    if (!path) return '';

    const parts = path.split('/').filter(Boolean);
    if (parts.length % 2 !== 0) return 'Use a document path with collection and document segments.';
    if (parts.some((part) => part === '.' || part === '..')) return 'Document path contains an invalid segment.';

    return '';
  }

  $: normalizedPath = String(documentPath || '').trim().replace(/^\/+|\/+$/g, '');
  $: validationError = documentPathError(normalizedPath);
  $: confirmationError = confirmation.trim() && confirmation.trim() !== normalizedPath
    ? 'Confirmation must match the document path.'
    : '';
  $: visibleError = deleteError || validationError || confirmationError;
  $: canDelete = isAdmin(user)
    && normalizedPath
    && !validationError
    && confirmation.trim() === normalizedPath
    && !deleting;

  async function handleDelete() {
    deleting = true;
    deleteMessage = '';
    deleteError = '';

    try {
      const result = await deleteFirestoreDocument({
        path: normalizedPath,
        confirmation,
        recursive,
      });
      deleteMessage = `${result?.path || normalizedPath} deleted.`;
      documentPath = '';
      confirmation = '';
      recursive = false;
    } catch (error) {
      deleteError = error?.message || 'Firestore document could not be deleted.';
    } finally {
      deleting = false;
    }
  }
</script>

<AppShell eyebrow="Employee" title="Admin utilities" {pathname} {user} {onNavigate} {onLogout}>
  <ac-grid columns="two">
    <form on:submit|preventDefault={handleDelete}>
      <h2><ac-heading>Delete Firestore document</ac-heading></h2>

      <label for="firestore-document-path">Document path</label>
      <input
        id="firestore-document-path"
        type="text"
        placeholder="collection/document"
        bind:value={documentPath}
        disabled={deleting || !isAdmin(user)}
        autocomplete="off"
      >

      <label for="firestore-confirmation">Confirm path</label>
      <input
        id="firestore-confirmation"
        type="text"
        placeholder={normalizedPath || 'Type the document path again'}
        bind:value={confirmation}
        disabled={deleting || !isAdmin(user)}
        autocomplete="off"
      >

      <label class="checkbox-row" for="firestore-recursive-delete">
        <input
          id="firestore-recursive-delete"
          type="checkbox"
          bind:checked={recursive}
          disabled={deleting || !isAdmin(user)}
        >
        <span>Delete subcollections too</span>
      </label>

      <button type="submit" disabled={!canDelete}>
        {deleting ? 'Deleting...' : 'Delete document'}
      </button>

      {#if !isAdmin(user)}
        <ac-panel emphasis="alert" role="alert">Administrator access is required.</ac-panel>
      {:else if visibleError}
        <ac-panel emphasis="alert" role="alert">{visibleError}</ac-panel>
      {:else if deleteMessage}
        <ac-panel surface="paper" role="status">{deleteMessage}</ac-panel>
      {/if}
    </form>

    <ac-panel>
      <h2><ac-heading compact>Production safety</ac-heading></h2>
      <ac-stack>
        <ac-row variant="route">
          <span>Access</span>
          <strong>Admin only</strong>
        </ac-row>
        <ac-row variant="route">
          <span>Path format</span>
          <strong>collection/document</strong>
        </ac-row>
        <ac-row variant="route">
          <span>Subcollections</span>
          <strong>{recursive ? 'Included' : 'Left in place'}</strong>
        </ac-row>
      </ac-stack>
    </ac-panel>
  </ac-grid>
</AppShell>

<style>
  form {
    display: grid;
    gap: calc(var(--ac-space) * 3);
    border: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper-hard);
    padding: calc(var(--ac-space) * 5);
  }

  .checkbox-row {
    display: flex;
    gap: calc(var(--ac-space) * 3);
    align-items: center;
    text-transform: none;
  }

  .checkbox-row input {
    width: 1.25rem;
    min-height: 1.25rem;
  }
</style>
