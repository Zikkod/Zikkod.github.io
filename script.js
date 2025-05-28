// Обновленное состояние игры
let gameState = {
    walletConnected: false,
    balance: 0,
    plantingSlots: 5,
    slotPrice: 10, // Цена нового слота в TON
    plants: [],
    inventory: {
        greenSeeds: 0,
        goldSeeds: 0,
        greenFruits: 0,
        goldFruits: 0
    }
};

// Инициализация игры
function initGame() {
    loadGameState();
    renderGame();
    setupEventListeners();
}

// Загрузка состояния из localStorage
function loadGameState() {
    const savedState = localStorage.getItem('farmGameState');
    if (savedState) {
        gameState = JSON.parse(savedState);
    }
}

// Сохранение состояния в localStorage
function saveGameState() {
    localStorage.setItem('farmGameState', JSON.stringify(gameState));
}

// Подключение кошелька
function connectWallet() {
    if (!gameState.walletConnected) {
        gameState.walletConnected = true;
        gameState.inventory.greenSeeds += 3;

        showNotification('Кошелек подключен! Получено 3 семени зеленого растения');
        saveGameState();
        renderGame();
    }
}

// Показать уведомление
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Посадить растение
function plantSeed(slotIndex, seedType) {
    if (gameState.plants[slotIndex]) return;

    if (seedType === 'green' && gameState.inventory.greenSeeds > 0) {
        gameState.inventory.greenSeeds--;
    } else if (seedType === 'gold' && gameState.inventory.goldSeeds > 0) {
        gameState.inventory.goldSeeds--;
    } else {
        return;
    }

    const plant = {
        type: seedType,
        startTime: Date.now(),
        growthTime: 3000, // 3 секунды для MVP
        isReady: false
    };

    gameState.plants[slotIndex] = plant;

    // Таймер роста
    setTimeout(() => {
        plant.isReady = true;
        showNotification(`Растение #${slotIndex + 1} выросло!`);
        saveGameState();
        renderGame();
    }, plant.growthTime);

    saveGameState();
    renderGame();
}

// Собрать растение
function harvestPlant(slotIndex) {
    const plant = gameState.plants[slotIndex];
    if (!plant || !plant.isReady) return;

    // Логика сбора урожая
    if (plant.type === 'green') {
        // Зеленое растение: 1-3 семян и 0-1 плодов с 90% шансом
        if (Math.random() < 0.9) {
            const seeds = Math.floor(Math.random() * 3) + 1;
            const fruits = Math.random() > 0.5 ? 1 : 0;

            gameState.inventory.greenSeeds += seeds;
            gameState.inventory.greenFruits += fruits;
        }
        // Мутация: 10% шанс получить золотое семя
        if (Math.random() < 0.1) {
            gameState.inventory.goldSeeds += 1;
        }
    }
    // Золотое растение: 70% шанс получить 1 плод
    else if (plant.type === 'gold') {
        gameState.inventory.greenSeeds += 1;
        if (Math.random() < 0.7) {
            gameState.inventory.goldFruits += 1;
        }
    }

    delete gameState.plants[slotIndex];
    saveGameState();
    renderGame();
}

// Удалить растение
function removePlant(slotIndex) {
    delete gameState.plants[slotIndex];
    saveGameState();
    renderGame();
}

// Собрать все растения
function harvestAll() {
    for (let i = 0; i < gameState.plantingSlots; i++) {
        if (gameState.plants[i]?.isReady) {
            harvestPlant(i);
        }
    }
}

// Удалить все растения
function removeAll() {
    for (let i = 0; i < gameState.plantingSlots; i++) {
        if (gameState.plants[i]) {
            delete gameState.plants[i];
        }
    }
    saveGameState();
    renderGame();
}

// Использовать плод
function useFruit(fruitType) {
    if (fruitType === 'green' && gameState.inventory.greenFruits > 0) {
        gameState.inventory.greenFruits--;
        gameState.inventory.greenSeeds += 5;
        showNotification('Использован зеленый плод! Получено 5 семян');
    }
    else if (fruitType === 'gold' && gameState.inventory.goldFruits > 0) {
        gameState.inventory.goldFruits--;
        const earnings = Math.floor(Math.random() * 5) + 1; // 1-5 TON
        gameState.balance += earnings;
        showNotification(`Использован золотой плод! Получено ${earnings} TON`);
    }

    saveGameState();
    renderGame();
}

// Купить новый слот (ИСПРАВЛЕНО)
function buySlot() {
    // Проверка подключения кошелька
    if (!gameState.walletConnected) {
        showNotification('Сначала подключите кошелек!', true);
        return;
    }

    // Проверка баланса
    if (gameState.balance < gameState.slotPrice) {
        showNotification(`Недостаточно TON! Нужно ${gameState.slotPrice} TON`, true);
        return;
    }

    // Списание средств
    gameState.balance -= gameState.slotPrice;

    // Увеличение количества слотов
    gameState.plantingSlots++;

    // Повышение цены для следующей покупки
    gameState.slotPrice = Math.floor(gameState.slotPrice * 1.5);

    showNotification(`Куплен новый слот! Теперь у вас ${gameState.plantingSlots} слотов`);
    saveGameState();
    renderGame();
}

// Сбросить прогресс
function resetProgress() {
    if (confirm('Вы уверены, что хотите сбросить весь прогресс? Это действие нельзя отменить.')) {
        // Сброс к начальным значениям
        gameState = {
            walletConnected: false,
            balance: 0,
            plantingSlots: 5,
            slotPrice: 10,
            plants: [],
            inventory: {
                greenSeeds: 0,
                goldSeeds: 0,
                greenFruits: 0,
                goldFruits: 0
            }
        };

        // Очистка localStorage
        localStorage.removeItem('farmGameState');

        // Перерисовка интерфейса
        renderGame();

        showNotification('Прогресс сброшен! Игра восстановлена до начального состояния');
    }
}

