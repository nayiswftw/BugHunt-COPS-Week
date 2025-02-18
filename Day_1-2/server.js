const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Add password hashing
const rateLimit = require('express-rate-limit'); // Add rate limiting middleware

// Use environment variables for sensitive data
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Use proper data storage
const users = new Map(); // Better than array for O(1) lookups



const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Secure CORS configuration
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({
    limit: '10kb' // Prevent large payloads
}));

// Improved JWT authentication middleware
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid or expired token' });
            }
            // Don't expose sensitive data in JWT payload
            delete user.password;
            req.user = user;
            next();
        });
    } catch (error) {
        res.status(500).json({ message: 'Authentication error' });
    }
};

// Secure registration endpoint
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Input validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        if (users.has(email)) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = {
            id: crypto.randomUUID(), // Generate unique ID for user, prevent collisions
            name,
            email,
            password: hashedPassword, 
            createdAt: new Date()
        };

        users.set(email, user);

        // Create JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return sanitized user data
        const { password: _, ...userWithoutPassword } = user; // Remove password from response data
        res.status(201).json({
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Secure login endpoint
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.get(email);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return sanitized user data
        const { password: _, ...userWithoutPassword } = user; // Remove password from response data 
        res.json({
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/user', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.json({
        id: user.id,
        name: user.name,
        email: user.email
    });
});

app.get('/data', authenticateToken, (req, res) => {
    res.json({
        stats: {
            totalUsers: users.length,
            activeUsers: users.length,
            lastUpdated: new Date().toISOString()
        },
        recentActivity: [
            { type: 'login', user: req.user.email, timestamp: new Date().toISOString() }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Use proper data structure for tasks
const tasks = new Map();

// Add input validation middleware
const validateTaskInput = (req, res, next) => {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || title.length < 1) {
        return res.status(400).json({ message: 'Valid task title is required' });
    }
    next();
};

// Secure task endpoints
app.post('/tasks', authenticateToken, validateTaskInput, (req, res) => {
    // Use Try-Catch for error handling
    try {
        const { title } = req.body;
        // Use UUID for task IDs to prevent collisions
        const taskId = crypto.randomUUID();
        
        const task = {
            id: taskId,
            title,
            completed: false,
            userId: req.user.id,
            // Good practice to include timestamps
            createdAt: new Date(),
            updatedAt: new Date()
        };

        tasks.set(taskId, task);
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error creating task' });
    }
});

app.get('/tasks', authenticateToken, (req, res) => {
    // Use Try-Catch for error handling
    try {
        // Filter tasks by user ID and sort by creation date ---> O(n log n) complexity, using a Map would be O(1) complexity for lookups and O(n) for iteration
        
        const userTasks = Array.from(tasks.values())  // Use Array.from to convert Map to array 
            .filter(task => task.userId === req.user.id)
            .sort((a, b) => b.createdAt - a.createdAt);
        
        res.json(userTasks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tasks' });
    }
});

// Secure task update endpoint, rewritten poor quality code. Use object destructuring for better readability.
app.put('/tasks/:id', authenticateToken, validateTaskInput, (req, res) => {
    // Use Try-Catch for error handling
    try {
        // Use object destructuring to get task ID from request parameters
        const { id } = req.params;
        const task = tasks.get(id);
        // Check if task exists and belongs to the authenticated user
        if (!task || task.userId !== req.user.id) {
            return res.status(404).json({ message: 'Task not found' });
        }
        // Update task with new data
        const updatedTask = {
            ...task,
            ...req.body,
            updatedAt: new Date()
        };
        // Update task in the Map
        tasks.set(id, updatedTask);
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task' });
    }
});

// Secure task delete endpoint
// Again, use object destructuring for better readability and to avoid repetition
app.delete('/tasks/:id', authenticateToken, (req, res) => {
    // Use Try-Catch for error handling
    try {
        const { id } = req.params;
        const task = tasks.get(id);
        
        if (!task || task.userId !== req.user.id) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        // Use Map.delete() method to remove task by ID
        tasks.delete(id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting task' });
    }
});


// <-------------------Additional_Improvements------------------->
