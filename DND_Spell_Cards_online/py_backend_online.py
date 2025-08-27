# dnd-spell-cards-app/backend/app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import datetime
import oracledb
import contextlib
import pandas as pd
import hashlib
from uuid import uuid4

# --- Flask App Initialization ---
app = Flask(__name__)
# A robust CORS configuration to allow requests from any origin and any header
CORS(app, resources={
    r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": "*"}
})

# --- Oracle DB Connection Configuration ---
WALLET_DIR = "/home/opc/spell_card_app/Wallet"
os.environ['TNS_ADMIN'] = WALLET_DIR

DB_SERVICE_NAME = "g2mrxqwa818lwbj4_high"
DB_USERNAME = "ELDRIC"
DB_PASSWORD = "StupidGame69"

# --- CSV File Configuration ---
# Used for initial population of the CARDS table.
CSV_FILE_PATH = 'Spell Trading Card Data.csv'

# --- In-memory cache for all cards (optional but efficient) ---
all_cards_data = []


# --- Utility Functions ---
def hash_password(password):
    """Hashes a password using SHA-256."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def hash_row(row):
    """Generates a SHA-256 hash for a given DataFrame row.
    Used to create unique 'id' for cards from the spreadsheet."""
    row_string = str(sorted(row.to_dict().items())).encode('utf-8')
    return hashlib.sha256(row_string).hexdigest()


def fetch_cards_from_csv():
    """Reads card data from a CSV file."""
    print(f"Attempting to fetch cards from CSV file: {CSV_FILE_PATH}")
    try:
        if not os.path.exists(CSV_FILE_PATH):
            print(f"ERROR: CSV file not found at {CSV_FILE_PATH}")
            return None

        df = pd.read_csv(CSV_FILE_PATH)
        df['id'] = df.apply(hash_row, axis=1)
        # Standardize column names to uppercase to match Oracle DB conventions
        df.columns = [c.upper().replace(' ', '_') for c in df.columns]

        csv_cards = df.to_dict(orient='records')
        validated_cards = []
        for row in csv_cards:
            try:
                card = {
                    "id": str(row['ID']),
                    "name": str(row['NAME']),
                    "image_filename": str(row['IMAGE_FILENAME']),
                    "description": str(row['DESCRIPTION']),
                    "type": str(row['TYPE']),
                    "rarity": str(row['RARITY']),
                    "default_uses_per_rest": int(float(row['DEFAULT_USES_PER_REST']))
                }
                validated_cards.append(card)
            except KeyError as ke:
                print(f"WARNING: Skipping row due to missing key in CSV file: {ke} in row {row}")
            except ValueError as ve:
                print(f"WARNING: Skipping row due to invalid value type in CSV file: {ve} in row {row}")
            except Exception as e:
                print(f"WARNING: Skipping row due to unexpected error in CSV file: {e} in row {row}")

        print(f"Successfully fetched {len(validated_cards)} cards from CSV file.")
        return validated_cards

    except Exception as e:
        print(f"ERROR: Failed to fetch cards from CSV file: {e}")
        return None


# --- Initialize Oracle DB Connection Pool (recommended for Flask) ---
db_pool = None


def init_db_pool():
    global db_pool
    if db_pool is not None:
        print("Oracle DB connection pool already initialized.")
        return

    print("Initializing Oracle DB connection pool...")
    try:
        db_pool = oracledb.create_pool(
            user=DB_USERNAME,
            password=DB_PASSWORD,
            dsn=DB_SERVICE_NAME,
            min=2, max=5, increment=1,
            config_dir=WALLET_DIR
        )
        print("Oracle DB connection pool initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize database connection pool: {e}")

    # Check and populate the database tables on startup if they don't exist.
    try:
        with contextlib.closing(db_pool.acquire()) as conn:
            with contextlib.closing(conn.cursor()) as cursor:
                # Check and create CARDS table
                cursor.execute("SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = 'CARDS'")
                if not cursor.fetchone()[0] > 0:
                    print("CARDS table not found. Creating and populating...")
                    # Using case-sensitive column names in quotes to ensure they match
                    cursor.execute("""
                        CREATE TABLE CARDS (
                            ID VARCHAR2(64) PRIMARY KEY,
                            NAME VARCHAR2(100) NOT NULL,
                            TYPE VARCHAR2(50) NOT NULL,
                            DESCRIPTION VARCHAR2(500),
                            RARITY VARCHAR2(50),
                            DEFAULT_USES_PER_REST NUMBER,
                            IMAGE_FILENAME VARCHAR2(100)
                        )
                    """)
                    conn.commit()
                    cards_to_insert = fetch_cards_from_csv()
                    if cards_to_insert:
                        print("Populating CARDS table from CSV data.")
                        # This SQL statement has been updated to match the column names
                        # from the CSV file to ensure correct insertion.
                        cursor.executemany("""
                            INSERT INTO CARDS (ID, NAME, IMAGE_FILENAME, DESCRIPTION, TYPE, RARITY, DEFAULT_USES_PER_REST)
                            VALUES (:id, :name, :image_filename, :description, :type, :rarity, :default_uses_per_rest)
                        """, cards_to_insert)
                        conn.commit()
                    else:
                        print("WARNING: Could not populate CARDS table from CSV. It is empty.")

                # Check and create PLAYER_DECKS table
                cursor.execute("SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = 'PLAYER_DECKS'")
                if not cursor.fetchone()[0] > 0:
                    print("PLAYER_DECKS table not found. Creating table...")
                    cursor.execute("""
                        CREATE TABLE PLAYER_DECKS (
                            PLAYER_ID VARCHAR2(255) PRIMARY KEY,
                            DECK_JSON CLOB,
                            CHARACTER_LEVEL NUMBER,
                            WIS_MOD NUMBER,
                            INT_MOD NUMBER,
                            CHA_MOD NUMBER,
                            PASSWORD_HASH VARCHAR2(255)
                        )
                    """)
                    conn.commit()

    except Exception as e:
        print(f"Error during initial database setup: {e}")


def get_db_connection():
    """Acquires a connection from the pool."""
    try:
        return db_pool.acquire()
    except Exception as e:
        print(f"Failed to acquire a connection from the pool: {e}")
        return None


def get_player_deck(player_id):
    """Fetches a player's deck and stats from the database."""
    try:
        with contextlib.closing(get_db_connection()) as connection:
            with contextlib.closing(connection.cursor()) as cursor:
                sql = """
                SELECT DECK_JSON, CHARACTER_LEVEL, WIS_MOD, INT_MOD, CHA_MOD, PASSWORD_HASH
                FROM PLAYER_DECKS WHERE PLAYER_ID = :player_id
                """
                cursor.execute(sql, player_id=player_id)
                row = cursor.fetchone()
                if row:
                    # Explicitly read CLOB data as string
                    deck_json_clob = row[0]
                    deck_data = json.loads(deck_json_clob.read()) if deck_json_clob else []  # Use .read() for CLOB
                    return {
                        "deck": deck_data,
                        "character_level": row[1],
                        "wis_mod": row[2],
                        "int_mod": row[3],
                        "cha_mod": row[4],
                        "hashed_password": row[5]
                    }
                return None
    except Exception as e:
        print(f"Error fetching player deck: {e}")
        return None


