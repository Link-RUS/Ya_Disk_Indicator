const { GLib, GObject } = imports.gi;

export const YDInfo = GObject.registerClass(
    {
        Signals: {
            "status-changed": {
                param_types: [GObject.TYPE_STRING],
            },
        },
    },
class YDInfo extends GObject.Object {
    laststatus = "";
    status = "";
    error = "";
    sync_progress = "";
    total = "";
    used = "";
    available = "";
    trash = "";
    synchronized_files = [];
    folder = "";

    constructor() {
        super();
    }

    init() {
        if (!this.testYD()) {
            return false;
        }
        this.AutoUpdate();
        return true;
    }

    getStatus() {
        return this.status;
    }

    getSyncProgress() {
        return this.sync_progress;
    }

    getTotal() {
        return this.total;
    }

    getUsed() {
        return this.used;
    }

    getError() {
        return this.error;
    }

    getAvailable() {
        return this.available;
    }

    getTrash() {
        return this.trash;
    }

    stop() {
        //GLib.source_remove(this.pr);
        GLib.spawn_command_line_async("yandex-disk stop");
    }

    start() {
        GLib.spawn_command_line_async("yandex-disk start");
        this.AutoUpdate();
    }

    startSync() {
        GLib.spawn_command_line_async("yandex-disk sync");
    }

    openFolder() {
        const cmd = "xdg-open " + this.folder;
        GLib.spawn_command_line_async(cmd);
    }

    parseStatus(status) {
        const lines = status.split("\n");
        this.synchronized_files = [];
        this.sync_progress = "";
        for (const line of lines) {
            if (line.includes("status")) {
                this.parseStatusLine(line);
            }
            if (line.includes("Error")) {
                this.parseErrorLine(line);
            }
            if (this.status == "no internet access" || this.status == "Error") {
                break;
            }

            if (line.startsWith("Sync progress: ")) {
                this.parseSyncProgressLine(line);
            }
            if (line.startsWith("Path to Yandex.Disk directory: ")) {
                this.parseFolderLine(line);
            }

            if (line.startsWith("\tTotal: ")) {
                this.parseTotalLine(line);
            }
            if (line.startsWith("\tUsed: ")) {
                this.parseUsedLine(line);
            }
            if (line.startsWith("\tAvailable: ")) {
                this.parseAvailableLine(line);
            }
            if (line.startsWith("\tTrash size: ")) {
                this.parseTrashLine(line);
            }

            if (line.startsWith("\tfile: ")) {
                this.parseFileLine(line);
            }
        }
        if (this.laststatus != this.status) {
            this.laststatus = this.status;
            this.emit("status-changed", this.status);
        }
        if (this.status === "index" || this.status === "busy") {
            this.emit("status-changed", this.status);
        }
    }

    parseStatusLine(line) {
        this.status = line.split(": ")[1].trim();
    }

    parseErrorLine(line) {
        this.status = line.split(": ")[0].trim();
        this.error = line.split(": ")[1].trim();
    }

    parseSyncProgressLine(line) {
        this.sync_progress = line.split(": ")[1].trim();
    }

    parseFolderLine(line) {
        this.folder = line.split(": ")[1].trim().slice(1, -1);
    }

    parseTotalLine(line) {
        this.total = line.split(": ")[1].trim();
    }

    parseUsedLine(line) {
        this.used = line.split(": ")[1].trim();
    }

    parseAvailableLine(line) {
        this.available = line.split(": ")[1].trim();
    }

    parseTrashLine(line) {
        this.trash = line.split(": ")[1].trim();
    }

    parseFileLine(line) {
        const filePath = line.match(/'([^']+)'/)[1];
        this.synchronized_files.push(filePath);
    }

    testYD() {
        let [success, out] = GLib.spawn_command_line_sync('sh -c "command -v yandex-disk"');
        if (success) {
            let status = new TextDecoder().decode(out);
            if (status.includes("yandex-disk")) {
                return true;
            }
        }
        return false;
    }

    updateStatus() {
        try {
            let [success, out] = GLib.spawn_command_line_sync(
                'sh -c "LC_ALL=C.UTF-8 yandex-disk status"',
            );
            if (success) {
                let status = new TextDecoder().decode(out);
                this.parseStatus(status);
            }
        } catch (e) {
            console.error(e);
        }
    }

    AutoUpdate() {
        if (this.pr) {
            GLib.source_remove(this.pr);
            this.pr = null;
        }
        this.pr = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this.updateStatus();
            return true;
        });
    }
    destroy() {
        if (this.pr) {
            GLib.source_remove(this.pr);
            this.pr = null;
        }
    }
},
);
