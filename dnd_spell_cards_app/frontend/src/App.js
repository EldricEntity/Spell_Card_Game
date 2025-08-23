// dnd-spell-cards-app/frontend/src/App.js

import React, { useState, useEffect } from 'react';
import './App.css'; // Make sure this line is present for styling

// Define the base URL for your Python backend
// IMPORTANT: Ensure this matches the port your Flask app is running on (default is 5000)
const API_BASE_URL = 'http://127.0.0.1:5000/api';

function App() {
  // All useState calls at the top level
  const [cards, setCards] = useState([]); // State to hold your fetched cards
  const [loading, setLoading] = useState(true); // State to indicate data loading
  const [error, setError] = useState(null); // State to handle any fetch errors

  // New state variables for character stats
  const [characterLevel, setCharacterLevel] = useState(1);
  const [wisMod, setWisMod] = useState(0);
  const [intMod, setIntMod] = useState(0);
  const [chaMod, setChaMod] = useState(0);
  const [maxDeckSize, setMaxDeckSize] = useState(0); // State for calculated deck size

  // All useEffect calls at the top level, BEFORE any conditional returns or main JSX return

  // Effect to Fetch Cards when the component mounts
  useEffect(() => {
    async function fetchCards() {
      try {
        const response = await fetch(`${API_BASE_URL}/cards`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setCards(data);
      } catch (err) {
        setError(err.message);
        console.error("Failed to fetch cards:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCards();
  }, []); // The empty dependency array means this effect runs once after the initial render

  // Effect to Calculate Max Deck Size when character stats change
  useEffect(() => {
    async function calculateDeckSize() {
      setError(null); // Clear previous errors
      try {
        const response = await fetch(`${API_BASE_URL}/calculate_deck_size`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
        setMaxDeckSize(data.max_deck_size); // Update state with the calculated size
      } catch (err) {
        setError('Failed to calculate deck size: ' + err.message);
        console.error('Error calculating deck size:', err);
      }
    }

    // This check ensures we only try to calculate if characterLevel is a valid number,
    // avoiding unnecessary calls with NaN or undefined, but the Hook itself is still at top level.
    if (!isNaN(characterLevel) && !isNaN(wisMod) && !isNaN(intMod) && !isNaN(chaMod)) {
      calculateDeckSize();
    }
  }, [characterLevel, wisMod, intMod, chaMod]); // Recalculate whenever any stat changes

  // Conditional Returns (MUST come AFTER all Hook calls)
  if (loading) {
    return <div className="app-container">Loading cards...</div>;
  }

  if (error) {
    return <div className="app-container">Error: {error}</div>;
  }

  // Main Render Return (MUST come AFTER all Hook calls and conditional returns)
  return (
    <div className="app-container">
      <h1 className="app-title">D&D Spell Cards</h1>

      {/* Character Stats Input Section */}
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
          Max Deck Size: <span className="highlight">{maxDeckSize}</span>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>

      <hr/> {/* Horizontal line for visual separation */}

      {/* Available Cards Section */}
      <div className="card-collection-panel">
        <h2 className="panel-title">Available Spells</h2>
        <div className="card-list">
          {cards.length > 0 ? (
            cards.map(card => (
              <div key={card.id} className="card-item">
                <img
                  src={`https://placehold.co/100x150/a8dadc/ffffff?text=${card.name.replace(' ', '%20')}`}
                  alt={card.name}
                  className="card-image"
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x150/cccccc/333333?text=Image%20Error"; }}
                />
                <h3 className="card-name">{card.name}</h3>
                <p className="card-type">Type: {card.type}</p>
                <p className="rarity">Rarity: {card.rarity}</p>
                {/* Add a button here later to add to deck */}
              </div>
            ))
          ) : (
            <p className="empty-message">No cards available. Check your backend!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;