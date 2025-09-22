// Состояние приложения с системой воды
const state = {
    balance: 0,
    farmToken: 0,
    farmTicket: 0,
    water: {
        current: 30,
        max: 30,
        recoveryRate: 1,
        lastRecovery: Date.now()
    },
    slots: Array(5).fill().map((_, i) => ({
        id: i + 1,
        plant: null,
        timer: null,
        plantedAt: null,
        level: 1
    })),
    inventory: {
        green_seeds: 3,
        gold_seeds: 0,
        green_fruits: 0,
        gold_fruits: 0,
        fertilizer: 0,
        water_bottle: 0,
        growth_accelerator: 0
    },
    selectedSeed: 'green',
    activeScreen: 'main',
    stats: {
        plantsPlanted: 0,
        harvestsCollected: 0,
        waterUsed: 0,
        tonEarned: 0
    },
    adViews: 0,
    premium: false,
    marketHistory: [],
    dumpLevel: 1,
    dumpResources: [
        { key: 'green_seeds', name: 'Зеленые семена', value: 1 },
        { key: 'gold_seeds', name: 'Золотые семена', value: 2 },
        { key: 'green_fruits', name: 'Зеленые плоды', value: 3 },
        { key: 'gold_fruits', name: 'Золотые плоды', value: 5 },
        { key: 'fertilizer', name: 'Удобрение', value: 4 },
        { key: 'water_bottle', name: 'Бутыль воды', value: 6 },
        { key: 'growth_accelerator', name: 'Ускоритель роста', value: 7 }
    ],
    craftRecipes: [
        {
            name: "Удобрение",
            icon: "🌱",
            output: "fertilizer",
            quantity: 1,
            ingredients: [
                { key: "green_fruits", quantity: 3 },
                { key: "green_seeds", quantity: 2 }
            ]
        },
        {
            name: "Бутыль воды",
            icon: "💧",
            output: "water_bottle",
            quantity: 1,
            ingredients: [
                { key: "green_fruits", quantity: 5 },
                { key: "green_seeds", quantity: 1 }
            ]
        },
        {
            name: "Ускоритель роста",
            icon: "⚡",
            output: "growth_accelerator",
            quantity: 1,
            ingredients: [
                { key: "gold_fruits", quantity: 2 },
                { key: "water_bottle", quantity: 1 }
            ]
        }
    ],
    merchantOffers: {
        buy: [
            { item: "green_seeds", price: 0.5, quantity: 10 },
            { item: "green_fruits", price: 1.0, quantity: 5 },
            { item: "fertilizer", price: 2.0, quantity: 2 }
        ],
        sell: [
            { item: "gold_seeds", price: 5.0, quantity: 1 },
            { item: "gold_fruits", price: 3.0, quantity: 1 },
            { item: "growth_accelerator", price: 10.0, quantity: 1 }
        ]
    },
    workers: [
        {
            id: 1,
            status: "free",
            slotId: 1,
            seedType: "green",
            endTime: null
        }
    ]
};

// Конфигурация растений
const PLANTS = {
    green: {
        name: "Зеленое растение",
        emoji: "🌱",
        waterCost: 1,
        growthTime: 180, // 3 минуты
        harvest: function() {
            if (Math.random() < 0.7) {
                // 70%: 1-3 своих семян + 0-1 Зеленый плод
                const seeds = Math.floor(Math.random() * 3) + 1;
                const fruit = Math.random() < 0.5 ? 1 : 0;
                return { green_seeds: seeds, green_fruits: fruit };
            } else {
                // 30%: мутация в золотое семя
                return { gold_seeds: 1 };
            }
        }
    },
    gold: {
        name: "Золотое растение",
        emoji: "🌟",
        waterCost: 5,
        growthTime: 300, // 5 минут
        harvest: function() {
            if (Math.random() < 0.7) {
                // 70%: золотой плод
                return { gold_fruits: 1 };
            } else {
                // 30%: 1-2 зеленых семени
                const seeds = Math.floor(Math.random() * 2) + 1;
                return { green_seeds: seeds };
            }
        }
    }
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});

// Инициализация игры
function initGame() {
    renderField();
    updateWater();
    updateBalance();
    updateInventory();
    updateFarmTicket();
    updateStats();
    updateDumpScreen();
    updateCraftScreen();
    updateMerchantScreen();
    updateWorkersScreen();
    setupEventListeners();
    startGrowthTimer();
    startWaterRecovery();
    startWorkerTimer();
    syncFixedPanel(); // Синхронизация панели
}

