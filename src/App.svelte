<script>
  import { onMount } from 'svelte';
  import { authState, canUseAdminPages, isAdmin, isAllowedEmail, logOut } from './lib/auth.js';
  import { loadAppConfig } from './lib/appConfig.js';
  import { enableKioskMode } from './lib/kiosk.js';
  import { applyThemeColors } from './lib/theme.js';
  import { adminPath, getRoute, isAdminPath, isKioskPath, isLoginPath, isOnboardingPath, isProtectedPath, loginPath, myShiftsPath, normalizePath, onboardingPath } from './routes.js';

  let pathname = normalizePath(window.location.pathname);
  let CurrentRoute = getRoute(pathname);
  let kioskLogoutPending = false;
  let loadingOverlayVisible = false;

  const clickFeedbackDelay = 450;
  const clickFeedbackSettle = 400;
  const clickFeedbackMaximum = 6000;
  let clickFeedbackPending = false;
  let clickFeedbackChanged = false;
  let clickFeedbackDelayTimer;
  let clickFeedbackSettleTimer;
  let clickFeedbackMaximumTimer;

  function goTo(path) {
    const normalizedPath = normalizePath(path);
    if (normalizedPath === pathname) return;

    history.pushState({}, '', normalizedPath);
    pathname = normalizedPath;
    CurrentRoute = getRoute(pathname);
  }

  function clearClickFeedbackTimers() {
    clearTimeout(clickFeedbackDelayTimer);
    clearTimeout(clickFeedbackSettleTimer);
    clearTimeout(clickFeedbackMaximumTimer);
  }

  function hideClickFeedback() {
    clearClickFeedbackTimers();
    clickFeedbackPending = false;
    clickFeedbackChanged = false;
    loadingOverlayVisible = false;
  }

  function settleClickFeedback() {
    clearTimeout(clickFeedbackSettleTimer);
    clickFeedbackSettleTimer = setTimeout(hideClickFeedback, clickFeedbackSettle);
  }

  function beginClickFeedback() {
    clearClickFeedbackTimers();
    clickFeedbackPending = true;
    clickFeedbackChanged = false;

    clickFeedbackDelayTimer = setTimeout(() => {
      if (!clickFeedbackPending || clickFeedbackChanged) {
        hideClickFeedback();
        return;
      }

      loadingOverlayVisible = true;
      clickFeedbackMaximumTimer = setTimeout(hideClickFeedback, clickFeedbackMaximum);
    }, clickFeedbackDelay);
  }

  function isActionableClickTarget(target) {
    if (!(target instanceof Element)) return false;

    const action = target.closest('a, button, input[type="button"], input[type="submit"], [role="button"]');
    if (!action) return false;
    if (action.matches('a[aria-current="page"]')) return false;
    if (action.matches('[disabled], [aria-disabled="true"]')) return false;
    if (action.closest('[data-loading-overlay="false"]')) return false;

    return true;
  }

  function isOverlayMutation(mutation) {
    const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
    if (nodes.length) {
      return nodes.every((node) => node instanceof Element && node.matches('ac-loading-overlay, ac-loading-overlay *'));
    }

    return mutation.target instanceof Element && mutation.target.closest('ac-loading-overlay');
  }

  function noteClickFeedbackChange(mutations) {
    if (!clickFeedbackPending || mutations.every(isOverlayMutation)) return;

    clickFeedbackChanged = true;
    if (loadingOverlayVisible) {
      settleClickFeedback();
    } else {
      hideClickFeedback();
    }
  }

  function handleNavigate(path) {
    beginClickFeedback();
    goTo(path);
  }

  async function handleLogout() {
    beginClickFeedback();
    try {
      await logOut();
      goTo(loginPath);
    } finally {
      hideClickFeedback();
    }
  }

  async function handleKioskLogout() {
    if (kioskLogoutPending) return;

    kioskLogoutPending = true;
    try {
      await enableKioskMode();
      await logOut();
    } catch (error) {
      console.error('Kiosk mode could not be started.', error);
      await logOut();
    } finally {
      kioskLogoutPending = false;
      goTo(loginPath);
    }
  }

  onMount(() => {
    loadAppConfig()
      .then((config) => applyThemeColors(config.themeColors))
      .catch((error) => {
        console.warn('App config could not be loaded.', error);
      });

    const onPopState = () => {
      pathname = normalizePath(window.location.pathname);
      CurrentRoute = getRoute(pathname);
    };

    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!isActionableClickTarget(event.target)) return;

      beginClickFeedback();
    };

    const observer = new MutationObserver(noteClickFeedbackChange);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });

    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onClick, { capture: true });
    return () => {
      clearClickFeedbackTimers();
      observer.disconnect();
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClick, { capture: true });
    };
  });

  $: authReady = $authState.ready;
  $: user = $authState.user;
  $: needsOnboarding = Boolean(authReady && user && !user.acClaims?.onboarded);

  $: if (authReady && !user && !isLoginPath(pathname) && !isKioskPath(pathname)) {
    goTo(loginPath);
  }

  $: if (authReady && user && !isAllowedEmail(user.email)) {
    handleLogout();
  }

  $: if (authReady && user && isLoginPath(pathname)) {
    goTo(myShiftsPath);
  }

  $: if (needsOnboarding && !isOnboardingPath(pathname)) {
    goTo(onboardingPath);
  }

  $: if (authReady && user?.acClaims?.onboarded && isOnboardingPath(pathname)) {
    goTo(myShiftsPath);
  }

  $: if (authReady && user && isKioskPath(pathname) && canUseAdminPages(user)) {
    handleKioskLogout();
  }

  $: if (authReady && user && isKioskPath(pathname) && !canUseAdminPages(user)) {
    goTo(myShiftsPath);
  }

  $: if (authReady && user && !needsOnboarding && !canUseAdminPages(user) && isAdminPath(pathname)) {
    goTo(myShiftsPath);
  }

  $: if (authReady && user && !needsOnboarding && pathname === adminPath && !isAdmin(user)) {
    goTo(myShiftsPath);
  }
</script>

{#if (!authReady && (isProtectedPath(pathname) || isKioskPath(pathname))) || (authReady && user && isKioskPath(pathname))}
  <ac-page centered>
    <ac-panel>Checking account...</ac-panel>
  </ac-page>
{:else}
  <svelte:component this={CurrentRoute} {user} {pathname} onNavigate={handleNavigate} onLogout={handleLogout} />
{/if}

{#if loadingOverlayVisible}
  <ac-loading-overlay role="status" aria-live="polite" aria-label="Loading">
    <ac-loading-indicator aria-hidden="true"></ac-loading-indicator>
  </ac-loading-overlay>
{/if}
