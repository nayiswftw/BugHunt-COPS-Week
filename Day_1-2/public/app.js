const API_URL = 'http://localhost:3000';
const TOKEN_KEY = 'auth_token';

const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
const getToken = () => localStorage.getItem(TOKEN_KEY);
const removeToken = () => localStorage.removeItem(TOKEN_KEY);

const api = {
    request: async (endpoint, method = 'GET', body) => {
        const headers = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);
        try {
            const response = await fetch(`${API_URL}${endpoint}`, options);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `Request failed: ${response.status}`);
            return data;
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    },
    register: (userData) => api.request('/register', 'POST', userData),
    login: (credentials) => api.request('/login', 'POST', credentials),
    getUserData: () => api.request('/user'),
    getApiData: () => api.request('/data'),
    getTasks: () => api.request('/tasks'),
    addTask: (title, category) => api.request('/tasks', 'POST', { title, category }),
    updateTask: (id, updates) => api.request(`/tasks/${id}`, 'PUT', updates),
    deleteTask: (id) => api.request(`/tasks/${id}`, 'DELETE'),
};

const getElement = (id) => document.getElementById(id) || console.warn(`Element with id "${id}" not found.`);

const elements = {
    authForms: getElement('authForms'),
    loginForm: getElement('loginForm'),
    registerForm: getElement('registerForm'),
    showRegister: getElement('showRegister'),
    showLogin: getElement('showLogin'),
    loginError: getElement('loginError'),
    registerError: getElement('registerError'),
    dashboard: getElement('dashboard'),
    userName: getElement('userName'),
    userEmail: getElement('userEmail'),
    apiData: getElement('apiData'),
    logoutBtn: getElement('logoutBtn'),
    taskForm: getElement('taskForm'),
    taskTitle: getElement('taskTitle'),
    taskList: getElement('taskList'),
    taskCategory: getElement('taskCategory')
};

const showElement = (element) => element && (element.style.display = 'block');
const hideElement = (element) => element && (element.style.display = 'none');
const clearError = (element) => element && (element.textContent = '');
const displayError = (element, message) => element && (element.textContent = message);

const handleLogin = async (e) => {
    e.preventDefault();
    const { loginForm, loginError } = elements;
    if (!loginForm) return;
    try {
        const { token, user } = await api.login({ email: loginForm.loginEmail.value, password: loginForm.loginPassword.value });
        setToken(token);
        clearError(loginError);
        await showDashboard(user);
    } catch (error) {
        displayError(loginError, error.message);
    }
};

const handleRegister = async (e) => {
    e.preventDefault();
    const { registerForm, registerError } = elements;
    if (!registerForm) return;
    try {
        const { token, user } = await api.register({
            name: registerForm.registerName.value,
            email: registerForm.registerEmail.value,
            password: registerForm.registerPassword.value,
        });
        setToken(token);
        clearError(registerError);
        await showDashboard(user);
    } catch (error) {
        displayError(registerError, error.message);
    }
};

const handleLogout = (e) => {
    e.preventDefault();
    removeToken();
    showAuth();
};

const handleTaskSubmit = async (e) => {
    e.preventDefault();
    const { taskTitle, taskList, taskCategory } = elements;
    if (!taskTitle || !taskList || !taskCategory) return;
    try {
        const task = await api.addTask(taskTitle.value, taskCategory.value);
        const li = createTaskElement(task);
        taskList.appendChild(li);
        taskTitle.value = '';

        await loadApiData();

    } catch (error) {
        console.error('Failed to add task:', error.message);
    }

};

const handleTaskToggle = async (id, event) => {
    const completed = event.target.checked;
    updateTaskInUI(id, { completed });
    try {
        await api.updateTask(id, { completed });
    } catch (error) {
        console.error('Failed to update task:', error.message);
        updateTaskInUI(id, { completed: !completed });
    }
};

const handleTaskDelete = async (id) => {
    try {
        await api.deleteTask(id);
        removeTaskFromUI(id);

        await loadApiData();

    } catch (error) {
        console.error('Failed to delete task:', error.message);
    }
};