// Функция показа уведомления
function showNotification(message, isError = false) {
    const notificationsContainer = document.getElementById('notifications-container');
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.textContent = message;
    notificationsContainer.appendChild(notification);
    // Удаление уведомления после анимации
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Рендер игрового поля
function renderField() {
    const fieldContainer = document.getElementById('field-container');
    fieldContainer.innerHTML = '';
    state.slots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = 'slot';
        slotElement.dataset.id = slot.id;
        if (slot.plant) {
            slotElement.classList.add('occupied');
            const plant = PLANTS[slot.plant];
            // Расчет прогресса роста
            const progress = calculateGrowthProgress(slot);
            const isReady = progress >= 100;
            if (isReady) slotElement.classList.add('ready');
            slotElement.innerHTML = `
                <div class="plant">${plant.emoji}</div>
                <div class="plant-level">${slot.level}</div>
                ${!isReady ? `<div class="timer">${formatTime(slot.timer)}</div>` : ''}
            `;
        } else {
            slotElement.innerHTML = '<div>+</div>';
        }
        slotElement.addEventListener('click', () => handleSlotClick(slot.id));
        fieldContainer.appendChild(slotElement);
    });
}

// Расчет прогресса роста
function calculateGrowthProgress(slot) {
    if (!slot.plant || !slot.plantedAt) return 0;
    const plant = PLANTS[slot.plant];
    const elapsed = Date.now() - slot.plantedAt;
    const progress = Math.min(100, (elapsed / (plant.growthTime * 1000)) * 100);
    return progress;
}

// Форматирование времени
function formatTime(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Обновление отображения воды
function updateWater() {
    const waterFill = document.getElementById('water-fill');
    const currentWater = document.getElementById('current-water');
    const maxWater = document.getElementById('max-water');
    const waterRate = document.getElementById('water-rate');
    const percentage = (state.water.current / state.water.max) * 100;
    waterFill.style.width = `${percentage}%`;
    currentWater.textContent = state.water.current;
    maxWater.textContent = state.water.max;
    waterRate.textContent = state.water.recoveryRate;
    // Анимация при нехватке воды
    if (state.water.current < 5) {
        waterFill.style.backgroundColor = '#f44336';
    } else {
        waterFill.style.backgroundColor = '#1e88e5';
    }
}

// Обновление баланса
function updateBalance() {
    document.getElementById('balance').textContent = state.balance.toFixed(2);
}

// Обновление фарм-билетов
function updateFarmTicket() {
    document.getElementById('farm-ticket-count').textContent = state.farmTicket;
    document.getElementById('farm-ticket-count-profile').textContent = state.farmTicket;
    const airdropEstimate = (state.farmTicket * 0.01).toFixed(2);
    document.getElementById('airdrop-estimate').textContent = airdropEstimate;
}

// Обновление статистики
function updateStats() {
    document.getElementById('stats-plants').textContent = state.stats.plantsPlanted;
    document.getElementById('stats-harvests').textContent = state.stats.harvestsCollected;
    document.getElementById('stats-water').textContent = state.stats.waterUsed;
    document.getElementById('stats-ton').textContent = state.stats.tonEarned.toFixed(2);
}

// Обновление инвентаря
function updateInventory() {
    const inventoryGrid = document.getElementById('inventory-grid');
    if (!inventoryGrid) return;
    inventoryGrid.innerHTML = '';
    const resources = [
        { key: 'green_seeds', name: 'Зеленые семена', icon: '🌱' },
        { key: 'gold_seeds', name: 'Золотые семена', icon: '🌟' },
        { key: 'green_fruits', name: 'Зеленые плоды', icon: '🍏' },
        { key: 'gold_fruits', name: 'Золотые плоды', icon: '⭐' },
        { key: 'fertilizer', name: 'Удобрение', icon: '🌿' },
        { key: 'water_bottle', name: 'Бутыль воды', icon: '💧' },
        { key: 'growth_accelerator', name: 'Ускоритель роста', icon: '⚡' }
    ];
    resources.forEach(resource => {
        const count = state.inventory[resource.key] || 0;
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = `
            <div class="item-icon">${resource.icon}</div>
            <div class="item-name">${resource.name}</div>
            <div class="item-count">${count}</div>
        `;
        inventoryGrid.appendChild(itemElement);
    });
}

// Обновление истории маркетплейса
function updateMarketHistory() {
    const historyContainer = document.getElementById('market-history');
    if (!historyContainer) return;
    historyContainer.innerHTML = '';
    state.marketHistory.slice(-5).forEach(transaction => {
        const transactionEl = document.createElement('div');
        transactionEl.className = 'transaction';
        transactionEl.innerHTML = `
            <div class="tx-icon">${transaction.type === 'sell' ? '⭐' : '🛒'}</div>
            <div class="tx-info">
                <div>${transaction.description}</div>
                <div class="tx-date">${formatDate(transaction.date)}</div>
            </div>
            <div class="tx-amount ${transaction.amount > 0 ? 'success' : 'danger'}">
                ${transaction.amount > 0 ? '+' : ''}${transaction.amount.toFixed(2)} TON
            </div>
        `;
        historyContainer.appendChild(transactionEl);
    });
}

// Форматирование даты
function formatDate(date) {
    return new Date(date).toLocaleTimeString();
}

// Посадка растения
function plantSeed(slotId) {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot) return;
    // Проверка, свободен ли слот
    if (slot.plant) {
        showNotification('Слот уже занят!', true);
        return;
    }
    // Проверка наличия воды
    const plantType = state.selectedSeed;
    const waterCost = PLANTS[plantType].waterCost;
    if (state.water.current < waterCost) {
        showNotification(`Недостаточно воды! Требуется: ${waterCost}`, true);
        return;
    }
    // Проверка наличия семян
    const seedType = `${plantType}_seeds`;
    if (state.inventory[seedType] <= 0) {
        showNotification('Недостаточно семян!', true);
        return;
    }
    // Посадка растения
    slot.plant = plantType;
    slot.plantedAt = Date.now();
    slot.timer = PLANTS[plantType].growthTime;
    // Расход ресурсов
    state.inventory[seedType]--;
    state.water.current -= waterCost;
    // Обновление статистики
    state.stats.plantsPlanted++;
    state.stats.waterUsed += waterCost;
    // Обновление UI
    renderField();
    updateWater();
    updateInventory();
    updateStats();
    showNotification(`Посажено ${PLANTS[plantType].name}!`);
    // Установка таймера для роста
    setTimeout(() => {
        slot.timer = 0;
        renderField();
        showNotification(`Растение созрело!`);
    }, PLANTS[plantType].growthTime * 1000);
}

