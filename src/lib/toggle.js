import GObject from 'gi://GObject';
import GLib from 'gi://GLib?version=2.0';
import Gio from 'gi://Gio';
import { QuickMenuToggle } from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { PopupImageMenuItem, PopupSubMenuMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import { YDInfo } from './ydinfo.js';
import { Notification } from './notification.js';

export const DiskToggle = GObject.registerClass({
    GTypeName: 'DiskToggle',
    Signals: {
        'state-updated': {
            param_types: [GObject.TYPE_INT],
        },
    },
}, class DiskToggle extends QuickMenuToggle {
        
    _init(extension) {
        super._init({
            title: _('Яндекс.Диск'),
            subtitle: '',
            iconName: '',
            toggleMode: false,
        });

        this.extension = extension;
        this.status = '';
        this.laststatus = '';

        this.yd = new YDInfo();
        const result = this.yd.init();

        this.notification = new Notification(_('Яндекс.Диск'), extension);

        if (!result) {
            this.subtitle = _('Не установлен Яндекс.Диск');
            this.notification.newMessage(_('Не установлен Яндекс.Диск'));
            return;
        }

        this.gicon = this._getIcon('YandexDisk.svg');

        this.menu.setHeader(this._getIcon('YandexDisk.svg'), _('ЯНДЕКС.ДИСК'));

        this.toggleSyncMenuItem = new PopupImageMenuItem(_('Остановить Яндекс.Диск'), 'media-playback-stop');
        this.toggleSyncMenuItem.connect('activate', () => this.toggleSync());
        this.menu.addMenuItem(this.toggleSyncMenuItem);

        this.infoUsed = new PopupMenu.PopupMenuItem('');
        this.infoAvailable = new PopupMenu.PopupMenuItem('');
        this.infoTrash = new PopupMenu.PopupMenuItem('');
        this.infoUsed.setSensitive(false);
        this.infoAvailable.setSensitive(false);
        this.infoTrash.setSensitive(false);
        this.menu.addMenuItem(this.infoUsed);
        this.menu.addMenuItem(this.infoAvailable);
        this.menu.addMenuItem(this.infoTrash);

        this.openBrowserMenuItem = new PopupImageMenuItem(_('Открыть Яндекс.Диск в браузере'), 'folder-remote-symbolic');
        this.openBrowserMenuItem.connect('activate', () => this.openBrowser());
        this.openFolderMenuItem = new PopupImageMenuItem(_('Открыть каталог Яндекс.Диска'), 'folder');
        this.openFolderMenuItem.connect('activate', () => this.openFolder());

        this.menuLastSync = new PopupSubMenuMenuItem(_('Последние синхронизированные'), true);

        this.menu.addMenuItem(this.openBrowserMenuItem);
        this.menu.addMenuItem(this.openFolderMenuItem);
        this.menu.addMenuItem(this.menuLastSync);
        this._createLastSyncMenu(this.menuLastSync.menu);
        
        this.subtitle = this.yd.status;
        this._switchToggle(this.yd.status);

        this._statusChangedId = this.yd.connect('status-changed', (_, status) => {
            this._createLastSyncMenu(this.menuLastSync.menu);
            this._switchToggle(status);
        });
    }

    toggleSync() {
        const isPaused = this.status === 'Error';
        this.yd[isPaused ? 'start' : 'stop']();
        this.updateSyncMenuItemLabel(this.status);
    }
    
    updateSyncMenuItemLabel(status) {
        const isPaused = status === 'Error';
        this.toggleSyncMenuItem.label.text = isPaused 
            ? _('Запустить Яндекс.Диск') 
            : _('Остановить Яндекс.Диск');
        this.toggleSyncMenuItem.setIcon(isPaused 
            ? 'media-playback-start' 
            : 'media-playback-stop');
    }

    // Обновляем состояние
    _switchToggle(status) {
    const statusMap = {
        'no internet access': { subtitle: status, checked: false },
        'idle': { subtitle: _('Синхронизировано'), checked: true },
        'Error': { subtitle: this.yd.error, checked: false },
        'paused': { subtitle: _('Пауза'), checked: false },
        'busy': { subtitle: this.yd.sync_progress, checked: true },
        'index': { subtitle: this.yd.sync_progress, checked: true },
    };

    if (statusMap[status]) {
        this.status = status;
        this.subtitle = statusMap[status].subtitle;
        this.checked = statusMap[status].checked;
    }

    if ((this.laststatus === 'busy' || this.laststatus === 'index') && status === 'idle') {
        this.notification.newMessage(_('Синхронизация завершена'));
        this.checked = true;
    }

    this.laststatus = status;

    this.infoUsed.label.text = _('Использовано {used} из {total}').replace('{used}', this.yd.used).replace('{total}', this.yd.total);
    this.infoAvailable.label.text = _('Доступно ') + this.yd.available;
    this.infoTrash.label.text = _('Корзина ') + this.yd.trash;

    // Обновляем текст пункта меню в зависимости от статуса
    this.updateSyncMenuItemLabel(status);
    }

    // Обновляем меню
    _createLastSyncMenu(menu) {
        menu.removeAll();
        for (const file of this.yd.synchronized_files) {
            const item = new PopupImageMenuItem(file, 'document-symbolic');
            const path = this.yd.folder + '/' + file;
            item.connect('activate', () => GLib.spawn_command_line_async(`xdg-open ${GLib.shell_quote(path)}`));
            menu.addMenuItem(item);
        }
    }

    // Получаем иконку
    _getIcon(iconName) {
        return Gio.FileIcon.new(Gio.File.new_for_path(this.extension.path + '/icons/' + iconName));
    }

    // Открываем Яндекс.Диск
    openBrowser() {
        GLib.spawn_command_line_async('xdg-open https://disk.yandex.ru');
    }

    // Открываем каталог
    openFolder() {
        GLib.spawn_command_line_async('xdg-open ' + this.yd.folder);
    }

    // Уничтожаем экземпляр класса
    destroy() {   
        // Отключаем сигнал 'status-changed'
        if (this._statusChangedId) {
            this.yd.disconnect(this._statusChangedId);
            this._statusChangedId = null;
        }

        // Уничтожаем экземпляр YDInfo
        this.yd.destroy();
        this.yd = null;

        // Явно удаляем элементы меню
        this.menu.removeAll();

        // Вызываем destroy() родительского класса
        super.destroy();
    }
});