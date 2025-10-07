const STORAGE_KEY = 'conectadata:calendar-events';

const isLocalStorageAvailable = () => {
  try {
    const storage = window.localStorage;
    const testKey = '__calendar_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('LocalStorage no disponible. Se usará almacenamiento en memoria.', error);
    return false;
  }
};

class EventRepository {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.inMemory = [];
    this.useLocalStorage = isLocalStorageAvailable();
    this.events = this.load();
  }

  load() {
    if (!this.useLocalStorage) {
      return this.inMemory.slice();
    }

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (error) {
      console.error('No fue posible leer los eventos guardados', error);
      return [];
    }
  }

  persist() {
    if (this.useLocalStorage) {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.events));
    } else {
      this.inMemory = this.events.slice();
    }
  }

  getAll() {
    return this.events.slice();
  }

  upsert(event) {
    const existingIndex = this.events.findIndex((item) => item.id === event.id);
    if (existingIndex >= 0) {
      this.events.splice(existingIndex, 1, { ...event });
    } else {
      this.events.push({ ...event });
    }
    this.persist();
    return event;
  }

  delete(id) {
    this.events = this.events.filter((event) => event.id !== id);
    this.persist();
  }
}

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthName = (date) => {
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
};

const getWeekdayNames = () => {
  const baseDate = new Date(Date.UTC(2021, 5, 7));
  const formatter = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const nextDate = new Date(baseDate);
    nextDate.setUTCDate(baseDate.getUTCDate() + i);
    days.push(formatter.format(nextDate).replace('.', ''));
  }
  return days;
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

class CalendarApp {
  constructor(rootElement, repository) {
    this.root = rootElement;
    this.repository = repository;
    this.state = {
      events: repository.getAll(),
      currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      selectedDate: new Date(),
      editingEventId: null,
    };

    this.elements = {
      monthLabel: this.root.querySelector('[data-role="current-month"]'),
      grid: this.root.querySelector('[data-role="calendar-grid"]'),
      weekdayRow: this.root.querySelector('[data-role="weekday-row"]'),
      selectedDateLabel: this.root.querySelector('[data-role="selected-date"]'),
      eventList: this.root.querySelector('[data-role="event-list"]'),
      emptyState: this.root.querySelector('[data-role="empty-state"]'),
      openFormButton: this.root.querySelector('[data-action="open-form"]'),
      prevButton: this.root.querySelector('[data-action="prev-month"]'),
      nextButton: this.root.querySelector('[data-action="next-month"]'),
    };

    this.modal = document.querySelector('#event-modal');
    this.modalOverlay = document.querySelector('[data-role="modal-overlay"]');
    this.eventForm = document.querySelector('#event-form');
    this.deleteButton = document.querySelector('[data-action="delete-event"]');
    this.cancelButtons = Array.from(document.querySelectorAll('[data-action="close-modal"]'));

    this.bindEvents();
    this.renderWeekdays();
    this.render();
  }

