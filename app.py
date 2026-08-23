import os
import json
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='.')

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')

# Helper to load data
def load_data():
    if not os.path.exists(DATA_FILE):
        default_data = {
            "appointments": [
                {
                    "id": 1,
                    "time": "08:30 AM",
                    "patient": "Carlos Mendoza",
                    "treatment": "Profilaxis Dental",
                    "status": "completado",
                    "notes": "Paciente con ligera sensibilidad en encías."
                },
                {
                    "id": 2,
                    "time": "10:00 AM",
                    "patient": "María Delgado",
                    "treatment": "Tratamiento de Endodoncia",
                    "status": "en-sala",
                    "notes": "Segunda sesión conducto premolar superior."
                },
                {
                    "id": 3,
                    "time": "11:30 AM",
                    "patient": "Andrés Gutiérrez",
                    "treatment": "Resina Estética Estructural",
                    "status": "pendiente",
                    "notes": "Requiere anestesia local."
                },
                {
                    "id": 4,
                    "time": "02:30 PM",
                    "patient": "Sofía Vega",
                    "treatment": "Blanqueamiento Led",
                    "status": "pendiente",
                    "notes": "Tomar fotos de color previo."
                },
                {
                    "id": 5,
                    "time": "04:30 PM",
                    "patient": "Jorge Ramírez",
                    "treatment": "Extracción Tercer Molar",
                    "status": "pendiente",
                    "notes": "Trae radiografía panorámica impresa."
                }
            ],
            "tasks": [
                {
                    "id": 1,
                    "text": "Llamar al laboratorio dental por corona de la Sra. Torres",
                    "completed": True
                },
                {
                    "id": 2,
                    "text": "Hacer pedido mensual de anestesia lidocaína y agujas cortas",
                    "completed": False
                },
                {
                    "id": 3,
                    "text": "Revisar facturación electrónica de la primera quincena",
                    "completed": False
                },
                {
                    "id": 4,
                    "text": "Enviar presupuesto de implantes a Luis Gómez",
                    "completed": False
                }
            ]
        }
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, ensure_ascii=False, indent=4)
        return default_data
    
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

# Helper to save data
def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# Static Routes
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# API - Appointments
@app.route('/api/appointments', methods=['GET'])
def get_appointments():
    data = load_data()
    return jsonify(data['appointments'])

@app.route('/api/appointments', methods=['POST'])
def add_appointment():
    data = load_data()
    req_data = request.json
    new_app = {
        "id": req_data.get("id", int(os.urandom(4).hex(), 16)),
        "time": req_data.get("time"),
        "patient": req_data.get("patient"),
        "treatment": req_data.get("treatment"),
        "status": req_data.get("status", "pendiente"),
        "notes": req_data.get("notes", "")
    }
    data['appointments'].append(new_app)
    save_data(data)
    return jsonify(new_app), 201

@app.route('/api/appointments/<int:app_id>', methods=['PUT'])
def update_appointment(app_id):
    data = load_data()
    req_data = request.json
    found = False
    for appt in data['appointments']:
        if appt['id'] == app_id:
            appt['status'] = req_data.get('status', appt['status'])
            appt['time'] = req_data.get('time', appt['time'])
            appt['patient'] = req_data.get('patient', appt['patient'])
            appt['treatment'] = req_data.get('treatment', appt['treatment'])
            appt['notes'] = req_data.get('notes', appt['notes'])
            found = True
            return jsonify(appt)
    if not found:
        return jsonify({"error": "Appointment not found"}), 404

@app.route('/api/appointments/<int:app_id>', methods=['DELETE'])
def delete_appointment(app_id):
    data = load_data()
    initial_len = len(data['appointments'])
    data['appointments'] = [a for a in data['appointments'] if a['id'] != app_id]
    if len(data['appointments']) < initial_len:
        save_data(data)
        return jsonify({"success": True})
    return jsonify({"error": "Appointment not found"}), 404

# API - Tasks
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    data = load_data()
    return jsonify(data['tasks'])

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = load_data()
    req_data = request.json
    new_task = {
        "id": req_data.get("id", int(os.urandom(4).hex(), 16)),
        "text": req_data.get("text"),
        "completed": req_data.get("completed", False)
    }
    data['tasks'].append(new_task)
    save_data(data)
    return jsonify(new_task), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = load_data()
    req_data = request.json
    for task in data['tasks']:
        if task['id'] == task_id:
            task['completed'] = req_data.get('completed', task['completed'])
            task['text'] = req_data.get('text', task['text'])
            save_data(data)
            return jsonify(task)
    return jsonify({"error": "Task not found"}), 404

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    data = load_data()
    initial_len = len(data['tasks'])
    data['tasks'] = [t for t in data['tasks'] if t['id'] != task_id]
    if len(data['tasks']) < initial_len:
        save_data(data)
        return jsonify({"success": True})
    return jsonify({"error": "Task not found"}), 404

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 5000))
    print(f"\n==================================================")
    print(f"🚀 Servidor Flask corriendo en http://localhost:{PORT}")
    print(f"📂 Sirviendo desde la carpeta actual")
    print(f"==================================================\n")
    app.run(host='0.0.0.0', port=PORT, debug=True)
