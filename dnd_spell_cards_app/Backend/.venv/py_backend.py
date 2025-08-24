from flask import Flask, jsonify, request
from flask_cors import CORS
import datetime

import pandas as pd
import hashlib
import os
import json

def hash_row(row):
    """Generates a SHA-256 hash for a given DataFrame row."""
    row_string = str(row.to_dict()).encode('utf-8')
    return hashlib.sha256(row_string).hexdigest()

def generate_and_save_cards(input_file, output_file):
    """Reads spreadsheet, adds hashes, and saves to a JSON file."""
    if not os.path.exists(input_file):
        print(f"Error: The input file '{input_file}' was not found.")
        return

    print(f"Processing data from '{input_file}'...")
    
    # Read the spreadsheet data
    df = pd.read_csv(input_file)
    
    # Add a unique hash to each row and rename the column to 'id'
    df['id'] = df.apply(hash_row, axis=1) # Renamed to 'id' here
    
    # Convert the DataFrame to a list of dictionaries and save as JSON
    df.to_json(output_file, orient='records', indent=0)
    
    print(f"Successfully generated and saved card data to '{output_file}'.")

if __name__ == '__main__':
    generate_and_save_cards('Spell Trading Card Data.csv', 'cards.json')
app = Flask(__name__)
CORS(app)

# --- Data Loading (from the pre-generated JSON file) ---
DATA_FILE = 'cards.json'

def load_data(file_path):
    """Loads data from a JSON file."""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: {file_path} not found. Please run 'generate_cards_data.py' first.")
        return [] # Return an empty list if the file is missing

# Load current data at app startup
cards_data = load_data(DATA_FILE)

# --- API Endpoints ---

@app.route('/api/cards', methods=['GET'])
def get_all_cards():
    """Returns the list of all available spell cards. Reads from cards.json."""
    print(f"[{request.remote_addr}] GET /api/cards - Request received.")
    return jsonify(cards_data)

@app.route('/api/status', methods=['GET'])
def get_status():
    """A simple endpoint to check if the backend is running."""
    print(f"[{request.remote_addr}] GET /api/status - Request received.")
    return jsonify({"status": "Backend is running!", "version": "0.1"})

@app.route('/api/calculate_deck_size', methods=['POST'])
def calculate_deck_size():
    """Calculates the maximum deck size."""
    data = request.json
    character_level = data.get('character_level', 0)
    wis_mod = data.get('wis_mod', 0)
    int_mod = data.get('int_mod', 0)
    cha_mod = data.get('cha_mod', 0)

    print(f"[{request.remote_addr}] POST /api/calculate_deck_size - "
          f"Level: {character_level}, WIS: {wis_mod}, INT: {int_mod}, CHA: {cha_mod}")

    max_deck_size = int(character_level / 2) + int((wis_mod + int_mod + cha_mod) / 3)
    max_deck_size = max(0, max_deck_size)

    print(f"Calculated max deck size: {max_deck_size}")
    return jsonify({"max_deck_size": max_deck_size})

@app.route('/api/card_used', methods=['POST'])
def card_used():
    """Simulates a card being used by logging the event."""
    data = request.json
    card_name = data.get('card_name')
    card_type = data.get('card_type')
    deck_card_id = data.get('deck_card_id')

    if not all([card_name, card_type, deck_card_id]):
        return jsonify({"message": "Missing required data"}), 400

    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "event_type": "CARD_PLAYED",
        "card_name": card_name,
        "card_type": card_type,
        "deck_instance_id": deck_card_id,
        "source_ip": request.remote_addr,
        "protocol": "HTTP/REST",
        "status": "SUCCESS",
        "message": f"DND_SYSTEM: Card '{card_name}' (ID: {deck_card_id}) processed as used."
    }
    print("--- SIMULATED SYSTEM LOG ENTRY ---")
    print(json.dumps(log_entry, indent=0))
    print("----------------------------------")

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