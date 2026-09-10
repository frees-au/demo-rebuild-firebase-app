<script>
  import { onMount, tick } from 'svelte';
  import BrandLockup from '../components/BrandLockup.svelte';
  import { getAuthErrorMessage, sendPasswordResetEmail, signInWithEmail, signInWithGoogle } from '../lib/auth.js';
  import { loadAppConfig } from '../lib/appConfig.js';
  import {
    kioskManagerLoginExpiresAt,
    loadKioskEmployees,
    matchKioskPin,
    setKioskManagerLoginWindow,
  } from '../lib/kiosk.js';
  import { kioskPath, myShiftsPath } from '../routes.js';

  const appVersion = __APP_VERSION__;
  const kioskSessionKey = 'ac.kiosk.user';

  export let onNavigate = () => {};

  let email = '';
  let password = '';
  let pin = '';
  let loginMessage = '';
  let kioskMessage = '';
  let matchedUser = null;
  let selectedEmployeeCode = '';
  let employees = [];
  let signingIn = false;
  let sendingPasswordReset = false;
  let checkingPin = false;
  let loadingEmployees = false;
  let employeeLoadAttempted = false;
  let kioskMode = false;
  let showManagerLogin = false;
  let managerLoginTimer = null;
  let pinInput;

  $: selectedEmployee = employees.find((employee) => employee.employeeCode === selectedEmployeeCode) || null;
  $: authBusy = signingIn || sendingPasswordReset;

  onMount(() => {
    syncManagerLoginWindow();

    if (!showManagerLogin && !employeeLoadAttempted) {
      loadEmployees();
    }

    return () => clearManagerLoginTimer();
  });

  $: if (!showManagerLogin && employees.length === 0 && !loadingEmployees && !employeeLoadAttempted) {
    loadEmployees();
  }

  function clearManagerLoginTimer() {
    if (!managerLoginTimer) return;

    clearTimeout(managerLoginTimer);
    managerLoginTimer = null;
  }

  function showKioskLogin() {
    showManagerLogin = false;
    pin = '';
    kioskMessage = '';
    selectedEmployeeCode = '';
    employeeLoadAttempted = false;
    loadEmployees();
  }

  function closeKioskPinOverlay() {
    if (checkingPin) return;

    selectedEmployeeCode = '';
    pin = '';
    matchedUser = null;
    kioskMessage = '';
  }

  async function openKioskPinOverlay(employeeCode) {
    selectedEmployeeCode = employeeCode;
    pin = '';
    matchedUser = null;
    kioskMessage = '';
    await tick();
    pinInput?.focus();
  }

  function syncManagerLoginWindow() {
    clearManagerLoginTimer();
    const expiresAt = kioskManagerLoginExpiresAt();
    showManagerLogin = Boolean(expiresAt);

    if (expiresAt) {
      managerLoginTimer = setTimeout(showKioskLogin, Math.max(0, expiresAt - Date.now()));
    }
  }

  async function loadEmployees() {
    loadingEmployees = true;
    employeeLoadAttempted = true;
    kioskMessage = '';

    try {
      employees = await loadKioskEmployees();
      kioskMode = true;
      kioskMessage = employees.length ? '' : 'No employees are available for kiosk login.';
    } catch {
      employees = [];
      kioskMode = false;
      showManagerLogin = true;
      kioskMessage = '';
    } finally {
      loadingEmployees = false;
    }
  }

  async function openFullLogin() {
    try {
      const { kioskLockSeconds } = await loadAppConfig();
      setKioskManagerLoginWindow(kioskLockSeconds);
    } catch (error) {
      console.error('Kiosk lock config could not be loaded.', error);
      setKioskManagerLoginWindow(30);
    }

    syncManagerLoginWindow();
  }

  function kioskActionLabel(action) {
    return action === 'check-out' ? 'checked out' : 'checked in';
  }

  async function handleKioskSignIn(event) {
    const attendanceAction = event.submitter?.value || 'check-in';

    if (!selectedEmployee) {
      kioskMessage = '';
      return;
    }

    checkingPin = true;
    kioskMessage = '';
    matchedUser = null;

    try {
      matchedUser = await matchKioskPin(selectedEmployee.employeeCode, pin, attendanceAction);
      kioskMessage = matchedUser
        ? `Successfully ${kioskActionLabel(attendanceAction)}.`
        : 'PIN was not accepted.';
      pin = '';
      selectedEmployeeCode = '';

      if (matchedUser) {
        sessionStorage.setItem(kioskSessionKey, JSON.stringify({
          ...matchedUser,
          attendanceAction,
          attendanceDecidedAt: new Date().toISOString(),
        }));
        onNavigate(kioskPath);
      }
    } catch (error) {
      kioskMessage = error.message || 'PIN was not accepted.';
    } finally {
      checkingPin = false;
    }
  }

  async function handleGoogleSignIn() {
    signingIn = true;
    loginMessage = 'Opening Google sign-in...';

    try {
      await signInWithGoogle();
      onNavigate(myShiftsPath);
    } catch (error) {
      loginMessage = getAuthErrorMessage(error, 'Google sign-in');
      console.error(error);
    } finally {
      signingIn = false;
    }
  }

  async function handleEmailSignIn() {
    signingIn = true;
    loginMessage = 'Signing in...';

    try {
      await signInWithEmail(email, password);
      onNavigate(myShiftsPath);
    } catch (error) {
      loginMessage = getAuthErrorMessage(error, 'Email sign-in');
      console.error(error);
    } finally {
      signingIn = false;
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      loginMessage = 'Enter your email address before requesting a password reset.';
      return;
    }

    sendingPasswordReset = true;
    loginMessage = 'Sending password reset email...';

    try {
      await sendPasswordResetEmail(email);
      loginMessage = 'Password reset email sent. Check your inbox.';
    } catch (error) {
      loginMessage = getAuthErrorMessage(error, 'Password reset');
      console.error(error);
    } finally {
      sendingPasswordReset = false;
    }
  }
