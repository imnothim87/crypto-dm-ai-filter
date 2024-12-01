// onboarding.js
document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    var currentStep = 1;
    var customCategories = {};

    // Default categories configuration
    var DEFAULT_CATEGORIES = {
        PRIORITY: {
            name: 'Priority',
            color: '#FFD700',
            description: 'Important messages that need immediate attention or from starred contacts.',
            examples: '- Follow-up required\n- Time-sensitive opportunities\n- Messages from VIP contacts',
            editable: false
        },
        OPPORTUNITIES: {
            name: 'Opportunities',
            color: '#4CAF50',
            description: 'Business and collaboration opportunities, partnership requests, and investment discussions.',
            examples: '- "Would love to explore a partnership"\n- "Interested in investing in your project"\n- "Let\'s collaborate on a new venture"',
            editable: true
        },
        PAID_PROMO: {
            name: 'Paid Promotions',
            color: '#9C27B0',
            description: 'Sponsored content requests, promotional offers, and advertising inquiries.',
            examples: '- "Would you be interested in a paid promotion?"\n- "Looking for influencers for our campaign"\n- "Paid partnership opportunity"',
            editable: true
        },
        SPAM: {
            name: 'Spam',
            color: '#F44336',
            description: 'Suspicious messages, scams, and unwanted promotional content.',
            examples: '- "Get rich quick"\n- "10000x guaranteed"\n- Suspicious links',
            editable: false
        },
        GENERAL: {
            name: 'General',
            color: '#2196F3',
            description: 'Regular conversations, greetings, and general networking.',
            examples: '- "Hey, great thread!"\n- "Thanks for sharing"\n- General questions',
            editable: true
        },
        PROJECTS: {
            name: 'Projects',
            color: '#FF9800',
            description: 'Crypto project launches, technical discussions, and development-related messages.',
            examples: '- "Launching a new DeFi protocol"\n- "Check out our new blockchain project"\n- Technical collaboration requests',
            editable: true
        },
        NFT: {
            name: 'NFT',
            color: '#E91E63',
            description: 'NFT-related discussions, collection launches, and trading opportunities.',
            examples: '- "New NFT collection dropping"\n- "Interested in your NFT project"\n- NFT collaboration requests',
            editable: true
        },
        TRADING: {
            name: 'Trading',
            color: '#00BCD4',
            description: 'Trading discussions, market analysis, and price-related conversations.',
            examples: '- "What\'s your take on BTC price?"\n- "Trading signal group invitation"\n- Market analysis discussions',
            editable: true
        },
        POST_REQUEST: {
            name: 'Post Requests',
            color: '#8BC34A',
            description: 'Requests for shares, retweets, or engagement without payment.',
            examples: '- "Please help RT"\n- "Can you share our announcement?"\n- "Support our community"',
            editable: true
        },
        RANDOM: {
            name: 'Random',
            color: '#9E9E9E',
            description: 'Messages that don\'t fit into other categories.',
            examples: '- Miscellaneous messages\n- Unclear purposes\n- Other topics',
            editable: false
        }
    };

    // Navigation Functions
    function showStep(step) {
        var contents = document.querySelectorAll('.step-content');
        for (var i = 0; i < contents.length; i++) {
            contents[i].classList.add('hidden');
        }
        var stepContent = document.getElementById('step' + step);
        if (stepContent) {
            stepContent.classList.remove('hidden');
        }
        
        var steps = document.querySelectorAll('.step');
        for (var i = 0; i < steps.length; i++) {
            var stepNum = parseInt(steps[i].getAttribute('data-step'));
            steps[i].classList.remove('active', 'completed');
            if (stepNum === step) {
                steps[i].classList.add('active');
            } else if (stepNum < step) {
                steps[i].classList.add('completed');
            }
        }
    }

    // Category Management Functions
    function loadCategories() {
        var categoriesList = document.getElementById('categoriesList');
        if (categoriesList) {
            categoriesList.innerHTML = '';
            
            // Get current categories from storage
            chrome.storage.local.get(['customCategories'], function(result) {
                // Start with default categories
                var allCategories = Object.assign({}, DEFAULT_CATEGORIES);
                
                // Add custom categories if they exist
                if (result.customCategories) {
                    allCategories = Object.assign({}, DEFAULT_CATEGORIES, result.customCategories);
                }
                
                // Create and append category elements
                Object.keys(allCategories).forEach(function(id) {
                    var category = allCategories[id];
                    var categoryElement = createCategoryElement(id, category);
                    categoriesList.appendChild(categoryElement);
                });

                // Store the complete set of categories
                chrome.storage.local.set({ categories: allCategories });
            });
        }
    }

    function createCategoryElement(id, category) {
        var div = document.createElement('div');
        div.className = 'category-item';
        
        var colorIndicator = document.createElement('div');
        colorIndicator.className = 'category-color';
        colorIndicator.style.backgroundColor = category.color;

        var info = document.createElement('div');
        info.className = 'category-info';
        info.innerHTML = '<h3>' + category.name + '</h3><p>' + category.description + '</p>';

        var actions = document.createElement('div');
        actions.className = 'category-actions';

        if (category.editable) {
            var editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.onclick = function() { showCategoryModal(id, category); };

            var deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = function() { deleteCategory(id); };

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
        } else {
            var defaultBadge = document.createElement('span');
            defaultBadge.textContent = 'Default';
            defaultBadge.className = 'default-badge';
            actions.appendChild(defaultBadge);
        }

        div.appendChild(colorIndicator);
        div.appendChild(info);
        div.appendChild(actions);
        return div;
    }

    // Modal Functions
    function createModalElement() {
        var existingModal = document.getElementById('categoryModal');
        if (existingModal) {
            existingModal.remove();
        }

        var modal = document.createElement('div');
        modal.id = 'categoryModal';
        modal.className = 'modal';
        
        modal.innerHTML = 
            '<div class="modal-content">' +
                '<h2 id="modalTitle">Edit Category</h2>' +
                
                '<div class="form-group">' +
                    '<label for="categoryName">Category Name</label>' +
                    '<input type="text" id="categoryName" placeholder="e.g., Partnership Requests">' +
                '</div>' +

                '<div class="form-group">' +
                    '<label for="categoryDescription">Category Rules</label>' +
                    '<textarea id="categoryDescription" placeholder="Describe what types of messages should go in this category..."></textarea>' +
                '</div>' +

                '<div class="form-group">' +
                    '<label for="categoryExamples">Message Examples (Optional)</label>' +
                    '<textarea id="categoryExamples" placeholder="Add example messages that should be in this category..."></textarea>' +
                '</div>' +

                '<div class="form-group">' +
                    '<label for="categoryColor">Category Color</label>' +
                    '<input type="color" id="categoryColor">' +
                '</div>' +

                '<div class="modal-buttons">' +
                    '<button type="button" id="cancelCategoryBtn" class="cancel-btn">Cancel</button>' +
                    '<button type="button" id="saveCategoryBtn" class="save-btn">Save Category</button>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(modal);

        var cancelBtn = document.getElementById('cancelCategoryBtn');
        var saveBtn = document.getElementById('saveCategoryBtn');
        
        cancelBtn.addEventListener('click', function() {
            hideModal();
        });

        saveBtn.addEventListener('click', function() {
            saveCategoryChanges();
        });

        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                hideModal();
            }
        });

        modal.querySelector('.modal-content').addEventListener('click', function(event) {
            event.stopPropagation();
        });

        return modal;
    }

    function hideModal() {
        var modal = document.getElementById('categoryModal');
        if (modal) {
            modal.remove();
        }
    }

    function saveCategoryChanges() {
    var name = document.getElementById('categoryName').value.trim();
    var description = document.getElementById('categoryDescription').value.trim();
    var examples = document.getElementById('categoryExamples').value.trim();
    var color = document.getElementById('categoryColor').value;

    if (!name || !description) {
        alert('Name and description are required');
        return;
    }

    var modal = document.getElementById('categoryModal');
    var editingId = modal.getAttribute('data-editing-id');
    
    var categoryData = {
        name: name,
        description: description,
        examples: examples,
        color: color,
        editable: true
    };

    // Get current custom categories and update
    chrome.storage.local.get(['customCategories', 'categories'], function(result) {
        let customCategories = result.customCategories || {};
        let allCategories = result.categories || Object.assign({}, DEFAULT_CATEGORIES);
        
        if (editingId) {
            customCategories[editingId] = categoryData;
            allCategories[editingId] = categoryData;
        } else {
            var newId = name.toUpperCase().replace(/\s+/g, '_');
            customCategories[newId] = categoryData;
            allCategories[newId] = categoryData;
        }

        // Save both custom categories and full categories list
        chrome.storage.local.set({ 
            customCategories: customCategories,
            categories: allCategories
        }, function() {
            // Notify content script to refresh categories
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'refreshCategories'
                    });
                }
            });
            loadCategories();
            hideModal();
        });
    });
}

    function showCategoryModal(id, category) {
        var modal = createModalElement();
        
        var modalTitle = document.getElementById('modalTitle');
        modalTitle.textContent = id ? 'Edit Category' : 'Add New Category';
        
        document.getElementById('categoryName').value = category ? category.name : '';
        document.getElementById('categoryDescription').value = category ? category.description : '';
        document.getElementById('categoryExamples').value = category ? category.examples : '';
        document.getElementById('categoryColor').value = category ? category.color : '#000000';
        
        modal.setAttribute('data-editing-id', id || '');
    }

    function deleteCategory(id) {
        if (confirm('Are you sure you want to delete this category?')) {
            chrome.storage.local.get(['customCategories'], function(result) {
                let customCategories = result.customCategories || {};
                
                // Only delete from customCategories
                delete customCategories[id];
                
                // Save updated customCategories
                chrome.storage.local.set({ 
                    customCategories: customCategories 
                }, function() {
                    // Reload categories to update the display
                    loadCategories();
                    console.log('Category deleted:', id);
                });
            });
        }
    }

    // Event Listeners Setup
    function setupEventListeners() {
        var step1Next = document.getElementById('step1Next');
        if (step1Next) {
            step1Next.addEventListener('click', function() {
                var apiKey = document.getElementById('apiKey').value.trim();
                var apiProvider = document.querySelector('input[name="apiProvider"]:checked').value;

                if (!apiKey) {
                    alert('Please enter your API key');
                    return;
                }

                if (apiProvider === 'anthropic' && !apiKey.startsWith('sk-ant')) {
                    alert('Invalid Anthropic API key format');
                    return;
                }
                if (apiProvider === 'openai' && !apiKey.startsWith('sk-')) {
                    alert('Invalid OpenAI API key format');
                    return;
                }

                chrome.storage.local.set({ 
                    apiKey: apiKey,
                    apiProvider: apiProvider,
                    setupComplete: false
                }, function() {
                    currentStep = 2;
                    showStep(2);
                    loadCategories();
                });
            });
        }

        // Navigation buttons
        var step2Back = document.getElementById('step2Back');
        if (step2Back) {
            step2Back.addEventListener('click', function() {
                currentStep = 1;
                showStep(1);
            });
        }

        var step2Next = document.getElementById('step2Next');
        if (step2Next) {
            step2Next.addEventListener('click', function() {
                currentStep = 3;
                showStep(3);
            });
        }

        var step3Back = document.getElementById('step3Back');
        if (step3Back) {
            step3Back.addEventListener('click', function() {
                currentStep = 2;
                showStep(2);
            });
        }

        var finishSetup = document.getElementById('finishSetup');
        if (finishSetup) {
            finishSetup.addEventListener('click', function() {
                chrome.storage.local.set({ 
                    setupComplete: true,
                    categories: Object.assign({}, DEFAULT_CATEGORIES, customCategories)
                }, function() {
                    window.close();
                });
            });
        }

        var addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', function() {
                showCategoryModal();
            });
        }

        var radioButtons = document.querySelectorAll('input[name="apiProvider"]');
        for (var i = 0; i < radioButtons.length; i++) {
            radioButtons[i].addEventListener('change', function() {
                var apiLinks = document.querySelector('.api-links');
                if (apiLinks) {
                    apiLinks.classList.toggle('anthropic-selected', this.value === 'anthropic');
                }
            });
        }
    }

    // Initialize
    function init() {
        showStep(1);
        setupEventListeners();
        
        // Load any existing custom categories
        chrome.storage.local.get(['customCategories'], function(result) {
            if (result.customCategories) {
                customCategories = result.customCategories;
            }
            loadCategories();
        });
    }

    // Start the app
    init();
});