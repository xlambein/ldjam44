let Application = PIXI.Application,
    Container = PIXI.Container,
		Graphics = PIXI.Graphics;

const FPS = 60,
	ASTEROID_MAX_SPEED = 400,
	ASTEROID_MAX_STRETCH = 300,
	SCREEN_SHAKE_INTENSITY = 10,
	SCREEN_SHAKE_SPEED = 10,
	SCREEN_SHAKE_DAMPENING = 5,
	ASTEROID_SPAWN_TIME = 1.5,
	ASTEROID_TOUCHBOX_RADIUS = 70,
	ASTEROID_SPAWN_DISTANCE = 1300,
	ASTEROID_DESPAWN_DISTANCE = 1500,
	EXTINCTION_RATE = 1.25,
	SCREEN_WIDTH = 1067,
	SCREEN_HEIGHT = 600;
	
function fullscreenize(e){
		if(document.documentElement.requestFullscreen) {
				document.documentElement.requestFullscreen();
		} else if(document.documentElement.mozRequestFullScreen) {
				document.documentElement.mozRequestFullScreen();
		} else if(document.documentElement.webkitRequestFullscreen) {
				document.documentElement.webkitRequestFullscreen();
		} else if(document.documentElement.msRequestFullscreen) {
				document.documentElement.msRequestFullscreen();
		}
}

const app = new Application({
    width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: 0x000000,
});
document.body.appendChild(app.view);
app.view.ontouchstart = fullscreenize;
app.stop();

PIXI.loader
	.add('atlas', 'assets/images/textures.json')
	.load(setup);

let planet;
let asteroids = [];
let viewport;
let atlas;
let aimLine;
let selectedAsteroid = null;
let pointer = {x: null, y: null};
let asteroidSpawnerTicker, asteroidSpawnerTime = 0;
let biomass = 10;
let recipe, nextRecipe;

let biomassText, menu;

const RECIPE_TEMPLATES = [
	{
		title: "Protocells",
		value: 10,
		minBiomass: 1,
		ingredients: [1, 0, 0, 0, 0, 0, 0, 0, 0],
	},
	{
		title: "Procaryotes",
		value: 20,
		minBiomass: 40,
		ingredients: [1, 1, 0, 0, 0, 0, 0, 0, 0],
	},
	{
		title: "Bacteria",
		value: 50,
		minBiomass: 100,
		ingredients: [1, 1, 1, 0, 0, 0, 0, 0, 0],
	},
	{
		title: "Archea",
		value: 50,
		minBiomass: 250,
		ingredients: [1, 2, 0, 1, 1, 0, 0, 0, 0],
	},
	{
		title: "Eucaryotes",
		value: 200,
		minBiomass: 400,
		ingredients: [2, 2, 1, 1, 1, 0, 0, 0, 0],
	},
	{
		title: "Multicellulars",
		value: 1000,
		minBiomass: 1000,
		ingredients: [2, 3, 2, 2, 2, 1, 0, 0, 0],
	},
	{
		title: "Plants",
		value: 5000,
		minBiomass: 4000,
		ingredients: [4, 3, 2, 3, 1, 1, 1, 0, 0],
	},
	{
		title: "Animals",
		value: 10000,
		minBiomass: 15000,
		ingredients: [3, 4, 2, 4, 3, 1, 0, 1, 0],
	},
	{
		title: "Sentients",
		value: 20000,
		minBiomass: 40000,
		ingredients: [3, 3, 3, 3, 4, 2, 1, 1, 2],
	},
];

function getRecipeTemplate() {
	// Random version
	/*
	if (biomass == 0) throw Error("No template for that biomass");

	var template;
	do {
		let i = Math.floor(Math.random() * RECIPE_TEMPLATES.length);
		console.log(i);
		template = RECIPE_TEMPLATES[i];
	} while(template.minBiomass > biomass);
	return template;
	*/

 	// Non-random version
	for (let i = RECIPE_TEMPLATES.length-1; i >= 0; i--) {
		let template = RECIPE_TEMPLATES[i];
		if (biomass >= template.minBiomass)
			return template;
	}
	throw Error("No template for that biomass");
}

