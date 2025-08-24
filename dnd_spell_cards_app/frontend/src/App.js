// dnd-spell-cards-app/frontend/src/App.js

import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique keys for deck card instances

const API_BASE_URL = 'http://127.0.0.1:5000/api'; // Ensure this matches your Flask port

function App() {
    // --- State Variables ---
    const [allCards, setAllCards] = useState([]); // All cards fetched from the backend
    const [characterLevel, setCharacterLevel] = useState(1);
    const [wisMod, setWisMod] = useState(0);
    const [intMod, setIntMod] = useState(0);
    const [chaMod, setChaMod] = useState(0);
    const [maxDeckSize, setMaxDeckSize] = useState(0);
    const [selectedCards, setSelectedCards] = useState([]); // Cards currently in the player's deck
    const [error, setError] = useState(''); // General error messages for UI
    const [loading, setLoading] = useState(true); // Loading state for initial data fetch

    // --- Effect to Fetch All Cards from Backend on Component Mount ---
    const fetchAllCards = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/cards`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Store the raw cards from the backend
            setAllCards(data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch cards: ' + err.message);
            setLoading(false);
            console.error('Error fetching cards:', err);
        }
    }, []);

    useEffect(() => {
        fetchAllCards();
    }, [fetchAllCards]);

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

        // Ensure all character stats are valid numbers before making the API call
        if (!isNaN(characterLevel) && !isNaN(wisMod) && !isNaN(intMod) && !isNaN(chaMod)) {
            calculateDeckSize();
        }
    }, [characterLevel, wisMod, intMod, chaMod]); // Dependencies: recalculate if any of these change

    // --- Deck Building Logic: Add Card ---
    const handleAddCardToDeck = (card) => {
        // 1. Check if the deck is already full
        if (selectedCards.length >= maxDeckSize) {
            setError('Deck is full! Remove cards to add new ones.');
            return;
        }

        // 2. Enforce the rule: deck must contain at least one Cantrip.
        // If the deck is currently empty AND the card being added is NOT a Cantrip, prevent addition.
        const cantripCountInDeck = selectedCards.filter(c => c.type === 'Cantrip').length;
        if (card.type !== 'Cantrip' && cantripCountInDeck === 0 && selectedCards.length === 0) {
            setError('Your deck must contain at least one Cantrip! Add a Cantrip first.');
            return;
        }

        // Add the card to the deck. Assign a unique instance_id for tracking uses,
        // and initialize current_uses from its default_uses_per_rest.
        setSelectedCards(prev => [...prev, {
            ...card,
            instance_id: uuidv4(), // Unique ID for this specific card instance in the deck
            current_uses: card.default_uses_per_rest // Initialize current uses based on default
        }]);
        setError(''); // Clear any previous error message
    };

    // --- Deck Building Logic: Remove Card ---
    const handleRemoveCardFromDeck = (instance_id) => {
        const updatedDeck = selectedCards.filter(card => card.instance_id !== instance_id);
        const cantripCount = updatedDeck.filter(c => c.type === 'Cantrip').length;

        // Prevent removing the last cantrip if there are still other cards in the deck
        if (cantripCount === 0 && updatedDeck.length > 0) {
            setError('Your deck must contain at least one Cantrip! You cannot remove the last one.');
            return;
        }
        setSelectedCards(updatedDeck);
        setError(''); // Clear any previous error message
    };

    // --- Card Usage Logic: Mark Card as Used ---
    const handleMarkCardUsed = async (instance_id) => {
        const cardToUse = selectedCards.find(card => card.instance_id === instance_id);
        if (!cardToUse) return; // Should not happen if UI is correct

        if (cardToUse.current_uses > 0) {
            // Optimistically update frontend state
            setSelectedCards(prev =>
                prev.map(card =>
                    card.instance_id === instance_id ? { ...card, current_uses: card.current_uses - 1 } : card
                )
            );

            // Notify backend about the card usage for logging purposes.
            // This is where you demonstrate the client-server communication and backend logging.
            try {
                const response = await fetch(`${API_BASE_URL}/card_used`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        card_name: cardToUse.name,
                        card_type: cardToUse.type,
                        deck_card_id: cardToUse.instance_id // Send the unique instance ID
                    }),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Backend notification:', data.message);
                console.log('Simulated System Log Entry from Backend:', data.log_entry);
                // Check your Python terminal for the detailed log output!
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
        setError(''); // Clear any related error message
    };

    // --- Conditional Rendering for Loading/Error States ---
    if (loading) {
        return <div className="app-container">Loading cards...</div>;
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
                {error && <div className="error-message">{error}</div>} {/* Display general errors here */}
            </div>

            <div className="main-content">
                {/* Available Cards Section */}
                <div className="card-collection-panel">
                    <h2 className="panel-title">Available Spells</h2>
                    <div className="card-list">
                        {allCards.map((card) => (
                            <div key={card.id} className="card-item available-card">
                                {/* FIXED: More robust image source with optional chaining and fallback */}
                             
                                <img
                                    src={`https://placehold.co/100x150/a8dadc/ffffff?text=${encodeURIComponent(card.name)}`}
                                    alt={card.name}
                                    className="card-image"
                                    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x150/cccccc/333333?text=Image%20Error"; }}
                                />
                                <h3 className="card-name">{card.name} ({card.type})</h3>
                                <p className="card-description">{card.description}</p>
                                <p className="card-meta">Rarity: {card.rarity}</p>
                                <button
                                    onClick={() => handleAddCardToDeck(card)}
                                    // Disable button if deck is full
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
                                    {/* FIXED: More robust image source with optional chaining and fallback */}
                                    <img
                                        src={`https://placehold.co/100x150/a8dadc/ffffff?text=${encodeURIComponent(card.name)}`}
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
                                            disabled={card.current_uses <= 0} // Disable if no uses left
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