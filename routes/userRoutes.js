const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { registerUser, loginUser, getUserProfile, changeAvatar, getUsers,editProfile,deleteUser,subscribe, unSubscribe} = require('../controllers/userControllers');

router.post('/register', registerUser);
router.post('/subscribe', subscribe);
router.delete('/unsubscribe',unSubscribe);
router.post('/login', loginUser);
router.get('/:id', getUserProfile);
router.get('/', getUsers);
router.post('/change-avatar',authMiddleware, changeAvatar);
router.patch('/edit-user',authMiddleware, editProfile);
router.delete('/:id',authMiddleware,deleteUser)

module.exports = router;
      