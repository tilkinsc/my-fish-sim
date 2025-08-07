import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'fishtank_data';
const MAX_FISH = 300;

const getSpeciesId = (spriteX, spriteY) => {
	return Math.floor(spriteX / 3) + 10 * Math.floor(spriteY / 3);
};

const lerp = (a, b, t) => a + (b - a) * t;

const getSpawnPosition = (width, height) => {
	const side = Math.floor(Math.random() * 4);
	const buffer = 200;
	
	switch (side) {
		case 0:
			return { x: Math.random() * width, y: -buffer, vx: (Math.random() - 0.3) * 2, vy: Math.random() * 2 + 0.5 };
		case 1:
			return { x: width + buffer, y: Math.random() * height, vx: -(Math.random() * 2 + 0.5), vy: (Math.random() - 0.3) * 2 };
		case 2:
			return { x: Math.random() * width, y: height + buffer, vx: (Math.random() - 0.3) * 2, vy: -(Math.random() * 2 + 0.5) };
		case 3:
			return { x: -buffer, y: Math.random() * height, vx: Math.random() * 2 + 0.5, vy: (Math.random() - 0.3) * 2 };
	}
};

const createFish = (id, width, height, spawnFromEdge = false) => {
	const spriteX = Math.floor(Math.random() * 9);
	const spriteY = Math.floor(Math.random() * 9);
	const species = getSpeciesId(spriteX, spriteY);
	const size = 64 + Math.random() * 64;
	const aggressive = Math.random() < 0.08;
	
	let x, y, vx, vy;
	
	if (spawnFromEdge) {
		const spawn = getSpawnPosition(width, height);
		x = spawn.x;
		y = spawn.y;
		vx = spawn.vx;
		vy = spawn.vy;
	} else {
		x = Math.random() * (width - 100);
		y = Math.random() * (height - 100);
		vx = (Math.random() - 0.5) * 2;
		vy = (Math.random() - 0.5) * 1;
	}

	const antisocial = Math.random() < 0.15;
	const predatorAntisocial = aggressive && Math.random() < 0.7;
	const rejectsSwarm = antisocial || predatorAntisocial;

	return {
		id,
		x,
		y,
		vx,
		vy,
		size,
		spriteX,
		spriteY,
		species,
		direction: vx >= 0 ? 1 : -1,
		goalX: null,
		goalY: null,
		targetX: null,
		targetY: null,
		targetDistance: 100 + Math.random() * 200,
		changeTimer: 0,
		personality: Math.random(),
		aggressive,
		rejectsSwarm,
		nextEatTime: aggressive ? Date.now() + (20000 + Math.random() * 40000) : 0,
		alive: true,
		dying: false,
		deathTimer: 0,
		fear: 0,
		hunger: Math.random() * 0.5,
		energy: 0.8 + Math.random() * 0.2,
		lastFeedTime: Date.now() - Math.random() * 60000,
		groupLeader: false,
		followTarget: null,
		depth: Math.random(),
		curiosity: Math.random(),
		territorial: Math.random() < 0.15,
		territory: spawnFromEdge ? null : { x, y, radius: 100 + Math.random() * 200 }
	};
};

