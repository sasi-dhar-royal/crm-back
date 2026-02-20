const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware.js');
const {
    createLead,
    getLeads,
    updateLead,
    uploadLeads,
    assignLead,
    deleteLead,
    getLeadById,
    syncFacebookLeads,
} = require('../controllers/leadController.js');

router.route('/sync-facebook').post(protect, admin, syncFacebookLeads);
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.route('/').post(protect, createLead).get(protect, getLeads);
router.route('/:id').put(protect, updateLead).delete(protect, admin, deleteLead).get(protect, getLeadById);
router.route('/:id/assign').put(protect, admin, assignLead);
router.route('/upload').post(protect, admin, upload.single('file'), uploadLeads);

module.exports = router;
