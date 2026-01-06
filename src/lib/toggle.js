import GObject from 'gi://GObject';
import GLib from 'gi://GLib?version=2.0';
import Gio from 'gi://Gio';
import { QuickMenuToggle } from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { PopupImageMenuItem, PopupSubMenuMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import { Notification } from './notification.js';

import { YDDaemon, YDStatusParser, YDStatusMonitor } from './ydinfo.js';

/**
 * Класс переключателя Яндекс.Диска для панели быстрых настроек GNOME Shell
 * @extends QuickMenuToggle
 */
export const DiskToggle = GObject.registerClass({
    GTypeName: 'DiskToggle',
    Signals: { 'status-changed': { param_types: [GObject.TYPE_STRING] } },
}, class DiskToggle extends QuickMenuToggle {
    /**
     * Инициализация переключателя Яндекс.Диска
     * @param {Extension} extension - Объект расширения
     */
    _init(extension) {
        super._init({
            title: _('Яндекс.Диск'),
            subtitle: '',
            iconName: '',
            toggleMode: false,
        });

        this.extension = extension;
        this._status = '';
        this._lastStatus = '';

        this._daemon = new YDDaemon();
        this._parser = new YDStatusParser();
        this._monitor = null;

        this.notification = new Notification(_('Яндекс.Диск'), extension);
        this.gicon = this._getIcon('YandexDisk.svg');

        // Проверка установки
        if (!this._isYDInstalled()) {
            this.subtitle = _('Не установлен Яндекс.Диск');
            this.notification.newMessage(_('Не установлен Яндекс.Диск'));
            return;
        }

        this.menu.setHeader(this.gicon, _('ЯНДЕКС.ДИСК'));

        this.toggleSyncMenuItem = new PopupImageMenuItem(
            _('Остановить Яндекс.Диск'),
            'media-playback-stop'
        );
        this.toggleSyncMenuItem.connect('activate', () => this._toggleSync());
        this.menu.addMenuItem(this.toggleSyncMenuItem);

        this.infoUsed = this._addInfoItem('');
        this.infoAvailable = this._addInfoItem('');
        this.infoTrash = this._addInfoItem('');

        this.openBrowserMenuItem = new PopupImageMenuItem(
            _('Открыть Яндекс.Диск в браузере'),
            'folder-remote-symbolic'
        );
        this.openBrowserMenuItem.connect('activate', () => this.openBrowser());

        this.openFolderMenuItem = new PopupImageMenuItem(
            _('Открыть каталог Яндекс.Диска'),
            'folder'
        );
        this.openFolderMenuItem.connect('activate', () => this.openFolder());

        this.menuLastSync = new PopupSubMenuMenuItem(_('Последние синхронизированные'), true);
        this.menu.addMenuItem(this.openBrowserMenuItem);
        this.menu.addMenuItem(this.openFolderMenuItem);
        this.menu.addMenuItem(this.menuLastSync);

        // Запуск мониторинга
        this._startMonitoring();
    }

    /**
     * Добавляет информационный элемент в меню
     * @param {string} text - Текст для отображения
     * @returns {PopupMenu.PopupMenuItem} Созданный элемент меню
     */
    _addInfoItem(text) {
        const item = new PopupMenu.PopupMenuItem(text);
        item.setSensitive(false);
        this.menu.addMenuItem(item);
        return item;
    }

    _isYDInstalled() {
        try {
            const [success, stdout, stderr, exitCode] = GLib.spawn_command_line_sync('sh -c "command -v yandex-disk"');
            if (!success || exitCode !== 0) {
                console.warn('Yandex.Disk is not installed or not in PATH');
                return false;
            }
            return true;
        } catch (e) {
            console.error('Error checking Yandex.Disk installation:', e);
            return false;
        }
    }

    /**
     * Запускает мониторинг статуса Яндекс.Диска
     * @private
     */
    _startMonitoring() {
        this._monitor = new YDStatusMonitor(this._parser, '');
        
        // Передаем настройки в монитор
        const settings = this.extension.getSettings();
        this._monitor.setSettings(settings);
        
        this._monitor.connectStatusChanged((status) => {
            if (!this._monitor._logPath && status.folder) {
                this._monitor._logPath = GLib.build_filenamev([status.folder, '.sync', 'cli.log']);
            }
            this._updateUI(status);
        });
        this._monitor.start();
    }

    /**
     * Обновляет пользовательский интерфейс в соответствии со статусом
     * @param {Object} status - Объект статуса Яндекс.Диска
     * @private
     */
    _updateUI(status) {
        const { status: current, error, sync_progress, total, used, available, trash, synchronized_files } = status;

        this._status = current;

        const isRunning = current !== 'Error' && current !== 'no internet access' && current !== 'paused';
        this.checked = isRunning;
        this.subtitle = this._getSubtitle(current, error, sync_progress);

        this.infoUsed.label.text = _('Использовано {used} из {total}')
            .replace('{used}', used)
            .replace('{total}', total);
        this.infoAvailable.label.text = _('Доступно ') + available;
        this.infoTrash.label.text = _('Корзина ') + trash;

        this._updateSyncMenuItem(isRunning);
        this._createLastSyncMenu(synchronized_files);

        this.emit('status-changed', current);

        const settings = this.extension.getSettings();
        const showNotification = settings.get_boolean("show-sync-complete-notification");
        
        if (showNotification && 
            (this._lastStatus === 'busy' || this._lastStatus === 'index') && 
            current === 'idle') {
            this.notification.newMessage(_('Синхронизация завершена'));
        }
        this._lastStatus = this._status;
    }

    _getSubtitle(status, error, progress) {
        const map = {
            idle: _('Синхронизировано'),
            'no internet access': _('Нет интернета'),
            Error: error || _('Ошибка'),
            paused: _('Пауза'),
            busy: progress,
            index: progress,
        };
        return map[status] || status;
    }

    _updateSyncMenuItem(isRunning) {
        this.toggleSyncMenuItem.label.text = isRunning
            ? _('Остановить Яндекс.Диск')
            : _('Запустить Яндекс.Диск');
        this.toggleSyncMenuItem.setIcon(isRunning
            ? 'media-playback-stop'
            : 'media-playback-start');
    }

    _toggleSync() {
        const isRunning = this.checked;
        try {
            this._daemon[isRunning ? 'stop' : 'start']();
        } catch (e) {
            console.error(`Failed to ${isRunning ? 'stop' : 'start'} Yandex.Disk:`, e);
            this.notification.newMessage(_('Ошибка при управлении Яндекс.Диском'));
        }
        // UI обновится по сигналу из мониторинга
    }

    _createLastSyncMenu(files) {
        this.menuLastSync.menu.removeAll();
        
        if (!files || files.length === 0) {
            const emptyItem = new PopupMenu.PopupMenuItem(_('Нет синхронизированных файлов'));
            emptyItem.setSensitive(false);
            this.menuLastSync.menu.addMenuItem(emptyItem);
            return;
        }
        
        for (const file of files) {
            const icon = file.type === 'directory' ? 'folder' : 'document-symbolic';
            const item = new PopupImageMenuItem(file.name, icon);
            const basePath = this._monitor?._logPath?.replace('/.sync/cli.log', '');
            
            if (!basePath) {
                console.warn('Base path is not available for opening files');
                continue;
            }
            
            const path = basePath + '/' + file.name;
            item.connect('activate', () => {
                try {
                    GLib.spawn_command_line_async(`xdg-open ${GLib.shell_quote(path)}`);
                } catch (e) {
                    console.error(`Failed to open file ${path}:`, e);
                    this.notification.newMessage(_('Не удалось открыть файл'));
                }
            });
            this.menuLastSync.menu.addMenuItem(item);
        }
    }

    // Получаем иконку
    _getIcon(iconName) {
        const iconPath = `${this.extension.path}/icons/${iconName}`;
        const file = Gio.File.new_for_path(iconPath);
        
        // Проверяем существование файла иконки
        if (!file.query_exists(null)) {
            console.warn(`Icon file not found: ${iconPath}`);
            // Возвращаем иконку по умолчанию если файл не найден
            return Gio.FileIcon.new(Gio.File.new_for_path(
                `${this.extension.path}/icons/YandexDisk.svg`
            ));
        }
        
        return Gio.FileIcon.new(file);
    }

    openBrowser() {
        try {
            GLib.spawn_command_line_async('xdg-open https://disk.yandex.ru');
        } catch (e) {
            console.error('Failed to open Yandex.Disk in browser:', e);
            this.notification.newMessage(_('Не удалось открыть Яндекс.Диск в браузере'));
        }
    }

    openFolder() {
        const folder = this._monitor?._logPath?.replace('/.sync/cli.log', '');
        if (folder) {
            try {
                GLib.spawn_command_line_async(`xdg-open ${GLib.shell_quote(folder)}`);
            } catch (e) {
                console.error(`Failed to open folder ${folder}:`, e);
                this.notification.newMessage(_('Не удалось открыть каталог Яндекс.Диска'));
            }
        } else {
            console.warn('Folder path is not available');
            this.notification.newMessage(_('Каталог Яндекс.Диска не найден'));
        }
    }

    /**
     * Освобождает ресурсы при уничтожении объекта
     */
    destroy() {
        if (this._monitor) {
            this._monitor.stop();
        }
        super.destroy();
    }
});