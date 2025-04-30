// script.js

// Use an IIFE (Immediately Invoked Function Expression) to create a private scope
// and expose only the GhostApp object globally.
const GhostApp = (() => {

    // --- Private State ---
    let _state = {
        // Structure: { id: string, name: string, icon: string, folder?: string, accessHours?: { start: number, end: number } }
        hiddenApps: [],
        // Structure: { id: number|string, name: string, phone: string, notes?: string, ringtone?: string, customLabels?: object }
        hiddenContacts: [],
        // Structure: { timestamp: string, type: string, detail: string }
        activityLog: [],
        settings: {
            mfaEnabled: false,
            lockoutThreshold: 5,
            theme: 'default', // Placeholder for UI theme
            ghostIconStyle: 'transparent_subtle' // Placeholder for icon customization
        },
        accessState: {
            failedAttempts: 0,
            isLockedOut: false,
            lastAttempt: null
        }
    };

    const LOCAL_STORAGE_KEY = 'ghostAppData_v1'; // Added version suffix

    // --- Private Helper Functions ---

    function _saveState() {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(_state));
            // console.log("State saved:", _state); // Uncomment for debugging
        } catch (e) {
            console.error("GhostApp Error: Failed to save state to localStorage.", e);
            _logActivity('Error', 'Failed to save app state. Storage might be full.');
        }
    }

    function _loadState() {
        try {
            const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                // Merge loaded state carefully, preserving defaults for missing keys
                _state = {
                    ..._state, // Start with defaults
                    ...parsedState, // Overwrite with loaded values
                    // Ensure nested objects are also merged correctly
                    settings: { ..._state.settings, ...(parsedState.settings || {}) },
                    accessState: { ..._state.accessState, ...(parsedState.accessState || {}) },
                    // Ensure arrays are arrays if loaded data is corrupt/old
                    hiddenApps: Array.isArray(parsedState.hiddenApps) ? parsedState.hiddenApps : [],
                    hiddenContacts: Array.isArray(parsedState.hiddenContacts) ? parsedState.hiddenContacts : [],
                    activityLog: Array.isArray(parsedState.activityLog) ? parsedState.activityLog : [],
                };
                console.log("GhostApp: State loaded from localStorage.");
            } else {
                console.log("GhostApp: No previous state found in localStorage. Initializing.");
                // Add initial demo data only if no state was loaded
                _addInitialDemoData();
            }
        } catch (e) {
            console.error("GhostApp Error: Failed to load or parse state from localStorage.", e);
            _logActivity('Error', 'Failed to load previous state. Resetting.');
            localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear potentially corrupted data
             _addInitialDemoData(); // Initialize with demo data after clearing corruption
        }
    }

     function _addInitialDemoData() {
        // Add demo data only if lists are currently empty
        if (_state.hiddenApps.length === 0) {
            _state.hiddenApps.push({ id: 'com.example.social', name: 'Secret Social', icon: 'icon.png', folder: 'Social', accessHours: null });
            _state.hiddenApps.push({ id: 'com.example.finance', name: 'Private Finance', icon: 'icon.png', folder: 'Finance', accessHours: { start: 9, end: 17 } }); // Example time restriction
        }
        if (_state.hiddenContacts.length === 0) {
            _state.hiddenContacts.push({ id: 1, name: 'Alex Krycek', phone: '+1555SECRET1', notes: 'Deep contact', ringtone: 'xfiles.mp3', customLabels: { project: 'X' } });
            _state.hiddenContacts.push({ id: 2, name: 'Deep Throat', phone: '+1555SECRET2', notes: 'Info source', ringtone: 'default', customLabels: {} });
        }
        _logActivity('System', 'Initialized with demo data.');
        _saveState(); // Save the initial demo data
    }


    function _getCurrentTimestamp() {
        // Consistent timestamp format
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    function _logActivity(type, detail) {
        console.log(`GhostApp Log: [${type}] ${detail}`); // Console log for debugging
        const newEntry = {
            timestamp: _getCurrentTimestamp(),
            type: type,
            detail: detail
        };
        _state.activityLog.push(newEntry);
        // Keep log reasonably sized (e.g., last 100 entries)
        if (_state.activityLog.length > 100) {
            _state.activityLog.shift(); // Remove the oldest entry
        }
        _saveState(); // Save state whenever log is updated
        // Note: The index.html script block should handle calling renderLog()
    }

    function _simulateBiometric() {
        // In a real app, this would interact with native OS biometric APIs
        return confirm("SIMULATE BIOMETRIC SCAN\n(Fingerprint/Face ID)\n\nPress OK for success, Cancel for failure.");
    }

    function _simulatePinEntry() {
        // In a real app, this would be a secure PIN entry screen
        const pin = prompt("SIMULATED MFA: Enter PIN (e.g., '1234'):");
        return pin === '1234'; // Hardcoded for demo
    }

    function _launchDecoyApp() {
        alert("SIMULATING DECOY APP LAUNCH\n(e.g., Calculator or Simple Game)\n\nTriggered due to repeated failed attempts.");
        // In a real app, this would launch an actual pre-configured decoy application.
        _logActivity('Security', 'Decoy app launched (simulated).');
    }

    function _checkTimeBasedAccess(app) {
        if (!app || !app.accessHours) return true; // No restrictions set for this app

        try {
            const now = new Date();
            const currentHour = now.getHours();
            // Example format for accessHours: { start: 9, end: 17 } (9 AM to 5 PM)
            // Ensure start/end are valid numbers
            const start = parseInt(app.accessHours.start, 10);
            const end = parseInt(app.accessHours.end, 10);

            if (isNaN(start) || isNaN(end)) {
                 _logActivity('Error', `Invalid time restriction format for ${app.name}. Allowing access.`);
                 return true; // Allow access if format is wrong
            }

            if (currentHour >= start && currentHour < end) {
                return true; // Access allowed
            } else {
                _logActivity('Access Denied', `Time restriction for ${app.name}. Access allowed ${start}:00 - ${end}:00.`);
                alert(`Access to ${app.name} is restricted at this time.\nAllowed: ${start}:00 - ${end}:00`);
                return false; // Access denied
            }
        } catch (e) {
             _logActivity('Error', `Error checking time restriction for ${app.name}: ${e.message}. Allowing access.`);
             return true; // Allow access on error
        }
    }


    // --- Public API ---
    const publicApi = {

        // --- Getters (provide copies) ---
        get hiddenApps() { return [..._state.hiddenApps]; },
        get hiddenContacts() { return [..._state.hiddenContacts]; },
        get activityLog() { return [..._state.activityLog]; },
        get settings() { return { ..._state.settings }; }, // Return copy of settings
        get isLockedOut() { return _state.accessState.isLockedOut; },

        // --- Core Functionality ---
        logActivity: _logActivity, // Expose the logger (HTML hooks into this)

        accessHiddenApps: () => {
            _logActivity('Access Attempt', 'Attempting to access hidden content...');
            _state.accessState.lastAttempt = _getCurrentTimestamp();

            if (_state.accessState.isLockedOut) {
                alert(`APP LOCKED\nToo many failed attempts.\nRequires backup password or reset (not implemented in demo).`);
                _logActivity('Access Denied', 'App is locked out.');
                _saveState(); // Save lockout state
                return false; // Indicate failure
            }

            // 1. Simulate Biometric
            if (!_simulateBiometric()) {
                _state.accessState.failedAttempts++;
                _logActivity('Access Failed', `Biometric failed (${_state.accessState.failedAttempts}/${_state.settings.lockoutThreshold})`);
                if (_state.accessState.failedAttempts >= _state.settings.lockoutThreshold) {
                    _state.accessState.isLockedOut = true;
                    _logActivity('Security Alert', `Lockout threshold reached. Locking app.`);
                    _saveState(); // Save lockout state before launching decoy
                    _launchDecoyApp(); // Trigger decoy on lockout
                } else {
                    _saveState(); // Save increased fail count
                }
                return false; // Indicate failure
            }

            // 2. Simulate MFA if enabled
            if (_state.settings.mfaEnabled) {
                _logActivity('Access Info', 'MFA enabled, prompting for PIN...');
                if (!_simulatePinEntry()) {
                    _state.accessState.failedAttempts++;
                    _logActivity('Access Failed', `MFA (PIN) failed (${_state.accessState.failedAttempts}/${_state.settings.lockoutThreshold})`);
                     if (_state.accessState.failedAttempts >= _state.settings.lockoutThreshold) {
                        _state.accessState.isLockedOut = true;
                        _logActivity('Security Alert', `Lockout threshold reached after MFA failure. Locking app.`);
                         _saveState(); // Save lockout state before launching decoy
                        _launchDecoyApp(); // Trigger decoy on lockout
                    } else {
                        _saveState(); // Save increased fail count
                    }
                    return false; // Indicate failure
                }
                 _logActivity('Access Info', 'MFA (PIN) successful.');
            }

            // 3. Success
            _logActivity('Access Success', 'Authentication successful. Access granted.');
            _state.accessState.failedAttempts = 0; // Reset failed attempts on success
            _saveState();
            alert("Access Granted!\n(Displaying hidden apps/contacts interface - already visible in demo)");
            // In a real app, this would navigate to the main hidden area UI.
            // For the demo, the index.html already shows the lists.
            return true; // Indicate success
        },

        // --- App Management ---
        hideApp: (appData) => {
            // appData: { id: string, name: string, icon: string, folder?: string, accessHours?: { start: number, end: number } }
            if (!appData || !appData.id || !appData.name) {
                console.error("GhostApp Error: Invalid app data provided to hideApp.");
                _logActivity('Error', 'Failed to hide app: Invalid data.');
                return false;
            }
            if (!_state.hiddenApps.some(app => app.id === appData.id)) {
                _state.hiddenApps.push({ ...appData }); // Add a copy
                _logActivity('App Management', `App hidden: ${appData.name}`);
                _saveState();
                return true;
                // UI should be re-rendered externally (index.html does this)
            } else {
                _logActivity('App Management', `App already hidden: ${appData.name}`);
                return false;
            }
        },

        unhideApp: (appId) => {
            const appIndex = _state.hiddenApps.findIndex(app => app.id === appId);
            if (appIndex > -1) {
                const appName = _state.hiddenApps[appIndex].name;
                _state.hiddenApps.splice(appIndex, 1);
                _logActivity('App Management', `App unhidden: ${appName}`);
                _saveState();
                return true;
                // UI should be re-rendered externally (index.html does this)
            } else {
                _logActivity('Error', `Failed to unhide app: ID ${appId} not found.`);
                return false;
            }
        },

        launchApp: (appId) => {
            // ** SIMULATION / PLACEHOLDER **
            const app = _state.hiddenApps.find(app => app.id === appId);
            if (!app) {
                 _logActivity('Error', `Cannot launch app: ID ${appId} not found.`);
                 alert(`Error: App with ID ${appId} not found.`);
                 return;
            }

            // Check time restrictions BEFORE launching
            if (!_checkTimeBasedAccess(app)) {
                // Log message and alert are handled within _checkTimeBasedAccess
                return;
            }

            _logActivity('App Launch', `Simulating launch of app: ${app.name}`);
            alert(`SIMULATING LAUNCH of hidden app:\n\n${app.name}\n(ID: ${app.id})`);
            // In a real native app, this function would contain the OS-specific code
            // to actually start the hidden application process.
        },

        // --- Contact Management ---
        addHiddenContact: (contactData) => {
            // contactData: { id: number|string, name: string, phone: string, notes?: string, ringtone?: string, customLabels?: object }
            if (!contactData || !contactData.id || !contactData.name) {
                 console.error("GhostApp Error: Invalid contact data provided to addHiddenContact.");
                _logActivity('Error', 'Failed to add contact: Invalid data.');
                return false;
            }
             if (!_state.hiddenContacts.some(c => c.id === contactData.id)) {
                _state.hiddenContacts.push({ ...contactData }); // Add a copy
                _logActivity('Contact Management', `Contact added: ${contactData.name}`);
                _saveState();
                return true;
                 // UI should be re-rendered externally (index.html does this)
             } else {
                 _logActivity('Contact Management', `Contact already exists: ${contactData.name} (ID: ${contactData.id})`);
                 return false;
             }
        },

        removeHiddenContact: (contactId) => {
            // ** PLACEHOLDER / BASIC IMPLEMENTATION **
            const contactIndex = _state.hiddenContacts.findIndex(c => c.id === contactId);
            if (contactIndex > -1) {
                const contactName = _state.hiddenContacts[contactIndex].name;
                _state.hiddenContacts.splice(contactIndex, 1);
                _logActivity('Contact Management', `Contact removed: ${contactName}`);
                _saveState();
                // Need UI update
                alert(`Contact "${contactName}" removed. (UI update needed)`);
                return true;
            } else {
                 _logActivity('Error', `Failed to remove contact: ID ${contactId} not found.`);
                 return false;
            }
        },

         updateHiddenContact: (contactId, updatedData) => {
            // ** PLACEHOLDER / BASIC IMPLEMENTATION **
            const contactIndex = _state.hiddenContacts.findIndex(c => c.id === contactId);
            if (contactIndex > -1) {
                // Merge existing data with updated data
                _state.hiddenContacts[contactIndex] = { ..._state.hiddenContacts[contactIndex], ...updatedData };
                _logActivity('Contact Management', `Contact updated: ${_state.hiddenContacts[contactIndex].name}`);
                _saveState();
                 // Need UI update
                alert(`Contact "${_state.hiddenContacts[contactIndex].name}" updated. (UI update needed)`);
                return true;
            } else {
                 _logActivity('Error', `Failed to update contact: ID ${contactId} not found.`);
                 return false;
            }
        },


        // --- Settings Management ---
        setMfaEnabled: (enabled) => {
            _state.settings.mfaEnabled = !!enabled; // Ensure boolean
            _logActivity('Settings', `Multi-Factor Authentication ${enabled ? 'Enabled' : 'Disabled'}`);
            _saveState();
            alert(`MFA is now ${enabled ? 'ENABLED' : 'DISABLED'}.`);
        },

        setLockoutThreshold: (threshold) => {
            const numThreshold = parseInt(threshold, 10);
            if (!isNaN(numThreshold) && numThreshold > 0) {
                _state.settings.lockoutThreshold = numThreshold;
                 _logActivity('Settings', `Lockout threshold set to ${numThreshold} attempts.`);
                 _saveState();
            } else {
                 _logActivity('Error', `Invalid lockout threshold value: ${threshold}`);
                 alert(`Invalid lockout threshold: ${threshold}. Please enter a positive number.`);
            }
        },

        setAppTimeRestriction: (appId, hours) => {
            // hours = { start: number, end: number } or null to remove
            const app = _state.hiddenApps.find(app => app.id === appId);
            if (app) {
                // Basic validation for hours object
                if (hours && typeof hours.start === 'number' && typeof hours.end === 'number') {
                     app.accessHours = { start: hours.start, end: hours.end };
                     _logActivity('Settings', `Time restriction set for ${app.name}: ${hours.start}:00 - ${hours.end}:00`);
                } else if (hours === null) {
                    app.accessHours = null;
                    _logActivity('Settings', `Time restriction removed for ${app.name}`);
                } else {
                     _logActivity('Error', `Invalid time restriction format for ${app.name}.`);
                     alert(`Invalid time format provided for ${app.name}. Use {start: H, end: H} or null.`);
                     return; // Don't save invalid format
                }
                _saveState();
                 // Need UI update if displaying restrictions
            } else {
                 _logActivity('Error', `Failed to set time restriction: App ID ${appId} not found.`);
            }
        },

        resetLockout: (backupPassword) => {
            // ** SIMULATION / PLACEHOLDER **
            // In a real app, verify the backup password securely.
            const simulatedBackupPass = "master_override"; // Never hardcode in real apps!
            if (backupPassword === simulatedBackupPass) {
                 _state.accessState.isLockedOut = false;
                 _state.accessState.failedAttempts = 0;
                 _logActivity('Security', 'Lockout reset using backup password (simulated).');
                 _saveState();
                 alert("Lockout has been reset.");
                 return true;
            } else {
                 _logActivity('Security Alert', 'Incorrect backup password provided for lockout reset.');
                 alert("Incorrect backup password.");
                 return false;
            }
        },

        // --- Placeholders for features requiring NATIVE implementation ---
        triggerGestureUnlock: () => { _logActivity('Info', 'Gesture unlock requires native implementation.'); alert("SIMULATION: Gesture unlock sequence would be checked here (Requires Native App)."); },
        triggerDialerCodeUnlock: (code) => { _logActivity('Info', `Dialer code (${code}) requires native implementation.`); alert(`SIMULATION: Dialer code '${code}' received (Requires Native App Intercept).`); },
        searchHiddenApps: (query) => {
             _logActivity('Info', `Searching apps for '${query}' (UI implementation needed).`);
             const results = _state.hiddenApps.filter(app => app.name.toLowerCase().includes(query.toLowerCase()) || (app.folder && app.folder.toLowerCase().includes(query.toLowerCase())));
             alert(`SIMULATION: Found ${results.length} app(s) matching "${query}". (UI update needed to display results)`);
             return results; // Return results for potential UI use
        },
        sendEncryptedMessage: (contactId, message) => { _logActivity('Info', `E2E message to contact ${contactId} requires native crypto & backend.`); alert(`SIMULATION: Sending encrypted message to contact ${contactId} (Requires Native App + Crypto).`); },
        blockCameraAccess: (appId, block) => { _logActivity('Info', `Camera block for ${appId} (${block}) requires native permissions.`); alert(`SIMULATION: Setting camera access for ${appId} to blocked=${block} (Requires Native App).`); },
        monitorClipboard: () => { _logActivity('Info', 'Background clipboard monitoring requires native implementation.'); alert("SIMULATION: Clipboard monitoring service would be active (Requires Native App)."); },
        controlNetwork: (appId, allow) => { _logActivity('Info', `Network control for ${appId} (${allow}) requires native firewall/VPN.`); alert(`SIMULATION: Setting network access for ${appId} to allowed=${allow} (Requires Native App).`); },
        spoofLocation: (appId, coords) => { _logActivity('Info', `Location spoofing for ${appId} requires native implementation.`); alert(`SIMULATION: Spoofing location for ${appId} to ${JSON.stringify(coords)} (Requires Native App).`); },

        // --- Utility ---
        _resetDemoData: () => { // Keep underscore for "internal use" demo function
            if (confirm("Are you sure you want to reset all GhostApp data?\nThis cannot be undone.")) {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                // Reset state to initial defaults by effectively reloading the state logic
                 _state = { // Reinitialize state structure
                    hiddenApps: [], hiddenContacts: [], activityLog: [],
                    settings: { mfaEnabled: false, lockoutThreshold: 5, theme: 'default', ghostIconStyle: 'transparent_subtle' },
                    accessState: { failedAttempts: 0, isLockedOut: false, lastAttempt: null }
                };
                _addInitialDemoData(); // Add fresh demo data
                _logActivity('System', 'Demo data reset.');
                alert("GhostApp data has been reset to defaults.");
                // Trigger full UI refresh externally if needed (e.g., page reload or calling all render functions)
                // For this setup, the HTML render functions need to be called again.
                // window.location.reload(); // Simplest way to ensure UI matches reset state
                return true;
            }
            return false;
        }
    };

    // --- Initialization ---
    _loadState(); // Load previous state (or initialize with demo data) when script loads

    console.log("GhostApp script initialized. Current Settings:", publicApi.settings);

    // Return the public API for global access
    return publicApi;

})(); // Execute the IIFE to initialize GhostApp

// ==========================================================================
// == NOTE: The render functions (renderApps, renderContacts, renderLog)   ==
// == and the event hook for logActivity are still defined INLINE in the   ==
// == index.html file in your provided example. This script assumes that   ==
// == setup. If you were to move those functions here, you would need to   ==
// == ensure they are called correctly on load and after relevant actions. ==
// ==========================================================================
