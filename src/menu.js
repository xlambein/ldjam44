
const MENU_WIDTH = 280;

class Menu extends PIXI.Container {
	constructor() {
		super();

		// Background
		const border = 5;
		this.background = new PIXI.Graphics();
		this.addChild(this.background);
		this.background.beginFill(0xCCCCCC);
		this.background.drawRect(0, 0, MENU_WIDTH, SCREEN_HEIGHT);
		this.background.beginFill(0xFFFFFF);
		this.background.drawRect(MENU_WIDTH-border, 0, border, 600);
		this.background.endFill();

		// Biomass title
		this.biomassTitle = new PIXI.Text(
			'Biomass', new PIXI.TextStyle({
				fontFamily: 'courier new',
				fontSize: 24
			})
		);
		this.addChild(this.biomassTitle);
		this.biomassTitle.x = MENU_WIDTH - 15;
		this.biomassTitle.y = 16;
		this.biomassTitle.anchor.x = 1.;

		// Biomass symbol
		this.biomassSymbol = new PIXI.Sprite(atlas["dna"]);
		this.addChild(this.biomassSymbol);
		this.biomassSymbol.scale.set(.5);
		this.biomassSymbol.anchor.x = 1.;
		this.biomassSymbol.position.set(MENU_WIDTH - 10, 50);

		// Biomass text
		this.biomassText = new PIXI.Text(
			'', new PIXI.TextStyle({
				fontFamily: 'courier new',
				fontSize: 36,
				fontWeight: 'bold'
			})
		);
		this.addChild(this.biomassText);
		this.biomassText.x = MENU_WIDTH - 55;
		this.biomassText.y = 50;
		this.biomassText.anchor.x = 1.;
	}

	setBiomass(biomass) {
		this.biomassText.text = biomass;
	}

	setRecipe(recipe, nextRecipe) {
		if (this.recipe) {
			this.recipe.destroy();
			this.recipe = null;
		}
		this.recipe = new RecipeMenu(recipe);
		this.addChild(this.recipe);
		this.recipe.position.set(10, 100);

		if (this.nextRecipe) {
			this.nextRecipe.destroy();
			this.nextRecipe = null;
		}
		if (nextRecipe) {
			this.nextRecipe = new RecipeMenu(nextRecipe, false);
			this.addChild(this.nextRecipe);
			this.nextRecipe.position.set(10, this.recipe.y + this.recipe.height + 10);
		}
	}
}

const INGREDIENT_SIZE = 41,
	INGREDIENTS_MARGIN = {
		'top': 40,
		'left': 10
	},
	N_INGREDIENTS_PER_LINE = 6;

class RecipeMenu extends PIXI.Container {
	constructor(recipe, active) {
		super();

		if (active === undefined) active = true;

		let fill;
		if (active)
			fill = 0xFFFFFF;
		else
			fill = 0xFFCCCC;

		let ingredients = recipe.listIngredients();
		let nLines = Math.ceil(ingredients.length / N_INGREDIENTS_PER_LINE);

		const width = MENU_WIDTH - 25,
			height = nLines * INGREDIENT_SIZE + INGREDIENTS_MARGIN.top + 30;

		this.background = new PIXI.Graphics();
		this.addChild(this.background);
		this.background.beginFill(fill);
		this.background.drawRect(0, 0, width, height);
		this.background.endFill();

		this.titleText = new PIXI.Text(
			recipe.title, new PIXI.TextStyle({
				fontFamily: 'courier new',
				fontSize: 20,
			})
		);
		this.addChild(this.titleText);
		this.titleText.position.set(MENU_WIDTH - 35, 10);
		this.titleText.anchor.x = 1.;

		this.ingredients = new PIXI.Container();
		this.addChild(this.ingredients);
		this.ingredients.position.set(INGREDIENTS_MARGIN.left, INGREDIENTS_MARGIN.top);
		this.setIngredients(recipe);

		// Biomass symbol
		this.biomassSymbol = new PIXI.Sprite(atlas["dna"]);
		this.addChild(this.biomassSymbol);
		this.biomassSymbol.scale.set(.33);
		this.biomassSymbol.anchor.x = 1.;
		this.biomassSymbol.anchor.y = 1.;
		this.biomassSymbol.position.set(MENU_WIDTH - 30, height - 5);

		let biomassTextText;
		if (active)
			biomassTextText = "+" + recipe.value;
		else
			biomassTextText = "≥" + recipe.minBiomass;

		// Biomass text
		this.biomassText = new PIXI.Text(
			biomassTextText, new PIXI.TextStyle({
				fontFamily: 'courier new',
				fontSize: 20,
				fontWeight: 'bold'
			})
		);
		this.addChild(this.biomassText);
		this.biomassText.position.set(MENU_WIDTH - 30 - 30, height - 10);
		this.biomassText.anchor.x = 1.;
		this.biomassText.anchor.y = 1.;
	}

	setIngredients(recipe) {
		let ingredients = recipe.listIngredients();

		this.ingredients.removeChildren();
		for (let i = 0; i < ingredients.length; i++) {
			let sprite = new PIXI.Sprite(atlas[ASTEROID_IMAGES[ingredients[i].type]]);
			this.ingredients.addChild(sprite);
			sprite.x = INGREDIENT_SIZE * (i % N_INGREDIENTS_PER_LINE);
			sprite.y = INGREDIENT_SIZE * Math.floor(i / N_INGREDIENTS_PER_LINE);
			sprite.scale.set(.5);
			if (ingredients[i].remaining) {
				sprite.alpha = .5;
			}
		}
	}
}