elements.taskList?.addEventListener('click', (event) => {
    if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox') {
        const taskId = event.target.closest('li').dataset.id;
        handleTaskToggle(taskId, event);
    } else if (event.target.tagName === 'BUTTON') {
        const taskId = event.target.closest('li').dataset.id;
        handleTaskDelete(taskId);
    }
});

const createTaskElement = (task) => {
    const li = document.createElement('li');
    li.dataset.id = task.id;
    li.className = task.completed ? 'completed fade-in' : 'fade-in';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;

    const span = document.createElement('span');
    span.textContent = task.title;

    const categorySpan = document.createElement('span');
    categorySpan.className = 'task-category';
    categorySpan.textContent = `(${task.category})`;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(categorySpan);
    li.appendChild(deleteButton);

    return li;
};
const updateTaskInUI = (id, updates) => {
    const { taskList } = elements;
    if (!taskList) return;
    const taskElement = taskList.querySelector(`[data-id="${id}"]`);
    if (!taskElement) return;

    if (updates.completed !== undefined) {
        const checkbox = taskElement.querySelector('input[type="checkbox"]');
        checkbox.checked = updates.completed;
        taskElement.classList.toggle('completed', updates.completed);
    }
};

const removeTaskFromUI = (id) => {
    const { taskList } = elements;
    if (!taskList) return;
    const taskElement = taskList.querySelector(`[data-id="${id}"]`);
    if (!taskElement) return;

    taskElement.style.transform = 'translateX(100%)';
    taskElement.style.opacity = '0';
    setTimeout(() => {
        if (taskList && taskElement.parentNode === taskList) {
            taskList.removeChild(taskElement);
        }
    }, 300);
};

const loadTasks = async () => {
    try {
        const tasks = await api.getTasks();
        const { taskList } = elements;
        if (!taskList) return;
        tasks.forEach(task => {
            const li = createTaskElement(task);
            taskList.appendChild(li);
        });
    } catch (error) {
        console.error('Failed to load tasks:', error.message);
    }
};

// <--- CATEGORY STATS --->
const loadApiData = async () => {
    const { stats: { tasksByCategory } = {} } = await api.getApiData();
    if (!elements.apiData || !tasksByCategory) return;

    const categoryStats = Object.entries(tasksByCategory)
        .map(([category, count]) => `${category}: ${count}`)
        .join(' • ');

    elements.apiData.innerHTML += categoryStats;
    elements.apiData.classList.toggle('category-data', Boolean(tasksByCategory));
};

const showDashboard = async (user) => {
    const { authForms, dashboard, logoutBtn, userName, userEmail, apiData } = elements;
    dashboard?.classList.add('visible');
    hideElement(authForms);
    showElement(dashboard);
    showElement(logoutBtn);

    if (userName) userName.textContent = user.name;
    if (userEmail) userEmail.textContent = user.email;

    await loadTasks();

};

const showAuth = () => {
    const { authForms, dashboard, logoutBtn, loginForm, registerForm } = elements;
    showElement(authForms);
    hideElement(dashboard);
    hideElement(logoutBtn);

    loginForm?.reset();
    registerForm?.reset();
};

const setupEventListeners = () => {
    const { loginForm, registerForm, logoutBtn, showRegister, showLogin, taskForm } = elements;

    loginForm?.addEventListener('submit', handleLogin);
    registerForm?.addEventListener('submit', handleRegister);
    logoutBtn?.addEventListener('click', handleLogout);
    showRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        hideElement(elements.loginForm);
        showElement(elements.registerForm);
    });
    showLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        hideElement(elements.registerForm);
        showElement(elements.loginForm);
    });
    taskForm?.addEventListener('submit', handleTaskSubmit);
};

const init = async () => {
    setupEventListeners();
    const token = getToken();
    try {
        if (token) {
            const user = await api.getUserData();
            await showDashboard(user);
        } else {
            showAuth();
        }
    } catch (error) {
        removeToken();
        showAuth();
    }
};

init();

