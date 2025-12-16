// API ключ для погоды (можно заменить на свой)
const WEATHER_API_KEY = 'b806a66b80729c942b2d16113d059ce9';

// Базовый класс виджета
class Widget {
    constructor(type, title, id = null) {
        this.type = type;
        this.title = title;
        this.id = id || this.generateId();
        this.settings = {};
        this.isLoading = false;
        this.hasError = false;
        this.errorMessage = '';
    }

    generateId() {
        return 'widget-' + Math.random().toString(36).substr(2, 9);
    }

    render() {
        return `
            <div class="widget" data-id="${this.id}" draggable="true">
                <div class="widget-header">
                    <h3 class="widget-title">${this.title}</h3>
                    <div class="widget-controls">
                        <button class="icon-btn settings-btn" title="Настройки">
                            <i data-lucide="settings"></i>
                        </button>
                        <button class="icon-btn refresh-btn" title="Обновить">
                            <i data-lucide="refresh-cw"></i>
                        </button>
                        <button class="icon-btn remove-btn danger" title="Удалить">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>
                <div class="widget-content">
                    ${this.renderContent()}
                </div>
            </div>
        `;
    }

    renderContent() {
        if (this.isLoading) {
            return `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Загрузка...</p>
                </div>`;
        }
        if (this.hasError) {
            return `
                <div class="error">
                    <p>Ошибка загрузки данных</p>
                    <p class="error-details">${this.errorMessage}</p>
                    <button class="glass-btn retry-btn">Повторить</button>
                </div>`;
        }
        return this.getContent();
    }

    getContent() { return '<p>Содержимое виджета</p>'; }

    loadData() {
        this.isLoading = true;
        this.hasError = false;
        this.errorMessage = '';
        this.updateView();
    }

    updateView() {
        const widgetEl = document.querySelector(`[data-id="${this.id}"]`);
        if (!widgetEl) return;
        
        widgetEl.querySelector('.widget-title').textContent = this.title;
        const content = widgetEl.querySelector('.widget-content');
        if (content) {
            content.innerHTML = this.renderContent();
            this.attachEventListeners();
            lucide.createIcons();
        }
    }

    attachEventListeners() {
        const widgetEl = document.querySelector(`[data-id="${this.id}"]`);
        if (!widgetEl) return;

        widgetEl.querySelector('.refresh-btn')?.addEventListener('click', () => this.loadData());
        widgetEl.querySelector('.remove-btn')?.addEventListener('click', () => this.remove());
        widgetEl.querySelector('.settings-btn')?.addEventListener('click', () => this.openSettings());
        widgetEl.querySelector('.retry-btn')?.addEventListener('click', () => this.loadData());

        widgetEl.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', this.id);
            widgetEl.classList.add('dragging');
        });
        
        widgetEl.addEventListener('dragend', () => {
            widgetEl.classList.remove('dragging');
        });
    }

    remove() {
        const widgetEl = document.querySelector(`[data-id="${this.id}"]`);
        if (widgetEl) {
            widgetEl.style.transform = 'translateY(100px) scale(0.8)';
            widgetEl.style.opacity = '0';
            
            setTimeout(() => {
                widgetEl.remove();
                dashboardManager.removeWidget(this.id);
            }, 400);
        }
    }

    openSettings() {
        // Показываем соответствующее модальное окно настроек
        const modal = document.getElementById(`${this.type}-settings-modal`);
        if (modal) {
            // Показываем оверлей
            const overlay = document.getElementById('modal-overlay');
            overlay.style.display = 'block';
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 10);
            
            // Показываем модальное окно
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
            
            // Инициализируем настройки для данного типа виджета
            this.setupSettingsForm?.();
            
            // Настраиваем обработчики событий для этого модального окна
            this.setupModalEventListeners(modal);
        } else {
            console.error(`Модальное окно для ${this.type} не найдено`);
        }
    }

    setupModalEventListeners(modal) {
        const closeModal = () => {
            const overlay = document.getElementById('modal-overlay');
            
            modal.classList.remove('active');
            overlay.style.opacity = '0';
            
            setTimeout(() => {
                modal.style.display = 'none';
                overlay.style.display = 'none';
            }, 300);
        };

        // Кнопки закрытия
        modal.querySelector('.settings-close-modal').onclick = closeModal;
        modal.querySelector('.settings-cancel-btn').onclick = closeModal;
        
        // Кнопка сохранения настроек
        const saveBtn = modal.querySelector('.settings-save-btn');
        saveBtn.onclick = () => {
            this.saveSettings();
            closeModal();
        };

        // Закрытие по клику на оверлей
        document.getElementById('modal-overlay').onclick = closeModal;
        
        // Предотвращаем закрытие при клике на само модальное окно
        modal.querySelector('.settings-modal-content').onclick = (e) => {
            e.stopPropagation();
        };
    }

    setupSettingsForm() {}
    
    saveSettings() {
        // Базовая реализация - сохраняет заголовок виджета
        const titleInput = document.getElementById(`${this.type}-title-input`);
        if (titleInput?.value.trim()) {
            this.title = titleInput.value.trim();
            this.updateView();
        }
    }

    getConfig() {
        return { 
            type: this.type, 
            id: this.id, 
            title: this.title, 
            settings: this.settings 
        };
    }
}

