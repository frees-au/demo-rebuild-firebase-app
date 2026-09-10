<script>
  import AppLink from './AppLink.svelte';
  import BrandLockup from './BrandLockup.svelte';
  import UserPanel from './UserPanel.svelte';
  import { canUseAdminPages, isAdmin } from '../lib/auth.js';

  export let eyebrow;
  export let title;
  export let pathname;
  export let user = null;
  export let showAuthStatus = false;
  export let onNavigate = () => {};
  export let onLogout = () => {};

  const navItems = [
    { href: '/my-shifts/', label: 'My Shifts' },
    { href: '/employees/', label: 'Employees', adminOnly: true },
    { href: '/documents/', label: 'Documents' },
    { href: '/reports/', label: 'Reports', adminOnly: true },
    { href: '/scheduling/', label: 'Scheduling', adminOnly: true },
    { href: '/kiosk/', label: 'Kiosk Mode', adminOnly: true },
  ];
  const advancedNavItems = [
    { href: '/settings/', label: 'Settings', adminOnly: true },
    { href: '/dev-tools/', label: 'Dev Tools', adminRequired: true },
    { href: '/style-guide/', label: 'Style Guide', adminOnly: true },
  ];

  function canShowNavItem(item) {
    return (!item.adminOnly || canUseAdminRoutes)
      && (!item.adminRequired || isAdmin(user));
  }

  function isNavItemActive(item) {
    return pathname === item.href || (item.href === '/documents/' && pathname.startsWith('/documents/'));
  }

  $: canUseAdminRoutes = canUseAdminPages(user);
  $: visibleNavItems = navItems.filter(canShowNavItem);
  $: visibleAdvancedNavItems = advancedNavItems.filter(canShowNavItem);
  $: advancedNavActive = visibleAdvancedNavItems.some(isNavItemActive);
</script>

<ac-shell>
  <ac-shell-sidebar>
    <BrandLockup linked href="/my-shifts/" {onNavigate} />
    <nav aria-label="Main navigation">
      {#each visibleNavItems as item}
        <AppLink
          href={item.href}
          active={isNavItemActive(item)}
          {onNavigate}
        >
          {item.label}
        </AppLink>
      {/each}
      {#if visibleAdvancedNavItems.length}
        <ac-nav-group>
          <details open={advancedNavActive}>
            <summary data-active={advancedNavActive ? 'true' : undefined}>Advanced</summary>
            <ac-nav-subitems>
              {#each visibleAdvancedNavItems as item}
                <AppLink
                  href={item.href}
                  active={isNavItemActive(item)}
                  {onNavigate}
                >
                  {item.label}
                </AppLink>
              {/each}
            </ac-nav-subitems>
          </details>
        </ac-nav-group>
      {/if}
    </nav>
    <ac-sidebar-footer>
      <button type="button" variant="nav" on:click={onLogout}>Logout</button>
    </ac-sidebar-footer>
  </ac-shell-sidebar>

  <ac-shell-main>
    <ac-page-header>
      <div>
        <ac-eyebrow>{eyebrow}</ac-eyebrow>
        <ac-title>{title}</ac-title>
      </div>
      <ac-actions>
        <UserPanel {user} {showAuthStatus} {onNavigate} {onLogout} />
      </ac-actions>
    </ac-page-header>

    <slot />
  </ac-shell-main>
</ac-shell>
