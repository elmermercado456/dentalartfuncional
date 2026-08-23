const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const DATA_FILE = path.join(__dirname, 'data.json');

// Helper to load data
const loadData = () => {
    if (!fs.existsSync(DATA_FILE)) {
        const defaultData = {
            appointments: [
                {
                    id: 1,
                    time: "08:30 AM",
                    patient: "Carlos Mendoza",
                    treatment: "Profilaxis Dental",
                    status: "completado",
                    notes: "Paciente con ligera sensibilidad en encías."
                },
                {
                    id: 2,
                    time: "10:00 AM",
                    patient: "María Delgado",
                    treatment: "Tratamiento de Endodoncia",
                    status: "en-sala",
                    notes: "Segunda sesión conducto premolar superior."
                },
                {
                    id: 3,
                    time: "11:30 AM",
                    patient: "Andrés Gutiérrez",
                    treatment: "Resina Estética Estructural",
                    status: "pendiente",
                    notes: "Requiere anestesia local."
                },
                {
                    id: 4,
                    time: "02:30 PM",
                    patient: "Sofía Vega",
                    treatment: "Blanqueamiento Led",
                    status: "pendiente",
                    notes: "Tomar fotos de color previo."
                },
                {
                    id: 5,
                    time: "04:30 PM",
                    patient: "Jorge Ramírez",
                    treatment: "Extracción Tercer Molar",
                    status: "pendiente",
                    notes: "Trae radiografía panorámica impresa."
                }
            ],
            tasks: [
                {
                    id: 1,
                    text: "Llamar al laboratorio dental por corona de la Sra. Torres",
                    completed: true
                },
                {
                    id: 2,
                    text: "Hacer pedido mensual de anestesia lidocaína y agujas cortas",
                    completed: false
                },
                {
                    id: 3,
                    text: "Revisar facturación electrónica de la primera quincena",
                    completed: false
                },
                {
                    id: 4,
                    text: "Enviar presupuesto de implantes a Luis Gómez",
                    completed: false
                }
            ]
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 4), 'utf8');
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
};

// Helper to save data
const saveData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4), 'utf8');
};

// API - Appointments
app.get('/api/appointments', (req, res) => {
    const data = loadData();
    res.json(data.appointments);
});

app.post('/api/appointments', (req, res) => {
    const data = loadData();
    const newApp = {
        id: req.body.id || Math.floor(Math.random() * 1000000),
        time: req.body.time,
        patient: req.body.patient,
        treatment: req.body.treatment,
        status: req.body.status || 'pendiente',
        notes: req.body.notes || ''
    };
    data.appointments.push(newApp);
    saveData(data);
    res.status(201).json(newApp);
});

app.put('/api/appointments/:id', (req, res) => {
    const data = loadData();
    const appId = parseInt(req.params.id);
    const index = data.appointments.findIndex(a => a.id === appId);
    if (index !== -1) {
        data.appointments[index] = { ...data.appointments[index], ...req.body };
        saveData(data);
        return res.json(data.appointments[index]);
    }
    res.status(404).json({ error: "Appointment not found" });
});

app.delete('/api/appointments/:id', (req, res) => {
    const data = loadData();
    const appId = parseInt(req.params.id);
    const initialLen = data.appointments.length;
    data.appointments = data.appointments.filter(a => a.id !== appId);
    if (data.appointments.length < initialLen) {
        saveData(data);
        return res.json({ success: true });
    }
    res.status(404).json({ error: "Appointment not found" });
});

// API - Tasks
app.get('/api/tasks', (req, res) => {
    const data = loadData();
    res.json(data.tasks);
});

app.post('/api/tasks', (req, res) => {
    const data = loadData();
    const newTask = {
        id: req.body.id || Math.floor(Math.random() * 1000000),
        text: req.body.text,
        completed: req.body.completed || false
    };
    data.tasks.push(newTask);
    saveData(data);
    res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
    const data = loadData();
    const taskId = parseInt(req.params.id);
    const index = data.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        data.tasks[index] = { ...data.tasks[index], ...req.body };
        saveData(data);
        return res.json(data.tasks[index]);
    }
    res.status(404).json({ error: "Task not found" });
});

app.delete('/api/tasks/:id', (req, res) => {
    const data = loadData();
    const taskId = parseInt(req.params.id);
    const initialLen = data.tasks.length;
    data.tasks = data.tasks.filter(t => t.id !== taskId);
    if (data.tasks.length < initialLen) {
        saveData(data);
        return res.json({ success: true });
    }
    res.status(404).json({ error: "Task not found" });
});

// Route fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Servidor Node.js corriendo en http://localhost:${PORT}`);
    console.log(`📂 Sirviendo desde la carpeta actual`);
    console.log(`==================================================\n`);
});
