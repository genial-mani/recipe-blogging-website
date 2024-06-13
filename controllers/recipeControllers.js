const Recipe = require('../models/recipeModel');
const User = require('../models/userModel');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const HttpError = require('../models/errorModel');

const createRecipe = async (req, res, next) => {
    try {

        let { title, description, ingredients, instructions, isPureVeg } = req.body;

        if (!title || !description || !instructions || !ingredients || !req.files) {
            return next(new HttpError("Fill in all the fields and choose thumbnail.", 422));
        }

        if(description.length < 12){
            return next(new HttpError("Description is too short!"));
        }

        const { thumbnail } = req.files;

        if (thumbnail.size > 2000000) { 
            return next(new HttpError("Thumbnail too big. File should be less than 2Mb", 422));
        }

        let parsedIngredients;
        try {
            parsedIngredients = JSON.parse(ingredients);
        } catch (error) {
            return next(new HttpError("Invalid ingredients format. Should be a JSON array.", 422));
        }

        let fileName = thumbnail.name;
        let splittedFilename = fileName.split('.');
        let newFilename = `${splittedFilename[0]}-${uuid()}.${splittedFilename[splittedFilename.length - 1]}`;

        thumbnail.mv(path.join(__dirname, '..', 'uploads', newFilename), async (err) => {
            if (err) {
                console.log(err); 
                return next(new HttpError("File upload error", 500));
            } else {
                const newRecipe = await Recipe.create({ title, description, ingredients: parsedIngredients, instructions, isPureVeg, thumbnail: newFilename, createdBy: req.user.id });
                if (!newRecipe) {
                    return next(new HttpError("Recipe couldn't be created.", 422));
                }
                const currentUser = await User.findById(req.user.id);
                await User.findByIdAndUpdate(req.user.id, { recipes: currentUser.recipes + 1 });

                res.status(201).json(newRecipe);
            }
        });
    } catch (error) {
        console.log(error); 
        return next(new HttpError(error.message, 500));
    }
};

const getRecipes = async (req, res, next) => {
    try {
        const recipes = await Recipe.find().sort({ updatedAt: -1 });
        res.status(200).json(recipes);
    } catch (error) {
        return next(new HttpError(error));
    }
};

const getRecipe = async (req, res, next) => {
    try {
        const recipeId = req.params.id;
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return next(new HttpError("Recipe not found.", 404));
        }
        res.status(200).json(recipe);
    } catch (error) {
        return next(new HttpError(error));
    } 
};

const getUserRecipes = async (req,res,next) =>{
    try {
        const userId = req.params.id;
        const recipes = await Recipe.find({createdBy: userId}).sort({updatedAt: -1});
        if(!recipes){
            return next(new HttpError("No recipes found.",404));
        }
        res.status(200).json(recipes);
    } catch (error) {
        return next(new HttpError(error));
    }
}

const likeRecipe = async (req,res,next)=>{
    try {
        const userId = req.user.id;
        const recipeId = req.params.id;
        
        const recipe = await Recipe.findById(recipeId);
        if(!recipe){
            return next(new HttpError("Unable to perform action please refresh the page.",404));
        }

        if(recipe?.likes.includes(userId)){
            return next(new HttpError("You have already liked this recipe.",400));
        }

        await Recipe.findByIdAndUpdate(
            recipeId, 
            { $push: {likes: userId}},
            {new: true}
        )

        res.status(200).json({message: "Added to favourites."});

    } catch (error) {
        return next(new HttpError(error))
    }
}
const unLikeRecipe = async (req,res,next)=>{
    try {
        const userId = req.user.id;
        const recipeId = req.params.id;
        const recipe = await Recipe.findById(recipeId);
        if(!recipe){
            return next(new HttpError("Unable to perform action please refresh the page.",404));
        }

        if(!recipe?.likes.includes(userId)){
            return next(new HttpError("Unable to perform action please refresh the page.",400));
        }

        await Recipe.findByIdAndUpdate(
            recipeId,
            { $pull: {likes: userId}},
            {new: true}
        )

        res.status(200).json({message: "Removed from favourites."});

    } catch (error) {
        return next(new HttpError(error))
    }
}


const updateRecipe = async (req, res, next) => {
    try {
        const recipeId = req.params.id;
        let fileName;
        let newFilename;
        let updatedRecipe;
        let { title, description, instructions,ingredients, isPureVeg } = req.body;

        if(!isPureVeg){
            isPureVeg = false;
        }

        if (!title || !instructions) {
            return next(new HttpError("Fill in all the fields.", 422));
        }

        if(description.length < 12){
            return next(new HttpError("Description is too short !"));
        }
 
        let parsedIngredients;
        try {
            parsedIngredients = JSON.parse(ingredients);
        } catch (error) { 
            return next(new HttpError("Invalid ingredients format. Should be a JSON array.", 422));
        }

        const oldRecipe = await Recipe.findById(recipeId);
        if (req.user.id == oldRecipe.createdBy) {
            if (!req.files) {
                updatedRecipe = await Recipe.findByIdAndUpdate(recipeId, { title, description, instructions, ingredients: parsedIngredients, isPureVeg }, { new: true });
            } else {
                const oldRecipe = await Recipe.findById(recipeId);
                fs.unlink(path.join(__dirname, '..', 'uploads', oldRecipe.thumbnail), async (err) => {
                    if (err) {
                        return next(new HttpError(err));
                    }

                });
                const { thumbnail } = req.files;
                if (thumbnail.size > 2000000) {
                    return next(new HttpError("Thumbnail too big. Should be less than 2mb"));
                }
                fileName = thumbnail.name;
                let splittedFilename = fileName.split('.');
                newFilename = splittedFilename[0] + uuid() + '.' + splittedFilename[splittedFilename.length - 1];
                thumbnail.mv(path.join(__dirname, '..', '/uploads', newFilename), async (err) => {
                    if (err) { 
                        return next(new HttpError(err));
                    }
                });

                updatedRecipe = await Recipe.findByIdAndUpdate(recipeId, { title, description,instructions, ingredients, isPureVeg, thumbnail: newFilename }, { new: true });
            }
        }
        if (!updatedRecipe) {
            return next(new HttpError("Couldn't update recipe.", 400));
        }
        res.status(200).json(updatedRecipe);
    } catch (error) {
        return next(new HttpError(error));
    }
};

const deleteRecipe = async (req, res, next) => {
    try {
        const recipeId = req.params.id;
        if (!recipeId) {
            return next(new HttpError("Recipe unavailable.", 400));
        }
        const recipe = await Recipe.findById(recipeId);
        const fileName = recipe?.thumbnail;
        if (req.user.id == recipe.createdBy) {
            fs.unlink(path.join(__dirname, '..', '/uploads', fileName), async (err) => {
                if (err) {
                    return next(new HttpError(err));
                } else {
                    await Recipe.findByIdAndDelete(recipeId);
                    const currentUser = await User.findById(req.user.id);
                    const userRecipeCount = currentUser?.recipes - 1;
                    await User.findByIdAndUpdate(req.user.id, { recipes: userRecipeCount });
                    res.json(`Recipe ${recipeId} deleted successfully.`);
                }
            });
        } else {
            return next(new HttpError("Recipe couldn't be deleted.", 403));
        }
    } catch (error) {
        return next(new HttpError(error));
    }
};

module.exports = {
    createRecipe,
    getRecipes,
    getRecipe,
    likeRecipe,
    unLikeRecipe,
    updateRecipe,
    deleteRecipe,
    getUserRecipes, 
};
