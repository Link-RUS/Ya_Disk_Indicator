import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import { NotificationGenericPolicy } from 'resource:///org/gnome/shell/ui/messageTray.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export const Notification = GObject.registerClass(
class Notification extends GObject.Object {
    _init(title, extension) {
        this._title = title;
        this._extension = extension;
        this._source = null;
        this._notification = null;
    }

    newMessage(body) {
        const source = this._getSource();
        this._notification = new MessageTray.Notification({
            source,
            title: this._title,
            body,
            gicon: Gio.FileIcon.new(Gio.File.new_for_path(
                this._extension.path + '/icons/YandexDisk.svg'
            )),
            urgency: MessageTray.Urgency.NORMAL,
        });
        source.addNotification(this._notification);
    }

    _getSource() {
        if (!this._source) {
            const policy = new NotificationGenericPolicy();
            this._source = new MessageTray.Source({
                title: _('Индикатор Яндекс.Диск'),
                icon: new Gio.ThemedIcon({ name: 'dialog-information' }),
                policy,
            });
            this._source.connect('destroy', () => this._source = null);
            Main.messageTray.add(this._source);
        }
        return this._source;
    }
});