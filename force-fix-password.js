const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs'); // Using same library as authController
const dotenv = require('dotenv');

dotenv.config();

const fixPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected!');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        console.log('generated hash:', hashedPassword);

        const result = await User.updateOne(
            { email: 'admin@crm.com' },
            { $set: { password: hashedPassword, role: 'admin', status: 'approved' } }
        );

        console.log(`✅ Updated: ${result.modifiedCount}`);

        // VERIFY IMMEDIATELY
        const user = await User.findOne({ email: 'admin@crm.com' });
        const isMatch = await bcrypt.compare('admin123', user.password);
        console.log(`🔍 Immediate Verification Match: ${isMatch}`);

        process.exit();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

fixPassword();
