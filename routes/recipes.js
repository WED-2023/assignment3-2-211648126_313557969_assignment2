var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");
const DButils = require("./utils/DButils");

router.get("/", (req, res) => res.send("im here"));


/**
 * This path returns a full details of a recipe by its id
 */
router.get("/:recipeId", async (req, res, next) => {
  try {
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId);
    res.send(recipe);
  } catch (error) {
    next(error);
  }
});

/**
 * This path allows an authenticated user to create a new recipe.
 */
router.post("/", async (req, res, next) => {
  try {
    // Ensure the user is authenticated via session
    if (!req.session || !req.session.user_id) {
      return res.status(401).send({ message: "Unauthorized: Please log in first" });
    }
    const user_id = req.session.user_id;

    // Extract recipe fields from request body
    const { id, title, image, duration, likes, vegan, vegetarian, glutenFree, viewed, ingredients, steps, servings } = req.body;
    // (Optionally, validate that none of these fields are undefined/null here)

    // Use the recipes_utils helper to insert the new recipe into the DB
    await recipes_utils.insertRecipe(user_id, {
      id, title, image, duration, likes, vegan, vegetarian, glutenFree, viewed, ingredients, steps, servings
    });

    // If successful, return a 201 response with a success message
    res.status(201).send({ message: "Recipe created successfully", success: true });
  } catch (error) {
    // In case of any error, forward it to the error handler middleware
    next(error);
  }
});

module.exports = router;