def save_player_deck(player_id, deck_data, character_level, wis_mod, int_mod, cha_mod, password_hash):
    """Saves or updates a player's deck and stats in the database."""
    try:
        with contextlib.closing(get_db_connection()) as connection:
            with contextlib.closing(connection.cursor()) as cursor:
                print(f"Attempting to save deck for player: {player_id}")
                # Check if the player already exists, using the correct uppercase column name
                sql_check = "SELECT COUNT(*) FROM PLAYER_DECKS WHERE PLAYER_ID = :p_player_id"
                cursor.execute(sql_check, p_player_id=player_id)
                exists = cursor.fetchone()[0]

                if exists:
                    print("Player found. Updating existing deck...")
                    sql = """
                    UPDATE PLAYER_DECKS SET DECK_JSON = :p_deck_data, CHARACTER_LEVEL = :p_level, 
                    WIS_MOD = :p_wis, INT_MOD = :p_int, CHA_MOD = :p_cha
                    WHERE PLAYER_ID = :p_player_id
                    """
                    bind_vars = {
                        'p_deck_data': json.dumps(deck_data),  # json.dumps creates a string suitable for CLOB
                        'p_level': character_level,
                        'p_wis': wis_mod,
                        'p_int': int_mod,
                        'p_cha': cha_mod,
                        'p_player_id': player_id
                    }
                    cursor.execute(sql, bind_vars)
                else:
                    print("Player not found. Creating new account...")
                    sql = """
                    INSERT INTO PLAYER_DECKS (PLAYER_ID, DECK_JSON, CHARACTER_LEVEL, WIS_MOD, INT_MOD, CHA_MOD, PASSWORD_HASH) 
                    VALUES (:p_player_id, :p_deck_data, :p_level, :p_wis, :p_int, :p_cha, :p_password_hash)
                    """
                    bind_vars = {
                        'p_player_id': player_id,
                        'p_deck_data': json.dumps(deck_data),  # json.dumps creates a string suitable for CLOB
                        'p_level': character_level,
                        'p_wis': wis_mod,
                        'p_int': int_mod,
                        'p_cha': cha_mod,
                        'p_password_hash': password_hash
                    }
                    cursor.execute(sql, bind_vars)

                connection.commit()
                print("Database operation successful.")
                return True
    except Exception as e:
        print(f"Error saving player deck: {e}")
        return False


