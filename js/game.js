// ==========================================
// НАСТРОЙКИ КАРТИНОК (ПУТИ К ФАЙЛАМ)
// ==========================================
const ASSETS = {
    location: 'assets/location.png',
    counter: 'assets/counter.png',
    fairy: 'assets/fairy.png',
    customer: 'assets/customer.png',
    potion: 'assets/potion.png'
};

// ==========================================
// КЛАССЫ СУЩНОСТЕЙ
// ==========================================
class Counter {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.level = 1;
        this.stars = 0;
        this.brewTime = 3000; // мс на варку
        this.isBrewing = false;
        this.progress = 0;
        
        this.element = document.createElement('div');
        this.element.className = 'entity counter';
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        this.element.innerHTML = `
            <div class="counter-level">1</div>
            <img src="${ASSETS.counter}" alt="Counter">
        `;
        this.element.onclick = () => game.startBrewing(this);
        
        document.getElementById('entities-layer').appendChild(this.element);
    }

    updateLevel() {
        this.level++;
        this.brewTime = Math.max(500, this.brewTime - 200); // Ускоряем варку
        
        // Каждые 3 уровня даем звезду
        if (this.level % 3 === 0) {
            this.stars++;
            game.showFloatingText(this.x, this.y, '⭐ ЗВЕЗДА!', '#ff69b4');
        }
        
        this.element.querySelector('.counter-level').textContent = this.level + (this.stars > 0 ? ' ★'.repeat(this.stars) : '');
    }

    addPotionVisual() {
        if (!this.element.querySelector('.potion-on-counter')) {
            const img = document.createElement('img');
            img.src = ASSETS.potion;
            img.className = 'potion-on-counter';
            this.element.appendChild(img);
        }
    }

    removePotionVisual() {
        const p = this.element.querySelector('.potion-on-counter');
        if (p) p.remove();
    }
}

class Fairy {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.isWorking = false;
        this.targetCounter = null;
        
        this.element = document.createElement('div');
        this.element.className = 'entity fairy';
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        this.element.innerHTML = `<img src="${ASSETS.fairy}" alt="Fairy">`;
        
        document.getElementById('entities-layer').appendChild(this.element);
    }

    moveTo(x, y) {
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
    }
}

class Customer {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.price = Math.floor(Math.random() * 20 + 10) * game.priceMultiplier;
        
        this.element = document.createElement('div');
        this.element.className = 'entity customer';
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        this.element.innerHTML = `
            <div class="order-bubble">Зелье: ${this.price}💰</div>
            <img src="${ASSETS.customer}" alt="Customer">
        `;
        this.element.onclick = () => game.serveCustomer(this);
        
        document.getElementById('entities-layer').appendChild(this.element);
    }

    destroy() {
        this.element.remove();
        game.customers = game.customers.filter(c => c !== this);
    }
}

// ==========================================
// ОСНОВНОЙ КЛАСС ИГРЫ
// ==========================================
class Game {
    constructor() {
        this.coins = 150;
        this.level = 1;
        this.priceMultiplier = 1;
        
        this.counters = [];
        this.fairies = [];
        this.customers = [];
        
        this.costs = {
            counter: 100,
            fairy: 250,
            upgrade: 500
        };

        this.init();
    }

    init() {
        // Создаем стартовые объекты
        this.addCounter(100, 200);
        this.addFairy(300, 250);
        
        this.updateUI();
        this.startGameLoop();
        
        // Спавн клиентов каждые 4 секунды
        setInterval(() => this.spawnCustomer(), 4000);
    }

    addCounter(x, y) {
        const counter = new Counter(this.counters.length, x, y);
        this.counters.push(counter);
    }

    addFairy(x, y) {
        const fairy = new Fairy(this.fairies.length, x, y);
        this.fairies.push(fairy);
    }

    startBrewing(counter) {
        if (counter.isBrewing) return;
        
        // Ищем свободную фею
        const freeFairy = this.fairies.find(f => !f.isWorking);
        if (!freeFairy) {
            this.showFloatingText(counter.x, counter.y - 50, 'Нет свободных фей!', 'red');
            return;
        }

        counter.isBrewing = true;
        counter.progress = 0;
        freeFairy.isWorking = true;
        freeFairy.targetCounter = counter;
        freeFairy.element.classList.add('working');
        
        // Перемещаем фею к стойке
        freeFairy.moveTo(counter.x + 30, counter.y - 20);
    }

