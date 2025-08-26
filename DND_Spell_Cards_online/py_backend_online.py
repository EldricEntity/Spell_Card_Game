# dnd-spell-cards-app/backend/app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import datetime
import oracledb
import contextlib
import pandas as pd  # NEW: Import for CSV handling
import hashlib  # NEW: Import for hash_row function

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": "*"}})

# --- Oracle DB Connection Configuration ---
WALLET_DIR = "/home/opc/spell_card_app/Wallet"
os.environ['TNS_ADMIN'] = WALLET_DIR

DB_SERVICE_NAME = "g2mrxqwa818lwbj4_high"
DB_USERNAME = "ELDRIC"
DB_PASSWORD = "StupidGame69"

# --- CSV File Configuration (from collaborator's work) ---
# IMPORTANT: Place your CSV file on the VM, e.g., in the project root.
# Make sure the file exists at this path!
CSV_FILE_PATH = '/home/opc/spell_card_app/Spell Trading Card Data.csv'  # Explicitly set the provided path

# --- AGGRESSIVE DEBUGGING PRINTS ---
print("\n--- Python Backend DB Config Debug ---")
print(f"1. WALLET_DIR = '{WALLET_DIR}'")
print(f"2. os.environ['TNS_ADMIN'] = '{os.environ.get('TNS_ADMIN')}'")
print(f"3. CSV_FILE_PATH = '{CSV_FILE_PATH}'")  # Updated debug print for CSV path
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

# --- Initial Card Data (Used to populate Oracle DB ONCE if CSV fails) ---
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


# --- Collaborator's hash_row function ---
def hash_row(row):
    """Generates a SHA-256 hash for a given DataFrame row.
    Used to create unique 'id' for cards from the spreadsheet."""
    row_string = str(row.to_dict()).encode('utf-8')
    return hashlib.sha256(row_string).hexdigest()


# --- CSV Card Fetcher Function (adapted from collaborator's logic) ---
def fetch_cards_from_csv():
    print(f"Attempting to fetch cards from CSV file: {CSV_FILE_PATH}", flush=True)
    try:
        if not os.path.exists(CSV_FILE_PATH):
            print(f"ERROR: CSV file not found at {CSV_FILE_PATH}", flush=True)
            return None

        # Read the spreadsheet data (CSV)
        df = pd.read_csv(CSV_FILE_PATH)

        # Add a unique hash to each row and rename the column to 'id'
        # This mirrors collaborator's approach for generating IDs
        # Ensure 'id' column from CSV is kept or overwritten if needed for consistency.
        # For this setup, we'll let hash_row generate a new ID, ensuring uniqueness.
        df['id'] = df.apply(hash_row, axis=1)

        # Convert DataFrame to a list of dictionaries (JSON-like format)
        csv_cards = df.to_dict(orient='records')

        # Validate and format the data
        validated_cards = []
        for row in csv_cards:
            try:
                # Ensure all expected fields are present and correctly typed
                card = {
                    "id": str(row['id']),
                    "name": str(row['name']),
                    "image_filename": str(row['image_filename']),
                    "description": str(row['description']),
                    "type": str(row['type']),
                    "rarity": str(row['rarity']),
                    "default_uses_per_rest": int(float(row['default_uses_per_rest']))
                    # Convert to float first to handle potential decimals from CSV, then to int
                }
                validated_cards.append(card)
            except KeyError as ke:
                print(f"WARNING: Skipping row due to missing key in CSV file: {ke} in row {row}", flush=True)
            except ValueError as ve:
                print(f"WARNING: Skipping row due to invalid value type in CSV file: {ve} in row {row}", flush=True)
            except Exception as e:
                print(f"WARNING: Skipping row due to unexpected error in CSV file: {e} in row {row}", flush=True)

        print(f"Successfully fetched {len(validated_cards)} cards from CSV file.", flush=True)
        return validated_cards

    except Exception as e:
        print(f"ERROR: Failed to fetch cards from CSV file: {e}", flush=True)
        return None


# --- Initialize Oracle DB Connection Pool (recommended for Flask) ---
db_pool = None  # Initialize as None globally


