# dnd-spell-cards-app/backend/app.py

from flask import Flask, jsonify, request # Add 'request' here!
from flask_cors import CORS # Will need to install this

app = Flask(__name__)
CORS(app) # Enable CORS for communication with React frontend

# --- Placeholder Data (will replace with JSON file later) ---
example_cards = [
    {"id": "c001", "name": "Minor Illusion", "type": "Cantrip", "rarity":"Common"},
    {"id": "l001", "name": "Magic Missile", "type": "Leveled Spell", "rarity":"Uncommon"},
]

# --- API Endpoints ---
@app.route('/api/cards', methods=['GET'])
def get_all_cards():
    """
    Returns the list of all available spell cards.
    """
    print(f"GET /api/cards - Request received from {request.remote_addr}") # Conceptual logging
    return jsonify(example_cards)

@app.route('/api/status', methods=['GET'])
def get_status():
    """
    A simple endpoint to check if the backend is running.
    """
    print(f"GET /api/status - Request received from {request.remote_addr}") # Conceptual logging
    return jsonify({"status": "Backend is running!", "version": "0.1"})

# --- Server Startup ---
if __name__ == '__main__':
    print("Starting Python Flask backend...")
    print("Available endpoints:")
    print("  GET /api/cards")
    print("  GET /api/status")
    app.run(port=5000, debug=True)
