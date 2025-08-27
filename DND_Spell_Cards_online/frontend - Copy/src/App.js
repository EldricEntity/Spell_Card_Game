// dnd-spell-cards-app/frontend/src/App.js

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique keys for deck card instances

// IMPORTANT: Update this to your VM's Public IP address (or domain name if configured)
const API_BASE_URL = 'http://193.122.147.91:5000/api';

// Inline CSS for self-contained component
const AppStyles = `
    body {
        background-color: #f0e6d2;
        font-family: 'Inter', sans-serif;
        color: #333;
        margin: 0;
        padding: 0;
        line-height: 1.6;
    }

    .App {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        align-items: center;
        padding: 1rem;
        box-sizing: border-box;
    }

    .app-title {
        color: #2d3748;
        text-align: center;
        margin-bottom: 1.5rem;
        font-size: 2.5rem;
        font-weight: 700;
    }

    .login-container, .stats-container {
        background: #4a5568; /* Dark gray for a solid background */
        color: #e2e8f0; /* Light gray text */
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        display: flex;
        gap: 1rem;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        width: 100%;
        max-width: 1200px;
    }

    .login-container input {
        padding: 0.6rem 0.8rem;
        border-radius: 0.5rem;
        border: 1px solid #a0aec0;
        background: #e2e8f0;
        color: #2d3748;
        font-size: 1rem;
        flex-grow: 1;
        max-width: 180px;
    }

    .login-container button, .use-button, .reset-button, .remove-button, .select-button {
        background-color: #63b3ed; /* Blue button */
        color: white;
        padding: 0.75rem 1.25rem;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: bold;
        transition: background-color 0.3s ease, transform 0.2s ease;
        white-space: nowrap;
    }

    .login-container button:hover, .select-button:hover:not(:disabled) {
        background-color: #4299e1; /* Darker blue on hover */
        transform: translateY(-2px);
    }

    .select-button:disabled, .use-button:disabled {
        background-color: #cbd5e0;
        cursor: not-allowed;
        transform: none;
    }

    .stats-container {
        background: #2d3748;
        color: #e2e8f0;
    }

    .stats-container label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
    }

    .stats-container input {
        width: 4rem;
        padding: 0.25rem;
        border-radius: 0.5rem;
        border: none;
        background: #e2e8f0;
        color: #2d3748;
        text-align: center;
    }

    .stats-container p {
        margin: 0;
        padding: 0;
        font-size: 1rem;
    }

    .message-box {
        position: fixed;
        top: 1rem;
        left: 50%;
        transform: translateX(-50%);
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: bold;
        z-index: 1000; /* High z-index to appear above everything */
        animation: fadein 0.5s, fadeout 0.5s 2.5s;
        text-align: center;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .message-box.success {
        background-color: #48bb78; /* Green success color */
        color: white;
    }

    .message-box.error {
        background-color: #f56565; /* Red error color */
        color: white;
    }

    @keyframes fadein {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    @keyframes fadeout {
        from { opacity: 1; }
        to   { opacity: 0; }
    }

    .tab-navigation {
        display: flex;
        justify-content: center;
        width: 100%;
        max-width: 1200px;
        margin-bottom: 1.5rem;
        background-color: #e2e8f0;
        border-radius: 0.75rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        overflow: hidden; /* Ensures rounded corners */
    }

    .tab-item {
        flex: 1;
        text-align: center;
        padding: 1rem 1.5rem;
        cursor: pointer;
        font-weight: bold;
        color: #4a5568;
        background-color: #e2e8f0;
        transition: background-color 0.3s ease, color 0.3s ease;
        border-bottom: 3px solid transparent; /* For active indicator */
    }

    .tab-item:hover:not(.active) {
        background-color: #cbd5e0;
    }

    .tab-item.active {
        background-color: #63b3ed;
        color: white;
        border-bottom-color: #2b6cb0;
    }

    .main-content {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        width: 100%;
        max-width: 1200px;
        flex: 1; /* Allows content to take up remaining space */
    }

    .card-collection-panel, .built-deck-panel {
        background: #fdfaf5;
        border-radius: 0.75rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        padding: 1.5rem;
        flex: 1;
        min-width: 300px;
        display: flex;
        flex-direction: column;
    }

    .panel-title {
        text-align: center;
        color: #2c5282;
        margin-top: 0;
        margin-bottom: 1.5rem;
        font-size: 1.8rem;
    }

    .card-list, .deck-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
        flex-grow: 1;
    }

    .card-item {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        display: flex;
        flex-direction: column;
        text-align: center;
    }

    .card-item:hover.available-card {
        transform: translateY(-5px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        cursor: pointer;
    }

    .card-item.deck-card {
        background: #edf2f7; /* Lighter background for deck cards */
    }

    .card-image {
        max-width: 100%;
        height: auto;
        border-radius: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .card-name {
        font-weight: bold;
        font-size: 1.1rem;
        color: #2c5282;
        margin-bottom: 0.4rem;
    }

    .card-type {
        font-style: italic;
        color: #718096;
        margin-bottom: 0.5rem;
    }

    .card-description {
        font-size: 0.85rem;
        color: #4a5568;
        flex-grow: 1; /* Allows description to take up available space */
        margin-bottom: 0.75rem;
    }

    .card-meta, .card-uses {
        font-size: 0.8rem;
        color: #666;
        margin-bottom: 0.5rem;
    }

    .card-actions {
        margin-top: 0.75rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: center;
    }

    .use-button {
        background-color: #3182ce; /* Blue use button */
        color: white;
    }
    .use-button:hover:not(:disabled) {
        background-color: #2b6cb0;
        transform: translateY(-1px);
    }

    .reset-button {
        background-color: #68d391; /* Green reset button */
        color: white;
    }
    .reset-button:hover {
        background-color: #48bb78;
        transform: translateY(-1px);
    }

    .remove-button {
        background-color: #fc8181; /* Red remove button */
        color: white;
    }
    .remove-button:hover {
        background-color: #e53e3e;
        transform: translateY(-1px);
    }

    .empty-message, .pre-login-message {
        text-align: center;
        padding: 2rem;
        background: #e9e9e9;
        border-radius: 0.75rem;
        color: #555;
        font-style: italic;
        margin: 1rem;
    }

    .error-message {
        color: #e53e3e;
        background-color: #fed7d7;
        border: 1px solid #fc8181;
        padding: 0.75rem;
        border-radius: 0.5rem;
        text-align: center;
        margin-top: 1rem;
        font-weight: bold;
    }

    .highlight {
        color: #3182ce;
        font-weight: bold;
    }

    /* Responsive Adjustments */
    @media (max-width: 768px) {
        .main-content {
            flex-direction: column;
        }
        .login-container, .stats-container, .tab-navigation {
            flex-direction: column;
            align-items: stretch;
        }
        .login-container input {
            max-width: 100%;
        }
        .tab-item {
            border-bottom: none; /* No bottom border on stacked tabs */
            border-right: 3px solid transparent; /* Use right border for active indicator */
        }
        .tab-item.active {
            border-bottom-color: transparent;
            border-right-color: #2b6cb0;
        }
    }

    @media (max-width: 480px) {
        .app-title {
            font-size: 2rem;
        }
        .panel-title {
            font-size: 1.5rem;
        }
        .login-container button, .use-button, .reset-button, .remove-button, .select-button {
            width: 100%; /* Full width buttons on very small screens */
            padding: 0.6rem 1rem;
        }
        .card-list, .deck-list {
            grid-template-columns: 1fr; /* Single column layout for cards */
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
    const [selectedCards, setSelectedCards] = useState([]); // Cards currently in the player's deck (persistent)
    const [error, setError] = useState(''); // General error messages for UI

    // New states for login/auth
    const [playerId, setPlayerId] = useState('');
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(true); // Loading state for initial data fetch of allCards

    // New state for tab management
    const [activeTab, setActiveTab] = useState('available'); // 'available' or 'deck'

    // --- Helper function to display messages ---
    const showMessage = useCallback((text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
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
            setSelectedCards(data.cards || []);
            setCharacterLevel(data.character_level !== undefined ? data.character_level : 1);
            setWisMod(data.wis_mod !== undefined ? data.wis_mod : 0);
            setIntMod(data.int_mod !== undefined ? data.int_mod : 0);
            setChaMod(data.cha_mod !== undefined ? data.cha_mod : 0);
            setIsAuthenticated(true);
            setActiveTab('deck'); // Automatically switch to the deck tab after login

            showMessage('Login successful! Deck loaded.', 'success');
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
                    cards: selectedCards,
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

            showMessage('Deck and stats saved successfully!', 'success');
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

    // --- Deck Building Logic: Add Card ---
    const handleAddCardToDeck = useCallback((card) => {
        if (!isAuthenticated) {
            showMessage("You must be logged in to build a deck.", "error");
            return;
        }
        if (selectedCards.length >= maxDeckSize) {
            showMessage('Deck is full! Remove cards to add new ones.', 'error');
            return;
        }

        const cantripCountInDeck = selectedCards.filter(c => c.type === 'Cantrip').length;
        if (card.type !== 'Cantrip' && cantripCountInDeck === 0 && selectedCards.length === 0) {
             showMessage('Your deck must contain at least one Cantrip! Add a Cantrip first.', 'error');
             return;
        }

        setSelectedCards(prev => [...prev, {
            ...card,
            instance_id: uuidv4(),
            current_uses: card.default_uses_per_rest
        }]);
        showMessage('Card added to your deck!', 'success');
    }, [isAuthenticated, maxDeckSize, selectedCards, showMessage]);

    // --- Deck Building Logic: Remove Card ---
    const handleRemoveCardFromDeck = useCallback((instance_id) => {
        const updatedDeck = selectedCards.filter(card => card.instance_id !== instance_id);
        const cantripCount = updatedDeck.filter(c => c.type === 'Cantrip').length;

        if (cantripCount === 0 && updatedDeck.length > 0) {
            showMessage('Your deck must contain at least one Cantrip! You cannot remove the last one.', 'error');
            return;
        }
        setSelectedCards(updatedDeck);
        showMessage('Card removed from deck.', 'success');
    }, [selectedCards, showMessage]);

    // --- Card Usage Logic: Mark Card as Used ---
    const handleMarkCardUsed = useCallback(async (instance_id) => {
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
    }, [selectedCards, showMessage]);

    // --- Card Usage Logic: Reset Card Uses (Long Rest) ---
    const handleResetCardUses = useCallback((instance_id) => {
        setSelectedCards(prev =>
            prev.map(card =>
                card.instance_id === instance_id ? { ...card, current_uses: card.default_uses_per_rest } : card
            )
        );
        showMessage('Card uses reset!', 'success');
    }, [showMessage]);

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
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button onClick={handleLoginAndLoadDeck}>Log In</button>
                    <button onClick={handleCreateAccount}>Create Account</button>
                    {isAuthenticated && <button onClick={handleSaveDeck}>Save Deck</button>}
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
                        Available Spells
                    </div>
                    <div 
                        className={`tab-item ${activeTab === 'deck' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('deck')}
                    >
                        Your Deck ({selectedCards.length}/{maxDeckSize})
                    </div>
                </div>

                {/* Main Content Area - Conditional Rendering based on activeTab */}
                <div className="main-content">
                    {/* Available Cards Section */}
                    {activeTab === 'available' && (
                        <div className="card-collection-panel">
                            <h2 className="panel-title">Available Spells</h2>
                            {loading ? (
                                <p className="empty-message">Loading cards...</p>
                            ) : allCards.length > 0 ? (
                                <div className="card-list">
                                    {allCards.map((card) => (
                                        <div key={card.id} className="card-item available-card" onClick={() => handleAddCardToDeck(card)}>
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
                                                onClick={(e) => { e.stopPropagation(); handleAddCardToDeck(card); }} // Stop propagation to prevent parent onClick
                                                disabled={!isAuthenticated || selectedCards.length >= maxDeckSize}
                                                className="select-button"
                                            >
                                                Add to Deck
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="empty-message">No cards available. Please check the backend data source.</p>
                            )}
                        </div>
                    )}

                    {/* Built Deck Section */}
                    {activeTab === 'deck' && (
                        <div className="built-deck-panel">
                            <h2 className="panel-title">Your Deck ({selectedCards.length}/{maxDeckSize})</h2>
                            <div className="deck-list">
                                {isAuthenticated ? (
                                    selectedCards.length === 0 ? (
                                        <p className="empty-message">Select cards from the "Available Spells" tab to build your deck!</p>
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