// Посадка всех доступных семян
function plantAllSeeds() {
    const plantType = state.selectedSeed;
    const seedType = `${plantType}_seeds`;
    const waterCost = PLANTS[plantType].waterCost;
    if (state.inventory[seedType] <= 0) {
        showNotification('Нет семян для посадки!', true);
        return;
    }
    let planted = 0;
    state.slots.forEach(slot => {
        if (!slot.plant && state.inventory[seedType] > 0 && state.water.current >= waterCost) {
            // Посадка растения
            slot.plant = plantType;
            slot.plantedAt = Date.now();
            slot.timer = PLANTS[plantType].growthTime;
            // Расход ресурсов
            state.inventory[seedType]--;
            state.water.current -= waterCost;
            // Обновление статистики
            state.stats.plantsPlanted++;
            state.stats.waterUsed += waterCost;
            planted++;
            // Установка таймера для роста
            setTimeout(() => {
                slot.timer = 0;
                renderField();
                showNotification(`Растение созрело!`);
            }, PLANTS[plantType].growthTime * 1000);
        }
    });
    if (planted > 0) {
        renderField();
        updateWater();
        updateInventory();
        updateStats();
        showNotification(`Посажено ${planted} растений!`);
    } else {
        showNotification('Нет свободных слотов или недостаточно воды!', true);
    }
}

// Сбор всех созревших растений
function harvestAll() {
    let harvested = false;
    state.slots.forEach(slot => {
        if (slot.plant && slot.timer === 0) {
            // Сбор урожая
            const plantType = slot.plant;
            const harvestResult = PLANTS[plantType].harvest();
            // Добавление ресурсов в инвентарь
            Object.entries(harvestResult).forEach(([item, count]) => {
                state.inventory[item] = (state.inventory[item] || 0) + count;
            });
            // Шанс получения опыта (1%)
            if (Math.random() < 0.01) {
                slot.level++;
            }
            // Очистка слота
            slot.plant = null;
            slot.plantedAt = null;
            slot.timer = null;
            harvested = true;
            // Обновление статистики
            state.stats.harvestsCollected++;
        }
    });
    if (harvested) {
        renderField();
        updateInventory();
        updateStats();
        showNotification('Урожай собран!');
    } else {
        showNotification('Нет созревших растений!', true);
    }
}

// Удаление всех растений
function removeAllPlants() {
    let removed = false;
    state.slots.forEach(slot => {
        if (slot.plant) {
            slot.plant = null;
            slot.plantedAt = null;
            slot.timer = null;
            removed = true;
        }
    });
    if (removed) {
        renderField();
        showNotification('Все растения удалены!');
    } else {
        showNotification('Нет растений для удаления!', true);
    }
}

// Добавление воды через просмотр рекламы
function addWater() {
    // Проверка дневного лимита
    if (state.adViews >= 5) {
        showNotification('Достигнут дневной лимит просмотра рекламы!', true);
        return;
    }
    // Имитация просмотра рекламы
    showNotification('Просмотр рекламы... +5 воды');
    // Добавление воды
    state.water.current = Math.min(state.water.current + 5, state.water.max);
    state.adViews++;
    // Обновление статистики
    state.stats.waterUsed += 5;
    updateWater();
    updateStats();
}

