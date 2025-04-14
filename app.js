const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();
tg.setHeaderColor('#2E7D32');

// Game State
const state = {
    balance: 0,
    slots: Array(10).fill().map(() => ({
        plant: null,
        progress: 0,
        startTime: null
    })),
    inventory: {
        greenSeeds: 0,
        goldSeeds: 0,
        greenFruits: 0,
        goldFruits: 0
    }
};

// DOM Elements
const elements = {
    balance: document.getElementById('balance'),
    farmGrid: document.getElementById('farmGrid'),
    seedsContainer: document.getElementById('seedsContainer'),
    fruitsContainer: document.getElementById('fruitsContainer'),
    notification: document.getElementById('notification'),
    plantSeedBtn: document.getElementById('plantSeed'),
    harvestAllBtn: document.getElementById('harvestAll'),
    seedType: document.getElementById('seedType')
};

// Initialize Game
document.addEventListener('DOMContentLoaded', () => {
    initFarm();
    updateInventoryDisplay();
    updateBalance();

    // Event Listeners
    elements.plantSeedBtn.addEventListener('click', plantSeed);
    elements.harvestAllBtn.addEventListener('click', harvestAll);
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
});

function initFarm() {
    elements.farmGrid.innerHTML = '';
    state.slots.forEach((slot, index) => {
        const slotElement = document.createElement('div');
        slotElement.className = 'slot';
        slotElement.setAttribute('data-index', index);
        updateSlot(index);
        slotElement.addEventListener('click', () => handleSlotClick(index));
        elements.farmGrid.appendChild(slotElement);
    });
}

function updateSlot(index) {
    const slotElement = elements.farmGrid.querySelector(`[data-index="${index}"]`);
    if (!slotElement) return;

    slotElement.innerHTML = '';
    const slot = state.slots[index];

    if (slot.plant) {
        const plant = document.createElement('div');
        plant.className = 'plant';
        plant.textContent = getPlantEmoji(slot.plant);
        slotElement.appendChild(plant);

        if (slot.progress < 100) {
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.style.width = `${slot.progress}%`;
            slotElement.appendChild(progressBar);
            startGrowing(index);
        }
    } else {
        slotElement.classList.add('empty');
    }
}

function startGrowing(index) {
    const growTime = 3000;
    const startTime = performance.now() - (state.slots[index].progress / 100) * growTime;

    function animate(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min((elapsedTime / growTime) * 100, 100);
        state.slots[index].progress = progress;

        const progressBar = elements.farmGrid.querySelector(`[data-index="${index}"] .progress-bar`);
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        if (progress < 100) {
            requestAnimationFrame(animate);
        } else {
            updateSlot(index);
            showNotification('A plant is ready to harvest!', 'success');
        }
    }
    
    requestAnimationFrame(animate);
}

function getPlantEmoji(type) {
    return type === 'gold' ? '🌟' : '🌱';
}

function handleSlotClick(index) {
    if (!state.slots[index].plant || state.slots[index].progress < 100) return;
    harvestPlant(index);
}

function plantSeed() {
    const seedType = elements.seedType.value;
    
    if (state.inventory[`${seedType}Seeds`] <= 0) {
        return showNotification(`No ${seedType} seeds available!`, 'error');
    }
    
    const emptySlotIndex = state.slots.findIndex(s => !s.plant);
    if (emptySlotIndex === -1) {
        return showNotification('No empty slots available!', 'error');
    }
    
    state.inventory[`${seedType}Seeds`]--;
    state.slots[emptySlotIndex] = { 
        plant: seedType, 
        progress: 0, 
        startTime: performance.now() 
    };
    
    updateSlot(emptySlotIndex);
    updateInventoryDisplay();
    showNotification(`${seedType} seed planted!`, 'success');
}

function harvestPlant(index) {
    const { plant } = state.slots[index];
    let message = '';
    
    if (plant === 'green') {
        if (Math.random() < 0.6) {
            const seeds = getRandom(1, 2);
            const fruits = getRandom(0, 1);
            state.inventory.greenSeeds += seeds;
            state.inventory.greenFruits += fruits;
            message = `Harvested ${seeds} green seeds and ${fruits} fruits!`;
        } else {
            state.inventory.goldSeeds += 1;
            message = 'Got a rare gold seed!';
        }
    } else {
        const fruits = getRandom(1, 2);
        state.inventory.goldFruits += fruits;
        state.balance += fruits * 5;
        message = `Harvested ${fruits} gold fruits!`;
        updateBalance();
    }

    state.slots[index] = { plant: null, progress: 0, startTime: null };
    updateSlot(index);
    updateInventoryDisplay();
    showNotification(message, 'success');
}

function harvestAll() {
    const readyToHarvest = state.slots.filter(slot => 
        slot.plant && slot.progress >= 100
    ).length;
    
    if (readyToHarvest === 0) {
        return showNotification('Nothing to harvest!', 'error');
    }
    
    state.slots.forEach((slot, index) => {
        if (slot.plant && slot.progress >= 100) {
            harvestPlant(index);
        }
    });
}

function useFruit(type) {
    if (state.inventory[`${type}Fruits`] <= 0) {
        return showNotification(`No ${type} fruits available!`, 'error');
    }
    
    if (type === 'green') {
        state.inventory.greenFruits--;
        state.inventory.greenSeeds += 5;
        showNotification('Converted to 5 green seeds!', 'success');
    } else {
        state.inventory.goldFruits--;
        state.balance += 10;
        updateBalance();
        showNotification('Converted to 10 $FARM!', 'success');
    }
    
    updateInventoryDisplay();
}

function updateInventoryDisplay() {
    elements.seedsContainer.innerHTML = `
        <div class="inventory-item" onclick="state.inventory.greenSeeds > 0 && plantSeed()">
            🌱 Green Seeds: ${state.inventory.greenSeeds}
        </div>
        <div class="inventory-item" onclick="state.inventory.goldSeeds > 0 && plantSeed()">
            🌟 Gold Seeds: ${state.inventory.goldSeeds}
        </div>
    `;
    
    elements.fruitsContainer.innerHTML = `
        <div class="inventory-item" onclick="useFruit('green')">
            🍏 Green Fruits: ${state.inventory.greenFruits}
        </div>
        <div class="inventory-item" onclick="useFruit('gold')">
            🍎 Gold Fruits: ${state.inventory.goldFruits}
        </div>
    `;
}

function updateBalance() {
    elements.balance.textContent = state.balance;
}

function connectWallet() {
    state.balance += 10;
    state.inventory.greenSeeds += 3;
    updateBalance();
    updateInventoryDisplay();
    showNotification('Demo balance added!', 'success');
}

function showNotification(text, type = 'info') {
    elements.notification.textContent = text;
    elements.notification.style.display = 'block';
    elements.notification.style.backgroundColor = type === 'error' ? 'rgba(211, 47, 47, 0.9)' : 
                                               type === 'success' ? 'rgba(56, 142, 60, 0.9)' : 
                                               'rgba(0, 0, 0, 0.8)';
    
    setTimeout(() => {
        elements.notification.style.display = 'none';
    }, 2000);
}

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Expose functions to global scope for HTML onclick handlers
window.state = state;
window.plantSeed = plantSeed;
window.useFruit = useFruit;