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
import random  # For random card selection

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


def generate_session_code():
    """Generates a random 6-character alphanumeric session code."""
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return ''.join(random.choice(chars) for _ in range(6))


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
                    "default_uses_per_rest": int(float(row['DEFAULT_USES_PER_REST'])),
                    "backlash_effect": str(row.get('BACKLASH_EFFECT', '')),
                    "effect": str(row.get('EFFECT', ''))
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
                # --- CARDS table management ---
                cursor.execute("SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = 'CARDS'")
                if cursor.fetchone()[0] > 0:
                    print("CARDS table found. Dropping existing table for schema update...")
                    cursor.execute("DROP TABLE CARDS")
                    conn.commit()

                print("Creating CARDS table with new schema (including BACKLASH_EFFECT and EFFECT)...")
                cursor.execute("""
                    CREATE TABLE CARDS (
                        ID VARCHAR2(64) PRIMARY KEY,
                        NAME VARCHAR2(100) NOT NULL,
                        TYPE VARCHAR2(50) NOT NULL,
                        DESCRIPTION VARCHAR2(500),
                        RARITY VARCHAR2(50),
                        DEFAULT_USES_PER_REST NUMBER,
                        IMAGE_FILENAME VARCHAR2(100),
                        BACKLASH_EFFECT VARCHAR2(500),
                        EFFECT VARCHAR2(500)
                    )
                """)
                conn.commit()
                print("CARDS table created successfully with new schema.")

                cards_to_insert = fetch_cards_from_csv()
                if cards_to_insert:
                    print("Populating CARDS table from CSV data.")
                    cursor.executemany("""
                        INSERT INTO CARDS (ID, NAME, IMAGE_FILENAME, DESCRIPTION, TYPE, RARITY, DEFAULT_USES_PER_REST, BACKLASH_EFFECT, EFFECT)
                        VALUES (:id, :name, :image_filename, :description, :type, :rarity, :default_uses_per_rest, :backlash_effect, :effect)
                    """, cards_to_insert)
                    conn.commit()
                else:
                    print("WARNING: Could not populate CARDS table from CSV. It is empty.")

                # --- NEW TABLE: CUSTOM_CARDS ---
                cursor.execute("SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = 'CUSTOM_CARDS'")
                if cursor.fetchone()[0] > 0:
                    print("CUSTOM_CARDS table found. Dropping existing table...")
                    cursor.execute("DROP TABLE CUSTOM_CARDS")
                    conn.commit()

                print("Creating CUSTOM_CARDS table...")
                cursor.execute("""
                    CREATE TABLE CUSTOM_CARDS (
                        ID VARCHAR2(64) PRIMARY KEY,
                        NAME VARCHAR2(100) NOT NULL,
                        TYPE VARCHAR2(50) NOT NULL,
                        DESCRIPTION VARCHAR2(500),
                        RARITY VARCHAR2(50),
                        DEFAULT_USES_PER_REST NUMBER,
                        IMAGE_URL VARCHAR2(500), -- Use IMAGE_URL for custom cards
                        BACKLASH_EFFECT VARCHAR2(500),
                        EFFECT VARCHAR2(500),
                        CREATED_BY_DM VARCHAR2(255) NOT NULL,
                        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT fk_created_by_dm FOREIGN KEY (CREATED_BY_DM) REFERENCES PLAYER_DECKS(PLAYER_ID) ON DELETE CASCADE
                    )
                """)
                conn.commit()
                print("CUSTOM_CARDS table created successfully.")

                # --- PLAYER_DECKS table management ---
                cursor.execute("SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = 'PLAYER_DECKS'")
                if cursor.fetchone()[0] > 0:
                    print("PLAYER_DECKS table found. Dropping existing table for schema update...")
                    cursor.execute("DROP TABLE PLAYER_DECKS")
                    conn.commit()

                print(
                    "Re-creating PLAYER_DECKS table with final schema (including PENDING_BOOSTER_PACKS and PENDING_CARDS)...")
                cursor.execute("""
                    CREATE TABLE PLAYER_DECKS (
                        PLAYER_ID VARCHAR2(255) PRIMARY KEY,
                        PLAYER_ACTIVE_DECK_JSON CLOB,
                        PLAYER_UNLOCKED_COLLECTION_JSON CLOB,
                        CHARACTER_LEVEL NUMBER,
                        WIS_MOD NUMBER,
                        INT_MOD NUMBER,
                        CHA_MOD NUMBER,
                        PASSWORD_HASH VARCHAR2(255),
                        PENDING_BOOSTER_PACKS CLOB DEFAULT '[]', -- JSON array of pack types
                        PENDING_CARDS CLOB DEFAULT '[]' -- JSON array of card IDs
                    )
                """)
                conn.commit()
                print("PLAYER_DECKS table re-created successfully with correct schema.")

                # --- NEW TABLE: GAME_SESSIONS ---
                cursor.execute("SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = 'GAME_SESSIONS'")
                if cursor.fetchone()[0] > 0:
                    print("GAME_SESSIONS table found. Dropping existing table for schema update...")
                    cursor.execute("DROP TABLE GAME_SESSIONS")
                    conn.commit()

                print("Creating GAME_SESSIONS table...")
                cursor.execute("""
                    CREATE TABLE GAME_SESSIONS (
                        SESSION_ID VARCHAR2(64) PRIMARY KEY,
                        DM_PLAYER_ID VARCHAR2(255) NOT NULL,
                        SESSION_CODE VARCHAR2(6) UNIQUE NOT NULL, -- Short, human-readable code
                        SESSION_NAME VARCHAR2(100),
                        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT fk_dm_player FOREIGN KEY (DM_PLAYER_ID) REFERENCES PLAYER_DECKS(PLAYER_ID) ON DELETE CASCADE
                    )
                """)
                conn.commit()
                print("GAME_SESSIONS table created successfully.")

                # --- NEW TABLE: PLAYER_SESSION_MEMBERSHIP ---
                cursor.execute("SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = 'PLAYER_SESSION_MEMBERSHIP'")
                if cursor.fetchone()[0] > 0:
                    print("PLAYER_SESSION_MEMBERSHIP table found. Dropping existing table for schema update...")
                    cursor.execute("DROP TABLE PLAYER_SESSION_MEMBERSHIP")
                    conn.commit()

                print("Creating PLAYER_SESSION_MEMBERSHIP table...")
                cursor.execute("""
                    CREATE TABLE PLAYER_SESSION_MEMBERSHIP (
                        PLAYER_ID VARCHAR2(255) NOT NULL,
                        SESSION_ID VARCHAR2(64) NOT NULL,
                        JOINED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (PLAYER_ID, SESSION_ID),
                        CONSTRAINT fk_psm_player FOREIGN KEY (PLAYER_ID) REFERENCES PLAYER_DECKS(PLAYER_ID) ON DELETE CASCADE,
                        CONSTRAINT fk_psm_session FOREIGN KEY (SESSION_ID) REFERENCES GAME_SESSIONS(SESSION_ID) ON DELETE CASCADE
                    )
                """)
                conn.commit()
                print("PLAYER_SESSION_MEMBERSHIP table created successfully.")


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
    """Fetches a player's deck and stats, including unlocked cards, from the database."""
    try:
        with contextlib.closing(get_db_connection()) as connection:
            with contextlib.closing(connection.cursor()) as cursor:
                sql = """
                SELECT PLAYER_ACTIVE_DECK_JSON, PLAYER_UNLOCKED_COLLECTION_JSON, CHARACTER_LEVEL, WIS_MOD, INT_MOD, CHA_MOD, PASSWORD_HASH, PENDING_BOOSTER_PACKS, PENDING_CARDS
                FROM PLAYER_DECKS WHERE PLAYER_ID = :player_id
                """
                cursor.execute(sql, player_id=player_id)
                row = cursor.fetchone()
                if row:
                    active_deck_clob = row[0]
                    unlocked_collection_clob = row[1]
                    pending_booster_packs_clob = row[7]
                    pending_cards_clob = row[8]

                    active_deck_instances = json.loads(active_deck_clob.read()) if active_deck_clob else []
                    unlocked_collection_ids = json.loads(
                        unlocked_collection_clob.read()) if unlocked_collection_clob else []
                    pending_booster_packs = json.loads(
                        pending_booster_packs_clob.read()) if pending_booster_packs_clob else []
                    pending_cards = json.loads(pending_cards_clob.read()) if pending_cards_clob else []

                    return {
                        "active_deck_instances": active_deck_instances,
                        "unlocked_collection_ids": unlocked_collection_ids,  # This list can now contain duplicates
                        "character_level": row[2],
                        "wis_mod": row[3],
                        "int_mod": row[4],
                        "cha_mod": row[5],
                        "hashed_password": row[6],
                        "pending_booster_packs": pending_booster_packs,  # New field
                        "pending_cards": pending_cards  # New field
                    }
                return None
    except Exception as e:
        print(f"Error fetching player deck: {e}")
        return None


