// Configuration constants
const API_URL = 'http://localhost:3000';
const TOKEN_KEY = 'auth_token';

// Token management service
// I created this TokenService object to handle all token-related operations.
// This includes storing, retrieving, and removing tokens from localStorage.
// By encapsulating these operations, I'm making the code more modular and easier to maintain.
const TokenService = {
    // Store token in localStorage
    set: (token) => {
        if (!token) return;
        try {
            localStorage.setItem(TOKEN_KEY, token);
        } catch (error) {
            console.error('Failed to store token:', error);
        }
    },
    // Retrieve token from localStorage
    get: () => {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch (error) {
            console.error('Failed to retrieve token:', error);
            return null;
        }
    },
    // Remove token from localStorage
    remove: () => {
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch (error) {
            console.error('Failed to remove token:', error);
        }
    }
};

// API service for handling requests
// The ApiService object is responsible for making all API requests.
// It includes methods for registering, logging in, getting user data, and managing tasks.
// By centralizing API requests in this service, I can easily manage headers, handle errors, and update the API URL if needed.
const ApiService = {
    // General request method
    async request(endpoint, options = {}) {
        const token = TokenService.get();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw new Error(error.message || 'Network error occurred');
        }
    },

    // Authentication endpoints
    auth: {
        register: (userData) => ApiService.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        }),

        login: (credentials) => ApiService.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }),

        getUserData: () => ApiService.request('/user')
    },

    // Task endpoints
    tasks: {
        getAll: () => ApiService.request('/tasks'),
        add: (title) => ApiService.request('/tasks', {
            method: 'POST',
            body: JSON.stringify({ title })
        }),
        update: (id, updates) => ApiService.request(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        }),
        delete: (id) => ApiService.request(`/tasks/${id}`, {
            method: 'DELETE'
        })
    }
};

// DOM element management
// The DOMService object is used to manage DOM elements.
// It caches frequently used elements to avoid repeatedly querying the DOM.
// This improves performance and makes the code more readable.
const DOMService = {
    elements: {},
    // Initialize and cache DOM elements
    init() {
        const elementIds = {
            authForms: 'authForms',
            loginForm: 'loginForm',
            registerForm: 'registerForm',
            showRegister: 'showRegister',
            showLogin: 'showLogin',
            loginError: 'loginError',
            registerError: 'registerError',
            dashboard: 'dashboard',
            userName: 'userName',
            userEmail: 'userEmail',
            logoutBtn: 'logoutBtn',
            taskForm: 'taskForm',
            taskTitle: 'taskTitle',
            taskList: 'taskList',
            // apiData: 'apiData' { Uncomment to enable } <---For Debugging Purposes--->
        };

        for (const [key, id] of Object.entries(elementIds)) {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`Element with id '${id}' not found`);
            }
            if (!(key == "apiData")) console.log("Debug Mode Off"); 
            this.elements[key] = element;
        }

    }
};