// Отрисовка игры
function renderGame() {
    renderWallet();
    renderFarm();
    renderInventory();
}

// Отрисовка кошелька
function renderWallet() {
    const connectBtn = document.getElementById('connectWallet');
    const balanceEl = document.getElementById('balance');
    const resetBtn = document.getElementById('resetProgress');

    if (gameState.walletConnected) {
        connectBtn.textContent = 'Кошелек подключен';
        connectBtn.disabled = true;
    } else {
        connectBtn.textContent = 'Connect Wallet';
        connectBtn.disabled = false;
    }

    balanceEl.textContent = gameState.balance;
    resetBtn.style.display = gameState.walletConnected ? 'block' : 'none';
}

// Отрисовка фермы
function renderFarm() {
    const slotsContainer = document.getElementById('plantingSlots');
    slotsContainer.innerHTML = '';

    // Обновляем информацию о слотах
    document.getElementById('slotCount').textContent = gameState.plantingSlots;
    const buySlotBtn = document.getElementById('buySlot');
    buySlotBtn.textContent = `Купить слот (${gameState.slotPrice} TON)`;

    // Блокировка кнопки покупки, если недостаточно средств
    buySlotBtn.disabled = !gameState.walletConnected || gameState.balance < gameState.slotPrice;

    for (let i = 0; i < gameState.plantingSlots; i++) {
        const plant = gameState.plants[i];
        const slot = document.createElement('div');
        slot.className = `slot ${plant ? '' : 'empty'}`;

        if (plant) {
            const plantDiv = document.createElement('div');
            plantDiv.className = `plant ${plant.type}`;

            const icon = document.createElement('div');
            icon.className = 'plant-icon';
            icon.textContent = plant.type === 'green' ? '🌿' : '🌟';

            const typeText = document.createElement('div');
            typeText.textContent = plant.type === 'green' ? 'Зеленое' : 'Золотое';

            const timer = document.createElement('div');
            timer.className = 'plant-timer';
            timer.textContent = plant.isReady ? 'Готово!' : 'Растет...';

            plantDiv.appendChild(icon);
            plantDiv.appendChild(typeText);
            plantDiv.appendChild(timer);

            const actions = document.createElement('div');
            actions.className = 'slot-actions';

            if (plant.isReady) {
                const harvestBtn = document.createElement('button');
                harvestBtn.className = 'slot-btn harvest-btn';
                harvestBtn.textContent = 'Собрать';
                harvestBtn.onclick = () => harvestPlant(i);
                actions.appendChild(harvestBtn);
            }

            const removeBtn = document.createElement('button');
            removeBtn.className = 'slot-btn remove-btn';
            removeBtn.textContent = 'Удалить';
            removeBtn.onclick = () => removePlant(i);
            actions.appendChild(removeBtn);

            slot.appendChild(plantDiv);
            slot.appendChild(actions);
        }

        slotsContainer.appendChild(slot);
    }
}

// Отрисовка инвентаря
function renderInventory() {
    const inventory = document.getElementById('inventoryItems');
    inventory.innerHTML = '';

    // Зеленые семена
    inventory.appendChild(createInventoryItem(
        'greenSeeds',
        '🌱',
        'Зеленое семя',
        gameState.inventory.greenSeeds,
        () => selectSeed('green')
    ));

    // Золотые семена
    inventory.appendChild(createInventoryItem(
        'goldSeeds',
        '💎',
        'Золотое семя',
        gameState.inventory.goldSeeds,
        () => selectSeed('gold')
    ));

    // Зеленые плоды
    inventory.appendChild(createInventoryItem(
        'greenFruits',
        '🍏',
        'Зеленый плод',
        gameState.inventory.greenFruits,
        () => useFruit('green')
    ));

    // Золотые плоды
    inventory.appendChild(createInventoryItem(
        'goldFruits',
        '🍊',
        'Золотой плод',
        gameState.inventory.goldFruits,
        () => useFruit('gold')
    ));
}

// Создать элемент инвентаря
function createInventoryItem(id, icon, name, count, onClick) {
    const item = document.createElement('div');
    item.className = `inventory-item ${id.includes('green') ? 'green' : 'gold'}`;
    item.onclick = onClick;

    const iconEl = document.createElement('div');
    iconEl.className = 'item-icon';
    iconEl.textContent = icon;

    const nameEl = document.createElement('div');
    nameEl.className = 'item-name';
    nameEl.textContent = name;

    const countEl = document.createElement('div');
    countEl.className = 'item-count';
    countEl.textContent = count;

    item.appendChild(iconEl);
    item.appendChild(nameEl);
    item.appendChild(countEl);

    return item;
}

// Выбор семени для посадки
function selectSeed(seedType) {
    if (!gameState.walletConnected) {
        showNotification('Сначала подключите кошелек!', true);
        return;
    }

    const emptySlots = [];
    for (let i = 0; i < gameState.plantingSlots; i++) {
        if (!gameState.plants[i]) {
            emptySlots.push(i);
        }
    }

    if (emptySlots.length === 0) {
        showNotification('Нет свободных слотов!', true);
        return;
    }

    // Используем первый свободный слот
    plantSeed(emptySlots[0], seedType);
}

// Настройка обработчиков событий
function setupEventListeners() {
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('harvestAll').addEventListener('click', harvestAll);
    document.getElementById('removeAll').addEventListener('click', removeAll);
    document.getElementById('buySlot').addEventListener('click', buySlot);
    document.getElementById('resetProgress').addEventListener('click', resetProgress);
}

// Запуск игры при загрузке страницы
window.addEventListener('DOMContentLoaded', initGame);