def init_db_pool():
    global db_pool
    if db_pool is not None:
        print("Oracle DB connection pool already initialized.", flush=True)
        return

    print("Initializing Oracle DB connection pool...", flush=True)
    try:
        # DEBUG: Confirm oracledb version and path just before create_pool
        print(f"DEBUG: oracledb module path (before create_pool): {oracledb.__file__}", flush=True)
        print(
            f"DEBUG: oracledb version loaded (before create_pool): {oracledb.__version__ if hasattr(oracledb, '__version__') else 'N/A'}",
            flush=True)

        # Thin mode connection without explicit encoding/nencoding, as the driver is always UTF-8.
        db_pool = oracledb.create_pool(
            user=DB_USERNAME,
            password=DB_PASSWORD,
            dsn=DB_SERVICE_NAME,
            min=2, max=5, increment=1,
            config_dir=WALLET_DIR  # Pass the wallet directory to the thin client
        )
        print("Oracle DB connection pool initialized successfully.", flush=True)

        # --- Initial table check and population ---
        conn = db_pool.acquire()
        cursor = conn.cursor()
        try:
            # Check and create CARDS table
            cursor.execute("SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = 'CARDS'")
            table_exists = cursor.fetchone()[0] > 0

            if not table_exists:
                print("CARDS table not found. Creating table and populating with initial data.", flush=True)
                cursor.execute("""
                               CREATE TABLE CARDS
                               (
                                   id                    VARCHAR2(64) PRIMARY KEY, -- ID changed to VARCHAR2(64) to accommodate SHA-256 hash
                                   name                  VARCHAR2(100) NOT NULL,
                                   type                  VARCHAR2(50) NOT NULL,
                                   description           VARCHAR2(500),
                                   rarity                VARCHAR2(50),
                                   default_uses_per_rest NUMBER,
                                   image_filename        VARCHAR2(100)
                               )
                               """)
                conn.commit()  # Commit DDL to make table available
            else:  # If table exists, check ID column size if needed for hashes
                cursor.execute(
                    "SELECT DATA_LENGTH, CHAR_LENGTH FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'CARDS' AND COLUMN_NAME = 'ID'")
                id_col_info = cursor.fetchone()
                if id_col_info and id_col_info[1] < 64:  # Check CHAR_LENGTH for character-based size
                    print(
                        "WARNING: 'ID' column in CARDS table might be too small for SHA-256 hashes. Attempting to modify.",
                        flush=True)
                    try:
                        cursor.execute("ALTER TABLE CARDS MODIFY (id VARCHAR2(64))")
                        conn.commit()  # Commit DDL change
                        print("'ID' column in CARDS table modified to VARCHAR2(64).", flush=True)
                    except oracledb.DatabaseError as e:
                        print(
                            f"ERROR: Failed to modify 'ID' column to VARCHAR2(64): {e}. Please manually adjust column size if issues persist.",
                            flush=True)

            # --- CRITICAL: Fetch cards from CSV file and populate CARDS table ---
            cards_to_insert = fetch_cards_from_csv()
            if cards_to_insert:
                print("Populating CARDS table from CSV file data.", flush=True)
                # Use TRUNCATE TABLE instead of DELETE FROM to avoid ORA-12838
                cursor.execute("TRUNCATE TABLE CARDS")  # TRUNCATE automatically commits

                cursor.executemany("""
                                   INSERT INTO CARDS (id, name, image_filename, description, type, rarity,
                                                      default_uses_per_rest)
                                   VALUES (:id, :name, :image_filename, :description, :type, :rarity,
                                           :default_uses_per_rest)""",
                                   cards_to_insert
                                   )
                conn.commit()  # Commit the new inserts
                print(f"CARDS table populated with {len(cards_to_insert)} cards from CSV file.", flush=True)
            else:
                print(
                    "CSV file fetch failed or returned no cards. Populating/Verifying CARDS table with DEFAULT_CARDS.",
                    flush=True)
                cursor.execute("SELECT COUNT(*) FROM CARDS")
                card_count = cursor.fetchone()[0]
                if card_count == 0:
                    print("CARDS table is empty. Populating with DEFAULT_CARDS.", flush=True)
                    cursor.executemany("""
                                       INSERT INTO CARDS (id, name, image_filename, description, type, rarity,
                                                          default_uses_per_rest)
                                       VALUES (:id, :name, :image_filename, :description, :type, :rarity,
                                               :default_uses_per_rest)""",
                                       DEFAULT_CARDS
                                       )
                    conn.commit()
                    print("CARDS table populated with DEFAULT_CARDS.", flush=True)
                else:
                    print("CARDS table already contains data (not from CSV). Skipping re-population.", flush=True)

            # Check and create PLAYER_DECKS table (now with character stats)
            cursor.execute("SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = 'PLAYER_DECKS'")
            player_decks_table_exists = cursor.fetchone()[0] > 0
            if not player_decks_table_exists:
                print("PLAYER_DECKS table not found. Creating table.", flush=True)
                cursor.execute("""
                               CREATE TABLE PLAYER_DECKS
                               (
                                   player_id       VARCHAR2(100) PRIMARY KEY,
                                   deck_json       CLOB,
                                   character_level NUMBER DEFAULT 1,
                                   wis_mod         NUMBER DEFAULT 0,
                                   int_mod         NUMBER DEFAULT 0,
                                   cha_mod         NUMBER DEFAULT 0
                               )
                               """)
                conn.commit()
                print("PLAYER_DECKS table created with character stats columns.", flush=True)
            else:
                print("PLAYER_DECKS table already exists.", flush=True)
                # Check if new columns exist, and add them if not (for existing tables)
                existing_columns = [col[0] for col in cursor.execute(
                    "SELECT column_name FROM user_tab_columns WHERE table_name = 'PLAYER_DECKS'").fetchall()]

                if 'CHARACTER_LEVEL' not in existing_columns:
                    print("Adding CHARACTER_LEVEL column to PLAYER_DECKS.", flush=True)
                    cursor.execute("ALTER TABLE PLAYER_DECKS ADD (character_level NUMBER DEFAULT 1)")
                    conn.commit()
                if 'WIS_MOD' not in existing_columns:
                    print("Adding WIS_MOD column to PLAYER_DECKS.", flush=True)
                    cursor.execute("ALTER TABLE PLAYER_DECKS ADD (wis_mod NUMBER DEFAULT 0)")
                    conn.commit()
                if 'INT_MOD' not in existing_columns:
                    print("Adding INT_MOD column to PLAYER_DECKS.", flush=True)
                    cursor.execute("ALTER TABLE PLAYER_DECKS ADD (int_mod NUMBER DEFAULT 0)")
                    conn.commit()
                if 'CHA_MOD' not in existing_columns:
                    print("Adding CHA_MOD column to PLAYER_DECKS.", flush=True)
                    cursor.execute("ALTER TABLE PLAYER_DECKS ADD (cha_mod NUMBER DEFAULT 0)")
                    conn.commit()
                print("PLAYER_DECKS table schema checked and updated (if necessary).", flush=True)

        finally:
            if cursor:
                cursor.close()
            if conn:
                db_pool.release(conn)

    except oracledb.DatabaseError as e:
        error_obj, = e.args
        if error_obj.code == 942:  # ORA-00942: table or view does not exist
            print(f"Error: Table check failed, likely tables don't exist: {error_obj.message}", flush=True)
        elif error_obj.code == 955:  # ORA-00955: name is already used by an existing object
            print(f"Warning: Table/column already exists. Skipping creation: {error_obj.message}", flush=True)
        else:
            print(f"Oracle DB Error during init: {error_obj.message}", flush=True)
        raise  # Re-raise to prevent app from starting with bad DB connection
    except Exception as e:
        print(f"Failed to initialize Oracle DB connection pool: {e}", flush=True)
        raise


