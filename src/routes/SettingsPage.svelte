<script>
  import { onMount } from 'svelte';
  import AppShell from '../components/AppShell.svelte';
  import { isAdmin } from '../lib/auth.js';
  import { languageOptions, loadAppConfig, saveAppConfig, timezoneOptions } from '../lib/appConfig.js';

  export let pathname;
  export let user = null;
  export let onNavigate = () => {};
  export let onLogout = () => {};

  let kioskLockSeconds = '';
  let nextEmployeeNumber = '';
  let timezone = '';
  let defaultLanguage = '';
  let loadingConfig = true;
  let savingConfig = false;
  let configMessage = '';
  let configError = '';

  onMount(async () => {
    try {
      const config = await loadAppConfig();
      kioskLockSeconds = config.kioskLockSeconds ?? '';
      nextEmployeeNumber = config.nextEmployeeNumber;
      timezone = config.timezone;
      defaultLanguage = config.defaultLanguage;
    } catch (error) {
      configError = error?.message || 'App config could not be loaded.';
    } finally {
      loadingConfig = false;
    }
  });

  async function saveConfig() {
    savingConfig = true;
    configMessage = '';
    configError = '';

    try {
      const config = await saveAppConfig({
        kioskLockSeconds: kioskLockSeconds === '' ? null : kioskLockSeconds,
        nextEmployeeNumber,
        timezone,
        defaultLanguage,
      });
      kioskLockSeconds = config.kioskLockSeconds ?? '';
      nextEmployeeNumber = config.nextEmployeeNumber;
      timezone = config.timezone;
      defaultLanguage = config.defaultLanguage;
      configMessage = 'App config saved.';
    } catch (error) {
      configError = error?.message || 'App config could not be saved.';
    } finally {
      savingConfig = false;
    }
  }

  $: canEditAppConfig = isAdmin(user);
</script>

<AppShell eyebrow="Administration" title="Pontify settings" {pathname} {user} {onNavigate} {onLogout}>
  <ac-grid columns="two">
    <form on:submit|preventDefault={saveConfig}>
      <h2><ac-heading>App config</ac-heading></h2>
      <label for="kiosk-lock-seconds">Kiosk lock seconds</label>
      <input
        id="kiosk-lock-seconds"
        type="number"
        min="1"
        step="1"
        placeholder="Not set"
        bind:value={kioskLockSeconds}
        disabled={loadingConfig || savingConfig || !canEditAppConfig}
      >
      <label for="next-employee-number">Next employee ID number</label>
      <input
        id="next-employee-number"
        type="number"
        min="1"
        step="1"
        bind:value={nextEmployeeNumber}
        disabled={loadingConfig || savingConfig || !canEditAppConfig}
      >
      <label for="app-timezone">Timezone</label>
      <select
        id="app-timezone"
        bind:value={timezone}
        disabled={loadingConfig || savingConfig || !canEditAppConfig}
      >
        {#each timezoneOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <label for="app-default-language">Default language</label>
      <select
        id="app-default-language"
        bind:value={defaultLanguage}
        disabled={loadingConfig || savingConfig || !canEditAppConfig}
      >
        {#each languageOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <button type="submit" disabled={loadingConfig || savingConfig || !canEditAppConfig}>
        {savingConfig ? 'Saving...' : 'Save changes'}
      </button>
      {#if !canEditAppConfig}
        <ac-copy>Administrator access is required to edit app config.</ac-copy>
      {:else if configError}
        <ac-copy>{configError}</ac-copy>
      {:else if configMessage}
        <ac-copy>{configMessage}</ac-copy>
      {/if}
    </form>

    <ac-panel>
      <h2><ac-heading>App overview</ac-heading></h2>
      <ac-stack>
      {#each [
        ['Hosting emulator', 'Port 5002'],
        ['Emulator UI', 'Port 4000'],
        ['Auth mode', 'Firebase Auth'],
      ] as row}
        <ac-row variant="route">
          <span>{row[0]}</span>
          <strong>{row[1]}</strong>
        </ac-row>
      {/each}
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
</style>
