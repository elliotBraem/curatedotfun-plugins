// DOM Elements for registry
const registryEditor = document.getElementById("registryEditor");
const updateRegistryBtn = document.getElementById("updateRegistry");
const registryStatus = document.getElementById("registryStatus");

let AVAILABLE_PLUGINS = {
  transform: [],
  distribute: [],
};

// Fetch and update plugin registry
async function fetchPluginRegistry() {
  try {
    const response = await fetch("/api/plugin-registry");
    if (!response.ok) {
      throw new Error("Failed to fetch plugin registry");
    }
    const { registry } = await response.json();

    // Update registry editor
    registryEditor.value = JSON.stringify(registry, null, 2);

    // Update available plugins
    AVAILABLE_PLUGINS = {
      transform: Object.entries(registry)
        .filter(([_, metadata]) => metadata.type === "transformer")
        .map(([name]) => name),
      distribute: Object.entries(registry)
        .filter(([_, metadata]) => metadata.type === "distributor")
        .map(([name]) => name),
    };

    // Update plugin lists if in config view
    if (currentView === "config") {
      updateConfigView();
    }

    updateRegistryStatus("Plugin registry loaded successfully", "success");
  } catch (error) {
    updateRegistryStatus(
      `Failed to load plugin registry: ${error.message}`,
      "error",
    );
  }
}

// Update plugin registry
async function updatePluginRegistry() {
  try {
    const newRegistry = JSON.parse(registryEditor.value);

    const response = await fetch("/api/plugin-registry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ registry: newRegistry }),
    });

    if (!response.ok) {
      throw new Error("Failed to update plugin registry");
    }

    await fetchPluginRegistry(); // Refresh the registry
    updateRegistryStatus("Plugin registry updated successfully", "success");
  } catch (error) {
    updateRegistryStatus(
      `Failed to update registry: ${error.message}`,
      "error",
    );
  }
}

function updateRegistryStatus(message, type = "info") {
  registryStatus.textContent = message;
  registryStatus.className = `status ${type}`;
}

// Plugin default configurations
const PLUGIN_DEFAULTS = {
  "@curatedotfun/ai-transform": {
    prompt: "Transform this into an engaging social media post",
    apiKey: "{OPENROUTER_API_KEY}",
    schema: {
      title: {
        type: "string",
        description: "Title derived from summary of content",
      },
      content: {
        type: "string",
        description: "Engaging social media post",
      },
    },
  },
  "@curatedotfun/object-transform": {
    mappings: {
      title: "Title: {{title}}",
      content: "Generated Content: {{content}}",
      tags: ["automated", "content"],
    },
  },
  "@curatedotfun/simple-transform": {
    format: "🚀 {{title}} \n\n {{content}} \n\n#{{#tags}}#{{.}}{{/tags}}",
  },
  "@curatedotfun/notion": {
    token: "{NOTION_TOKEN}",
    databaseId: "your-database-id",
  },
  "@curatedotfun/telegram": {
    botToken: "{TELEGRAM_BOT_TOKEN}",
    channelId: "@your_channel",
  },
  "@curatedotfun/rss": {
    url: "https://example.com/feed.xml",
  },
  "@curatedotfun/supabase": {
    url: "{SUPABASE_URL}",
    key: "{SUPABASE_KEY}",
    table: "your-table-name",
  },
};

// Default configuration
const DEFAULT_CONFIG = {
  transform: [
    {
      plugin: "@curatedotfun/ai-transform",
      config: PLUGIN_DEFAULTS["@curatedotfun/ai-transform"],
    },
    {
      plugin: "@curatedotfun/object-transform",
      config: PLUGIN_DEFAULTS["@curatedotfun/object-transform"],
    },
    {
      plugin: "@curatedotfun/simple-transform",
      config: PLUGIN_DEFAULTS["@curatedotfun/simple-transform"],
    },
  ],
  distribute: [
    {
      plugin: "@curatedotfun/telegram",
      config: {
        botToken: "{TELEGRAM_BOT_TOKEN}",
        channelId: "@your_channel",
      },
    },
  ],
};

// DOM Elements
const configEditor = document.getElementById("configEditor");
const contentEditor = document.getElementById("contentEditor");
const transformBtn = document.getElementById("transformer");
const saveConfigBtn = document.getElementById("saveConfig");
const resetConfigBtn = document.getElementById("resetConfig");
const distributeBtn = document.getElementById("distribute");
const configStatus = document.getElementById("configStatus");
const distributeStatus = document.getElementById("distributeStatus");
const transformStatus = document.getElementById("transformStatus");
const viewToggle = document.getElementById("viewToggle");
const jsonView = document.getElementById("jsonView");
const configView = document.getElementById("configView");

// Configuration view elements
const transformPluginList = document.getElementById("transformPluginList");
const distributePluginList = document.getElementById("distributePluginList");

let currentView = "json"; // 'json' or 'config'

