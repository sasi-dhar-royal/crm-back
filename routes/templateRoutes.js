const express = require('express');
const router = express.Router();
const {
    getTemplates,
    createTemplate,
    deleteTemplate,
} = require('../controllers/templateController.js');
const { protect, admin } = require('../middleware/authMiddleware.js');

router.route('/').get(protect, getTemplates).post(protect, createTemplate);
router.route('/:id').delete(protect, admin, deleteTemplate);

module.exports = router;
