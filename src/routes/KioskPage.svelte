<script>
  import { onMount } from 'svelte';
  import BrandLockup from '../components/BrandLockup.svelte';
  import { loadAppConfig } from '../lib/appConfig.js';
  import { loginPath } from '../routes.js';

  export let onNavigate = () => {};

  const kioskSessionKey = 'ac.kiosk.user';

  let kioskUser = null;
  let lockTimer = null;

  $: attendanceAction = kioskUser?.attendanceAction || 'check-in';
  $: attendanceLabel = attendanceAction === 'check-out' ? 'checked out' : 'checked in';

  onMount(() => {
    let active = true;
    const storedUser = sessionStorage.getItem(kioskSessionKey);

    if (!storedUser) {
      onNavigate(loginPath);
      return;
    }

    try {
      kioskUser = JSON.parse(storedUser);
    } catch (error) {
      sessionStorage.removeItem(kioskSessionKey);
      onNavigate(loginPath);
      return;
    }

    scheduleKioskLock(() => active);

    return () => {
      active = false;
      clearKioskLock();
    };
  });

  function endKioskSession() {
    clearKioskLock();
    sessionStorage.removeItem(kioskSessionKey);
    onNavigate(loginPath);
  }

  function clearKioskLock() {
    if (!lockTimer) return;

    clearTimeout(lockTimer);
    lockTimer = null;
  }

  async function scheduleKioskLock(isActive = () => true) {
    clearKioskLock();

    try {
      const { kioskLockSeconds } = await loadAppConfig();

      if (!isActive()) return;
      if (!kioskLockSeconds) return;

      lockTimer = setTimeout(endKioskSession, kioskLockSeconds * 1000);
    } catch (error) {
      console.error('Kiosk lock config could not be loaded.', error);
    }
  }
</script>

<ac-page variant="kiosk" aria-labelledby="kiosk-title">
  <ac-kiosk-screen>
    <ac-panel padding="large">
      <ac-stack>
        <ac-kiosk-result role="status" aria-live="polite">
          Successfully {attendanceLabel}.
        </ac-kiosk-result>

        <button type="button" variant="secondary" on:click={endKioskSession}>
          Finish
        </button>
      </ac-stack>
    </ac-panel>
  </ac-kiosk-screen>
</ac-page>