// Toggle between JSON and Config views
function toggleView() {
  currentView = currentView === "json" ? "config" : "json";
  jsonView.style.display = currentView === "json" ? "block" : "none";
  configView.style.display = currentView === "config" ? "block" : "none";
  viewToggle.textContent = `Switch to ${currentView === "json" ? "Config" : "JSON"} View`;

  if (currentView === "config") {
    updateConfigView();
  } else {
    updateJsonView();
  }
}

// Update the configuration view based on the current JSON
function updateConfigView() {
  try {
    const config = JSON.parse(configEditor.value);

    // Clear existing plugin lists
    transformPluginList.innerHTML = "";
    distributePluginList.innerHTML = "";

    // Add transform plugins
    if (config.transform && Array.isArray(config.transform)) {
      config.transform.forEach((transform, index) => {
        addPluginToList("transformer", transform, index);
      });
    }

    // Add distribute plugins
    if (config.distribute && Array.isArray(config.distribute)) {
      config.distribute.forEach((distribute, index) => {
        addPluginToList("distribute", distribute, index);
      });
    }
  } catch (error) {
    updateConfigStatus("Failed to parse JSON configuration", "error");
  }
}

// Add a plugin configuration to the appropriate list
function addPluginToList(type, plugin, index) {
  const list =
    type === "transformer" ? transformPluginList : distributePluginList;
  const div = document.createElement("div");
  div.className = "plugin-item";

  // Plugin header with select and remove button
  const header = document.createElement("div");
  header.className = "plugin-header";

  const selectGroup = document.createElement("div");
  selectGroup.className = "plugin-select-group";

  const nameLabel = document.createElement("label");
  nameLabel.className = "form-label";
  nameLabel.textContent = "Plugin Name";

  // Plugin selection dropdown
  const select = document.createElement("select");
  AVAILABLE_PLUGINS[type].forEach((pluginName) => {
    const option = document.createElement("option");
    option.value = pluginName;
    option.textContent = pluginName;
    option.selected = pluginName === plugin.plugin;
    select.appendChild(option);
  });

  // Remove button
  const removeBtn = document.createElement("button");
  removeBtn.textContent = "Remove";
  removeBtn.onclick = () => {
    div.remove();
    updateJsonFromConfig();
  };

  // Config section
  const configGroup = document.createElement("div");
  const configLabel = document.createElement("label");
  configLabel.className = "form-label";
  configLabel.textContent = "Plugin Configuration";

  const textarea = document.createElement("textarea");
  textarea.className = "plugin-config";
  textarea.value = JSON.stringify(plugin.config, null, 2);

  // Event listeners
  select.onchange = () => {
    textarea.value = JSON.stringify(PLUGIN_DEFAULTS[select.value], null, 2);
    updateJsonFromConfig();
  };

  textarea.oninput = updateJsonFromConfig;

  // Assemble the components
  selectGroup.appendChild(nameLabel);
  selectGroup.appendChild(select);

  header.appendChild(selectGroup);
  header.appendChild(removeBtn);

  configGroup.appendChild(configLabel);
  configGroup.appendChild(textarea);

  div.appendChild(header);
  div.appendChild(configGroup);
  list.appendChild(div);
}

// Add new plugin button handler
function addNewPlugin(type) {
  const defaultPlugin = AVAILABLE_PLUGINS[type][0];
  const pluginConfig = {
    plugin: defaultPlugin,
    config: PLUGIN_DEFAULTS[defaultPlugin],
  };
  addPluginToList(
    type,
    pluginConfig,
    type === "transformer"
      ? transformPluginList.children.length
      : distributePluginList.children.length,
  );
  updateJsonFromConfig();
}

// Update JSON view based on the configuration view
function updateJsonFromConfig() {
  const config = {
    transform: [],
    distribute: [],
  };

  // Collect transform plugins
  Array.from(transformPluginList.children).forEach((div) => {
    const select = div.querySelector("select");
    const textarea = div.querySelector("textarea");
    try {
      config.transform.push({
        plugin: select.value,
        config: JSON.parse(textarea.value),
      });
    } catch (error) {
      console.error("Invalid JSON in transform config:", error);
    }
  });

  // Collect distribute plugins
  Array.from(distributePluginList.children).forEach((div) => {
    const select = div.querySelector("select");
    const textarea = div.querySelector("textarea");
    try {
      config.distribute.push({
        plugin: select.value,
        config: JSON.parse(textarea.value),
      });
    } catch (error) {
      console.error("Invalid JSON in distribute config:", error);
    }
  });

  configEditor.value = JSON.stringify(config, null, 2);
  updateConfigStatus("Configuration updated", "success");
  updateTransformButton();
}

// Update JSON view
function updateJsonView() {
  // No need to do anything special here as the JSON is always kept up to date
}

// Update transform button state
function updateTransformButton() {
  const transformBtn = document.getElementById("transformer");
  try {
    const config = JSON.parse(configEditor.value);
    transformBtn.disabled =
      !config.transform ||
      !Array.isArray(config.transform) ||
      config.transform.length === 0;
  } catch (error) {
    transformBtn.disabled = true;
  }
}