function setRecipes() {
 	// Non-random version
	for (let i = RECIPE_TEMPLATES.length-1; i >= 0; i--) {
		let template = RECIPE_TEMPLATES[i];
		if (biomass >= template.minBiomass) {
			recipe = Recipe.fromTemplate(template);
			if (i < RECIPE_TEMPLATES.length-1)
				nextRecipe = Recipe.fromTemplate(RECIPE_TEMPLATES[i+1]);
			else
				nextRecipe = null;
			return;
		}
	}
	throw Error("No template for that biomass");
}

class Recipe {
	constructor(title, value, minBiomass, ingredients) {
		this.title = title;
		this.value = value;
		this.minBiomass = minBiomass;
		this.ingredients = ingredients.slice(0);
		this.remaining = ingredients.slice(0);
	}

	static fromTemplate(template) {
		return new Recipe(template.title, template.value, template.minBiomass, template.ingredients);
	}

	collect(ingredient) {
		if (this.remaining[ingredient] > 0) {
			this.remaining[ingredient] -= 1;
			return true;
		} else {
			this.resetRemaining();
			return false;
		}
	}

	resetRemaining() {
		this.remaining = this.ingredients.slice(0);
	}

	isCompleted() {
		for (let i = 0; i < this.remaining.length; i++) {
			if (this.remaining[i] > 0) return false;
		}
		return true;
	}

	listIngredients() {
		let list = [];
		for (let i = 0; i < this.ingredients.length; i++) {
			for (let j = 0; j < this.ingredients[i] - this.remaining[i]; j++) {
				list.push({
					type: i,
					remaining: false
				});
			}
			for (let j = 0; j < this.remaining[i]; j++) {
				list.push({
					type: i,
					remaining: true
				});
			}
		}

		return list;
	}
}

function setup() {
	viewport = new Container();
	viewport.x = (SCREEN_WIDTH - MENU_WIDTH)/2 + MENU_WIDTH;
	viewport.y = SCREEN_HEIGHT/2;
	viewport.scale.set(.5);
	viewport.ox = viewport.x;
	viewport.oy = viewport.y;
	app.stage.addChild(viewport);

	atlas = PIXI.loader.resources['atlas'].textures;

	planet = createObject("planet", 0, 0, .1);
	planet.radius = 100;

	aimLine = new Graphics();
	viewport.addChild(aimLine);

	setRecipes();

	/// MENU ///
	menu = new Menu();
	app.stage.addChild(menu);
	menu.setBiomass(biomass);
	menu.setRecipe(recipe, nextRecipe);
	
	/// GAME LOOP ///
	app.ticker.add(delta => gameLoop(delta));
	app.start();

	asteroidSpawnerTicker = new PIXI.ticker.Ticker();
	asteroidSpawnerTicker.add((delta) => {
		asteroidSpawnerTime += 1/FPS * delta;
		if (asteroidSpawnerTime > ASTEROID_SPAWN_TIME) {
			spawnAsteroid();
			asteroidSpawnerTime = 0;
		}
	});
	asteroidSpawnerTicker.start();
}

let shakeTime;
let shakeTicker;
function shakeScreen(dx, dy) {
	if (shakeTicker) {
		shakeTicker.stop();
		shakeTicker.destroy();
	}
	shakeTicker = new PIXI.ticker.Ticker();
	shakeTicker.stop();

	shakeTime = 0.;

	shakeTicker.add((delta) => {
		shakeTime += 1./FPS * delta;
		let offset = Math.exp(-shakeTime*SCREEN_SHAKE_DAMPENING) * Math.cos(2 * Math.PI * shakeTime*SCREEN_SHAKE_SPEED);

		if (shakeTime > 10./SCREEN_SHAKE_DAMPENING) {
			offset = 0.;
			shakeTicker.stop();
			shakeTicker.destroy();
			shakeTicker = null;
		}

		viewport.x = viewport.ox + dx * offset * SCREEN_SHAKE_INTENSITY;
		viewport.y = viewport.oy + dy * offset * SCREEN_SHAKE_INTENSITY;
	});

	shakeTicker.start();
}

