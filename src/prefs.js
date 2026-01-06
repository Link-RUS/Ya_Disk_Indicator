import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";

export default class YandexDiskIndicatorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        
        const page = new Adw.PreferencesPage();
        
        const group = new Adw.PreferencesGroup({
            title: "Настройки Yandex Disk Indicator"
        });
        page.add(group);
        
        // Создаем строку настроек для обычного таймера
        const row1 = new Adw.SpinRow({
            title: "Таймер обновления (секунды)",
            subtitle: "Интервал обновления в обычном режиме",
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 3600,
                step_increment: 1,
                page_increment: 10,
                value: settings.get_int("refresh-timer")
            }),
            climb_rate: 1,
            digits: 0,
            snap_to_ticks: true
        });
        
        group.add(row1);
        
        row1.connect('notify::value', (widget) => {
            settings.set_int("refresh-timer", Math.round(widget.value));
        });
        
        // Создаем строку настроек для таймера в режиме синхронизации
        const row2 = new Adw.SpinRow({
            title: "Таймер обновления в режиме синхронизации (секунды)",
            subtitle: "Интервал обновления при активной синхронизации",
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 30,
                step_increment: 1,
                page_increment: 10,
                value: settings.get_int("busy-refresh-timer")
            }),
            climb_rate: 1,
            digits: 0,
            snap_to_ticks: true
        });
        
        group.add(row2);
        
        row2.connect('notify::value', (widget) => {
            settings.set_int("busy-refresh-timer", Math.round(widget.value));
        });
        
        // Создаем строку настроек для таймера в режиме fallback
        const row3 = new Adw.SpinRow({
            title: "Таймер обновления в режиме fallback (секунды)",
            subtitle: "Интервал обновления при ошибках",
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 3600,
                step_increment: 1,
                page_increment: 10,
                value: settings.get_int("fallback-refresh-timer")
            }),
            climb_rate: 1,
            digits: 0,
            snap_to_ticks: true
        });
        
        group.add(row3);
        
        row3.connect('notify::value', (widget) => {
            settings.set_int("fallback-refresh-timer", Math.round(widget.value));
        });
        
        // Создаем переключатель для настройки уведомлений
        const row4 = new Adw.SwitchRow({
            title: "Показывать уведомление о завершении синхронизации",
            subtitle: "Отображать уведомление при завершении синхронизации",
            active: settings.get_boolean("show-sync-complete-notification")
        });
        
        group.add(row4);
        
        row4.connect('notify::active', (widget) => {
            settings.set_boolean("show-sync-complete-notification", widget.active);
        });
        
        // Добавляем страницу в окно
        window.add(page);
    }
}