# --- Context manager for getting a connection from the pool ---
@contextlib.contextmanager
def get_db_connection():
    global db_pool
    if db_pool is None:
        raise Exception("Database pool not initialized. Call init_db_pool() first.")
    conn = None
    try:
        conn = db_pool.acquire()
        yield conn
    finally:
        if conn:
            db_pool.release(conn)


# --- Add this 405 Error Handler ---
@app.errorhandler(405)
def method_not_allowed(e):
    print(f"[ERROR HANDLER] Method Not Allowed: {request.method} {request.path}", flush=True)
    print(f"[ERROR HANDLER] Debug info: {e}", flush=True)
    return jsonify(error="Method Not Allowed for this URL.", method=request.method, path=request.path), 405


# -----------------------------------

# --- API Endpoints ---

@app.route('/api/cards', methods=['GET'])
def get_all_cards():
    """
    Returns the list of all available spell cards from Oracle DB (now synced with CSV).
    """
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                print(f"[{request.remote_addr}] GET /api/cards - Attempting to fetch all cards.")

                cursor.execute(
                    "SELECT id, name, image_filename, description, type, rarity, default_uses_per_rest FROM CARDS")
                columns = [col[0].lower() for col in cursor.description]
                all_cards = [dict(zip(columns, row)) for row in cursor]
                print(
                    f"[{request.remote_addr}] GET /api/cards - Fetched {len(all_cards)} cards from Oracle DB. Total: {len(all_cards)}")
                return jsonify(all_cards)
    except oracledb.Error as e:
        error_obj, = e.args
        print(f"Error fetching cards from Oracle DB: {error_obj.message}")
        return jsonify({"error": "Failed to fetch cards from database."}), 500
    except Exception as e:
        print(f"[{request.remote_addr}] GET /api/cards - Unexpected error fetching cards: {e}", flush=True)
        return jsonify({"error": "An unexpected error occurred while fetching cards."}), 500


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

    # Collaborator's code had these caps, re-integrating for consistency
    wis_mod = min(wis_mod, 6)
    int_mod = min(int_mod, 6)
    cha_mod = min(cha_mod, 6)
    character_level = min(character_level, 20)

    max_deck_size = int(character_level / 2) + int((wis_mod + int_mod + cha_mod) / 3)
    max_deck_size = max(0, max_deck_size)

    print(f"Calculated max deck size: {max_deck_size}")
    return jsonify({"max_deck_size": max_deck_size})


