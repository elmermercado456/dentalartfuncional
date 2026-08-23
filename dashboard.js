// State Management
let appointments = [];
let tasks = [];
let currentFilter = 'pendiente';

// Set of already notified appointment IDs for this session
const notifiedAppointments = new Set();
const notifiedEnSala = new Set();
let isFirstLoad = true;

// Default Fallback Mock Data
const defaultAppointments = [
    {
        id: 1,
        time: '08:30 AM',
        patient: 'Carlos Mendoza',
        treatment: 'Profilaxis Dental',
        status: 'completado',
        notes: 'Paciente con ligera sensibilidad en encías.'
    },
    {
        id: 2,
        time: '10:00 AM',
        patient: 'María Delgado',
        treatment: 'Tratamiento de Endodoncia',
        status: 'en-sala',
        notes: 'Segunda sesión conducto premolar superior.'
    },
    {
        id: 3,
        time: '11:30 AM',
        patient: 'Andrés Gutiérrez',
        treatment: 'Resina Estética Estructural',
        status: 'pendiente',
        notes: 'Requiere anestesia local.'
    },
    {
        id: 4,
        time: '02:30 PM',
        patient: 'Sofía Vega',
        treatment: 'Blanqueamiento Led',
        status: 'pendiente',
        notes: 'Tomar fotos de color previo.'
    },
    {
        id: 5,
        time: '04:30 PM',
        patient: 'Jorge Ramírez',
        treatment: 'Extracción Tercer Molar',
        status: 'pendiente',
        notes: 'Trae radiografía panorámica impresa.'
    }
];

const defaultTasks = [
    {
        id: 1,
        text: 'Llamar al laboratorio dental por corona de la Sra. Torres',
        completed: true
    },
    {
        id: 2,
        text: 'Hacer pedido mensual de anestesia lidocaína y agujas cortas',
        completed: false
    },
    {
        id: 3,
        text: 'Revisar facturación electrónica de la primera quincena',
        completed: false
    },
    {
        id: 4,
        text: 'Enviar presupuesto de implantes a Luis Gómez',
        completed: false
    }
];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    updateDateBadge();
    await loadInitialData();
    updateCounters();
    checkNotificationStatusOnLoad();
    
    // Start notification checking interval (every 30 seconds)
    setInterval(checkUpcomingAppointments, 30000);
    
    // Start polling updates if Firebase is not active (every 2 seconds)
    if (!window.useFirebase) {
        startPolling();
    }
});

// Check browser notification permission status on load
function checkNotificationStatusOnLoad() {
    const btn = document.getElementById('notification-btn');
    const text = document.getElementById('notification-btn-text');
    
    if (!("Notification" in window)) {
        btn.style.display = 'none';
        return;
    }
    
    if (Notification.permission === "granted") {
        btn.className = "px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5 cursor-default";
        text.textContent = "Notificaciones Activas";
    } else if (Notification.permission === "denied") {
        btn.className = "px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1.5 cursor-default";
        text.textContent = "Notificaciones Bloqueadas";
    }
}

// Request permission for push notifications
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("Tu navegador no soporta notificaciones de escritorio.");
        return;
    }
    
    const permission = await Notification.requestPermission();
    checkNotificationStatusOnLoad();
    
    if (permission === "granted") {
        showDesktopNotification("¡Notificaciones Activadas!", "Te avisaremos cuando comiencen tus citas.");
    }
}

// Helper to show a notification (combines Browser Notifications & In-App Toasts)
function showDesktopNotification(title, body) {
    // 1. Browser Native Notification
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: 'https://cdn-icons-png.flaticon.com/512/3467/3467831.png'
        });
    }
    
    // 2. In-App Custom Toast (Visual Fallback)
    showInAppToast(title, body);
}

