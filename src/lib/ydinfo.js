const { GLib, GObject, Gio } = imports.gi;

const YD_COMMAND = 'yandex-disk';
const STATUS_CMD = `LC_ALL=C.UTF-8 ${YD_COMMAND} status`;
const SYNC_CMD = `${YD_COMMAND} sync`;
const START_CMD = `${YD_COMMAND} start`;
const STOP_CMD = `${YD_COMMAND} stop`;

/**
 * Класс для управления демоном Яндекс.Диска
 */
export const YDDaemon = class {
    constructor() {
        this._isRunning = false;
    }

    /**
     * Запускает демон Яндекс.Диска
     */
    start() {
        this._spawnAsync(START_CMD);
        this._isRunning = true;
    }

    /**
     * Останавливает демон Яндекс.Диска
     */
    stop() {
        this._spawnAsync(STOP_CMD);
        this._isRunning = false;
    }

    /**
     * Принудительно синхронизирует Яндекс.Диск
     */
    sync() {
        this._spawnAsync(SYNC_CMD);
    }

    /**
     * Асинхронно выполняет команду
     * @param {string} args - Команда для выполнения
     */
    _spawnAsync(args) {
        try {
            const success = GLib.spawn_command_line_async(args);
            if (!success) {
                console.error('Failed to execute command:', args);
            }
        } catch (e) {
            console.error('Exception while executing command:', args, e);
        }
    }

    /**
     * Проверяет, запущен ли демон
     * @returns {boolean} - true если демон запущен, иначе false
     */
    isRunning() {
        return this._isRunning;
    }
};

/**
 * Класс для парсинга статуса Яндекс.Диска
 */
export const YDStatusParser = class {
    /**
     * Парсит вывод статуса Яндекс.Диска
     * @param {string} statusOutput - Вывод команды статуса
     * @returns {Object} - Объект со статусом и информацией о диске
     */
    parse(statusOutput) {
        const result = {
            status: '',
            error: '',
            sync_progress: '',
            folder: '',
            total: '',
            used: '',
            available: '',
            trash: '',
            synchronized_files: [],
        };

        const lines = statusOutput.split('\n');

        for (const line of lines) {
            if (line.includes('status:')) {
                result.status = line.split(':')[1].trim();
            } else if (line.includes('Error:')) {
                result.status = 'Error';
                result.error = line.split(':')[1].trim();
            } else if (line.startsWith('Sync progress:')) {
                result.sync_progress = line.split(':')[1].trim();
            } else if (line.startsWith('Path to Yandex.Disk directory:')) {
                result.folder = line.split(':')[1].trim().slice(1, -1);
            } else if (line.startsWith('\tTotal:')) {
                result.total = line.split(':')[1].trim();
            } else if (line.startsWith('\tUsed:')) {
                result.used = line.split(':')[1].trim();
            } else if (line.startsWith('\tAvailable:')) {
                result.available = line.split(':')[1].trim();
            } else if (line.startsWith('\tTrash size:')) {
                result.trash = line.split(':')[1].trim();
            } else if (line.match(/^(?:\t)*file: '(.+)'$/)) {
                const match = line.match(/'([^']+)'/);
                if (match) result.synchronized_files.push({name: match[1], type: 'file'});
            } else if (line.match(/^(?:\t)*directory: '(.+)'$/)) {
                const match = line.match(/'([^']+)'/);
                if (match) result.synchronized_files.push({name: match[1], type: 'directory'});
            }
        }

        return result;
    }
};

/**
 * Класс для мониторинга статуса Яндекс.Диска
 */
export const YDStatusMonitor = class {
    /**
     * Конструктор монитора статуса
     * @param {YDStatusParser} parser - Парсер статуса
     * @param {string} logPath - Путь к лог-файлу
     */
    constructor(parser, logPath) {
        this._parser = parser;
        this._logPath = logPath;
        this._monitor = null;
        this._timeoutId = 0;
        this._onStatusChanged = null;
        this._currentPollInterval = 60; // по умолчанию — раз в минуту
    }

    /**
     * Подключает обработчик изменения статуса
     * @param {Function} callback - Функция обратного вызова
     */
    connectStatusChanged(callback) {
        this._onStatusChanged = callback;
    }

    /**
     * Запускает мониторинг статуса
     */
    start() {
        this._startLogMonitoring();
        this._pollStatus(); // начальный опрос
    }

    /**
     * Начинает мониторинг лог-файла
     * @private
     */
    _startLogMonitoring() {
        const file = Gio.File.new_for_path(this._logPath);
        if (!file.query_exists(null)) {
            console.warn('Log file not found:', this._logPath);
            return;
        }

        try {
            this._monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
            this._monitor.connect('changed', (m, f, other, eventType) => {
                // ❌ Не запускаем _pollStatus, если и так опрашиваем каждую секунду
                if (this._currentPollInterval > 1) {
                    if (
                        eventType === Gio.FileMonitorEvent.CHANGED ||
                        eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT
                    ) {
                        this._pollStatus();
                    }
                }
            });
        } catch (e) {
            console.error('Failed to monitor log file:', e);
        }
    }

    /**
     * Опрашивает статус Яндекс.Диска
     * @private
     */
    _pollStatus() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        try {         
            const [success, stdout, stderr, exitCode] = GLib.spawn_command_line_sync(
                `sh -c "${STATUS_CMD}"`
            );

            if (success) {
                const output = new TextDecoder().decode(stdout);
                const status = this._parser.parse(output);

                // Сохраняем путь к папке, если ещё не знаем
                if (!this._logPath && status.folder) {
                    this._logPath = GLib.build_filenamev([status.folder, '.sync', 'cli.log']);
                    this._startLogMonitoring(); // перезапускаем монитор с новым путём
                }

                // Определяем интервал
                const isBusy = status.status === 'busy' || status.status === 'index';
                this._currentPollInterval = isBusy ? 1 : 60;

                if (this._onStatusChanged) {
                    this._onStatusChanged(status);
                }
            } else {
                console.error('Failed to get Yandex.Disk status:', new TextDecoder().decode(stderr));
                this._currentPollInterval = 60; // fallback
            }
        } catch (e) {
            console.error('Exception while getting Yandex.Disk status:', e);
            this._currentPollInterval = 60; // fallback
        }

        // 🔁 Устанавливаем следующий таймер с актуальным интервалом
        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            this._currentPollInterval,
            () => {
                this._pollStatus();
                return false; // будет установлен заново
            }
        );
    }

    /**
     * Останавливает мониторинг статуса
     */
    stop() {
        if (this._monitor) {
            this._monitor.cancel();
            this._monitor = null;
        }
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
    }
};