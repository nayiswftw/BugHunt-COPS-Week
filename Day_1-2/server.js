const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

let users = [];
let tasks = [];

app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
};

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ message: 'Authentication required' });

        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Invalid token format' });

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return res.status(403).json({ message: 'Invalid or expired token' });
            req.user = user;
            next();
        });
    } catch (error) {
        console.log('Authentication error:', error);
        next(error);
    }
};



const handleRegistration = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
        if (users.some(u => u.email === email)) return res.status(409).json({ message: 'Email already registered' });

        if (password.length < 8) { return res.status(400).json({ message: 'Password must be at least 8 characters long' }); }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: users.length + 1, name, email, password: hashedPassword };
        users.push(newUser);

        const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ message: 'User registered', token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });

    } catch (error) {
        console.error('Registration error:', error);
        next(error);
    }
};

const handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Logged in', token, user: { id: user.id, name: user.name, email: user.email } });

    } catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};

const getUserProfile = (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user.id, name: user.name, email: user.email });
};

const getDashboardData = (req, res) => {
    const userTasks = tasks.filter(task => task.userId === req.user.id);
    const categoryStats = userTasks.reduce((acc, task) => {
        acc[task.category] = (acc[task.category] || 0) + 1;
        return acc;
    }, {});

    res.json({
        stats: {
            totalUsers: users.length,
            activeUsers: users.length,
            lastUpdated: new Date().toISOString(),
            tasksByCategory: categoryStats
        },
        recentActivity: [
            { type: 'login', user: req.user.email, timestamp: new Date().toISOString() }
        ]
    });
};

const TASK_CATEGORIES = ['Personal', 'Home', 'Shopping', 'Work'];

const createTask = (req, res) => {
    const { title, category } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });
    if (category && !TASK_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Invalid category' });
    }
    const newTask = {
        id: tasks.length + 1,
        title,
        category: category,
        completed: false,
        userId: req.user.id,
        createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    res.status(201).json(newTask);
};

const getUserTasks = (req, res) => {
    const userTasks = tasks.filter(task => task.userId === req.user.id);
    res.json(userTasks);
};

const updateTask = (req, res) => {
    const { id } = req.params;
    const { title, completed } = req.body;

    const taskId = parseInt(id);
    if (isNaN(taskId)) return res.status(400).json({ message: 'Invalid task ID' });

    const task = tasks.find(task => task.id === taskId && task.userId === req.user.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (title !== undefined) task.title = title;
    if (completed !== undefined) task.completed = completed;

    res.json(task);
};

const deleteTask = (req, res) => {
    const { id } = req.params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) return res.status(400).json({ message: 'Invalid task ID' });

    const taskIndex = tasks.findIndex(task => task.id === taskId && task.userId === req.user.id);
    if (taskIndex === -1) return res.status(404).json({ message: 'Task not found' });

    tasks.splice(taskIndex, 1);
    res.json({ message: 'Task deleted successfully' });
};

app.post('/register', handleRegistration);
app.post('/login', handleLogin);
app.get('/user', authenticateToken, getUserProfile);
app.get('/data', authenticateToken, getDashboardData);
app.post('/tasks', authenticateToken, createTask);
app.get('/tasks', authenticateToken, getUserTasks);
app.put('/tasks/:id', authenticateToken, updateTask);
app.delete('/tasks/:id', authenticateToken, deleteTask);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.use(errorHandler); 