// In-App Toast notification renderer
function showInAppToast(title, body) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'bg-white border-l-4 border-dental-teal shadow-xl rounded-xl p-4 flex gap-3 items-start transform translate-y-5 opacity-0 transition-all duration-300';
    toast.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-dental-tealLight flex items-center justify-center text-dental-teal shrink-0">
            <i class="fa-solid fa-bell"></i>
        </div>
        <div class="flex-1">
            <h4 class="font-bold text-sm text-slate-800">${title}</h4>
            <p class="text-xs text-slate-500 mt-0.5">${body}</p>
        </div>
        <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 transition-colors">
            <i class="fa-solid fa-xmark text-xs"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Trigger slide-in
    setTimeout(() => {
        toast.classList.remove('translate-y-5', 'opacity-0');
    }, 50);
    
    // Auto-remove after 6 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-5', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 6000);
}

// Check if any appointment is starting right now or in 5 minutes
function checkUpcomingAppointments() {
    const now = new Date();
    // Format current time in 12h: e.g. "08:30 AM" or "02:30 PM"
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strMinutes = minutes < 10 ? '0'+minutes : minutes;
    const strHours = hours < 10 ? '0'+hours : hours;
    
    const currentTimeStr = `${strHours}:${strMinutes} ${ampm}`;
    
    appointments.forEach(app => {
        // Only notify for pending or en-sala appointments, and avoid repeating
        if (app.status !== 'completado' && !notifiedAppointments.has(app.id)) {
            if (app.time === currentTimeStr) {
                // Auto-transition to "en-sala" if it was "pendiente"
                if (app.status === 'pendiente') {
                    changeAppStatus(app.id, 'en-sala');
                }
                
                showDesktopNotification(
                    `Cita ahora: ${app.patient}`, 
                    `Paciente ${app.patient} ha sido marcado automáticamente "En Sala de espera" por la hora (${app.time}).`
                );
                notifiedAppointments.add(app.id);
            }
        }
    });
}

// Load Initial Data from API (Falls back to Local Storage/Mock Data)
async function loadInitialData() {
    if (window.useFirebase) {
        let isFirstAppointmentsSnapshot = true;
        window.db.collection('appointments').onSnapshot(snapshot => {
            const newAppointments = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                newAppointments.push({ id: doc.id, ...data });
            });

            if (isFirstAppointmentsSnapshot) {
                isFirstAppointmentsSnapshot = false;
                // Set baseline for notifications
                newAppointments.forEach(app => {
                    if (app.status === 'en-sala') {
                        notifiedEnSala.add(app.id);
                    }
                });
            } else {
                checkForCitaNotifications(newAppointments);
            }

            appointments = newAppointments;
            sortAppointments();
            renderAppointments();
            updateCounters();
        }, err => {
            console.error("Error al escuchar citas de Firebase:", err);
        });

        window.db.collection('tasks').onSnapshot(snapshot => {
            const newTasks = [];
            snapshot.forEach(doc => {
                newTasks.push({ id: doc.id, ...doc.data() });
            });
            tasks = newTasks;
            renderTasks();
            updateCounters();
        }, err => {
            console.error("Error al escuchar tareas de Firebase:", err);
        });

        isFirstLoad = false;
        return;
    }

    try {
        const appRes = await fetch('/api/appointments');
        if (appRes.ok) {
            appointments = await appRes.json();
            sortAppointments();
        } else {
            throw new Error('API Error');
        }

        const taskRes = await fetch('/api/tasks');
        if (taskRes.ok) {
            tasks = await taskRes.json();
        } else {
            throw new Error('API Error');
        }
        console.log("🚀 Datos cargados exitosamente desde el servidor backend.");
    } catch (err) {
        console.warn("⚠️ Servidor backend no detectado o inalcanzable. Usando almacenamiento local o datos mock.");
        appointments = JSON.parse(localStorage.getItem('dentist_appointments')) || defaultAppointments;
        sortAppointments();
        tasks = JSON.parse(localStorage.getItem('dentist_tasks')) || defaultTasks;
    }
    
    // Initialize notification baseline on first load
    appointments.forEach(app => {
        if (app.status === 'en-sala') {
            notifiedEnSala.add(app.id);
        }
    });
    isFirstLoad = false;

    renderAppointments();
    renderTasks();
}

