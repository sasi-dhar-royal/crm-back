const Template = require('../models/Template.js');

// @desc    Get all templates
// @route   GET /api/templates
// @access  Private
const getTemplates = async (req, res) => {
    try {
        const templates = await Template.find({ isActive: true });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new template
// @route   POST /api/templates
// @access  Private
const createTemplate = async (req, res) => {
    const { title, content } = req.body;

    try {
        const template = await Template.create({
            title,
            content,
            createdBy: req.user._id,
        });
        res.json(template);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a template
// @route   DELETE /api/templates/:id
// @access  Private/Admin
const deleteTemplate = async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);

        if (template) {
            await Template.deleteOne({ _id: template._id });
            res.json({ message: 'Template removed' });
        } else {
            res.status(404).json({ message: 'Template not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getTemplates, createTemplate, deleteTemplate };
