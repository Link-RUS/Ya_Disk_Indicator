import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { panel } from "resource:///org/gnome/shell/ui/main.js";
import { DiskToggle } from "./lib/toggle.js";
import { Indicator } from "./lib/indicator.js";

export default class YandexDiskIndicator extends Extension {
    enable() {
        this.toggle = new DiskToggle(this);
        this.toggleIndicator = new Indicator(this);

        // Подключаем обработчик изменения статуса
        this._statusChangedId = this.toggle.connect('status-changed', (_, status) => {
            this.toggleIndicator.updateIcon(status);
        });

        this.toggleIndicator.quickSettingsItems.push(this.toggle);
        panel.statusArea.quickSettings.addExternalIndicator(this.toggleIndicator);
    }

    disable() {
        if (this._statusChangedId) {
            this.toggle.disconnect(this._statusChangedId);
            this._statusChangedId = null;
        }
        this.toggleIndicator.quickSettingsItems.forEach((item) => item.destroy());
        this.toggleIndicator.destroy();
        this.toggleIndicator = null;
        this.toggle = null;
    }
}
