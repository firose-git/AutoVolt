require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');
const User = require('./models/User');

async function fixTicketDepartments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartclass');

    // Find all tickets and populate creator info
    const tickets = await Ticket.find({})
      .populate('createdBy', 'name email department')
      .sort({ createdAt: -1 });

    console.log(`Found ${tickets.length} tickets to check`);

    let updatedCount = 0;

    for (const ticket of tickets) {
      const creator = ticket.createdBy;
      if (creator && creator.department && ticket.department !== creator.department) {
        console.log(`Updating ticket ${ticket.ticketId}:`);
        console.log(`  Current department: '${ticket.department}'`);
        console.log(`  Creator department: '${creator.department}'`);
        console.log(`  Creator: ${creator.name} (${creator.email})`);

        // Update the ticket department
        await Ticket.findByIdAndUpdate(ticket._id, {
          department: creator.department
        });

        updatedCount++;
        console.log(`  ✅ Updated\n`);
      }
    }

    console.log(`\nSummary: Updated ${updatedCount} tickets with correct department information`);

    // Show final department distribution
    const departmentStats = await Ticket.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\nFinal department distribution:');
    departmentStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} tickets`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixTicketDepartments();