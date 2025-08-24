# dnd-spell-cards-app/backend/app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import datetime
import oracledb # Import the Oracle DB driver

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": "*"}})
# --- Oracle DB Connection Configuration ---
# IMPORTANT: UPDATE THESE VALUES WITH YOUR SPECIFIC ATP DETAILS!
# Path to the directory containing your unzipped wallet files on the VM
WALLET_DIR = "/home/opc/spell_card_app/Wallet"
os.environ['TNS_ADMIN'] = WALLET_DIR
# Path to the directory where the Oracle Instant Client libraries (e.g., libclntsh.so) are located.
# REPLACE THIS WITH THE ACTUAL PATH YOU FOUND IN STEP 2!
ORACLE_CLIENT_LIB_DIR = "/usr/lib/oracle/19.28/client64/lib" 

# The service name from tnsnames.ora file inside the wallet.

DB_SERVICE_NAME = "g2mrxqwa818lwbj4_high"

# Your Autonomous Database ADMIN username and password
DB_USERNAME = "ELDRIC"
DB_PASSWORD = "StupidGame69"
# --- Firestore Collection Names (No longer used, but keeping for reference if you switch) ---
# CARDS_COLLECTION = 'available_spell_cards'
# PLAYER_DECK_COLLECTION = 'player_decks'
# --- AGGRESSIVE DEBUGGING PRINTS ---
print("\n--- Python Backend DB Config Debug ---")
print(f"1. WALLET_DIR = '{WALLET_DIR}'")
print(f"2. os.environ['TNS_ADMIN'] = '{os.environ.get('TNS_ADMIN')}'")
print(f"3. ORACLE_CLIENT_LIB_DIR = '{ORACLE_CLIENT_LIB_DIR}'")
print(f"4. DB_SERVICE_NAME = '{DB_SERVICE_NAME}'")
print(f"5. DB_USERNAME = '{DB_USERNAME}'")

# Check if wallet files exist and are readable by Python
tnsnames_path = os.path.join(WALLET_DIR, 'tnsnames.ora')
sqlnet_path = os.path.join(WALLET_DIR, 'sqlnet.ora')
cwallet_path = os.path.join(WALLET_DIR, 'cwallet.sso')

print(f"6. tnsnames.ora exists: {os.path.exists(tnsnames_path)}")
print(f"7. sqlnet.ora exists: {os.path.exists(sqlnet_path)}")
print(f"8. cwallet.sso exists: {os.path.exists(cwallet_path)}")

# Try to read contents of sqlnet.ora if it exists
if os.path.exists(sqlnet_path):
    try:
        with open(sqlnet_path, 'r') as f:
            sqlnet_contents = f.read()
        print(f"9. sqlnet.ora contents (first 200 chars): {sqlnet_contents[:200]}...")
    except Exception as e:
        print(f"9. Could not read sqlnet.ora: {e}")
else:
    print("9. sqlnet.ora not found for content check.")

print("--------------------------------------\n")

# --- Initial Card Data (Used to populate Oracle DB ONCE) ---
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

# --- Initialize Oracle DB Connection Pool (recommended for Flask) ---
# This ensures your app can efficiently connect to the database.
db_pool = None # Initialize as None, will be set in __main__

def init_db_pool():
    global db_pool
    if db_pool: # If already initialized, just return it
        return db_pool

    print("Initializing Oracle DB connection pool...")
    try:
        # For Instant Client, specify the lib_dir. For a full client, it might be in PATH.
        # Often, the WALLET_DIR is sufficient for lib_dir when using the wallet.
        oracledb.init_oracle_client(lib_dir=ORACLE_CLIENT_LIB_DIR)

        db_pool = oracledb.create_pool(
            user=DB_USERNAME,
            password=DB_PASSWORD,
            dsn=DB_SERVICE_NAME,
            min=2, max=5, increment=1
        )
        print("Oracle DB connection pool initialized successfully.")
        return db_pool
    except oracledb.Error as e:
        error_obj, = e.args
        print(f"ERROR: Could not initialize Oracle DB connection pool: {error_obj.message}")
        raise # Re-raise to prevent app from starting without DB connection

def get_db_connection():
    """Acquires a connection from the pool."""
    if not db_pool:
        raise Exception("Database pool not initialized.")
    return db_pool.acquire()

