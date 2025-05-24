const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";



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

exports.getRecipeDetails = getRecipeDetails;
exports.getRecipesPreview = getRecipesPreview;



