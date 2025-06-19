// server.js

const express = require('express');
const path = require('path');
const app = express();

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- In-Memory Storage Logic ---
const messages = new Map(); // key: token, value: { content, expiry }

// Helper function to generate a unique, short token
function generateUniqueToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Stores a message in memory with a time-to-live (TTL).
 * @param {string} content - The message content.
 * @param {number|null} ttlSeconds - Time to live in seconds, or null for no time limit.
 * @returns {string} The unique ID (token) for the message.
 */
function storeMessage(content, ttlSeconds) { // ttlSeconds can now be null
  const id = generateUniqueToken();
  let expiry = null; // Default to no expiry

  if (typeof ttlSeconds === 'number' && ttlSeconds > 0) {
    expiry = Date.now() + ttlSeconds * 1000; // Calculate expiry timestamp
  }

  messages.set(id, { content, expiry });

  // Set a timeout to automatically delete the message after its TTL, ONLY if ttlSeconds is a positive number
  if (expiry !== null) {
    setTimeout(() => {
      if (messages.has(id)) { // Only delete if it hasn't been read and deleted already
        messages.delete(id);
        console.log(`Message ${id} expired and was deleted.`);
      }
    }, ttlSeconds * 1000);
    console.log(`Message ${id} stored with TTL ${ttlSeconds}s.`);
  } else {
    console.log(`Message ${id} stored with no time limit (read-once only).`);
  }

  return id;
}

/**
 * Reads a message from memory. If found and not expired, it deletes it (self-destructs).
 * @param {string} id - The unique ID (token) of the message.
 * @returns {string|null} The message content if found and valid, otherwise null.
 */
function readMessage(id) {
  const data = messages.get(id);

  if (!data) {
    console.log(`Attempted to read non-existent message: ${id}`);
    return null; // Message not found
  }

  // Check for expiry ONLY if expiry is not null
  if (data.expiry !== null && data.expiry < Date.now()) {
    messages.delete(id); // Delete expired message
    console.log(`Attempted to read expired message: ${id}`);
    return null; // Message expired
  }

  messages.delete(id); // Self-destruct: Delete message after it's read
  console.log(`Message ${id} read and deleted.`);
  return data.content;
}

// --- API Endpoints ---

// Endpoint to create a new message
app.post('/message', (req, res) => {
  const { message, ttlSeconds } = req.body; // ttlSeconds can now be null

  if (!message) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  // No more fixed validTtls array. ttlSeconds can be null or any positive number.
  // Basic validation is handled by storeMessage, but we can add more here if needed.
  if (ttlSeconds !== null && (typeof ttlSeconds !== 'number' || ttlSeconds <= 0)) {
      return res.status(400).json({ error: 'Invalid duration provided.' });
  }

  const id = storeMessage(message, ttlSeconds);
  const messageLink = `/read/${id}`; // Relative path for Vercel

  res.status(201).json({ link: messageLink });
});

// Endpoint to read a message (API call from frontend)
app.get('/api/read/:id', (req, res) => {
  const messageId = req.params.id;
  const content = readMessage(messageId);

  if (content) {
    res.status(200).json({ message: content });
  } else {
    res.status(404).json({ error: 'This message has self-destructed or never existed.' });
  }
});

// --- Frontend Routing ---
app.get(['/', '/read/:id'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- EXPORT THE APP FOR VERCEL ---
module.exports = app;
