const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Recipe = require('../models/recipeModel');
const Subscriber = require('../models/subsModel');
const fs = require('fs')
const path = require('path')
const {v4: uuid} = require('uuid')

const HttpError = require('../models/errorModel');

// Register a new user
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, password2 } = req.body;
        if (!name || !email || !password) {
            return next(new HttpError("Fill in all the fields", 422));
        }

        const newEmail = email.toLowerCase();

        const emailExists = await User.findOne({ email: newEmail });
        if (emailExists) {
            return next(new HttpError("Email already exists.", 422)); 
        }
        if ((password.trim()).length < 6) {
            return next(new HttpError("Password should be at least 6 characters.", 422));
        }

        if (password != password2) {
            return next(new HttpError("Passwords do not match", 422));
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        const newUser = await User.create({ name, email: newEmail, password: hashedPass });
        res.status(201).json(`Successfully registered`);

    } catch (error) {
        return next(new HttpError("User registration failed", 422));
    }
};

// Login user 
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new HttpError("Fill in all the fields.", 422));
        }
        const newEmail = email.toLowerCase();
        const user = await User.findOne({ email: newEmail });
        if (!user) {
            return next(new HttpError("Invalid credentials", 422));
        }
        const comparePass = await bcrypt.compare(password, user.password);
        if (!comparePass) {
            return next(new HttpError("Invalid credentials", 422));
        }

        const { _id: id, name } = user;
        const token = jwt.sign({ id, name }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({ token, id, name });

    } catch (error) {
        return next(new HttpError("Login failed. Please check your credentials", 422));
    }

};

// Get user profile
const getUserProfile = async (req, res, next) => {
    try{
        const {id} = req.params;
        const user = await User.findById(id).select('-password');
        if(!user){
            return next(new HttpError("User not found.",404))
        }
        res.status(200).json(user);
    } catch(error){
        return next(new HttpError(error))
    }

};

// Get all users
const getUsers = async (req, res, next) => {
    try {
        const users = await User.find({}).select('-password');
        res.status(200).json(users);
    } catch (error) {
        return next(new HttpError(error))   
    }

};

// Update user profile
const changeAvatar = async (req, res, next) => {

    try{

        if(!req.files?.avatar){
            return next(new HttpError("Please choose an image.",422))
        }
        
        // find user from database
        const user =  await User.findById(req.user.id)
        // delete old avatar if  exists
        if(user.avatar){
            fs.unlink(path.join(__dirname,'..','uploads',user.avatar), (err) =>{
               if(err){
                return next(new HttpError(err)) 
               }
            })
        }
        const {avatar} = req.files;
        if(avatar.size > 500000){
            return next(new HttpError("Profile picture is too big. Should be less than 500kb.",422))
        }
    
        let fileName;
        fileName = avatar.name;
        let splittedFilename = fileName.split('.');
        let newFilename = splittedFilename[0] + uuid() +'.'+splittedFilename[splittedFilename.length - 1];
        avatar.mv(path.join(__dirname,'..','uploads',newFilename),async (err)=>{
            if(err){
                return next(new HttpError(err))
            }
    
            const updatedAvatar = await User.findByIdAndUpdate(req.user.id,{avatar: newFilename},{new: true}).select('-password')
            if(!updatedAvatar)
            {
                return next(new HttpError("Avatar couldn't be changed.",422))
            }
            res.status(200).json('Avatar updated successfully.')
        })
    
    
       }catch(error){
        return next(new HttpError(error)) 
       }
};

// edit profile details
const editProfile = async (req, res, next) => {
    try{
        const {name, email,ispureveg, currentPassword, newPassword, confirmNewPassword} = req.body;
        if(!name || !email || !currentPassword || !newPassword) {
            return next(new HttpError("Fill in all fields.",422))
        } 

        const user = await User.findById(req.user.id);
        if(!user){
            return next(new  HttpError("User not found.",403))
        }

        const emailExists = await User.findOne({email});

        if(emailExists && (emailExists._id != req.user.id)) {
            return next(new HttpError("Email already exists.",422))
        }

        const validateUserPassword = await bcrypt.compare(currentPassword,user.password);
        if(!validateUserPassword){
            return next(new HttpError("Invalid current password", 422))
        }

        if(newPassword !== confirmNewPassword) {
            return next(new HttpError("New passwords do not match.",422))
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword,salt);

        const newInfo = await User.findByIdAndUpdate(req.user.id, {name,email,password: hash,ispureveg},{new: true}).select('-password')
        // res.status(200).json(newInfo)
        res.status(200).json('Updated successfully.')

    } catch(error){
        return next(new HttpError(error))
    } 
};

// Delete user account
const deleteUser = async (req, res, next) => {
    try {
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        
        const recipes = await Recipe.find({ creator: req.params.id });

       
        recipes.forEach(async (recipe) => {
            if (recipe.thumbnail) {
                fs.unlink(path.join(__dirname, '..', 'uploads', recipe.thumbnail), (err) => {
                    if (err) {
                        console.error("Error deleting recipe thumbnail:", err);
                    }
                });
            }
        });

        
        await Recipe.deleteMany({ creator: req.params.id });

        if (user.avatar) {
            fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
                if (err) {
                    console.error("Error deleting user photo:", err);
                }
            });
        }

        await User.findByIdAndDelete(req.params.id);
 
        res.status(200).json({ message: "User deleted successfully." });  
    } catch (error) {
        next(error);
    }
};

const subscribe = async(req,res,next)=>{
    const {email} = req.body;
    try {
        if (!email) {
            return next(new HttpError("Provide email...", 422));
        }
        const newEmail = email.trim().toLowerCase();

        const emailRegex = /.+\@.+\..+/;

  if (!emailRegex.test(newEmail)) {
    return next(new HttpError("Enter valid email address."));
  }

        const emailExists = await Subscriber.findOne({ email: newEmail });
        if (emailExists) {
            return next(new HttpError("Already Subscribed.", 422)); 
        }
        const newUser = await Subscriber.create({ email: newEmail});
        res.status(201).json(`User with email ${newUser.email} has been subscribed.`);
    } catch (error) {
        return next(new HttpError(error))
    }
}

const unSubscribe = async(req,res,next)=>{
    const {email} = req.body;
    try {
        console.log(email)
        if (!email) {
            return next(new HttpError("Provide email...", 422));
        }
        const newEmail = email.trim().toLowerCase();

        const emailRegex = /.+\@.+\..+/;

    if (!emailRegex.test(newEmail)) {
        return next(new HttpError("Enter valid email address."));
    }

        const emailExists = await Subscriber.findOne({ email: newEmail });
        if (!emailExists) {
            return next(new HttpError("This email is not registered yet.", 422));
        }
        await Subscriber.findOneAndDelete({email: newEmail});
        res.status(201).json(`Unsubscribed successfully.`);
    } catch (error) {
        return next(new HttpError(error))
    }
}


module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  getUsers,
  changeAvatar,
  editProfile,
  deleteUser,
  subscribe,
  unSubscribe,
};