def save_player_deck(player_id, active_deck_instances, unlocked_collection_ids, character_level, wis_mod, int_mod,
                     cha_mod, password_hash, pending_booster_packs=None, pending_cards=None):
    """Saves or updates a player's deck and stats, including unlocked cards, in the database.
    pending_booster_packs and pending_cards are optional lists that default to empty if not provided."""
    try:
        with contextlib.closing(get_db_connection()) as connection:
            with contextlib.closing(connection.cursor()) as cursor:
                print(f"Attempting to save deck for player: {player_id}")

                sql_check = "SELECT COUNT(*) FROM PLAYER_DECKS WHERE PLAYER_ID = :p_player_id"
                cursor.execute(sql_check, p_player_id=player_id)
                exists = cursor.fetchone()[0]

                # Fetch current pending items if not provided for update
                current_player_data = get_player_deck(player_id) if exists else None
                final_pending_booster_packs = pending_booster_packs if pending_booster_packs is not None else (
                    current_player_data['pending_booster_packs'] if current_player_data else [])
                final_pending_cards = pending_cards if pending_cards is not None else (
                    current_player_data['pending_cards'] if current_player_data else [])

                if exists:
                    print("Player found. Updating existing deck...")
                    sql = """
                    UPDATE PLAYER_DECKS SET PLAYER_ACTIVE_DECK_JSON = :p_active_deck_instances, 
                    PLAYER_UNLOCKED_COLLECTION_JSON = :p_unlocked_collection_ids,
                    CHARACTER_LEVEL = :p_level, WIS_MOD = :p_wis, INT_MOD = :p_int, CHA_MOD = :p_cha,
                    PENDING_BOOSTER_PACKS = :p_pending_booster_packs, PENDING_CARDS = :p_pending_cards
                    WHERE PLAYER_ID = :p_player_id
                    """
                    bind_vars = {
                        'p_active_deck_instances': json.dumps(active_deck_instances),
                        'p_unlocked_collection_ids': json.dumps(unlocked_collection_ids),
                        'p_level': character_level,
                        'p_wis': wis_mod,
                        'p_int': int_mod,
                        'p_cha': cha_mod,
                        'p_player_id': player_id,
                        'p_pending_booster_packs': json.dumps(final_pending_booster_packs),
                        'p_pending_cards': json.dumps(final_pending_cards)
                    }
                    cursor.execute(sql, bind_vars)
                else:
                    print("Player not found. Creating new account...")
                    sql = """
                    INSERT INTO PLAYER_DECKS (PLAYER_ID, PLAYER_ACTIVE_DECK_JSON, PLAYER_UNLOCKED_COLLECTION_JSON, 
                                            CHARACTER_LEVEL, WIS_MOD, INT_MOD, CHA_MOD, PASSWORD_HASH, PENDING_BOOSTER_PACKS, PENDING_CARDS) 
                    VALUES (:p_player_id, :p_active_deck_instances, :p_unlocked_collection_ids, 
                            :p_level, :p_wis, :p_int, :p_cha, :p_password_hash, :p_pending_booster_packs, :p_pending_cards)
                    """
                    bind_vars = {
                        'p_player_id': player_id,
                        'p_active_deck_instances': json.dumps(active_deck_instances),
                        'p_unlocked_collection_ids': json.dumps(unlocked_collection_ids),
                        'p_level': character_level,
                        'p_wis': wis_mod,
                        'p_int': int_mod,
                        'p_cha': cha_mod,
                        'p_password_hash': password_hash,
                        'p_pending_booster_packs': json.dumps(final_pending_booster_packs),
                        'p_pending_cards': json.dumps(final_pending_cards)
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
    cards = []
    try:
        with contextlib.closing(get_db_connection()) as connection:
            with contextlib.closing(connection.cursor()) as cursor:
                # Fetch base cards from CARDS table
                sql_base_cards = "SELECT ID, NAME, TYPE, DESCRIPTION, RARITY, DEFAULT_USES_PER_REST, IMAGE_FILENAME, BACKLASH_EFFECT, EFFECT FROM CARDS"
                cursor.execute(sql_base_cards)
                for row in cursor.fetchall():
                    cards.append({
                        "id": row[0],
                        "name": row[1],
                        "type": row[2],
                        "description": row[3],
                        "rarity": row[4],
                        "default_uses_per_rest": row[5],
                        "image_url": row[6],  # Frontend expects image_url
                        "backlash_effect": row[7],
                        "effect": row[8]
                    })

                # Fetch custom cards from CUSTOM_CARDS table
                sql_custom_cards = "SELECT ID, NAME, TYPE, DESCRIPTION, RARITY, DEFAULT_USES_PER_REST, IMAGE_URL, BACKLASH_EFFECT, EFFECT FROM CUSTOM_CARDS"
                cursor.execute(sql_custom_cards)
                for row in cursor.fetchall():
                    cards.append({
                        "id": row[0],
                        "name": row[1],
                        "type": row[2],
                        "description": row[3],
                        "rarity": row[4],
                        "default_uses_per_rest": row[5],
                        "image_url": row[6],
                        "backlash_effect": row[7],
                        "effect": row[8]
                    })

                # --- Sorting Logic ---
                # 1. Cantrips on top
                # 2. Alphabetical order by name
                def card_sort_key(card):
                    type_priority = 0 if card.get('type') == 'Cantrip' else 1
                    return (type_priority, card.get('name', '').lower())

                sorted_cards = sorted(cards, key=card_sort_key)
                all_cards_data = sorted_cards  # Update the global cache with sorted data
                print(
                    f"Successfully fetched and sorted {len(all_cards_data)} cards from the database (including custom cards).")
                return jsonify(all_cards_data)

    except Exception as e:
        print(f"Error fetching cards from DB: {e}")
        return jsonify({"message": "No cards found", "error": str(e)}), 404


@app.route('/api/calculate_deck_size', methods=['POST'])
def calculate_deck_size():
    data = request.json
    character_level = data.get('character_level', 1)
    wis_mod = data.get('wis_mod', 0)
    int_mod = data.get('int_mod', 0)
    cha_mod = data.get('cha_mod', 0)

    max_deck_size = character_level + wis_mod + int_mod + cha_mod
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

    initial_unlocked_collection_ids = []

    # Directly use the global all_cards_data which is populated by get_cards()
    if not all_cards_data:
        # If cache is empty, try to fetch cards (might happen on first run if /api/cards wasn't hit)
        with app.test_client() as client:
            client.get('/api/cards')  # This will populate all_cards_data

    if not all_cards_data:  # If still empty, something is wrong
        print("ERROR: all_cards_data is empty during player creation.")
        cantrips_pool = []
        leveled_spells_pool = []
    else:
        cantrips_pool = [card for card in all_cards_data if card.get('type') == 'Cantrip']
        leveled_spells_pool = [card for card in all_cards_data if card.get('type') != 'Cantrip']

    if len(cantrips_pool) >= 3:
        initial_unlocked_collection_ids.extend([card['id'] for card in random.sample(cantrips_pool, 3)])
    elif cantrips_pool:
        initial_unlocked_collection_ids.extend([card['id'] for card in cantrips_pool])

    # Try to get 'Burning Hands' and 'Cure Wounds' from the (now combined) card pool
    burning_hands = next((card for card in all_cards_data if card.get('name') == 'Burning Hands'), None)
    cure_wounds = next((card for card in all_cards_data if card.get('name') == 'Cure Wounds'), None)

    if burning_hands:
        initial_unlocked_collection_ids.append(burning_hands['id'])
    if cure_wounds:
        initial_unlocked_collection_ids.append(cure_wounds['id'])

    print(f"Initial cards for new player {player_id}: {initial_unlocked_collection_ids}")

    # Pass empty lists for pending_booster_packs and pending_cards for new accounts
    success = save_player_deck(player_id, [], initial_unlocked_collection_ids, 1, 0, 0, 0, hashed_password, [], [])

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
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    return jsonify({
        "message": "Login successful",
        "active_deck_instances": player_data['active_deck_instances'],
        "unlocked_collection_ids": player_data['unlocked_collection_ids'],
        "character_level": player_data['character_level'],
        "wis_mod": player_data['wis_mod'],
        "int_mod": player_data['int_mod'],
        "cha_mod": player_data['cha_mod'],
        "pending_booster_packs": player_data['pending_booster_packs'],  # Return new field
        "pending_cards": player_data['pending_cards']  # Return new field
    }), 200


@app.route('/api/deck/save', methods=['POST'])
def save_deck():
    data = request.json
    player_id = data.get('player_id')
    password = data.get('password')
    active_deck_instances = data.get('active_deck_instances')
    unlocked_collection_ids = data.get('unlocked_collection_ids')
    character_level = data.get('character_level')
    wis_mod = data.get('wis_mod')
    int_mod = data.get('int_mod')
    cha_mod = data.get('cha_mod')

    if not all([player_id, password, active_deck_instances is not None, unlocked_collection_ids is not None,
                character_level is not None, wis_mod is not None, int_mod is not None, cha_mod is not None]):
        return jsonify({"error": "Missing required data"}), 400

    player_data = get_player_deck(player_id)
    if not player_data:
        return jsonify({"error": "Player not found"}), 404

    hashed_password = hash_password(password)
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    # Player-initiated save should not clear pending packs, as these are managed by DM or specific player actions
    success = save_player_deck(player_id, active_deck_instances, unlocked_collection_ids,
                               character_level, wis_mod, int_mod, cha_mod, hashed_password,
                               player_data['pending_booster_packs'], player_data['pending_cards'])

    if success:
        return jsonify({"message": "Deck and stats saved successfully"}), 200
    else:
        return jsonify({"error": "Failed to save deck"}), 500


@app.route('/api/deck/open_booster', methods=['POST'])
def open_booster_pack():
    data = request.json
    player_id = data.get('player_id')
    password = data.get('password')

    if not player_id or not password:
        return jsonify({"error": "Missing player ID or password"}), 400

    player_data = get_player_deck(player_id)
    if not player_data:
        return jsonify({"error": "Player not found"}), 404

    hashed_password = hash_password(password)
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    current_unlocked_ids = list(player_data['unlocked_collection_ids'])

    # Ensure all_cards_data is up-to-date
    global all_cards_data
    with app.test_client() as client:
        client.get('/api/cards')  # This will re-fetch and update all_cards_data from DB

    if not all_cards_data:
        return jsonify({"error": "No cards available in the system to open a booster pack."}), 500

    # Define card rarities and their likelihood (lower number = more common)
    rarity_weights = {
        "Common": 40,  # Adjusted weights to make custom cards more likely than legendary
        "Uncommon": 25,
        "Rare": 15,
        "Legendary": 5,
        "Custom": 15  # Custom cards are now fairly common in booster packs
    }

    # Get available cards grouped by rarity
    cards_by_rarity = {
        rarity: [card for card in all_cards_data if card.get('rarity') == rarity]
        for rarity in rarity_weights.keys()
    }

    new_cards = []
    pack_type = "Standard Pack"  # Default pack type
    num_cards_in_pack = 5  # Example: 5 cards per pack

    for _ in range(num_cards_in_pack):
        chosen_rarity = random.choices(
            list(rarity_weights.keys()),
            weights=list(rarity_weights.values()),
            k=1
        )[0]

        available_cards_of_rarity = cards_by_rarity.get(chosen_rarity, [])
        if available_cards_of_rarity:
            selected_card = random.choice(available_cards_of_rarity)
            new_cards.append({
                "id": selected_card["id"],
                "name": selected_card["name"],
                "type": selected_card.get("type"),
                "rarity": selected_card.get("rarity")
            })
            current_unlocked_ids.append(selected_card['id'])  # Add to player's collection
        else:
            print(f"WARNING: No cards found for rarity '{chosen_rarity}'. Skipping this card slot.")

    updated_unlocked_collection_ids = current_unlocked_ids

    success = save_player_deck(player_id, player_data['active_deck_instances'],
                               updated_unlocked_collection_ids,
                               player_data['character_level'], player_data['wis_mod'],
                               player_data['int_mod'], player_data['cha_mod'], hashed_password,
                               player_data['pending_booster_packs'],
                               player_data['pending_cards'])  # Preserve pending items

    if success:
        return jsonify({
            "message": f"Successfully opened a {pack_type}! You acquired {len(new_cards_acquired)} cards.",
            "pack_type": pack_type,
            "new_cards": new_cards,
            "updated_unlocked_collection_ids": updated_unlocked_collection_ids
        }), 200
    else:
        return jsonify({"error": "Failed to open booster pack and save new cards."}), 500


@app.route('/api/player/open_pending_booster', methods=['POST'])
def player_open_pending_booster():
    data = request.json
    player_id = data.get('player_id')
    password = data.get('password')

    if not player_id or not password:
        return jsonify({"error": "Missing player ID or password"}), 400

    player_data = get_player_deck(player_id)
    if not player_data:
        return jsonify({"error": "Player not found"}), 404
    hashed_password = hash_password(password)
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    if not player_data['pending_booster_packs']:
        return jsonify({"error": "No pending booster packs to open."}), 400

    # Get the next pending pack type to open
    pack_type_to_open = player_data['pending_booster_packs'].pop(0)  # Remove the first pack

    current_unlocked_ids = list(player_data['unlocked_collection_ids'])
    new_cards_acquired = []

    # Ensure all_cards_data is up-to-date
    global all_cards_data
    with app.test_client() as client:
        client.get('/api/cards')  # This will re-fetch and update all_cards_data from DB

    if not all_cards_data:
        return jsonify({"error": "No cards available in the system to open a booster pack."}), 500

    # Define card rarities and their likelihood (lower number = more common)
    rarity_weights = {
        "Common": 40,
        "Uncommon": 25,
        "Rare": 15,
        "Legendary": 5,
        "Custom": 15
    }

    # Get available cards grouped by rarity
    cards_by_rarity = {
        rarity: [card for card in all_cards_data if card.get('rarity') == rarity]
        for rarity in rarity_weights.keys()
    }

    num_cards_in_pack = 5  # Example: 5 cards per pack

    for _ in range(num_cards_in_pack):
        chosen_rarity = random.choices(
            list(rarity_weights.keys()),
            weights=list(rarity_weights.values()),
            k=1
        )[0]

        available_cards_of_rarity = cards_by_rarity.get(chosen_rarity, [])
        if available_cards_of_rarity:
            selected_card = random.choice(available_cards_of_rarity)
            new_cards_acquired.append({
                "id": selected_card["id"],
                "name": selected_card["name"],
                "type": selected_card.get("type"),
                "rarity": selected_card.get("rarity")
            })
            current_unlocked_ids.append(selected_card['id'])
        else:
            print(
                f"WARNING: No cards found for rarity '{chosen_rarity}' for pack {pack_type_to_open}. Skipping this card slot.")

    success = save_player_deck(player_id, player_data['active_deck_instances'],
                               current_unlocked_ids,
                               player_data['character_level'], player_data['wis_mod'],
                               player_data['int_mod'], player_data['cha_mod'], hashed_password,
                               player_data['pending_booster_packs'],  # Update with modified pending_booster_packs
                               player_data['pending_cards'])

    if success:
        return jsonify({
            "message": f"Successfully opened a DM-given {pack_type_to_open}!",
            "pack_type": pack_type_to_open,
            "new_cards": new_cards_acquired,
            "updated_unlocked_collection_ids": current_unlocked_ids,
            "updated_pending_booster_packs": player_data['pending_booster_packs']
        }), 200
    else:
        return jsonify({"error": "Failed to open pending booster pack."}), 500


@app.route('/api/player/accept_pending_card', methods=['POST'])
def player_accept_pending_card():
    data = request.json
    player_id = data.get('player_id')
    password = data.get('password')
    card_id_to_accept = data.get('card_id')

    if not all([player_id, password, card_id_to_accept]):
        return jsonify({"error": "Missing player ID, password, or card ID"}), 400

    player_data = get_player_deck(player_id)
    if not player_data:
        return jsonify({"error": "Player not found"}), 404
    hashed_password = hash_password(password)
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    if card_id_to_accept not in player_data['pending_cards']:
        return jsonify({"error": "This card is not in your pending cards list."}), 400

    # Remove the card from pending list
    player_data['pending_cards'].remove(card_id_to_accept)

    # The card is already in unlocked_collection_ids from dm_give_card, so no need to add it again.
    # Just need to update the pending_cards list in the database.

    # Get the full card name for the success message
    card_name = "Unknown Card"
    found_card = next((card for card in all_cards_data if card['id'] == card_id_to_accept), None)
    if found_card:
        card_name = found_card['name']

    success = save_player_deck(player_id, player_data['active_deck_instances'],
                               player_data['unlocked_collection_ids'],
                               player_data['character_level'], player_data['wis_mod'],
                               player_data['int_mod'], player_data['cha_mod'], hashed_password,
                               player_data['pending_booster_packs'],
                               player_data['pending_cards'])  # Update with modified pending_cards

    if success:
        return jsonify({
            "message": f"Card '{card_name}' successfully accepted.",
            "card_name": card_name,
            "updated_unlocked_collection_ids": player_data['unlocked_collection_ids'],
            # No change here, already added by DM
            "updated_pending_cards": player_data['pending_cards']
        }), 200
    else:
        return jsonify({"error": "Failed to accept pending card."}), 500


@app.route('/api/card_used', methods=['POST'])
def card_used():
    data = request.json
    card_name = data.get('name')
    card_type = data.get('type')
    deck_card_id = data.get('deck_card_id')

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


# --- DM & Session Management Endpoints ---

@app.route('/api/dm/create_session', methods=['POST'])
def dm_create_session():
    data = request.json
    dm_player_id = data.get('player_id')
    password = data.get('password')
    session_name = data.get('session_name', 'Untitled Session')

    if not dm_player_id or not password:
        return jsonify({"error": "DM Player ID and password are required"}), 400

    player_data = get_player_deck(dm_player_id)
    if not player_data:
        return jsonify({"error": "DM Player ID not found"}), 404

    hashed_password = hash_password(password)
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    session_id = str(uuid4())
    session_code = generate_session_code()

    try:
        with contextlib.closing(get_db_connection()) as connection:
            with contextlib.closing(connection.cursor()) as cursor:
                sql = """
                INSERT INTO GAME_SESSIONS (SESSION_ID, DM_PLAYER_ID, SESSION_CODE, SESSION_NAME)
                VALUES (:session_id, :dm_player_id, :session_code, :session_name)
                """
                cursor.execute(sql, session_id=session_id, dm_player_id=dm_player_id,
                               session_code=session_code, session_name=session_name)
                connection.commit()
        return jsonify({
            "message": "Game session created successfully",
            "session_id": session_id,
            "session_code": session_code,
            "session_name": session_name
        }), 201
    except oracledb.IntegrityError as e:
        print(f"Error creating session due to integrity constraint: {e}")
        return jsonify({"error": "Failed to create session, please try again (possible code collision)."}), 500
    except Exception as e:
        print(f"Error creating session: {e}")
        return jsonify({"error": f"Failed to create session: {e}"}), 500


@app.route('/api/player/join_session', methods=['POST'])
def player_join_session():
    data = request.json
    player_id = data.get('player_id')
    password = data.get('password')
    session_code = data.get('session_code')

    if not player_id or not password or not session_code:
        return jsonify({"error": "Player ID, password, and session code are required"}), 400

    player_data = get_player_deck(player_id)
    if not player_data:
        return jsonify({"error": "Player ID not found"}), 404

    hashed_password = hash_password(password)
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    try:
        with contextlib.closing(get_db_connection()) as connection:
            with contextlib.closing(connection.cursor()) as cursor:
                # Find the session by code
                sql_find_session = "SELECT SESSION_ID, DM_PLAYER_ID, SESSION_NAME FROM GAME_SESSIONS WHERE SESSION_CODE = :session_code"
                cursor.execute(sql_find_session, session_code=session_code)
                session_row = cursor.fetchone()

                if not session_row:
                    return jsonify({"error": "Session not found with that code"}), 404

                found_session_id = session_row[0]
                dm_player_id = session_row[1]

                if player_id == dm_player_id:
                    return jsonify({"error": "A DM cannot join their own session as a player."}), 400

                # Check if player is already in this session
                sql_check_membership = """
                SELECT COUNT(*) FROM PLAYER_SESSION_MEMBERSHIP 
                WHERE PLAYER_ID = :player_id AND SESSION_ID = :session_id
                """
                cursor.execute(sql_check_membership, player_id=player_id, session_id=found_session_id)
                if cursor.fetchone()[0] > 0:
                    return jsonify(
                        {"message": "You are already a member of this session."}), 200  # Already joined is fine

                # Add player to session
                sql_insert_membership = """
                INSERT INTO PLAYER_SESSION_MEMBERSHIP (PLAYER_ID, SESSION_ID)
                VALUES (:player_id, :session_id)
                """
                cursor.execute(sql_insert_membership, player_id=player_id, session_id=found_session_id)
                connection.commit()
        return jsonify({
            "message": f"Successfully joined session '{session_row[2]}' (Code: {session_code})",
            "session_id": found_session_id,
            "session_name": session_row[2],
            "dm_player_id": dm_player_id
        }), 200
    except Exception as e:
        print(f"Error joining session: {e}")
        return jsonify({"error": f"Failed to join session: {e}"}), 500


@app.route('/api/dm/my_sessions', methods=['POST'])
def dm_my_sessions():
    data = request.json
    dm_player_id = data.get('player_id')
    password = data.get('password')

    if not dm_player_id or not password:
        return jsonify({"error": "DM Player ID and password are required"}), 400

    player_data = get_player_deck(dm_player_id)
    if not player_data:
        return jsonify({"error": "DM Player ID not found"}), 404

    hashed_password = hash_password(password)
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    try:
        with contextlib.closing(get_db_connection()) as connection:
            with contextlib.closing(connection.cursor()) as cursor:
                sql = "SELECT SESSION_ID, SESSION_CODE, SESSION_NAME, CREATED_AT FROM GAME_SESSIONS WHERE DM_PLAYER_ID = :dm_player_id"
                cursor.execute(sql, dm_player_id=dm_player_id)
                sessions = []
                for row in cursor.fetchall():
                    sessions.append({
                        "session_id": row[0],
                        "session_code": row[1],
                        "session_name": row[2],
                        "created_at": row[3].isoformat()  # Convert timestamp to string
                    })
        return jsonify({"sessions": sessions}), 200
    except Exception as e:
        print(f"Error fetching DM sessions: {e}")
        return jsonify({"error": f"Failed to fetch DM sessions: {e}"}), 500


@app.route('/api/dm/sessions/<session_id>/players', methods=['POST'])
def dm_session_players(session_id):
    data = request.json
    dm_player_id = data.get('player_id')
    password = data.get('password')

    if not dm_player_id or not password:
        return jsonify({"error": "DM Player ID and password are required"}), 400

    player_data = get_player_deck(dm_player_id)
    if not player_data:
        return jsonify({"error": "DM Player ID not found"}), 404

    hashed_password = hash_password(password)
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    try:
        with contextlib.closing(get_db_connection()) as connection:
            with contextlib.closing(connection.cursor()) as cursor:
                # Verify that the requesting DM actually owns this session
                sql_verify_dm = "SELECT COUNT(*) FROM GAME_SESSIONS WHERE SESSION_ID = :session_id AND DM_PLAYER_ID = :dm_player_id"
                cursor.execute(sql_verify_dm, session_id=session_id, dm_player_id=dm_player_id)
                if cursor.fetchone()[0] == 0:
                    return jsonify({"error": "Unauthorized: Session not found or you are not the DM."}), 403

                # Get all player IDs in this session
                sql_get_players = "SELECT PLAYER_ID FROM PLAYER_SESSION_MEMBERSHIP WHERE SESSION_ID = :session_id"
                cursor.execute(sql_get_players, session_id=session_id)
                player_ids_in_session = [row[0] for row in cursor.fetchall()]

                players_data = []
                for p_id in player_ids_in_session:
                    player_full_data = get_player_deck(p_id)
                    if player_full_data:
                        player_full_data.pop('hashed_password', None)
                        players_data.append({"player_id": p_id, "data": player_full_data})

        return jsonify({"session_id": session_id, "players": players_data}), 200
    except Exception as e:
        print(f"Error fetching session players: {e}")
        return jsonify({"error": f"Failed to fetch session players: {e}"}), 500


# --- NEW ENDPOINT FOR FRONTEND POLLING ---
@app.route('/api/player/pending_items', methods=['POST'])
def player_pending_items():
    data = request.json
    player_id = data.get('player_id')
    password = data.get('password')

    if not player_id or not password:
        return jsonify({"error": "Player ID and password are required"}), 400

    player_data = get_player_deck(player_id)
    if not player_data:
        return jsonify({"error": "Player not found"}), 404
    hashed_password = hash_password(password)
    if hashed_password != player_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password"}), 401

    return jsonify({
        "pending_booster_packs": player_data['pending_booster_packs'],
        "pending_cards": player_data['pending_cards']
    }), 200


@app.route('/api/dm/give_card', methods=['POST'])
def dm_give_card():
    data = request.json
    dm_player_id = data.get('dm_player_id')
    password = data.get('password')
    target_player_id = data.get('target_player_id')
    card_id = data.get('card_id')

    if not all([dm_player_id, password, target_player_id, card_id]):
        return jsonify({"error": "Missing DM ID, password, target player ID, or card ID"}), 400

    # Authenticate DM
    dm_data = get_player_deck(dm_player_id)
    if not dm_data:
        return jsonify({"error": "DM Player ID not found"}), 404
    hashed_password = hash_password(password)
    if hashed_password != dm_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password for DM"}), 401

    # Get target player's data
    target_player_data = get_player_deck(target_player_id)
    if not target_player_data:
        return jsonify({"error": f"Target player '{target_player_id}' not found."}), 404

    # Verify card_id exists in all_cards_data
    # Ensure all_cards_data is up-to-date
    global all_cards_data
    with app.test_client() as client:
        client.get('/api/cards')  # This will re-fetch and update all_cards_data from DB

    if not any(card['id'] == card_id for card in all_cards_data):
        return jsonify({"error": "Invalid card ID provided."}), 400

    # Add card to target player's unlocked collection and pending cards
    current_unlocked_ids = list(target_player_data['unlocked_collection_ids'])
    current_unlocked_ids.append(card_id)  # Allow duplicates

    current_pending_cards = list(target_player_data['pending_cards'])
    current_pending_cards.append(card_id)  # Add to pending list

    success = save_player_deck(target_player_id,
                               target_player_data['active_deck_instances'],
                               current_unlocked_ids,
                               target_player_data['character_level'],
                               target_player_data['wis_mod'],
                               target_player_data['int_mod'],
                               target_player_data['cha_mod'],
                               target_player_data['hashed_password'],
                               target_player_data['pending_booster_packs'],  # Preserve pending booster packs
                               current_pending_cards)  # Update pending cards

    if success:
        return jsonify({"message": f"Card '{card_id}' successfully given to player '{target_player_id}'."}), 200
    else:
        return jsonify({"error": "Failed to give card to player."}), 500


@app.route('/api/dm/give_booster', methods=['POST'])
def dm_give_booster():
    data = request.json
    dm_player_id = data.get('dm_player_id')
    password = data.get('password')
    target_player_id = data.get('target_player_id')
    pack_type = data.get('pack_type')  # e.g., "Common Pack", "Uncommon Pack", etc.

    if not all([dm_player_id, password, target_player_id, pack_type]):
        return jsonify({"error": "Missing DM ID, password, target player ID, or pack type"}), 400

    # Authenticate DM
    dm_data = get_player_deck(dm_player_id)
    if not dm_data:
        return jsonify({"error": "DM Player ID not found"}), 404
    hashed_password = hash_password(password)
    if hashed_password != dm_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password for DM"}), 401

    # Get target player's data
    target_player_data = get_player_deck(target_player_id)
    if not target_player_data:
        return jsonify({"error": f"Target player '{target_player_id}' not found."}), 404

    # Add the pack type to the target player's pending booster packs list
    current_pending_booster_packs = list(target_player_data['pending_booster_packs'])
    current_pending_booster_packs.append(pack_type)

    # Note: We are NOT generating cards here. Cards are generated when the player "opens" the pack.
    # The DM simply marks that a pack of a certain type has been given.

    success = save_player_deck(target_player_id,
                               target_player_data['active_deck_instances'],
                               target_player_data['unlocked_collection_ids'],  # Unlocked collection doesn't change here
                               target_player_data['character_level'],
                               target_player_data['wis_mod'],
                               target_player_data['int_mod'],
                               target_player_data['cha_mod'],
                               target_player_data['hashed_password'],
                               current_pending_booster_packs,  # Update pending booster packs
                               target_player_data['pending_cards'])  # Preserve pending cards

    if success:
        return jsonify({
            "message": f"Successfully marked a '{pack_type}' as pending for player '{target_player_id}'.",
            "pack_type": pack_type,
            "updated_pending_booster_packs": current_pending_booster_packs
        }), 200
    else:
        return jsonify({"error": "Failed to give booster pack to player."}), 500


# --- NEW DM Endpoint: Create Custom Card ---
@app.route('/api/dm/create_custom_card', methods=['POST'])
def dm_create_custom_card():
    global all_cards_data  # Declare intent to modify the global cache after DB update

    data = request.json
    dm_player_id = data.get('dm_player_id')
    password = data.get('password')
    card_data = data.get('card_data')

    if not dm_player_id or not password:
        return jsonify({"error": "DM Player ID and password are required"}), 400

    # Authenticate DM
    dm_data = get_player_deck(dm_player_id)
    if not dm_data:
        return jsonify({"error": "DM Player ID not found"}), 404
    hashed_password = hash_password(password)
    if hashed_password != dm_data.get('hashed_password'):
        return jsonify({"error": "Incorrect password for DM"}), 401

    if not card_data:
        return jsonify({"error": "Card data is required"}), 400

    # Basic validation for essential card fields
    required_fields = ["name", "type", "rarity", "description", "default_uses_per_rest"]
    if not all(field in card_data and card_data[field] is not None for field in required_fields):
        return jsonify({"error": "Missing required card fields"}), 400

    # Generate a unique ID for the custom card
    custom_card_id = "custom_" + str(uuid4())
    card_data['id'] = custom_card_id

    # Ensure optional fields have default values if not provided and standardize image_url
    card_data.setdefault('effect', None)
    card_data.setdefault('backlash_effect', None)

    # Set a default image URL if none is provided
    if not card_data.get('image_url'):
        card_data[
            'image_url'] = f"https://placehold.co/100x150/a8dadc/ffffff?text={card_data['name'].split('.')[0].replace(' ', '%20')}"

    try:
        with contextlib.closing(get_db_connection()) as connection:
            with contextlib.closing(connection.cursor()) as cursor:
                sql = """
                INSERT INTO CUSTOM_CARDS (ID, NAME, TYPE, DESCRIPTION, RARITY, DEFAULT_USES_PER_REST, IMAGE_URL, BACKLASH_EFFECT, EFFECT, CREATED_BY_DM)
                VALUES (:id, :name, :type, :description, :rarity, :default_uses_per_rest, :image_url, :backlash_effect, :effect, :created_by_dm)
                """
                bind_vars = {
                    'id': card_data['id'],
                    'name': card_data['name'],
                    'type': card_data['type'],
                    'description': card_data['description'],
                    'rarity': card_data['rarity'],
                    'default_uses_per_rest': card_data['default_uses_per_rest'],
                    'image_url': card_data['image_url'],
                    'backlash_effect': card_data['backlash_effect'],
                    'effect': card_data['effect'],
                    'created_by_dm': dm_player_id
                }
                cursor.execute(sql, bind_vars)
                connection.commit()

        # After successfully saving to DB, refresh the global cache
        # Calling get_cards will re-fetch all cards (base + custom) and update all_cards_data
        with app.test_client() as client:
            client.get('/api/cards')

        return jsonify({
            "message": f"Custom card '{card_data['name']}' created successfully!",
            "new_card_id": custom_card_id,
            "new_card_details": card_data  # Return the full card data including its new ID
        }), 201
    except Exception as e:
        print(f"Error creating custom card in DB: {e}")
        return jsonify({"error": f"Failed to create custom card: {e}"}), 500


if __name__ == '__main__':
    # Initial fetching of cards and DB setup
    init_db_pool()
    print("\nStarting Python Flask backend for Spell Trading Cards App (with DM features)...")
    print("API Endpoints:")
    print("  GET /api/status - Check backend status")
    print("  GET /api/cards - Get all available cards (including custom)")
    print("  POST /api/calculate_deck_size - Calculate max deck size")
    print("  POST /api/deck/create - Create player account (with initial cards)")
    print("  POST /api/deck/login - Authenticate and retrieve player deck and unlocked cards")
    print("  POST /api/deck/save - Save the player deck and unlocked cards")
    print("  POST /api/deck/open_booster - Open a booster pack to unlock new cards (includes custom cards)")
    print("  POST /api/card_used - Log a card usage event")
    print("  POST /api/player/open_pending_booster - Player opens a DM-given booster pack (includes custom cards)")
    print("  POST /api/player/accept_pending_card - Player accepts a DM-given card")
    print("  POST /api/player/pending_items - Player fetches only their pending items")
    print("\n--- DM Session Endpoints ---")
    print("  POST /api/dm/create_session - Create a new game session (DM only)")
    print("  POST /api/player/join_session - Player joins a game session")
    print("  POST /api/dm/my_sessions - DM views their active sessions")
    print("  POST /api/dm/sessions/<session_id>/players - DM views players in a specific session")
    print("  POST /api/dm/give_card - DM gives a specific card to a player")
    print("  POST /api/dm/give_booster - DM gives a specific booster pack to a player")
    print("  POST /api/dm/create_custom_card - DM creates a new custom card")  # NEW ENDPOINT
    app.run(host='0.0.0.0', port=5000)