// Покупка дополнительного слота
function buySlot() {
    const slotCost = 10;
    if (state.balance < slotCost) {
        showNotification(`Недостаточно TON! Требуется: ${slotCost}`, true);
        return;
    }
    // Добавление нового слота
    const newSlotId = state.slots.length + 1;
    state.slots.push({
        id: newSlotId,
        plant: null,
        timer: null,
        plantedAt: null,
        level: 1
    });
    // Списание TON
    state.balance -= slotCost;
    // Обновление UI
    updateBalance();
    renderField();
    showNotification(`Куплен новый слот за ${slotCost} TON!`);
}

// Продажа золотых плодов
function sellGoldFruits() {
    const quantity = parseInt(document.getElementById('gold-fruit-quantity').value) || 0;
    if (quantity <= 0) {
        showNotification('Введите количество!', true);
        return;
    }
    if (state.inventory.gold_fruits < quantity) {
        showNotification('Недостаточно золотых плодов!', true);
        return;
    }
    // Расчет выручки с учетом комиссии
    const pricePerItem = 1;
    const total = pricePerItem * quantity;
    // Для farm coin комиссия 10% (5% рефереру, 5% проекту)
    const commission = 0.10;
    const earnings = total * (1 - commission);
    
    // Обновление состояния
    state.inventory.gold_fruits -= quantity;
    state.balance += earnings;
    state.stats.tonEarned += earnings;
    
    // Добавление в историю
    state.marketHistory.push({
        date: new Date(),
        type: 'sell',
        description: `Продано ${quantity} золотых плодов`,
        amount: earnings
    });
    
    // Обновление UI
    updateBalance();
    updateInventory();
    updateStats();
    updateMarketHistory();
    showNotification(`Продано ${quantity} плодов! Получено: ${earnings.toFixed(2)} TON`);
}

// Внесение TON
function depositTON() {
    const amount = Math.floor(Math.random() * 20) + 10;
    state.balance += amount;
    updateBalance();
    // Добавление в историю
    state.marketHistory.push({
        date: new Date(),
        type: 'deposit',
        description: 'Внесение TON',
        amount: amount
    });
    updateMarketHistory();
    showNotification(`Внесено ${amount} TON!`);
}

// Вывод TON
function withdrawTON() {
    const minWithdraw = 10;
    if (state.balance < minWithdraw) {
        showNotification(`Минимальная сумма вывода: ${minWithdraw} TON`, true);
        return;
    }
    const amount = state.balance;
    // Комиссия 5% (3% сжигается, 2% проекту)
    const commission = 0.05;
    const withdrawAmount = amount * (1 - commission);
    const burnedAmount = amount * commission;
    
    // Обновление состояния
    state.balance = 0;
    state.farmToken -= burnedAmount; // Сжигаем часть токена для комиссии
    
    // Добавление в историю
    state.marketHistory.push({
        date: new Date(),
        type: 'withdraw',
        description: `Вывод TON (сжигание ${burnedAmount.toFixed(2)} TON)`,
        amount: -withdrawAmount
    });
    
    updateBalance();
    updateMarketHistory();
    showNotification(`Выведено ${withdrawAmount.toFixed(2)} TON! Сожжено: ${burnedAmount.toFixed(2)} TON`);
}

// Покупка премиум подписки
function buyPremium() {
    const cost = 10;
    if (state.premium) {
        showNotification('Подписка уже активна!');
        return;
    }
    if (state.balance < cost) {
        showNotification(`Недостаточно TON! Требуется: ${cost}`, true);
        return;
    }
    // Активация подписки
    state.premium = true;
    state.balance -= cost;
    // Эффекты подписки
    state.water.max = Math.floor(state.water.max * 1.5);
    state.water.recoveryRate = state.water.recoveryRate * 2;
    // Обновление UI
    updateBalance();
    updateWater();
    document.querySelector('.subscription-status span').innerHTML =
        'Текущий статус: <strong style="color: var(--premium);">Плодородный сезон</strong>';
    showNotification('Активирована подписка "Плодородный сезон"!');
}

// Обработка клика по слоту
function handleSlotClick(slotId) {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot) return;
    if (!slot.plant) {
        // Если слот пустой - попытка посадки
        plantSeed(slotId);
    } else if (slot.timer === 0) {
        // Если растение созрело - сбор урожая
        harvestSlot(slotId);
    } else {
        // Если растение растет - ускорение за рекламу
        if (confirm("Ускорить рост за просмотр рекламы?")) {
            watchAdForSpeedup(slotId);
        }
    }
}

