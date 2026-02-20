const express = require('express');
const router = express.Router();
const {
    authUser,
    registerUser,
    getUsers,
    approveUser,
    getEmployees,
    getUserProfile,
} = require('../controllers/authController.js');
const { protect, admin } = require('../middleware/authMiddleware.js');

router.post('/signup', registerUser);
router.post('/login', authUser);
router.get('/profile', protect, getUserProfile);
router.get('/users', protect, admin, getUsers);
router.get('/employees', protect, admin, getEmployees);
router.put('/approve/:id', protect, admin, approveUser);

module.exports = router;