# For simplicity, we'll use a hardcoded 'player1' ID for now.
PLAYER_ID = 'player1'


@app.route('/api/deck', methods=['GET'])
def get_player_deck():
    player_id = "player1"  # Using a fixed player_id for now
    deck_data = []  # Default to an empty list
    character_level = 1
    wis_mod = 0
    int_mod = 0
    cha_mod = 0

    print(f"[{request.remote_addr}] GET /api/deck - Attempting to load deck and stats for player: {player_id}")

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                               SELECT deck_json, character_level, wis_mod, int_mod, cha_mod
                               FROM PLAYER_DECKS
                               WHERE player_id = :player_id
                               """, [player_id])
                row = cursor.fetchone()

                if row:
                    deck_json_lob = row[0]  # This will now be an oracledb.LOB object
                    character_level = row[1] if row[1] is not None else 1
                    wis_mod = row[2] if row[2] is not None else 0
                    int_mod = row[3] if row[3] is not None else 0
                    cha_mod = row[4] if row[4] is not None else 0

                    # Explicitly read the LOB object into a string
                    deck_json_str = deck_json_lob.read() if deck_json_lob else "[]"

                    print(
                        f"[{request.remote_addr}] GET /api/deck - Row found for player {player_id}. Raw deck_json_str from DB: {deck_json_str[:200]}..." if deck_json_str else "Raw deck_json_str is empty",
                        flush=True)
                    print(
                        f"[{request.remote_addr}] GET /api/deck - Loaded character stats: Level={character_level}, WIS={wis_mod}, INT={int_mod}, CHA={cha_mod}")

                    if deck_json_str and deck_json_str.strip() != "[]":  # Ensure it's not just an empty JSON array string
                        try:
                            deck_data = json.loads(deck_json_str)
                            print(
                                f"[{request.remote_addr}] GET /api/deck - Successfully parsed deck_data: {len(deck_data)} cards.")
                        except json.JSONDecodeError as json_err:
                            print(
                                f"[{request.remote_addr}] GET /api/deck - JSON decoding error: {json_err}. Raw string: {deck_json_str}",
                                flush=True)
                            deck_data = []  # Reset to empty if JSON is malformed
                    else:
                        print(
                            f"[{request.remote_addr}] GET /api/deck - Retrieved deck_json_str was empty or just '[]'. Returning empty deck.")
                else:
                    print(
                        f"[{request.remote_addr}] GET /api/deck - No deck found for player {player_id} in Oracle DB. Returning empty deck and default stats.")

    except Exception as e:
        print(f"[{request.remote_addr}] GET /api/deck - Error loading deck and stats: {e}", flush=True)
        return jsonify({'error': 'Failed to load deck and stats: ' + str(e)}), 500

    # Return a dictionary containing both deck and character stats
    response_data = {
        'cards': deck_data,
        'character_level': character_level,
        'wis_mod': wis_mod,
        'int_mod': int_mod,
        'cha_mod': cha_mod
    }
    print(
        f"[{request.remote_addr}] GET /api/deck - Loaded {len(deck_data)} cards and stats for player {player_id} from Oracle DB.")
    return jsonify(response_data)


@app.route('/api/deck', methods=['POST'])
def save_player_deck():
    player_id = "player1"  # Fixed player ID for now

    print(f"[{request.remote_addr}] POST /api/deck - Received request to save deck and stats.")

    try:
        payload = request.json
        deck_data = payload.get('cards', [])
        character_level = payload.get('character_level', 1)
        wis_mod = payload.get('wis_mod', 0)
        int_mod = payload.get('int_mod', 0)
        cha_mod = payload.get('cha_mod', 0)

        print(f"[{request.remote_addr}] POST /api/deck - Received deck data from frontend: {deck_data}")
        print(
            f"[{request.remote_addr}] POST /api/deck - Received character stats: Level={character_level}, WIS={wis_mod}, INT={int_mod}, CHA={cha_mod}")

        deck_json_str = json.dumps(deck_data)
        print(f"[{request.remote_addr}] POST /api/deck - JSON string to save: {deck_json_str[:200]}...")

        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                # Explicitly tell oracledb that these bind variables are CLOBs
                cursor.setinputsizes(
                    deck_json_update=oracledb.DB_TYPE_CLOB,
                    deck_json_insert=oracledb.DB_TYPE_CLOB
                )

                cursor.execute("""
                       MERGE INTO PLAYER_DECKS dest
                       USING (SELECT :player_id_src AS player_id FROM DUAL) src
                       ON (dest.player_id = src.player_id)
                       WHEN MATCHED THEN UPDATE SET
                           dest.deck_json = :deck_json_update,
                           dest.character_level = :character_level_update,
                           dest.wis_mod = :wis_mod_update,
                           dest.int_mod = :int_mod_update,
                           dest.cha_mod = :cha_mod_update
                       WHEN NOT MATCHED THEN INSERT
                           (player_id, deck_json, character_level, wis_mod, int_mod, cha_mod)
                       VALUES
                           (:player_id_insert, :deck_json_insert, :character_level_insert, :wis_mod_insert, :int_mod_insert, :cha_mod_insert)
                   """, {
                    'player_id_src': player_id,
                    'deck_json_update': deck_json_str,
                    'character_level_update': character_level,
                    'wis_mod_update': wis_mod,
                    'int_mod_update': int_mod,
                    'cha_mod_update': cha_mod,
                    'player_id_insert': player_id,
                    'deck_json_insert': deck_json_str,
                    'character_level_insert': character_level,
                    'wis_mod_insert': wis_mod,
                    'int_mod_insert': int_mod,
                    'cha_mod_insert': cha_mod
                })
                connection.commit()

            print(
                f"[{request.remote_addr}] POST /api/deck - Saved {len(deck_data)} cards and stats for player {player_id} to Oracle DB.")

        return jsonify({"message": "Deck and stats saved successfully."}), 200

    except oracledb.Error as e:
        error_obj, = e.args
        print(f"[{request.remote_addr}] POST /api/deck - Oracle DB Error saving deck: {error_obj.message}", flush=True)
        return jsonify({'error': 'Failed to save deck: ' + error_obj.message}), 500

    except Exception as e:
        print(f"[{request.remote_addr}] POST /api/deck - Unexpected Error saving deck: {e}", flush=True)
        return jsonify({'error': 'Failed to save deck due to unexpected error: ' + str(e)}), 500


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
    # Initialize the database pool and perform table checks/population
    init_db_pool()

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