// Сбор урожая с конкретного слота
function harvestSlot(slotId) {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot || !slot.plant || slot.timer !== 0) return;
    // Сбор урожая
    const plantType = slot.plant;
    const harvestResult = PLANTS[plantType].harvest();
    // Добавление ресурсов в инвентарь
    Object.entries(harvestResult).forEach(([item, count]) => {
        state.inventory[item] = (state.inventory[item] || 0) + count;
    });
    // Шанс получения опыта (1%)
    if (Math.random() < 0.01) {
        slot.level++;
    }
    // Очистка слота
    slot.plant = null;
    slot.plantedAt = null;
    slot.timer = null;
    // Обновление статистики
    state.stats.harvestsCollected++;
    // Обновление UI
    renderField();
    updateInventory();
    updateStats();
    showNotification('Урожай собран!');
}

// Ускорение роста за просмотр рекламы
function watchAdForSpeedup(slotId) {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot || !slot.plant || slot.timer === 0) return;
    // Проверка лимита просмотров
    if (state.adViews >= 5) {
        showNotification('Достигнут дневной лимит просмотра рекламы!', true);
        return;
    }
    // Имитация просмотра рекламы
    showNotification('Просмотр рекламы... ускорение роста');
    // Ускорение роста (уменьшаем оставшееся время на 90%)
    const remainingTime = slot.timer * 1000 - (Date.now() - slot.plantedAt);
    slot.plantedAt = Date.now() - (PLANTS[slot.plant].growthTime * 1000 - remainingTime * 0.1);
    state.adViews++;
    // Обновление UI
    renderField();
}

// Восстановление воды со временем
function startWaterRecovery() {
    setInterval(() => {
        const now = Date.now();
        const elapsedMinutes = (now - state.water.lastRecovery) / (1000 * 60);
        if (elapsedMinutes >= 1) {
            const recoveryAmount = Math.floor(elapsedMinutes) * state.water.recoveryRate;
            const oldWater = state.water.current;
            state.water.current = Math.min(
                state.water.current + recoveryAmount,
                state.water.max
            );
            state.water.lastRecovery = now;
            // Если вода полностью восстановилась
            if (oldWater < state.water.max && state.water.current === state.water.max) {
                showNotification('Вода полностью восстановлена!');
            }
            updateWater();
        }
    }, 30000); // Проверка каждые 30 секунд
}

// Таймер роста растений
function startGrowthTimer() {
    setInterval(() => {
        let needsUpdate = false;
        state.slots.forEach(slot => {
            if (slot.plant && slot.timer > 0) {
                // Расчет оставшегося времени
                const elapsed = (Date.now() - slot.plantedAt) / 1000;
                const remaining = Math.max(0, PLANTS[slot.plant].growthTime - elapsed);
                if (slot.timer !== Math.ceil(remaining)) {
                    slot.timer = Math.ceil(remaining);
                    needsUpdate = true;
                    // Если растение созрело
                    if (slot.timer === 0) {
                        showNotification(`Растение созрело!`);
                    }
                }
            }
        });
        if (needsUpdate) {
            renderField();
        }
    }, 1000);
}

// Обновление экрана бездонной ямы
function updateDumpScreen() {
    const dumpResourcesGrid = document.getElementById('dump-resources-grid');
    dumpResourcesGrid.innerHTML = '';
    
    state.dumpResources.forEach(resource => {
        const count = state.inventory[resource.key] || 0;
        if (count > 0) {
            const resourceElement = document.createElement('div');
            resourceElement.className = 'dump-resource';
            resourceElement.innerHTML = `
                <div class="item-icon">${resource.icon || '🌱'}</div>
                <div class="item-name">${resource.name}</div>
                <div class="item-count">${count}</div>
            `;
            resourceElement.addEventListener('click', () => dumpResource(resource.key));
            dumpResourcesGrid.appendChild(resourceElement);
        }
    });
}

// Сброс ресурсов в бездонную яму
function dumpResource(resourceKey) {
    const resource = state.dumpResources.find(r => r.key === resourceKey);
    if (!resource || state.inventory[resourceKey] <= 0) return;
    
    // Уменьшаем количество ресурса
    state.inventory[resourceKey]--;
    
    // Генерируем дроп
    const tier = calculateDumpTier();
    const drop = generateDrop(tier);
    
    // Добавляем дроп в инвентарь
    if (drop) {
        state.inventory[drop.key] = (state.inventory[drop.key] || 0) + drop.quantity;
        showNotification(`Получено: ${drop.quantity} ${drop.name}`);
    } else {
        showNotification('Сожжено! Ничего не получено.');
    }
    
    // Обновляем UI
    updateDumpScreen();
    updateInventory();
}

// Расчет уровня ямы
function calculateDumpTier() {
    const baseTier = state.dumpLevel;
    return Math.min(5, baseTier);
}

