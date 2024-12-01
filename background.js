// background.js

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        // Reset storage and open onboarding
        await chrome.storage.local.clear();
        const url = chrome.runtime.getURL('onboarding.html');
        await chrome.tabs.create({ url });
    }
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'categorizeDM') {
        handleDMCategorization(message, sendResponse);
        return true; // Keep channel open for async response
    }

    if (message.action === 'checkSetup') {
        handleSetupCheck(sendResponse);
        return true;
    }

    if (message.action === 'openCategoryManager') {
        const url = chrome.runtime.getURL('onboarding.html#categories');
        chrome.tabs.create({ url });
        return false;
    }
});

// Handle DM categorization
async function handleDMCategorization(message, sendResponse) {
    try {
        const { messageText, apiKey, apiProvider, systemPrompt } = message;
        let category;

        if (apiProvider === 'anthropic') {
            category = await callAnthropicAPI(messageText, apiKey, systemPrompt);
        } else {
            category = await callOpenAIAPI(messageText, apiKey, systemPrompt);
        }

        sendResponse({ category });
    } catch (error) {
        console.error('Categorization error:', error);
        sendResponse({ error: error.message });
    }
}

// Handle setup check
function handleSetupCheck(sendResponse) {
    chrome.storage.local.get(['setupComplete', 'apiKey', 'categories'], function(result) {
        const isSetupComplete = result.setupComplete && result.apiKey && result.categories;
        sendResponse({ setupComplete: isSetupComplete });
    });
}

// Anthropic API call
async function callAnthropicAPI(messageText, apiKey, systemPrompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 10,
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: `Message to categorize: "${messageText}"`
                }
            ]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    return data.content[0].text.trim();
}

// OpenAI API call
async function callOpenAIAPI(messageText, apiKey, systemPrompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: messageText }
            ],
            max_tokens: 10,
            temperature: 0
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Error handling for API rate limits
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function handleAPIError(error, retryOperation) {
    if (retryCount < MAX_RETRIES && error.status === 429) { // Rate limit error
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));
        return await retryOperation();
    }
    retryCount = 0;
    throw error;
}