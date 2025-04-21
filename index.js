require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const cors = require('cors');
const User = require('./models/User');
const Task = require('./models/Task');
const Sprint = require('./models/Sprint');

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL,
}));

// MongoDB Atlas Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email Functions
const sendAssignmentEmail = async (userEmail, taskTitle) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'New Task Assigned',
    text: `You have been assigned a new task: ${taskTitle}.`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log('Assignment email sent to:', userEmail);
  } catch (err) {
    console.error('Error sending assignment email:', err);
  }
};

const sendCompletionEmail = async (userEmail, taskTitle) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'Task Completed',
    text: `The task "${taskTitle}" has been completed.`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log('Completion email sent to:', userEmail);
  } catch (err) {
    console.error('Error sending completion email:', err);
  }
};

// Middleware to verify JWT and extract user role
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).send('Access denied: No token provided');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).send('Invalid token');
  }
};

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, role: user.role });
  } else {
    res.status(401).send('Invalid credentials');
  }
});

// Get Users Route
app.get('/users', verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error fetching users');
  }
});

// Task Routes
app.get('/tasks', verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find().populate('assignedTo').populate('sprint');
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).send('Error fetching tasks');
  }
});

app.post('/tasks', verifyToken, async (req, res) => {
  const { sprint: sprintId } = req.body;
  if (!sprintId) {
    return res.status(400).send('Sprint ID is required');
  }
  const sprint = await Sprint.findById(sprintId);
  if (!sprint) {
    return res.status(404).send('Sprint not found');
  }
  const currentDate = new Date();
  if (new Date(sprint.endDate) < currentDate) {
    if (sprint.status !== 'Completed') {
      sprint.status = 'Completed';
      await sprint.save();
    }
    return res.status(400).send('Cannot add tasks to a sprint past its end date');
  }
  try {
    const task = new Task(req.body);
    await task.save();
    if (task.assignedTo) {
      const user = await User.findById(task.assignedTo);
      if (user) {
        await sendAssignmentEmail(user.email, task.title);
      }
    }
    res.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).send('Error creating task');
  }
});

app.put('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('assignedTo');
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).send('Error updating task');
  }
});

app.delete('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).send('Task not found');
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).send('Error deleting task');
  }
});

// Sprint Routes
app.post('/sprints', verifyToken, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).send('Only managers can create sprints');
  }
  try {
    const sprint = new Sprint(req.body);
    const sprintCount = await Sprint.countDocuments();
    if (sprintCount === 0) {
      sprint.status = 'Active';
    }
    await sprint.save();
    res.json(sprint);
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).send('Error creating sprint');
  }
});

app.get('/sprints', verifyToken, async (req, res) => {
  try {
    const sprints = await Sprint.find();
    const currentDate = new Date();
    for (const sprint of sprints) {
      if (new Date(sprint.endDate) < currentDate && sprint.status !== 'Completed') {
        sprint.status = 'Completed';
        await sprint.save();
      }
    }
    res.json(sprints);
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).send('Error fetching sprints');
  }
});

app.put('/sprints/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).send('Only managers can update sprints');
  }
  try {
    const sprint = await Sprint.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sprint) {
      return res.status(404).send('Sprint not found');
    }
    res.json(sprint);
  } catch (error) {
    console.error('Error updating sprint:', error);
    res.status(500).send('Error updating sprint');
  }
});

// Batch Update Tasks Route
app.post('/tasks/batch-update', verifyToken, async (req, res) => {
  const { taskIds, newStatus } = req.body;
  if (!taskIds || !Array.isArray(taskIds) || !newStatus) {
    return res.status(400).send('Invalid request: taskIds and newStatus are required');
  }
  try {
    await Task.updateMany({ _id: { $in: taskIds } }, { status: newStatus });
    const updatedTasks = await Task.find({ _id: { $in: taskIds } }).populate('assignedTo');
    if (newStatus === 'Review') {
      for (const task of updatedTasks) {
        if (task.assignedTo) {
          await sendCompletionEmail(task.assignedTo.email, task.title);
        }
      }
    }
    const allTasks = await Task.find().populate('assignedTo').populate('sprint');
    res.json(allTasks);
  } catch (err) {
    console.error('Error updating tasks:', err);
    res.status(500).send('Error updating tasks');
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));