# --- API Endpoints ---
@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({"status": "Backend is running!"})


@app.route('/api/cards', methods=['GET'])
def get_cards():
    global all_cards_data
    # Always fetch directly from DB to ensure up-to-date data and proper sorting.
    try:
        with contextlib.closing(get_db_connection()) as connection:
            with contextlib.closing(connection.cursor()) as cursor:
                sql = "SELECT ID, NAME, TYPE, DESCRIPTION, DEFAULT_USES_PER_REST, IMAGE_FILENAME FROM CARDS"
                cursor.execute(sql)
                rows = cursor.fetchall()
                cards = []
                for row in rows:
                    cards.append({
                        "id": row[0],
                        "name": row[1],
                        "type": row[2],
                        "description": row[3],
                        "default_uses_per_rest": row[4],
                        "image_filename": row[5]
                    })

                # --- Sorting Logic ---
                # 1. Cantrips on top
                # 2. Alphabetical order by name
                def card_sort_key(card):
                    # Cantrips (type == "Cantrip") get a lower sort value (0) to appear first
                    # Other cards get a higher sort value (1)
                    type_priority = 0 if card.get('type') == 'Cantrip' else 1
                    return (type_priority, card.get('name', '').lower())

                sorted_cards = sorted(cards, key=card_sort_key)

                all_cards_data = sorted_cards  # Update the global cache with sorted data
                print(f"Successfully fetched and sorted {len(all_cards_data)} cards from the database.")
                return jsonify(all_cards_data)

    except Exception as e:
        print(f"Error fetching and sorting cards from DB: {e}")
        return jsonify({"message": "No cards found"}), 404


@app.route('/api/calculate_deck_size', methods=['POST'])
def calculate_deck_size():
    data = request.json
    character_level = data.get('character_level', 1)
    wis_mod = data.get('wis_mod', 0)
    int_mod = data.get('int_mod', 0)
    cha_mod = data.get('cha_mod', 0)

    # Simplified calculation logic
    deck_size = ((character_level/2) + ((wis_mod + int_mod + cha_mod)/3))
    max_deck_size = int(deck_size)
    return jsonify({"max_deck_size": max_deck_size})


