<script>
	let { fish } = $props();

	var verticalRotation = $state(0);

	$effect(() => {
		verticalRotation = Math.atan2(fish.vy, Math.abs(fish.vx)) * (180 / Math.PI);
	});
</script>

<div 
	class="fish"
	style="
		left: {fish.x}px; 
		top: {fish.y}px;
		transform: scaleX({fish.direction}) rotate({verticalRotation}deg);
		transform-origin: center;
	"
>
	<div 
		class="sprite"
		style="
			width: 64px; 
			height: 64px;
			background-image: url('./fish.png');
			background-position: -{fish.spriteX * 64}px -{fish.spriteY * 64}px;
			background-size: 576px 576px;
			transform: scale({fish.size / 64});
			transform-origin: center;
		"
	></div>
</div>

<style>
.fish {
	position: absolute;
	transition: none;
	z-index: 10;
}

/* Smoothing applied here */
.sprite {
	background-repeat: no-repeat;
	image-rendering: auto; /* use 'pixelated' if you're going for retro pixel-art */
	filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.3));
	pointer-events: none;
}
</style>
