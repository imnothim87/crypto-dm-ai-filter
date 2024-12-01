// content.js

// Debug function
function debugLog(message, ...args) {
    console.log(`[DM Filter Debug]: ${message}`, ...args);
}

// Load categories from storage
async function loadCategories() {
    try {
        const result = await chrome.storage.local.get(['categories', 'customCategories']);
        const allCategories = { ...(result.categories || {}), ...(result.customCategories || {}) };
        debugLog(`Loaded ${Object.keys(allCategories).length} categories`);
        return allCategories;
    } catch (error) {
        debugLog('Error loading categories:', error);
        return {};
    }
}

// Create dynamic prompt
function createDynamicPrompt(categories) {
    const prompt = `You are a specialized DM categorization assistant for crypto Twitter. Analyze each message and categorize it into one of these categories:

${Object.entries(categories).map(([id, cat]) => 
    `${id.toUpperCase()}: ${cat.description}`
).join('\n\n')}

Respond with only the category name in uppercase.`;
    
    return prompt;
}

// Add category indicator
function addCategoryIndicator(element, category, categories) {
    debugLog('Adding category indicator for category:', category);
    
    const existingIndicator = element.querySelector('.category-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    const indicator = document.createElement('div');
    indicator.className = 'category-indicator';
    indicator.style.backgroundColor = categories[category]?.color || '#9E9E9E';
    
    if (categories[category]) {
        indicator.title = categories[category].name;
    }

    const nameContainer = element.querySelector('[dir] > span') || element.firstChild;
    if (nameContainer) {
        nameContainer.parentElement.insertBefore(indicator, nameContainer);
    }
}

// Categorize message
async function categorizeDM(messageText, apiKey, apiProvider) {
    debugLog('Categorizing message:', messageText);
    
    try {
        const categories = await loadCategories();
        const cleanedMessage = messageText.replace(/\s+/g, ' ').trim();

        if (!cleanedMessage || cleanedMessage.length < 3) {
            return 'general';
        }

        // Check for spam patterns
        const spamPatterns = [
            /\b(?:free crypto|free (btc|eth|bnb))\b/i,
            /\b(?:x1000|100x|1000x)\b/i,
            /\b(?:earn easy|make money fast)\b/i,
            /\b(?:join now|urgent|act fast)\b/i,
            /\b(?:doubler|multiplier|investment scheme)\b/i,
            /t\.me\//i,
            /discord\.gg\//i
        ];

        if (spamPatterns.some(pattern => pattern.test(cleanedMessage))) {
            return 'spam';
        }

        const systemPrompt = createDynamicPrompt(categories);

        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'categorizeDM',
                messageText: cleanedMessage,
                apiKey: apiKey,
                apiProvider: apiProvider,
                systemPrompt: systemPrompt
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response.category);
                }
            });
        });

        const category = response.toLowerCase().trim();
        if (!categories[category]) {
            debugLog('Invalid category received:', category);
            return inferCategory(messageText);
        }

        return category;
    } catch (error) {
        debugLog('Error in categorizeDM:', error);
        return inferCategory(messageText);
    }
}

// Infer category from message content
function inferCategory(messageText) {
    const text = messageText.toLowerCase();
    
    if (/(wallet|hack|stolen|urgent|verify|validate|sync)/i.test(text)) {
        return 'spam';
    }
    if (/(buy|sell|price|chart|market|trading|signal|alpha)/i.test(text)) {
        return 'trading';
    }
    if (/(nft|collection|mint|artwork|pfp)/i.test(text)) {
        return 'nft';
    }
    if (/(paid|sponsor|promote|advertis|marketing|budget)/i.test(text)) {
        return 'paid_promo';
    }
    if (/(project|launch|token|protocol|platform|whitepaper)/i.test(text)) {
        return 'projects';
    }
    if (/(retweet|share|like|post|engagement)/i.test(text)) {
        return 'post_request';
    }
    if (/(partnership|opportunity|business|invest|collab)/i.test(text)) {
        return 'opportunities';
    }
    
    return 'general';
}

// Create filter UI
async function createFilterUI() {
    debugLog('Creating filter UI');
    const container = document.createElement('div');
    container.className = 'dm-filter-container';

    try {
        const categories = await loadCategories();
        
        // Add 'all' button
        const allButton = document.createElement('button');
        allButton.textContent = 'All';
        allButton.dataset.category = 'all';
        allButton.className = 'dm-filter-button active';
        container.appendChild(allButton);

        // Add category buttons
        Object.entries(categories).forEach(([id, category]) => {
            const button = document.createElement('button');
            button.textContent = category.name;
            button.dataset.category = id.toLowerCase();
            button.className = 'dm-filter-button';
            button.style.borderColor = category.color;
            container.appendChild(button);
        });

        // Add click handler
        container.addEventListener('click', (event) => {
            const button = event.target.closest('.dm-filter-button');
            if (button) {
                filterMessages(button.dataset.category);
            }
        });
    } catch (error) {
        debugLog('Error creating filter UI:', error);
    }

    return container;
}