// === ВИДЖЕТЫ ===

class WeatherWidget extends Widget {
    constructor(id = null) {
        super('weather', 'Погода', id);
        this.settings.city = this.settings.city || 'Санкт-Петербург';
        this.data = null;
    }

    getContent() {
        if (!this.data) return '<p>Данные о погоде не загружены</p>';
        
        const weatherIcon = this.getWeatherIcon(this.data.weather[0].main);
        const feelsLike = Math.round(this.data.main.feels_like);
        
        return `
            <div class="weather-info">
                <div class="weather-icon" style="font-size: 3rem; margin-bottom: 10px;">
                    ${weatherIcon}
                </div>
                <div class="weather-temp">${Math.round(this.data.main.temp)}°C</div>
                <div class="weather-desc">${this.data.weather[0].description}</div>
                <div class="weather-city">📍 ${this.data.name}</div>
                <div class="weather-details">
                    <div class="weather-detail">
                        <span>🌡️ Ощущается</span>
                        <span>${feelsLike}°C</span>
                    </div>
                    <div class="weather-detail">
                        <span>💧 Влажность</span>
                        <span>${this.data.main.humidity}%</span>
                    </div>
                    <div class="weather-detail">
                        <span>💨 Ветер</span>
                        <span>${this.data.wind.speed} м/с</span>
                    </div>
                    <div class="weather-detail">
                        <span>☁️ Облачность</span>
                        <span>${this.data.clouds.all}%</span>
                    </div>
                </div>
                <div class="weather-update" style="margin-top: 15px; font-size: 0.9rem; opacity: 0.8;">
                    Обновлено: ${new Date().toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}
                </div>
            </div>
        `;
    }

    getWeatherIcon(weatherCondition) {
        const icons = {
            'Clear': '☀️',
            'Clouds': '☁️',
            'Rain': '🌧️',
            'Snow': '❄️',
            'Thunderstorm': '⛈️',
            'Drizzle': '🌦️',
            'Mist': '🌫️',
            'Fog': '🌫️',
            'Haze': '🌫️'
        };
        return icons[weatherCondition] || '🌈';
    }

    loadData() {
        this.isLoading = true; 
        this.updateView();
        
        const city = encodeURIComponent(this.settings.city || 'Санкт-Петербург');
        const urls = [
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric&lang=ru`,
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`
        ];
        
        this.tryUrls(urls, 0);
    }

    tryUrls(urls, i) {
        if (i >= urls.length) { 
            this.isLoading = false; 
            this.hasError = true; 
            this.errorMessage = 'Не удалось подключиться к серверу погоды'; 
            this.updateView(); 
            return; 
        }
        
        fetch(urls[i])
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(data => { 
                this.isLoading = false; 
                this.data = data; 
                this.updateView(); 
            })
            .catch(err => {
                console.error('Weather API error:', err);
                this.tryUrls(urls, i + 1);
            });
    }

