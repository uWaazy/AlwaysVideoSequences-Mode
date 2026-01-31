(async function AlwaysVideoSequences() {
    // Wait for Spicetify to load
    if (!Spicetify.Player) {
        setTimeout(AlwaysVideoSequences, 1000);
        return;
    }

    // --- CONFIGURATION ---
    // Updated key to match new plugin name
    let isVideoModeEnabled = localStorage.getItem("AlwaysVideoSequences_Enabled") === "true";
    let lastSongURI = "";
    let hasSwitchedForCurrentSong = false;
    
    // Button labels compatibility (English & Portuguese)
    const VIDEO_BTN_LABELS = ["switch to video", "video", "mudar para vídeo", "vídeo"];
    const AUDIO_BTN_LABELS = ["switch to audio", "audio", "mudar para áudio", "áudio"];

    // --- CSS STYLES (Indicator & Tooltip) ---
    const style = document.createElement('style');
    style.innerHTML = `
        .avs-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-left: 8px;
            transition: all 0.3s ease;
            vertical-align: middle;
            position: relative;
            cursor: help;
        }
        
        /* State Colors */
        .avs-indicator.active {
            background-color: #1db954; /* Spotify Green */
            box-shadow: 0 0 8px #1db954;
            opacity: 1;
            transform: scale(1);
        }
        .avs-indicator.inactive {
            background-color: #b3b3b3; /* Grey */
            box-shadow: none;
            opacity: 0.5;
            transform: scale(0.8);
        }

        /* Tooltip Logic (Hover) */
        .avs-indicator:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            bottom: 150%;
            left: 50%;
            transform: translateX(-50%);
            background-color: #2e2e2e;
            color: #ffffff;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            pointer-events: none;
            z-index: 9999;
            opacity: 0;
            animation: fadeIn 0.2s forwards;
        }

        @keyframes fadeIn {
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // --- CROSSFADE MANAGER ---
    function manageCrossfade(shouldDisable) {
        try {
            // Force 0s crossfade to prevent audio cuts during video switch
            if (shouldDisable && Spicetify.Platform?.PlayerAPI?.setCrossfadeDuration) {
                Spicetify.Platform.PlayerAPI.setCrossfadeDuration(0);
            }
        } catch (e) {
            // Silently fail if API changes
        }
    }

    // --- DOM HELPERS ---
    function isButton(element, labels) {
        if (!element) return false;
        const text = (element.ariaLabel || element.title || element.innerText || "").toLowerCase();
        return labels.some(label => text.includes(label));
    }

    function updateIndicator(button) {
        let dot = button.querySelector('.avs-indicator');
        
        // Create dot if it doesn't exist
        if (!dot) {
            dot = document.createElement('span');
            dot.className = 'avs-indicator';
            button.appendChild(dot);
        }

        // Update visual state and tooltip text
        if (isVideoModeEnabled) {
            dot.classList.remove('inactive');
            dot.classList.add('active');
            dot.setAttribute('data-tooltip', 'Always Video Sequences: Active');
        } else {
            dot.classList.remove('active');
            dot.classList.add('inactive');
            dot.setAttribute('data-tooltip', 'Always Video Sequences: Disabled');
        }
    }

    // --- MAIN LOOP (Smart Session Scanner) ---
    setInterval(() => {
        // 1. Detect Song Change
        const currentURI = Spicetify.Player.data?.item?.uri;
        if (currentURI !== lastSongURI) {
            lastSongURI = currentURI;
            hasSwitchedForCurrentSong = false; // Reset switch flag for new track
        }

        // 2. Find Switch Button
        const buttons = Array.from(document.querySelectorAll('button'));
        const switchBtn = buttons.find(b => 
            isButton(b, VIDEO_BTN_LABELS) || isButton(b, AUDIO_BTN_LABELS)
        );

        if (switchBtn) {
            updateIndicator(switchBtn);

            // 3. Auto-Switch Logic (Only once per track to avoid sidebar loops)
            if (isVideoModeEnabled && 
                isButton(switchBtn, VIDEO_BTN_LABELS) && 
                !hasSwitchedForCurrentSong) {
                
                switchBtn.click();
                hasSwitchedForCurrentSong = true;
                console.log("[AlwaysVideoSequences] Switched to video sequence.");
            }
        }
    }, 50);

    // --- USER INTERACTION HANDLER ---
    document.addEventListener("click", (e) => {
        const target = e.target.closest("button");
        if (!target) return;

        const isVideoBtn = isButton(target, VIDEO_BTN_LABELS);
        const isAudioBtn = isButton(target, AUDIO_BTN_LABELS);

        if (isVideoBtn || isAudioBtn) {
            if (isVideoBtn) {
                // User manually clicked Video -> Enable Mode
                if (!isVideoModeEnabled) {
                    isVideoModeEnabled = true;
                    localStorage.setItem("AlwaysVideoSequences_Enabled", "true");
                    manageCrossfade(true);
                }
                // Mark as handled to prevent double-click loop
                hasSwitchedForCurrentSong = true; 
                updateIndicator(target);
            }
            else if (isAudioBtn) {
                // User manually clicked Audio -> Disable Mode
                if (isVideoModeEnabled) {
                    isVideoModeEnabled = false;
                    localStorage.setItem("AlwaysVideoSequences_Enabled", "false");
                    updateIndicator(target);
                }
            }
        }
    }, true);

    // Initial State Enforcement
    if (isVideoModeEnabled) {
        setTimeout(() => manageCrossfade(true), 2000);
    }

})();