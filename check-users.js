const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const checkUsers = async () => {
    try {
        console.log('🔌 Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected!');

        const count = await User.countDocuments();
        console.log(`📊 Total Users: ${count}`);

        const admins = await User.find({ role: 'admin' });
        console.log('👑 Admins:', JSON.stringify(admins, null, 2));

        const allUsers = await User.find({});
        console.log('👥 All Users:', allUsers.map(u => ({ email: u.email, role: u.role, status: u.status })));

        process.exit();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkUsers();