# --- One-time Oracle DB population for CARDS table ---
def populate_oracle_cards_once():
    """
    Populates the CARDS table in Oracle DB with DEFAULT_CARDS if it's empty.
    This function should typically be run ONCE.
    """
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM CARDS")
                count = cursor.fetchone()[0]
                if count == 0:
                    print("CARDS table is empty. Populating with default cards...")
                    for card_data in DEFAULT_CARDS:
                        cursor.execute(
                            """INSERT INTO CARDS (id, name, image_filename, description, type, rarity, default_uses_per_rest)
                               VALUES (:id, :name, :image_filename, :description, :type, :rarity, :default_uses_per_rest)""",
                            card_data # Pass dictionary directly for named bind variables
                        )
                    connection.commit()
                    print("Default cards uploaded to CARDS table.")
                else:
                    print("CARDS table already contains data. Skipping population.")
    except oracledb.Error as e:
        error_obj, = e.args
        print(f"ERROR: Could not populate CARDS table: {error_obj.message}")
    except Exception as e:
        print(f"An unexpected error occurred during card population: {e}")

# --- API Endpoints ---

@app.route('/api/cards', methods=['GET'])
def get_all_cards():
    """
    Returns the list of all available spell cards from Oracle DB.
    """
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id, name, image_filename, description, type, rarity, default_uses_per_rest FROM CARDS")
                columns = [col[0].lower() for col in cursor.description] # Get column names and make lowercase
                all_cards = [dict(zip(columns, row)) for row in cursor]
                print(f"[{request.remote_addr}] GET /api/cards - Fetched {len(all_cards)} cards from Oracle DB.")
                return jsonify(all_cards)
    except oracledb.Error as e:
        error_obj, = e.args
        print(f"Error fetching cards from Oracle DB: {error_obj.message}")
        return jsonify({"error": "Failed to fetch cards from database."}), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    """
    A simple endpoint to check if the backend is running.
    """
    print(f"[{request.remote_addr}] GET /api/status - Request received.")
    return jsonify({"status": "Backend is running!", "version": "0.2 (Oracle DB)"})

@app.route('/api/calculate_deck_size', methods=['POST'])
def calculate_deck_size():
    """
    Calculates the maximum deck size based on character level and ability modifiers.
    """
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

# For simplicity, we'll use a hardcoded 'player1' ID for now.
PLAYER_ID = 'player1'

