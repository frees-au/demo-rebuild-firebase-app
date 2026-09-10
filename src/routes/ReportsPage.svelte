<script>
  import AppShell from '../components/AppShell.svelte';

  export let pathname;
  export let user = null;
  export let onNavigate = () => {};
  export let onLogout = () => {};
</script>

<AppShell eyebrow="Management" title="Reports" {pathname} {user} {onNavigate} {onLogout}>
  <ac-panel>
    <h2><ac-heading>Overview</ac-heading></h2>
    <ac-copy>Placeholder for key statistics graphs</ac-copy>
  </ac-panel>

  <ac-panel>
    <h2><ac-heading>Reports</ac-heading></h2>
    <table>
      <tbody>
        <tr>
          <td>No reports yet</td>
        </tr>
      </tbody>
    </table>
  </ac-panel>
</AppShell>

<style>
  ac-panel + ac-panel {
    margin-block-start: calc(var(--ac-space) * 4);
  }
</style>
