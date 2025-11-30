// Microeconomics Advent Calendar - Main Application Logic

// Configuration
const CONFIG = {
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-24'),
    totalDays: 24
};

// State
let calendarData = null;
let currentDay = null;

// Initialize the application
async function init() {
    try {
        // Load questions data
        const response = await fetch('questions.json');
        calendarData = await response.json();

        // Populate member dropdown
        populateMemberDropdown();

        // Generate calendar grid
        generateCalendar();

        // Setup event listeners
        setupEventListeners();

        console.log('Calendar initialized successfully');
    } catch (error) {
        console.error('Failed to initialize calendar:', error);
        document.getElementById('calendar').innerHTML =
            '<p style="color: var(--xmas-red); text-align: center;">Failed to load calendar data. Please refresh the page.</p>';
    }
}

// Populate the member selection dropdown
function populateMemberDropdown() {
    const select = document.getElementById('memberSelect');
    calendarData.members.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        select.appendChild(option);
    });
}

// Generate the calendar grid
function generateCalendar() {
    const grid = document.getElementById('calendar');
    grid.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= CONFIG.totalDays; day++) {
        const card = createDayCard(day, today);
        grid.appendChild(card);
    }
}

// Create a single day card
function createDayCard(day, today) {
    const card = document.createElement('div');
    card.className = 'day-card';
    card.dataset.day = day;

    const dayDate = new Date(CONFIG.startDate);
    dayDate.setDate(dayDate.getDate() + day - 1);

    const isUnlocked = today >= dayDate;
    const isCompleted = hasUserResponded(day);

    if (!isUnlocked) {
        card.classList.add('locked');
    } else if (isCompleted) {
        card.classList.add('completed');
    }

    // Day number
    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    card.appendChild(dayNumber);

    // Status indicator
    const status = document.createElement('span');
    status.className = 'day-status';
    if (!isUnlocked) {
        status.textContent = formatDate(dayDate);
    } else if (isCompleted) {
        status.textContent = 'Answered';
    } else {
        status.textContent = 'Open';
    }
    card.appendChild(status);

    // Click handler
    if (isUnlocked) {
        card.addEventListener('click', () => openDay(day));
    }

    return card;
}

// Format date for display
function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Check if user has responded to a day
function hasUserResponded(day) {
    const responses = getResponses(day);
    return responses.length > 0;
}

// Open a day's modal
function openDay(day) {
    currentDay = day;
    const dayData = calendarData.days.find(d => d.day === day);

    if (!dayData) {
        console.error('Day data not found:', day);
        return;
    }

    // Populate modal content
    document.getElementById('modalDay').textContent = day;
    document.getElementById('modalTopic').textContent = dayData.topic;
    document.getElementById('modalQuestion').textContent = dayData.question;

    // Load existing responses
    loadTeamResponses(day);

    // Check if answer should be revealed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const answerDate = new Date(CONFIG.startDate);
    answerDate.setDate(answerDate.getDate() + day); // Answer revealed next day

    const answerSection = document.getElementById('answerSection');
    const modalAnswer = document.getElementById('modalAnswer');

    if (today >= answerDate) {
        answerSection.classList.remove('hidden');
        modalAnswer.textContent = dayData.answer;
    } else {
        answerSection.classList.add('hidden');
        modalAnswer.textContent = '';
    }

    // Clear response form
    document.getElementById('memberSelect').value = '';
    document.getElementById('responseText').value = '';

    // Show modal
    document.getElementById('dayModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close the modal
function closeModal() {
    document.getElementById('dayModal').classList.remove('active');
    document.body.style.overflow = '';
    currentDay = null;
}

// Load team responses for a day
function loadTeamResponses(day) {
    const responsesList = document.getElementById('responsesList');
    const responses = getResponses(day);

    if (responses.length === 0) {
        responsesList.innerHTML = '<p style="opacity: 0.6; font-style: italic;">No responses yet. Be the first to answer!</p>';
        return;
    }

    responsesList.innerHTML = '';
    responses.forEach(response => {
        const item = document.createElement('div');
        item.className = 'response-item';

        const author = document.createElement('div');
        author.className = 'response-author';
        author.textContent = response.author;
        item.appendChild(author);

        const text = document.createElement('div');
        text.className = 'response-text';
        text.textContent = response.text;
        item.appendChild(text);

        const timestamp = document.createElement('div');
        timestamp.style.cssText = 'font-size: 0.75rem; opacity: 0.5; margin-top: 0.5rem;';
        timestamp.textContent = new Date(response.timestamp).toLocaleString();
        item.appendChild(timestamp);

        responsesList.appendChild(item);
    });
}

// Save a response
function saveResponse() {
    const member = document.getElementById('memberSelect').value;
    const text = document.getElementById('responseText').value.trim();

    if (!member) {
        alert('Please select your name from the dropdown.');
        return;
    }

    if (!text) {
        alert('Please write your response before saving.');
        return;
    }

    if (text.length < 50) {
        alert('Please write a more detailed response (at least 50 characters).');
        return;
    }

    // Check if this member already responded
    const existingResponses = getResponses(currentDay);
    const existingIndex = existingResponses.findIndex(r => r.author === member);

    const response = {
        author: member,
        text: text,
        timestamp: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        // Update existing response
        if (confirm('You have already submitted a response. Do you want to update it?')) {
            existingResponses[existingIndex] = response;
        } else {
            return;
        }
    } else {
        existingResponses.push(response);
    }

    // Save to localStorage
    saveResponses(currentDay, existingResponses);

    // Reload team responses
    loadTeamResponses(currentDay);

    // Clear form
    document.getElementById('memberSelect').value = '';
    document.getElementById('responseText').value = '';

    // Update calendar card status
    generateCalendar();

    alert('Your response has been saved!');
}

// Get responses from localStorage
function getResponses(day) {
    const key = `advent_responses_day_${day}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

// Save responses to localStorage
function saveResponses(day, responses) {
    const key = `advent_responses_day_${day}`;
    localStorage.setItem(key, JSON.stringify(responses));
}

// Setup event listeners
function setupEventListeners() {
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Close modal on backdrop click
    document.getElementById('dayModal').addEventListener('click', (e) => {
        if (e.target.id === 'dayModal') {
            closeModal();
        }
    });
}

// Export functions for HTML onclick handlers
window.closeModal = closeModal;
window.saveResponse = saveResponse;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
