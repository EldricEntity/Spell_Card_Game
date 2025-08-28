// dnd-spell-cards-app/frontend/src/App.js

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique keys for deck card instances

// IMPORTANT: Update this to your VM's Public IP address (or domain name if configured)
const API_BASE_URL = 'http://193.122.147.91:5000/api';

// Inline CSS for self-contained component
const AppStyles = `
    /* Import Google Fonts for a D&D feel */
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Merriweather:wght@400;700&display=swap');

    body {
        background-color: #3b2f2f; /* Dark brown background, like a closed grimoire */
        font-family: 'Merriweather', serif; /* Readable serif for body text */
        color: #5a4b4b; /* Darker, faded text */
        margin: 0;
        padding: 0;
        line-height: 1.6;
    }

    .App {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        align-items: center;
        padding: 1.5rem; /* Increased padding */
        box-sizing: border-box;
        /* --- NEW WOODEN FLOOR TEXTURE --- */
        background-image: url('/images/wooden-floor.jpg'); 
        background-size: cover;
        background-position: center; /* Center the background image */
        background-attachment: fixed;
        border: 10px solid #4a3e3c; /* Thick, dark border for the "book" effect */
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); /* Deep shadow for depth */
        margin: 1rem; /* Margin to show body background */
        border-radius: 1rem; /* Slightly rounded edges for the book */
    }

    .app-title {
        font-family: 'Cinzel', serif; /* Ornate font for title */
        color: #8c6e4e; /* Gold/parchment color */
        text-align: center;
        margin-bottom: 2rem;
        font-size: 3.2rem; /* Larger title */
        font-weight: 700;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6); /* Text shadow for depth */
    }

    .login-container, .stats-container {
        background: #6a5d5a; /* Muted stone/dark wood color */
        color: #f5f5dc; /* Off-white for readability */
        padding: 1.8rem; /* More padding */
        margin-bottom: 2rem;
        border-radius: 0.8rem;
        box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4), 0 4px 15px rgba(0, 0, 0, 0.3); /* Inset shadow for carved look */
        display: flex;
        gap: 1.2rem;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        width: 100%;
        max-width: 1000px; /* Slightly narrower */
        border: 2px solid #4a3e3c; /* Matching dark border */
    }

    .login-container input {
        padding: 0.8rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid #8c6e4e; /* Goldish border */
        background: #e9dcc9; /* Parchment background */
        color: #3b2f2f; /* Dark text */
        font-family: 'Merriweather', serif;
        font-size: 1.1rem;
        flex-grow: 1;
        max-width: 200px;
    }

    .login-container button, .use-button, .reset-button, .remove-button, .select-button, .booster-button {
        background-color: #8c6e4e; /* Gold/bronze button */
        color: #f5f5dc; /* Off-white text */
        padding: 0.8rem 1.5rem;
        border: 2px solid #5a4b4b; /* Darker edge */
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: bold;
        transition: background-color 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease;
        white-space: nowrap;
        font-family: 'Cinzel', serif; /* Thematic button font */
        text-transform: uppercase;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    .login-container button:hover, .select-button:hover:not(:disabled), .booster-button:hover:not(:disabled) {
        background-color: #a38b6d; /* Lighter gold on hover */
        transform: translateY(-3px); /* More pronounced lift */
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
    }

    .select-button:disabled, .use-button:disabled, .booster-button:disabled {
        background-color: #5a4b4b; /* Muted disabled color */
        color: #a0a0a0;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .stats-container {
        background: #5a4b4b; /* Darker tone for stats */
        color: #f5f5dc;
        padding: 1.8rem;
    }

    .stats-container label {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-weight: 700;
        font-family: 'Cinzel', serif;
    }

    .stats-container input {
        width: 5rem; /* Wider input */
        padding: 0.4rem;
        border-radius: 0.4rem;
        border: 1px solid #8c6e4e;
        background: #e9dcc9;
        color: #3b2f2f;
        text-align: center;
        font-family: 'Merriweather', serif;
    }

    .stats-container p {
        margin: 0;
        padding: 0;
        font-size: 1.1rem;
        font-weight: 700;
    }

    .message-box {
        position: fixed;
        top: 2rem; /* Lowered position */
        left: 50%;
        transform: translateX(-50%);
        padding: 0.9rem 1.8rem;
        border-radius: 0.6rem;
        font-weight: bold;
        z-index: 1000;
        animation: fadein 0.5s, fadeout 0.5s 4.5s; /* Longer display */
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        font-family: 'Cinzel', serif;
        text-transform: uppercase;
    }

    .message-box.success {
        background-color: #488c5d; /* Darker green */
        color: white;
    }

    .message-box.error {
        background-color: #a33b3b; /* Darker red */
        color: white;
    }

    .message-box.info {
        background-color: #6a5d5a;
        color: #f5f5dc;
    }

    @keyframes fadein {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    @keyframes fadeout {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to   { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }

    .tab-navigation {
        display: flex;
        justify-content: center;
        width: 100%;
        max-width: 1000px;
        margin-bottom: 2rem;
        background-color: #5a4b4b; /* Darker tab background */
        border-radius: 0.8rem;
        box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
        overflow: hidden;
        border: 2px solid #4a3e3c;
    }

    .tab-item {
        flex: 1;
        text-align: center;
        padding: 1.2rem 1.8rem; /* More generous padding */
        cursor: pointer;
        font-weight: bold;
        color: #e9dcc9; /* Parchment text */
        background-color: #5a4b4b;
        transition: background-color 0.3s ease, color 0.3s ease;
        border-bottom: 4px solid transparent; /* Thicker active indicator */
        font-family: 'Cinzel', serif;
        text-transform: uppercase;
    }

    .tab-item:hover:not(.active) {
        background-color: #6a5d5a; /* Slightly lighter on hover */
    }

    .tab-item.active {
        background-color: #8c6e4e; /* Gold active tab */
        color: white;
        border-bottom-color: #a38b6d; /* Lighter gold accent */
    }

    .main-content {
        display: flex;
        flex-wrap: wrap;
        gap: 2rem; /* Increased gap */
        width: 100%;
        max-width: 1000px;
        flex: 1;
    }

    .card-collection-panel, .built-deck-panel {
        background: #e9dcc9; /* Parchment background for panels */
        border-radius: 0.8rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        padding: 2rem; /* More padding */
        flex: 1;
        min-width: 320px; /* Slightly larger min-width */
        display: flex;
        flex-direction: column;
        border: 2px solid #8c6e4e; /* Gold border */
    }

    .panel-title {
        font-family: 'Cinzel', serif;
        text-align: center;
        color: #3b2f2f; /* Dark text for title */
        margin-top: 0;
        margin-bottom: 2rem;
        font-size: 2.2rem; /* Larger panel title */
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
    }

    .card-list, .deck-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); /* Larger cards */
        gap: 1.5rem; /* Increased gap */
        flex-grow: 1;
    }

    .card-item {
        background: #fdf6e6; /* Lighter parchment for individual cards */
        border: 1px solid #d3c4a2; /* Faded parchment border */
        border-radius: 0.6rem;
        padding: 1.2rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        display: flex;
        flex-direction: column;
        text-align: center;
        font-family: 'Merriweather', serif;
    }

    .card-item:hover.available-card {
        transform: translateY(-7px); /* More dramatic lift */
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
        cursor: pointer;
    }

    .card-item.deck-card {
        background: #e9dcc9; /* Muted parchment for deck cards */
        border: 1px solid #8c6e4e; /* Goldish border for deck cards */
    }

    .card-image {
        max-width: 100%;
        height: auto;
        border-radius: 0.4rem;
        margin-bottom: 1rem;
        border: 1px solid #8c6e4e; /* Gold frame for image */
    }

    .card-name {
        font-family: 'Cinzel', serif;
        font-weight: 700;
        font-size: 1.25rem;
        color: #3b2f2f;
        margin-bottom: 0.6rem;
    }

    .card-type {
        font-style: italic;
        color: #5a4b4b;
        margin-bottom: 0.7rem;
        font-size: 0.95rem;
    }

    .card-description {
        font-size: 0.9rem;
        color: #4a3e3c;
        flex-grow: 1;
        margin-bottom: 1rem;
    }

    .card-meta, .card-uses {
        font-size: 0.85rem;
        color: #5a4b4b;
        margin-bottom: 0.6rem;
    }
    
    .card-meta span {
        font-weight: bold;
        color: #3b2f2f;
    }

    .card-actions {
        margin-top: 1rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        justify-content: center;
    }

    .use-button {
        background-color: #4a6d8c; /* Muted blue for use */
        color: white;
    }
    .use-button:hover:not(:disabled) {
        background-color: #3a5c78;
        transform: translateY(-2px);
    }

    .reset-button {
        background-color: #5a8c4a; /* Muted green for reset */
        color: white;
    }
    .reset-button:hover {
        background-color: #4a783a;
        transform: translateY(-2px);
    }

    .remove-button {
        background-color: #8c4a4a; /* Muted red for remove */
        color: white;
    }
    .remove-button:hover {
        background-color: #783a3a;
        transform: translateY(-2px);
    }

    .empty-message, .pre-login-message {
        text-align: center;
        padding: 2.5rem;
        background: #d3c4a2; /* Lighter parchment */
        border-radius: 0.8rem;
        color: #5a4b4b;
        font-style: italic;
        margin: 1.5rem;
        border: 1px solid #8c6e4e;
        box-shadow: inset 0 1px 5px rgba(0, 0, 0, 0.2);
    }

    .error-message {
        color: #a33b3b;
        background-color: #fce2e2;
        border: 1px solid #a33b3b;
        padding: 0.8rem;
        border-radius: 0.6rem;
        text-align: center;
        margin-top: 1.5rem;
        font-weight: bold;
        font-family: 'Merriweather', serif;
    }

    .highlight {
        color: #4a6d8c; /* Muted blue highlight */
        font-weight: bold;
    }

    .booster-pack-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px dashed #8c6e4e; /* Dashed gold separator */
        width: 100%;
    }

    .booster-pack-section button {
        margin-top: 1.5rem;
    }

    .new-cards-display {
        margin-top: 1.5rem;
        padding: 1.5rem;
        background: #d3c4a2;
        border-radius: 0.6rem;
        text-align: center;
        width: 100%;
        max-width: 450px;
        border: 1px solid #8c6e4e;
        box-shadow: inset 0 1px 5px rgba(0, 0, 0, 0.2);
        font-family: 'Merriweather', serif;
    }
    .new-cards-display h4 {
        font-family: 'Cinzel', serif;
        color: #3b2f2f;
        margin-bottom: 0.8rem;
        font-size: 1.2rem;
    }
    .new-cards-display ul {
        list-style-type: none;
        padding: 0;
        margin: 0;
    }
    .new-cards-display li {
        margin-bottom: 0.3rem;
        color: #4a3e3c;
        font-size: 0.95rem;
    }

    /* Responsive Adjustments */
    @media (max-width: 768px) {
        .App {
            padding: 1rem;
            margin: 0.5rem;
        }
        .app-title {
            font-size: 2.5rem;
        }
        .main-content {
            flex-direction: column;
            gap: 1.5rem;
        }
        .login-container, .stats-container, .tab-navigation, .booster-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 0.8rem;
            padding: 1.2rem;
        }
        .login-container input {
            max-width: 100%;
        }
        .tab-item {
            border-bottom: none;
            border-right: 4px solid transparent;
            padding: 1rem;
        }
        .tab-item.active {
            border-bottom-color: transparent;
            border-right-color: #a38b6d;
        }
        .panel-title {
            font-size: 1.8rem;
        }
        .card-list, .deck-list {
            grid-template-columns: 1fr;
            gap: 1.2rem;
        }
        .card-item {
            padding: 1rem;
        }
    }

    @media (max-width: 480px) {
        .app-title {
            font-size: 2rem;
        }
        .panel-title {
            font-size: 1.5rem;
        }
        .login-container button, .use-button, .reset-button, .remove-button, .select-button, .booster-button {
            width: 100%;
            padding: 0.6rem 1rem;
        }
    }
`;

