require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');
const User = require('./models/User'); // Add this line

async function analyzeTickets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartclass');

    const tickets = await Ticket.find({}, 'ticketId title department createdBy').populate('createdBy', 'name email department').limit(10);

    console.log('=== TICKET DEPARTMENT ANALYSIS ===');
    tickets.forEach((ticket, i) => {
      console.log(`\n${i+1}. ${ticket.ticketId}: ${ticket.title}`);
      console.log(`   Ticket Department: '${ticket.department || 'NOT SET'}'`);
      console.log(`   Creator: ${ticket.createdBy?.name} (${ticket.createdBy?.email})`);
      console.log(`   Creator Department: '${ticket.createdBy?.department || 'NOT SET'}'`);
      console.log(`   Match: ${ticket.department === ticket.createdBy?.department ? 'YES' : 'NO'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

analyzeTickets();