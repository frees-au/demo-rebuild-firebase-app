<script>
  import { onDestroy, onMount } from 'svelte';
  import AddressCard from '../components/AddressCard.svelte';
  import AppLink from '../components/AppLink.svelte';
  import AppShell from '../components/AppShell.svelte';
  import BrandLockup from '../components/BrandLockup.svelte';
  import EventForm from '../components/EventForm.svelte';
  import SecondaryLink from '../components/SecondaryLink.svelte';
  import TelephoneCard from '../components/TelephoneCard.svelte';
  import UserPortrait from '../components/UserPortrait.svelte';
  import { loadAppConfig, saveThemeColors } from '../lib/appConfig.js';
  import { isAdmin } from '../lib/auth.js';
  import { applyThemeColors, emptyThemeColors, themeColors, toThemeFormValues } from '../lib/theme.js';
  import { styleGuidePath } from '../routes.js';

  export let pathname;
  export let user = null;
  export let onNavigate = () => {};
  export let onLogout = () => {};

  const sampleEmployee = {
    employeeCode: 'AC-1001',
    name: 'Andy Charles',
  };

  const sampleAddress = {
    default: true,
    postalCode: '3011',
    street: 'Victoria Street',
    number: '42',
    complement: 'Level 2',
    neighborhood: 'Footscray',
    city: 'Melbourne',
    state: 'VIC',
    isHomeAddress: true,
    isCommunityAddress: false,
    canReceiveMail: true,
  };

  const sampleTelephone = {
    label: 'Mobile',
    telephone: '+61 400 000 000',
    default: true,
  };

  const sampleEvent = {
    employeeCode: sampleEmployee.employeeCode,
    eventType: 'shift',
    eventTypeValue: 'shift',
    start: new Date(2026, 8, 7, 9, 0),
    end: new Date(2026, 8, 7, 17, 0),
    notes: 'Front desk shift',
  };

  let themeOverrides = emptyThemeColors();
  let savedThemeOverrides = emptyThemeColors();
  let loadingTheme = true;
  let savingTheme = false;
  let themeMessage = '';
  let themeError = '';

  const componentSections = [
    'AddressCard',
    'AppLink',
    'AppShell',
    'BrandLockup',
    'EventForm',
    'SecondaryLink',
    'TelephoneCard',
    'UserPortrait',
  ];

  const tagSections = [
    'ac-actions',
    'ac-activity',
    'ac-array-section',
    'ac-auth-status',
    'ac-badge',
    'ac-brand',
    'ac-brand-logo',
    'ac-calendar-filters',
    'ac-calendar-legend',
    'ac-calendar-shell',
    'ac-card',
    'ac-card-checkboxes',
    'ac-card-fields',
    'ac-card-header',
    'ac-copy',
    'ac-details-content',
    'ac-eyebrow',
    'ac-field',
    'ac-filter-group',
    'ac-form-actions',
    'ac-form-error',
    'ac-form-grid',
    'ac-google-mark',
    'ac-grid',
    'ac-heading',
    'ac-hour-header',
    'ac-hours-empty',
    'ac-hours-grid',
    'ac-hours-label',
    'ac-hours-scroll',
    'ac-hours-shell',
    'ac-hours-toolbar',
    'ac-kiosk-actions',
    'ac-kiosk-choice',
    'ac-kiosk-employee-grid',
    'ac-kiosk-employee-image',
    'ac-kiosk-employee-name',
    'ac-kiosk-footer',
    'ac-kiosk-pin-card',
    'ac-kiosk-pin-modal',
    'ac-kiosk-result',
    'ac-kiosk-screen',
    'ac-login-frame',
    'ac-login-options',
    'ac-login-section',
    'ac-message',
    'ac-modal',
    'ac-modal-backdrop',
    'ac-modal-header',
    'ac-my-shifts-layout',
    'ac-page',
    'ac-page-header',
    'ac-panel',
    'ac-profile-tab-panel',
    'ac-profile-tabs',
    'ac-row',
    'ac-scheduling-layout',
    'ac-selected-kiosk-user',
    'ac-shell',
    'ac-shell-main',
    'ac-shell-sidebar',
    'ac-shift-bar',
    'ac-shift-item',
    'ac-shift-list',
    'ac-shift-name',
    'ac-shift-summary',
    'ac-shift-track',
    'ac-stack',
    'ac-staff-filter',
    'ac-status-dot',
    'ac-swatch',
    'ac-title',
    'ac-user-panel',
    'ac-user-panel-actions',
    'ac-user-panel-details',
    'ac-user-panel-number',
    'ac-user-portrait',
    'ac-user-portrait-actions',
    'ac-user-portrait-frame',
    'ac-user-portrait-message',
    'ac-user-portrait-modal',
    'ac-user-portrait-preview',
    'ac-version',
    'ac-view-switcher',
  ];

  function resetThemeOverrides() {
    themeOverrides = emptyThemeColors();
  }

  async function saveThemeSettings() {
    savingTheme = true;
    themeMessage = '';
    themeError = '';

    try {
      const savedThemeColors = await saveThemeColors(themeOverrides);
      savedThemeOverrides = toThemeFormValues(savedThemeColors);
      themeOverrides = { ...savedThemeOverrides };
      themeMessage = 'Theme settings saved.';
    } catch (error) {
      themeError = error?.message || 'Theme settings could not be saved.';
    } finally {
      savingTheme = false;
    }
  }

  function ignoreEvent() {}

  onMount(async () => {
    try {
      const config = await loadAppConfig();
      savedThemeOverrides = toThemeFormValues(config.themeColors);
      themeOverrides = { ...savedThemeOverrides };
    } catch (error) {
      themeError = error?.message || 'Theme settings could not be loaded.';
    } finally {
      loadingTheme = false;
    }
  });

  $: applyThemeColors(themeOverrides);
  $: canEditTheme = isAdmin(user);

  onDestroy(() => {
    applyThemeColors(savedThemeOverrides);
  });