    setupSettingsForm() {
        // Заполняем поле города в модальном окне
        const cityInput = document.getElementById('weather-city-input');
        if (cityInput) {
            cityInput.value = this.settings.city;
        }
    }

    saveSettings() {
        super.saveSettings();
        const cityInput = document.getElementById('weather-city-input');
        const city = cityInput?.value.trim();
        if (city) { 
            this.settings.city = city; 
            this.loadData(); 
        }
    }
}

class CurrencyWidget extends Widget {
    constructor(id = null) {
        super('currency', 'Курсы валют', id);
        this.settings.currencies = this.settings.currencies || ['USD', 'EUR', 'GBP'];
        this.data = null;
        this.updateTime = null;
    }

    getContent() {
        if (!this.data) return '<p>Данные не загружены</p>';
        
        let html = `
            <div class="currency-info">
                <div class="currency-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <span style="font-weight: 600; color: var(--text-primary);">🏦 Курсы ЦБ РФ</span>
                    <span style="font-size: 0.9rem; opacity: 0.8;">
                        ${this.updateTime ? new Date(this.updateTime).toLocaleDateString('ru-RU') : ''}
                    </span>
                </div>
        `;
        
        this.settings.currencies.forEach(code => {
            const c = this.data[code];
            if (c) {
                const change = c.Previous ? ((c.Value - c.Previous) / c.Previous) * 100 : 0;
                const cls = change >= 0 ? 'positive' : 'negative';
                const sym = change >= 0 ? '📈' : '📉';
                const flag = this.getCurrencyFlag(code);
                
                html += `
                    <div class="currency-pair">
                        <span class="currency-name">
                            ${flag} ${c.CharCode} — ${c.Name.split(' ')[0]}
                        </span>
                        <span class="currency-rate">${c.Value.toFixed(2)} ₽</span>
                        <span class="currency-change ${cls}">
                            ${sym} ${Math.abs(change).toFixed(2)}%
                        </span>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        
        if (this.updateTime) {
            html += `
                <div class="currency-update-time" style="text-align: center; margin-top: 15px; font-size: 0.9rem; opacity: 0.8;">
                    🕐 Обновлено: ${new Date(this.updateTime).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}
                </div>
            `;
        }
        
        return html;
    }

    getCurrencyFlag(code) {
        const flags = {
            'USD': '🇺🇸',
            'EUR': '🇪🇺',
            'GBP': '🇬🇧',
            'CNY': '🇨🇳',
            'JPY': '🇯🇵',
            'TRY': '🇹🇷',
            'CHF': '🇨🇭'
        };
        return flags[code] || '💱';
    }

    loadData() {
        this.isLoading = true; 
        this.updateView();
        
        fetch('https://www.cbr-xml-daily.ru/daily_json.js')
            .then(r => r.json())
            .then(d => { 
                this.isLoading = false; 
                this.data = d.Valute; 
                this.updateTime = d.Date; 
                this.updateView(); 
            })
            .catch(err => { 
                console.error('Currency API error:', err);
                this.isLoading = false; 
                this.hasError = true; 
                this.errorMessage = 'Ошибка загрузки курсов валют'; 
                this.updateView(); 
            });
    }

    setupSettingsForm() {
        const select = document.getElementById('currency-select');
        if (select) {
            // Сбрасываем предыдущие выборы
            Array.from(select.options).forEach(opt => {
                opt.selected = false;
            });
            
            // Выбираем сохраненные валюты
            this.settings.currencies.forEach(currency => {
                const option = Array.from(select.options).find(opt => opt.value === currency);
                if (option) {
                    option.selected = true;
                }
            });
        }
    }

    saveSettings() {
        super.saveSettings();
        const select = document.getElementById('currency-select');
        if (select) {
            const selected = Array.from(select.selectedOptions).map(o => o.value);
            this.settings.currencies = selected.length ? selected : ['USD', 'EUR'];
            this.loadData();
        }
    }
}

class QuoteWidget extends Widget {
    constructor(id = null) { 
        super('quote', 'Случайная цитата', id); 
        this.data = null; 
        this.quotes = [
            {quote:"Лучший способ предсказать будущее — создать его.", author:"Питер Друкер"},
            {quote:"Успех — это способность идти от неудачи к неудаче, не теряя энтузиазма.", author:"Уинстон Черчилль"},
            {quote:"Единственный способ делать великие дела — любить то, что ты делаешь.", author:"Стив Джобс"},
            {quote:"Не ошибается тот, кто ничего не делает.", author:"Теодор Рузвельт"},
            {quote:"Ваше время ограничено, не тратьте его, живя чужой жизнью.", author:"Стив Джобс"},
            {quote:"Самый большой риск — не рисковать вообще.", author:"Марк Цукерберг"},
            {quote:"Мечты становятся реальностью, когда идеи получают поддержку действий.", author:"Астрид Линдгрен"},
            {quote:"Счастье — это не готовый продукт. Оно приходит от ваших собственных действий.", author:"Далай-лама"},
            {quote:"Великие дела совершаются великой верой.", author:"Джеймс Болдуин"},
            {quote:"Единственное ограничение — это ограничение вашего воображения.", author:"Джордж Лукас"}
        ];
    }

    getContent() {
        if (!this.data) return '<p>Цитата не загружена</p>';
        
        return `
            <div class="quote-content">
                <div style="position: relative; padding: 20px;">
                    <p class="quote-text">"${this.data.quote}"</p>
                    <p class="quote-author">— ${this.data.author}</p>
                </div>
                <button class="glass-btn next-quote-btn">
                    <i data-lucide="refresh-cw" style="margin-right: 8px;"></i>
                    Следующая цитата
                </button>
            </div>
        `;
    }

    loadData() {
        this.isLoading = true; 
        this.updateView();
        
        // Имитация загрузки с задержкой для лучшего UX
        setTimeout(() => {
            this.isLoading = false;
            this.data = this.quotes[Math.floor(Math.random() * this.quotes.length)];
            this.updateView();
            
            // Анимация появления новой цитаты
            const widgetEl = document.querySelector(`[data-id="${this.id}"]`);
            if (widgetEl) {
                widgetEl.style.animation = 'none';
                setTimeout(() => {
                    widgetEl.style.animation = 'quoteChange 0.5s ease';
                }, 10);
            }
        }, 600);
    }

    attachEventListeners() {
        super.attachEventListeners();
        const nextBtn = document.querySelector(`[data-id="${this.id}"] .next-quote-btn`);
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                // Анимация кнопки
                nextBtn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    nextBtn.style.transform = '';
                }, 200);
                
                this.loadData();
            });
        }
    }

    setupSettingsForm() {
        // Заполняем поле названия в модальном окне
        const titleInput = document.getElementById('quote-title-input');
        if (titleInput) {
            titleInput.value = this.title;
        }
    }

    saveSettings() { 
        super.saveSettings();
        const titleInput = document.getElementById('quote-title-input');
        if (titleInput?.value.trim()) {
            this.title = titleInput.value.trim();
            this.updateView();
        }
    }
}

class TimerWidget extends Widget {
    constructor(id = null) {
        super('timer', 'Таймер Pomodoro', id);
        this.settings.workTime = this.settings.workTime || 25;
        this.settings.breakTime = this.settings.breakTime || 5;
        this.timeLeft = this.settings.workTime * 60;
        this.isRunning = false;
        this.isWorkTime = true;
        this.intervalId = null;
        this.sessionCount = 0;
    }

    loadData() {
        this.isLoading = false;
        this.hasError = false;
        this.timeLeft = this.settings.workTime * 60;
        this.updateView();
    }

    getContent() {
        const m = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
        const s = String(this.timeLeft % 60).padStart(2, '0');
        const modeText = this.isWorkTime ? '⏰ Рабочее время' : '☕ Перерыв';
        const sessionsText = this.sessionCount > 0 ? `Завершено сессий: ${this.sessionCount}` : '';
        
        // Прогресс бар
        const totalTime = this.isWorkTime ? this.settings.workTime * 60 : this.settings.breakTime * 60;
        const progress = ((totalTime - this.timeLeft) / totalTime) * 100;
        
        return `
            <div class="timer-display">${m}:${s}</div>
            <div style="text-align: center; margin: 15px 0;">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 10px;">${modeText}</div>
                <div class="progress-bar" style="height: 8px; background: rgba(66, 153, 225, 0.2); border-radius: 4px; margin: 10px 0; overflow: hidden;">
                    <div class="progress-fill" style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, #4299e1, #63b3ed); border-radius: 4px; transition: width 1s linear;"></div>
                </div>
                <div style="font-size: 0.9rem; opacity: 0.8;">${sessionsText}</div>
            </div>
            <div class="timer-controls">
                <button class="glass-btn start-btn">
                    <i data-lucide="${this.isRunning ? 'pause' : 'play'}" style="margin-right: 8px;"></i>
                    ${this.isRunning ? 'Пауза' : 'Старт'}
                </button>
                <button class="glass-btn reset-btn">
                    <i data-lucide="rotate-ccw" style="margin-right: 8px;"></i>
                    Сброс
                </button>
            </div>
        `;
    }

    attachEventListeners() {
        super.attachEventListeners();
        const el = document.querySelector(`[data-id="${this.id}"]`);
        el.querySelector('.start-btn')?.addEventListener('click', () => this.toggleTimer());
        el.querySelector('.reset-btn')?.addEventListener('click', () => this.resetTimer());
    }

    toggleTimer() { 
        this.isRunning ? this.pauseTimer() : this.startTimer(); 
        this.updateView(); 
    }
    
    startTimer() {
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            if (--this.timeLeft <= 0) {
                this.timerComplete();
            }
            this.updateView();
        }, 1000);
    }
    
    pauseTimer() { 
        this.isRunning = false; 
        clearInterval(this.intervalId); 
    }
    
    resetTimer() { 
        this.pauseTimer(); 
        this.isWorkTime = true; 
        this.timeLeft = this.settings.workTime * 60; 
        this.updateView(); 
    }
    
    timerComplete() {
        this.pauseTimer();
        
        if (this.isWorkTime) {
            this.sessionCount++;
        }
        
        const msg = this.isWorkTime 
            ? '🎉 Время работы закончилось! Пора на перерыв!' 
            : '✅ Перерыв закончен! Пора работать!';
        
        // Уведомление
        if (Notification.permission === 'granted') {
            new Notification(msg);
        } else {
            alert(msg);
        }
        
        // Звуковое уведомление (простой бип)
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ');
            audio.play().catch(() => {});
        } catch (e) {}
        
        this.isWorkTime = !this.isWorkTime;
        this.timeLeft = (this.isWorkTime ? this.settings.workTime : this.settings.breakTime) * 60;
        
        // Автоматический запуск следующего этапа
        setTimeout(() => this.startTimer(), 1000);
        this.updateView();
    }

    setupSettingsForm() {
        // Заполняем поля времени работы и перерыва
        const workInput = document.getElementById('work-time-input');
        const breakInput = document.getElementById('break-time-input');
        
        if (workInput) workInput.value = this.settings.workTime;
        if (breakInput) breakInput.value = this.settings.breakTime;
    }

    saveSettings() {
        super.saveSettings();
        const workInput = document.getElementById('work-time-input');
        const breakInput = document.getElementById('break-time-input');
        
        const w = parseInt(workInput?.value) || 25;
        const b = parseInt(breakInput?.value) || 5;
        this.settings.workTime = Math.max(1, Math.min(w, 180));
        this.settings.breakTime = Math.max(1, Math.min(b, 60));
        this.resetTimer();
    }
}

class NotesWidget extends Widget {
    constructor(id = null) {
        super('notes', '📝 Мои заметки', id);
        this.notes = JSON.parse(localStorage.getItem(`notes-${this.id}`)) || [];
    }

    loadData() {
        this.isLoading = false;
        this.hasError = false;
        this.updateView();
    }

    getContent() {
        let html = this.notes.length
            ? `
                <div class="notes-list">
                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 15px;">
                        📋 Всего заметок: ${this.notes.length}
                    </div>
                    ${this.notes.map((n, i) => `
                        <div class="note-item">
                            <span class="note-text">${n}</span>
                            <span class="note-delete" data-index="${i}" title="Удалить">
                                <i data-lucide="x" style="width: 16px; height: 16px;"></i>
                            </span>
                        </div>
                    `).join('')}
                </div>
            `
            : `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">📝</div>
                    <p style="color: var(--text-secondary);">Заметок пока нет</p>
                    <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 10px;">Добавьте первую заметку ниже</p>
                </div>
            `;

        // ИСПРАВЛЕНИЕ: Кнопка "Добавить" теперь с белым фоном как у других виджетов
        html += `
            <div class="add-note">
                <input type="text" class="new-note-input glass-input" placeholder="Напишите заметку..." autocomplete="off">
                <button class="add-note-btn glass-btn" style="background: rgba(255, 255, 255, 0.95); border: 2px solid rgba(226, 232, 240, 0.8); color: var(--text-primary);">
                    <i data-lucide="plus" style="margin-right: 8px;"></i>
                    Добавить
                </button>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <button class="clear-notes-btn" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 0.9rem; opacity: 0.7;">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px; margin-right: 5px;"></i>
                    Очистить все
                </button>
            </div>
        `;
        
        return html;
    }

    attachEventListeners() {
        super.attachEventListeners();
        const el = document.querySelector(`[data-id="${this.id}"]`);
        const input = el.querySelector('.new-note-input');
        const addBtn = el.querySelector('.add-note-btn');
        const clearBtn = el.querySelector('.clear-notes-btn');

        const addNote = () => {
            const noteText = input.value.trim();
            if (noteText) {
                this.notes.push(noteText);
                this.saveNotes();
                this.updateView();
                input.value = '';
                
                // Анимация добавления
                const noteItems = el.querySelectorAll('.note-item');
                if (noteItems.length > 0) {
                    const lastNote = noteItems[noteItems.length - 1];
                    lastNote.style.animation = 'widgetAppear 0.5s ease';
                }
            }
        };

        addBtn?.addEventListener('click', addNote);
        input?.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                addNote();
                // Анимация кнопки
                addBtn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    addBtn.style.transform = '';
                }, 200);
            }
        });

        el.querySelectorAll('.note-delete').forEach(span => {
            span.addEventListener('click', () => {
                const idx = parseInt(span.dataset.index);
                const noteItem = span.closest('.note-item');
                noteItem.style.animation = 'widgetAppear 0.5s ease reverse';
                
                setTimeout(() => {
                    this.notes.splice(idx, 1);
                    this.saveNotes();
                    this.updateView();
                }, 300);
            });
        });

        clearBtn?.addEventListener('click', () => {
            if (this.notes.length > 0 && confirm('Удалить все заметки?')) {
                this.notes = [];
                this.saveNotes();
                this.updateView();
            }
        });
    }

    saveNotes() { 
        localStorage.setItem(`notes-${this.id}`, JSON.stringify(this.notes)); 
    }

    setupSettingsForm() {
        // Заполняем поле названия в модальном окне
        const titleInput = document.getElementById('notes-title-input');
        if (titleInput) {
            titleInput.value = this.title;
        }
    }

    saveSettings() { 
        super.saveSettings();
        const titleInput = document.getElementById('notes-title-input');
        if (titleInput?.value.trim()) {
            this.title = titleInput.value.trim();
            this.updateView();
        }
    }
}

// === DashboardManager ===
class DashboardManager {
    constructor() {
        this.widgets = [];
        this.loadConfiguration();
        this.initEventListeners();
        this.renderDashboard();
        this.initAnimations();
        
        // Инициализация уведомлений
        this.initNotifications();
        
        // Обработчик видео
        this.setupVideoHandler();
    }

    initAnimations() {
        // Анимация кнопок
        this.setupButtonAnimations();
        
        // Анимация при добавлении виджета
        this.setupWidgetAnimations();
    }

    setupButtonAnimations() {
        document.querySelectorAll('.controls button, .glass-btn').forEach(btn => {
            btn.addEventListener('mousedown', () => {
                btn.style.transform = 'scale(0.95)';
            });
            
            btn.addEventListener('mouseup', () => {
                btn.style.transform = '';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

    setupWidgetAnimations() {
        // Анимация при перетаскивании
        const dashboard = document.getElementById('dashboard');
        
        dashboard.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(dashboard, e.clientY);
            const dragging = document.querySelector('.dragging');
            
            if (afterElement) {
                dashboard.insertBefore(dragging, afterElement);
            } else {
                dashboard.appendChild(dragging);
            }
        });
        
        dashboard.addEventListener('drop', () => {
            this.saveConfiguration();
        });
    }

    setupVideoHandler() {
        const video = document.getElementById('bg-video');
        if (video) {
            video.addEventListener('error', () => {
                console.log('Видео не загрузилось, используем градиентный фон');
                document.body.style.background = 'linear-gradient(135deg, #87CEEB 0%, #E0F7FF 50%, #B3E0FF 100%)';
                document.body.style.backgroundSize = '400% 400%';
                document.body.style.animation = 'gradientBG 20s ease infinite';
            });
            
            // Автозапуск видео
            video.play().catch(e => {
                console.log('Автовоспроизведение видео заблокировано:', e);
            });
        }
    }

    initNotifications() {
        if ('Notification' in window && Notification.permission === 'default') {
            setTimeout(() => {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        console.log('Уведомления разрешены');
                    }
                });
            }, 3000);
        }
    }

    initEventListeners() {
        // Кнопки управления
        document.getElementById('add-widget-btn').addEventListener('click', () => {
            document.querySelector('.widget-selector').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Подсветка доступных виджетов
            document.querySelectorAll('.available-widget').forEach(widget => {
                widget.style.animation = 'widgetPulse 2s ease';
                setTimeout(() => {
                    widget.style.animation = '';
                }, 2000);
            });
        });
        
        document.getElementById('export-btn').onclick = () => this.exportConfiguration();
        document.getElementById('import-btn').onclick = () => this.importConfiguration();

        // Доступные виджеты
        document.querySelectorAll('.available-widget').forEach(el => {
            el.addEventListener('click', () => {
                // Анимация клика
                el.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    el.style.transform = '';
                    this.addWidget(el.dataset.type);
                }, 200);
            });
        });

        // Перетаскивание
        const dashboard = document.getElementById('dashboard');
        dashboard.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(dashboard, e.clientY);
            const dragging = document.querySelector('.dragging');
            
            if (afterElement) {
                dashboard.insertBefore(dragging, afterElement);
            } else {
                dashboard.appendChild(dragging);
            }
        });
        
        dashboard.addEventListener('drop', () => {
            this.saveConfiguration();
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.widget:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    addWidget(type) {
        let widget;
        
        switch(type) {
            case 'weather': 
                widget = new WeatherWidget(); 
                break;
            case 'currency': 
                widget = new CurrencyWidget(); 
                break;
            case 'quote': 
                widget = new QuoteWidget(); 
                break;
            case 'timer': 
                widget = new TimerWidget(); 
                break;
            case 'notes': 
                widget = new NotesWidget(); 
                break;
            default: 
                return;
        }
        
        if (widget) {
            this.widgets.push(widget);
            this.renderDashboard();
            this.saveConfiguration();
            
            // Анимация добавления виджета
            const newWidget = document.querySelector(`[data-id="${widget.id}"]`);
            if (newWidget) {
                newWidget.style.animation = 'widgetAppear 0.6s ease';
                newWidget.classList.add('new-widget');
                setTimeout(() => newWidget.classList.remove('new-widget'), 600);
            }
            
            // Загрузка данных с небольшой задержкой
            setTimeout(() => widget.loadData(), 100);
        }
    }

    removeWidget(id) { 
        this.widgets = this.widgets.filter(w => w.id !== id); 
        this.saveConfiguration(); 
    }

    renderDashboard() {
        const dashboard = document.getElementById('dashboard');
        dashboard.innerHTML = this.widgets.map(w => w.render()).join('');
        
        // Инициализация иконок
        lucide.createIcons();
        
        // Привязка событий
        this.widgets.forEach(w => w.attachEventListeners());
    }

    exportConfiguration() {
        const config = {
            widgets: this.widgets.map(w => w.getConfig()),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const data = JSON.stringify(config, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-config-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        // Уведомление
        this.showToast('Настройки экспортированы!', 'success');
    }

    importConfiguration() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const config = JSON.parse(ev.target.result);
                    this.loadConfigurationFromObject(config);
                    this.showToast('Настройки импортированы!', 'success');
                } catch (err) {
                    console.error('Ошибка импорта:', err);
                    this.showToast('Ошибка импорта файла', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        lucide.createIcons();
        
        // Анимация появления
        setTimeout(() => toast.style.opacity = '1', 10);
        
        // Автоудаление
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    loadConfiguration() {
        const saved = localStorage.getItem('dashboard-config');
        if (saved) {
            try {
                this.loadConfigurationFromObject(JSON.parse(saved));
                return;
            } catch(e) {
                console.error('Ошибка загрузки конфигурации:', e);
            }
        }
        
        // Виджеты по умолчанию
        this.addWidget('weather');
        this.addWidget('currency');
        this.addWidget('quote');
    }

    loadConfigurationFromObject(config) {
        this.widgets = [];
        
        config.widgets?.forEach(c => {
            let widget;
            
            switch(c.type) {
                case 'weather': widget = new WeatherWidget(c.id); break;
                case 'currency': widget = new CurrencyWidget(c.id); break;
                case 'quote': widget = new QuoteWidget(c.id); break;
                case 'timer': widget = new TimerWidget(c.id); break;
                case 'notes': widget = new NotesWidget(c.id); break;
            }
            
            if (widget) {
                widget.title = c.title || widget.title;
                widget.settings = { ...widget.settings, ...c.settings };
                
                if (c.type === 'notes') {
                    widget.notes = JSON.parse(localStorage.getItem(`notes-${widget.id}`)) || [];
                }
                
                this.widgets.push(widget);
            }
        });
        
        this.renderDashboard();
        
        // Загрузка данных с задержкой
        setTimeout(() => {
            this.widgets.forEach(w => w.loadData());
        }, 500);
    }

    saveConfiguration() {
        const config = {
            widgets: this.widgets.map(w => w.getConfig()),
            saveDate: new Date().toISOString()
        };
        
        localStorage.setItem('dashboard-config', JSON.stringify(config));
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Стили для тостов
    const toastStyles = document.createElement('style');
    toastStyles.textContent = `
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
            border: 2px solid rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(20px);
            z-index: 10000;
            transform: translateY(-20px);
            opacity: 0;
            transition: all 0.3s ease;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .toast.success {
            border-left: 6px solid #38a169;
        }
        
        .toast.error {
            border-left: 6px solid #e53e3e;
        }
        
        .toast i {
            width: 20px;
            height: 20px;
        }
        
        .toast.success i {
            color: #38a169;
        }
        
        .toast.error i {
            color: #e53e3e;
        }
        
        @keyframes widgetPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        @keyframes quoteChange {
            0% { opacity: 0.5; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes modalAppear {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes modalDisappear {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 0; transform: scale(0.9); }
        }
        
        .glass-input {
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid rgba(226, 232, 240, 0.8);
            border-radius: 12px;
            padding: 12px;
            color: var(--text-primary);
            font-family: inherit;
            font-size: 1rem;
            transition: all 0.3s;
        }
        
        .glass-input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
        }
    `;
    
    document.head.appendChild(toastStyles);
    
    // Инициализация менеджера
    window.dashboardManager = new DashboardManager();
    
    // Добавляем обработчик для перетаскивания файлов
    document.addEventListener('dragover', e => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) {
            document.body.style.border = '3px dashed var(--accent)';
        }
    });
    
    document.addEventListener('dragleave', () => {
        document.body.style.border = 'none';
    });
    
    document.addEventListener('drop', e => {
        e.preventDefault();
        document.body.style.border = 'none';
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/json') {
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const config = JSON.parse(ev.target.result);
                    dashboardManager.loadConfigurationFromObject(config);
                    dashboardManager.showToast('Настройки импортированы!', 'success');
                } catch {
                    dashboardManager.showToast('Ошибка импорта файла', 'error');
                }
            };
            reader.readAsText(files[0]);
        }
    });
});