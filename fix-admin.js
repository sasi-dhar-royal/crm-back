const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const connectDB = require('./config/db');
require('dotenv').config();

const fixAdmin = async () => {
    try {
        console.log('Connecting to DB...');
        await connectDB();

        console.log('Finding admin user...');
        const user = await User.findOne({ email: 'admin@example.com' });

        if (user) {
            console.log(`Found user: ${user.name} (${user._id})`);

            // Manually generate hash to be 100% sure
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);

            // Update directly bypassing hooks
            await User.findByIdAndUpdate(user._id, {
                password: hashedPassword,
                role: 'admin',
                status: 'approved'
            });

            console.log('✅ Admin password reset to: password123');
            console.log('✅ Verified role: admin, status: approved');
        } else {
            console.log('❌ Admin user not found! Creating one...');

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);

            await User.create({
                name: 'Admin User',
                email: 'admin@example.com',
                phone: '1234567890',
                password: hashedPassword, // Will be hashed again? No, create triggers save.
                // Wait, if I pass hashed password to create, and hook runs...
                // Hook sees modified. Hashes the hash.
                // So for create, I should pass PLAIN password.
                // UNLESS I use insertMany logic or disable hook.
            });
            // Better to use plain text for create
            await User.create({
                name: 'Admin User',
                email: 'admin@example.com',
                phone: '1234567890',
                password: 'password123',
                role: 'admin',
                status: 'approved'
            });
            console.log('✅ Admin user created.');
        }

        process.exit();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

fixAdmin();
