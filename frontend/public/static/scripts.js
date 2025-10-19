const socket = io();
const logWindow = document.getElementById('log');
let checkingInProgress = false;  // Add this flag to prevent multiple simultaneous checks

// Utility Functions
function formatTimestamp() {
    const now = new Date();
    return `${now.toLocaleTimeString()}`;
}

function appendLog(message) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = message;
    logWindow.appendChild(div);
    logWindow.scrollTop = logWindow.scrollHeight;
}

function appendLogWithTimestamp(message) {
    const timestamp = formatTimestamp();
    appendLog(`[${timestamp}] ${message}`);
}

function getSelectedTVCount() {
    return document.querySelectorAll('.tv-cell.selected').length;
}

function getSelectedTVNames() {
    return Array.from(document.querySelectorAll('.tv-cell.selected'))
        .map(cell => cell.title)
        .filter(title => title);
}

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

function getTVStatus(ip) {
    const cell = document.querySelector(`.tv-cell[data-ip="${ip}"]`);
    if (!cell) return null;
    
    return {
        connected: cell.querySelector('.connection-indicator').classList.contains('connected'),
        powered: cell.querySelector('.power-indicator').classList.contains('connected'),
        tokenValid: cell.querySelector('.token-indicator').classList.contains('connected')
    };
}

function areSelectedTVsReady() {
    const selected = Array.from(document.querySelectorAll('.tv-cell.selected'));
    return selected.every(cell => {
        const status = getTVStatus(cell.dataset.ip);
        return status && status.connected && status.powered && status.tokenValid;
    });
}

function formatTVStatus(status) {
    const statusParts = [];
    if (status.reachable) statusParts.push("reachable");
    if (status.powered) statusParts.push("powered on");
    if (status.token_valid) statusParts.push("token valid");
    return statusParts.length ? statusParts.join(", ") : "all checks failed";
}

// Socket Event Handlers
socket.on('connect', () => {
    appendLogWithTimestamp('Connected to server');
});

socket.on('log_message', (data) => {
    appendLog(data.message);
});

socket.on('tv_grid', (grid) => {
    updateTVGrid(grid);
});

socket.on('error', (data) => {
    alert(data.message);
});

socket.on('pair_success', (data) => {
    const cells = document.querySelectorAll('.tv-cell');
    cells.forEach(cell => {
        if (cell.dataset.ip === data.ip) {
            cell.classList.add('paired');
            setTimeout(() => cell.classList.remove('paired'), 2000);
        }
    });
});

socket.on('pair_failed', (data) => {
    const cells = document.querySelectorAll('.tv-cell');
    cells.forEach(cell => {
        if (cell.dataset.ip === data.ip) {
            cell.classList.add('pair-failed');
            setTimeout(() => cell.classList.remove('pair-failed'), 2000);
        }
    });
});

socket.on('connection_status', (data) => {
    const statuses = data.statuses;
    const cells = document.querySelectorAll('.tv-cell');
    
    cells.forEach(cell => {
        const ip = cell.dataset.ip;
        if (!ip) return; // Skip cells without IP
        
        const status = statuses[ip] || {
            reachable: false,
            powered: false,
            token_valid: false
        };
        
        const tvName = cell.title.split(' (')[0];
        
        // Log the status update
        appendLogWithTimestamp(`Status update for ${tvName}: ${formatTVStatus(status)}`);
        
        // Get all indicators for this cell
        const connectionIndicator = cell.querySelector('.connection-indicator');
        const powerIndicator = cell.querySelector('.power-indicator');
        const tokenIndicator = cell.querySelector('.token-indicator');
        
        // Update all indicators
        [connectionIndicator, powerIndicator, tokenIndicator].forEach(indicator => {
            if (!indicator) return;
            
            // Remove all states
            indicator.classList.remove('checking', 'connected', 'disconnected');
            
            // Add appropriate state
            if (indicator === connectionIndicator) {
                indicator.classList.add(status.reachable ? 'connected' : 'disconnected');
            } else if (indicator === powerIndicator) {
                indicator.classList.add(status.powered ? 'connected' : 'disconnected');
            } else if (indicator === tokenIndicator) {
                indicator.classList.add(status.token_valid ? 'connected' : 'disconnected');
            }
        });
    });
    
    // Reset checking flag after status updates are complete
    checkingInProgress = false;
});

