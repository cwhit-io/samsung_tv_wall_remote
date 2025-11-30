// Add these new utility functions to scripts.js

// Format timestamp for log messages
function formatTimestamp() {
    const now = new Date();
    return `${now.toLocaleTimeString()}`;
}

// Enhanced logging with timestamps
function appendLogWithTimestamp(message) {
    const timestamp = formatTimestamp();
    appendLog(`[${timestamp}] ${message}`);
}

// Get count of selected TVs
function getSelectedTVCount() {
    return document.querySelectorAll('.tv-cell.selected').length;
}

// Get names of selected TVs
function getSelectedTVNames() {
    return Array.from(document.querySelectorAll('.tv-cell.selected'))
        .map(cell => cell.title)
        .filter(title => title);
}

// Validate TV selection for commands
function validateTVSelection(minTVs = 1, maxTVs = Infinity) {
    const selectedCount = getSelectedTVCount();
    
    if (selectedCount < minTVs) {
        alert(`Please select at least ${minTVs} TV${minTVs > 1 ? 's' : ''}`);
        return false;
    }
    
    if (selectedCount > maxTVs) {
        alert(`Please select no more than ${maxTVs} TV${maxTVs > 1 ? 's' : ''}`);
        return false;
    }
    
    return true;
}

// Enhanced version of sendCommand with validation
function sendCommandWithValidation(command) {
    if (!validateTVSelection(1)) {
        return;
    }
    
    const selected = Array.from(document.querySelectorAll('.tv-cell.selected'));
    const ips = selected.map(el => el.dataset.ip).filter(ip => ip);
    const tvNames = getSelectedTVNames();
    
    appendLogWithTimestamp(`Sending ${command} to: ${tvNames.join(', ')}`);
    
    socket.emit('send_command', {
        command: command,
        ips: ips
    });
}

// Enhanced version of pairSelected with validation
function pairSelectedWithValidation(force = false) {
    if (!validateTVSelection(1, 1)) {
        return;
    }
    
    const ip = getSelectedTV();
    if (ip) {
        const tvName = document.querySelector(`.tv-cell[data-ip="${ip}"]`).title;
        appendLogWithTimestamp(`Attempting to pair with ${tvName} (${force ? 'force mode' : 'normal mode'})`);
        
        socket.emit('pair_tv', {
            ip: ip,
            force: force
        });
    }
}

// Get status of specific TV
function getTVStatus(ip) {
    const cell = document.querySelector(`.tv-cell[data-ip="${ip}"]`);
    if (!cell) return null;
    
    return {
        connected: cell.querySelector('.connection-indicator').classList.contains('connected'),
        powered: cell.querySelector('.power-indicator').classList.contains('connected'),
        tokenValid: cell.querySelector('.token-indicator').classList.contains('connected')
    };
}

// Check if all selected TVs are ready for commands
function areSelectedTVsReady() {
    const selected = Array.from(document.querySelectorAll('.tv-cell.selected'));
    return selected.every(cell => {
        const status = getTVStatus(cell.dataset.ip);
        return status && status.connected && status.powered && status.tokenValid;
    });
}