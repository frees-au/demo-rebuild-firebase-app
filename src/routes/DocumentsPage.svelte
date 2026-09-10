<script>
  import AppShell from '../components/AppShell.svelte';
  import { canUseAdminPages, isAdmin } from '../lib/auth.js';
  import { addEmployeeDocument, documentDownloadUrl, listDocuments } from '../lib/documents.js';

  export let pathname;
  export let user = null;
  export let onNavigate = () => {};
  export let onLogout = () => {};

  let documents = [];
  let loading = true;
  let uploading = false;
  let openingDocumentId = '';
  let errorMessage = '';
  let successMessage = '';
  let loadedProfileId = '';
  let loadedSortBy = '';
  let sortBy = 'date';
  let fileInput;

  function currentUserProfileId() {
    return user?.uid;
  }

  function targetProfileIdFromPath(path) {
    const match = path.match(/^\/documents\/([^/]+)\/$/);
    return match ? decodeURIComponent(match[1]) : currentUserProfileId();
  }

  function formatDate(value) {
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);

    if (Number.isNaN(date.getTime())) return 'No date';

    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  function formatSize(bytes) {
    const size = Number(bytes);

    if (!Number.isFinite(size) || size <= 0) return 'Unknown size';

    return `${Math.ceil(size / 1024)} KB`;
  }

  async function loadLibrary() {
    if (!canViewDocuments) {
      documents = [];
      loading = false;
      loadedProfileId = targetProfileId || '';
      loadedSortBy = sortBy;
      return;
    }

    loading = true;
    errorMessage = '';
    successMessage = '';
    loadedProfileId = targetProfileId;
    loadedSortBy = sortBy;

    try {
      documents = await listDocuments(targetProfileId, sortBy);
    } catch (error) {
      errorMessage = error.message || 'Documents could not be loaded.';
    } finally {
      loading = false;
    }
  }

  async function handleFileChange(event) {
    const [file] = event.currentTarget.files || [];
    if (!file) return;

    uploading = true;
    errorMessage = '';
    successMessage = '';

    try {
      await addEmployeeDocument(targetProfileId, file);
      await loadLibrary();
      successMessage = 'Document added.';
    } catch (error) {
      errorMessage = error.message || 'Document could not be added.';
    } finally {
      uploading = false;
      event.currentTarget.value = '';
    }
  }

  async function openDocument(document) {
    openingDocumentId = document.id;
    errorMessage = '';

    try {
      window.open(await documentDownloadUrl(document), '_blank', 'noopener,noreferrer');
    } catch (error) {
      errorMessage = error.message || 'Document could not be opened.';
    } finally {
      openingDocumentId = '';
    }
  }

  $: targetProfileId = targetProfileIdFromPath(pathname);
  $: ownProfileId = currentUserProfileId();
  $: canViewDocuments = Boolean(user?.uid && targetProfileId && (targetProfileId === ownProfileId || canUseAdminPages(user)));
  $: isOwnLibrary = Boolean(user?.uid && targetProfileId === ownProfileId);
  $: canAddDocuments = Boolean(isOwnLibrary || isAdmin(user));
  $: if (user?.uid && targetProfileId && canViewDocuments && (targetProfileId !== loadedProfileId || sortBy !== loadedSortBy)) {
    loadLibrary();
  }
</script>

<AppShell eyebrow="Employee" title={isOwnLibrary ? 'Your documents' : 'Employee documents'} {pathname} {user} {onNavigate} {onLogout}>
  <ac-panel>
    <ac-row split wrap>
      <ac-row wrap>
        <label class="documents-sort-label" for="documents-sort">Sort</label>
        <select id="documents-sort" bind:value={sortBy} disabled={loading || uploading}>
          <option value="date">Date</option>
          <option value="title">Title</option>
        </select>

        {#if canAddDocuments}
          <input
            class="documents-file-input"
            bind:this={fileInput}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            on:change={handleFileChange}
          >
          <button type="button" disabled={uploading || !targetProfileId} on:click={() => fileInput?.click()}>
            {uploading ? 'Adding' : 'Add file'}
          </button>
        {/if}
      </ac-row>
    </ac-row>

    {#if errorMessage}
      <ac-panel emphasis="alert" role="alert">
        {errorMessage}
      </ac-panel>
    {/if}

    {#if successMessage}
      <ac-panel surface="paper" role="status">
        {successMessage}
      </ac-panel>
    {/if}

    {#if !canViewDocuments}
      <ac-panel emphasis="alert" role="alert">
        You cannot view this document library.
      </ac-panel>
    {:else if loading}
      <ac-panel surface="paper" aria-live="polite">
        Loading documents...
      </ac-panel>
    {:else if documents.length === 0}
      <ac-panel surface="paper">
        No documents found.
      </ac-panel>
    {:else}
      <table aria-label="Documents">
        <thead>
          <tr>
            <th>Title</th>
            <th>Date</th>
            <th>File</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each documents as document}
            <tr>
              <td>{document.title || document.fileName || 'Untitled document'}</td>
              <td>{formatDate(document.createdAt)}</td>
              <td>{formatSize(document.size)}</td>
              <td>
                <button
                  type="button"
                  variant="secondary"
                  disabled={openingDocumentId === document.id || !document.storagePath}
                  on:click={() => openDocument(document)}
                >
                  {openingDocumentId === document.id ? 'Opening' : 'Open'}
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </ac-panel>
</AppShell>

<style>
  ac-panel {
    display: grid;
    gap: calc(var(--ac-space) * 4);
  }

  ac-row {
    align-items: stretch;
    flex-direction: column;
  }

  ac-row ac-row {
    margin: 0;
  }

  select {
    min-width: 9rem;
  }

  .documents-sort-label,
  .documents-file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  @media (min-width: 640px) {
    ac-row {
      align-items: center;
      flex-direction: row;
    }
  }
</style>
