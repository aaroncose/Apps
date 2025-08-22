/**
 * Organizador - Aplicación de Tareas y Gastos
 * 
 * Esta aplicación permite gestionar tareas con prioridades y gastos por categorías.
 * Utiliza localStorage para persistencia de datos y ofrece una interfaz moderna y accesible.
 */

// ===== CONSTANTES Y CONFIGURACIÓN =====
const STORAGE_KEYS = {
    TASKS: 'organizador_tasks',
    EXPENSES: 'organizador_expenses'
};

const PRIORITIES = {
    ALTA: 'alta',
    MEDIA: 'media',
    BAJA: 'baja'
};

const CATEGORIES = {
    FIJOS: 'fijos',
    OCIO: 'ocio',
    COMIDA: 'comida',
    COCHE: 'coche',
    EXTRAS: 'extras'
};

// ===== ESTADO GLOBAL =====
let state = {
    tasks: [],
    expenses: [],
    currentTab: 'tareas',
    taskSearch: '',
    expenseFilters: {
        category: '',
        month: ''
    }
};

// ===== UTILIDADES =====

/**
 * Genera un ID único para elementos
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Formatea un monto en euros
 */
function formatCurrency(amountCents) {
    const amount = amountCents / 100;
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

/**
 * Convierte un monto de euros a céntimos
 */
function eurosToCents(euros) {
    return Math.round(parseFloat(euros) * 100);
}

/**
 * Convierte una fecha a formato ISO
 */
function dateToISO(date) {
    return new Date(date).toISOString().split('T')[0];
}

/**
 * Obtiene el mes actual en formato YYYY-MM
 */
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

// ===== GESTIÓN DE LOCALSTORAGE =====

/**
 * Guarda datos en localStorage
 */
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
    }
}

/**
 * Carga datos desde localStorage
 */
function loadFromStorage(key, defaultValue = []) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error al cargar desde localStorage:', error);
        return defaultValue;
    }
}

/**
 * Guarda el estado actual
 */
function saveState() {
    saveToStorage(STORAGE_KEYS.TASKS, state.tasks);
    saveToStorage(STORAGE_KEYS.EXPENSES, state.expenses);
}

/**
 * Carga el estado inicial
 */
function loadState() {
    state.tasks = loadFromStorage(STORAGE_KEYS.TASKS);
    state.expenses = loadFromStorage(STORAGE_KEYS.EXPENSES);
    
    // Si no hay datos, cargar datos de ejemplo
    if (state.tasks.length === 0) {
        loadSampleTasks();
    }
    if (state.expenses.length === 0) {
        loadSampleExpenses();
    }
}

// ===== DATOS DE EJEMPLO =====

/**
 * Carga tareas de ejemplo
 */
function loadSampleTasks() {
    const sampleTasks = [
        {
            id: generateId(),
            text: 'Revisar presupuesto mensual',
            priority: PRIORITIES.ALTA,
            done: false,
            createdAt: new Date().toISOString()
        },
        {
            id: generateId(),
            text: 'Hacer ejercicio',
            priority: PRIORITIES.MEDIA,
            done: false,
            createdAt: new Date().toISOString()
        },
        {
            id: generateId(),
            text: 'Leer libro de programación',
            priority: PRIORITIES.BAJA,
            done: false,
            createdAt: new Date().toISOString()
        }
    ];
    
    state.tasks = sampleTasks;
    saveToStorage(STORAGE_KEYS.TASKS, sampleTasks);
}

/**
 * Carga gastos de ejemplo
 */
function loadSampleExpenses() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const sampleExpenses = [
        {
            id: generateId(),
            description: 'Supermercado',
            amountCents: 4567, // 45,67 €
            category: CATEGORIES.COMIDA,
            dateISO: dateToISO(today)
        },
        {
            id: generateId(),
            description: 'Gasolina',
            amountCents: 6500, // 65,00 €
            category: CATEGORIES.COCHE,
            dateISO: dateToISO(yesterday)
        },
        {
            id: generateId(),
            description: 'Netflix',
            amountCents: 1599, // 15,99 €
            category: CATEGORIES.OCIO,
            dateISO: dateToISO(lastWeek)
        }
    ];
    
    state.expenses = sampleExpenses;
    saveToStorage(STORAGE_KEYS.EXPENSES, sampleExpenses);
}

