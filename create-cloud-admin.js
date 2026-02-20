const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB Atlas');

        const existingAdmin = await User.findOne({ email: 'admin@crm.com' });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit();
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = new User({
            name: 'Super Admin',
            email: 'admin@crm.com',
            password: hashedPassword,
            role: 'admin',
            phone: '9999999999'
        });

        await admin.save();
        console.log('✅ Admin user created successfully');
        console.log('Email: admin@crm.com');
        console.log('Password: admin123');
        process.exit();
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
