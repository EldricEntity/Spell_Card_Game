from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import datetime # Import datetime for accurate timestamps in logs

app = Flask(__name__)
CORS(app) # Enable CORS for communication with React frontend

# --- Data Storage (using a JSON file for simplicity in prototype) ---
DATA_FILE = 'cards.json'

def load_data(file_path, default_data):
    """Loads data from a JSON file, or returns default data if file doesn't exist."""
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            return json.load(f)
    return default_data

def save_data(file_path, data):
    """Saves data to a JSON file."""
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

# --- Consolidated & Comprehensive Card Data ---
# This list now contains all 7 cards and will be used to populate cards.json
DEFAULT_CARDS = [
    {
        "id": "c001",
        "name": "Minor Illusion",
        "image_filename": "minor_illusion.png",
        "description": "Creates a sound or an image of an object within range.",
        "type": "Cantrip",
        "rarity": "Common",
        "default_uses_per_rest": 2
    },
    {
        "id": "c002",
        "name": "Fire Bolt",
        "image_filename": "fire_bolt.png",
        "description": "Hurl a mote of fire at a creature or object.",
        "type": "Cantrip",
        "rarity": "Common",
        "default_uses_per_rest": 2
    },
    {
        "id": "l001",
        "name": "Magic Missile",
        "image_filename": "magic_missile.png",
        "description": "Three glowing darts of magical force unerringly strike targets.",
        "type": "Leveled Spell",
        "rarity": "Common",
        "default_uses_per_rest": 1
    },
    {
        "id": "l002",
        "name": "Shield",
        "image_filename": "shield.png",
        "description": "An invisible barrier of magical force appears and protects you.",
        "type": "Leveled Spell",
        "rarity": "Uncommon",
        "default_uses_per_rest": 1
    },
    {
        "id": "l003",
        "name": "Misty Step",
        "image_filename": "misty_step.png",
        "description": "Teleport up to 30 feet to an unoccupied space you can see.",
        "type": "Leveled Spell",
        "rarity": "Rare",
        "default_uses_per_rest": 1
    },
    {
        "id": "l004",
        "name": "Fireball",
        "image_filename": "fireball.png",
        "description": "A bright streak flashes from your finger to a point you choose, then blossoms into an explosion of flame.",
        "type": "Leveled Spell",
        "rarity": "Rare",
        "default_uses_per_rest": 1
    },
    {
        "id": "l005",
        "name": "Wish",
        "image_filename": "wish.png",
        "description": "Grant the caster's deepest desires, but at a great personal cost.",
        "type": "Leveled Spell",
        "rarity": "Legendary",
        "default_uses_per_rest": 1
    }
]

# Ensure data file exists or create it with defaults
# This will create cards.json in your backend folder with ALL the DEFAULT_CARDS
if not os.path.exists(DATA_FILE):
    save_data(DATA_FILE, DEFAULT_CARDS)

# Load current data at app startup
cards_data = load_data(DATA_FILE, DEFAULT_CARDS)


# --- API Endpoints ---

@app.route('/api/cards', methods=['GET'])
def get_all_cards():
    """
    Returns the list of all available spell cards. Reads from cards.json.
    """
    print(f"[{request.remote_addr}] GET /api/cards - Request received.") # Conceptual logging
    return jsonify(cards_data) # Ensure this returns the loaded data, not a hardcoded list

@app.route('/api/status', methods=['GET'])
def get_status():
    """
    A simple endpoint to check if the backend is running.
    """
    print(f"[{request.remote_addr}] GET /api/status - Request received.") # Conceptual logging
    return jsonify({"status": "Backend is running!", "version": "0.1"})

# NEW ENDPOINT: Calculate Deck Size (already present in your code, just included for completeness)
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

    # Your Deck Creation Formula: {(Character Level / 2) + ((Wis mod + Int mod + Cha mod) / 3)}
    max_deck_size = int(character_level / 2) + int((wis_mod + int_mod + cha_mod) / 3)
    max_deck_size = max(0, max_deck_size) # Ensure deck size is not negative

    print(f"Calculated max deck size: {max_deck_size}")
    return jsonify({"max_deck_size": max_deck_size})

# NEW ENDPOINT: Card Used
@app.route('/api/card_used', methods=['POST'])
def card_used():
    """
    Simulates a card being used by logging the event. No external resource pools.
    Skill Highlight: Processing state changes, detailed logging of "system events".
    """
    data = request.json
    card_name = data.get('card_name')
    card_type = data.get('card_type')
    deck_card_id = data.get('deck_card_id') # A unique ID for this instance in the deck

    if not card_name or not card_type or not deck_card_id:
        return jsonify({"message": "Missing card_name, card_type, or deck_card_id"}), 400

    # This is a key part for showing networking/datacenter tech skills:
    # Generate a detailed log entry, conceptually mimicking network or server event logs.
    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(), # Use datetime for accurate timestamp
        "event_type": "CARD_PLAYED",
        "card_name": card_name,
        "card_type": card_type,
        "deck_instance_id": deck_card_id,
        "source_ip": request.remote_addr, # Simulate source IP from the client
        "destination_port": request.environ.get('SERVER_PORT'), # Simulate backend port
        "protocol": "HTTP/REST",
        "status": "SUCCESS",
        "message": f"DND_SYSTEM: Card '{card_name}' (ID: {deck_card_id}) processed as used."
    }
    print("--- SIMULATED SYSTEM LOG ENTRY ---")
    print(json.dumps(log_entry, indent=2))
    print("----------------------------------")

    # In a full app, you'd save this log to a file or database.
    return jsonify({"message": f"Card '{card_name}' marked as used.", "log_entry": log_entry})


# --- Server Startup ---
if __name__ == '__main__':
    print("Starting Python Flask backend for Spell Trading Cards App...")
    print("API Endpoints:")
    print("  GET /api/cards - Get all available cards")
    print("  GET /api/status - Check backend status")
    print("  POST /api/calculate_deck_size - Calculate max deck size")
    print("  POST /api/card_used - Mark a card as used (simulates logging)")
    print("---------------------------------------------------------")
    app.run(port=5000, debug=True)