// ===== GESTIÓN DE TAREAS =====

/**
 * Añade una nueva tarea
 */
function addTask(text, priority) {
    const task = {
        id: generateId(),
        text: text.trim(),
        priority: priority,
        done: false,
        createdAt: new Date().toISOString()
    };
    
    state.tasks.push(task);
    saveState();
    renderTasks();
    updateTaskStats();
}

/**
 * Marca una tarea como completada/pendiente
 */
function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.done = !task.done;
        saveState();
        renderTasks();
        updateTaskStats();
    }
}

/**
 * Elimina una tarea
 */
function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
    renderTasks();
    updateTaskStats();
}

/**
 * Filtra tareas por texto de búsqueda
 */
function filterTasks(searchText) {
    state.taskSearch = searchText.toLowerCase();
    renderTasks();
}

/**
 * Ordena las tareas según prioridad y estado
 */
function sortTasks(tasks) {
    const priorityOrder = { [PRIORITIES.ALTA]: 3, [PRIORITIES.MEDIA]: 2, [PRIORITIES.BAJA]: 1 };
    
    return tasks.sort((a, b) => {
        // Primero las pendientes, luego las completadas
        if (a.done !== b.done) {
            return a.done ? 1 : -1;
        }
        
        // Dentro de cada grupo, por prioridad
        if (a.priority !== b.priority) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        
        // Finalmente alfabético
        return a.text.localeCompare(b.text);
    });
}

/**
 * Calcula estadísticas de tareas
 */
function calculateTaskStats() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.done).length;
    const pending = total - completed;
    
    return { total, completed, pending };
}

/**
 * Actualiza los contadores de tareas
 */
function updateTaskStats() {
    const stats = calculateTaskStats();
    
    document.getElementById('total-tasks').textContent = stats.total;
    document.getElementById('pending-tasks').textContent = stats.pending;
    document.getElementById('completed-tasks').textContent = stats.completed;
}

/**
 * Renderiza la lista de tareas
 */
