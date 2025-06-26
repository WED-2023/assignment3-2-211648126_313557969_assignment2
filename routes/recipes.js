var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");
const DButils = require("./utils/DButils");


//router.get("/", (req, res) => res.send("im here"));

/**
 * This path returns a list of random recipes from Spoonacular
 */
router.get("/", async (req, res, next) => {
  try {
    const limit = req.query.limit || 5;
    const results = await recipes_utils.getRandomRecipesFromAPI(limit);
    res.status(200).send(results);
  } catch (error) {
    next(error);
  }
});



/**
 * This path allows an authenticated user to create a new recipe.
 */
router.post("/", async (req, res, next) => {
  // try {
  //   // Ensure the user is authenticated via session
  //   // if (!req.session || !req.session.user_id) {
  //   //   return res.status(401).send({ message: "Unauthorized: Please log in first" });
  //   // }
  //   const user_id = req.session.user_id;

  //   // Extract recipe fields from request body
  //   const { id, title, image, duration, vegan, vegetarian, glutenFree, viewed, ingredients, steps, servings } = req.body;
  //   // (Optionally, validate that none of these fields are undefined/null here)

  //   // Use the recipes_utils helper to insert the new recipe into the DB
  //   await recipes_utils.insertRecipe(user_id, {
  //     id, title, image, duration, vegan, vegetarian, glutenFree, ingredients, steps, servings
  //   });

  //   // If successful, return a 201 response with a success message
  //   res.status(201).send({ message: "Recipe created successfully", success: true });
  // } catch (error) {
  //   // In case of any error, forward it to the error handler middleware
  //   next(error);
  // }

  try {
    const user_id = req.session.user_id;

    const {
      title,
      image, // base64 string or null
      duration,
      vegan,
      vegetarian,
      glutenFree,
      ingredients,
      steps,
      servings
    } = req.body;

    // Optional: validate types if needed

    await recipes_utils.insertRecipe(user_id, {
      title,
      image, // store as base64 or convert to file before saving
      duration,
      vegan,
      vegetarian,
      glutenFree,
      ingredients,
      steps,
      servings
    });

    res.status(201).send({ message: "Recipe created successfully", success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * This path searches recipes from the external Spoonacular API based on query parameters
 */
router.get("/search", async (req, res, next) => {
  try {
    console.log("ROUTER SEARCH RECIPES FROM API")
    const { query, cuisine, diet, intolerance, limit } = req.query;
    const userId  = req.session?.user_id || null;
    const results = await recipes_utils.searchRecipesFromAPI({
      query, cuisine, diet, intolerance, limit, userId
    });
    res.status(200).send(results);
  } catch (error) {
    next(error);
  }
});


/**
 * This path returns a full details of a recipe by its id (from outer API)
 */
router.get("/:recipeId", async (req, res, next) => {
  try {
    const userId  = req.session?.user_id || null;
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId,  userId);
    res.send(recipe);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
