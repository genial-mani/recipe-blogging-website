const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createRecipe,
  getRecipes,
  getRecipe,
  likeRecipe,
  unLikeRecipe,
  updateRecipe,
  deleteRecipe,
  getUserRecipes
} = require('../controllers/recipeControllers');

router.post('/', authMiddleware, createRecipe);
router.get('/', getRecipes); 
router.get('/:id', getRecipe);
router.get('/:id/dashboard',authMiddleware,getUserRecipes);
router.patch('/:id', authMiddleware, updateRecipe);
router.delete('/:id', authMiddleware, deleteRecipe);
router.patch('/:id/like',authMiddleware,likeRecipe);
router.patch('/:id/unlike',authMiddleware,unLikeRecipe);

module.exports = router; 
 