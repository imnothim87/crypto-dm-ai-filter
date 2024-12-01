// popup.js
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    chrome.storage.local.get(['enabled', 'apiKey', 'apiProvider', 'setupComplete'], function(result) {
        // Set extension toggle state
        const toggle = document.getElementById('extensionToggle');
        toggle.checked = result.enabled !== false;
        updateToggleVisuals(toggle.checked);
        
        // Set API fields
        if (result.apiKey) {
            document.getElementById('apiKey').value = result.apiKey;
        }
        if (result.apiProvider) {
            document.getElementById('apiProvider').value = result.apiProvider;
        }

        // Check if setup is complete
        if (!result.setupComplete) {
            showSetupIncompleteMessage();
        }
    });

    // Handle extension toggle
    document.getElementById('extensionToggle').addEventListener('change', function(e) {
        const enabled = e.target.checked;
        updateToggleVisuals(enabled);
        
        chrome.storage.local.set({ enabled: enabled }, function() {
            // Refresh active Twitter tabs
            chrome.tabs.query({url: ["https://*.x.com/*", "https://*.twitter.com/*"]}, function(tabs) {
                tabs.forEach(function(tab) {
                    chrome.tabs.reload(tab.id);
                });
            });
        });
    });

    // Update toggle visuals
    function updateToggleVisuals(enabled) {
        const statusText = document.querySelector('.status-text');
        const toggle = document.getElementById('extensionToggle');
        
        statusText.textContent = enabled ? 'Extension Enabled' : 'Extension Disabled';
        statusText.style.color = enabled ? '#1d9bf0' : '#536471';
    }

    // Handle save button
    document.getElementById('save').addEventListener('click', async function() {
        const button = document.getElementById('save');
        const originalText = button.textContent;
        
        try {
            const apiKey = document.getElementById('apiKey').value.trim();
            const apiProvider = document.getElementById('apiProvider').value;
            
            // Validate inputs
            if (!apiKey) {
                throw new Error('Please enter an API key');
            }

            // Validate API key format
            if (apiProvider === 'anthropic' && !apiKey.startsWith('sk-ant')) {
                throw new Error('Invalid Anthropic API key format');
            }
            if (apiProvider === 'openai' && !apiKey.startsWith('sk-')) {
                throw new Error('Invalid OpenAI API key format');
            }

            // Save settings
            await chrome.storage.local.set({ 
                apiKey: apiKey,
                apiProvider: apiProvider 
            });

            // Show success
            button.textContent = 'Settings Saved!';
            button.style.backgroundColor = '#28a745';
            
            // Reload active DM pages
            chrome.tabs.query({url: ["https://*.x.com/*", "https://*.twitter.com/*"]}, function(tabs) {
                tabs.forEach(function(tab) {
                    chrome.tabs.reload(tab.id);
                });
            });
        } catch (error) {
            // Show error
            button.textContent = error.message;
            button.style.backgroundColor = '#dc3545';
        }

        // Reset button after 3 seconds
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '#1d9bf0';
        }, 3000);
    });

    // Handle category management button
    document.getElementById('manageCategoriesBtn').addEventListener('click', function() {
        const url = chrome.runtime.getURL('onboarding.html#categories');
        chrome.tabs.create({ url });
    });

    // Handle reconfigure button
    document.getElementById('reconfigureBtn').addEventListener('click', function() {
        const url = chrome.runtime.getURL('onboarding.html');
        chrome.tabs.create({ url });
    });

    function showSetupIncompleteMessage() {
        const message = document.createElement('div');
        message.className = 'message error';
        message.textContent = 'Setup incomplete. Please run the setup process.';
        document.querySelector('.container').insertBefore(message, document.querySelector('.footer'));
    }

    // Handle API provider change
    document.getElementById('apiProvider').addEventListener('change', function() {
        const apiLinks = document.querySelector('.api-links');
        apiLinks.classList.toggle('anthropic-selected', this.value === 'anthropic');
    });
});