    serveCustomer(customer) {
        // Ищем готовое зелье на любой стойке
        const readyCounter = this.counters.find(c => c.isBrewing && c.progress >= c.brewTime);
        
        if (readyCounter) {
            // Продаем
            this.coins += customer.price;
            this.level += 0.1; // Прогресс уровня
            
            this.showFloatingText(customer.x, customer.y, `+${customer.price}💰`, '#ffd700');
            
            // Сбрасываем стойку
            readyCounter.isBrewing = false;
            readyCounter.progress = 0;
            readyCounter.removePotionVisual();
            
            // Освобождаем фею
            const fairy = this.fairies.find(f => f.targetCounter === readyCounter);
            if (fairy) {
                fairy.isWorking = false;
                fairy.targetCounter = null;
                fairy.element.classList.remove('working');
                fairy.moveTo(fairy.x, fairy.y + 50); // Чуть отлетает
            }
            
            customer.destroy();
            this.updateUI();
        } else {
            this.showFloatingText(customer.x, customer.y, 'Нет готового зелья!', 'red');
        }
    }

    spawnCustomer() {
        if (this.customers.length >= 4) return;
        const x = Math.random() * (window.innerWidth - 200) + 100;
        const y = Math.random() * 100 + 100;
        this.customers.push(new Customer(x, y));
    }

    buyCounter() {
        if (this.coins >= this.costs.counter) {
            this.coins -= this.costs.counter;
            this.costs.counter = Math.floor(this.costs.counter * 1.5);
            
            const row = Math.floor(this.counters.length / 3);
            const col = this.counters.length % 3;
            this.addCounter(100 + col * 150, 200 + row * 150);
            
            this.updateUI();
        }
    }

    buyFairy() {
        if (this.coins >= this.costs.fairy) {
            this.coins -= this.costs.fairy;
            this.costs.fairy = Math.floor(this.costs.fairy * 1.4);
            
            const x = 300 + this.fairies.length * 70;
            this.addFairy(x, 250);
            
            this.updateUI();
        }
    }

    upgradeAll() {
        if (this.coins >= this.costs.upgrade) {
            this.coins -= this.costs.upgrade;
            this.costs.upgrade = Math.floor(this.costs.upgrade * 1.8);
            
            this.counters.forEach(c => c.updateLevel());
            this.showFloatingText(window.innerWidth / 2, window.innerHeight / 2, 'ВСЕ УЛУЧШЕНО! ⚡', '#00ff00');
            this.updateUI();
        }
    }

    showFloatingText(x, y, text, color) {
        const el = document.createElement('div');
        el.className = 'floating-text';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = color;
        el.textContent = text;
        document.getElementById('entities-layer').appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    updateUI() {
        document.getElementById('coin-count').textContent = Math.floor(this.coins);
        document.getElementById('level-count').textContent = Math.floor(this.level);
        
        document.getElementById('cost-counter').textContent = this.costs.counter + '💰';
        document.getElementById('cost-fairy').textContent = this.costs.fairy + '💰';
        document.getElementById('cost-upgrade').textContent = this.costs.upgrade + '💰';

        // Блокируем кнопки, если не хватает денег
        const btns = document.querySelectorAll('.btn');
        btns[0].disabled = this.coins < this.costs.counter;
        btns[1].disabled = this.coins < this.costs.fairy;
        btns[2].disabled = this.coins < this.costs.upgrade;
    }

    startGameLoop() {
        // Обновление прогресса варки 60 раз в секунду
        setInterval(() => {
            this.counters.forEach(counter => {
                if (counter.isBrewing) {
                    counter.progress += 16; // ~16мс на кадр
                    if (counter.progress >= counter.brewTime) {
                        counter.addPotionVisual();
                    }
                }
            });
        }, 16);
    }
}

// Запуск игры после загрузки страницы
window.onload = () => {
    window.game = new Game();
};
