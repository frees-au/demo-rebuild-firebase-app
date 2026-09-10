<script>
  import UserPortrait from './UserPortrait.svelte';
  import { loadUserProfile } from '../lib/userProfiles.js';

  export let user = null;
  export let showAuthStatus = false;
  export let onNavigate = () => {};
  export let onLogout = () => {};

  $: void showAuthStatus;
  $: void onLogout;

  let profile = null;
  let loadedProfileId = '';

  function profileName(profileData) {
    return profileData?.preferredName || [profileData?.givenNames, profileData?.surname]
      .filter(Boolean)
      .join(' ');
  }

  async function loadPanelProfile() {
    if (!profileId) {
      profile = null;
      loadedProfileId = '';
      return;
    }

    const requestedProfileId = profileId;
    loadedProfileId = requestedProfileId;

    try {
      const loadedProfile = await loadUserProfile(requestedProfileId);
      if (loadedProfileId === requestedProfileId) {
        profile = loadedProfile;
      }
    } catch (error) {
      if (loadedProfileId === requestedProfileId) {
        profile = null;
      }
    }
  }

  function openAccountSettings() {
    onNavigate('/account/');
  }

  $: profileId = user?.uid || '';
  $: displayName = profileName(profile) || user?.displayName || user?.email || profileId;
  $: employeeNumber = profile?.employeeCode || 'Employee number';
  $: if (profileId !== loadedProfileId) {
    loadPanelProfile();
  }
</script>

<ac-user-panel>
  {#if user?.uid && profileId}
    <UserPortrait {profileId} label={displayName} canEdit editPresentation="modal" />
  {/if}

  <ac-user-panel-details>
    <strong>{displayName || 'Checking account...'}</strong>
    <ac-user-panel-number>
      <span>{employeeNumber || 'Employee number'}</span>
      <button type="button" variant="secondary" aria-label="Edit user settings" title="Edit user settings" on:click={openAccountSettings}>
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <path d="M4 20h4.6L19.3 9.3l-4.6-4.6L4 15.4V20Zm2-3.8 8.7-8.7 1.8 1.8L7.8 18H6v-1.8ZM16.1 3.3l4.6 4.6 1.1-1.1c.4-.4.4-1 0-1.4l-3.2-3.2c-.4-.4-1-.4-1.4 0l-1.1 1.1Z" />
        </svg>
      </button>
    </ac-user-panel-number>
  </ac-user-panel-details>
</ac-user-panel>