function App() {
    // --- State Variables ---
    const [allCards, setAllCards] = useState([]); // All cards fetched from the backend (master list)
    const [characterLevel, setCharacterLevel] = useState(1);
    const [wisMod, setWisMod] = useState(0);
    const [intMod, setIntMod] = useState(0);
    const [chaMod, setChaMod] = useState(0);
    const [maxDeckSize, setMaxDeckSize] = useState(0);
    const [activeDeckInstances, setActiveDeckInstances] = useState([]); // Cards currently in the player's ACTIVE deck (persistent instances)
    const [unlockedCollectionIds, setUnlockedCollectionIds] = useState([]); // IDs of all UNIQUE card types the player HAS UNLOCKED (owned pool)
    const [error, setError] = useState(''); // General error messages for UI

    // New states for login/auth
    const [playerId, setPlayerId] = useState('');
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(true); // Loading state for initial data fetch of allCards

    // New state for tab management
    const [activeTab, setActiveTab] = useState('available'); // 'available' or 'deck'

    // State for newly acquired cards from booster packs
    const [newlyAcquiredCards, setNewlyAcquiredCards] = useState([]);
    const [lastOpenedPackType, setLastOpenedPackType] = useState('');
    const [prePackUnlockedIds, setPrePackUnlockedIds] = useState([]); // Store state before opening pack for duplicate check


    // --- Helper function to display messages ---
    const showMessage = useCallback((text, type) => {
        setMessage({ text, type });
        // Clear message after 5 seconds for info, 3 seconds for others
        const duration = type === 'info' ? 5000 : 3000;
        setTimeout(() => setMessage({ text: '', type: '' }), duration);
    }, []);

    // --- API Call: Create Account ---
    const handleCreateAccount = async () => {
        if (!playerId || !password) {
            showMessage('Player ID and password are required to create an account.', 'error');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/deck/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, password }),
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create account.');
            }
            
            showMessage('Account created successfully! You can now log in.', 'success');
        } catch (err) {
            console.error('Error creating account:', err);
            showMessage(`Failed to create account: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- API Call: Login and Load Deck ---
    const handleLoginAndLoadDeck = async () => {
        if (!playerId || !password) {
            showMessage('Player ID and password are required to log in.', 'error');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/deck/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed.');
            }

            // Load data from backend upon successful login
            setActiveDeckInstances(data.active_deck_instances || []); // Load active deck instances
            setUnlockedCollectionIds(data.unlocked_collection_ids || []); // Load unlocked card IDs (now includes duplicates)
            setCharacterLevel(data.character_level !== undefined ? data.character_level : 1);
            setWisMod(data.wis_mod !== undefined ? data.wis_mod : 0);
            setIntMod(data.int_mod !== undefined ? data.int_mod : 0);
            setChaMod(data.cha_mod !== undefined ? data.cha_mod : 0);
            setIsAuthenticated(true);
            setActiveTab('deck'); // Automatically switch to the deck tab after login

            showMessage('Login successful! Deck and unlocked cards loaded.', 'success');
        } catch (err) {
            setIsAuthenticated(false);
            console.error('Error logging in:', err);
            showMessage(`Failed to load deck: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- API Call: Save Deck ---
    const handleSaveDeck = async () => {
        if (!isAuthenticated) {
            showMessage('You must be logged in to save your deck.', 'error');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/deck/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_id: playerId,
                    password: password, // Send password for re-validation on backend
                    active_deck_instances: activeDeckInstances, // Save active deck instances
                    unlocked_collection_ids: unlockedCollectionIds, // Save unlocked card IDs (now includes duplicates)
                    character_level: characterLevel,
                    wis_mod: wisMod,
                    int_mod: intMod,
                    cha_mod: chaMod,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save deck.');
            }

            showMessage('Deck and unlocked cards saved successfully!', 'success');
        } catch (err) {
            console.error('Error saving deck:', err);
            showMessage(`Failed to save deck: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Effect to Fetch All Cards on Component Mount ---
    useEffect(() => {
        const fetchAllCards = async () => {
            setLoading(true);
            try {
                const cardsResponse = await fetch(`${API_BASE_URL}/cards`);
                if (!cardsResponse.ok) {
                    throw new Error(`HTTP error fetching cards! status: ${cardsResponse.status}`);
                }
                const cardsData = await cardsResponse.json();
                setAllCards(cardsData);
            } catch (err) {
                console.error('Error fetching initial data:', err);
                showMessage('Failed to fetch initial data: ' + err.message, 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchAllCards();
    }, [showMessage]); // Empty dependency array, this effect runs only once on mount

    // --- Effect to Calculate Max Deck Size when Character Stats Change ---
    useEffect(() => {
        const calculateDeckSize = async () => {
            setError(''); // Clear previous errors related to deck size
            try {
                const response = await fetch(`${API_BASE_URL}/calculate_deck_size`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        character_level: characterLevel,
                        wis_mod: wisMod,
                        int_mod: intMod,
                        cha_mod: chaMod,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setMaxDeckSize(data.max_deck_size);
            } catch (err) {
                setError('Failed to calculate deck size: ' + err.message);
                console.error('Error calculating deck size:', err);
            }
        };

        if (!isNaN(characterLevel) && !isNaN(wisMod) && !isNaN(intMod) && !isNaN(chaMod)) {
            calculateDeckSize();
        }
    }, [characterLevel, wisMod, intMod, chaMod]);

    // --- Booster Pack Logic: Open a new pack ---
    const handleOpenBoosterPack = async () => {
        if (!isAuthenticated) {
            showMessage("You must be logged in to open booster packs.", "error");
            return;
        }
        setLoading(true); // Indicate loading while opening pack
        setNewlyAcquiredCards([]); // Clear previous new cards display
        setLastOpenedPackType('');
        setPrePackUnlockedIds(unlockedCollectionIds); // Store current collection for duplicate check

        try {
            const response = await fetch(`${API_BASE_URL}/deck/open_booster`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, password: password }), // Backend determines pack size
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to open booster pack.');
            }

            setLastOpenedPackType(data.pack_type);

            if (data.new_cards && data.new_cards.length > 0) {
                // Update the unlockedCollectionIds state with the new IDs (now including duplicates)
                setUnlockedCollectionIds(data.updated_unlocked_collection_ids || []);
                setNewlyAcquiredCards(data.new_cards); // Store new cards for display
                showMessage(`You opened a ${data.pack_type} and acquired ${data.new_cards.length} cards!`, 'success');
            } else {
                showMessage(data.message || "No new cards were found in the booster pack.", 'info');
            }
        } catch (err) {
            console.error('Error opening booster pack:', err);
            showMessage(`Failed to open booster pack: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };


    // --- Deck Building Logic: Add Card ---
    const handleAddCardToDeck = useCallback((card) => {
        if (!isAuthenticated) {
            showMessage("You must be logged in to build a deck.", "error");
            return;
        }
        if (activeDeckInstances.length >= maxDeckSize) {
            showMessage('Deck is full! Remove cards to add new ones.', 'error');
            return;
        }
        
        // --- FIX: Count available copies vs. copies in active deck ---
        const ownedCopiesOfThisCard = unlockedCollectionIds.filter(id => id === card.id).length;
        const copiesInActiveDeck = activeDeckInstances.filter(c => c.id === card.id).length;

        if (copiesInActiveDeck >= ownedCopiesOfThisCard) {
            showMessage(`You have already added all owned copies of ${card.name} to your deck. Open more booster packs to get more!`, 'error');
            return;
        }

        const cantripCountInDeck = activeDeckInstances.filter(c => c.type === 'Cantrip').length;
        if (card.type !== 'Cantrip' && cantripCountInDeck === 0 && activeDeckInstances.length === 0) {
             showMessage('Your deck must contain at least one Cantrip! Add a Cantrip first.', 'error');
             return;
        }

        // Add a new instance of the card to the active deck
        setActiveDeckInstances(prev => [...prev, {
            ...card,
            instance_id: uuidv4(), // Assign a unique ID for this specific copy in the active deck
            current_uses: card.default_uses_per_rest
        }]);
        showMessage('Card added to your deck!', 'success');
    }, [isAuthenticated, maxDeckSize, activeDeckInstances, unlockedCollectionIds, showMessage]);

    // --- Deck Building Logic: Remove Card ---
    const handleRemoveCardFromDeck = useCallback((instance_id) => {
        const updatedDeck = activeDeckInstances.filter(card => card.instance_id !== instance_id);
        const cantripCount = updatedDeck.filter(c => c.type === 'Cantrip').length;

        if (cantripCount === 0 && updatedDeck.length > 0) {
            showMessage('Your deck must contain at least one Cantrip! You cannot remove the last one.', 'error');
            return;
        }
        setActiveDeckInstances(updatedDeck);
        showMessage('Card removed from deck.', 'success');
    }, [activeDeckInstances, showMessage]);

    // --- Card Usage Logic: Mark Card as Used ---
    const handleMarkCardUsed = useCallback(async (instance_id) => {
        const cardToUse = activeDeckInstances.find(card => card.instance_id === instance_id);
        if (!cardToUse) return;

        if (cardToUse.current_uses > 0) {
            setActiveDeckInstances(prev =>
                prev.map(card =>
                    card.instance_id === instance_id ? { ...card, current_uses: card.current_uses - 1 } : card
                )
            );

            // Notify backend about the card usage for logging purposes.
            try {
                const response = await fetch(`${API_BASE_URL}/card_used`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: cardToUse.name, // Use 'name' to match backend's 'card_name' expectation
                        type: cardToUse.type, // Use 'type' to match backend's 'card_type' expectation
                        deck_card_id: cardToUse.instance_id
                    }),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Backend notification:', data.message);
                console.log('Simulated System Log Entry from Backend:', data.log_entry);
            } catch (err) {
                showMessage('Failed to notify backend of card usage for logging: ' + err.message, 'error');
                console.error('Error sending card used notification:', err);
            }
        } else {
            showMessage(`"${cardToUse.name}" has no uses left! It needs a long rest.`, 'error');
        }
    }, [activeDeckInstances, showMessage]);

    // --- Card Usage Logic: Reset Card Uses (Long Rest) ---
    const handleResetCardUses = useCallback((instance_id) => {
        setActiveDeckInstances(prev =>
            prev.map(card =>
                card.instance_id === instance_id ? { ...card, current_uses: card.default_uses_per_rest } : card
            )
        );
        showMessage('Card uses reset!', 'success');
    }, [showMessage]);

    // Filter available cards based on what the player has unlocked
    // And also count how many copies of each unique card ID the player owns
    const filteredAvailableCardsWithCounts = allCards
        .filter(card => unlockedCollectionIds.includes(card.id)) // Only show cards of types user has unlocked
        .reduce((acc, card) => {
            // Group by card ID and count occurrences
            if (!acc[card.id]) {
                const count = unlockedCollectionIds.filter(id => id === card.id).length;
                acc[card.id] = { ...card, owned_copies: count };
            }
            return acc;
        }, {});
    
    const uniqueUnlockedCards = Object.values(filteredAvailableCardsWithCounts);


    // --- Main Component Render ---
    return (
        <>
            <style>{AppStyles}</style>
            <div className="App">
                <h1 className="app-title">Spell Trading Cards Manager</h1>

                {/* Login/Auth Section */}
                <div className="login-container">
                    <input
                        type="text"
                        placeholder="Player ID"
                        value={playerId}
                        onChange={(e) => setPlayerId(e.target.value)}
                        disabled={loading}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                    <button onClick={handleLoginAndLoadDeck} disabled={loading}>Log In</button>
                    <button onClick={handleCreateAccount} disabled={loading}>Create Account</button>
                    {isAuthenticated && <button onClick={handleSaveDeck} disabled={loading}>Save Deck</button>}
                </div>

                {/* Character Stats Input Panel */}
                <div className="stats-container">
                    <label>Level: <input type="number" value={characterLevel} onChange={(e) => setCharacterLevel(Math.max(1, parseInt(e.target.value) || 1))} min="1" max="20" /></label>
                    <label>WIS Mod: <input type="number" value={wisMod} onChange={(e) => setWisMod(parseInt(e.target.value) || 0)} /></label>
                    <label>INT Mod: <input type="number" value={intMod} onChange={(e) => setIntMod(parseInt(e.target.value) || 0)} /></label>
                    <label>CHA Mod: <input type="number" value={chaMod} onChange={(e) => setChaMod(parseInt(e.target.value) || 0)} /></label>
                    <p>Max Deck Size: <span className="highlight">{maxDeckSize}</span></p>
                </div>

                {/* Message Box */}
                {message.text && <div className={`message-box ${message.type}`}>{message.text}</div>}

                {/* Tab Navigation */}
                <div className="tab-navigation">
                    <div 
                        className={`tab-item ${activeTab === 'available' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('available')}
                    >
                        Available Spells ({uniqueUnlockedCards.length} Types / {unlockedCollectionIds.length} Total Owned)
                    </div>
                    <div 
                        className={`tab-item ${activeTab === 'deck' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('deck')}
                    >
                        Your Deck ({activeDeckInstances.length}/{maxDeckSize})
                    </div>
                </div>

                {/* Main Content Area - Conditional Rendering based on activeTab */}
                <div className="main-content">
                    {/* Available Cards Section */}
                    {activeTab === 'available' && (
                        <div className="card-collection-panel">
                            <h2 className="panel-title">Available Spells</h2>
                            {loading && <p className="empty-message">Loading cards...</p>}
                            {!isAuthenticated && !loading && (
                                <div className="pre-login-message">
                                    <h3>Log in to see your available spells.</h3>
                                </div>
                            )}
                            {isAuthenticated && !loading && uniqueUnlockedCards.length > 0 && (
                                <div className="card-list">
                                    {uniqueUnlockedCards.map((card) => (
                                        <div key={card.id} className="card-item available-card" onClick={() => handleAddCardToDeck(card)}>
                                            <img
                                                src={`https://placehold.co/100x150/a8dadc/ffffff?text=${card.name.split('.')[0].replace('_', '%20')}`}
                                                alt={card.name}
                                                className="card-image"
                                                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x150/cccccc/333333?text=Image%20Error"; }}
                                            />
                                            <h3 className="card-name">{card.name} ({card.type})</h3>
                                            <p className="card-description">{card.description}</p>
                                            <p className="card-meta">Rarity: <span>{card.rarity}</span></p>
                                            <p className="card-meta">Owned Copies: <span>{card.owned_copies}</span></p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAddCardToDeck(card); }} // Stop propagation to prevent parent onClick
                                                // Disable button if deck is full OR if all owned copies are already in the deck
                                                disabled={activeDeckInstances.length >= maxDeckSize || 
                                                            activeDeckInstances.filter(c => c.id === card.id).length >= card.owned_copies}
                                                className="select-button"
                                            >
                                                Add to Deck
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isAuthenticated && !loading && (
                                <div className="booster-pack-section">
                                    {uniqueUnlockedCards.length === 0 && (
                                        <p className="empty-message">You haven't unlocked any unique spell types yet! Open a booster pack to get started.</p>
                                    )}
                                    <button 
                                        onClick={handleOpenBoosterPack} 
                                        disabled={loading}
                                        className="booster-button"
                                    >
                                        Open Booster Pack
                                    </button>
                                    {newlyAcquiredCards.length > 0 && (
                                        <div className="new-cards-display">
                                            <h4>Newly Acquired Cards from {lastOpenedPackType}:</h4>
                                            <ul>
                                                {newlyAcquiredCards.map((card, index) => (
                                                    <li key={card.id + "-new-" + index}> {/* Use unique key for each new card */}
                                                        {card.name} ({card.type}, {card.rarity})
                                                        {prePackUnlockedIds.includes(card.id) && <span> (Duplicate)</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Built Deck Section */}
                    {activeTab === 'deck' && (
                        <div className="built-deck-panel">
                            <h2 className="panel-title">Your Deck ({activeDeckInstances.length}/{maxDeckSize})</h2>
                            <div className="deck-list">
                                {isAuthenticated ? (
                                    activeDeckInstances.length === 0 ? (
                                        <p className="empty-message">Select cards from the "Available Spells" tab to build your deck!</p>
                                    ) : (
                                        activeDeckInstances.map((card) => (
                                            <div key={card.instance_id} className="card-item deck-card">
                                                <img
                                                    src={`https://placehold.co/100x150/a8dadc/ffffff?text=${card.name.split('.')[0].replace('_', '%20')}`}
                                                    alt={card.name}
                                                    className="card-image"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x150/cccccc/333333?text=Image%20Error"; }}
                                                />
                                                <h3 className="card-name">{card.name} ({card.type})</h3>
                                                <p className="card-description">{card.description}</p>
                                                <p className="card-meta">Rarity: <span>{card.rarity}</span></p>
                                                <p className="card-uses">Uses Left: {card.current_uses}/{card.default_uses_per_rest}</p>
                                                <div className="card-actions">
                                                    <button
                                                        onClick={() => handleMarkCardUsed(card.instance_id)}
                                                        disabled={card.current_uses <= 0}
                                                        className="use-button"
                                                    >
                                                        Use
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetCardUses(card.instance_id)}
                                                        className="reset-button"
                                                    >
                                                        Reset Uses
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveCardFromDeck(card.instance_id)}
                                                        className="remove-button"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )
                                ) : (
                                    <div className="pre-login-message">
                                        <h3>Please log in to load your character and spell deck.</h3>
                                        <p>Once logged in, your deck and stats will appear here.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default App;