</script>

<AppShell eyebrow="Administration" title="Theme settings" {pathname} {user} showAuthStatus {onNavigate} {onLogout}>
  <ac-stack>
    <ac-panel>
      <form class="theme-settings" on:submit|preventDefault={saveThemeSettings}>
        <ac-row split align="center" wrap>
          <h2><ac-heading compact>Colour overrides</ac-heading></h2>
          <ac-actions>
            <button type="button" variant="secondary" on:click={resetThemeOverrides} disabled={loadingTheme || savingTheme || !canEditTheme}>Clear</button>
            <button type="submit" disabled={loadingTheme || savingTheme || !canEditTheme}>{savingTheme ? 'Saving...' : 'Save changes'}</button>
          </ac-actions>
        </ac-row>
        <div class="theme-color-controls">
          {#each themeColors as color}
            <ac-field class="theme-color-field">
              <label for={`theme-color-${color.name}`}>{color.label}</label>
              <span class="theme-color-chip" style={`background: var(${color.token});`} aria-hidden="true"></span>
              <input
                id={`theme-color-${color.name}`}
                type="text"
                inputmode="text"
                autocomplete="off"
                pattern="\#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})"
                placeholder={color.defaultValue}
                bind:value={themeOverrides[color.name]}
                disabled={loadingTheme || savingTheme || !canEditTheme}
              >
            </ac-field>
          {/each}
        </div>
        {#if !canEditTheme}
          <ac-copy>Administrator access is required to edit theme settings.</ac-copy>
        {:else if themeError}
          <ac-copy>{themeError}</ac-copy>
        {:else if themeMessage}
          <ac-copy>{themeMessage}</ac-copy>
        {/if}
      </form>
    </ac-panel>

    <ac-panel>
      <h2><ac-heading>Index</ac-heading></h2>
      <ac-grid columns="two">
        <div>
          <h3>Svelte components</h3>
          <ol class="inventory-list">
            {#each componentSections as name}
              <li><a href={`#component-${name.toLowerCase()}`}>{name}</a></li>
            {/each}
          </ol>
        </div>
        <div>
          <h3>Custom tags</h3>
          <ol class="inventory-list">
            {#each tagSections as tag}
              <li><a href={`#tag-${tag}`}>{tag}</a></li>
            {/each}
          </ol>
        </div>
      </ac-grid>
    </ac-panel>

    <ac-panel>
      <h2><ac-heading>Svelte components</ac-heading></h2>
      <div class="component-list">
        <section id="component-addresscard" class="inventory-section">
          <h3>AddressCard</h3>
          <div class="demo-surface">
            <AddressCard address={sampleAddress} index={0} />
          </div>
        </section>

        <section id="component-applink" class="inventory-section">
          <h3>AppLink</h3>
          <div class="demo-surface demo-row">
            <AppLink href={styleGuidePath} active {onNavigate}>Active route</AppLink>
            <AppLink href="/reports/" {onNavigate}>Standard route</AppLink>
          </div>
        </section>

        <section id="component-appshell" class="inventory-section">
          <h3>AppShell</h3>
          <div class="demo-surface">
            <ac-shell class="mini-shell">
              <ac-shell-sidebar>
                <BrandLockup />
                <nav aria-label="Example navigation">
                  <a variant="nav" aria-current="page" href={styleGuidePath}>Style Guide</a>
                  <a variant="nav" href="/settings/">Settings</a>
                </nav>
              </ac-shell-sidebar>
              <ac-shell-main>
                <ac-page-header>
                  <div>
                    <ac-eyebrow>Shell</ac-eyebrow>
                    <ac-title size="small">Page frame</ac-title>
                  </div>
                </ac-page-header>
                <ac-panel surface="paper">Representative shell layout.</ac-panel>
              </ac-shell-main>
            </ac-shell>
          </div>
        </section>

        <section id="component-brandlockup" class="inventory-section">
          <h3>BrandLockup</h3>
          <div class="demo-surface">
            <BrandLockup>Branded mark</BrandLockup>
          </div>
        </section>

        <section id="component-eventform" class="inventory-section">
          <h3>EventForm</h3>
          <div class="demo-surface">
            <EventForm
              eventRecord={sampleEvent}
              employees={[sampleEmployee]}
              onSave={ignoreEvent}
              onCancel={ignoreEvent}
            />
          </div>
        </section>

        <section id="component-secondarylink" class="inventory-section">
          <h3>SecondaryLink</h3>
          <div class="demo-surface demo-row">
            <SecondaryLink href="/documents/" {onNavigate}>Documents</SecondaryLink>
          </div>
        </section>

        <section id="component-telephonecard" class="inventory-section">
          <h3>TelephoneCard</h3>
          <div class="demo-surface">
            <TelephoneCard telephone={sampleTelephone} index={0} />
          </div>
        </section>

        <section id="component-userportrait" class="inventory-section">
          <h3>UserPortrait</h3>
          <div class="demo-surface">
            <UserPortrait label="Andy Charles" />
          </div>
        </section>
      </div>
    </ac-panel>

    <ac-panel>
      <h2><ac-heading>Custom tags</ac-heading></h2>
      <div class="component-list">
        <section id="tag-ac-actions" class="inventory-section">
          <h3>ac-actions</h3>
          <div class="demo-surface">
            <ac-actions>
              <button type="button">Save</button>
              <button type="button" variant="secondary">Cancel</button>
            </ac-actions>
          </div>
        </section>

        <section id="tag-ac-activity" class="inventory-section">
          <h3>ac-activity</h3>
          <div class="demo-surface">
            <ac-activity>
              <ac-status-dot status="ready"></ac-status-dot>
              <div>
                <strong>Ready for review</strong>
                <ac-copy>Used for compact activity rows.</ac-copy>
              </div>
            </ac-activity>
          </div>
        </section>

        <section id="tag-ac-array-section" class="inventory-section">
          <h3>ac-array-section</h3>
          <div class="demo-surface">
            <ac-array-section>
              <ac-row split align="center" wrap>
                <h3>Telephones</h3>
                <button type="button" variant="secondary">Add telephone</button>
              </ac-row>
              <TelephoneCard telephone={sampleTelephone} index={0} />
            </ac-array-section>
          </div>
        </section>

        <section id="tag-ac-auth-status" class="inventory-section">
          <h3>ac-auth-status</h3>
          <div class="demo-surface">
            <ac-auth-status>
              <strong>andy@example.com</strong>
              <span>Signed in</span>
            </ac-auth-status>
          </div>
        </section>

        <section id="tag-ac-badge" class="inventory-section">
          <h3>ac-badge</h3>
          <div class="demo-surface demo-row">
            <ac-badge status="ready">Ready</ac-badge>
            <ac-badge status="progress">Progress</ac-badge>
            <ac-badge>Waiting</ac-badge>
          </div>
        </section>

        <section id="tag-ac-brand" class="inventory-section">
          <h3>ac-brand</h3>
          <div class="demo-surface">
            <BrandLockup>Brand block</BrandLockup>
          </div>
        </section>

        <section id="tag-ac-brand-logo" class="inventory-section">
          <h3>ac-brand-logo</h3>
          <div class="demo-surface">
            <BrandLockup />
          </div>
        </section>

        <section id="tag-ac-calendar-filters" class="inventory-section">
          <h3>ac-calendar-filters</h3>
          <div class="demo-surface">
            <ac-calendar-filters>
              <ac-filter-group>
                <button type="button">All</button>
                <button type="button" variant="secondary">Shifts</button>
              </ac-filter-group>
              <ac-staff-filter>
                <label for="style-guide-staff">Staff</label>
                <select id="style-guide-staff">
                  <option>All staff</option>
                </select>
              </ac-staff-filter>
            </ac-calendar-filters>
          </div>
        </section>

        <section id="tag-ac-calendar-legend" class="inventory-section">
          <h3>ac-calendar-legend</h3>
          <div class="demo-surface">
            <ac-calendar-legend>
              <span><i class="ac-calendar-event-color-1" aria-hidden="true"></i> Shift</span>
              <span><i class="ac-calendar-event-color-2" aria-hidden="true"></i> Check in</span>
            </ac-calendar-legend>
          </div>
        </section>

        <section id="tag-ac-calendar-shell" class="inventory-section">
          <h3>ac-calendar-shell</h3>
          <div class="demo-surface">
            <ac-calendar-shell view="month" class="mini-calendar">
              Calendar surface
            </ac-calendar-shell>
          </div>
        </section>

        <section id="tag-ac-card" class="inventory-section">
          <h3>ac-card</h3>
          <div class="demo-surface">
            <ac-card variant="profile-array">
              <ac-card-header>
                <div>
                  <strong>Profile card</strong>
                  <span>Card container used by profile arrays.</span>
                </div>
              </ac-card-header>
            </ac-card>
          </div>
        </section>

        <section id="tag-ac-card-checkboxes" class="inventory-section">
          <h3>ac-card-checkboxes</h3>
          <div class="demo-surface">
            <ac-card-checkboxes>
              <label class="checkbox-field"><input type="checkbox" checked> Default address</label>
              <label class="checkbox-field"><input type="checkbox"> Can receive mail</label>
            </ac-card-checkboxes>
          </div>
        </section>

        <section id="tag-ac-card-fields" class="inventory-section">
          <h3>ac-card-fields</h3>
          <div class="demo-surface">
            <ac-card-fields>
              <ac-field>
                <label for="style-guide-card-field">Street</label>
                <input id="style-guide-card-field" value="Victoria Street">
              </ac-field>
            </ac-card-fields>
          </div>
        </section>

        <section id="tag-ac-card-header" class="inventory-section">
          <h3>ac-card-header</h3>
          <div class="demo-surface">
            <ac-card-header>
              <div>
                <strong>Header title</strong>
                <span>Header supporting text</span>
              </div>
              <ac-row>
                <button type="button" variant="secondary">Edit</button>
              </ac-row>
            </ac-card-header>
          </div>
        </section>

        <section id="tag-ac-copy" class="inventory-section">
          <h3>ac-copy</h3>
          <div class="demo-surface">
            <ac-copy>Secondary body copy with softer ink colour.</ac-copy>
          </div>
        </section>

        <section id="tag-ac-details-content" class="inventory-section">
          <h3>ac-details-content</h3>
          <div class="demo-surface">
            <details open>
              <summary>Expandable details</summary>
              <ac-details-content>
                <ac-copy>Content area inside a native details block.</ac-copy>
              </ac-details-content>
            </details>
          </div>
        </section>

        <section id="tag-ac-eyebrow" class="inventory-section">
          <h3>ac-eyebrow</h3>
          <div class="demo-surface">
            <ac-eyebrow>Section label</ac-eyebrow>
          </div>
        </section>

        <section id="tag-ac-field" class="inventory-section">
          <h3>ac-field</h3>
          <div class="demo-surface">
            <ac-field>
              <label for="style-guide-field">Field label</label>
              <input id="style-guide-field" value="Field value">
            </ac-field>
          </div>
        </section>

        <section id="tag-ac-filter-group" class="inventory-section">
          <h3>ac-filter-group</h3>
          <div class="demo-surface">
            <ac-filter-group>
              <button type="button" aria-pressed="true">All</button>
              <button type="button" variant="secondary" aria-pressed="false">Other</button>
            </ac-filter-group>
          </div>
        </section>

        <section id="tag-ac-form-actions" class="inventory-section">
          <h3>ac-form-actions</h3>
          <div class="demo-surface">
            <ac-form-actions>
              <button type="button" variant="secondary">Cancel</button>
              <button type="button">Save event</button>
            </ac-form-actions>
          </div>
        </section>

        <section id="tag-ac-form-error" class="inventory-section">
          <h3>ac-form-error</h3>
          <div class="demo-surface">
            <ac-form-error>Form errors appear here.</ac-form-error>
          </div>
        </section>

        <section id="tag-ac-form-grid" class="inventory-section">
          <h3>ac-form-grid</h3>
          <div class="demo-surface">
            <ac-form-grid>
              <ac-field>
                <label for="style-guide-form-grid-one">Start</label>
                <input id="style-guide-form-grid-one" type="datetime-local" value="2026-09-07T09:00">
              </ac-field>
              <ac-field>
                <label for="style-guide-form-grid-two">End</label>
                <input id="style-guide-form-grid-two" type="datetime-local" value="2026-09-07T17:00">
              </ac-field>
            </ac-form-grid>
          </div>
        </section>

        <section id="tag-ac-google-mark" class="inventory-section">
          <h3>ac-google-mark</h3>
          <div class="demo-surface">
            <button type="button" variant="secondary"><ac-google-mark aria-hidden="true">G</ac-google-mark> Continue with Google</button>
          </div>
        </section>

        <section id="tag-ac-grid" class="inventory-section">
          <h3>ac-grid</h3>
          <div class="demo-surface">
            <ac-grid columns="three">
              <ac-panel surface="paper">One</ac-panel>
              <ac-panel surface="paper">Two</ac-panel>
              <ac-panel surface="paper">Three</ac-panel>
            </ac-grid>
          </div>
        </section>

        <section id="tag-ac-heading" class="inventory-section">
          <h3>ac-heading</h3>
          <div class="demo-surface">
            <h4><ac-heading compact>Compact heading</ac-heading></h4>
          </div>
        </section>

        <section id="tag-ac-hour-header" class="inventory-section">
          <h3>ac-hour-header</h3>
          <div class="demo-surface">
            <ac-hours-grid class="mini-hours-grid" style="--ac-shift-count: 1; --ac-hour-count: 2;">
              <ac-hours-label></ac-hours-label>
              <ac-hour-header>09:00</ac-hour-header>
              <ac-hour-header>10:00</ac-hour-header>
            </ac-hours-grid>
          </div>
        </section>

        <section id="tag-ac-hours-empty" class="inventory-section">
          <h3>ac-hours-empty</h3>
          <div class="demo-surface">
            <ac-hours-grid class="mini-hours-grid" style="--ac-shift-count: 1; --ac-hour-count: 2;">
              <ac-hours-label></ac-hours-label>
              <ac-hour-header>09:00</ac-hour-header>
              <ac-hour-header>10:00</ac-hour-header>
              <ac-hours-empty>No shifts start on this day.</ac-hours-empty>
            </ac-hours-grid>
          </div>
        </section>

        <section id="tag-ac-hours-grid" class="inventory-section">
          <h3>ac-hours-grid</h3>
          <div class="demo-surface">
            <ac-hours-scroll>
              <ac-hours-grid class="mini-hours-grid" style="--ac-shift-count: 1; --ac-hour-count: 2;">
                <ac-hours-label></ac-hours-label>
                <ac-hour-header>09:00</ac-hour-header>
                <ac-hour-header>10:00</ac-hour-header>
                <ac-shift-name><strong>Andy</strong><span>09:00-17:00</span></ac-shift-name>
                <ac-shift-track>
                  <ac-shift-bar class="ac-calendar-event-color-1" style="left: 0%; width: 80%;">
                    <strong>Andy</strong>
                    <span>09:00-17:00</span>
                  </ac-shift-bar>
                </ac-shift-track>
              </ac-hours-grid>
            </ac-hours-scroll>
          </div>
        </section>

        <section id="tag-ac-hours-label" class="inventory-section">
          <h3>ac-hours-label</h3>
          <div class="demo-surface">
            <ac-hours-label class="standalone-hours-cell">Staff</ac-hours-label>
          </div>
        </section>

        <section id="tag-ac-hours-scroll" class="inventory-section">
          <h3>ac-hours-scroll</h3>
          <div class="demo-surface">
            <ac-hours-scroll>
              <ac-panel surface="paper">Scrollable hours surface</ac-panel>
            </ac-hours-scroll>
          </div>
        </section>

        <section id="tag-ac-hours-shell" class="inventory-section">
          <h3>ac-hours-shell</h3>
          <div class="demo-surface">
            <ac-hours-shell>
              <ac-hours-toolbar>
                <button type="button" variant="secondary">Previous</button>
                <strong>Monday, 7 September 2026</strong>
              </ac-hours-toolbar>
              <ac-hours-scroll>
                <ac-panel surface="paper">Hours content</ac-panel>
              </ac-hours-scroll>
            </ac-hours-shell>
          </div>
        </section>

        <section id="tag-ac-hours-toolbar" class="inventory-section">
          <h3>ac-hours-toolbar</h3>
          <div class="demo-surface">
            <ac-hours-toolbar>
              <button type="button" variant="secondary">Previous</button>
              <strong>Monday</strong>
              <input type="date" value="2026-09-07">
              <button type="button" variant="secondary">Next</button>
            </ac-hours-toolbar>
          </div>
        </section>

        <section id="tag-ac-kiosk-actions" class="inventory-section">
          <h3>ac-kiosk-actions</h3>
          <div class="demo-surface">
            <ac-kiosk-actions>
              <button type="button">Check in</button>
              <button type="button" variant="secondary">Check out</button>
            </ac-kiosk-actions>
          </div>
        </section>

        <section id="tag-ac-kiosk-choice" class="inventory-section">
          <h3>ac-kiosk-choice</h3>
          <div class="demo-surface">
            <ac-kiosk-choice>
              <button type="button">Continue</button>
              <button type="button" variant="secondary">Back</button>
            </ac-kiosk-choice>
          </div>
        </section>

        <section id="tag-ac-kiosk-employee-grid" class="inventory-section">
          <h3>ac-kiosk-employee-grid</h3>
          <div class="demo-surface">
            <ac-kiosk-employee-grid class="mini-employee-grid">
              <button type="button" variant="selected">
                <ac-kiosk-employee-image>AC</ac-kiosk-employee-image>
                <ac-kiosk-employee-name>Andy</ac-kiosk-employee-name>
              </button>
              <button type="button">
                <ac-kiosk-employee-image>BC</ac-kiosk-employee-image>
                <ac-kiosk-employee-name>Baz</ac-kiosk-employee-name>
              </button>
            </ac-kiosk-employee-grid>
          </div>
        </section>

        <section id="tag-ac-kiosk-employee-image" class="inventory-section">
          <h3>ac-kiosk-employee-image</h3>
          <div class="demo-surface">
            <ac-kiosk-employee-image class="standalone-employee-image">AC</ac-kiosk-employee-image>
          </div>
        </section>

        <section id="tag-ac-kiosk-employee-name" class="inventory-section">
          <h3>ac-kiosk-employee-name</h3>
          <div class="demo-surface">
            <button type="button" class="mini-employee-button">
              <ac-kiosk-employee-image>AC</ac-kiosk-employee-image>
              <ac-kiosk-employee-name>Andy Charles</ac-kiosk-employee-name>
            </button>
          </div>
        </section>

        <section id="tag-ac-kiosk-footer" class="inventory-section">
          <h3>ac-kiosk-footer</h3>
          <div class="demo-surface">
            <ac-kiosk-footer>
              <button type="button" variant="secondary">Manager login</button>
            </ac-kiosk-footer>
          </div>
        </section>

        <section id="tag-ac-kiosk-pin-card" class="inventory-section">
          <h3>ac-kiosk-pin-card</h3>
          <div class="demo-surface">
            <ac-kiosk-pin-card class="inline-pin-card">
              <label for="style-guide-pin">PIN</label>
              <input id="style-guide-pin" value="1234" inputmode="numeric">
              <button type="button">Unlock</button>
            </ac-kiosk-pin-card>
          </div>
        </section>

        <section id="tag-ac-kiosk-pin-modal" class="inventory-section">
          <h3>ac-kiosk-pin-modal</h3>
          <div class="demo-surface">
            <ac-kiosk-pin-modal class="inline-pin-modal">
              <button type="button" aria-label="Close"></button>
              <ac-kiosk-pin-card>
                <strong>Kiosk PIN</strong>
                <input value="1234" aria-label="PIN">
              </ac-kiosk-pin-card>
            </ac-kiosk-pin-modal>
          </div>
        </section>

        <section id="tag-ac-kiosk-result" class="inventory-section">
          <h3>ac-kiosk-result</h3>
          <div class="demo-surface">
            <ac-kiosk-result>Checked in at 09:00.</ac-kiosk-result>
          </div>
        </section>

        <section id="tag-ac-kiosk-screen" class="inventory-section">
          <h3>ac-kiosk-screen</h3>
          <div class="demo-surface">
            <ac-kiosk-screen>
              <strong>Kiosk mode</strong>
              <ac-copy>Large touch-friendly screen layout.</ac-copy>
            </ac-kiosk-screen>
          </div>
        </section>

        <section id="tag-ac-login-frame" class="inventory-section">
          <h3>ac-login-frame</h3>
          <div class="demo-surface">
            <ac-login-frame>
              <ac-card variant="login">
                <BrandLockup>Login frame</BrandLockup>
              </ac-card>
            </ac-login-frame>
          </div>
        </section>

        <section id="tag-ac-login-options" class="inventory-section">
          <h3>ac-login-options</h3>
          <div class="demo-surface">
            <ac-login-options>
              <button type="button"><ac-google-mark>G</ac-google-mark> Continue</button>
              <ac-version>Version 1.0.0</ac-version>
            </ac-login-options>
          </div>
        </section>

        <section id="tag-ac-login-section" class="inventory-section">
          <h3>ac-login-section</h3>
          <div class="demo-surface">
            <ac-login-section>
              <label for="style-guide-login">Email</label>
              <input id="style-guide-login" type="email" value="andy@example.com">
            </ac-login-section>
          </div>
        </section>

        <section id="tag-ac-message" class="inventory-section">
          <h3>ac-message</h3>
          <div class="demo-surface">
            <ac-message>Authentication message text.</ac-message>
          </div>
        </section>

        <section id="tag-ac-modal" class="inventory-section">
          <h3>ac-modal</h3>
          <div class="demo-surface">
            <ac-modal class="inline-modal">
              <ac-modal-header>
                <h2>Modal title</h2>
                <button type="button" variant="secondary">Close</button>
              </ac-modal-header>
              <ac-panel surface="paper">Modal content.</ac-panel>
            </ac-modal>
          </div>
        </section>

        <section id="tag-ac-modal-backdrop" class="inventory-section">
          <h3>ac-modal-backdrop</h3>
          <div class="demo-surface">
            <ac-modal-backdrop class="inline-modal-backdrop">
              <ac-modal class="inline-modal">
                <ac-modal-header><h2>Backdrop sample</h2></ac-modal-header>
              </ac-modal>
            </ac-modal-backdrop>
          </div>
        </section>

        <section id="tag-ac-modal-header" class="inventory-section">
          <h3>ac-modal-header</h3>
          <div class="demo-surface">
            <ac-modal-header class="inline-modal-header">
              <h2>Header</h2>
              <button type="button" variant="secondary">Close</button>
            </ac-modal-header>
          </div>
        </section>

        <section id="tag-ac-my-shifts-layout" class="inventory-section">
          <h3>ac-my-shifts-layout</h3>
          <div class="demo-surface">
            <ac-my-shifts-layout>
              <ac-panel>Next shift</ac-panel>
              <ac-panel>Schedule</ac-panel>
            </ac-my-shifts-layout>
          </div>
        </section>

        <section id="tag-ac-page" class="inventory-section">
          <h3>ac-page</h3>
          <div class="demo-surface">
            <ac-page class="mini-page">
              <ac-panel>Page surface</ac-panel>
            </ac-page>
          </div>
        </section>

        <section id="tag-ac-page-header" class="inventory-section">
          <h3>ac-page-header</h3>
          <div class="demo-surface">
            <ac-page-header>
              <div>
                <ac-eyebrow>Header</ac-eyebrow>
                <ac-title size="small">Page heading</ac-title>
              </div>
              <ac-actions>
                <button type="button">Action</button>
              </ac-actions>
            </ac-page-header>
          </div>
        </section>

        <section id="tag-ac-panel" class="inventory-section">
          <h3>ac-panel</h3>
          <div class="demo-surface">
            <ac-panel>Default panel</ac-panel>
            <ac-panel surface="paper">Paper panel</ac-panel>
            <ac-panel emphasis="alert">Alert panel</ac-panel>
          </div>
        </section>

        <section id="tag-ac-profile-tab-panel" class="inventory-section">
          <h3>ac-profile-tab-panel</h3>
          <div class="demo-surface">
            <ac-profile-tab-panel>
              <label for="style-guide-profile-field">Given names</label>
              <input id="style-guide-profile-field" value="Andy">
            </ac-profile-tab-panel>
          </div>
        </section>

        <section id="tag-ac-profile-tabs" class="inventory-section">
          <h3>ac-profile-tabs</h3>
          <div class="demo-surface">
            <ac-profile-tabs>
              <select aria-label="Profile section">
                <option>Details</option>
                <option>Contact</option>
              </select>
              <div class="profile-tab-list visible-tabs" role="tablist" aria-label="Profile sections">
                <button type="button" class="active" role="tab" aria-selected="true">Details</button>
                <button type="button" variant="secondary" role="tab" aria-selected="false">Contact</button>
              </div>
            </ac-profile-tabs>
          </div>
        </section>

        <section id="tag-ac-row" class="inventory-section">
          <h3>ac-row</h3>
          <div class="demo-surface">
            <ac-row split align="center" wrap>
              <strong>Split row</strong>
              <button type="button" variant="secondary">Action</button>
            </ac-row>
          </div>
        </section>

        <section id="tag-ac-scheduling-layout" class="inventory-section">
          <h3>ac-scheduling-layout</h3>
          <div class="demo-surface">
            <ac-scheduling-layout>
              <ac-view-switcher><button type="button">Week</button></ac-view-switcher>
              <ac-panel surface="paper">Calendar area</ac-panel>
            </ac-scheduling-layout>
          </div>
        </section>

        <section id="tag-ac-selected-kiosk-user" class="inventory-section">
          <h3>ac-selected-kiosk-user</h3>
          <div class="demo-surface">
            <ac-selected-kiosk-user>
              <strong>Andy Charles</strong>
              <ac-copy>AC-1001 selected for kiosk entry.</ac-copy>
            </ac-selected-kiosk-user>
          </div>
        </section>

        <section id="tag-ac-shell" class="inventory-section">
          <h3>ac-shell</h3>
          <div class="demo-surface">
            <ac-shell class="mini-shell">
              <ac-shell-sidebar>Sidebar</ac-shell-sidebar>
              <ac-shell-main>Main content</ac-shell-main>
            </ac-shell>
          </div>
        </section>

        <section id="tag-ac-shell-main" class="inventory-section">
          <h3>ac-shell-main</h3>
          <div class="demo-surface">
            <ac-shell-main class="standalone-shell-region">Main shell region</ac-shell-main>
          </div>
        </section>

        <section id="tag-ac-shell-sidebar" class="inventory-section">
          <h3>ac-shell-sidebar</h3>
          <div class="demo-surface">
            <ac-shell-sidebar class="standalone-shell-region">Sidebar shell region</ac-shell-sidebar>
          </div>
        </section>

        <section id="tag-ac-shift-bar" class="inventory-section">
          <h3>ac-shift-bar</h3>
          <div class="demo-surface">
            <ac-shift-track class="standalone-shift-track">
              <ac-shift-bar class="ac-calendar-event-color-1" style="left: 10%; width: 65%;">
                <strong>Andy</strong>
                <span>09:00-17:00</span>
              </ac-shift-bar>
            </ac-shift-track>
          </div>
        </section>

        <section id="tag-ac-shift-item" class="inventory-section">
          <h3>ac-shift-item</h3>
          <div class="demo-surface">
            <ac-shift-list>
              <ac-shift-item>
                <div>
                  <strong>Monday, 7 September</strong>
                  <span>09:00-17:00</span>
                </div>
                <ac-copy>Front desk shift</ac-copy>
              </ac-shift-item>
            </ac-shift-list>
          </div>
        </section>

        <section id="tag-ac-shift-list" class="inventory-section">
          <h3>ac-shift-list</h3>
          <div class="demo-surface">
            <ac-shift-list>
              <ac-shift-item><strong>Shift one</strong></ac-shift-item>
              <ac-shift-item><strong>Shift two</strong></ac-shift-item>
            </ac-shift-list>
          </div>
        </section>

        <section id="tag-ac-shift-name" class="inventory-section">
          <h3>ac-shift-name</h3>
          <div class="demo-surface">
            <ac-shift-name class="standalone-shift-name">
              <strong>Andy Charles</strong>
              <span>09:00-17:00</span>
            </ac-shift-name>
          </div>
        </section>

        <section id="tag-ac-shift-summary" class="inventory-section">
          <h3>ac-shift-summary</h3>
          <div class="demo-surface">
            <ac-shift-summary>
              <ac-eyebrow>Next shift</ac-eyebrow>
              <strong>Monday, 7 September</strong>
              <ac-copy>09:00-17:00</ac-copy>
            </ac-shift-summary>
          </div>
        </section>

        <section id="tag-ac-shift-track" class="inventory-section">
          <h3>ac-shift-track</h3>
          <div class="demo-surface">
            <ac-shift-track class="standalone-shift-track"></ac-shift-track>
          </div>
        </section>

        <section id="tag-ac-stack" class="inventory-section">
          <h3>ac-stack</h3>
          <div class="demo-surface">
            <ac-stack>
              <ac-panel surface="paper">Stack item one</ac-panel>
              <ac-panel surface="paper">Stack item two</ac-panel>
            </ac-stack>
          </div>
        </section>

        <section id="tag-ac-staff-filter" class="inventory-section">
          <h3>ac-staff-filter</h3>
          <div class="demo-surface">
            <ac-staff-filter>
              <label for="style-guide-staff-filter">Staff</label>
              <select id="style-guide-staff-filter">
                <option>All staff</option>
              </select>
            </ac-staff-filter>
          </div>
        </section>

        <section id="tag-ac-status-dot" class="inventory-section">
          <h3>ac-status-dot</h3>
          <div class="demo-surface demo-row">
            <ac-status-dot status="ready"></ac-status-dot>
            <ac-status-dot status="progress"></ac-status-dot>
            <ac-status-dot></ac-status-dot>
          </div>
        </section>

        <section id="tag-ac-swatch" class="inventory-section">
          <h3>ac-swatch</h3>
          <div class="demo-surface">
            <ac-grid variant="color">
              {#each themeColors as color}
                <ac-swatch style={`background: var(${color.token}); color: ${color.text};`}>
                  {color.label}
                </ac-swatch>
              {/each}
            </ac-grid>
          </div>
        </section>

        <section id="tag-ac-title" class="inventory-section">
          <h3>ac-title</h3>
          <div class="demo-surface">
            <ac-title size="small">Page title</ac-title>
          </div>
        </section>

        <section id="tag-ac-user-panel" class="inventory-section">
          <h3>ac-user-panel</h3>
          <div class="demo-surface">
            <ac-user-panel>
              <UserPortrait label="Andy Charles" />
              <ac-user-panel-details>
                <strong>Andy Charles</strong>
                <ac-user-panel-number>
                  <span>AC-1001</span>
                  <button type="button" variant="secondary" aria-label="Edit">E</button>
                </ac-user-panel-number>
              </ac-user-panel-details>
            </ac-user-panel>
          </div>
        </section>

        <section id="tag-ac-user-panel-actions" class="inventory-section">
          <h3>ac-user-panel-actions</h3>
          <div class="demo-surface">
            <ac-user-panel-actions>
              <button type="button" variant="secondary">Account</button>
              <button type="button" variant="secondary">Sign out</button>
            </ac-user-panel-actions>
          </div>
        </section>

        <section id="tag-ac-user-panel-details" class="inventory-section">
          <h3>ac-user-panel-details</h3>
          <div class="demo-surface">
            <ac-user-panel-details>
              <strong>Andy Charles</strong>
              <span>Details stack</span>
            </ac-user-panel-details>
          </div>
        </section>

        <section id="tag-ac-user-panel-number" class="inventory-section">
          <h3>ac-user-panel-number</h3>
          <div class="demo-surface">
            <ac-user-panel-number>
              <span>AC-1001</span>
              <button type="button" variant="secondary" aria-label="Edit">E</button>
            </ac-user-panel-number>
          </div>
        </section>

        <section id="tag-ac-user-portrait" class="inventory-section">
          <h3>ac-user-portrait</h3>
          <div class="demo-surface">
            <UserPortrait label="Andy Charles" />
          </div>
        </section>

        <section id="tag-ac-user-portrait-actions" class="inventory-section">
          <h3>ac-user-portrait-actions</h3>
          <div class="demo-surface">
            <ac-user-portrait-actions>
              <button type="button" variant="secondary">Camera</button>
              <button type="button" variant="secondary">Upload</button>
            </ac-user-portrait-actions>
          </div>
        </section>

        <section id="tag-ac-user-portrait-frame" class="inventory-section">
          <h3>ac-user-portrait-frame</h3>
          <div class="demo-surface">
            <ac-user-portrait-frame><span>AC</span></ac-user-portrait-frame>
          </div>
        </section>

        <section id="tag-ac-user-portrait-message" class="inventory-section">
          <h3>ac-user-portrait-message</h3>
          <div class="demo-surface">
            <ac-user-portrait-message role="alert">Portrait could not be loaded.</ac-user-portrait-message>
          </div>
        </section>

        <section id="tag-ac-user-portrait-modal" class="inventory-section">
          <h3>ac-user-portrait-modal</h3>
          <div class="demo-surface">
            <ac-user-portrait-modal>
              <ac-user-portrait-preview><span>AC</span></ac-user-portrait-preview>
              <ac-user-portrait-actions>
                <button type="button" variant="secondary">Upload</button>
              </ac-user-portrait-actions>
            </ac-user-portrait-modal>
          </div>
        </section>

        <section id="tag-ac-user-portrait-preview" class="inventory-section">
          <h3>ac-user-portrait-preview</h3>
          <div class="demo-surface">
            <ac-user-portrait-preview><span>AC</span></ac-user-portrait-preview>
          </div>
        </section>

        <section id="tag-ac-version" class="inventory-section">
          <h3>ac-version</h3>
          <div class="demo-surface">
            <ac-version>Version 1.0.0</ac-version>
          </div>
        </section>

        <section id="tag-ac-view-switcher" class="inventory-section">
          <h3>ac-view-switcher</h3>
          <div class="demo-surface">
            <ac-view-switcher>
              <button type="button" aria-pressed="true">Week</button>
              <button type="button" variant="secondary" aria-pressed="false">Month</button>
              <button type="button" variant="secondary" aria-pressed="false">Hours</button>
            </ac-view-switcher>
          </div>
        </section>
      </div>
    </ac-panel>
  </ac-stack>
</AppShell>

<style>
  h3,
  h4 {
    margin-block-end: calc(var(--ac-space) * 3);
    font-size: 1rem;
    text-transform: uppercase;
  }

  .theme-settings {
    display: grid;
    gap: calc(var(--ac-space) * 4);
  }

  .theme-settings h2 {
    margin: 0;
  }

  .theme-color-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: calc(var(--ac-space) * 3);
  }

  .theme-color-field {
    position: relative;
    display: grid;
    gap: var(--ac-space);
  }

  .theme-color-field input {
    padding-inline-start: calc(var(--ac-space) * 10);
  }

  .theme-color-chip {
    position: absolute;
    inset-block-end: 0.75rem;
    inset-inline-start: calc(var(--ac-space) * 3);
    width: 1.25rem;
    height: 1.25rem;
    border: var(--ac-border-width) solid var(--ac-color-line);
  }

  .inventory-list {
    columns: 1;
    margin: 0;
    padding-inline-start: calc(var(--ac-space) * 5);
  }

  .inventory-list li {
    break-inside: avoid;
    margin-block-end: var(--ac-space);
    font-family: var(--ac-font-mono);
    font-size: 0.875rem;
    font-weight: 900;
  }

  .component-list {
    display: grid;
    gap: calc(var(--ac-space) * 5);
  }

  .inventory-section {
    display: grid;
    gap: calc(var(--ac-space) * 2);
    border-block-start: var(--ac-border-width) solid var(--ac-color-line);
    padding-block-start: calc(var(--ac-space) * 4);
  }

  .demo-surface {
    display: grid;
    gap: calc(var(--ac-space) * 3);
    min-width: 0;
    background: var(--ac-color-paper);
    padding: calc(var(--ac-space) * 4);
  }

  .demo-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }

  .mini-shell {
    min-height: 0;
    border: var(--ac-border-width) solid var(--ac-color-line);
  }

  .mini-shell ac-shell-main,
  .mini-shell ac-shell-sidebar,
  .standalone-shell-region {
    padding: calc(var(--ac-space) * 4);
  }

  .mini-calendar {
    display: grid;
    height: 12rem;
    min-height: 0;
    place-items: center;
    font-weight: 900;
  }

  .mini-hours-grid {
    min-width: 24rem;
    grid-template-columns: 8rem repeat(var(--ac-hour-count), minmax(4rem, 1fr));
  }

  .mini-employee-grid {
    max-width: 24rem;
  }

  .standalone-employee-image,
  .mini-employee-button {
    width: 9rem;
  }

  .mini-employee-button {
    position: relative;
    display: block;
    min-height: 0;
    aspect-ratio: 1;
    overflow: hidden;
    padding: 0;
    background: var(--ac-color-paper-hard);
    color: var(--ac-color-ink);
  }

  .inline-pin-card,
  .inline-pin-modal,
  .inline-modal,
  .inline-modal-backdrop,
  .inline-modal-header {
    position: relative;
    inset: auto;
    z-index: auto;
  }

  .inline-pin-modal,
  .inline-modal-backdrop {
    min-height: 16rem;
  }

  .inline-modal-backdrop {
    background: rgb(9 9 9 / 0.18);
  }

  .inline-modal {
    max-height: none;
  }

  .standalone-shift-track {
    min-height: 4rem;
    border: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper-hard);
  }

  .standalone-shift-name {
    min-height: 4rem;
    border: var(--ac-border-width) solid var(--ac-color-line);
  }

  .standalone-hours-cell {
    min-height: 3rem;
  }

  ac-card-checkboxes,
  ac-card-fields,
  ac-field,
  ac-form-grid,
  ac-form-actions,
  ac-profile-tabs,
  ac-profile-tab-panel,
  ac-array-section,
  ac-my-shifts-layout,
  ac-shift-list,
  ac-shift-summary,
  ac-scheduling-layout,
  ac-view-switcher,
  ac-filter-group,
  ac-calendar-filters,
  ac-hours-toolbar,
  ac-user-panel-actions,
  ac-user-portrait-actions,
  ac-user-portrait-modal {
    display: grid;
    gap: calc(var(--ac-space) * 3);
  }

  ac-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  ac-form-actions,
  ac-view-switcher,
  ac-filter-group,
  ac-calendar-filters,
  ac-hours-toolbar,
  ac-user-panel-actions,
  ac-user-portrait-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }

  ac-form-error {
    display: block;
    border: var(--ac-border-width) solid var(--ac-color-red);
    background: var(--ac-color-red-wash);
    padding: calc(var(--ac-space) * 3);
    color: var(--ac-color-ink);
    font-weight: 900;
  }

  ac-card[variant="profile-array"] {
    display: grid;
    gap: calc(var(--ac-space) * 4);
    border: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper);
    padding: calc(var(--ac-space) * 4);
  }

  ac-card-header {
    display: grid;
    gap: calc(var(--ac-space) * 3);
  }

  ac-card-header strong,
  ac-card-header span {
    display: block;
  }

  ac-card-header strong {
    font-weight: 900;
    text-transform: uppercase;
  }

  ac-card-header span {
    color: var(--ac-color-ink-soft);
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

  .visible-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: calc(var(--ac-space) * 2);
  }

  .visible-tabs button {
    background: var(--ac-color-paper-hard);
    color: var(--ac-color-ink);
  }

  .visible-tabs button.active,
  .visible-tabs button[aria-selected="true"] {
    background: var(--ac-color-ink);
    color: var(--ac-color-paper-hard);
  }

  @media (min-width: 768px) {
    .inventory-list {
      columns: 2;
    }

    ac-card-header {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
    }
  }
</style>
