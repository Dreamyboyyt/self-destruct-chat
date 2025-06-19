// public/script.js

document.addEventListener('DOMContentLoaded', () => {
    const homeScreen = document.getElementById('home-screen');
    const messageViewScreen = document.getElementById('message-view-screen');
    const messageInput = document.getElementById('message-input');
    const expiryDurationInput = document.getElementById('expiry-duration-input');
    const expiryUnitSelect = document.getElementById('expiry-unit-select');
    const noTimeLimitCheckbox = document.getElementById('no-time-limit-checkbox');
    const durationInputGroup = document.querySelector('.duration-input-group'); // Get the container for duration input
    const generateLinkBtn = document.getElementById('generate-link-btn');
    const resultArea = document.getElementById('result-area');
    const displayedMessage = document.getElementById('displayed-message');
    const statusMessage = document.getElementById('status-message');

    // --- Toggle duration input based on checkbox ---
    function toggleDurationInput() {
        const isDisabled = noTimeLimitCheckbox.checked;
        expiryDurationInput.disabled = isDisabled;
        expiryUnitSelect.disabled = isDisabled;
        durationInputGroup.style.opacity = isDisabled ? '0.5' : '1'; // Visually indicate disabled
        durationInputGroup.style.pointerEvents = isDisabled ? 'none' : 'auto'; // Disable interaction
    }

    noTimeLimitCheckbox.addEventListener('change', toggleDurationInput);
    toggleDurationInput(); // Call on load to set initial state

    // --- Function to handle creating a new message ---
    async function createMessage() {
        const message = messageInput.value.trim();
        let ttlSeconds = null; // Default to null for no time limit

        if (!message) {
            alert('Please enter a message!');
            return;
        }

        if (!noTimeLimitCheckbox.checked) {
            const duration = parseInt(expiryDurationInput.value, 10);
            const unit = expiryUnitSelect.value;

            if (isNaN(duration) || duration <= 0) {
                alert('Please enter a valid positive number for the duration.');
                return;
            }

            switch (unit) {
                case 'seconds':
                    ttlSeconds = duration;
                    break;
                case 'minutes':
                    ttlSeconds = duration * 60;
                    break;
                case 'hours':
                    ttlSeconds = duration * 60 * 60;
                    break;
                default:
                    ttlSeconds = 600; // Default to 10 minutes if unit is somehow invalid
            }
        }

        try {
            const response = await fetch('/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message, ttlSeconds }), // Send ttlSeconds (can be null)
            });

            const data = await response.json();

            if (response.ok) {
                resultArea.innerHTML = `
                    <p>Your one-time link:</p>
                    <a href="${data.link}" target="_blank" rel="noopener noreferrer">${data.link}</a>
                    <p>Share this link! It will self-destruct after one read ${ttlSeconds !== null ? 'or expiry.' : 'only.'}</p>
                    <button id="copy-link-btn">Copy Link</button>
                `;
                const copyLinkBtn = document.getElementById('copy-link-btn');
                copyLinkBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(window.location.origin + data.link).then(() => { // Use window.location.origin for full URL
                        copyLinkBtn.textContent = 'Copied!';
                        setTimeout(() => copyLinkBtn.textContent = 'Copy Link', 2000);
                    }).catch(err => {
                        console.error('Failed to copy: ', err);
                        alert('Failed to copy link. Please copy it manually.');
                    });
                });
                messageInput.value = ''; // Clear the input
                expiryDurationInput.value = 10; // Reset duration input
                expiryUnitSelect.value = 'minutes'; // Reset unit select
                noTimeLimitCheckbox.checked = false; // Uncheck no time limit
                toggleDurationInput(); // Reset duration input state
            } else {
                resultArea.innerHTML = `<p style="color: red;">Error: ${data.error || 'Failed to create message.'}</p>`;
            }
        } catch (error) {
            console.error('Error creating message:', error);
            resultArea.innerHTML = `<p style="color: red;">Network error or server issue. Please try again.</p>`;
        }
    }

    // --- Function to handle reading a message ---
    async function readMessageFromUrl() {
        const path = window.location.pathname;
        const parts = path.split('/');
        const messageId = parts[2];

        if (parts[1] === 'read' && messageId) {
            homeScreen.style.display = 'none';
            messageViewScreen.style.display = 'block';

            try {
                const response = await fetch(`/api/read/${messageId}`);
                const data = await response.json();

                if (response.ok) {
                    displayedMessage.textContent = data.message;
                    statusMessage.textContent = '';
                } else {
                    displayedMessage.textContent = '';
                    statusMessage.textContent = data.error || 'An unknown error occurred.';
                    statusMessage.style.color = 'red';
                }
            } catch (error) {
                console.error('Error reading message:', error);
                displayedMessage.textContent = '';
                statusMessage.textContent = 'Network error or server issue. Could not retrieve message.';
                statusMessage.style.color = 'red';
            }
        } else {
            homeScreen.style.display = 'block';
            messageViewScreen.style.display = 'none';
        }
    }

    // --- Event Listeners ---
    generateLinkBtn.addEventListener('click', createMessage);

    // --- Initial Load Logic ---
    readMessageFromUrl();
});
