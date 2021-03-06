(() => {

const { NotificationMixin, DialogMixin, AnnouncementsMixin, DataMixin,
    SyncMixin, AutoSyncMixin, AutoLockMixin, HintsMixin, BaseElement } = padlock;
const { applyMixins } = padlock.util;

class App extends applyMixins(
    BaseElement,
    DataMixin,
    SyncMixin,
    AutoSyncMixin,
    AutoLockMixin,
    DialogMixin,
    AnnouncementsMixin,
    NotificationMixin,
    HintsMixin
) {

    static get is() { return "pl-app"; }

    static get properties() { return {
        locked: {
            type: Boolean,
            value: true,
            observer: "_lockedChanged"
        },
        _currentView: {
            type: String,
            value: "placeholderView",
            observer: "_currentViewChanged"
        },
        _selectedRecord: {
            type: Object,
            observer: "_selectedRecordChanged"
        }
    }; }

    constructor() {
        super();

        // If we want to capture all keydown events, we have to add the listener
        // directly to the document
        document.addEventListener("keydown", this._keydown.bind(this), false);

        // Listen for android back button
        document.addEventListener("backbutton", this._back.bind(this), false);

        document.addEventListener("dialog-open", () => this.classList.add("dialog-open"));
        document.addEventListener("dialog-close", () => this.classList.remove("dialog-open"));
    }

    get _isNarrow() {
        return this.offsetWidth < 700;
    }

    recordDeleted(record) {
        if (record === this._selectedRecord) {
            this.$.listView.deselect();
        }
    }

    dataInitialized() {
        if (this.settings.syncEmail) {
            this.confirm($l("Would you like to pair this device with Padlock Cloud now?"), $l("Yes"), $l("Maybe Later"))
                .then((confirm) => {
                    if (confirm) {
                        this._currentView = "cloudView";
                        this.connectCloud(this.settings.syncEmail);
                    }
                });
        }
    }

    dataLoaded() {
        this.locked = false;
        this.$.startView.open = true;
        this.checkAnnouncements();
    }

    dataUnloaded() {
        this.$.startView.reset();
        this.locked = true;
        this.$.startView.open = false;
    }

    dataReset() {
        setTimeout(() => this.alert($l("App reset successfully. Off to a fresh start!")), 500);
    }

    _closeRecord() {
        this.$.listView.deselect();
    }

    _selectedRecordChanged() {
        clearTimeout(this._selectedRecordChangedTimeout);
        this._selectedRecordChangedTimeout = setTimeout(() => {
            if (this._selectedRecord) {
                setTimeout(() => this._currentView = "recordView");
                setTimeout(() => this.$.recordView.record = this._selectedRecord, this._isNarrow ? 50 : 0);
            } else {
                if (this._currentView == "recordView") {
                    this._currentView = "placeholderView";
                }
            }
        }, 10);
    }

    _openSettings() {
        this._currentView = "settingsView";
        this.$.listView.deselect();
    }

    _settingsBack() {
        this._currentView = "placeholderView";
    }

    _openCloudView() {
        this._currentView = "cloudView";
        this.$.listView.deselect();
    }

    _cloudViewBack() {
        this._currentView = "placeholderView";
    }

    _currentViewChanged() {
        this.$.main.classList.toggle("showing-pages", this._currentView !== "placeholderView");
        clearTimeout(this._switchPagesTimeout);
        // If we're in narrow layout, wait for animation to finish before switching to placeholder view
        this._switchPagesTimeout = setTimeout(() => this.$.pages.select(this._currentView),
            this._currentView === "placeholderView" && this._isNarrow ? 300 : 0);
    }

    //* Keyboard shortcuts
    _keydown(event) {
        let shortcut;
        const control = event.ctrlKey || event.metaKey;

        // ESCAPE -> Back
        if (event.key === "Escape") {
            shortcut = () => this._back();
        }
        // CTRL/CMD + F -> Filter
        else if (control && event.key === "f") {
            shortcut = () => this.$.listView.focusFilterInput();
        }
        // CTRL/CMD + N -> New Record
        else if (control && event.key === "n") {
            shortcut = () => this.createRecord();
        }

        // If one of the shortcuts matches, execute it and prevent the default behaviour
        if (shortcut) {
            shortcut();
            event.preventDefault();
        }
    }

    _back() {
        switch (this._currentView) {
            case "recordView":
                this._closeRecord();
                break;
            case "settingsView":
                this._settingsBack();
                break;
            case "cloudView":
                this._cloudViewBack();
                break;
        }
    }

    _lockedChanged() {
        this.$.main.classList.toggle("active", !this.locked);
    }
}

window.customElements.define(App.is, App);

})();