// Sort appointments chronologically helper
function sortAppointments() {
    appointments.sort((a, b) => {
        return convertTimeToMinutes(a.time) - convertTimeToMinutes(b.time);
    });
}

// Helper to convert "08:30 AM" or "02:30 PM" to minutes from midnight for sorting
function convertTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(' ');
    if (parts.length < 2) return 0;
    
    const timeParts = parts[0].split(':');
    let hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const ampm = parts[1].toUpperCase();
    
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
}

// Save Local Storage State if server isn't used
function saveLocalState() {
    localStorage.setItem('dentist_appointments', JSON.stringify(appointments));
    localStorage.setItem('dentist_tasks', JSON.stringify(tasks));
}

// Modal controls
function openApptModal() {
    const modal = document.getElementById('appt-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.transform').classList.remove('scale-95');
    }, 10);
}

function closeApptModal() {
    const modal = document.getElementById('appt-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('.transform').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
    document.getElementById('appt-form').reset();
}

// Helper to convert "14:30" (24h input format) to "02:30 PM" (12h app format)
function convert24hTo12h(timeStr) {
    if (!timeStr) return "";
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0]);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strHours = hours < 10 ? '0' + hours : hours;
    return `${strHours}:${minutes} ${ampm}`;
}

// Create New Appointment
async function createAppointment(event) {
    event.preventDefault();
    
    const patient = document.getElementById('appt-patient').value.trim();
    const timeRaw = document.getElementById('appt-time').value;
    const time = convert24hTo12h(timeRaw);
    const status = document.getElementById('appt-status').value;
    const treatment = document.getElementById('appt-treatment').value;
    const notes = document.getElementById('appt-notes').value.trim();
    
    if (!patient) return;
    
    const newAppt = {
        time,
        patient,
        treatment,
        status,
        notes
    };
    
    closeApptModal();

    if (window.useFirebase) {
        try {
            await window.db.collection('appointments').add(newAppt);
        } catch (err) {
            console.error("Error al guardar cita en Firebase:", err);
        }
        return;
    }
    
    newAppt.id = Date.now();
    appointments.push(newAppt);
    sortAppointments();
    
    try {
        const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAppt)
        });
        if (res.ok) {
            const saved = await res.json();
            newAppt.id = saved.id;
        }
    } catch (err) {
        console.warn("API offline. Cita guardada localmente.");
        saveLocalState();
    }
    
    renderAppointments();
    updateCounters();
    
    // Trigger desktop test notification instantly for verification
    showDesktopNotification(
        "Cita Programada", 
        `Paciente ${patient} agendado a las ${time}.`
    );
}

// Update the Date in the Header
function updateDateBadge() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    let dateString = today.toLocaleDateString('es-ES', options);
    dateString = dateString.charAt(0).toUpperCase() + dateString.slice(1);
    
    document.getElementById('current-date-badge').innerHTML = `
        <i class="fa-regular fa-calendar-days mr-1.5"></i> ${dateString}
    `;
}