function hitTestCircles(l, r) {
	let d = Math.sqrt((l.x - r.x)**2 + (l.y - r.y)**2);
	return d < (l.radius + r.radius);
}

function playExplosion(x, y) {
	let explosion = new PIXI.extras.AnimatedSprite([
		atlas['explosion01'],
		atlas['explosion02'],
		atlas['explosion03']
	]);
	explosion.loop = false;
	explosion.position.set(x, y);
	explosion.anchor.set(.5);
	explosion.rotation = Math.random() * Math.PI * 2;
	explosion.animationSpeed = .04;
	explosion.onComplete = () => {
		explosion.destroy();
	};

	explosion.play();
	viewport.addChild(explosion);
}

function norm(x, y) {
	return Math.sqrt(x*x + y*y);
}

function normalize(x, y) {
	let n = norm(x, y);
	return {'x': x/n, 'y': y/n};
}

function gameLoop(delta) {
	let dt = 1/FPS * delta;

	for (let object of viewport.children) {
		if (object.vx) {
			object.x += object.vx * dt;
			object.y += object.vy * dt;
		}
		if (object.vrot) {
			object.rotation += object.vrot * dt;
		}
	}

	for (var i = asteroids.length - 1; i >= 0; i--) {
		let r = norm(asteroids[i].x, asteroids[i].y);
		asteroids[i].vx -= dt * 1.e7 * asteroids[i].x / r**3;
		asteroids[i].vy -= dt * 1.e7 * asteroids[i].y / r**3;

		if (hitTestCircles(asteroids[i], planet)) {
			let d = normalize(
				-asteroids[i].vx,
				-asteroids[i].vy
			);

			let type = asteroids[i].type;
			if (recipe.collect(type)) {
				if (recipe.isCompleted()) {
					biomass += recipe.value;
					menu.setBiomass(biomass);
					setRecipes();
					menu.setRecipe(recipe, nextRecipe);
				}
			} else {
				biomass = Math.floor(biomass/EXTINCTION_RATE);
				if (biomass == 0) {
					avengers4();
				}
				menu.setBiomass(biomass);
				setRecipes();
				menu.setRecipe(recipe, nextRecipe);
			}

			playExplosion(asteroids[i].x, asteroids[i].y);
			shakeScreen(d.x, d.y);
			asteroids[i].destroy();
			asteroids.splice(i, 1);
			continue;
		}

		if (Math.abs(asteroids[i].x) > ASTEROID_DESPAWN_DISTANCE
			|| Math.abs(asteroids[i].y) > ASTEROID_DESPAWN_DISTANCE) {
			asteroids[i].destroy();
			asteroids.splice(i, 1);
			continue;
		}
	}

	aimLine.clear();
	if (selectedAsteroid && !selectedAsteroid._destroyed) {
		const mouse = app.renderer.plugins.interaction.mouse;
		//const pos = mouse.getLocalPosition(selectedAsteroid.parent);
		const pos = pointer;
		const d = limitVectorNorm(
			pos.x - selectedAsteroid.x,
			pos.y - selectedAsteroid.y,
			ASTEROID_MAX_STRETCH
		);

		aimLine.lineStyle(10, 0xffffff, 1);
		aimLine.moveTo(selectedAsteroid.x, selectedAsteroid.y);
		aimLine.lineTo(selectedAsteroid.x + d.x, selectedAsteroid.y + d.y);
	}
	
	menu.recipe.setIngredients(recipe);
}

