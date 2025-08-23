# dnd-spell-cards-app/backend/app.py

from flask import Flask, jsonify, request # Make sure 'request' is imported!
from flask_cors import CORS
import json
import os # Will use later for JSON file operations, keeping it here

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
    print(f"[{request.remote_addr}] GET /api/cards - Request received.") # Conceptual logging
    return jsonify(example_cards)

@app.route('/api/status', methods=['GET'])
def get_status():
    """
    A simple endpoint to check if the backend is running.
    """
    print(f"[{request.remote_addr}] GET /api/status - Request received.") # Conceptual logging
    return jsonify({"status": "Backend is running!", "version": "0.1"})

# NEW ENDPOINT: Calculate Deck Size
@app.route('/api/calculate_deck_size', methods=['POST'])
def calculate_deck_size():
    """
    Calculates the maximum deck size based on character level and ability modifiers.
    Skill Highlight: Python scripting for business logic, processing input data.
    """
    data = request.json # Get JSON data from the request body
    character_level = data.get('character_level', 0)
    wis_mod = data.get('wis_mod', 0)
    int_mod = data.get('int_mod', 0)
    cha_mod = data.get('cha_mod', 0)

    # Log the incoming request details, simulating network/system monitoring
    print(f"[{request.remote_addr}] POST /api/calculate_deck_size - "
          f"Level: {character_level}, WIS: {wis_mod}, INT: {int_mod}, CHA: {cha_mod}")

    # Deck Creation Formula: {(Character Level / 2) + ((Wis mod + Int mod + Cha mod) / 3)}
    # Use integer division as implied by D&D rules for levels/modifiers
    max_deck_size = int(character_level / 2) + int((wis_mod + int_mod + cha_mod) / 3)
    max_deck_size = max(0, max_deck_size) # Ensure deck size is not negative

    print(f"Calculated max deck size: {max_deck_size}")
    return jsonify({"max_deck_size": max_deck_size})

# --- Server Startup ---
if __name__ == '__main__':
    print("Starting Python Flask backend...")
    print("Available endpoints:")
    print("  GET /api/cards")
    print("  GET /api/status")
    app.run(port=5000, debug=True)
