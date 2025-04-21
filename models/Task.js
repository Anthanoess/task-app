const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: { type: String, enum: ['Planning', 'Execution', 'Review'], default: 'Planning' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'low' },
});

module.exports = mongoose.model('Task', taskSchema);