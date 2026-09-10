<script>
  import { onMount } from 'svelte';
  import AppShell from '../components/AppShell.svelte';
  import Modal from '../components/Modal.svelte';
  import SecondaryLink from '../components/SecondaryLink.svelte';
  import { canUseAdminPages, isAdmin } from '../lib/auth.js';
  import { documentLibraryPath } from '../lib/documents.js';
  import { createEmployee, fetchEmployees } from '../lib/employees.js';

  export let pathname;
  export let user = null;
  export let onNavigate = () => {};
  export let onLogout = () => {};

  let employees = [];
  let loading = true;
  let creating = false;
  let createModalOpen = false;
  let errorMessage = '';
  let createErrorMessage = '';
  let successMessage = '';
  let createDraft = emptyCreateDraft();

  const roleOptions = [
    { value: 'user', label: 'User' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Administrator' },
  ];

  function emptyCreateDraft() {
    return {
      email: '',
      password: '',
      givenNames: '',
      surname: '',
      preferredName: '',
      role: 'user',
    };
  }

  function userToEmployee(currentUser) {
    if (!currentUser) return null;

    return {
      uid: currentUser.uid || '',
      displayName: currentUser.displayName || '',
      email: currentUser.email || '',
      emailVerified: Boolean(currentUser.emailVerified),
      claims: {
        admin: isAdmin(currentUser),
        manager: currentUser.acClaims?.role === 'manager',
      },
    };
  }

  function employeeKey(employee) {
    return employee.uid || String(employee.email || '').trim().toLowerCase();
  }

  function employeeProfileId(employee) {
    return employee.uid;
  }

  function mergeEmployees(directoryEmployees, currentUser) {
    const merged = new Map();

    for (const employee of directoryEmployees) {
      const key = employeeKey(employee);
      if (key) merged.set(key, employee);
    }

    const currentEmployee = userToEmployee(currentUser);
    const currentKey = currentEmployee && employeeKey(currentEmployee);
    if (currentKey && !merged.has(currentKey)) {
      merged.set(currentKey, currentEmployee);
    }

    return [...merged.values()].sort((a, b) => {
      const aLabel = a.displayName || a.email;
      const bLabel = b.displayName || b.email;
      return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
    });
  }

  async function loadEmployees() {
    loading = true;
    errorMessage = '';
    try {
      employees = await fetchEmployees();
    } catch (error) {
      errorMessage = error.message || 'Employees could not be loaded.';
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    createDraft = emptyCreateDraft();
    successMessage = '';
    createErrorMessage = '';
    createModalOpen = true;
  }

  function closeCreateModal() {
    if (creating) return;
    createModalOpen = false;
  }

  async function handleCreateEmployee() {
    creating = true;
    createErrorMessage = '';
    successMessage = '';

    try {
      const employee = await createEmployee({
        email: createDraft.email,
        password: createDraft.password,
        role: createDraft.role,
        profile: {
          givenNames: createDraft.givenNames,
          surname: createDraft.surname,
          preferredName: createDraft.preferredName,
        },
      });

      if (employee?.uid) {
        employees = [...employees.filter((item) => item.uid !== employee.uid), employee];
      } else {
        await loadEmployees();
      }

      successMessage = 'Employee account created.';
      createModalOpen = false;
      createDraft = emptyCreateDraft();
    } catch (error) {
      createErrorMessage = error.message || 'Employee account could not be created.';
    } finally {
      creating = false;
    }
  }

  function roleLabel(employee) {
    if (employee.claims?.admin) return 'Administrator';
    if (employee.claims?.manager) return 'Manager';
    return 'User';
  }

  onMount(() => {
    loadEmployees();
  });

  $: visibleEmployees = mergeEmployees(employees, user);
  $: canEditEmployees = canUseAdminPages(user);
  $: canCreateEmployees = isAdmin(user);
</script>

<AppShell eyebrow="Management" title="Employee Directory" {pathname} {user} {onNavigate} {onLogout}>
  <ac-panel>
    <ac-row split>
      <ac-row class="employee-toolbar" wrap>
        {#if canCreateEmployees}
          <button type="button" on:click={openCreateModal}>
            Add email/password user
          </button>
        {/if}
        <button type="button" variant="secondary" disabled={loading} on:click={loadEmployees}>
          {loading ? 'Loading' : 'Refresh'}
        </button>
      </ac-row>
    </ac-row>

    {#if successMessage}
      <ac-panel surface="paper" role="status">
        {successMessage}
      </ac-panel>
    {/if}

    {#if errorMessage && visibleEmployees.length > 0}
      <ac-panel emphasis="alert" role="status">
        {errorMessage}
      </ac-panel>
    {/if}

    {#if errorMessage && visibleEmployees.length === 0}
      <ac-panel emphasis="alert" role="alert">
        {errorMessage}
      </ac-panel>
    {:else if loading}
      <ac-panel surface="paper" aria-live="polite">
        Loading employees...
      </ac-panel>
    {:else if visibleEmployees.length === 0}
      <ac-panel surface="paper">
        No users found.
      </ac-panel>
    {:else}
      <table aria-label="Employees">
        <thead>
          <tr>
            <th>Display name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Verified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each visibleEmployees as employee}
            <tr>
              <td>{employee.displayName || employee.employeeCode || 'No display name'}</td>
              <td>{employee.email || 'No email'}</td>
              <td>
                <ac-badge status={employee.claims?.admin ? 'ready' : employee.claims?.manager ? 'progress' : 'waiting'}>
                  {roleLabel(employee)}
                </ac-badge>
              </td>
              <td>
                <ac-badge status={employee.emailVerified ? 'ready' : 'waiting'}>
                  {employee.emailVerified ? 'Verified' : 'Unverified'}
                </ac-badge>
              </td>
              <td>
                <ac-row wrap>
                  {#if canEditEmployees}
                    <SecondaryLink href={`/accounts/${encodeURIComponent(employeeProfileId(employee))}/`} {onNavigate}>
                      Edit
                    </SecondaryLink>
                    <SecondaryLink href={documentLibraryPath(employeeProfileId(employee))} {onNavigate}>
                      Documents
                    </SecondaryLink>
                  {/if}

                  {#if !canEditEmployees}
                    <span>View only</span>
                  {/if}
                </ac-row>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </ac-panel>

  <Modal open={createModalOpen} title="Add email/password user" onClose={closeCreateModal}>
    <form class="create-employee-form" on:submit|preventDefault={handleCreateEmployee}>
      <label for="create-employee-email">Email</label>
      <input
        id="create-employee-email"
        type="email"
        autocomplete="email"
        bind:value={createDraft.email}
        required
      >

      <label for="create-employee-password">Password</label>
      <input
        id="create-employee-password"
        type="password"
        autocomplete="new-password"
        minlength="6"
        bind:value={createDraft.password}
        required
      >

      <label for="create-employee-given-names">First name</label>
      <input
        id="create-employee-given-names"
        type="text"
        autocomplete="given-name"
        bind:value={createDraft.givenNames}
        required
      >

      <label for="create-employee-surname">Last name</label>
      <input
        id="create-employee-surname"
        type="text"
        autocomplete="family-name"
        bind:value={createDraft.surname}
        required
      >

      <label for="create-employee-preferred-name">Preferred name</label>
      <input
        id="create-employee-preferred-name"
        type="text"
        autocomplete="nickname"
        bind:value={createDraft.preferredName}
      >

      <label for="create-employee-role">Role</label>
      <select id="create-employee-role" bind:value={createDraft.role}>
        {#each roleOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>

      {#if createErrorMessage}
        <ac-panel emphasis="alert" role="alert">
          {createErrorMessage}
        </ac-panel>
      {/if}

      <ac-row class="create-employee-actions" wrap>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating' : 'Create user'}
        </button>
        <button type="button" variant="secondary" disabled={creating} on:click={closeCreateModal}>
          Cancel
        </button>
      </ac-row>
    </form>
  </Modal>
</AppShell>

<style>
  ac-row {
    align-items: stretch;
    flex-direction: column;
    margin-block-end: calc(var(--ac-space) * 4);
  }

  .employee-toolbar,
  .create-employee-actions {
    margin-block-end: 0;
  }

  .create-employee-form {
    display: grid;
    gap: calc(var(--ac-space) * 3);
    padding: calc(var(--ac-space) * 4);
  }

  .create-employee-form ac-panel {
    margin: 0;
  }

  ac-panel ac-panel {
    margin-block-end: calc(var(--ac-space) * 4);
  }

  @media (min-width: 640px) {
    ac-row {
      align-items: center;
      flex-direction: row;
    }
  }
</style>
