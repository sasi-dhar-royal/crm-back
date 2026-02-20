const User = require('../models/User.js');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const bcrypt = require('bcryptjs'); // Ensure bcrypt is imported

const authUser = async (req, res) => {
    console.log('--- MANUAL AUTH START ---');
    try {
        const { email, password } = req.body;
        console.log(`[AUTH] Attempting login for: ${email}`);

        // 1. Check Input
        if (!email || !password) {
            console.log('[AUTH] Missing email/password');
            return res.status(400).json({ message: 'Missing credentials' });
        }

        // 2. Find User
        console.log('[AUTH] Querying database...');
        const user = await User.findOne({ email });

        if (!user) {
            console.log('[AUTH] User not found');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log(`[AUTH] User found: ${user._id}`);
        console.log(`[AUTH] Stored Hash (param): ${user.password ? user.password.substring(0, 10) + '...' : 'UNDEFINED'}`);

        // 3. Manual Password Check
        console.log('[AUTH] Comparing passwords manually...');
        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`[AUTH] Password match result: ${isMatch}`);

        if (!isMatch) {
            console.log('[AUTH] Password mismatch');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 4. Check Status
        if (user.status !== 'approved' && user.role !== 'admin') {
            console.log('[AUTH] User not approved');
            return res.status(401).json({ message: 'Account not approved yet' });
        }

        // 5. Generate Token
        console.log('[AUTH] Generating token...');
        const token = generateToken(user._id);

        console.log('[AUTH] Login SUCCESS');
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            token: token,
        });

    } catch (error) {
        console.error('--- AUTH FATAL ERROR ---');
        console.error(error);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

const registerUser = async (req, res) => {
    const { name, email, phone, password, role } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
        name,
        email,
        phone,
        password,
        role: role || 'employee',
        status: role === 'admin' ? 'approved' : 'pending',
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const approveUser = async (req, res) => {
    try {
        console.log(`[APPROVE] ID: ${req.params.id}, Status: ${req.body.status}`);

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status || 'approved' },
            { new: true, runValidators: true }
        );

        if (user) {
            console.log(`[APPROVE] Success: ${user.email} -> ${user.status}`);
            res.json(user);
        } else {
            console.log('[APPROVE] User not found');
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('[APPROVE] Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get approved employees
// @route   GET /api/auth/employees
// @access  Private/Admin
const getEmployees = async (req, res) => {
    try {
        const employees = await User.find({
            role: 'employee',
            status: 'approved'
        }).select('_id name email phone role status');

        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { authUser, registerUser, getUsers, approveUser, getEmployees, getUserProfile };
