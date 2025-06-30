import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import { SystemIndicator } from 'resource:///org/gnome/shell/ui/quickSettings.js';

export const Indicator = GObject.registerClass({
    GTypeName: 'Indicator',
    Properties: {},
    Signals: {},
}, class Indicator extends SystemIndicator {

    _init(extension){
        super._init({
            visible: true,
        });

        this.extension = extension;
        this._indicator = this._addIndicator();
        this._indicator.gicon = this._getIconForStatus('idle'); // Начальная иконка
    }

    // Метод для получения иконки в зависимости от статуса
    _getIconForStatus(status) {
        let iconName;
        
        switch(status) {
            case 'idle':
                iconName = 'YandexDisk.svg';
                break;
            case 'busy':
            case 'index':
                iconName = 'YandexDisk-sync.svg'; // Иконка синхронизации
                break;
            case 'Error':
            case 'paused':
                iconName = 'YandexDisk-error.svg'; // Иконка ошибки/паузы
                break;
            case 'no internet access':
                iconName = 'YandexDisk-offline.svg'; // Иконка офлайн
                break;
            default:
                iconName = 'YandexDisk.svg';
        }
        
        return Gio.FileIcon.new(Gio.File.new_for_path(this.extension.path + '/icons/' + iconName));
    }

    // Метод для обновления иконки
    updateIcon(status) {
        this._indicator.gicon = this._getIconForStatus(status);
    }

});