// Генерация дропа в зависимости от уровня ямы
function generateDrop(tier) {
    const drops = [
        { key: 'green_seeds', name: 'Зеленые семена', quantity: 1, chance: 0.7 },
        { key: 'gold_seeds', name: 'Золотые семена', quantity: 1, chance: 0.3 },
        { key: 'green_fruits', name: 'Зеленые плоды', quantity: 1, chance: 0.5 },
        { key: 'gold_fruits', name: 'Золотые плоды', quantity: 1, chance: 0.2 },
        { key: 'fertilizer', name: 'Удобрение', quantity: 1, chance: 0.4 },
        { key: 'water_bottle', name: 'Бутыль воды', quantity: 1, chance: 0.3 },
        { key: 'growth_accelerator', name: 'Ускоритель роста', quantity: 1, chance: 0.1 },
        { key: 'farm_ticket', name: 'Фарм-билет', quantity: 1, chance: 0.05 }
    ];
    
    // Фильтруем дропы по уровню ямы
    const filteredDrops = drops.filter(drop => {
        if (tier === 1) return drop.chance >= 0.1;
        if (tier === 2) return drop.chance >= 0.05;
        if (tier === 3) return drop.chance >= 0.03;
        if (tier === 4) return drop.chance >= 0.02;
        return drop.chance >= 0.01;
    });
    
    if (filteredDrops.length === 0) return null;
    
    // Выбираем случайный дроп
    const randomIndex = Math.floor(Math.random() * filteredDrops.length);
    return filteredDrops[randomIndex];
}

// Обновление экрана крафта
function updateCraftScreen() {
    const craftGrid = document.getElementById('craft-grid');
    craftGrid.innerHTML = '';
    
    const activeTab = document.querySelector('.tab-btn.active').dataset.craftType;
    const recipes = state.craftRecipes.filter(recipe => {
        if (activeTab === 'all') return true;
        if (activeTab === 'available') {
            // Проверяем, есть ли у игрока все необходимые ресурсы для крафта
            return recipe.ingredients.every(ing => {
                return state.inventory[ing.key] >= ing.quantity;
            });
        }
        return true;
    });
    
    recipes.forEach(recipe => {
        const recipeElement = document.createElement('div');
        recipeElement.className = 'craft-item';
        recipeElement.innerHTML = `
            <div class="craft-item-icon">${recipe.icon}</div>
            <div class="craft-item-name">${recipe.name}</div>
            <div class="craft-item-recipe">
                ${recipe.ingredients.map(ing => `
                    <div class="craft-ingredient">
                        <span>${ing.quantity}</span>
                        <span>${getIngredientName(ing.key)}</span>
                    </div>
                `).join('')}
            </div>
            <button class="btn primary" data-craft="${recipe.output}">Создать</button>
        `;
        recipeElement.querySelector('button').addEventListener('click', () => craftItem(recipe));
        craftGrid.appendChild(recipeElement);
    });
}

// Получение имени ингредиента
function getIngredientName(key) {
    const resources = [
        { key: 'green_seeds', name: 'Зеленые семена' },
        { key: 'gold_seeds', name: 'Золотые семена' },
        { key: 'green_fruits', name: 'Зеленые плоды' },
        { key: 'gold_fruits', name: 'Золотые плоды' },
        { key: 'fertilizer', name: 'Удобрение' },
        { key: 'water_bottle', name: 'Бутыль воды' },
        { key: 'growth_accelerator', name: 'Ускоритель роста' }
    ];
    
    const resource = resources.find(r => r.key === key);
    return resource ? resource.name : key;
}

// Крафт предмета
function craftItem(recipe) {
    // Проверяем наличие всех ресурсов
    if (!recipe.ingredients.every(ing => {
        return state.inventory[ing.key] >= ing.quantity;
    })) {
        showNotification('Недостаточно ресурсов для крафта!', true);
        return;
    }
    
    // Уменьшаем ресурсы
    recipe.ingredients.forEach(ing => {
        state.inventory[ing.key] -= ing.quantity;
    });
    
    // Добавляем результат крафта
    state.inventory[recipe.output] = (state.inventory[recipe.output] || 0) + recipe.quantity;
    
    showNotification(`Создано: ${recipe.quantity} ${recipe.name}`);
    updateCraftScreen();
    updateInventory();
}

// Обновление экрана странствующего торговца
function updateMerchantScreen() {
    const merchantBuyGrid = document.getElementById('merchant-buy-grid');
    const merchantSellGrid = document.getElementById('merchant-sell-grid');
    
    merchantBuyGrid.innerHTML = '';
    merchantSellGrid.innerHTML = '';
    
    // Предложения для покупки
    state.merchantOffers.buy.forEach(offer => {
        const offerElement = document.createElement('div');
        offerElement.className = 'merchant-offer';
        offerElement.innerHTML = `
            <div class="merchant-offer-icon">${getIconForItem(offer.item)}</div>
            <div class="merchant-offer-name">${getDisplayName(offer.item)}</div>
            <div class="merchant-offer-price">Цена: ${offer.price} TON</div>
            <button class="btn primary" data-item="${offer.item}" data-quantity="${offer.quantity}" data-type="buy">Купить</button>
        `;
        offerElement.querySelector('button').addEventListener('click', () => buyFromMerchant(offer));
        merchantBuyGrid.appendChild(offerElement);
    });
    
    // Предложения для продажи
    state.merchantOffers.sell.forEach(offer => {
        const offerElement = document.createElement('div');
        offerElement.className = 'merchant-offer';
        offerElement.innerHTML = `
            <div class="merchant-offer-icon">${getIconForItem(offer.item)}</div>
            <div class="merchant-offer-name">${getDisplayName(offer.item)}</div>
            <div class="merchant-offer-price">Цена: ${offer.price} TON</div>
            <button class="btn primary" data-item="${offer.item}" data-quantity="${offer.quantity}" data-type="sell">Продать</button>
        `;
        offerElement.querySelector('button').addEventListener('click', () => sellToMerchant(offer));
        merchantSellGrid.appendChild(offerElement);
    });
}

