const cron = require('node-cron');
const Lead = require('../models/Lead');
// In a real scenario, you might import a notification service here
// const { sendNotification } = require('./notificationService');

const initCronJobs = () => {
    console.log('Initializing Cron Jobs...');

    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('Running Follow-up Reminder Job...');
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Find leads with follow-up date today
            const leads = await Lead.find({
                followUpDate: {
                    $gte: today,
                    $lt: tomorrow
                },
                status: { $ne: 'closed' } // Don't remind for closed leads
            }).populate('assignedTo');

            console.log(`Found ${leads.length} follow-ups for today.`);

            if (leads.length > 0) {
                // Group by employee to send aggregated reminders
                const reminders = {};

                leads.forEach(lead => {
                    if (lead.assignedTo) {
                        if (!reminders[lead.assignedTo._id]) {
                            reminders[lead.assignedTo._id] = {
                                employee: lead.assignedTo,
                                leads: []
                            };
                        }
                        reminders[lead.assignedTo._id].leads.push(lead);
                    }
                });

                // Here you would trigger notifications (Email, Push, or WhatsApp)
                // For now, we just log the reminders
                Object.values(reminders).forEach(item => {
                    console.log(`[REMINDER] Employee ${item.employee.name} has ${item.leads.length} follow-ups today.`);
                    // sendNotification(item.employee, item.leads);
                });
            }

        } catch (error) {
            console.error('Error in Follow-up Cron Job:', error);
        }
    });
};

module.exports = initCronJobs;
