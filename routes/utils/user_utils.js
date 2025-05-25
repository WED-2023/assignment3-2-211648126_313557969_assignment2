const DButils = require("./DButils");

async function markAsFavorite(user_id, recipe_id){
    await DButils.execQuery(`insert into favorite_recipes values ('${user_id}',${recipe_id})`);
}

async function getFavoriteRecipes(user_id){
    const recipes_id = await DButils.execQuery(`select API_recipe_id from favorite_recipes where user_id='${user_id}'`);
    return recipes_id;
}

async function getUserRecipes(user_id) {
    const recipes = await DButils.execQuery(`
        SELECT * FROM user_recipes WHERE user_id='${user_id}'
    `);
    return recipes;
}

async function getUserFamilyRecipes(user_id) {
  const recipes = await DButils.execQuery(`
    SELECT recipe_id AS id, title, image, occasion, originator_name, instructions, ingredients
    FROM family_recipes
    WHERE user_id = '${user_id}'
  `);
  return recipes;
}

exports.markAsFavorite = markAsFavorite;
exports.getFavoriteRecipes = getFavoriteRecipes;
exports.getUserRecipes = getUserRecipes;
exports.getUserFamilyRecipes = getUserFamilyRecipes;