function avengers4() {  // End game
	throw Error("You lost!");  // TODO Make this less stupid
}

function createObject(image, x, y, vrot) {
	let object = new PIXI.Sprite(atlas[image]);
	object.anchor.set(.5, .5);
	object.position.set(x, y);
	object.vx = 0;
	object.vy = 0;
	object.vrot = vrot;
	object.radius = Math.min(object.width, object.height) / 2 - 2;

	viewport.addChild(object);

	return object;
}

function createAsteroid(image, x, y, vrot) {
	let asteroid = createObject(image, x, y, vrot);
	asteroid.interactive = true;
	asteroid.buttonMode = true;
	asteroid.hitArea = new PIXI.Circle(0, 0, ASTEROID_TOUCHBOX_RADIUS);

	asteroid
		.on("pointerover", asteroidPointerOver)
		.on("pointerout", asteroidPointerOut)
		.on("pointermove", asteroidPointerMove)
		.on("pointerdown", asteroidPointerDown)
		.on("pointerup", asteroidPointerUp)
		.on("pointerupoutside", asteroidPointerUp);
	
	return asteroid;
}

const N_ASTEROID_TYPES = 9;
const ASTEROID_IMAGES = [
	"asteroid02", // blue = water
	"asteroid01", // turquoise = carbon
	"asteroid03", // green = phosphorus
	"asteroid04", // red = oxygen
	"asteroid09", // gray = iron
	"asteroid05", // gold = copper
	"asteroid06", // pink = 
	"asteroid08", // purple =
	"asteroid07", // yellow-green = uranium
];
function spawnAsteroid() {
	let theta = Math.random() * Math.PI * 2;
	let x = ASTEROID_SPAWN_DISTANCE * Math.cos(theta),
		  y = ASTEROID_SPAWN_DISTANCE * Math.sin(theta);
	let v = 60 + Math.random() * 60;
	let direction = theta + Math.PI + (Math.random() - .5) * Math.PI/2;
	let vx = v * Math.cos(direction),
		  vy = v * Math.sin(direction);
	let vrot = (Math.random() - .5) * 2 * 3;
	let type = Math.floor(Math.random() * N_ASTEROID_TYPES)
	let image = ASTEROID_IMAGES[type];

	let asteroid = createAsteroid(image, x, y, vrot);
	asteroid.type = type;
	asteroid.vx = vx;
	asteroid.vy = vy;

	asteroids.push(asteroid);

	return asteroid;
}

function asteroidPointerOver() {
	this.scale.set(1.1);
}

function asteroidPointerOut() {
	this.scale.set(1.);
}

function asteroidPointerMove(event) {
	if (this.isPointerDown) {
		pointer = event.data.getLocalPosition(this.parent);
	}
}

function asteroidPointerDown(event) {
	this.isPointerDown = true;
	this.data = event.data;
	pointer = event.data.getLocalPosition(this.parent);
	selectedAsteroid = this;
}

function asteroidPointerUp() {
	if (this.isPointerDown) {
		const pos = this.data.getLocalPosition(this.parent);
		const d = limitVectorNorm(
			this.x - pos.x,
			this.y - pos.y,
			ASTEROID_MAX_STRETCH
		);

		this.vx = d.x / ASTEROID_MAX_STRETCH * ASTEROID_MAX_SPEED;
		this.vy = d.y / ASTEROID_MAX_STRETCH * ASTEROID_MAX_SPEED;

		this.isPointerDown = false;
		this.data = null;
		selectedAsteroid = null;
		aimLine.clear();
	}
}

function limitVectorNorm(x, y, maxNorm) {
	let n = Math.sqrt(x*x + y*y);
	x = x / n * Math.min(n, maxNorm);
	y = y / n * Math.min(n, maxNorm);
	return {'x': x, 'y': y};
}

