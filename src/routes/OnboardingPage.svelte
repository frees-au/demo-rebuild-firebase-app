<script>
  import { onboardCurrentUser } from '../lib/auth.js';
  import { uploadUserPortraitFile } from '../lib/userPortraits.js';

  export let user = null;
  let givenNames = '';
  let surname = '';
  let preferredName = '';
  let portraitFile = null;
  let saving = false;
  let errorMessage = '';

  async function handleSubmit() {
    saving = true;
    errorMessage = '';

    try {
      let portraitPath = '';

      if (portraitFile) {
        portraitPath = await uploadUserPortraitFile(user.uid, portraitFile);
      }

      await onboardCurrentUser({
        givenNames,
        surname,
        preferredName,
        portraitPath,
      });

      window.location.replace('/my-shifts/');
    } catch (error) {
      errorMessage = error.message || 'Onboarding could not be saved.';
    } finally {
      saving = false;
    }
  }

  function handlePortraitChange(event) {
    [portraitFile] = event.currentTarget.files || [];
  }
</script>

<ac-page centered>
  <form on:submit|preventDefault={handleSubmit}>
    <div>
      <ac-eyebrow>Onboarding</ac-eyebrow>
      <h1><ac-heading>Set up your profile</ac-heading></h1>
    </div>

    <label for="onboarding-given-names">First name</label>
    <input
      id="onboarding-given-names"
      type="text"
      bind:value={givenNames}
      autocomplete="given-name"
      required
    >

    <label for="onboarding-surname">Last name</label>
    <input
      id="onboarding-surname"
      type="text"
      bind:value={surname}
      autocomplete="family-name"
      required
    >

    <label for="onboarding-preferred-name">Preferred name</label>
    <input
      id="onboarding-preferred-name"
      type="text"
      bind:value={preferredName}
      autocomplete="nickname"
    >

    <label for="onboarding-portrait">Portrait</label>
    <input
      id="onboarding-portrait"
      type="file"
      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
      on:change={handlePortraitChange}
    >

    {#if errorMessage}
      <ac-panel emphasis="alert" role="alert">
        {errorMessage}
      </ac-panel>
    {/if}

    <button type="submit" disabled={saving || !user?.uid}>
      {saving ? 'Saving' : 'Save profile'}
    </button>
  </form>
</ac-page>

<style>
  form {
    display: grid;
    width: min(100%, 34rem);
    gap: calc(var(--ac-space) * 3);
    border: var(--ac-border-width) solid var(--ac-color-line);
    background: var(--ac-color-paper-hard);
    padding: calc(var(--ac-space) * 5);
  }

  h1 {
    margin-block: calc(var(--ac-space) * 1) 0;
  }

  ac-panel {
    margin: 0;
  }
</style>
