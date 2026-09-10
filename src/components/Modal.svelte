<script>
  export let open = false;
  export let title = '';
  export let onClose = () => {};

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(event) {
    if (open && event.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <ac-modal-backdrop role="presentation" on:click={handleBackdropClick}>
    <ac-modal role="dialog" aria-modal="true" aria-labelledby="ac-modal-title" tabindex="-1">
      <ac-modal-header>
        <h2 id="ac-modal-title">{title}</h2>
        <button type="button" variant="secondary" aria-label="Close modal" on:click={onClose}>Close</button>
      </ac-modal-header>
      <slot></slot>
    </ac-modal>
  </ac-modal-backdrop>
{/if}

<style>
  ac-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    overflow-y: auto;
    background: rgb(9 9 9 / 0.62);
    padding: calc(var(--ac-space) * 5);
  }

  ac-modal {
    display: grid;
    width: min(42rem, 100%);
    max-height: calc(100vh - var(--ac-space) * 10);
    overflow-y: auto;
    border: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper-hard);
  }

  ac-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: calc(var(--ac-space) * 4);
    border-block-end: var(--ac-border-width) solid var(--ac-color-line);
    padding: calc(var(--ac-space) * 4);
  }

  ac-modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  @media (max-width: 780px) {
    ac-modal-backdrop {
      align-items: start;
      padding: calc(var(--ac-space) * 3);
    }

    ac-modal-header {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
