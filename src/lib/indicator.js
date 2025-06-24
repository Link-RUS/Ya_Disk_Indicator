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
        this._indicator.gicon = Gio.FileIcon.new(Gio.File.new_for_path(this.extension.path + '/icons/YandexDisk.svg'));
    }

});