// Получение иконки для предмета
function getIconForItem(item) {
    const icons = {
        'green_seeds': '🌱',
        'gold_seeds': '🌟',
        'green_fruits': '🍏',
        'gold_fruits': '⭐',
        'fertilizer': '🌿',
        'water_bottle': '💧',
        'growth_accelerator': '⚡'
    };
    return icons[item] || '🌱';
}

// Получение отображаемого названия для предмета
function getDisplayName(item) {
    const names = {
        'green_seeds': 'Зеленые семена',
        'gold_seeds': 'Золотые семена',
        'green_fruits': 'Зеленые плоды',
        'gold_fruits': 'Золотые плоды',
        'fertilizer': 'Удобрение',
        'water_bottle': 'Бутыль воды',
        'growth_accelerator': 'Ускоритель роста'
    };
    return names[item] || item;
}

// Покупка у торговца
function buyFromMerchant(offer) {
    const cost = offer.price * offer.quantity;
    if (state.balance < cost) {
        showNotification('Недостаточно TON для покупки!', true);
        return;
    }
    
    // Покупка
    state.balance -= cost;
    state.inventory[offer.item] = (state.inventory[offer.item] || 0) + offer.quantity;
    
    showNotification(`Куплено: ${offer.quantity} ${getDisplayName(offer.item)} за ${cost} TON`);
    updateMerchantScreen();
    updateBalance();
    updateInventory();
}

// Продажа торговцу
function sellToMerchant(offer) {
    if (state.inventory[offer.item] < offer.quantity) {
        showNotification('Недостаточно предметов для продажи!', true);
        return;
    }
    
    // Продажа
    const earnings = offer.price * offer.quantity;
    state.balance += earnings;
    state.inventory[offer.item] -= offer.quantity;
    
    showNotification(`Продано: ${offer.quantity} ${getDisplayName(offer.item)} за ${earnings} TON`);
    updateMerchantScreen();
    updateBalance();
    updateInventory();
}

// Обновление экрана работников
function updateWorkersScreen() {
    // Обновляем статусы работников
    state.workers.forEach(worker => {
        const statusElement = document.getElementById(`worker-status-${worker.id}`);
        const timeElement = document.getElementById(`worker-time-${worker.id}`);
        
        if (worker.status === 'working') {
            const remainingTime = worker.endTime - Date.now();
            if (remainingTime <= 0) {
                worker.status = 'free';
                worker.endTime = null;
                statusElement.textContent = 'Свободен';
                timeElement.textContent = 'До окончания: 00:00:00';
            } else {
                statusElement.textContent = 'Работает';
                timeElement.textContent = `До окончания: ${formatTimeRemaining(remainingTime)}`;
            }
        } else {
            statusElement.textContent = 'Свободен';
            timeElement.textContent = 'До окончания: 00:00:00';
        }
    });
    
    // Обновляем доступные слоты для работы
    const slotSelect = document.getElementById('worker-slot-select');
    slotSelect.innerHTML = '';
    state.slots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot.id;
        option.textContent = `Слот ${slot.id}`;
        slotSelect.appendChild(option);
    });
}

