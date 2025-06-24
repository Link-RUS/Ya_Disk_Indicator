import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import { NotificationGenericPolicy } from 'resource:///org/gnome/shell/ui/messageTray.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export const Notification = GObject.registerClass({
}, class Notification extends GObject.Object {
    _init(title, extension) {
        this.extension = extension;
        this.title = title;
        this.body = '';
        this.notificationSource = null;
        this.notification = null;
    }

    newMessage(body) {
        this.source = this.getNotificationSource();
        this.notification = new MessageTray.Notification({
            source: this.source,
            title: this.title,
            body: this.body,
            gicon: Gio.FileIcon.new(Gio.File.new_for_path(this.extension.path + '/icons/YandexDisk.svg')),
            urgency: MessageTray.Urgency.NORMAL,
        });
        //this.source = this.getNotificationSource();
        this.body = body;
        this.notification.body = this.body;
        this.showNotification();
    }

    showNotification() {
        this.source.addNotification(this.notification);
    }

    getNotificationSource() {
        if (!this.notificationSource) {
            const notificationPolicy = new NotificationGenericPolicy();
    
            this.notificationSource = new MessageTray.Source({
                // The source name (e.g. application name)
                title: _('Индикатор Яндекс.Диск'),
                // An icon for the source, used a fallback by notifications
                icon: new Gio.ThemedIcon({name: 'dialog-information'}),
                // Same as `icon`, but takes a themed icon name
                iconName: 'dialog-information',
                // The notification policy
                policy: notificationPolicy,
            });
    
            // Reset the notification source if it's destroyed
            this.notificationSource.connect('destroy', _source => {
                this.notificationSource = null;
            });
            Main.messageTray.add(this.notificationSource);
        }
        return this.notificationSource;
    }
});