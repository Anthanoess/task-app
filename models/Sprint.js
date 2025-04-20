const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema({
  name: String,
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['Pending', 'Active', 'Completed'], default: 'Pending' },
});

module.exports = mongoose.model('Sprint', sprintSchema);