@app.route('/api/deck', methods=['GET'])
def get_player_deck():
    player_id = "player1" # Using a fixed player_id for now
    deck_data = [] # Default to an empty list
    conn = None
    cursor = None
    try:
        conn = db_pool.acquire()
        cursor = conn.cursor()

        # --- DEBUG LOG: Before fetching from DB ---
        print(f"[{request.remote_addr}] GET /api/deck - Attempting to load deck for player: {player_id}")

        cursor.execute("SELECT deck_json FROM PLAYER_DECKS WHERE player_id = :player_id", [player_id])
        row = cursor.fetchone()

        if row:
            # --- DEBUG LOG: Row found, check CLOB data ---
            print(f"[{request.remote_addr}] GET /api/deck - Row found for player {player_id}. CLOB data type: {type(row[0])}")

            # Ensure it's a string, even if it's a CLOB
            # Using str() for simpler types, .read() for actual CLOB objects
            deck_json_str = row[0].read() if hasattr(row[0], 'read') else str(row[0])
            
            # --- DEBUG LOG: After reading CLOB, before JSON parsing ---
            print(f"[{request.remote_addr}] GET /api/deck - Raw deck_json_str from DB: {deck_json_str[:200]}...") # Print first 200 chars

            if deck_json_str:
                deck_data = json.loads(deck_json_str)
                # --- DEBUG LOG: After JSON parsing ---
                print(f"[{request.remote_addr}] GET /api/deck - Successfully parsed deck_data: {len(deck_data)} cards.")
            else:
                # --- DEBUG LOG: Empty CLOB string ---
                print(f"[{request.remote_addr}] GET /api/deck - Retrieved deck_json_str was empty. Returning empty deck.")
        else:
            # --- DEBUG LOG: No row found ---
            print(f"[{request.remote_addr}] GET /api/deck - No deck found for player {player_id} in Oracle DB. Returning empty deck.")

    except Exception as e:
        print(f"[{request.remote_addr}] GET /api/deck - Error loading deck: {e}", flush=True)
        return jsonify({'error': 'Failed to load deck: ' + str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            db_pool.release(conn)
        
    # --- DEBUG LOG: Final data sent to frontend ---
    print(f"[{request.remote_addr}] GET /api/deck - Loaded {len(deck_data)} cards for player {player_id} from Oracle DB.")
    return jsonify(deck_data)



    @app.route('/api/deck', methods=['POST'])
    def save_player_deck():
        player_id = "player1" # Fixed player ID for now
        conn = None
        cursor = None
        try:
            # --- DEBUG LOG: Before getting JSON data ---
            print(f"[{request.remote_addr}] POST /api/deck - Received request to save deck.")
            
            # This extracts the 'cards' list from the incoming JSON payload
            deck_data = request.json.get('cards', [])

            # --- DEBUG LOG: What data was received from the frontend? ---
            print(f"[{request.remote_addr}] POST /api/deck - Received deck data from frontend: {deck_data}")
            
            # Convert the Python list/dict into a JSON string for storing in CLOB
            deck_json_str = json.dumps(deck_data)

            # --- DEBUG LOG: What JSON string is being prepared to save? ---
            print(f"[{request.remote_addr}] POST /api/deck - JSON string to save: {deck_json_str}")

            conn = db_pool.acquire()
            cursor = conn.cursor()

            # Merge statement: inserts if player_id doesn't exist, updates if it does.
            cursor.execute("""
                MERGE INTO PLAYER_DECKS dest
                USING (SELECT :player_id AS player_id FROM DUAL) src
                ON (dest.player_id = src.player_id)
                WHEN MATCHED THEN UPDATE SET dest.deck_json = :deck_json
                WHEN NOT MATCHED THEN INSERT (player_id, deck_json) VALUES (:player_id, :deck_json)
            """, [player_id, deck_json_str])
            conn.commit()

            # --- DEBUG LOG: After commit, what was saved? ---
            print(f"[{request.remote_addr}] POST /api/deck - Saved {len(deck_data)} cards for player {player_id} to Oracle DB.")

            return jsonify({"message": "Deck saved successfully."}), 200

        except Exception as e:
            print(f"[{request.remote_addr}] POST /api/deck - Error saving deck: {e}", flush=True)
            if conn:
                conn.rollback() # Rollback on error
            return jsonify({'error': 'Failed to save deck: ' + str(e)}), 500
        finally:
            if cursor:
                cursor.close()
            if conn:
                db_pool.release(conn)


@app.route('/api/card_used', methods=['POST'])
def card_used():
    """
    Simulates a card being used by logging the event.
    """
    data = request.json
    card_name = data.get('card_name')
    card_type = data.get('card_type')
    deck_card_id = data.get('deck_card_id')

    if not card_name or not card_type or not deck_card_id:
        return jsonify({"message": "Missing card_name, card_type, or deck_card_id"}), 400

    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "event_type": "CARD_PLAYED",
        "card_name": card_name,
        "card_type": card_type,
        "deck_instance_id": deck_card_id,
        "source_ip": request.remote_addr,
        "destination_port": request.environ.get('SERVER_PORT'),
        "protocol": "HTTP/REST",
        "status": "SUCCESS",
        "message": f"DND_SYSTEM: Card '{card_name}' (ID: {deck_card_id}) processed as used."
    }
    print("--- SIMULATED SYSTEM LOG ENTRY ---")
    print(json.dumps(log_entry, indent=2))
    print("----------------------------------")

    return jsonify({"message": f"Card '{card_name}' marked as used.", "log_entry": log_entry})


# --- Server Startup ---
if __name__ == '__main__':
    # Initialize the database pool when the app starts
    init_db_pool()
    # Populate cards table only if needed. Run once, then comment out if you prefer manual control.
    populate_oracle_cards_once()

    print("\nStarting Python Flask backend for Spell Trading Cards App (Oracle DB Integrated)...")
    print("API Endpoints:")
    print("  GET /api/cards - Get all available cards from Oracle DB")
    print("  GET /api/status - Check backend status")
    print("  POST /api/calculate_deck_size - Calculate max deck size")
    print("  GET /api/deck - Get player's active deck from Oracle DB")
    print("  POST /api/deck - Save player's active deck to Oracle DB")
    print("  POST /api/card_used - Mark a card as used (simulates logging)")
    print("---------------------------------------------------------")
    # Run on 0.0.0.0 to make it accessible from outside the VM (e.g., your local React app)
    app.run(host='0.0.0.0', port=5000, debug=True)

