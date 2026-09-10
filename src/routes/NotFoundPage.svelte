<script>
  import SecondaryLink from '../components/SecondaryLink.svelte';

  export let onNavigate = () => {};
</script>

<ac-page centered>
  <ac-panel padding="large">
    <ac-eyebrow>404</ac-eyebrow>
    <h1><ac-title size="small">Page not found</ac-title></h1>
    <p>The requested AC Pontify route does not exist.</p>
    <SecondaryLink href="/style-guide/" {onNavigate}>Style Guide</SecondaryLink>
  </ac-panel>
</ac-page>