</script>

<ac-page variant="login" aria-labelledby={kioskMode && !showManagerLogin ? undefined : 'login-title'}>
  <ac-login-frame>
    <ac-panel padding="large">
      <ac-card variant="login">
        {#if kioskMode && !showManagerLogin}
          <ac-login-options>
            <form on:submit|preventDefault={handleKioskSignIn}>
              <ac-login-section>
                <ac-kiosk-employee-grid aria-label="Employees">
                  {#each employees as employee}
                    <button
                      type="button"
                      variant={employee.employeeCode === selectedEmployeeCode ? 'selected' : 'secondary'}
                      aria-pressed={employee.employeeCode === selectedEmployeeCode}
                      on:click={() => openKioskPinOverlay(employee.employeeCode)}
                    >
                      <ac-kiosk-employee-image>
                        {#if employee.portraitUrl}
                          <img src={employee.portraitUrl} alt="">
                        {:else}
                          <span>{employee.initials}</span>
                        {/if}
                      </ac-kiosk-employee-image>
                      <ac-kiosk-employee-name>{employee.displayName}</ac-kiosk-employee-name>
                    </button>
                  {/each}
                </ac-kiosk-employee-grid>

                {#if selectedEmployee}
                  <ac-kiosk-pin-modal role="dialog" aria-modal="true" aria-label="Kiosk PIN">
                    <button type="button" aria-label="Cancel PIN entry" on:click={closeKioskPinOverlay}></button>
                    <ac-kiosk-pin-card>
                      <input
                        id="kiosk-pin"
                        name="pin"
                        type="password"
                        inputmode="numeric"
                        autocomplete="off"
                        pattern="[0-9]*"
                        placeholder="####"
                        bind:value={pin}
                        bind:this={pinInput}
                        required
                      >

                      <ac-kiosk-choice>
                        <button type="submit" name="attendanceAction" value="check-in" disabled={checkingPin}>
                          <span>{checkingPin ? 'Checking' : 'Check-in'}</span>
                        </button>
                        <button type="submit" name="attendanceAction" value="check-out" variant="secondary" disabled={checkingPin}>
                          <span>{checkingPin ? 'Checking' : 'Check-out'}</span>
                        </button>
                      </ac-kiosk-choice>

                      <button type="button" variant="secondary" disabled={checkingPin} on:click={closeKioskPinOverlay}>Cancel</button>
                    </ac-kiosk-pin-card>
                  </ac-kiosk-pin-modal>
                {/if}

                {#if kioskMessage}
                  <ac-message aria-live="polite">{kioskMessage}</ac-message>
                {/if}
              </ac-login-section>
            </form>

            <ac-kiosk-footer>
              <button type="button" variant="secondary" on:click={openFullLogin}>Full login</button>
            </ac-kiosk-footer>
          </ac-login-options>
        {:else}
          <BrandLockup>
            <h1 id="login-title">Staff sign-in</h1>
          </BrandLockup>

          <ac-login-options>
            <form on:submit|preventDefault={handleEmailSignIn}>
              <ac-login-section>
                <button type="button" disabled={authBusy} on:click={handleGoogleSignIn}>
                  <ac-google-mark aria-hidden="true">G</ac-google-mark>
                  <span>Continue with Google</span>
                </button>

                <label for="email-login-email">Email</label>
                <input id="email-login-email" name="email" type="email" autocomplete="email" bind:value={email} required>

                <label for="email-login-password">Password</label>
                <input id="email-login-password" name="password" type="password" autocomplete="current-password" bind:value={password} required>

                <ac-login-actions>
                  <button type="submit" disabled={authBusy}>Sign in</button>
                  <button type="button" variant="secondary" disabled={authBusy} on:click={handlePasswordReset}>
                    {sendingPasswordReset ? 'Sending reset email' : 'Reset'}
                  </button>
                </ac-login-actions>
                <ac-message aria-live="polite">{loginMessage}</ac-message>
              </ac-login-section>
            </form>

            {#if kioskMode}
              <button type="button" variant="secondary" on:click={showKioskLogin}>Back to kiosk</button>
            {/if}

            <ac-version>Version {appVersion}</ac-version>
          </ac-login-options>
        {/if}
      </ac-card>
    </ac-panel>
  </ac-login-frame>
</ac-page>