  bindEvents() {
    this.elements.prevButton.addEventListener('click', () => {
      this.changeMonth(-1);
    });

    this.elements.nextButton.addEventListener('click', () => {
      this.changeMonth(1);
    });

    this.elements.grid.addEventListener('click', (event) => {
      const dayButton = event.target.closest('[data-date]');
      if (dayButton) {
        const targetDate = new Date(dayButton.dataset.date);
        this.state.selectedDate = targetDate;
        this.state.currentMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        this.render();
      }
    });

    this.elements.openFormButton.addEventListener('click', () => {
      this.openModal({ date: formatDateKey(this.state.selectedDate) });
    });

    this.elements.eventList.addEventListener('click', (event) => {
      const item = event.target.closest('[data-event-id]');
      if (!item) {
        return;
      }
      const eventId = item.dataset.eventId;
      const existing = this.state.events.find((evt) => evt.id === eventId);
      if (existing) {
        this.openModal(existing);
      }
    });

    this.eventForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(this.eventForm);
      const payload = {
        id: formData.get('eventId') || generateId(),
        title: formData.get('title').trim(),
        date: formData.get('date'),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        description: formData.get('description').trim(),
      };

      if (!payload.title || !payload.date) {
        alert('Por favor, indica al menos un título y la fecha del evento.');
        return;
      }

      if (payload.startTime && payload.endTime && payload.startTime > payload.endTime) {
        alert('La hora de inicio no puede ser posterior a la hora de término.');
        return;
      }

      this.repository.upsert(payload);
      this.state.events = this.repository.getAll();
      this.state.selectedDate = new Date(payload.date);
      this.state.currentMonth = new Date(this.state.selectedDate.getFullYear(), this.state.selectedDate.getMonth(), 1);
      this.closeModal();
      this.render();
    });

    this.deleteButton.addEventListener('click', () => {
      const eventId = this.eventForm.querySelector('[name="eventId"]').value;
      if (!eventId) {
        return;
      }

      const confirmation = window.confirm('¿Eliminar este evento?');
      if (!confirmation) {
        return;
      }
      this.repository.delete(eventId);
      this.state.events = this.repository.getAll();
      this.closeModal();
      this.render();
    });

    const closeModalHandler = () => this.closeModal();
    this.cancelButtons.forEach((button) => button.addEventListener('click', closeModalHandler));
    this.modalOverlay.addEventListener('click', closeModalHandler);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.modal.hasAttribute('hidden')) {
        this.closeModal();
      }
    });
  }

  changeMonth(offset) {
    const current = this.state.currentMonth;
    const newDate = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    this.state.currentMonth = newDate;
    this.state.selectedDate = new Date(newDate.getFullYear(), newDate.getMonth(), Math.min(this.state.selectedDate.getDate(), 28));
    this.render();
  }

  renderWeekdays() {
    const weekdays = getWeekdayNames();
    this.elements.weekdayRow.innerHTML = '';
    weekdays.forEach((day) => {
      const cell = document.createElement('div');
      cell.textContent = day;
      cell.classList.add('calendar-weekday');
      this.elements.weekdayRow.appendChild(cell);
    });
  }

  render() {
    this.renderHeader();
    this.renderGrid();
    this.renderEventList();
  }

  renderHeader() {
    this.elements.monthLabel.textContent = getMonthName(this.state.currentMonth);
    this.elements.selectedDateLabel.textContent = this.state.selectedDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  renderGrid() {
    const { currentMonth, events, selectedDate } = this.state;
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const firstWeekdayIndex = (firstDay.getDay() + 6) % 7; // Convertir a semana iniciando lunes
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

    const cells = [];
    for (let cellIndex = 0; cellIndex < 42; cellIndex += 1) {
      const dayNumber = cellIndex - firstWeekdayIndex + 1;
      const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
      const isCurrentMonth = cellDate.getMonth() === currentMonth.getMonth();
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.dataset.date = formatDateKey(cellDate);
      cell.className = 'calendar-cell';

      const label = document.createElement('span');
      label.textContent = cellDate.getDate();
      label.classList.add('calendar-cell__day');
      cell.appendChild(label);

      const dateKey = formatDateKey(cellDate);
      const eventsForDay = events.filter((event) => event.date === dateKey);

      if (!isCurrentMonth) {
        cell.classList.add('is-outside');
      }

      const today = new Date();
      if (formatDateKey(cellDate) === formatDateKey(today)) {
        cell.classList.add('is-today');
      }

      if (formatDateKey(cellDate) === formatDateKey(selectedDate)) {
        cell.classList.add('is-selected');
      }

      if (eventsForDay.length > 0) {
        const indicator = document.createElement('span');
        indicator.classList.add('calendar-cell__indicator');
        indicator.textContent = eventsForDay.length;
        cell.appendChild(indicator);
      }

      cells.push(cell);
    }

    this.elements.grid.innerHTML = '';
    cells.forEach((cell) => this.elements.grid.appendChild(cell));
  }

  renderEventList() {
    const selectedKey = formatDateKey(this.state.selectedDate);
    const eventsForDay = this.state.events
      .filter((event) => event.date === selectedKey)
      .sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });

    this.elements.eventList.innerHTML = '';

    if (eventsForDay.length === 0) {
      this.elements.emptyState.hidden = false;
      return;
    }

    this.elements.emptyState.hidden = true;

    eventsForDay.forEach((event) => {
      const item = document.createElement('li');
      item.classList.add('event-item');
      item.dataset.eventId = event.id;

      const title = document.createElement('div');
      title.classList.add('event-item__title');
      title.textContent = event.title;

      const time = document.createElement('div');
      time.classList.add('event-item__time');
      if (event.startTime) {
        const end = event.endTime ? ` – ${event.endTime}` : '';
        time.textContent = `${event.startTime}${end}`;
      } else {
        time.textContent = 'Horario sin definir';
      }

      const description = document.createElement('p');
      description.classList.add('event-item__description');
      description.textContent = event.description || 'Sin descripción adicional';

      item.appendChild(title);
      item.appendChild(time);
      item.appendChild(description);
      this.elements.eventList.appendChild(item);
    });
  }

  openModal(event = {}) {
    this.eventForm.reset();
    this.modal.removeAttribute('hidden');
    this.modalOverlay.removeAttribute('hidden');

    this.eventForm.querySelector('[name="eventId"]').value = event.id || '';
    this.eventForm.querySelector('[name="title"]').value = event.title || '';
    this.eventForm.querySelector('[name="date"]').value = event.date || formatDateKey(this.state.selectedDate);
    this.eventForm.querySelector('[name="startTime"]').value = event.startTime || '';
    this.eventForm.querySelector('[name="endTime"]').value = event.endTime || '';
    this.eventForm.querySelector('[name="description"]').value = event.description || '';

    if (event.id) {
      this.deleteButton.removeAttribute('hidden');
    } else {
      this.deleteButton.setAttribute('hidden', '');
    }

    const titleElement = this.modal.querySelector('[data-role="modal-title"]');
    titleElement.textContent = event.id ? 'Editar evento' : 'Nuevo evento';
    this.eventForm.querySelector('[name="title"]').focus();
  }

  closeModal() {
    this.modal.setAttribute('hidden', '');
    this.modalOverlay.setAttribute('hidden', '');
    this.eventForm.reset();
  }
}

const initializeCalendar = () => {
  const root = document.querySelector('[data-calendar-app]');
  if (!root) {
    return;
  }
  const repository = new EventRepository(STORAGE_KEY);
  // Sincronización remota podría integrarse aquí en el futuro.
  new CalendarApp(root, repository); // eslint-disable-line no-new
};

document.addEventListener('DOMContentLoaded', initializeCalendar);
