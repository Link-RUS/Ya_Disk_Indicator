import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { panel } from "resource:///org/gnome/shell/ui/main.js";
import { DiskToggle } from "./lib/toggle.js";
import { Indicator } from "./lib/indicator.js";

export default class YandexDiskIndicator extends Extension {
    enable() {
        this.toggle = new DiskToggle(this);
        this.toggleIndicator = new Indicator(this);
        this.toggleIndicator.quickSettingsItems.push(this.toggle);
        panel.statusArea.quickSettings.addExternalIndicator(this.toggleIndicator);
    }

    disable() {
        this.toggleIndicator.quickSettingsItems.forEach((item) => item.destroy());
        this.toggleIndicator.destroy();
        this.toggleIndicator = null;
        this.toggle = null;
    }
}
