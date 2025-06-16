const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const DButils = require("./DButils");

// ────────────────────────────────────────────────────────────
// In-memory cache  (key = recipe_id, value = recipe object)
// You can replace this Map with node-cache, lru-cache or Redis.
// ────────────────────────────────────────────────────────────
const recipeCache = new Map();

/**
 * Fetch **all** data we need for a single recipe and
 * return it in the structure the frontend expects
 *
 * ───────────── data sources ─────────────
 * • basic info  → GET /{id}/information
 * • ingredients → GET /{id}/ingredientWidget.json
 * • steps       → GET /{id}/analyzedInstructions
 * ---------------------------------------
 *
 * The function also merges `favorite` / `viewed` flags when
 * a userId is passed – so every caller automatically gets them.
 */
async function getRecipeInformation(recipe_id, userId = null) {
  /* 1.  Serve from cache if possible */
  if (recipeCache.has(recipe_id)) {
    const cached = recipeCache.get(recipe_id);
    // if we get here with a userId we still have to add the flags
    if (userId && !('favorite' in cached)) {
      await addFlags([cached], userId);
    }
    return cached;
  }

  /* 2.  Parallel API calls */
  const [infoRes, ingRes, stepRes] = await Promise.all([
    axios.get(`${api_domain}/${recipe_id}/information`, {
      params: { includeNutrition: false, apiKey: process.env.spoonacular_apiKey },
    }),
    axios.get(`${api_domain}/${recipe_id}/ingredientWidget.json`, {
      params: { apiKey: process.env.spoonacular_apiKey },
    }),
    axios.get(`${api_domain}/${recipe_id}/analyzedInstructions`, {
      params: { apiKey: process.env.spoonacular_apiKey },
    }),
  ]);

  /* 3.  Build ingredients array ("2 cups sugar" …) */
  const ingredients = ingRes.data.ingredients.map((ing) => {
    const { value, unit } = ing.amount.metric;      // metric units
    return `${value} ${unit} ${ing.name}`;
  });

  /* 4.  Build steps array */
  const steps = (stepRes.data[0]?.steps || []).map((s) => s.step);

  /* 5.  Assemble our recipe object */
  const {
    id,
    title,
    readyInMinutes: duration,
    image,
    vegan,
    vegetarian,
    glutenFree,
    servings,
  } = infoRes.data;

  const recipeObj = {
    id,
    title,
    duration,
    image,
    vegan,
    vegetarian,
    glutenFree,
    servings,
    ingredients,
    steps,
    /* flags get added in a moment */
  };

  /* 6.  Add favorite / viewed flags when we know the user */
  if (userId) await addFlags([recipeObj], userId);

  /* 7.  Save to cache & return */
  recipeCache.set(recipe_id, recipeObj);
  return recipeObj;
}

/* helper ----------------------------------------------------*/
async function addFlags(recArr, userId) {
  const favIds  = await DButils.execQuery(
    `SELECT API_recipe_id FROM favorite_recipes WHERE user_id = ${userId}`
  );
  const viewIds = await DButils.execQuery(
    `SELECT API_recipe_id FROM watched_recipes WHERE user_id = ${userId}`
  );

  const favSet  = new Set(favIds.map((r) => r.API_recipe_id));
  const viewSet = new Set(viewIds.map((r) => r.API_recipe_id));

  recArr.forEach((r) => {
    r.favorite = favSet.has(r.id);
    r.viewed   = viewSet.has(r.id);
  });
}

async function getRecipeDetails(recipe_id, userId = null) {
  // just delegate to the new universal function
  return getRecipeInformation(recipe_id, userId);
}

/**
 * Get previews for multiple recipes by ID
 * @param {Array} recipe_ids - array of Spoonacular recipe IDs
 * @returns {Array} recipe previews
 */
async function getRecipesPreview(recipe_ids) {
  try {
    const previewPromises = recipe_ids.map((id) =>
      getRecipeDetails(id)
    );
    const recipes = await Promise.all(previewPromises);
    return recipes;
  } catch (error) {
    throw error;
  }
}

/**
 * Insert a custom recipe into the user_recipes table
 */
async function insertRecipe(user_id, recipeData) {
  const {
    id, 
    title,
    image,
    duration,
    vegan,
    vegetarian,
    glutenFree,
    ingredients,
    steps,
    servings,
  } = recipeData;

  const ingredientsJSON = JSON.stringify(ingredients);
  const instructions = JSON.stringify(steps);

  const veganVal = vegan ? 1 : 0;
  const vegetarianVal = vegetarian ? 1 : 0;
  const glutenFreeVal = glutenFree ? 1 : 0;

  const insertQuery = `
  INSERT INTO user_recipes 
    (user_id, title, image, prep_time, servings, instructions, ingredients, is_vegan, is_vegetarian, is_gluten_free)
  VALUES 
    (${user_id}, '${title.replace(/'/g, "''")}', '${image.replace(/'/g, "''")}', ${duration}, ${servings}, '${instructions}', '${ingredientsJSON}', ${veganVal}, ${vegetarianVal}, ${glutenFreeVal});
    `;

  await DButils.execQuery(insertQuery);
}

/**
 * Search recipes using Spoonacular API
 */
async function searchRecipesFromAPI({ query, cuisine, diet, intolerance, limit, userId = null }) {
  try {
    console.log("Calling Spoonacular with:", { query, cuisine, diet, intolerance, limit });

    // 1) Initial search (IDs  basic fields)
    const searchRes = await axios.get(`${api_domain}/complexSearch`, {
      params: {
        query,
        cuisine,
        diet,
        intolerances: intolerance,
        number: limit || 10,
        apiKey: process.env.spoonacular_apiKey,
      },
    });

    const searchResults = searchRes.data.results;        // array of {id,title,image}

    const recipesWithDuration = await Promise.all(
    searchResults.map(r => getRecipeInformation(r.id, userId))
    );
    return recipesWithDuration;


  } catch (error) {
    console.error("Spoonacular API call failed:", error.message);
    throw error; // let Express error-handler catch it
  }
}

async function getRandomRecipesFromAPI(limit) {
  const response = await axios.get(`${api_domain}/random`, {
    params: {
      number: limit || 5,
      apiKey: process.env.spoonacular_apiKey,
    },
  });

  // Format result like other previews
  return response.data.recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    readyInMinutes: recipe.readyInMinutes,
    vegan: recipe.vegan,
    vegetarian: recipe.vegetarian,
    glutenFree: recipe.glutenFree,
  }));
}

exports.getRecipeDetails = getRecipeDetails;
exports.getRecipesPreview = getRecipesPreview;
exports.insertRecipe = insertRecipe;
exports.searchRecipesFromAPI = searchRecipesFromAPI;
exports.getRandomRecipesFromAPI = getRandomRecipesFromAPI;


