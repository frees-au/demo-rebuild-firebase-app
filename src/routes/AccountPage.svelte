<script>
  import AppShell from '../components/AppShell.svelte';
  import AddressCard from '../components/AddressCard.svelte';
  import Modal from '../components/Modal.svelte';
  import TelephoneCard from '../components/TelephoneCard.svelte';
  import UserPortrait from '../components/UserPortrait.svelte';
  import { canUseAdminPages, isAdmin } from '../lib/auth.js';
  import { loadAppConfig } from '../lib/appConfig.js';
  import { fetchEmployees, saveEmployeeRole } from '../lib/employees.js';
  import { emptyUserProfile, loadUserProfile, profileFields, saveUserProfile } from '../lib/userProfiles.js';

  export let pathname;
  export let user = null;
  export let onNavigate = () => {};
  export let onLogout = () => {};

  let profile = structuredClone(emptyUserProfile);
  let jsonDrafts = {};
  let loading = true;
  let saving = false;
  let errorMessage = '';
  let successMessage = '';
  let loadedProfileId = '';
  let activeProfileTab = 'details';
  let accountRole = 'user';
  let addingTelephone = false;
  let addingAddress = false;
  let telephoneDraft;
  let addressDraft;

  const profileTabs = [
    { id: 'details', label: 'Details' },
    { id: 'contact', label: 'Contact' },
    { id: 'identity', label: 'Identity' },
    { id: 'finance', label: 'Finance' },
    { id: 'preferences', label: 'Preferences' },
  ];
  const advancedProfileTab = { id: 'advanced', label: 'Advanced' };

  const cardArrayFields = new Set(['telephones', 'addresses']);
  const roleOptions = [
    { value: 'user', label: 'User' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Administrator' },
  ];

  const emptyTelephone = {
    label: '',
    telephone: '',
    default: false,
  };

  const emptyAddress = {
    default: false,
    postalCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    isHomeAddress: false,
    isCommunityAddress: false,
    canReceiveMail: false,
  };

  telephoneDraft = structuredClone(emptyTelephone);
  addressDraft = structuredClone(emptyAddress);

  function currentUserProfileId() {
    return user?.uid;
  }

  function targetProfileIdFromPath(path) {
    const match = path.match(/^\/accounts\/([^/]+)\/$/);
    return match ? decodeURIComponent(match[1]) : currentUserProfileId();
  }

  async function loadProfile() {
    if (!canEditProfile) {
      loading = false;
      loadedProfileId = targetProfileId || '';
      return;
    }

    loading = true;
    errorMessage = '';
    successMessage = '';
    loadedProfileId = targetProfileId;

    try {
      const appConfig = await loadAppConfig();
      profile = await loadUserProfile(targetProfileId, {
        localTimezone: appConfig.timezone,
        preferredLanguage: appConfig.defaultLanguage,
      });
      if (canEditRole) {
        accountRole = roleFromEmployee((await fetchEmployees()).find((employee) => employee.uid === targetProfileId));
      }
      jsonDrafts = Object.fromEntries(
        profileFields
          .filter((field) => field.type === 'json' && !cardArrayFields.has(field.path))
          .map((field) => [field.path, JSON.stringify(getProfileValue(field.path), null, 2)]),
      );
    } catch (error) {
      errorMessage = error.message || 'Account details could not be loaded.';
    } finally {
      loading = false;
    }
  }

  function getProfileValue(path) {
    return path.split('.').reduce((value, key) => value?.[key], profile);
  }

  function setProfileValue(path, value) {
    const next = structuredClone(profile);
    const parts = path.split('.');
    const last = parts.pop();
    const parent = parts.reduce((current, key) => {
      current[key] = current[key] && typeof current[key] === 'object' && !Array.isArray(current[key])
        ? current[key]
        : {};
      return current[key];
    }, next);
    parent[last] = value;
    profile = next;
  }

  function inputId(path) {
    return `profile-${path.replaceAll('.', '-')}`;
  }

  function tabId(tab) {
    return `profile-tab-${tab.id}`;
  }

  function tabPanelId(tab) {
    return `profile-tab-panel-${tab.id}`;
  }

  function booleanSelectValue(value) {
    if (value === null || value === undefined) return '';
    return value ? 'true' : 'false';
  }

  function parseBooleanSelect(value, nullable) {
    if (nullable && value === '') return null;
    return value === 'true';
  }

  function inputValue(path) {
    const value = getProfileValue(path);
    return value === null || value === undefined ? '' : String(value);
  }

  function updateField(field, value) {
    if (field.type === 'number') {
      setProfileValue(field.path, value === '' ? null : Number(value));
      return;
    }

    setProfileValue(field.path, value);
  }

  function fieldDisabled(field) {
    return field.path === 'employeeCode' && !isAdmin(user);
  }

  function roleFromEmployee(employee) {
    if (employee?.claims?.admin) return 'admin';
    if (employee?.claims?.manager) return 'manager';
    return 'user';
  }

  function profileArray(path) {
    const value = getProfileValue(path);
    return Array.isArray(value) ? value : [];
  }

  function addProfileArrayItem(path, item) {
    setProfileValue(path, [...profileArray(path), structuredClone(item)]);
  }

  function openTelephonePopup() {
    telephoneDraft = structuredClone(emptyTelephone);
    addingTelephone = true;
  }

  function openAddressPopup() {
    addressDraft = structuredClone(emptyAddress);
    addingAddress = true;
  }

  function updateTelephoneDraft(key, value) {
    telephoneDraft = {
      ...telephoneDraft,
      [key]: value,
    };
  }

  function updateAddressDraft(key, value) {
    addressDraft = {
      ...addressDraft,
      [key]: value,
    };
  }

  function addTelephoneDraft() {
    profile = {
      ...profile,
      telephones: [...profileTelephones, { ...telephoneDraft }],
    };
    addingTelephone = false;
  }

  function addAddressDraft() {
    profile = {
      ...profile,
      addresses: [...profileAddresses, { ...addressDraft }],
    };
    addingAddress = false;
  }

  function updateProfileArrayItem(path, index, item) {
    setProfileValue(path, profileArray(path).map((current, currentIndex) => (
      currentIndex === index ? item : current
    )));
  }

  function deleteProfileArrayItem(path, index) {
    setProfileValue(path, profileArray(path).filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit() {
    saving = true;
    errorMessage = '';
    successMessage = '';

    try {
      const profileToSave = structuredClone(profile);

      for (const field of profileFields.filter((item) => item.type === 'json' && !cardArrayFields.has(item.path))) {
        try {
          setNestedValue(profileToSave, field.path, JSON.parse(jsonDrafts[field.path] || '[]'));
        } catch {
          throw new Error(`${field.label} must be valid JSON.`);
        }
      }

      await saveUserProfile(targetProfileId, profileToSave);
      if (canEditRole) {
        await saveEmployeeRole(targetProfileId, accountRole);
      }
      successMessage = 'Account saved.';
    } catch (error) {
      errorMessage = error.message || 'Account details could not be saved.';
    } finally {
      saving = false;
    }
  }

  function setNestedValue(target, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const parent = parts.reduce((current, key) => current[key], target);
    parent[last] = value;
  }

  function handlePortraitUploaded(event) {
    setProfileValue('portraitPath', event.detail.portraitPath);
  }

  $: targetProfileId = targetProfileIdFromPath(pathname);
  $: ownProfileId = currentUserProfileId();
  $: canEditProfile = Boolean(user?.uid && targetProfileId && (ownProfileId === targetProfileId || canUseAdminPages(user)));
  $: isOwnProfile = Boolean(user?.uid && targetProfileId === ownProfileId);
  $: canEditRole = Boolean(isAdmin(user) && !isOwnProfile);
  $: visibleProfileTabs = canEditRole ? [...profileTabs, advancedProfileTab] : profileTabs;
  $: profileLabel = [profile.preferredName, profile.givenNames, profile.surname]
    .filter(Boolean)
    .join(' ') || targetProfileId;
  $: if (!visibleProfileTabs.some((tab) => tab.id === activeProfileTab)) {
    activeProfileTab = visibleProfileTabs[0].id;
  }
  $: activeTab = visibleProfileTabs.find((tab) => tab.id === activeProfileTab) || visibleProfileTabs[0];
  $: activeProfileFields = profileFields.filter((field) => (field.tab || 'details') === activeTab.id);
  $: profileTelephones = Array.isArray(profile.telephones) ? profile.telephones : [];
  $: profileAddresses = Array.isArray(profile.addresses) ? profile.addresses : [];
  $: if (user?.uid && targetProfileId && targetProfileId !== loadedProfileId) {
    loadProfile();
  }
</script>

<AppShell eyebrow="Account" title={isOwnProfile ? 'Your account' : 'User account'} {pathname} {user} showAuthStatus {onNavigate} {onLogout}>
  <form on:submit|preventDefault={handleSubmit}>
    {#if !canEditProfile}
      <ac-panel emphasis="alert" role="alert">
        You cannot edit this account.
      </ac-panel>
    {:else if loading}
      <ac-panel surface="paper" aria-live="polite">
        Loading account...
      </ac-panel>
    {:else}
      {#if successMessage}
        <ac-panel surface="paper" role="status">
          {successMessage}
        </ac-panel>
      {/if}

      <UserPortrait
        profileId={targetProfileId}
        label={profileLabel}
        canEdit={canEditProfile}
        on:uploaded={handlePortraitUploaded}
      />

      <ac-profile-tabs>
        <label class="profile-tab-label" for="profile-tab-selector">Profile section</label>
        <select id="profile-tab-selector" class="profile-tab-select" bind:value={activeProfileTab}>
          {#each visibleProfileTabs as tab}
            <option value={tab.id}>{tab.label}</option>
          {/each}
        </select>

        <div class="profile-tab-list" role="tablist" aria-label="Profile sections">
          {#each visibleProfileTabs as tab}
            <button
              type="button"
              class:active={activeProfileTab === tab.id}
              role="tab"
              id={tabId(tab)}
              aria-selected={activeProfileTab === tab.id}
              aria-controls={tabPanelId(tab)}
              on:click={() => (activeProfileTab = tab.id)}
            >
              {tab.label}
            </button>
          {/each}
        </div>
      </ac-profile-tabs>

      <ac-profile-tab-panel
        role="tabpanel"
        id={tabPanelId(activeTab)}
        aria-labelledby={tabId(activeTab)}
      >
        {#if activeTab.id === 'advanced'}
          {#if canEditRole}
            <ac-role-field>
              <label for="account-role">Role</label>
              <select id="account-role" bind:value={accountRole}>
                {#each roleOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </ac-role-field>
          {/if}
        {:else}
          {#each activeProfileFields as field}
            {#if field.path === 'telephones'}
              <ac-array-section>
                <ac-row split align="center" wrap>
                  <h3>Telephones</h3>
                  <button type="button" variant="secondary" on:click={openTelephonePopup}>
                    Add telephone
                  </button>
                </ac-row>

                {#if profileTelephones.length === 0}
                  <ac-panel surface="paper">No telephones yet.</ac-panel>
                {:else}
                  {#each profileTelephones as telephone, index}
                    <TelephoneCard
                      {telephone}
                      {index}
                      onUpdate={(detail) => updateProfileArrayItem('telephones', detail.index, detail.telephone)}
                      onDelete={(detail) => deleteProfileArrayItem('telephones', detail.index)}
                    />
                  {/each}
                {/if}
              </ac-array-section>
            {:else if field.path === 'addresses'}
              <ac-array-section>
                <ac-row split align="center" wrap>
                  <h3>Addresses</h3>
                  <button type="button" variant="secondary" on:click={openAddressPopup}>
                    Add address
                  </button>
                </ac-row>

                {#if profileAddresses.length === 0}
                  <ac-panel surface="paper">No addresses yet.</ac-panel>
                {:else}
                  {#each profileAddresses as address, index}
                    <AddressCard
                      {address}
                      {index}
                      onUpdate={(detail) => updateProfileArrayItem('addresses', detail.index, detail.address)}
                      onDelete={(detail) => deleteProfileArrayItem('addresses', detail.index)}
                    />
                  {/each}
                {/if}
              </ac-array-section>
            {:else}
              <label for={inputId(field.path)}>{field.label}</label>

              {#if field.type === 'textarea'}
                <textarea id={inputId(field.path)} rows="3" value={inputValue(field.path)} on:input={(event) => updateField(field, event.currentTarget.value)}></textarea>
              {:else if field.type === 'json'}
                <textarea id={inputId(field.path)} rows="4" bind:value={jsonDrafts[field.path]}></textarea>
              {:else if field.type === 'boolean' || field.type === 'nullableBoolean'}
                <select
                  id={inputId(field.path)}
                  value={booleanSelectValue(getProfileValue(field.path))}
                  on:change={(event) => setProfileValue(field.path, parseBooleanSelect(event.currentTarget.value, field.type === 'nullableBoolean'))}
                >
                  {#if field.type === 'nullableBoolean'}
                    <option value="">Unknown</option>
                  {/if}
                  <option value="true">{field.type === 'boolean' ? 'True' : 'Yes'}</option>
                  <option value="false">{field.type === 'boolean' ? 'False' : 'No'}</option>
                </select>
              {:else if field.type === 'select'}
                <select
                  id={inputId(field.path)}
                  value={inputValue(field.path)}
                  on:change={(event) => updateField(field, event.currentTarget.value)}
                >
                  {#each field.options || [] as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              {:else}
                <input
                  id={inputId(field.path)}
                  type={field.type === 'email' || field.type === 'tel' || field.type === 'date' || field.type === 'time' || field.type === 'number' || field.type === 'password' ? field.type : 'text'}
                  value={inputValue(field.path)}
                  on:input={(event) => updateField(field, event.currentTarget.value)}
                  autocomplete={field.type === 'password' ? 'off' : undefined}
                  disabled={fieldDisabled(field)}
                >
              {/if}
            {/if}
          {/each}
        {/if}
      </ac-profile-tab-panel>

      <Modal open={addingTelephone} title="Add telephone" onClose={() => (addingTelephone = false)}>
        <ac-card-fields>
          <ac-field>
            <label for="new-telephone-label">Label</label>
            <input
              id="new-telephone-label"
              type="text"
              value={telephoneDraft.label}
              on:input={(event) => updateTelephoneDraft('label', event.currentTarget.value)}
            >
          </ac-field>

          <ac-field>
            <label for="new-telephone-number">Telephone</label>
            <input
              id="new-telephone-number"
              type="tel"
              value={telephoneDraft.telephone}
              on:input={(event) => updateTelephoneDraft('telephone', event.currentTarget.value)}
            >
          </ac-field>

          <label class="checkbox-field" for="new-telephone-default">
            <input
              id="new-telephone-default"
              type="checkbox"
              checked={telephoneDraft.default === true}
              on:change={(event) => updateTelephoneDraft('default', event.currentTarget.checked)}
            >
            Default telephone
          </label>

          <button type="button" aria-label="Confirm add telephone" on:click={addTelephoneDraft}>Add telephone</button>
        </ac-card-fields>
      </Modal>

      <Modal open={addingAddress} title="Add address" onClose={() => (addingAddress = false)}>
        <ac-card-fields class="address-fields">
          <ac-field>
            <label for="new-address-postalCode">CEP</label>
            <input id="new-address-postalCode" type="text" value={addressDraft.postalCode} on:input={(event) => updateAddressDraft('postalCode', event.currentTarget.value)}>
          </ac-field>
          <ac-field>
            <label for="new-address-street">Street</label>
            <input id="new-address-street" type="text" value={addressDraft.street} on:input={(event) => updateAddressDraft('street', event.currentTarget.value)}>
          </ac-field>
          <ac-field>
            <label for="new-address-number">Number</label>
            <input id="new-address-number" type="text" value={addressDraft.number} on:input={(event) => updateAddressDraft('number', event.currentTarget.value)}>
          </ac-field>
          <ac-field>
            <label for="new-address-complement">Complement</label>
            <input id="new-address-complement" type="text" value={addressDraft.complement} on:input={(event) => updateAddressDraft('complement', event.currentTarget.value)}>
          </ac-field>
          <ac-field>
            <label for="new-address-neighborhood">Neighbourhood</label>
            <input id="new-address-neighborhood" type="text" value={addressDraft.neighborhood} on:input={(event) => updateAddressDraft('neighborhood', event.currentTarget.value)}>
          </ac-field>
          <ac-field>
            <label for="new-address-city">City</label>
            <input id="new-address-city" type="text" value={addressDraft.city} on:input={(event) => updateAddressDraft('city', event.currentTarget.value)}>
          </ac-field>
          <ac-field>
            <label for="new-address-state">State</label>
            <input id="new-address-state" type="text" value={addressDraft.state} on:input={(event) => updateAddressDraft('state', event.currentTarget.value)}>
          </ac-field>

          <ac-card-checkboxes>
            <label class="checkbox-field" for="new-address-default">
              <input id="new-address-default" type="checkbox" checked={addressDraft.default === true} on:change={(event) => updateAddressDraft('default', event.currentTarget.checked)}>
              Default address
            </label>
            <label class="checkbox-field" for="new-address-isHomeAddress">
              <input id="new-address-isHomeAddress" type="checkbox" checked={addressDraft.isHomeAddress === true} on:change={(event) => updateAddressDraft('isHomeAddress', event.currentTarget.checked)}>
              Home address
            </label>
            <label class="checkbox-field" for="new-address-isCommunityAddress">
              <input id="new-address-isCommunityAddress" type="checkbox" checked={addressDraft.isCommunityAddress === true} on:change={(event) => updateAddressDraft('isCommunityAddress', event.currentTarget.checked)}>
              Community address
            </label>
            <label class="checkbox-field" for="new-address-canReceiveMail">
              <input id="new-address-canReceiveMail" type="checkbox" checked={addressDraft.canReceiveMail === true} on:change={(event) => updateAddressDraft('canReceiveMail', event.currentTarget.checked)}>
              Can receive mail
            </label>
          </ac-card-checkboxes>

          <button type="button" aria-label="Confirm add address" on:click={addAddressDraft}>Add address</button>
        </ac-card-fields>
      </Modal>

      {#if errorMessage}
        <ac-panel emphasis="alert" role="alert">
          {errorMessage}
        </ac-panel>
      {/if}

      <button type="submit" disabled={saving}>
        {saving ? 'Saving' : 'Save account'}
      </button>
    {/if}
  </form>
</AppShell>

<style>
  form {
    display: grid;
    gap: calc(var(--ac-space) * 3);
    border: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper-hard);
    padding: calc(var(--ac-space) * 5);
  }

  form ac-panel {
    margin: 0;
  }

  ac-profile-tabs,
  ac-profile-tab-panel,
  ac-role-field {
    display: grid;
    gap: calc(var(--ac-space) * 3);
  }

  ac-profile-tab-panel {
    border-block-start: var(--ac-border-width) solid var(--ac-color-line);
    padding-block-start: calc(var(--ac-space) * 5);
  }

  ac-array-section {
    display: grid;
    gap: calc(var(--ac-space) * 3);
  }

  ac-array-section h3 {
    margin: 0;
    font-size: 1rem;
    text-transform: uppercase;
  }

  ac-card-fields,
  ac-field,
  ac-card-checkboxes {
    display: grid;
    gap: calc(var(--ac-space) * 3);
  }

  ac-card-fields {
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

  .profile-tab-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .profile-tab-list {
    display: none;
  }

  @media (min-width: 768px) {
    .profile-tab-select {
      display: none;
    }

    .profile-tab-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
      gap: calc(var(--ac-space) * 2);
    }

    .profile-tab-list button {
      background: var(--ac-color-paper-hard);
      color: var(--ac-color-ink);
    }

    .profile-tab-list button.active,
    .profile-tab-list button[aria-selected="true"] {
      background: var(--ac-color-ink);
      color: var(--ac-color-paper-hard);
    }

    ac-card-fields.address-fields {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    ac-card-fields.address-fields ac-card-checkboxes,
    ac-card-fields.address-fields button {
      grid-column: 1 / -1;
    }

    ac-card-fields.address-fields ac-card-checkboxes {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
