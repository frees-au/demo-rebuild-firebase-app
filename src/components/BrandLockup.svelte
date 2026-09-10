<script>
  import acLogo from '../assets/ac-logo.jpg';

  export let href = '/style-guide/';
  export let linked = false;
  export let onNavigate = () => {};
</script>

{#if linked}
  <ac-brand>
    <a
      {href}
      on:click|preventDefault={() => onNavigate(href)}
    >
      <ac-brand-logo aria-hidden="true">
        <img src={acLogo} alt="" />
      </ac-brand-logo>
      <span>Pontify</span>
    </a>
  </ac-brand>
{:else}
  <ac-brand>
    <ac-brand-logo aria-hidden="true">
      <img src={acLogo} alt="" />
    </ac-brand-logo>
    <div>
      <ac-eyebrow>Pontify</ac-eyebrow>
      <slot />
    </div>
  </ac-brand>
{/if}
