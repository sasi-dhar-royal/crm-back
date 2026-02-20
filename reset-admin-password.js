const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');

        const hashedPassword = await bcrypt.hash('admin123', 10);

        // 1. Try to find admin@crm.com and update it
        let admin = await User.findOne({ email: 'admin@crm.com' });

        if (admin) {
            console.log('🔄 Found admin@crm.com. Updating password...');
            admin.password = hashedPassword;
            admin.role = 'admin';
            admin.phone = '9999999999';
            admin.status = 'approved';
            await admin.save();
            console.log('✅ Updated admin@crm.com password to: admin123');
        } else {
            console.log('➕ Creating new admin@crm.com...');
            admin = await User.create({
                name: 'Super Admin',
                email: 'admin@crm.com',
                password: hashedPassword,
                role: 'admin',
                phone: '9999999999',
                status: 'approved'
            });
            console.log('✅ Created admin@crm.com with password: admin123');
        }

        // 2. Check for other admins just in case
        const allAdmins = await User.find({ role: 'admin' });
        console.log('📋 Current Admins in DB:', allAdmins.map(u => u.email));

        console.log('\n🚀 LOGIN WITH:');
        console.log('Email: admin@crm.com');
        console.log('Password: admin123');

        process.exit();
    } catch (error) {
        console.error('❌ Error resetting admin:', error);
        process.exit(1);
    }
};

resetAdmin();