// Transform content using all configured transform plugins in sequence
async function transformContent() {
  const content = contentEditor.value;
  if (!content) {
    updateTransformStatus("Please enter some content first", "error");
    return;
  }

  const transformBtn = document.getElementById("transformer");
  transformBtn.disabled = true;

  try {
    const config = JSON.parse(configEditor.value);
    if (!config.transform || !Array.isArray(config.transform)) {
      throw new Error("No transform plugins configured");
    }

    let currentContent = content;
    updateTransformStatus("Starting transformations...", "info");

    for (const [index, transformConfig] of config.transform.entries()) {
      updateTransformStatus(
        `Transforming with ${transformConfig.plugin} (${index + 1}/${config.transform.length})...`,
        "info",
      );

      // Try to parse current content as JSON if it's a string that looks like JSON
      let parsedContent = currentContent;
      if (typeof currentContent === "string") {
        try {
          parsedContent = JSON.parse(currentContent);
        } catch (e) {
          // Not JSON, use as-is
          parsedContent = { content: currentContent };
        }
      }

      const response = await fetch("/api/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plugin: transformConfig.plugin,
          config: transformConfig.config,
          content: parsedContent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Transform failed");
      }

      const result = await response.json();
      currentContent = result.output;
      // Format the output for display
      contentEditor.value =
        typeof currentContent === "object"
          ? JSON.stringify(currentContent, null, 2)
          : currentContent;
    }

    updateTransformStatus(
      "All transformations completed successfully",
      "success",
    );
  } catch (error) {
    updateTransformStatus(`Transform failed: ${error.message}`, "error");
  } finally {
    transformBtn.disabled = false;
  }
}

function updateTransformStatus(message, type = "info") {
  transformStatus.textContent = message;
  transformStatus.className = `status ${type}`;
}

// Load configuration from localStorage or use default
function loadConfig() {
  const savedConfig = localStorage.getItem("pluginConfig");
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig);
      configEditor.value = JSON.stringify(config, null, 2);
      updateConfigStatus("Configuration loaded from localStorage", "success");
    } catch (error) {
      console.error("Failed to parse saved config:", error);
      resetConfig();
    }
  } else {
    resetConfig();
  }
}

// Reset configuration to default
function resetConfig() {
  configEditor.value = JSON.stringify(DEFAULT_CONFIG, null, 2);
  updateConfigStatus("Configuration reset to default", "success");
}

// Save configuration to localStorage
function saveConfig() {
  try {
    const config = JSON.parse(configEditor.value);
    localStorage.setItem("pluginConfig", JSON.stringify(config));
    updateConfigStatus("Configuration saved successfully", "success");
  } catch (error) {
    updateConfigStatus(`Invalid JSON: ${error.message}`, "error");
  }
}

// Update status message
function updateConfigStatus(message, type = "info") {
  configStatus.textContent = message;
  configStatus.className = `status ${type}`;
}

function updateDistributeStatus(message, type = "info") {
  distributeStatus.textContent = message;
  distributeStatus.className = `status ${type}`;
}

// Distribute content using configured plugins
async function distribute() {
  try {
    const config = JSON.parse(configEditor.value);

    if (!config.distribute || !Array.isArray(config.distribute)) {
      throw new Error(
        "Invalid configuration: missing or invalid distribute array",
      );
    }

    distributeBtn.disabled = true;
    updateDistributeStatus("Distributing content...", "info");

    const content = contentEditor.value;
    if (!content) {
      throw new Error("Please enter content to distribute");
    }

    // Try to parse content as JSON if it's a string that looks like JSON
    let parsedContent = content;
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      // Not JSON, use as-is
      parsedContent = content;
    }

    const response = await fetch("/api/distribute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...config,
        content: parsedContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Distribution failed");
    }

    const result = await response.json();
    updateDistributeStatus(
      "Distribution completed successfully:\n" +
        JSON.stringify(result, null, 2),
      "success",
    );
  } catch (error) {
    updateDistributeStatus(`Distribution failed: ${error.message}`, "error");
  } finally {
    distributeBtn.disabled = false;
  }
}

// Event Listeners
saveConfigBtn.addEventListener("click", () => {
  saveConfig();
  updateTransformButton();
});

resetConfigBtn.addEventListener("click", () => {
  resetConfig();
  updateTransformButton();
});

distributeBtn.addEventListener("click", distribute);
transformBtn.addEventListener("click", transformContent);

// Format JSON and update button states
configEditor.addEventListener("input", () => {
  try {
    const config = JSON.parse(configEditor.value);
    updateConfigStatus("Valid JSON", "success");
    updateTransformButton();
  } catch (error) {
    updateConfigStatus(`Invalid JSON: ${error.message}`, "error");
    updateTransformButton();
  }
});

// Event Listeners
viewToggle.addEventListener("click", toggleView);

document
  .getElementById("addTransformPlugin")
  .addEventListener("click", () => addNewPlugin("transformer"));
document
  .getElementById("addDistributePlugin")
  .addEventListener("click", () => addNewPlugin("distribute"));

// Initialize
updateRegistryBtn.addEventListener("click", updatePluginRegistry);
fetchPluginRegistry().then(() => {
  loadConfig();
  updateTransformButton();
  toggleView(); // Start in config view
});
