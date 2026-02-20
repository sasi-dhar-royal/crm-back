const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const approveAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected!');

        const result = await User.updateMany(
            { role: 'admin' },
            { $set: { status: 'approved' } }
        );

        console.log(`✅ Approved ${result.modifiedCount} admin(s)!`);

        const admins = await User.find({ role: 'admin' });
        console.log('👑 Current Admins (Verified):', admins.map(u => ({ email: u.email, status: u.status })));

        process.exit();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

approveAdmin();