// Форматирование оставшегося времени
function formatTimeRemaining(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const secs = seconds % 60;
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Нанять работника
function hireWorker() {
    const worker = state.workers[0];
    if (worker.status !== 'free') {
        showNotification('Работник уже занят!', true);
        return;
    }
    
    // Проверка наличия ресурсов для найма
    if (state.inventory.water_bottle < 1) {
        showNotification('Недостаточно бутылей воды для найма!', true);
        return;
    }
    
    // Затраты на найм
    state.inventory.water_bottle--;
    worker.status = 'working';
    worker.endTime = Date.now() + 8 * 60 * 60 * 1000; // 8 часов
    
    showNotification('Работник нанят на 8 часов!');
    updateWorkersScreen();
}

// Уволить работника
function fireWorker() {
    const worker = state.workers[0];
    if (worker.status === 'free') {
        showNotification('Работник уже свободен!', true);
        return;
    }
    
    // Завершаем работу раньше времени
    worker.status = 'free';
    worker.endTime = null;
    
    showNotification('Работник уволен!');
    updateWorkersScreen();
}

// Старт таймера работы работников
function startWorkerTimer() {
    setInterval(() => {
        updateWorkersScreen();
    }, 1000);
}

// Синхронизация фиксированной панели
function syncFixedPanel() {
    const fixedContainer = document.querySelector('.fixed-bottom-container');
    if (state.activeScreen === 'main') {
        fixedContainer.style.display = 'block';
    } else {
        fixedContainer.style.display = 'none';
    }
}

// Обработчики событий
function setupEventListeners() {
    // Выбор семени
    document.getElementById('seed-select').addEventListener('change', (e) => {
        state.selectedSeed = e.target.value;
    });
    // Кнопка посадки
    document.getElementById('plant-btn').addEventListener('click', () => {
        const freeSlot = state.slots.find(slot => !slot.plant);
        if (freeSlot) plantSeed(freeSlot.id);
        else showNotification('Нет свободных слотов!', true);
    });
    // Кнопка "Посадить все"
    document.getElementById('plant-all-btn').addEventListener('click', plantAllSeeds);
    // Кнопка "Собрать все"
    document.getElementById('harvest-all-btn').addEventListener('click', harvestAll);
    // Кнопка "Удалить все"
    document.getElementById('remove-all-btn').addEventListener('click', removeAllPlants);
    // Кнопка добавления воды
    document.getElementById('water-btn').addEventListener('click', addWater);
    // Кнопка покупки слота
    document.getElementById('buy-slot-btn').addEventListener('click', buySlot);
    // Кнопка продажи золотых плодов
    document.getElementById('sell-gold-btn').addEventListener('click', sellGoldFruits);
    // Кнопки профиля
    document.getElementById('deposit-btn').addEventListener('click', depositTON);
    document.getElementById('withdraw-btn').addEventListener('click', withdrawTON);
    document.getElementById('premium-btn').addEventListener('click', buyPremium);
    document.getElementById('copy-ref-btn').addEventListener('click', () => {
        const input = document.getElementById('referral-code');
        input.select();
        document.execCommand('copy');
        showNotification('Реферальный код скопирован!');
    });
    // Переход в профиль по клику на аватар
    document.getElementById('profile-btn').addEventListener('click', () => {
        showScreen('profile');
    });
    // Навигация
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const screen = btn.dataset.screen;
            showScreen(screen);
        });
    });
    // Вкладки маркетплейса
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateMarketHistory();
        });
    });
    // Вкладки крафта
    document.querySelectorAll('.craft-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.craft-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCraftScreen();
        });
    });
    // Кнопки для бездонной ямы
    document.getElementById('upgrade-dump-btn').addEventListener('click', upgradeDump);
    // Кнопки для работников
    document.getElementById('hire-worker-btn').addEventListener('click', hireWorker);
    document.getElementById('fire-worker-btn').addEventListener('click', fireWorker);
    // Кнопки для торговца
    document.querySelectorAll('.merchant-offer button').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const item = btn.dataset.item;
            const quantity = parseInt(btn.dataset.quantity);
            
            if (type === 'buy') {
                buyFromMerchant({ item, price: 1, quantity });
            } else {
                sellToMerchant({ item, price: 1, quantity });
            }
        });
    });
}

// Переключение экранов
function showScreen(screenName) {
    // Скрыть все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    // Показать выбранный экран
    const screenElement = document.getElementById(`${screenName}-screen`);
    if (screenElement) {
        screenElement.classList.add('active');
        // Обновить данные при переходе на экран
        if (screenName === 'inventory') {
            updateInventory();
        } else if (screenName === 'market') {
            updateMarketHistory();
        } else if (screenName === 'profile') {
            updateStats();
            updateFarmTicket();
        } else if (screenName === 'dump') {
            updateDumpScreen();
        } else if (screenName === 'craft') {
            updateCraftScreen();
        } else if (screenName === 'merchant') {
            updateMerchantScreen();
        } else if (screenName === 'workers') {
            updateWorkersScreen();
        }
    }
    // Обновить активную кнопку навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.screen === screenName);
    });
    // Сохранить активный экран
    state.activeScreen = screenName;
    // Синхронизировать фиксированную панель
    syncFixedPanel();
}

// Улучшение бездонной ямы
function upgradeDump() {
    const upgradeCost = 10;
    if (state.balance < upgradeCost) {
        showNotification(`Недостаточно TON! Требуется: ${upgradeCost}`, true);
        return;
    }
    
    // Улучшение ямы
    state.dumpLevel++;
    state.balance -= upgradeCost;
    
    showNotification(`Уровень бездонной ямы повышен до ${state.dumpLevel}!`);
    updateDumpScreen();
    updateBalance();
}