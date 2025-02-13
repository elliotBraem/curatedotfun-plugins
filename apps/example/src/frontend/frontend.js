// Default configuration
const DEFAULT_CONFIG = {
    transform: [
        {
            plugin: "simple-transform",
            config: {
                format: "🚀 {CONTENT} #automated"
            }
        },
        {
            plugin: "ai-transform",
            config: {
                prompt: "Transform this into an engaging social media post",
                apiKey: "{OPENROUTER_API_KEY}"
            }
        }
    ],
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
const contentEditor = document.getElementById('contentEditor');
const transformBtn = document.getElementById('transform');
const saveConfigBtn = document.getElementById('saveConfig');
const resetConfigBtn = document.getElementById('resetConfig');
const distributeBtn = document.getElementById('distribute');
const configStatus = document.getElementById('configStatus');
const distributeStatus = document.getElementById('distributeStatus');
const transformStatus = document.getElementById('transformStatus');

// Update transform button state
function updateTransformButton() {
    const transformBtn = document.getElementById('transform');
    try {
        const config = JSON.parse(configEditor.value);
        transformBtn.disabled = !config.transform || !Array.isArray(config.transform) || config.transform.length === 0;
    } catch (error) {
        transformBtn.disabled = true;
    }
}

// Transform content using all configured transform plugins in sequence
async function transformContent() {
    const content = contentEditor.value;
    if (!content) {
        updateTransformStatus('Please enter some content first', 'error');
        return;
    }

    const transformBtn = document.getElementById('transform');
    transformBtn.disabled = true;

    try {
        const config = JSON.parse(configEditor.value);
        if (!config.transform || !Array.isArray(config.transform)) {
            throw new Error('No transform plugins configured');
        }

        let currentContent = content;
        updateTransformStatus('Starting transformations...', 'info');

        for (const [index, transformConfig] of config.transform.entries()) {
            updateTransformStatus(`Transforming with ${transformConfig.plugin} (${index + 1}/${config.transform.length})...`, 'info');
            
            const response = await fetch('/api/transform', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    plugin: transformConfig.plugin,
                    config: transformConfig.config,
                    content: {
                    content: currentContent
                }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Transform failed');
            }

            const result = await response.json();
            currentContent = result.output;
            contentEditor.value = currentContent;
        }

        updateTransformStatus('All transformations completed successfully', 'success');
    } catch (error) {
        updateTransformStatus(`Transform failed: ${error.message}`, 'error');
    } finally {
        transformBtn.disabled = false;
    }
}

function updateTransformStatus(message, type = 'info') {
    transformStatus.textContent = message;
    transformStatus.className = `status ${type}`;
}

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

        const content = contentEditor.value;
        if (!content) {
            throw new Error('Please enter content to distribute');
        }

        const response = await fetch('/api/distribute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...config,
                content
            })
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
saveConfigBtn.addEventListener('click', () => {
    saveConfig();
    updateTransformButton();
});

resetConfigBtn.addEventListener('click', () => {
    resetConfig();
    updateTransformButton();
});

distributeBtn.addEventListener('click', distribute);
transformBtn.addEventListener('click', transformContent);

// Format JSON and update button states
configEditor.addEventListener('input', () => {
    try {
        const config = JSON.parse(configEditor.value);
        updateConfigStatus('Valid JSON', 'success');
        updateTransformButton();
    } catch (error) {
        updateConfigStatus(`Invalid JSON: ${error.message}`, 'error');
        updateTransformButton();
    }
});

// Initialize
loadConfig();
updateTransformButton();