// Filter messages by category
function filterMessages(category) {
    debugLog('Filtering messages for category:', category);
    document.querySelectorAll('[data-dm-category]').forEach(message => {
        message.style.display = (category === 'all' || message.dataset.dmCategory === category) ? '' : 'none';
    });

    // Update active button
    document.querySelectorAll('.dm-filter-button').forEach(button => {
        button.classList.toggle('active', button.dataset.category === category);
    });
}

// Extract message text
function extractMessageText(conversation) {
    const textElements = [
        ...conversation.querySelectorAll('span'),
        ...conversation.querySelectorAll('div[dir="ltr"]'),
        ...conversation.querySelectorAll('div[dir="auto"]')
    ];

    const textPieces = textElements
        .map(el => el.textContent.trim())
        .filter(text => text.length > 0);

    return textPieces.sort((a, b) => b.length - a.length)[0] || conversation.textContent.trim();
}

// Process messages
async function processMessages(mainColumn, apiKey, apiProvider) {
    const conversationSelectors = [
        'div[data-testid="conversation"]',
        'div[data-testid="DMConversation"]',
        'div[role="row"]',
        'div[data-testid="cellInnerDiv"]'
    ];

    let conversations = [];
    for (const selector of conversationSelectors) {
        conversations = Array.from(mainColumn.querySelectorAll(selector));
        if (conversations.length > 0) break;
    }

    if (conversations.length === 0) {
        conversations = Array.from(mainColumn.querySelectorAll('div[style*="position: relative"]'))
            .filter(el => el.textContent.length > 0 && (el.querySelector('img') || el.querySelector('time')));
    }

    if (conversations.length === 0) {
        debugLog('No conversations found. Retrying...');
        setTimeout(() => initDMFilter(), 2000);
        return;
    }

    debugLog(`Processing ${conversations.length} conversations`);
    const categories = await loadCategories();
    const processedMessages = new Set();

    for (const conversation of conversations) {
        const messageId = conversation.dataset.conversationId || 
                         conversation.getAttribute('id') || 
                         conversation.textContent.trim();

        if (processedMessages.has(messageId) || conversation.hasAttribute('data-dm-category')) {
            continue;
        }

        processedMessages.add(messageId);
        const messageText = extractMessageText(conversation);

        if (messageText) {
            const category = await categorizeDM(messageText, apiKey, apiProvider);
            conversation.dataset.dmCategory = category;
            addCategoryIndicator(conversation, category, categories);
        }
    }
}

// Initialize DM Filter
async function initDMFilter() {
    debugLog('Initializing DM Filter');

    try {
        const setupCheck = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'checkSetup' }, resolve);
        });

        if (!setupCheck.setupComplete) {
            debugLog('Setup not complete');
            return;
        }

        const mainColumn = document.querySelector([
            'div[data-testid="DMDrawer"]',
            'div[data-testid="DMInbox"]',
            'div[data-testid="primaryColumn"]',
            'main[role="main"]'
        ].join(','));

        if (!mainColumn) {
            debugLog('DM container not found, retrying...');
            setTimeout(initDMFilter, 1000);
            return;
        }

        // Remove existing filter UI
        const existingUI = document.querySelector('.dm-filter-container');
        if (existingUI) {
            existingUI.remove();
        }

        // Create new filter UI
        const filterUI = await createFilterUI();
        mainColumn.insertBefore(filterUI, mainColumn.firstChild);

        // Get API credentials and process messages
        const { apiKey, apiProvider } = await chrome.storage.local.get(['apiKey', 'apiProvider']);
        if (apiKey) {
            await processMessages(mainColumn, apiKey, apiProvider);
        }
    } catch (error) {
        debugLog('Error in initDMFilter:', error);
    }
}

// Debounce helper
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

// Initialize
debugLog('Script loaded');
const debouncedInit = debounce(initDMFilter, 1000);
debouncedInit();

// Set up observer
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            const hasNewConversations = Array.from(mutation.addedNodes).some(node => 
                node.nodeType === 1 && (
                    node.matches?.('div[data-testid="conversation"]') ||
                    node.querySelector?.('div[data-testid="conversation"]')
                )
            );
            
            if (hasNewConversations) {
                debugLog('New conversations detected');
                debouncedInit();
                break;
            }
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Listen for category updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'refreshCategories') {
        debugLog('Refreshing categories');
        debouncedInit();
        return true;
    }
});