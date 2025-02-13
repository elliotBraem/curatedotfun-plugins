// Default configuration
const DEFAULT_CONFIG = {
    distribute: [
        {
            plugin: "notion",
            config: {
                token: "{NOTION_TOKEN}",
                databaseId: "your-database-id"
            }
        },
        {
            plugin: "telegram",
            config: {
                botToken: "{TELEGRAM_BOT_TOKEN}",
                channelId: "@your_channel"
            }
        }
    ]
};

// DOM Elements
const configEditor = document.getElementById('configEditor');
const saveConfigBtn = document.getElementById('saveConfig');
const resetConfigBtn = document.getElementById('resetConfig');
const distributeBtn = document.getElementById('distribute');
const configStatus = document.getElementById('configStatus');
const distributeStatus = document.getElementById('distributeStatus');

// Load configuration from localStorage or use default
function loadConfig() {
    const savedConfig = localStorage.getItem('pluginConfig');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            configEditor.value = JSON.stringify(config, null, 2);
            updateConfigStatus('Configuration loaded from localStorage', 'success');
        } catch (error) {
            console.error('Failed to parse saved config:', error);
            resetConfig();
        }
    } else {
        resetConfig();
    }
}

// Reset configuration to default
function resetConfig() {
    configEditor.value = JSON.stringify(DEFAULT_CONFIG, null, 2);
    updateConfigStatus('Configuration reset to default', 'success');
}

// Save configuration to localStorage
function saveConfig() {
    try {
        const config = JSON.parse(configEditor.value);
        localStorage.setItem('pluginConfig', JSON.stringify(config));
        updateConfigStatus('Configuration saved successfully', 'success');
    } catch (error) {
        updateConfigStatus(`Invalid JSON: ${error.message}`, 'error');
    }
}

// Update status message
function updateConfigStatus(message, type = 'info') {
    configStatus.textContent = message;
    configStatus.className = `status ${type}`;
}

function updateDistributeStatus(message, type = 'info') {
    distributeStatus.textContent = message;
    distributeStatus.className = `status ${type}`;
}

// Distribute content using configured plugins
async function distribute() {
    try {
        const config = JSON.parse(configEditor.value);
        
        if (!config.distribute || !Array.isArray(config.distribute)) {
            throw new Error('Invalid configuration: missing or invalid distribute array');
        }

        distributeBtn.disabled = true;
        updateDistributeStatus('Distributing content...', 'info');

        const response = await fetch('/api/distribute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Distribution failed');
        }

        const result = await response.json();
        updateDistributeStatus('Distribution completed successfully:\n' + JSON.stringify(result, null, 2), 'success');
    } catch (error) {
        updateDistributeStatus(`Distribution failed: ${error.message}`, 'error');
    } finally {
        distributeBtn.disabled = false;
    }
}

// Event Listeners
saveConfigBtn.addEventListener('click', saveConfig);
resetConfigBtn.addEventListener('click', resetConfig);
distributeBtn.addEventListener('click', distribute);

// Format JSON on input
configEditor.addEventListener('input', () => {
    try {
        const config = JSON.parse(configEditor.value);
        updateConfigStatus('Valid JSON', 'success');
    } catch (error) {
        updateConfigStatus(`Invalid JSON: ${error.message}`, 'error');
    }
});

// Initialize
loadConfig();
