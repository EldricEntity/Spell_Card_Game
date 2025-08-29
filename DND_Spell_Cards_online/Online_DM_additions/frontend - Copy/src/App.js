// dnd-spell-cards-app/frontend/src/App.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique keys for deck card instances

// IMPORTANT: Update this to your VM's Public IP address (or domain name if configured)
const API_BASE_URL = 'http://193.122.147.91:5000/api';

// Inline CSS for self-contained component
const AppStyles = `
    /* Import Google Fonts for a D&D feel */
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Merriweather:400;700&display=swap');

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

    .login-container, .stats-container, .dm-section-panel, .player-notification-area, .booster-pack-section, .player-filters-sort-search { /* Added .player-filters-sort-search */
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

    .login-container input, .dm-section-panel input, .dm-section-panel select, .player-filters-sort-search input, .player-filters-sort-search select,
    .dm-card-creator-form input, .dm-card-creator-form select, .dm-card-creator-form textarea { /* Added custom card creator inputs */
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
    .dm-card-creator-form textarea {
        min-height: 100px; /* Larger text area for descriptions */
        max-width: none; /* Allow textarea to take full width */
        resize: vertical;
    }


    .login-container button, .use-button, .reset-button, .remove-button, .select-button, .booster-button, .dm-section-panel button, .player-notification-area button {
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

    .login-container button:hover, .select-button:hover:not(:disabled), .booster-button:hover:not(:disabled), .dm-section-panel button:hover:not(:disabled), .player-notification-area button:hover:not(:disabled) {
        background-color: #a38b6d; /* Lighter gold on hover */
        transform: translateY(-3px); /* More pronounced lift */
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
    }

    .select-button:disabled, .use-button:disabled, .booster-button:disabled, .dm-section-panel button:disabled, .player-notification-area button:disabled {
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

    /* Player's Available Spells panel - now scrollable */
    .card-collection-panel {
        max-height: 700px; /* Fixed height for scrolling */
        overflow-y: auto; /* Enable vertical scrolling */
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
    
    .card-backlash {
        font-family: 'Merriweather', serif;
        font-size: 0.85rem;
        color: #a33b3b; /* Red color for backlash effect */
        margin-bottom: 0.5rem;
        font-weight: bold;
        text-transform: uppercase;
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
        margin-bottom: 0.7rem; /* Adjusted margin */
    }

    .card-effect {
        font-size: 0.9rem;
        color: #4a6d8c; /* Blue color for effect */
        margin-bottom: 0.7rem; /* Adjusted margin */
        font-style: italic;
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

    /* Booster pack section on Player side - now has its own styling for layout */
    .booster-pack-section {
        flex-direction: column;
        align-items: center;
        padding-top: 1.8rem; /* Use the same padding as other panels */
        border-top: 2px solid #4a3e3c; /* Consistent border */
        width: 100%;
        max-width: 1000px;
        margin-top: 0; /* Adjusted since it's now a separate block */
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

    /* DM Screen Specific Styles */
    .dm-screen-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 1000px;
        gap: 1.5rem;
    }

    .dm-sub-nav {
        display: flex;
        justify-content: center;
        background-color: #5a4b4b;
        border-radius: 0.8rem;
        box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
        overflow: hidden;
        border: 2px solid #4a3e3c;
    }

    .dm-sub-nav-item {
        flex: 1;
        text-align: center;
        padding: 1rem 1.5rem;
        cursor: pointer;
        font-weight: bold;
        color: #e9dcc9;
        background-color: #5a4b4b;
        transition: background-color 0.3s ease, color 0.3s ease;
        border-bottom: 3px solid transparent;
        font-family: 'Cinzel', serif;
        text-transform: uppercase;
        font-size: 0.95rem;
    }

    .dm-sub-nav-item:hover:not(.active) {
        background-color: #6a5d5a;
    }

    .dm-sub-nav-item.active {
        background-color: #8c6e4e;
        color: white;
        border-bottom-color: #a38b6d;
    }

    .dm-section-panel {
        flex-direction: column;
        align-items: stretch;
        gap: 1.5rem;
        max-width: none; /* Override max-width for full panel use */
    }

    .dm-session-list ul, .dm-player-list ul, .dm-card-distribution-list ul, .player-notification-area ul {
        list-style-type: none;
        padding: 0;
        margin: 0;
    }

    .dm-session-list li, .dm-player-list li, .dm-card-distribution-list li, .player-notification-area li {
        background: #d3c4a2;
        padding: 0.8rem 1.2rem;
        margin-bottom: 0.5rem;
        border-radius: 0.4rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: 'Merriweather', serif;
        color: #3b2f2f;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .dm-session-list li:hover, .dm-player-list li:hover:not(.no-hover), .dm-card-distribution-list li:hover, .player-notification-area li:hover {
        background-color: #c9bda5;
    }

    .dm-player-id {
        font-weight: bold;
        color: #4a6d8c;
    }

    .dm-player-view-details {
        display: flex;
        flex-wrap: wrap;
        gap: 2rem;
        margin-top: 1.5rem;
    }

    .dm-player-stats-panel, .dm-player-deck-panel, .dm-player-collection-panel { /* Added .dm-player-collection-panel */
        flex: 1;
        min-width: 300px;
        background: #fdf6e6;
        border-radius: 0.6rem;
        padding: 1.5rem;
        box-shadow: inset 0 1px 5px rgba(0,0,0,0.2);
        border: 1px solid #8c6e4e;
        color: #3b2f2f;
    }
    .dm-player-stats-panel h4, .dm-player-deck-panel h4, .dm-player-collection-panel h4 { /* Added .dm-player-collection-panel */
        font-family: 'Cinzel', serif;
        font-size: 1.3rem;
        margin-top: 0;
        margin-bottom: 1rem;
        color: #3b2f2f;
        text-align: center;
    }
    .dm-player-stats-panel p {
        margin-bottom: 0.5rem;
    }
    .dm-player-stats-panel span {
        font-weight: bold;
        color: #4a6d8c;
    }
    
    /* DM's player deck/collection cards are smaller */
    .dm-player-deck-panel .card-list,
    .dm-player-collection-panel .card-list {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); /* Smaller cards for DM view */
    }

    /* New style for scrollable collection panel */
    .dm-player-collection-panel {
        max-height: 500px; /* Fixed height for scrolling */
        overflow-y: auto; /* Enable vertical scrolling */
        min-width: 320px; /* Ensure it doesn't get too small */
        flex: 1; /* Allow it to grow, but respect max-height */
    }

    .dm-distribution-controls {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px dashed #8c6e4e;
        align-items: center;
    }

    .dm-distribution-controls .input-group {
        display: flex;
        gap: 0.8rem;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
    }

    .dm-card-distribution-list {
        margin-top: 1rem;
        max-height: 400px; /* Constrain height */
        overflow-y: auto; /* Enable scrolling */
        border: 1px solid #8c6e4e;
        border-radius: 0.6rem;
        background: #d3c4a2;
        padding: 0.5rem;
    }
    .dm-card-distribution-list li {
        cursor: default; /* No hover effect for these list items */
        background: #e9dcc9;
    }
    .dm-card-distribution-list li .card-name {
        margin: 0;
        font-size: 1rem;
        font-weight: normal;
    }
    .dm-card-distribution-list li button {
        padding: 0.4rem 0.8rem;
        font-size: 0.8rem;
    }

    /* Player Notification Area specific styling */
    .player-notification-area {
        flex-direction: column;
        align-items: stretch;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #8c6e4e;
        background: #a38b6d; /* Lighter gold for notifications */
        color: #3b2f2f;
    }
    .player-notification-area h3 {
        color: #3b2f2f;
        margin-bottom: 1rem;
        font-family: 'Cinzel', serif;
        text-align: center;
    }
    .player-notification-area li {
        background: #fdf6e6; /* Parchment background for individual notifications */
        border: 1px solid #8c6e4e;
        margin-bottom: 0.8rem;
    }
    .player-notification-area li button {
        padding: 0.6rem 1rem;
        font-size: 0.9rem;
    }
    .player-notification-area .notification-text {
        font-weight: bold;
        flex-grow: 1;
        margin-right: 1rem;
    }



    /* DM Toggle Specific Styles */
    .dm-toggle-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-left: 1rem; /* Adjust positioning as needed */
        font-family: 'Merriweather', serif;
        color: #f5f5dc;
        font-weight: bold;
        white-space: nowrap;
    }

    .dm-toggle-switch {
        position: relative;
        display: inline-block;
        width: 48px; /* Wider switch */
        height: 28px; /* Taller switch */
    }

    .dm-toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .dm-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: 0.4s;
        border-radius: 28px; /* More rounded */
    }

    .dm-slider:before {
        position: absolute;
        content: "";
        height: 20px; /* Smaller circle */
        width: 20px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
    }

    input:checked + .dm-slider {
        background-color: #8c6e4e; /* Gold when checked */
    }

    input:focus + .dm-slider {
        box-shadow: 0 0 1px #8c6e4e;
    }

    input:checked + .dm-slider:before {
        transform: translateX(20px); /* Move further */
    }

    /* --- SCROLLBAR THEMEING --- */
    /* For Webkit browsers (Chrome, Safari, Edge) */
    ::-webkit-scrollbar {
        width: 12px; /* Width of the vertical scrollbar */
        height: 12px; /* Height of the horizontal scrollbar */
    }

    ::-webkit-scrollbar-track {
        background: #5a4b4b; /* Darker track color, matching muted stone */
        border-radius: 10px;
    }

    ::-webkit-scrollbar-thumb {
        background: #8c6e4e; /* Gold/bronze thumb color */
        border-radius: 10px;
        border: 2px solid #6a5d5a; /* Slightly darker border for depth */
    }

    ::-webkit-scrollbar-thumb:hover {
        background: #a38b6d; /* Lighter gold on hover */
    }

    /* For Firefox */
    html {
        scrollbar-width: thin; /* 'auto' | 'thin' | 'none' */
        scrollbar-color: #8c6e4e #5a4b4b; /* thumb-color track-color */
    }

    /* New styles for player filters/sort/search section */
    .player-filters-sort-search {
        display: flex;
        flex-direction: row; /* Horizontal layout for filters */
        gap: 1rem;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap; /* Allow wrapping on smaller screens */
    }
    .player-filters-sort-search label {
        color: #f5f5dc;
        font-family: 'Merriweather', serif;
        font-weight: bold;
        white-space: nowrap;
    }
    .player-filters-sort-search input,
    .player-filters-sort-search select {
        flex-grow: 0; /* Don't force these to grow too much */
        width: auto;
        min-width: 120px;
    }

    /* Styles for card notes textarea */
    .card-note-textarea {
        width: 100%;
        min-height: 80px;
        padding: 0.5rem;
        border-radius: 0.4rem;
        border: 1px solid #d3c4a2;
        background: #fdf6e6;
        color: #3b2f2f;
        font-family: 'Merriweather', serif;
        font-size: 0.9rem;
        margin-top: 0.8rem;
        resize: vertical; /* Allow vertical resizing */
    }
    .card-note-textarea:focus {
        outline: none;
        border-color: #8c6e4e; /* Gold highlight on focus */
        box-shadow: 0 0 0 2px rgba(140, 110, 78, 0.4);
    }

    /* Styles for DM Card Creator Form */
    .dm-card-creator-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        max-width: 600px; /* Constrain width for better form readability */
        margin: 0 auto; /* Center the form */
    }
    .dm-card-creator-form label {
        display: flex;
        flex-direction: column;
        color: #f5f5dc;
        font-weight: bold;
        font-family: 'Merriweather', serif;
        margin-bottom: 0.5rem;
    }
    .dm-card-creator-form input,
    .dm-card-creator-form select,
    .dm-card-creator-form textarea {
        max-width: none; /* Override default max-width to allow these to fill form container */
        width: 100%; /* Ensure full width within the form's max-width */
        box-sizing: border-box; /* Include padding and border in the element's total width and height */
    }
    .dm-card-creator-form .input-group-inline { /* For elements that should be on one line */
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap; /* Allow wrapping for smaller screens */
    }
    .dm-card-creator-form .input-group-inline label {
        margin-bottom: 0; /* Remove extra margin for inline labels */
    }
    .dm-card-creator-form button {
        margin-top: 1rem;
        align-self: center; /* Center the button */
    }


    /* Responsive Adjustments (ensure DM screen is also responsive) */
    @media (max-width: 768px) {
        .dm-sub-nav {
            flex-direction: column;
        }
        .dm-sub-nav-item {
            border-bottom: none;
            border-right: 3px solid transparent;
        }
        .dm-sub-nav-item.active {
            border-bottom-color: transparent;
            border-right-color: #a38b6d;
        }
        .dm-player-view-details {
            flex-direction: column;
        }
        .login-container {
            flex-direction: column;
            align-items: stretch;
        }
        .dm-toggle-container {
            margin-left: 0;
            margin-top: 1rem;
            justify-content: center;
            order: -1; /* Move toggle to top in mobile view */
        }
        .login-container input {
            max-width: 100%;
        }
        .dm-distribution-controls .input-group {
            flex-direction: column;
        }
        .dm-section-panel input, .dm-section-panel select {
             max-width: 100%;
        }
        .card-collection-panel { /* Adjust player collection panel for mobile */
            max-height: 500px;
        }
        .player-filters-sort-search {
            flex-direction: column;
            align-items: stretch;
            gap: 0.8rem;
        }
        .player-filters-sort-search input,
        .player-filters-sort-search select {
            max-width: 100%;
        }
        .dm-card-creator-form .input-group-inline {
            flex-direction: column;
            align-items: stretch;
        }
        .dm-card-creator-form .input-group-inline label {
            width: 100%;
        }
    }
    @media (max-width: 480px) {
        .dm-sub-nav-item {
            padding: 0.8rem 1rem;
            font-size: 0.85rem;
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
    const [activeTab, setActiveTab] = useState('available'); // 'available', 'deck', or 'dm_screen'

    // State for newly acquired cards from booster packs
    const [newlyAcquiredCards, setNewlyAcquiredCards] = useState([]);
    const [lastOpenedPackType, setLastOpenedPackType] = useState('');
    const [prePackUnlockedIds, setPrePackUnlockedIds] = useState([]); // Store state before opening pack for duplicate check

    // --- DM/SESSION STATES ---
    const [isDMMode, setIsDMMode] = useState(false); // New state for DM mode toggle
    const [sessionNameInput, setSessionNameInput] = useState('');
    const [sessionCodeInput, setSessionCodeInput] = useState('');
    const [dmSessions, setDmSessions] = useState([]); // Sessions created by THIS DM
    const [selectedDmSession, setSelectedDmSession] = useState(null); // The session the DM is currently viewing
    const [playersInSelectedDmSession, setPlayersInSelectedDmSession] = useState([]); // Players in the selected DM session
    const [selectedPlayerForDMView, setSelectedPlayerForDMView] = useState(null); // The specific player DM is inspecting
    const [selectedPlayerDMData, setSelectedPlayerDMData] = useState(null); // Full card data for the inspected player
    const [activeDmTab, setActiveDmTab] = useState('my_sessions'); // 'create_session', 'my_sessions', 'view_player', 'create_card'
    const [selectedPackTypeToGive, setSelectedPackTypeToGive] = useState('Common Pack'); // For DM giving packs
    const [searchCardInputForDM, setSearchCardInputForDM] = useState(''); // For DM searching cards to give

    // --- NEW PENDING ITEM STATES FOR PLAYER ---
    const [pendingBoosterPacks, setPendingBoosterPacks] = useState([]);
    const [pendingCards, setPendingCards] = useState([]);

    // --- Player Available Spells Filter/Sort/Search States ---
    const [filterType, setFilterType] = useState('All');
    const [filterRarity, setFilterRarity] = useState('All');
    const [sortOrder, setSortOrder] = useState('name-asc'); // e.g., 'name-asc', 'name-desc', 'rarity-asc'
    const [searchAvailableCards, setSearchAvailableCards] = useState('');

    // --- NEW: Custom Card Creator States ---
    const [newCardName, setNewCardName] = useState('');
    const [newCardType, setNewCardType] = useState('Spell');
    const [newCardRarity, setNewCardRarity] = useState('Common');
    const [newCardDescription, setNewCardDescription] = useState('');
    const [newCardEffect, setNewCardEffect] = useState('');
    const [newCardBacklash, setNewCardBacklash] = useState('');
    const [newCardUses, setNewCardUses] = useState(1);
    const [newCardImageUrl, setNewCardImageUrl] = useState('');


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
            // Ensure `current_uses` and `notes` are initialized if they don't exist in saved data
            setActiveDeckInstances((data.active_deck_instances || []).map(card => ({
                ...card,
                current_uses: card.current_uses !== undefined ? card.current_uses : card.default_uses_per_rest,
                notes: card.notes || '' // Initialize notes if not present
            })));
            setUnlockedCollectionIds(data.unlocked_collection_ids || []); // Load unlocked card IDs (now includes duplicates)
            setCharacterLevel(data.character_level !== undefined ? data.character_level : 1);
            setWisMod(data.wis_mod !== undefined ? data.wis_mod : 0);
            setIntMod(data.int_mod !== undefined ? data.int_mod : 0);
            setChaMod(data.cha_mod !== undefined ? data.cha_mod : 0);
            setPendingBoosterPacks(data.pending_booster_packs || []); // Load pending booster packs
            setPendingCards(data.pending_cards || []); // Load pending cards
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
                    active_deck_instances: activeDeckInstances, // Save active deck instances (includes current_uses and notes)
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

    // --- Booster Pack Logic: Open a new pack (Player initiated) ---
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

    // --- Player: Open a pending booster pack ---
    const handleOpenPendingBooster = async () => {
        if (!isAuthenticated || pendingBoosterPacks.length === 0) {
            showMessage('No pending booster packs to open.', 'error');
            return;
        }
        setLoading(true);
        setNewlyAcquiredCards([]); // Clear previous new cards display
        setLastOpenedPackType('');
        setPrePackUnlockedIds(unlockedCollectionIds); // Store current collection for duplicate check

        try {
            const response = await fetch(`${API_BASE_URL}/player/open_pending_booster`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, password: password }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to open pending booster pack.');
            }

            setLastOpenedPackType(data.pack_type);
            setUnlockedCollectionIds(data.updated_unlocked_collection_ids || []);
            setPendingBoosterPacks(data.updated_pending_booster_packs || []);
            setNewlyAcquiredCards(data.new_cards || []);
            showMessage(`You opened a ${data.pack_type} and acquired ${data.new_cards.length} cards!`, 'success');
        } catch (err) {
            console.error('Error opening pending booster pack:', err);
            showMessage(`Failed to open pending booster pack: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Player: Accept a pending card ---
    const handleAcceptPendingCard = async (cardIdToAccept) => {
        if (!isAuthenticated || !cardIdToAccept) {
            showMessage('No pending card selected or you are not logged in.', 'error');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/player/accept_pending_card`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, password: password, card_id: cardIdToAccept }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to accept pending card.');
            }
            setUnlockedCollectionIds(data.updated_unlocked_collection_ids || []);
            setPendingCards(data.updated_pending_cards || []);
            showMessage(`You accepted "${data.card_name}" into your collection!`, 'success');
        } catch (err) {
            console.error('Error accepting pending card:', err);
            showMessage(`Failed to accept pending card: ${err.message}`, 'error');
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
            current_uses: card.default_uses_per_rest,
            notes: '' // Initialize notes for new card instances
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

    // --- Handle changes to card notes in the active deck ---
    const handleChangeCardNote = useCallback((instance_id, newNote) => {
        setActiveDeckInstances(prev =>
            prev.map(card =>
                card.instance_id === instance_id ? { ...card, notes: newNote } : card
            )
        );
    }, []);

    // Helper to map card IDs from player data back to full card objects from allCards
    const getFullCardDetails = useCallback((cardId) => {
        return allCards.find(card => card.id === cardId);
    }, [allCards]);

    // --- Player: Filtered & Sorted Available Cards (Memoized) ---
    const uniqueUnlockedCards = useMemo(() => {
        // First, get all unique cards the player has unlocked, with their counts
        const uniqueCardsMap = allCards
            .filter(card => unlockedCollectionIds.includes(card.id))
            .reduce((acc, card) => {
                if (!acc[card.id]) {
                    const count = unlockedCollectionIds.filter(id => id === card.id).length;
                    acc[card.id] = { ...card, owned_copies: count };
                }
                return acc;
            }, {});
        return Object.values(uniqueCardsMap);
    }, [allCards, unlockedCollectionIds]);

    const filteredAndSortedAvailableCards = useMemo(() => {
        let filteredCards = [...uniqueUnlockedCards]; // Start with the unique unlocked cards

        // Apply search filter
        if (searchAvailableCards) {
            const searchTerm = searchAvailableCards.toLowerCase();
            filteredCards = filteredCards.filter(card =>
                card.name.toLowerCase().includes(searchTerm) ||
                card.type.toLowerCase().includes(searchTerm) ||
                card.rarity.toLowerCase().includes(searchTerm) ||
                (card.description && card.description.toLowerCase().includes(searchTerm)) ||
                (card.effect && card.effect.toLowerCase().includes(searchTerm))
            );
        }

        // Apply type filter
        if (filterType !== 'All') {
            filteredCards = filteredCards.filter(card => card.type === filterType);
        }

        // Apply rarity filter
        if (filterRarity !== 'All') {
            filteredCards = filteredCards.filter(card => card.rarity === filterRarity);
        }

        // Apply sorting
        filteredCards.sort((a, b) => {
            switch (sortOrder) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'rarity-asc':
                    // Assuming rarity has an inherent order, or you define one
                    const rarityOrder = { 'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Legendary': 4, 'Custom': 5 }; // Added Custom
                    return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
                case 'rarity-desc':
                    const rarityOrderDesc = { 'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Legendary': 4, 'Custom': 5 }; // Added Custom
                    return (rarityOrderDesc[b.rarity] || 0) - (rarityOrderDesc[a.rarity] || 0);
                default:
                    return 0;
            }
        });

        return filteredCards;
    }, [uniqueUnlockedCards, searchAvailableCards, filterType, filterRarity, sortOrder]);


    // Extract unique card types and rarities for filter options
    const uniqueCardTypesOptions = useMemo(() => ['All', 'Cantrip', 'Spell', 'Item', 'Other', ...new Set(allCards.map(card => card.type))].filter((value, index, self) => self.indexOf(value) === index).sort(), [allCards]);
    const uniqueCardRaritiesOptions = useMemo(() => ['All', 'Common', 'Uncommon', 'Rare', 'Legendary', 'Custom', ...new Set(allCards.map(card => card.rarity))].filter((value, index, self) => self.indexOf(value) === index).sort((a, b) => {
        const order = { 'All': 0, 'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Legendary': 4, 'Custom': 5 };
        return (order[a] || 99) - (order[b] || 99);
    }), [allCards]);


    // Filter all cards for DM distribution search
    const filteredAllCardsForDM = allCards.filter(card => 
        card.name.toLowerCase().includes(searchCardInputForDM.toLowerCase()) ||
        card.type.toLowerCase().includes(searchCardInputForDM.toLowerCase()) ||
        card.rarity.toLowerCase().includes(searchCardInputForDM.toLowerCase())
    );

    // --- Function to fetch pending items ---
    const fetchPendingItems = useCallback(async () => {
        if (!isAuthenticated || !playerId || !password || isDMMode) return; // Only fetch if logged in, in player mode

        try {
            const response = await fetch(`${API_BASE_URL}/player/pending_items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, password: password }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch pending items.');
            }

            // Check if there are new pending items
            const newPacks = data.pending_booster_packs || [];
            const newCards = data.pending_cards || [];

            if (newPacks.length > pendingBoosterPacks.length || newCards.length > pendingCards.length) {
                showMessage('You have new items from your DM!', 'info');
            }

            setPendingBoosterPacks(newPacks);
            setPendingCards(newCards);

        } catch (err) {
            console.error('Error fetching pending items:', err);
            // Don't show an error message for every failed poll to avoid spamming the user
        }
    }, [isAuthenticated, playerId, password, isDMMode, pendingBoosterPacks.length, pendingCards.length, showMessage]);

    // --- Polling effect for pending items ---
    useEffect(() => {
        let intervalId;
        if (isAuthenticated && !isDMMode && playerId && password) {
            // Fetch immediately on login/mode switch
            fetchPendingItems();
            // Then set up polling every 10 seconds
            intervalId = setInterval(fetchPendingItems, 10000); 
        }

        // Cleanup function to clear the interval when component unmounts or dependencies change
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isAuthenticated, isDMMode, playerId, password, fetchPendingItems]);

    // --- DM: Create New Game Session ---
    const handleCreateSession = useCallback(async () => {
        if (!playerId || !password) {
            showMessage('You must be logged in as a DM to create a session.', 'error');
            return;
        }
        if (!sessionNameInput.trim()) {
            showMessage('Session name cannot be empty.', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/dm/create_session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, password: password, session_name: sessionNameInput }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create session.');
            }

            showMessage(`Session "${data.session_name}" created with code: ${data.session_code}`, 'success');
            setSessionNameInput(''); // Clear input
            // Refresh DM sessions list
            fetchDmSessions(); 
            setActiveDmTab('my_sessions'); // Switch to my sessions tab
        } catch (err) {
            console.error('Error creating session:', err);
            showMessage(`Failed to create session: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [playerId, password, sessionNameInput, showMessage]);

    // --- DM: Fetch all sessions created by this DM ---
    const fetchDmSessions = useCallback(async () => {
        if (!playerId || !password) return; // Only fetch if logged in

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/dm/my_sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, password: password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch DM sessions.');
            }

            // Fetch player counts for each session
            const sessionsWithPlayerCounts = await Promise.all(
                (data.sessions || []).map(async (session) => {
                    try {
                        const playersResponse = await fetch(`${API_BASE_URL}/dm/sessions/${session.session_id}/players`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ player_id: playerId, password: password }),
                        });
                        const playersData = await playersResponse.json();
                        if (!playersResponse.ok) {
                            console.warn(`Could not fetch players for session ${session.session_id}: ${playersData.error}`);
                            return { ...session, player_count: 0 };
                        }
                        return { ...session, player_count: (playersData.players || []).length };
                    } catch (playerErr) {
                        console.error(`Error fetching player count for session ${session.session_id}:`, playerErr);
                        return { ...session, player_count: 0 };
                    }
                })
            );
            setDmSessions(sessionsWithPlayerCounts);

        } catch (err) {
            console.error('Error fetching DM sessions:', err);
            showMessage(`Failed to fetch your sessions: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [playerId, password, showMessage]);

    // Effect to fetch DM sessions when DM mode is active and player is authenticated
    useEffect(() => {
        if (isDMMode && isAuthenticated) {
            fetchDmSessions();
        } else {
            setDmSessions([]); // Clear sessions if not in DM mode or not authenticated
            setSelectedDmSession(null);
        }
    }, [isDMMode, isAuthenticated, fetchDmSessions]);

    // --- DM: Select a session to view players ---
    const handleSelectDmSession = useCallback(async (session) => {
        if (!playerId || !password) {
            showMessage('You must be logged in as a DM to view sessions.', 'error');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/dm/sessions/${session.session_id}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, password: password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch players for session.');
            }
            setSelectedDmSession(session);
            setPlayersInSelectedDmSession(data.players || []);
            showMessage(`Viewing players in session "${session.session_name}".`, 'info');
        } catch (err) {
            console.error('Error fetching session players:', err);
            showMessage(`Failed to load session players: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [playerId, password, showMessage]);

    // --- DM: View a specific player's cards and stats ---
    const handleViewPlayerCards = useCallback(async (targetPlayerId) => {
        if (!playerId || !password || !selectedDmSession) {
            showMessage('DM not authorized or session not selected.', 'error');
            return;
        }
        setLoading(true);
        try {
            // Find the full player data from the playersInSelectedDmSession
            const playerDetails = playersInSelectedDmSession.find(p => p.player_id === targetPlayerId);
            if (playerDetails) {
                setSelectedPlayerForDMView(targetPlayerId);
                setSelectedPlayerDMData(playerDetails.data);
                setActiveDmTab('view_player');
                showMessage(`Viewing details for player: ${targetPlayerId}`, 'info');
            } else {
                showMessage('Player details not found in this session.', 'error');
            }
        } catch (err) {
            console.error('Error viewing player cards:', err);
            showMessage(`Failed to view player details: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [playerId, password, selectedDmSession, playersInSelectedDmSession, showMessage]);


    // --- DM: Give a specific booster pack to a player ---
    const handleGiveSpecificPack = useCallback(async () => {
        if (!playerId || !password || !selectedPlayerForDMView || !selectedPackTypeToGive) {
            showMessage('Please select a player and a pack type.', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/dm/give_booster`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dm_player_id: playerId,
                    password: password,
                    target_player_id: selectedPlayerForDMView,
                    pack_type: selectedPackTypeToGive,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to give booster pack.');
            }
            showMessage(data.message, 'success');
            // Re-fetch player data to update pending items in DM view
            handleViewPlayerCards(selectedPlayerForDMView);
        } catch (err) {
            console.error('Error giving booster pack:', err);
            showMessage(`Failed to give booster pack: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [playerId, password, selectedPlayerForDMView, selectedPackTypeToGive, showMessage, handleViewPlayerCards]);


    // --- DM: Give a specific card to a player ---
    const handleGiveSpecificCard = useCallback(async (cardId) => {
        if (!playerId || !password || !selectedPlayerForDMView || !cardId) {
            showMessage('Please select a player and a card to give.', 'error');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/dm/give_card`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dm_player_id: playerId,
                    password: password,
                    target_player_id: selectedPlayerForDMView,
                    card_id: cardId,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to give card.');
            }
            showMessage(data.message, 'success');
            setSearchCardInputForDM(''); // Clear search
            // Re-fetch player data to update pending items in DM view
            handleViewPlayerCards(selectedPlayerForDMView);
        } catch (err) {
            console.error('Error giving card:', err);
            showMessage(`Failed to give card: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [playerId, password, selectedPlayerForDMView, showMessage, handleViewPlayerCards]);

    // --- Player: Join a Game Session ---
    const handleJoinSession = useCallback(async () => {
        if (!isAuthenticated) {
            showMessage('You must be logged in to join a session.', 'error');
            return;
        }
        if (!sessionCodeInput.trim()) {
            showMessage('Please enter a session code.', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/player/join_session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId, password: password, session_code: sessionCodeInput }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to join session.');
            }

            showMessage(data.message, 'success');
            setSessionCodeInput(''); // Clear input
            // Potentially update player's current session status if needed on frontend
        } catch (err) {
            console.error('Error joining session:', err);
            showMessage(`Failed to join session: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, playerId, password, sessionCodeInput, showMessage]);


    // --- DM: Handle Custom Card Creation (Frontend & Backend Integration) ---
    const handleCreateCustomCard = useCallback(async () => {
        if (!playerId || !password) {
            showMessage('DM must be logged in to create custom cards.', 'error');
            return;
        }
        if (!newCardName || !newCardDescription || newCardUses < 0) {
            showMessage('Please fill in all required fields: Name, Description, and valid Uses.', 'error');
            return;
        }

        setLoading(true);
        try {
            const customCardData = {
                name: newCardName,
                type: newCardType,
                rarity: newCardRarity,
                description: newCardDescription,
                effect: newCardEffect || null, // Send null if empty
                backlash_effect: newCardBacklash || null, // Send null if empty
                default_uses_per_rest: newCardUses,
                image_url: newCardImageUrl || null, // Send null if empty, backend will handle placeholder
            };

            const response = await fetch(`${API_BASE_URL}/dm/create_custom_card`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dm_player_id: playerId,
                    password: password,
                    card_data: customCardData
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create custom card.');
            }

            showMessage(`Custom card "${data.new_card_details.name}" created successfully!`, 'success');
            
            // Update the allCards state to include the newly created custom card
            setAllCards(prevCards => [...prevCards, data.new_card_details]);

            // Reset form fields
            setNewCardName('');
            setNewCardType('Spell');
            setNewCardRarity('Common');
            setNewCardDescription('');
            setNewCardEffect('');
            setNewCardBacklash('');
            setNewCardUses(1);
            setNewCardImageUrl('');

        } catch (err) {
            console.error('Error creating custom card:', err);
            showMessage(`Failed to create custom card: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [playerId, password, newCardName, newCardType, newCardRarity, newCardDescription, newCardEffect, newCardBacklash, newCardUses, newCardImageUrl, showMessage]);


    // --- Main Component Render ---
    return (
        <>
            <style>{AppStyles}</style>
            <div className="App">
                <h1 className="app-title">Spell Trading Cards Manager</h1>

                {/* Login/Auth Section */}
                <div className="login-container">
                    {/* DM Mode Toggle */}
                    {isAuthenticated && ( // Only show toggle if logged in
                        <div className="dm-toggle-container">
                            <label className="dm-toggle-switch">
                                <input type="checkbox" checked={isDMMode} onChange={(e) => {
                                    setIsDMMode(e.target.checked);
                                    // When toggling, reset DM specific states and ensure appropriate tab is active
                                    setSelectedDmSession(null); 
                                    setSelectedPlayerForDMView(null);
                                    setSelectedPlayerDMData(null);
                                    setActiveDmTab('my_sessions'); // Reset DM sub-tab
                                    // If switching to DM mode, set main active tab to dm_screen
                                    // Otherwise, set to 'available' (default player tab)
                                    setActiveTab(e.target.checked ? 'dm_screen' : 'available'); 
                                }} />
                                <span className="dm-slider"></span>
                            </label>
                            <span>DM Mode</span>
                        </div>
                    )}
                    
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

                {/* Message Box */}
                {message.text && <div className={`message-box ${message.type}`}>{message.text}</div>}

                {/* Conditional Rendering of Player vs. DM content */}
                {!isAuthenticated ? (
                    <div className="pre-login-message">
                        <h3>Please log in to access the Spell Card Manager.</h3>
                        <p>Create an account or log in to manage your spells and game sessions!</p>
                    </div>
                ) : isDMMode ? (
                    /* DM Screen Section (full screen when isDMMode is true) */
                    <div className="dm-screen-container">
                        <h2 className="panel-title">DM Screen</h2>

                        <div className="dm-sub-nav">
                            <div 
                                className={`dm-sub-nav-item ${activeDmTab === 'create_session' ? 'active' : ''}`} 
                                onClick={() => { setActiveDmTab('create_session'); setSelectedDmSession(null); setSelectedPlayerForDMView(null); }}
                            >
                                Create Session
                            </div>
                            <div 
                                className={`dm-sub-nav-item ${activeDmTab === 'my_sessions' ? 'active' : ''}`} 
                                onClick={() => { setActiveDmTab('my_sessions'); setSelectedPlayerForDMView(null); }}
                            >
                                My Sessions
                            </div>
                            <div 
                                className={`dm-sub-nav-item ${activeDmTab === 'create_card' ? 'active' : ''}`} 
                                onClick={() => { setActiveDmTab('create_card'); setSelectedDmSession(null); setSelectedPlayerForDMView(null); }}
                            >
                                Create Card
                            </div>
                            {selectedPlayerForDMView && (
                                <div 
                                    className={`dm-sub-nav-item ${activeDmTab === 'view_player' ? 'active' : ''}`} 
                                    onClick={() => setActiveDmTab('view_player')}
                                >
                                    Viewing: {selectedPlayerForDMView}
                                </div>
                            )}
                        </div>

                        {/* DM Create Session View */}
                        {activeDmTab === 'create_session' && (
                            <div className="dm-section-panel">
                                <h3>Create New Game Session</h3>
                                <input
                                    type="text"
                                    placeholder="Session Name (e.g., 'Dragon's Breath Campaign')"
                                    value={sessionNameInput}
                                    onChange={(e) => setSessionNameInput(e.target.value)}
                                    disabled={loading}
                                    style={{ maxWidth: '400px' }}
                                />
                                <button onClick={handleCreateSession} disabled={loading}>
                                    Generate Session Code
                                </button>
                                <p className="empty-message">
                                    Once created, share the 6-character session code with your players!
                                </p>
                            </div>
                        )}

                        {/* DM My Sessions & View Players View */}
                        {activeDmTab === 'my_sessions' && (
                            <div className="dm-section-panel">
                                <h3>Your Game Sessions</h3>
                                {loading ? (
                                    <p className="empty-message">Loading sessions...</p>
                                ) : dmSessions.length === 0 ? (
                                    <p className="empty-message">You haven't created any sessions yet.</p>
                                ) : (
                                    <div className="dm-session-list">
                                        <ul>
                                            {dmSessions.map(session => (
                                                <li key={session.session_id} onClick={() => handleSelectDmSession(session)}>
                                                    <span>
                                                        <strong>{session.session_name}</strong> (Code: {session.session_code})
                                                    </span>
                                                    <span>
                                                        Players: {session.player_count} {/* This now displays the fetched count */}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {selectedDmSession && (
                                    <>
                                        <h3 style={{ marginTop: '2rem' }}>Players in "{selectedDmSession.session_name}"</h3>
                                        {loading ? (
                                            <p className="empty-message">Loading players...</p>
                                        ) : playersInSelectedDmSession.length === 0 ? (
                                            <p className="empty-message">No players have joined this session yet.</p>
                                        ) : (
                                            <div className="dm-player-list">
                                                <ul>
                                                    {playersInSelectedDmSession.map(player => (
                                                        <li key={player.player_id} onClick={() => handleViewPlayerCards(player.player_id)}>
                                                            <span className="dm-player-id">{player.player_id}</span>
                                                            <button className="select-button">View Cards</button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                         {/* DM Create Custom Card View */}
                         {activeDmTab === 'create_card' && (
                            <div className="dm-section-panel">
                                <h3>Create New Custom Card</h3>
                                <form className="dm-card-creator-form" onSubmit={(e) => { e.preventDefault(); handleCreateCustomCard(); }}>
                                    <label>
                                        Card Name:
                                        <input
                                            type="text"
                                            value={newCardName}
                                            onChange={(e) => setNewCardName(e.target.value)}
                                            placeholder="e.g., Fireball of Doom"
                                            required
                                        />
                                    </label>

                                    <div className="input-group-inline">
                                        <label>
                                            Type:
                                            <select value={newCardType} onChange={(e) => setNewCardType(e.target.value)} required>
                                                <option value="Cantrip">Cantrip</option>
                                                <option value="Spell">Spell</option>
                                                <option value="Item">Item</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </label>
                                        <label>
                                            Rarity:
                                            <select value={newCardRarity} onChange={(e) => setNewCardRarity(e.target.value)} required>
                                                <option value="Common">Common</option>
                                                <option value="Uncommon">Uncommon</option>
                                                <option value="Rare">Rare</option>
                                                <option value="Legendary">Legendary</option>
                                                <option value="Custom">Custom</option>
                                            </select>
                                        </label>
                                        <label>
                                            Uses/Rest:
                                            <input
                                                type="number"
                                                value={newCardUses}
                                                onChange={(e) => setNewCardUses(Math.max(0, parseInt(e.target.value) || 0))}
                                                min="0"
                                                required
                                            />
                                        </label>
                                    </div>

                                    <label>
                                        Description:
                                        <textarea
                                            value={newCardDescription}
                                            onChange={(e) => setNewCardDescription(e.target.value)}
                                            placeholder="A detailed explanation of the card's nature or lore."
                                            required
                                        ></textarea>
                                    </label>
                                    <label>
                                        Effect:
                                        <textarea
                                            value={newCardEffect}
                                            onChange={(e) => setNewCardEffect(e.target.value)}
                                            placeholder="What the card does mechanically (e.g., 'Deals 6d6 Fire damage in a 20ft radius')."
                                        ></textarea>
                                    </label>
                                    <label>
                                        Backlash Effect:
                                        <textarea
                                            value={newCardBacklash}
                                            onChange={(e) => setNewCardBacklash(e.target.value)}
                                            placeholder="Any negative consequences for using the card (e.g., 'Take 1d4 psychic damage')."
                                        ></textarea>
                                    </label>
                                    <label>
                                        Image URL (Optional):
                                        <input
                                            type="url"
                                            value={newCardImageUrl}
                                            onChange={(e) => setNewCardImageUrl(e.target.value)}
                                            placeholder="e.g., https://example.com/fireball.png"
                                        />
                                    </label>
                                    <button type="submit" disabled={loading}>
                                        Create Custom Card
                                    </button>
                                </form>
                            </div>
                        )}

                         {/* DM Player View (when a DM selects a specific player) */}
                        {activeDmTab === 'view_player' && selectedPlayerDMData && (
                            <div className="dm-section-panel">
                                <h3>Viewing Player: {selectedPlayerForDMView}</h3>
                                <button onClick={() => setActiveDmTab('my_sessions')} className="select-button" style={{ marginBottom: '1rem' }}>
                                    Back to Session Players
                                </button>

                                <div className="dm-player-view-details">
                                    <div className="dm-player-stats-panel">
                                        <h4>Player Stats</h4>
                                        <p>Level: <span>{selectedPlayerDMData.character_level}</span></p>
                                        <p>WIS Mod: <span>{selectedPlayerDMData.wis_mod}</span></p>
                                        <p>INT Mod: <span>{selectedPlayerDMData.int_mod}</span></p>
                                        <p>CHA Mod: <span>{selectedPlayerDMData.cha_mod}</span></p>
                                    </div>

                                    <div className="dm-player-deck-panel">
                                        <h4>Active Deck ({selectedPlayerDMData.active_deck_instances.length})</h4>
                                        <div className="card-list">
                                            {selectedPlayerDMData.active_deck_instances.length === 0 ? (
                                                <p className="empty-message no-hover">No cards in active deck.</p>
                                            ) : (
                                                selectedPlayerDMData.active_deck_instances.map(card => (
                                                    <div key={card.instance_id} className="card-item">
                                                         <img
                                                            src={card.image_url || `https://placehold.co/100x150/a8dadc/ffffff?text=${card.name.split('.')[0].replace('_', '%20')}`}
                                                            alt={card.name}
                                                            className="card-image"
                                                            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x150/cccccc/333333?text=Image%20Error"; }}
                                                        />
                                                        {card.backlash_effect && (
                                                            <p className="card-backlash">Backlash: {card.backlash_effect}</p>
                                                        )}
                                                        <h3 className="card-name">{card.name}</h3>
                                                        <p className="card-description">{card.description}</p>
                                                        {card.effect && (
                                                            <p className="card-effect">Effect: {card.effect}</p>
                                                        )}
                                                        <p className="card-uses">Uses: {card.current_uses}/{card.default_uses_per_rest}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Owned Collection Panel - Now Scrollable and Smaller Cards */}
                                    <div className="dm-player-collection-panel">
                                        <h4>Owned Collection ({selectedPlayerDMData.unlocked_collection_ids.length})</h4>
                                        <div className="card-list">
                                            {selectedPlayerDMData.unlocked_collection_ids.length === 0 ? (
                                                <p className="empty-message no-hover">No cards owned.</p>
                                            ) : (
                                                // Display unique cards from collection, with count
                                                Object.entries(selectedPlayerDMData.unlocked_collection_ids.reduce((acc, cardId) => {
                                                    acc[cardId] = (acc[cardId] || 0) + 1;
                                                    return acc;
                                                }, {})).map(([cardId, count]) => {
                                                    const fullCard = getFullCardDetails(cardId);
                                                    return fullCard ? (
                                                        <div key={cardId} className="card-item">
                                                             <img
                                                                src={fullCard.image_url || `https://placehold.co/100x150/a8dadc/ffffff?text=${fullCard.name.split('.')[0].replace('_', '%20')}`}
                                                                alt={fullCard.name}
                                                                className="card-image"
                                                                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x150/cccccc/333333?text=Image%20Error"; }}
                                                            />
                                                            <h4 className="card-name">{fullCard.name}</h4>
                                                            {fullCard.backlash_effect && (
                                                                <p className="card-backlash">Backlash: {fullCard.backlash_effect}</p>
                                                            )}
                                                            <p className="card-description">{fullCard.description}</p>
                                                            {fullCard.effect && (
                                                                <p className="card-effect">Effect: {fullCard.effect}</p>
                                                            )}
                                                            <p className="card-meta">Rarity: <span>{fullCard.rarity}</span></p>
                                                            <p className="card-meta">Owned: <span>{count}</span></p>
                                                        </div>
                                                    ) : null;
                                                })
                                            )}
                                        </div>
                                    </div>
                                    {/* Display Pending Items for the Player being viewed by DM */}
                                    {(selectedPlayerDMData.pending_booster_packs.length > 0 || selectedPlayerDMData.pending_cards.length > 0) && (
                                        <div className="player-notification-area" style={{ marginTop: '2rem' }}>
                                            <h3>Player's Pending Items</h3>
                                            <ul>
                                                {selectedPlayerDMData.pending_booster_packs.map((pack, index) => (
                                                    <li key={`dm-player-pending-pack-${index}`}>
                                                        <span className="notification-text">Pending: {pack}</span>
                                                    </li>
                                                ))}
                                                {selectedPlayerDMData.pending_cards.map((cardId, index) => {
                                                    const card = getFullCardDetails(cardId);
                                                    return card ? (
                                                        <li key={`dm-player-pending-card-${cardId}-${index}`}>
                                                            <span className="notification-text">Pending: {card.name}</span>
                                                        </li>
                                                    ) : null;
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* --- DM Distribution Controls --- */}
                                <div className="dm-distribution-controls">
                                    <h3>Distribute Items to {selectedPlayerForDMView}</h3>

                                    {/* Give Booster Pack */}
                                    <div className="input-group">
                                        <select 
                                            value={selectedPackTypeToGive} 
                                            onChange={(e) => setSelectedPackTypeToGive(e.target.value)}
                                            disabled={loading}
                                        >
                                            <option value="Common Pack">Common Pack</option>
                                            <option value="Uncommon Pack">Uncommon Pack</option>
                                            <option value="Rare Pack">Rare Pack</option>
                                            <option value="Legendary Pack">Legendary Pack</option>
                                        </select>
                                        <button onClick={handleGiveSpecificPack} disabled={loading} className="booster-button">
                                            Give Pack
                                        </button>
                                    </div>

                                    {/* Give Specific Card */}
                                    <h4 style={{marginTop: '1rem', marginBottom: '0.5rem'}}>Give Specific Card</h4>
                                    <input
                                        type="text"
                                        placeholder="Search Cards to Give..."
                                        value={searchCardInputForDM}
                                        onChange={(e) => setSearchCardInputForDM(e.target.value)}
                                        disabled={loading}
                                        style={{ maxWidth: '400px' }}
                                    />
                                    <div className="dm-card-distribution-list">
                                        {loading ? (
                                            <p className="empty-message no-hover">Loading all cards...</p>
                                        ) : filteredAllCardsForDM.length === 0 ? (
                                            <p className="empty-message no-hover">No cards found matching your search.</p>
                                        ) : (
                                            <ul>
                                                {filteredAllCardsForDM.map(card => (
                                                    <li key={`dm-give-${card.id}`}>
                                                        <span className="card-name">{card.name} ({card.type}) - {card.rarity}</span>
                                                        <button 
                                                            onClick={() => handleGiveSpecificCard(card.id)} 
                                                            disabled={loading}
                                                            className="select-button"
                                                        >
                                                            Give
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Player Content (when isDMMode is false) */
                    <div className="main-content">
                        {/* Player Stats Input Panel */}
                        <div className="stats-container">
                            <label>Level: <input type="number" value={characterLevel} onChange={(e) => setCharacterLevel(Math.max(1, parseInt(e.target.value) || 1))} min="1" max="20" /></label>
                            <label>WIS Mod: <input type="number" value={wisMod} onChange={(e) => setWisMod(parseInt(e.target.value) || 0)} /></label>
                            <label>INT Mod: <input type="number" value={intMod} onChange={(e) => setIntMod(parseInt(e.target.value) || 0)} /></label>
                            <label>CHA Mod: <input type="number" value={chaMod} onChange={(e) => setChaMod(parseInt(e.target.value) || 0)} /></label>
                            <p>Max Deck Size: <span className="highlight">{maxDeckSize}</span></p>
                        </div>

                        {/* Player Notification Area */}
                        {(pendingBoosterPacks.length > 0 || pendingCards.length > 0) && (
                            <div className="player-notification-area">
                                <h3>You Have New Items! 🎉</h3>
                                <ul>
                                    {pendingBoosterPacks.map((pack, index) => (
                                        <li key={`pending-pack-${index}`}>
                                            <span className="notification-text">Pending: {pack}</span>
                                            <button onClick={handleOpenPendingBooster} disabled={loading} className="booster-button">
                                                Open Pack
                                            </button>
                                        </li>
                                    ))}
                                    {pendingCards.map((cardId, index) => {
                                        const card = getFullCardDetails(cardId);
                                        return card ? (
                                            <li key={`pending-card-${cardId}-${index}`}>
                                                <span className="notification-text">Pending: {card.name} ({card.rarity})</span>
                                                <button onClick={() => handleAcceptPendingCard(card.id)} disabled={loading} className="select-button">
                                                    Accept Card
                                                </button>
                                            </li>
                                        ) : null;
                                    })}
                                </ul>
                            </div>
                        )}

                        {/* Tab Navigation for Player Mode */}
                        <div className="tab-navigation">
                            <div 
                                className={`tab-item ${activeTab === 'available' ? 'active' : ''}`} 
                                onClick={() => setActiveTab('available')}
                            >
                                Available Spells ({filteredAndSortedAvailableCards.length} Types / {unlockedCollectionIds.length} Total Owned)
                            </div>
                            <div 
                                className={`tab-item ${activeTab === 'deck' ? 'active' : ''}`} 
                                onClick={() => setActiveTab('deck')}
                            >
                                Your Deck ({activeDeckInstances.length}/{maxDeckSize})
                            </div>
                        </div>

                        {/* Available Cards Section - Now Scrollable with Filters, Sort, Search */}
                        {activeTab === 'available' && (
                            <>
                                {/* Player Filters, Sort, Search Controls */}
                                <div className="player-filters-sort-search">
                                    <label htmlFor="search-cards">Search:</label>
                                    <input
                                        id="search-cards"
                                        type="text"
                                        placeholder="Search spells..."
                                        value={searchAvailableCards}
                                        onChange={(e) => setSearchAvailableCards(e.target.value)}
                                        disabled={loading}
                                    />

                                    <label htmlFor="filter-type">Type:</label>
                                    <select
                                        id="filter-type"
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        disabled={loading}
                                    >
                                        {uniqueCardTypesOptions.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>

                                    <label htmlFor="filter-rarity">Rarity:</label>
                                    <select
                                        id="filter-rarity"
                                        value={filterRarity}
                                        onChange={(e) => setFilterRarity(e.target.value)}
                                        disabled={loading}
                                    >
                                        {uniqueCardRaritiesOptions.map(rarity => (
                                            <option key={rarity} value={rarity}>{rarity}</option>
                                        ))}
                                    </select>

                                    <label htmlFor="sort-order">Sort By:</label>
                                    <select
                                        id="sort-order"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        disabled={loading}
                                    >
                                        <option value="name-asc">Name (A-Z)</option>
                                        <option value="name-desc">Name (Z-A)</option>
                                        <option value="rarity-asc">Rarity (Low to High)</option>
                                        <option value="rarity-desc">Rarity (High to Low)</option>
                                    </select>
                                </div>


                                <div className="card-collection-panel"> {/* This panel now has max-height and overflow-y: auto */}
                                    <h2 className="panel-title">Available Spells</h2>
                                    {loading && <p className="empty-message">Loading cards...</p>}
                                    {!isAuthenticated && !loading && (
                                        <div className="pre-login-message">
                                            <h3>Log in to see your available spells.</h3>
                                        </div>
                                    )}
                                    {isAuthenticated && !loading && filteredAndSortedAvailableCards.length > 0 ? (
                                        <div className="card-list">
                                            {filteredAndSortedAvailableCards.map((card) => (
                                                <div key={card.id} className="card-item available-card" onClick={() => handleAddCardToDeck(card)}>
                                                    <img
                                                        src={card.image_url || `https://placehold.co/100x150/a8dadc/ffffff?text=${card.name.split('.')[0].replace('_', '%20')}`}
                                                        alt={card.name}
                                                        className="card-image"
                                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x150/cccccc/333333?text=Image%20Error"; }}
                                                    />
                                                    {card.backlash_effect && (
                                                        <p className="card-backlash">Backlash: {card.backlash_effect}</p>
                                                    )}
                                                    <h3 className="card-name">{card.name} ({card.type})</h3>
                                                    <p className="card-description">{card.description}</p>
                                                    {card.effect && (
                                                        <p className="card-effect">Effect: {card.effect}</p>
                                                    )}
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
                                    ) : ( isAuthenticated && !loading &&
                                        <p className="empty-message">No available spells match your current filters or search.</p>
                                    )}

                                </div>
                                {/* Booster Pack Section - Moved outside card-collection-panel */}
                                {isAuthenticated && !loading && (
                                    <div className="booster-pack-section">
                                        {uniqueUnlockedCards.length === 0 && pendingBoosterPacks.length === 0 && filteredAndSortedAvailableCards.length === 0 && (
                                            <p className="empty-message">You haven't unlocked any unique spell types yet! Open a booster pack to get started.</p>
                                        )}
                                        {/* Only show "Open Booster Pack" button if no pending packs */}
                                        {pendingBoosterPacks.length === 0 && (
                                            <button 
                                                onClick={handleOpenBoosterPack} 
                                                disabled={loading}
                                                className="booster-button"
                                            >
                                                Open Booster Pack
                                            </button>
                                        )}
                                        
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
                            </>
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
                                                        src={card.image_url || `https://placehold.co/100x150/a8dadc/ffffff?text=${card.name.split('.')[0].replace('_', '%20')}`}
                                                        alt={card.name}
                                                        className="card-image"
                                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x150/cccccc/333333?text=Image%20Error"; }}
                                                    />
                                                    {card.backlash_effect && (
                                                        <p className="card-backlash">Backlash: {card.backlash_effect}</p>
                                                    )}
                                                    <h3 className="card-name">{card.name} ({card.type})</h3>
                                                    <p className="card-description">{card.description}</p>
                                                    {card.effect && (
                                                        <p className="card-effect">Effect: {card.effect}</p>
                                                    )}
                                                    <p className="card-meta">Rarity: <span>{card.rarity}</span></p>
                                                    <p className="card-uses">Uses Left: {card.current_uses}/{card.default_uses_per_rest}</p>
                                                    {/* Card Notes Text Area */}
                                                    <textarea
                                                        className="card-note-textarea"
                                                        placeholder="Add personal notes here..."
                                                        value={card.notes}
                                                        onChange={(e) => handleChangeCardNote(card.instance_id, e.target.value)}
                                                    ></textarea>
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

                        {/* Player Join Session Input */}
                        {isAuthenticated && (
                            <div className="dm-section-panel" style={{ marginTop: '2rem' }}>
                                <h3>Join a Game Session</h3>
                                <input
                                    type="text"
                                    placeholder="Enter Session Code"
                                    value={sessionCodeInput}
                                    onChange={(e) => setSessionCodeInput(e.target.value)}
                                    disabled={loading}
                                    style={{ maxWidth: '250px' }}
                                />
                                <button onClick={handleJoinSession} disabled={loading}>
                                    Join Session
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

export default App;
