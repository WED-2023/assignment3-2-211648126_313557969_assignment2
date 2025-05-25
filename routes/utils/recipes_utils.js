const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const DButils = require("./DButils");


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
    let recipe_info = await getRecipeInformation(recipe_id);
    let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree } = recipe_info.data;

    return {
        id: id,
        title: title,
        readyInMinutes: readyInMinutes,
        image: image,
        popularity: aggregateLikes,
        vegan: vegan,
        vegetarian: vegetarian,
        glutenFree: glutenFree,
        
    }
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

exports.getRecipeDetails = getRecipeDetails;
exports.getRecipesPreview = getRecipesPreview;
exports.insertRecipe = insertRecipe;



