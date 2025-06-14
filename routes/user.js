var express = require("express");
var router = express.Router();
const DButils = require("./utils/DButils");
const user_utils = require("./utils/user_utils");
const recipe_utils = require("./utils/recipes_utils");


/**
 * Authenticate all incoming requests by middleware
 */
router.use(async function (req, res, next) {
  if (req.session && req.session.user_id) {
    DButils.execQuery("SELECT user_id FROM users").then((users) => {
      if (users.find((x) => x.user_id === req.session.user_id)) {
        req.user_id = req.session.user_id;
        next();
      }
    }).catch(err => next(err));
  } else {
    res.sendStatus(401);
  }
});


/**
 * This path gets body with recipeId and save this recipe in the favorites list of the logged-in user
 */
router.post('/favorites', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;
    await user_utils.markAsFavorite(user_id,recipe_id);
    res.status(200).send("The Recipe successfully saved as favorite");
    } catch(error){
    next(error);
  }
})

/**
 * This path returns the favorites recipes that were saved by the logged-in user
 */
router.get('/favorites', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    let favorite_recipes = {};
    const recipes_id = await user_utils.getFavoriteRecipes(user_id);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.API_recipe_id)); //extracting the recipe ids into array
    const results = await recipe_utils.getRecipesPreview(recipes_id_array);
    res.status(200).send(results);
  } catch(error){
    next(error); 
  }
});

/**
 * This path returns the personal recipes created by the logged-in user
 */
router.get('/recipes', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const personalRecipes = await user_utils.getUserRecipes(user_id);
    res.status(200).json(personalRecipes);
  } catch (error) {
    next(error);
  }
});

/**
 * This path returns the family recipes added by the logged-in user
 */
router.get('/family', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const familyRecipes = await user_utils.getUserFamilyRecipes(user_id);
    res.status(200).json(familyRecipes);
  } catch (error) {
    next(error);
  }
});

/**
 * This path adds a new family recipe for the logged-in user
 */
router.post('/family', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const {
      title,
      image,
      occasion,
      originator_name,
      instructions,
      ingredients
    } = req.body;

    if (!title || !image || !occasion || !originator_name || !instructions || !ingredients) {
      return res.status(400).send("Missing required fields");
    }

    await user_utils.addFamilyRecipe(
      user_id,
      title,
      image,
      occasion,
      originator_name,
      instructions,
      ingredients
    );

    res.status(201).send("Family recipe successfully created");
  } catch (error) {
    next(error);
  }
});


module.exports = router;
