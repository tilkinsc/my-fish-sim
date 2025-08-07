<script>
  import { onMount } from 'svelte';
  import FishTank from './FishTank.svelte';
  import { fishStore } from './stores';

  onMount(() => {
    fishStore.loadFromStorage();
    if ($fishStore.length === 0) {
      fishStore.initialize();
    }
  });
</script>

<main>
  <FishTank />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #001122;
  }
  
  main {
    width: 100vw;
    height: 100vh;
  }
</style>