// Task management
// The TaskManager object handles all task-related operations.
// This includes adding, updating, deleting, and displaying tasks.
// By centralizing task management in this object, I can easily modify task behavior without affecting other parts of the code.
const TaskManager = {
    // Add a new task
    async add(title) {
        if (!title?.trim()) {
            throw new Error('Task title cannot be empty');
        }
        const task = await ApiService.tasks.add(title);
        this.addToUI(task);
        return task;
    },
    // Add task to UI
    addToUI(task) {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        li.className = `task-item ${task.completed ? 'completed' : ''} fade-in`;

        li.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''}>
            <span>${task.title}</span>
            <button type="button" class="delete-btn">Delete</button>
        `;

        li.addEventListener('change', this.handleToggle.bind(this));
        li.querySelector('.delete-btn').addEventListener('click', () => this.delete(task.id));

        DOMService.elements.taskList.appendChild(li);
    },
    // Handle task toggle
    async handleToggle(event) {
        if (event.target.type === 'checkbox') {
            const li = event.target.closest('li');
            const taskId = li.dataset.id;
            const completed = event.target.checked;

            try {
                const taskTitle = li.querySelector('span').textContent;
                await ApiService.tasks.update(taskId, { title: taskTitle, completed });
                this.updateUI(taskId, { completed });
            } catch (error) {
                console.error('Failed to update task:', error);
                event.target.checked = !completed;
            }
        }
    },
    // Update task in UI
    updateUI(id, updates) {
        const taskElement = DOMService.elements.taskList.querySelector(`[data-id="${id}"]`);
        if (!taskElement) return;

        if (updates.completed !== undefined) {
            taskElement.querySelector('input[type="checkbox"]').checked = updates.completed;
            taskElement.classList.toggle('completed', updates.completed);
        }
    },
    // Delete task
    async delete(id) {
        try {
            await ApiService.tasks.delete(id);
            this.removeFromUI(id);
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    },
    // Remove task from UI
    removeFromUI(id) {
        const taskElement = DOMService.elements.taskList.querySelector(`[data-id="${id}"]`);
        if (!taskElement) return;

        taskElement.classList.add('fade-out');
        setTimeout(() => taskElement.remove(), 300);
    }
};

// Authentication management
// The AuthManager object is responsible for handling user authentication.
// It includes methods for logging in, registering, and logging out.
// By centralizing authentication logic in this object, I can easily manage user sessions and security.
const AuthManager = {
    async handleLogin(e) {

        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            DOMService.elements.loginError.textContent = 'Please fill in all fields';
            return;
        }

        try {
            const { token, user } = await ApiService.auth.login({ email, password });
            TokenService.set(token);
            UIManager.showDashboard(user);
        } catch (error) {
            DOMService.elements.loginError.textContent = error.message;
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;

        if (!name || !email || !password) {
            DOMService.elements.registerError.textContent = 'Please fill in all fields';
            return;
        }

        if (password.length < 8) {
            DOMService.elements.registerError.textContent = 'Password must be at least 8 characters';
            return;
        }

        try {
            const { token, user } = await ApiService.auth.register({ name, email, password });
            TokenService.set(token);
            UIManager.showDashboard(user);
        } catch (error) {
            DOMService.elements.registerError.textContent = error.message;
        }
    },

    handleLogout(e) {
        e.preventDefault();
        TokenService.remove();
        UIManager.showAuth();

    }
};

// UI state management
// The UIManager object is responsible for managing the UI state.
// It includes methods for showing the dashboard, showing the authentication forms, and updating the UI based on user actions.
// By centralizing UI management in this object, I can easily control the user interface and ensure a consistent user experience.
const UIManager = {
    async showDashboard(user) {
        // console.log('Showing dashboard for user:', user); // Debug log
        DOMService.elements.authForms.style.display = 'none';
        DOMService.elements.dashboard.style.display = 'block';
        DOMService.elements.dashboard.classList.add('visible');
        DOMService.elements.logoutBtn.style.display = 'block';

        DOMService.elements.userName.textContent = user.name;
        DOMService.elements.userEmail.textContent = user.email;

        try {
            const tasks = await ApiService.tasks.getAll();
            DOMService.elements.taskList.innerHTML = '';
            tasks.forEach(task => TaskManager.addToUI(task));

            // <---For Debugging Purposes--->
            // Fetch and display API data { Uncomment to enable } 
            // const apiData = await ApiService.request('/data');
            // DOMService.elements.apiData.textContent = JSON.stringify(apiData, null, 2);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    },

    showAuth() {
        // console.log('Showing auth forms'); // Debug log
        DOMService.elements.authForms.style.display = 'block';
        DOMService.elements.dashboard.style.display = 'none';
        DOMService.elements.logoutBtn.style.display = 'none';
        DOMService.elements.loginForm.reset();
        DOMService.elements.registerForm.reset();
        DOMService.elements.loginError.textContent = '';
        DOMService.elements.registerError.textContent = '';
    }
};

// Initialize application
// This is the main entry point of the application.
// It initializes the DOM elements, sets up event listeners, and checks the authentication status to determine which UI to display.
// By using this initialization pattern, I can ensure that the application is properly set up before any user interaction occurs.
document.addEventListener('DOMContentLoaded', () => {

    // Initialize DOM elements
    DOMService.init();
    
    // Set up event listeners
    DOMService.elements.loginForm.addEventListener('submit', AuthManager.handleLogin);
    DOMService.elements.registerForm.addEventListener('submit', AuthManager.handleRegister);
    DOMService.elements.logoutBtn.addEventListener('click', AuthManager.handleLogout);
    DOMService.elements.taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = DOMService.elements.taskTitle.value.trim();
        try {
            await TaskManager.add(title);
            DOMService.elements.taskTitle.value = '';
        } catch (error) {
            console.error('Failed to add task:', error);
        }
    });

    // Handle form visibility toggling
    DOMService.elements.showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        DOMService.elements.loginForm.style.display = 'none';
        DOMService.elements.registerForm.style.display = 'block';
    });

    DOMService.elements.showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        DOMService.elements.registerForm.style.display = 'none';
        DOMService.elements.loginForm.style.display = 'block';
    });

    // Check authentication status and initialize app
    const token = TokenService.get();
    if (token) {
        ApiService.auth.getUserData()
            .then(user => UIManager.showDashboard(user))
            .catch(() => {
                TokenService.remove();
                UIManager.showAuth();
            });
    } else {
        UIManager.showAuth();
    }
});