@app.route('/api/deck/create', methods=['POST'])
def create_deck():
    data = request.json
    player_id = data.get('player_id')
    password = data.get('password')

    if not player_id or not password:
        return jsonify({"error": "Missing player ID or password"}), 400

    player_data = get_player_deck(player_id)
    if player_data:
        return jsonify({"error": "Player ID already exists"}), 409

    hashed_password = hash_password(password)
    success = save_player_deck(player_id, [], 1, 0, 0, 0, hashed_password)

    if success:
        return jsonify({"message": "Player account created successfully"}), 201
    else:
        return jsonify({"error": "Failed to create player account"}), 500


@app.route('/api/deck/login', methods=['POST'])
def login():
    data = request.json
    player_id = data.get('player_id')
    password = data.get('password')

    if not player_id or not password:
        return jsonify({"error": "Missing player ID or password"}), 400

    player_data = get_player_deck(player_id)
    if not player_data:
        return jsonify({"error": "Player ID not found"}), 404

    hashed_password = hash_password(password)
    # Corrected the key to match the database column and the `get_player_deck` function's return value
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    return jsonify({
        "message": "Login successful",
        "cards": player_data['deck'],
        "character_level": player_data['character_level'],
        "wis_mod": player_data['wis_mod'],
        "int_mod": player_data['int_mod'],
        "cha_mod": player_data['cha_mod']
    }), 200


@app.route('/api/deck/save', methods=['POST'])
def save_deck():
    data = request.json
    player_id = data.get('player_id')
    password = data.get('password')
    cards = data.get('cards')
    character_level = data.get('character_level')
    wis_mod = data.get('wis_mod')
    int_mod = data.get('int_mod')
    cha_mod = data.get('cha_mod')

    if not all([player_id, password, cards is not None, character_level is not None, wis_mod is not None,
                int_mod is not None, cha_mod is not None]):
        return jsonify({"error": "Missing required data"}), 400

    player_data = get_player_deck(player_id)
    if not player_data:
        return jsonify({"error": "Player not found"}), 404

    hashed_password = hash_password(password)
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    success = save_player_deck(player_id, cards, character_level, wis_mod, int_mod, cha_mod, hashed_password)

    if success:
        return jsonify({"message": "Deck and stats saved successfully"}), 200
    else:
        return jsonify({"error": "Failed to save deck"}), 500


@app.route('/api/card_used', methods=['POST'])
def card_used():
    data = request.json
    card_name = data.get('name')
    card_type = data.get('type')
    deck_card_id = data.get('deck_card_id')

    # Correcting the check for required data
    if not all([card_name, card_type, deck_card_id]):
        return jsonify({"message": "Missing required data"}), 400

    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "event_type": "CARD_PLAYED",
        "card_name": card_name,
        "card_type": card_type,
        "deck_instance_id": deck_card_id,
        "status": "SUCCESS",
        "message": f"DND_SYSTEM: Card '{card_name}' (ID: {deck_card_id}) processed as used."
    }
    print("--- SIMULATED SYSTEM LOG ENTRY ---")
    print(json.dumps(log_entry, indent=2))
    print("----------------------------------")

    return jsonify({"message": f"Card '{card_name}' marked as used.", "log_entry": log_entry})


if __name__ == '__main__':
    # Initial fetching of cards and DB setup
    init_db_pool()
    print("Starting Python Flask backend for Spell Trading Cards App...")
    print("API Endpoints:")
    print("  GET /api/cards - Get all available cards")
    print("  GET /api/status - Check backend status")
    print("  POST /api/calculate_deck_size - Calculate max deck size")
    print("  POST /api/deck/create - Create player account")
    print("  POST /api/deck/login - Authenticate and retrieve player deck")
    print("  POST /api/deck/save - Save the player deck")
    print("  POST /api/card_used - Log a card usage event")
    app.run(host='0.0.0.0', port=5000)