function renderTasks() {
    const tasksList = document.getElementById('tasks-list');
    const emptyState = document.getElementById('tasks-empty');
    
    // Filtrar tareas por búsqueda
    let filteredTasks = state.tasks;
    if (state.taskSearch) {
        filteredTasks = state.tasks.filter(task => 
            task.text.toLowerCase().includes(state.taskSearch)
        );
    }
    
    // Ordenar tareas
    const sortedTasks = sortTasks(filteredTasks);
    
    if (sortedTasks.length === 0) {
        tasksList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    tasksList.innerHTML = sortedTasks.map(task => `
        <li class="task-item ${task.done ? 'completed' : ''}" data-id="${task.id}">
            <span class="task-priority priority-${task.priority}">${task.priority}</span>
            <span class="task-text">${escapeHtml(task.text)}</span>
            <div class="task-actions">
                <button class="btn-task btn-complete" onclick="toggleTask('${task.id}')" aria-label="${task.done ? 'Marcar como pendiente' : 'Marcar como completada'}">
                    ${task.done ? 'Deshacer' : 'Hecha'}
                </button>
                <button class="btn-task btn-delete" onclick="deleteTask('${task.id}')" aria-label="Eliminar tarea">
                    Eliminar
                </button>
            </div>
        </li>
    `).join('');
}

// ===== GESTIÓN DE GASTOS =====

/**
 * Añade un nuevo gasto
 */
function addExpense(description, amount, category, date) {
    const expense = {
        id: generateId(),
        description: description.trim(),
        amountCents: eurosToCents(amount),
        category: category,
        dateISO: dateToISO(date)
    };
    
    state.expenses.push(expense);
    saveState();
    renderExpenses();
    updateExpenseStats();
    renderCategoryTotals();
}

/**
 * Elimina un gasto
 */
function deleteExpense(id) {
    state.expenses = state.expenses.filter(e => e.id !== id);
    saveState();
    renderExpenses();
    updateExpenseStats();
    renderCategoryTotals();
}

/**
 * Filtra gastos por categoría y mes
 */
function filterExpenses(category = '', month = '') {
    state.expenseFilters.category = category;
    state.expenseFilters.month = month;
    renderExpenses();
    updateExpenseStats();
    renderCategoryTotals();
}

/**
 * Calcula estadísticas de gastos
 */
function calculateExpenseStats() {
    const total = state.expenses.reduce((sum, e) => sum + e.amountCents, 0);
    
    const currentMonth = getCurrentMonth();
    const monthly = state.expenses
        .filter(e => e.dateISO.startsWith(currentMonth))
        .reduce((sum, e) => sum + e.amountCents, 0);
    
    return { total, monthly };
}

/**
 * Actualiza los contadores de gastos
 */
function updateExpenseStats() {
    const stats = calculateExpenseStats();
    
    document.getElementById('total-expenses').textContent = formatCurrency(stats.total);
    document.getElementById('monthly-expenses').textContent = formatCurrency(stats.monthly);
}

/**
 * Calcula totales por categoría
 */
function calculateCategoryTotals() {
    const totals = {};
    
    // Inicializar todas las categorías
    Object.values(CATEGORIES).forEach(category => {
        totals[category] = 0;
    });
    
    // Calcular totales filtrados
    const filteredExpenses = getFilteredExpenses();
    filteredExpenses.forEach(expense => {
        totals[expense.category] += expense.amountCents;
    });
    
    return totals;
}

/**
 * Obtiene gastos filtrados
 */
function getFilteredExpenses() {
    let filtered = state.expenses;
    
    // Filtrar por categoría
    if (state.expenseFilters.category) {
        filtered = filtered.filter(e => e.category === state.expenseFilters.category);
    }
    
    // Filtrar por mes
    if (state.expenseFilters.month) {
        filtered = filtered.filter(e => e.dateISO.startsWith(state.expenseFilters.month));
    }
    
    return filtered.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
}

/**
 * Renderiza los totales por categoría
 */
function renderCategoryTotals() {
    const categoryCards = document.getElementById('category-cards');
    const totals = calculateCategoryTotals();
    
    categoryCards.innerHTML = Object.entries(totals).map(([category, amount]) => `
        <div class="category-card">
            <div class="category-name">${category}</div>
            <div class="category-amount">${formatCurrency(amount)}</div>
        </div>
    `).join('');
}

/**
 * Renderiza la tabla de gastos
 */
function renderExpenses() {
    const tbody = document.getElementById('expenses-tbody');
    const emptyState = document.getElementById('expenses-empty');
    
    const filteredExpenses = getFilteredExpenses();
    
    if (filteredExpenses.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    tbody.innerHTML = filteredExpenses.map(expense => {
        const date = new Date(expense.dateISO);
        const formattedDate = date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        return `
            <tr data-id="${expense.id}">
                <td class="expense-date">${formattedDate}</td>
                <td><span class="expense-category category-${expense.category}">${expense.category}</span></td>
                <td>${escapeHtml(expense.description)}</td>
                <td class="expense-amount">${formatCurrency(expense.amountCents)}</td>
                <td>
                    <button class="btn-task btn-delete" onclick="deleteExpense('${expense.id}')" aria-label="Eliminar gasto">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== NAVEGACIÓN DE PESTAÑAS =====

/**
 * Cambia a una pestaña específica
 */
function switchTab(tabName) {
    // Actualizar estado
    state.currentTab = tabName;
    
    // Actualizar botones
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        activeButton.setAttribute('aria-selected', 'true');
    }
    
    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(tabName);
    if (activeContent) {
        activeContent.classList.add('active');
    }
    
    // Actualizar URL
    window.location.hash = tabName;
}

// ===== UTILIDADES DE SEGURIDAD =====

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Muestra un mensaje de confirmación
 */
function confirmAction(message) {
    return confirm(message);
}

// ===== LIMPIEZA DE DATOS =====

/**
 * Limpia todas las tareas
 */
function clearAllTasks() {
    if (confirmAction('¿Estás seguro de que quieres eliminar todas las tareas?')) {
        state.tasks = [];
        saveState();
        renderTasks();
        updateTaskStats();
    }
}

/**
 * Limpia todos los gastos
 */
function clearAllExpenses() {
    if (confirmAction('¿Estás seguro de que quieres eliminar todos los gastos?')) {
        state.expenses = [];
        saveState();
        renderExpenses();
        updateExpenseStats();
        renderCategoryTotals();
    }
}

// ===== MANEJADORES DE EVENTOS =====

/**
 * Inicializa todos los event listeners
 */
function initializeEventListeners() {
    // Navegación de pestañas
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Formulario de tareas
    const taskForm = document.getElementById('task-form');
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const textInput = document.getElementById('task-text');
        const prioritySelect = document.getElementById('task-priority');
        
        const text = textInput.value.trim();
        const priority = prioritySelect.value;
        
        if (text) {
            addTask(text, priority);
            textInput.value = '';
            prioritySelect.value = PRIORITIES.MEDIA;
            textInput.focus();
        }
    });
    
    // Búsqueda de tareas
    const taskSearch = document.getElementById('task-search');
    taskSearch.addEventListener('input', (e) => {
        filterTasks(e.target.value);
    });
    
    // Formulario de gastos
    const expenseForm = document.getElementById('expense-form');
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const descriptionInput = document.getElementById('expense-description');
        const amountInput = document.getElementById('expense-amount');
        const categorySelect = document.getElementById('expense-category');
        const dateInput = document.getElementById('expense-date');
        
        const description = descriptionInput.value.trim();
        const amount = amountInput.value;
        const category = categorySelect.value;
        const date = dateInput.value;
        
        if (description && amount && date) {
            addExpense(description, amount, category, date);
            descriptionInput.value = '';
            amountInput.value = '';
            categorySelect.value = CATEGORIES.FIJOS;
            dateInput.value = getCurrentDate();
            descriptionInput.focus();
        }
    });
    
    // Filtros de gastos
    const categoryFilter = document.getElementById('category-filter');
    categoryFilter.addEventListener('change', (e) => {
        filterExpenses(e.target.value, state.expenseFilters.month);
    });
    
    const monthFilter = document.getElementById('month-filter');
    monthFilter.addEventListener('change', (e) => {
        filterExpenses(state.expenseFilters.category, e.target.value);
    });
    
    // Botones de limpieza
    document.getElementById('clear-tasks').addEventListener('click', clearAllTasks);
    document.getElementById('clear-expenses').addEventListener('click', clearAllExpenses);
    
    // Navegación por teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Limpiar búsquedas y filtros
            document.getElementById('task-search').value = '';
            document.getElementById('category-filter').value = '';
            document.getElementById('month-filter').value = '';
            filterTasks('');
            filterExpenses('', '');
        }
    });
}

// ===== INICIALIZACIÓN =====

/**
 * Inicializa la aplicación
 */
function initializeApp() {
    // Cargar estado
    loadState();
    
    // Configurar fecha por defecto
    document.getElementById('expense-date').value = getCurrentDate();
    
    // Configurar mes por defecto en filtro
    document.getElementById('month-filter').value = getCurrentMonth();
    
    // Renderizar contenido inicial
    renderTasks();
    updateTaskStats();
    renderExpenses();
    updateExpenseStats();
    renderCategoryTotals();
    
    // Configurar event listeners
    initializeEventListeners();
    
    // Manejar navegación por hash
    if (window.location.hash) {
        const tabName = window.location.hash.substring(1);
        if (tabName === 'tareas' || tabName === 'gastos') {
            switchTab(tabName);
        }
    }
    
    console.log('✅ Organizador inicializado correctamente');
}

// ===== INICIO DE LA APLICACIÓN =====

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

// Exportar funciones para uso global (necesario para onclick en HTML)
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.deleteExpense = deleteExpense;