// UI Functions
function updateTVGrid(grid) {
    ['T', 'M', 'B'].forEach(row => {
        for (let i = 1; i <= 5; i++) {
            const cell = document.querySelector(`#row-${row} .tv-cell:nth-child(${i})`);
            const tv = grid[row][i];
            if (tv) {
                cell.dataset.ip = tv.ip;
                cell.title = `${tv.name} (${tv.ip})`;
                cell.classList.remove('inactive');
                const indicators = cell.querySelectorAll('.connection-indicator, .power-indicator, .token-indicator');
                indicators.forEach(indicator => {
                    indicator.style.display = 'block';
                });
            } else {
                cell.dataset.ip = '';
                cell.title = '';
                cell.classList.add('inactive');
                cell.classList.remove('selected');
                const indicators = cell.querySelectorAll('.connection-indicator, .power-indicator, .token-indicator');
                indicators.forEach(indicator => {
                    indicator.style.display = 'none';
                });
            }
        }
    });

}

function toggleSelect(element) {
    if (element.dataset.ip && !element.classList.contains('inactive')) {
        element.classList.toggle('selected');
    }
}

function selectAll() {
    document.querySelectorAll('.tv-cell').forEach(cell => {
        if (cell.dataset.ip && !cell.classList.contains('inactive')) {
            cell.classList.add('selected');
        }
    });
}

function deselectAll() {
    document.querySelectorAll('.tv-cell').forEach(cell => {
        cell.classList.remove('selected');
    });
}

function selectRow(row) {
    document.querySelectorAll(`#row-${row} .tv-cell`).forEach(cell => {
        if (cell.dataset.ip && !cell.classList.contains('inactive')) {
            cell.classList.add('selected');
        }
    });
}

function checkConnections() {
    // Prevent multiple simultaneous checks
    if (checkingInProgress) {
        console.log('Previous check still in progress, skipping...');
        return;
    }
    
    checkingInProgress = true;
    appendLogWithTimestamp("Starting connection check for all TVs...");
    
    const cells = document.querySelectorAll('.tv-cell');
    cells.forEach(cell => {
        if (cell.dataset.ip) {
            const tvName = cell.title.split(' (')[0];
            appendLogWithTimestamp(`Checking ${tvName}...`);
            const indicators = cell.querySelectorAll('.connection-indicator, .power-indicator, .token-indicator');
            indicators.forEach(indicator => {
                indicator.classList.remove('connected', 'disconnected');
                indicator.classList.add('checking');
            });
        }
    });
    
    socket.emit('check_connections');
}

// Command Functions
function sendCommandWithValidation(command) {
    if (!validateTVSelection(1)) {
        return;
    }
    
    const selected = Array.from(document.querySelectorAll('.tv-cell.selected'));
    const ips = selected.map(el => el.dataset.ip).filter(ip => ip);
    const tvNames = getSelectedTVNames();
    
    appendLogWithTimestamp(`Sending ${command} to: ${tvNames.join(', ')}`);
    console.log('Emitting send_command', { command, ips }); // <-- Add this line

    socket.emit('send_command', {
        command: command,
        ips: ips
    });
}

function sendCommand(command) {
    sendCommandWithValidation(command);
}

function getSelectedTV() {
    const selected = Array.from(document.querySelectorAll('.tv-cell.selected'));
    if (selected.length === 0) {
        alert('Please select a TV to pair');
        return null;
    }
    if (selected.length > 1) {
        alert('Please select only one TV for pairing');
        return null;
    }
    return selected[0].dataset.ip;
}

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

function pairSelected() {
    pairSelectedWithValidation(false);
}

function pairSelectedForce() {
    pairSelectedWithValidation(true);
}

function discoverTVs() {
    socket.emit('discover_tvs');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    discoverTVs();
    // Check connections every 60 seconds
    setInterval(() => {
        try {
            checkConnections();
        } catch (error) {
            console.error('Error during connection check:', error);
            appendLogWithTimestamp('Error during connection check: ' + error.message);
            checkingInProgress = false;  // Reset the flag on error
        }
    }, 60000);
});