// Render Appointments Timeline
function renderAppointments() {
    const container = document.getElementById('timeline-container');
    container.innerHTML = '';

    const filtered = appointments.filter(app => {
        if (currentFilter === 'all') return true;
        return app.status === currentFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-400">
                <i class="fa-solid fa-calendar-xmark text-3xl mb-2 text-slate-300"></i>
                <p class="text-sm">No hay citas registradas en este estado.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(app => {
        const card = document.createElement('div');
        card.className = `relative flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${getStatusClass(app.status)}`;
        
        const badgeMarkup = getStatusBadge(app.status);

        card.innerHTML = `
            <div class="absolute left-[-27px] top-5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${getNodeColor(app.status)} z-10"></div>
            
            <div class="flex-1 pr-4">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">${app.time}</span>
                    ${badgeMarkup}
                </div>
                <h3 class="font-bold text-slate-800 text-base">${app.patient}</h3>
                <p class="text-xs font-semibold text-dental-teal/90">${app.treatment}</p>
                ${app.notes ? `<p class="text-xs text-slate-500 mt-1.5 italic"><i class="fa-solid fa-circle-info text-[10px] mr-1 text-slate-400"></i>${app.notes}</p>` : ''}
            </div>

            <div class="mt-4 md:mt-0 flex items-center gap-1 bg-white/50 p-1 rounded-lg border border-slate-200/50 self-start md:self-center">
                <button onclick="changeAppStatus(${app.id}, 'pendiente')" title="Marcar como Pendiente" 
                    class="w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors ${app.status === 'pendiente' ? 'bg-amber-500 text-white' : 'hover:bg-slate-200 text-slate-500'}">
                    <i class="fa-solid fa-hourglass-start"></i>
                </button>
                <button onclick="changeAppStatus(${app.id}, 'en-sala')" title="Marcar en Sala de espera" 
                    class="w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors ${app.status === 'en-sala' ? 'bg-dental-blue text-white' : 'hover:bg-slate-200 text-slate-500'}">
                    <i class="fa-solid fa-user-clock"></i>
                </button>
                <button onclick="changeAppStatus(${app.id}, 'completado')" title="Marcar como Completado" 
                    class="w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors ${app.status === 'completado' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200 text-slate-500'}">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button onclick="deleteAppointment(${app.id})" title="Eliminar de la Agenda" 
                    class="w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors text-rose-500 hover:bg-rose-500 hover:text-white">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function getNodeColor(status) {
    switch(status) {
        case 'completado': return 'bg-emerald-500';
        case 'en-sala': return 'bg-dental-blue';
        case 'pendiente': default: return 'bg-amber-500';
    }
}

function getStatusClass(status) {
    switch(status) {
        case 'completado':
            return 'bg-emerald-50/30 border-emerald-100 hover:border-emerald-200';
        case 'en-sala':
            return 'bg-blue-50/40 border-blue-100 hover:border-blue-200 ring-1 ring-blue-50';
        case 'pendiente':
        default:
            return 'bg-white border-slate-100 hover:border-slate-200';
    }
}

function getStatusBadge(status) {
    switch(status) {
        case 'completado':
            return `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <i class="fa-solid fa-circle text-[6px]"></i> Completado
                    </span>`;
        case 'en-sala':
            return `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-dental-blue bg-blue-100 px-2 py-0.5 rounded-full animate-pulse">
                        <i class="fa-solid fa-circle text-[6px]"></i> En Sala
                    </span>`;
        case 'pendiente':
        default:
            return `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <i class="fa-solid fa-circle text-[6px]"></i> Pendiente
                    </span>`;
    }
}

// Filter Appointments Handler
function filterAppointments(filter) {
    currentFilter = filter;
    const filters = ['pendiente', 'en-sala', 'completado'];
    filters.forEach(f => {
        const btn = document.getElementById(`btn-filter-${f}`);
        if (btn) {
            if (f === filter) {
                btn.className = 'px-3 py-1 text-xs font-medium rounded-md bg-dental-teal text-white shadow-sm transition-all';
            } else {
                btn.className = 'px-3 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 transition-all';
            }
        }
    });
    renderAppointments();
}

// Change Appointment Status
async function changeAppStatus(appId, newStatus) {
    if (window.useFirebase) {
        try {
            await window.db.collection('appointments').doc(String(appId)).update({ status: newStatus });
        } catch (err) {
            console.error("Error al actualizar estado en Firebase:", err);
        }
        return;
    }

    const index = appointments.findIndex(app => app.id === appId);
    if (index !== -1) {
        appointments[index].status = newStatus;
        try {
            await fetch(`/api/appointments/${appId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (err) {
            console.warn("API offline. Estado guardado localmente.");
            saveLocalState();
        }
        renderAppointments();
        updateCounters();
    }
}

// Delete Appointment
async function deleteAppointment(appId) {
    if (!confirm("¿Está seguro de que desea eliminar esta cita de la agenda?")) return;
    
    if (window.useFirebase) {
        try {
            await window.db.collection('appointments').doc(String(appId)).delete();
        } catch (err) {
            console.error("Error al eliminar cita en Firebase:", err);
        }
        return;
    }

    appointments = appointments.filter(app => app.id !== appId);
    try {
        await fetch(`/api/appointments/${appId}`, {
            method: 'DELETE'
        });
    } catch (err) {
        console.warn("API offline. Cita eliminada localmente.");
        saveLocalState();
    }
    renderAppointments();
    updateCounters();
}

// Start polling for updates (every 2 seconds)
async function startPolling() {
    setInterval(async () => {
        try {
            const appRes = await fetch('/api/appointments');
            if (appRes.ok) {
                const newAppointments = await appRes.json();
                checkForCitaNotifications(newAppointments);
                
                // Compare and update if different
                if (JSON.stringify(appointments) !== JSON.stringify(newAppointments)) {
                    appointments = newAppointments;
                    sortAppointments();
                    renderAppointments();
                    updateCounters();
                }
            }

            const taskRes = await fetch('/api/tasks');
            if (taskRes.ok) {
                const newTasks = await taskRes.json();
                if (JSON.stringify(tasks) !== JSON.stringify(newTasks)) {
                    tasks = newTasks;
                    renderTasks();
                    updateCounters();
                }
            }
        } catch (err) {
            console.warn("Error de sincronización en tiempo real:", err);
        }
    }, 2000);
}

// Compare old and new appointments list to trigger notifications
function checkForCitaNotifications(newAppointments) {
    if (isFirstLoad) return;

    newAppointments.forEach(newApp => {
        const oldApp = appointments.find(a => a.id === newApp.id);
        
        if (!oldApp) {
            // New appointment
            showDesktopNotification(
                "Nueva cita programada",
                `Paciente ${newApp.patient} agendado a las ${newApp.time}.`
            );
        } else {
            // Status changed to "en-sala"
            if (newApp.status === 'en-sala' && oldApp.status !== 'en-sala' && !notifiedEnSala.has(newApp.id)) {
                showDesktopNotification(
                    "Paciente en sala de espera",
                    `El paciente ${newApp.patient} ha ingresado a la sala de espera.`
                );
                notifiedEnSala.add(newApp.id);
            }
        }
    });

    // Clean up notified set for deleted appointments
    notifiedEnSala.forEach(id => {
        if (!newAppointments.some(a => a.id === id)) {
            notifiedEnSala.delete(id);
        }
    });
}

// Render Operative Tasks Checklist
function renderTasks() {
    const container = document.getElementById('tasks-container');
    const completedContainer = document.getElementById('completed-tasks-container');
    const emptyState = document.getElementById('tasks-empty-state');
    const completedWrapper = document.getElementById('completed-tasks-wrapper');
    const completedCountBadge = document.getElementById('completed-tasks-count');

    container.innerHTML = '';
    completedContainer.innerHTML = '';

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    // Update completed count badge
    if (completedCountBadge) {
        completedCountBadge.textContent = completedTasks.length;
    }

    // Toggle completed accordion visibility
    if (completedWrapper) {
        if (completedTasks.length === 0) {
            completedWrapper.classList.add('hidden');
        } else {
            completedWrapper.classList.remove('hidden');
        }
    }

    if (pendingTasks.length === 0 && completedTasks.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    // Render Pending Tasks
    if (pendingTasks.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <p class="text-xs">No hay tareas pendientes.</p>
            </div>
        `;
    } else {
        pendingTasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'flex items-start justify-between p-3 rounded-xl border border-slate-100 transition-all bg-white hover:border-slate-200';

            item.innerHTML = `
                <div class="flex items-start gap-3 flex-1">
                    <button onclick="toggleTask(${task.id})" class="mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all border-slate-300 hover:border-dental-teal bg-white">
                    </button>
                    <span class="text-sm text-slate-700 leading-tight">
                        ${task.text}
                    </span>
                </div>
                <button onclick="deleteTask(${task.id})" class="text-slate-400 hover:text-dental-coral p-1 ml-2 transition-colors">
                    <i class="fa-regular fa-trash-can text-xs"></i>
                </button>
            `;
            container.appendChild(item);
        });
    }

    // Render Completed Tasks
    completedTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'flex items-start justify-between p-3 rounded-xl border border-slate-200/50 transition-all bg-emerald-50/40 opacity-75';

        item.innerHTML = `
            <div class="flex items-start gap-3 flex-1">
                <button onclick="toggleTask(${task.id})" class="mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all bg-emerald-600 border-emerald-600 text-white">
                    <i class="fa-solid fa-check text-[10px]"></i>
                </button>
                <span class="text-sm text-slate-500 leading-tight line-through">
                    ${task.text}
                </span>
            </div>
            <button onclick="deleteTask(${task.id})" class="text-slate-400 hover:text-dental-coral p-1 ml-2 transition-colors">
                <i class="fa-regular fa-trash-can text-xs"></i>
            </button>
        `;
        completedContainer.appendChild(item);
    });
}

// Add New Task
async function addTask(event) {
    event.preventDefault();
    const input = document.getElementById('new-task-input');
    const text = input.value.trim();
    if (!text) return;

    const newTask = {
        text: text,
        completed: false
    };

    input.value = '';

    if (window.useFirebase) {
        try {
            await window.db.collection('tasks').add(newTask);
        } catch (err) {
            console.error("Error al guardar tarea en Firebase:", err);
        }
        return;
    }

    newTask.id = Date.now();
    tasks.push(newTask);
    
    try {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
        });
        if (res.ok) {
            const saved = await res.json();
            newTask.id = saved.id;
        }
    } catch (err) {
        console.warn("API offline. Tarea guardada localmente.");
        saveLocalState();
    }
    
    renderTasks();
    updateCounters();
}

// Toggle Task Status
async function toggleTask(taskId) {
    const index = tasks.findIndex(task => task.id === taskId);
    if (index !== -1) {
        const targetCompleted = !tasks[index].completed;
        
        if (window.useFirebase) {
            try {
                await window.db.collection('tasks').doc(String(taskId)).update({ completed: targetCompleted });
            } catch (err) {
                console.error("Error al actualizar tarea en Firebase:", err);
            }
            return;
        }

        tasks[index].completed = targetCompleted;
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: tasks[index].completed })
            });
        } catch (err) {
            console.warn("API offline. Cambio guardado localmente.");
            saveLocalState();
        }
        renderTasks();
        updateCounters();
    }
}

// Delete Task
async function deleteTask(taskId) {
    if (window.useFirebase) {
        try {
            await window.db.collection('tasks').doc(String(taskId)).delete();
        } catch (err) {
            console.error("Error al eliminar tarea en Firebase:", err);
        }
        return;
    }

    tasks = tasks.filter(task => task.id !== taskId);
    try {
        await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
    } catch (err) {
        console.warn("API offline. Tarea eliminada localmente.");
        saveLocalState();
    }
    renderTasks();
    updateCounters();
}

// Update Counters
function updateCounters() {
    document.getElementById('appointment-count').textContent = appointments.length;
    const pendingTasks = tasks.filter(task => !task.completed).length;
    document.getElementById('pending-tasks-count').textContent = pendingTasks;
}
