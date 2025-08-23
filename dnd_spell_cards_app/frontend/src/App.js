// dnd-spell-cards-app/frontend/src/App.js

import React, { useState, useEffect } from 'react';
import './App.css'; // Make sure this line is present for styling

// Define the base URL for your Python backend
// IMPORTANT: Ensure this matches the port your Flask app is running on (default is 5000)
const API_BASE_URL = 'http://127.0.0.1:5000/api';

function App() {
  const [cards, setCards] = useState([]); // State to hold your fetched cards
  const [loading, setLoading] = useState(true); // State to indicate data loading
  const [error, setError] = useState(null); // State to handle any fetch errors

  // useEffect hook to fetch data when the component mounts
  useEffect(() => {
    async function fetchCards() {
      try {
        // Make a GET request to your Flask backend's /api/cards endpoint
        const response = await fetch(`${API_BASE_URL}/cards`);

        // Check if the network request was successful
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the JSON response
        const data = await response.json();
        setCards(data); // Update the state with the fetched cards
      } catch (err) {
        setError(err.message); // Set an error message if something goes wrong
        console.error("Failed to fetch cards:", err);
      } finally {
        setLoading(false); // End loading regardless of success or failure
      }
    }

    fetchCards(); // Call the async function
  }, []); // The empty dependency array means this effect runs once after the initial render

  if (loading) {
    return <div className="app-container">Loading cards...</div>;
  }

  if (error) {
    return <div className="app-container">Error: {error}</div>;
  }

  return (
    <div className="app-container">
      <h1 className="app-title">D&D Spell Cards</h1>
      <div className="card-list">
        {cards.length > 0 ? (
          cards.map(card => (
            <div key={card.id} className="card-item">
              {/* Using a placeholder image for now. You'll replace this with your actual PNGs */}
              <img
                src={`https://placehold.co/100x150/a8dadc/ffffff?text=${card.name.replace(' ', '%20')}`}
                alt={card.name}
                className="card-image"
                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x150/cccccc/333333?text=Image%20Error"; }}
              />
              <h3 className="card-name">{card.name}</h3>
              <p className="card-type">Type: {card.type}</p>
              <p className="rarity">Rarity: {card.rarity}</p>
            </div>
          ))
        ) : (
          <p>No cards available. Check your backend!</p>
        )}
      </div>
    </div>
  );
}

export default App;