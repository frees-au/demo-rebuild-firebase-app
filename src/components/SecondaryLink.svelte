<script>
  export let href = '/';
  export let onNavigate = () => {};
</script>

<a
  variant="secondary"
  {href}
  on:click|preventDefault={() => onNavigate(href)}
>
  <slot />
</a>
