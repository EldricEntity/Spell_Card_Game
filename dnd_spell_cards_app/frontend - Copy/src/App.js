// dnd-spell-cards-app/frontend/src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique keys for deck card instances

// IMPORTANT: Update this to your VM's Public IP address (or domain name if configured)
// When running locally against your local Flask, it's 'http://127.0.0.1:5000/api'.
// When running React locally against Flask on VM, it's 'http://YOUR_VM_PUBLIC_IP:5000/api'.
const API_BASE_URL = 'http://193.122.147.91:5000/api';


function App() {
    // --- State Variables ---
    const [allCards, setAllCards] = useState([]); // All cards fetched from the backend (master list)
    const [characterLevel, setCharacterLevel] = useState(1);
    const [wisMod, setWisMod] = useState(0);
    const [intMod, setIntMod] = useState(0);
    const [chaMod, setChaMod] = useState(0);
    const [maxDeckSize, setMaxDeckSize] = useState(0);
    const [selectedCards, setSelectedCards] = useState([]); // Cards currently in the player's deck (persistent)
    const [error, setError] = useState(''); // General error messages for UI
    const [loading, setLoading] = useState(true); // Loading state for initial data fetch
    const [isDataLoaded, setIsDataLoaded] = useState(false); // State to track if initial data fetch is complete

    // Ref to prevent initial useEffect for saving deck from firing (no longer the primary mechanism for save)
    const isInitialMount = useRef(true);

    // --- Helper function to save the current deck state to the backend ---
    const saveDeckToBackend = useCallback(async (currentDeck, currentLevel, currentWisMod, currentIntMod, currentChaMod) => {
        console.log("DEBUG: saveDeckToBackend called with currentDeck:", currentDeck);
        console.log("DEBUG: Sending character stats to backend:", { currentLevel, currentWisMod, currentIntMod, currentChaMod });
        try {
            const response = await fetch(`${API_BASE_URL}/deck`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cards: currentDeck,
                    character_level: currentLevel,
                    wis_mod: currentWisMod,
                    int_mod: currentIntMod,
                    cha_mod: currentChaMod,
                }), // Send the entire deck array AND character stats
            });
            if (!response.ok) {
                // Parse error response if available for more specific message
                const errorData = await response.json().catch(() => ({ message: 'No error message from server.' }));
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
            }
            const data = await response.json();
            console.log('Deck and stats saved to backend:', data.message);
        } catch (err) {
            setError('Failed to save deck and stats: ' + err.message);
            console.error('Error saving deck and stats to backend:', err);
        }
    }, []); // Dependencies are now passed as arguments. setError is stable.

    // --- Effect to Fetch All Cards AND Player Deck/Stats from Backend on Component Mount ---
    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch master list of all cards
                const cardsResponse = await fetch(`${API_BASE_URL}/cards`);
                if (!cardsResponse.ok) {
                    throw new Error(`HTTP error fetching cards! status: ${cardsResponse.status}`);
                }
                const cardsData = await cardsResponse.json();
                setAllCards(cardsData);

                // Fetch player's saved deck and character stats
                const deckResponse = await fetch(`${API_BASE_URL}/deck`);
                if (!deckResponse.ok) {
                    throw new Error(`HTTP error fetching deck! status: ${deckResponse.status}`);
                }
                const deckAndStatsData = await deckResponse.json();

                console.log("DEBUG: Deck and stats loaded from backend:", deckAndStatsData);

                // CRITICAL: Ensure deckAndStatsData.cards is always an array, default to empty array if null/undefined
                setSelectedCards(deckAndStatsData.cards || []); // Load the saved deck, default to empty array
                setCharacterLevel(deckAndStatsData.character_level !== undefined ? deckAndStatsData.character_level : 1);
                setWisMod(deckAndStatsData.wis_mod !== undefined ? deckAndStatsData.wis_mod : 0);
                setIntMod(deckAndStatsData.int_mod !== undefined ? deckAndStatsData.int_mod : 0);
                setChaMod(deckAndStatsData.cha_mod !== undefined ? deckAndStatsData.cha_mod : 0);

                // CRITICAL: Set this AFTER all data is loaded into state
                setIsDataLoaded(true);

            } catch (err) {
                setError('Failed to fetch initial data: ' + err.message);
                console.error('Error fetching initial data:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []); // Empty dependency array, this effect runs only once on mount

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

    // --- Effect to Save Deck and Stats to Backend whenever relevant state changes ---
    useEffect(() => {
        // CRITICAL: ONLY save if initial data has finished loading.
        // This prevents saving default/empty state on the very first render/load.
        if (!isDataLoaded) {
            console.log("DEBUG: Skipping saveDeckToBackend - initial data not yet loaded.");
            return;
        }

        console.log("DEBUG: useEffect triggered for state change (after initial load). Current selectedCards:", selectedCards, "Level:", characterLevel);
        saveDeckToBackend(selectedCards, characterLevel, wisMod, intMod, chaMod);
    }, [selectedCards, characterLevel, wisMod, intMod, chaMod, saveDeckToBackend, isDataLoaded]); // Add isDataLoaded to dependencies


    // --- Deck Building Logic: Add Card ---
    const handleAddCardToDeck = (card) => {
        if (selectedCards.length >= maxDeckSize) {
            setError('Deck is full! Remove cards to add new ones.');
            return;
        }

        const cantripCountInDeck = selectedCards.filter(c => c.type === 'Cantrip').length;
        if (card.type !== 'Cantrip' && cantripCountInDeck === 0 && selectedCards.length === 0) {
             setError('Your deck must contain at least one Cantrip! Add a Cantrip first.');
             return;
        }

        setSelectedCards(prev => [...prev, {
            ...card,
            instance_id: uuidv4(),
            current_uses: card.default_uses_per_rest
        }]);
        setError('');
    };

    // --- Deck Building Logic: Remove Card ---
    const handleRemoveCardFromDeck = (instance_id) => {
        const updatedDeck = selectedCards.filter(card => card.instance_id !== instance_id);
        const cantripCount = updatedDeck.filter(c => c.type === 'Cantrip').length;

        if (cantripCount === 0 && updatedDeck.length > 0) {
            setError('Your deck must contain at least one Cantrip! You cannot remove the last one.');
            return;
        }
        setSelectedCards(updatedDeck);
        setError('');
    };

    // --- Card Usage Logic: Mark Card as Used ---
    const handleMarkCardUsed = async (instance_id) => {
        const cardToUse = selectedCards.find(card => card.instance_id === instance_id);
        if (!cardToUse) return;

        if (cardToUse.current_uses > 0) {
            setSelectedCards(prev =>
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
                        card_name: cardToUse.name,
                        card_type: cardToUse.type,
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
                setError('Failed to notify backend of card usage for logging: ' + err.message);
                console.error('Error sending card used notification:', err);
            }
        } else {
            setError(`"${cardToUse.name}" has no uses left! It needs a long rest.`);
        }
    };

    // --- Card Usage Logic: Reset Card Uses (Long Rest) ---
    const handleResetCardUses = (instance_id) => {
        setSelectedCards(prev =>
            prev.map(card =>
                card.instance_id === instance_id ? { ...card, current_uses: card.default_uses_per_rest } : card
            )
        );
        setError('');
    };

    // --- Conditional Rendering for Loading/Error States ---
    if (loading) {
        return <div className="app-container">Loading cards...</div>;
    }

    if (error && !loading) {
        return <div className="error-message">{error}</div>;
    }

    // --- Main Component Render ---
    return (
        <div className="app-container">
            <h1 className="app-title">Spell Trading Cards Manager</h1>

            {/* Character Stats Input Panel */}
            <div className="character-stats-panel">
                <h2 className="panel-title">Character Stats</h2>
                <div className="input-group">
                    <label htmlFor="charLevel">Level:</label>
                    <input
                        id="charLevel"
                        type="number"
                        value={characterLevel}
                        onChange={(e) => setCharacterLevel(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="wisMod">WIS Mod:</label>
                    <input
                        id="wisMod"
                        type="number"
                        value={wisMod}
                        onChange={(e) => setWisMod(parseInt(e.target.value) || 0)}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="intMod">INT Mod:</label>
                    <input
                        id="intMod"
                        type="number"
                        value={intMod}
                        onChange={(e) => setIntMod(parseInt(e.target.value) || 0)}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="chaMod">CHA Mod:</label>
                    <input
                        id="chaMod"
                        type="number"
                        value={chaMod}
                        onChange={(e) => setChaMod(parseInt(e.target.value) || 0)}
                    />
                </div>
                <div className="deck-summary">
                    Max Deck Size: <span className="highlight">{maxDeckSize}</span> | Current Deck: <span className="highlight">{selectedCards.length}</span>
                </div>
                {error && <div className="error-message">{error}</div>}
            </div>

            <div className="main-content">
                {/* Available Cards Section */}
                <div className="card-collection-panel">
                    <h2 className="panel-title">Available Spells</h2>
                    <div className="card-list">
                        {allCards.map((card) => (
                            <div key={card.id} className="card-item available-card">
                                <img
                                    src={`https://placehold.co/100x150/a8dadc/ffffff?text=${card.name.split('.')[0].replace('_', '%20')}`}
                                    alt={card.name}
                                    className="card-image"
                                    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x150/cccccc/333333?text=Image%20Error"; }}
                                />
                                <h3 className="card-name">{card.name} ({card.type})</h3>
                                <p className="card-description">{card.description}</p>
                                <p className="card-meta">Rarity: {card.rarity}</p>
                                <button
                                    onClick={() => handleAddCardToDeck(card)}
                                    disabled={selectedCards.length >= maxDeckSize}
                                    className="select-button"
                                >
                                    Add to Deck
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Built Deck Section */}
                <div className="built-deck-panel">
                    <h2 className="panel-title">Your Deck ({selectedCards.length}/{maxDeckSize})</h2>
                    <div className="deck-list">
                        {selectedCards.length === 0 ? (
                            <p className="empty-message">Select cards from the left to build your deck!</p>
                        ) : (
                            selectedCards.map((card) => (
                                <div key={card.instance_id} className="card-item deck-card">
                                    <img
                                        src={`https://placehold.co/100x150/a8dadc/ffffff?text=${card.name.split('.')[0].replace('_', '%20')}`}
                                        alt={card.name}
                                        className="card-image"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x150/cccccc/333333?text=Image%20Error"; }}
                                    />
                                    <h3 className="card-name">{card.name} ({card.type})</h3>
                                    <p className="card-description">{card.description}</p>
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
