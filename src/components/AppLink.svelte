<script>
  export let href = '/';
  export let active = false;
  export let variant = 'nav';
  export let onNavigate = () => {};
</script>

<a
  {variant}
  aria-current={active ? 'page' : undefined}
  {href}
  on:click|preventDefault={() => onNavigate(href)}
>
  <slot />
</a>
