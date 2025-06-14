const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const DButils = require("./DButils");

// ────────────────────────────────────────────────────────────
// In-memory cache  (key = recipe_id, value = recipe object)
// You can replace this Map with node-cache, lru-cache or Redis.
// ────────────────────────────────────────────────────────────
const recipeCache = new Map();

/**
 * Get recipes list from spooncular response and extract the relevant recipe data for preview
 * @param {*} recipes_info 
 */
async function getRecipeInformation(recipe_id) {
    return await axios.get(`${api_domain}/${recipe_id}/information`, {
        params: {
            includeNutrition: false,
            apiKey: process.env.spooncular_apiKey
        }
    });
}

async function getRecipeDetails(recipe_id) {
    // let recipe_info = await getRecipeInformation(recipe_id);
    // let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree } = recipe_info.data;

    // return {
    //     id: id,
    //     title: title,
    //     readyInMinutes: readyInMinutes,
    //     image: image,
    //     popularity: aggregateLikes,
    //     vegan: vegan,
    //     vegetarian: vegetarian,
    //     glutenFree: glutenFree,
        
    // }

    // 1) return from cache if present
    if (recipeCache.has(recipe_id)) {
      return recipeCache.get(recipe_id);
    }

    // 2) fetch from Spoonacular
    const recipe_info = await getRecipeInformation(recipe_id);
    const { id, title, readyInMinutes, image, aggregateLikes,
            vegan, vegetarian, glutenFree } = recipe_info.data;

    // 3) build the object we return everywhere
    const recipe = {
      id,
      title,
      readyInMinutes,
      image,
      popularity: aggregateLikes,
      vegan,
      vegetarian,
      glutenFree,
    };

    // 4) store in cache for future requests
    recipeCache.set(recipe_id, recipe);
    return recipe;
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
    id, //not in use
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
async function searchRecipesFromAPI({ query, cuisine, diet, intolerance, limit }) {
  try {
    console.log("Calling Spoonacular with:", { query, cuisine, diet, intolerance, limit });

    // 1) Initial search (IDs + basic fields)
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

    // 2) For each ID, fetch full info to get readyInMinutes
    const infoPromises = searchResults.map(r =>
      getRecipeInformation(r.id).then(info => ({
        id:             r.id,
        title:          r.title,
        image:          r.image,
        duration:       info.data.readyInMinutes,   // <-- add duration
      }))
    );

    // 3) Wait for all info requests
    const recipesWithDuration = await Promise.all(infoPromises);
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
      apiKey: process.env.spooncular_apiKey,
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


