<script>
	import { onMount } from 'svelte';
	import Fish from './Fish.svelte';
	import { fishStore } from './stores';

	/**
	 * @type {number}
	 */
	let animationId;
	
	var totalFish = $state(0);

	const animate = () => {
		fishStore.updatePositions();
		animationId = requestAnimationFrame(animate);
	};

	onMount(() => {
		fishStore.subscribe(() => {
			totalFish = fishStore.getStats().total;
		});
		animate();
		return () => cancelAnimationFrame(animationId);
	});
	
</script>


<div 
  class="tank"
  style="background-image: url('https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1200&h=800&fit=crop')"
>
  {#each $fishStore as fish (fish.id)}
    <Fish {fish} />
  {/each}
  <div class="fish-count">Total Fish: {totalFish}</div>
</div>

<style>
	.tank {
		width: 100%;
		height: 100%;
		position: relative;
		background-size: cover;
		background-position: center;
		background-color: #0066cc;
		overflow: hidden;
	}

	.fish-count {
		position: absolute;
		bottom: 10px;
		left: 10px;
		color: white;
		font-size: 1rem;
		font-weight: bold;
		background: rgba(0, 0, 0, 0.5);
		padding: 4px 8px;
		border-radius: 4px;
		pointer-events: none;
		user-select: none;
	}
</style>