const createFishStore = () => {
	const { subscribe, set, update } = writable([]);
	let fish = [];
	let predators = [];

	const spawnFish = () => {
		if (!browser) return;
		const width = window.innerWidth;
		const height = window.innerHeight;
		
		if (fish.length < MAX_FISH) {
			const newFish = createFish(Date.now(), width, height, true);
			fish.push(newFish);
		}
	};

	const store = {
		subscribe,

		initialize() {
			if (!browser) return;
			const width = window.innerWidth;
			const height = window.innerHeight;
			fish = Array.from({ length: Math.floor(Math.max(MAX_FISH / 4, Math.random() * MAX_FISH)) }, (_, i) => createFish(i, width, height, false));
			set(fish);
			store.saveToStorage();
			
			setInterval(() => {
				spawnFish();
				set([...fish]);
			}, 3000 + Math.random() * 2000);
		},

		updatePositions() {
			if (!browser) return;

			const width = window.innerWidth;
			const height = window.innerHeight;
			const now = Date.now();

			fish = fish.filter(f => f.alive && !f.dying);

			fish.forEach(f => {
				if (f.dying) {
					f.deathTimer++;
					f.vy -= 0.05;
					f.vx *= 0.98;
					f.direction = -1;
					
					f.x += f.vx;
					f.y += f.vy;
					
					if (f.y < -100) {
						f.alive = false;
					}
					return;
				}
			});
			predators = fish.filter(f => f.aggressive && f.size > 100);

			fish.forEach(f => {
				f.hunger = Math.min(1, f.hunger + 0.0001);
				f.energy = Math.max(0.1, f.energy - 0.00005);
				f.fear = Math.max(0, f.fear - 0.01);

				let targetVx = f.vx;
				let targetVy = f.vy;

				const sameSpecies = fish.filter(other =>
					other !== f &&
					other.species === f.species &&
					other.alive &&
					Math.hypot(f.x - other.x, f.y - other.y) < 140
				);

				const isADHD = f.personality > 0.8 && Math.random() < 0.002;
				if (sameSpecies.length && !f.rejectsSwarm && !isADHD) {
					let centerX = 0, centerY = 0, avgVx = 0, avgVy = 0;
					let separationX = 0, separationY = 0, separationCount = 0;

					sameSpecies.forEach(o => {
						if (o.rejectsSwarm) return;
						const dx = f.x - o.x;
						const dy = f.y - o.y;
						const dist = Math.hypot(dx, dy);

						centerX += o.x;
						centerY += o.y;
						avgVx += o.vx;
						avgVy += o.vy;

						if (dist < 50 && dist > 0) {
							const strength = (50 - dist) / 50;
							separationX += (dx / dist) * strength;
							separationY += (dy / dist) * strength;
							separationCount++;
						}
					});

					const social = sameSpecies.filter(o => !o.rejectsSwarm);
					const N = social.length;
					if (N) {
						centerX /= N;
						centerY /= N;
						avgVx /= N;
						avgVy /= N;

						const toCenterX = centerX - f.x;
						const toCenterY = centerY - f.y;
						const dist = Math.hypot(toCenterX, toCenterY);

						if (dist > 50 && dist < 220) {
							const strength = Math.min(0.05, 0.2 / N);
							targetVx += (toCenterX / dist) * strength;
							targetVy += (toCenterY / dist) * strength;
						}

						targetVx += (avgVx - f.vx) * 0.06;
						targetVy += (avgVy - f.vy) * 0.06;

						if (separationCount) {
							const strength = Math.min(0.15, 0.4 / separationCount);
							targetVx += (separationX / separationCount) * strength;
							targetVy += (separationY / separationCount) * strength;
						}
					}
				} else if (isADHD || f.rejectsSwarm) {
					if (!f.targetX || !f.targetY) {
						const angle = Math.random() * Math.PI * 2;
						f.targetX = f.x + Math.cos(angle) * f.targetDistance;
						f.targetY = f.y + Math.sin(angle) * f.targetDistance;
						f.targetX = Math.max(100, Math.min(width - 100, f.targetX));
						f.targetY = Math.max(100, Math.min(height - 100, f.targetY));
					}
					
					const dx = f.targetX - f.x;
					const dy = f.targetY - f.y;
					const dist = Math.hypot(dx, dy);
					
					if (dist > 15) {
						const seek = 0.04 * f.energy;
						targetVx += (dx / dist) * seek;
						targetVy += (dy / dist) * seek;
					} else {
						f.targetX = null;
						f.targetY = null;
						f.targetDistance = 80 + Math.random() * 240;
					}
					
					if (isADHD) f.changeTimer = Math.max(f.changeTimer, 60);
				}

				predators.forEach(pred => {
					if (pred === f || pred.size <= f.size) return;
					const dx = f.x - pred.x;
					const dy = f.y - pred.y;
					const dist = Math.hypot(dx, dy);
					if (dist < 250) {
						const flee = (1 - dist / 250) * 0.3;
						targetVx += (dx / dist) * flee;
						targetVy += (dy / dist) * flee;
						f.fear = Math.min(1, f.fear + 0.1);
					}
				});

				if (f.territorial && f.territory) {
					const dx = f.territory.x - f.x;
					const dy = f.territory.y - f.y;
					const dist = Math.hypot(dx, dy);

					if (dist > f.territory.radius) {
						targetVx += (dx / dist) * 0.08;
						targetVy += (dy / dist) * 0.08;
					}

					fish.forEach(o => {
						if (o === f || o.size > f.size * 1.2) return;
						const odx = o.x - f.territory.x;
						const ody = o.y - f.territory.y;
						const odist = Math.hypot(odx, ody);

						if (odist < f.territory.radius * 0.7) {
							const chaseDx = o.x - f.x;
							const chaseDy = o.y - f.y;
							const chaseDist = Math.hypot(chaseDx, chaseDy);
							if (chaseDist < 100) {
								targetVx += (chaseDx / chaseDist) * 0.12;
								targetVy += (chaseDy / chaseDist) * 0.12;
							}
						}
					});
				}

				if (f.aggressive && now >= f.nextEatTime && f.hunger > 0.3) {
					for (let o of fish) {
						if (o === f || !o.alive || o.size >= f.size * 0.8) continue;

						const dx = o.x - f.x;
						const dy = o.y - f.y;
						const dist = Math.hypot(dx, dy);

						if (dist < f.size * 0.4) {
							o.dying = true;
							o.deathTimer = 0;

							if (f.size >= 160) {
								f.dying = true;
								f.deathTimer = 0;
							} else {
								f.size = Math.min(f.size + o.size * 0.10, 160);
								f.hunger = Math.max(0, f.hunger - 0.3);
								f.energy = Math.min(1, f.energy + 0.2);
							}

							f.nextEatTime = now + 25000 + Math.random() * 35000;
							break;

						} else if (dist < 180) {
							targetVx += (dx / dist) * 0.1;
							targetVy += (dy / dist) * 0.1;
						}
					}
				}


				f.changeTimer -= 1;
				if (f.changeTimer <= 0) {
					const nearTerritory = f.territorial && f.territory && Math.random() < 0.6;
					if (Math.random() < 0.4) {
						if (nearTerritory) {
							const a = Math.random() * Math.PI * 2;
							const r = Math.random() * f.territory.radius * 0.8;
							f.targetX = f.territory.x + Math.cos(a) * r;
							f.targetY = f.territory.y + Math.sin(a) * r;
						} else {
							const angle = Math.random() * Math.PI * 2;
							f.targetX = f.x + Math.cos(angle) * f.targetDistance;
							f.targetY = f.y + Math.sin(angle) * f.targetDistance;
							f.targetX = Math.max(100, Math.min(width - 100, f.targetX));
							f.targetY = Math.max(100, Math.min(height - 100, f.targetY));
						}
					}
					f.changeTimer = 50 + Math.random() * 150;
				}

				if (f.targetX != null && f.targetY != null) {
					const dx = f.targetX - f.x;
					const dy = f.targetY - f.y;
					const dist = Math.hypot(dx, dy);
					if (dist > 15) {
						const seek = 0.035 * (1 - f.personality * 0.5) * f.energy;
						targetVx += (dx / dist) * seek;
						targetVy += (dy / dist) * seek;
					} else {
						f.targetX = null;
						f.targetY = null;
						f.targetDistance = 80 + Math.random() * 240;
					}
				}

				f.vx = lerp(f.vx, targetVx, 0.15);
				f.vy = lerp(f.vy, targetVy, 0.15);

				const speed = Math.hypot(f.vx, f.vy);
				const baseMax = Math.max(1.2, 4.5 - f.size / 80);
				const max = baseMax * f.energy * (f.fear > 0.5 ? 1.6 : 1);
				const min = 0.4;

				if (speed > max) {
					f.vx = (f.vx / speed) * max;
					f.vy = (f.vy / speed) * max;
				} else if (speed < min && speed > 0.01) {
					f.vx = (f.vx / speed) * min;
					f.vy = (f.vy / speed) * min;
				} else if (speed <= 0.01) {
					const a = Math.random() * Math.PI * 2;
					f.vx = Math.cos(a) * min;
					f.vy = Math.sin(a) * min;
				}

				const strong = 150;
				if (f.x < strong) f.vx += Math.pow((strong - f.x) / strong, 2) * 0.2;
				if (f.x > width - strong) f.vx -= Math.pow((f.x - (width - strong)) / strong, 2) * 0.2;
				if (f.y < strong) f.vy += Math.pow((strong - f.y) / strong, 2) * 0.2;
				if (f.y > height - strong) f.vy -= Math.pow((f.y - (height - strong)) / strong, 2) * 0.2;

				f.x += f.vx;
				f.y += f.vy;
				f.x = Math.max(-50, Math.min(width + 50, f.x));
				f.y = Math.max(-50, Math.min(height + 50, f.y));
				f.direction = f.vx >= 0 ? 1 : -1;
				f.depth += (Math.random() - 0.5) * 0.01;
				f.depth = Math.max(0, Math.min(1, f.depth));
			});

			set([...fish]);
			store.saveToStorage();
		},

		saveToStorage() {
			if (browser) {
				const fishData = fish.map(f => ({
					id: f.id,
					x: f.x,
					y: f.y,
					vx: f.vx,
					vy: f.vy,
					size: f.size,
					spriteX: f.spriteX,
					spriteY: f.spriteY,
					species: f.species,
					aggressive: f.aggressive,
					rejectsSwarm: f.rejectsSwarm,
					personality: f.personality,
					territorial: f.territorial,
					territory: f.territory,
					alive: f.alive
				}));
				localStorage.setItem(STORAGE_KEY, JSON.stringify(fishData));
			}
		},

		loadFromStorage() {
			if (!browser) return;
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				try {
					const fishData = JSON.parse(saved).filter(f => f.alive);
					const width = window.innerWidth;
					const height = window.innerHeight;
					
					fish = fishData.map(data => ({
						...createFish(data.id, width, height, false),
						...data,
						direction: data.vx >= 0 ? 1 : -1,
						fear: 0,
						hunger: Math.random() * 0.3,
						energy: 0.7 + Math.random() * 0.3,
						lastFeedTime: Date.now() - Math.random() * 30000,
						nextEatTime: data.aggressive ? Date.now() + Math.random() * 30000 : 0,
						rejectsSwarm: data.rejectsSwarm !== undefined ? data.rejectsSwarm : 
							(Math.random() < 0.15 || (data.aggressive && Math.random() < 0.7)),
						targetX: null,
						targetY: null,
						targetDistance: 80 + Math.random() * 240
					}));
					
					set(fish);
				} catch (e) {
					console.error('Failed to load fish data:', e);
				}
			}
		},

		addFish() {
			if (!browser) return;
			const width = window.innerWidth;
			const height = window.innerHeight;
			if (fish.length < MAX_FISH) {
				const newFish = createFish(Date.now(), width, height, true);
				fish.push(newFish);
				set([...fish]);
			}
		},

		getStats() {
			const species = {};
			let aggressive = 0;
			let territorial = 0;
			
			fish.forEach(f => {
				if (f.alive) {
					species[f.species] = (species[f.species] || 0) + 1;
					if (f.aggressive) aggressive++;
					if (f.territorial) territorial++;
				}
			});
			
			return {
				total: fish.filter(f => f.alive && !f.dying).length,
				species,
				aggressive,
				territorial,
				antisocial: fish.filter(f => f.alive && !f.dying && f.rejectsSwarm).length,
				speciesCount: Object.keys(species).length
			};
		}
	};

	return store;
};

export const fishStore = createFishStore();
