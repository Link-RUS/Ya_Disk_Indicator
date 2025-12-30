import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import { SystemIndicator } from 'resource:///org/gnome/shell/ui/quickSettings.js';

// Карта статусов и соответствующих им иконок
const STATUS_ICON_MAP = {
    'idle': 'YandexDisk.svg',
    'busy': 'YandexDisk-sync.svg',
    'index': 'YandexDisk-sync.svg',
    'Error': 'YandexDisk-error.svg',
    'paused': 'YandexDisk-error.svg',
    'no internet access': 'YandexDisk-offline.svg',
};

export const Indicator = GObject.registerClass({
    GTypeName: 'Indicator',
    Properties: {},
    Signals: {},
}, class Indicator extends SystemIndicator {

    _init(extension) {
        super._init({
            visible: true,
        });

        this.extension = extension;
        this._indicator = this._addIndicator();
        this._indicator.gicon = this._getIconForStatus('idle'); // Начальная иконка
    }

    /**
     * Получает иконку в зависимости от статуса
     * @param {string} status - Статус для которого нужно получить иконку
     * @returns {Gio.FileIcon} Иконка соответствующая статусу
     */
    _getIconForStatus(status) {
        // Получаем имя иконки из карты статусов или используем иконку по умолчанию
        const iconName = STATUS_ICON_MAP[status] || 'YandexDisk.svg';
        
        // Формируем полный путь к иконке
        const iconPath = `${this.extension.path}/icons/${iconName}`;
        
        // Проверяем существование файла иконки
        const file = Gio.File.new_for_path(iconPath);
        if (!file.query_exists(null)) {
            console.warn(`Icon file not found: ${iconPath}`);
            // Возвращаем иконку по умолчанию если файл не найден
            return Gio.FileIcon.new(Gio.File.new_for_path(`${this.extension.path}/icons/YandexDisk.svg`));
        }
        
        return Gio.FileIcon.new(file);
    }

    /**
     * Обновляет иконку индикатора в соответствии со статусом
     * @param {string} status - Новый статус для отображения
     */
    updateIcon(status) {
        this._indicator.gicon = this._getIconForStatus(status);
    }

});