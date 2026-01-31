(async function AlwaysVideoSequences() {
    if (!Spicetify.Player) {
        setTimeout(AlwaysVideoSequences, 1000);
        return;
    }

    // --- CONFIGURATION ---
    let isVideoModeEnabled = localStorage.getItem("AlwaysVideoSequences_Enabled") === "true";
    let lastSongURI = "";
    let hasSwitchedForCurrentSong = false;
    
    // --- MULTI-LANGUAGE DICTIONARY ---
    // Video is usually similar across languages, but Audio needs specific checks to avoid "Radio" bugs.
    const VIDEO_KEYWORDS = ["video", "vídeo", "vidéo"]; 
    
    // Specific phrases for "Audio" to be safe (EN, PT, ES, FR, DE, IT, PL)
    const AUDIO_PHRASES = [
        "switch to audio", "mudar para áudio", "cambiar a audio", "passer en audio", // EN, PT, ES, FR
        "zu audio wechseln", "passa all'audio", "przełącz na dźwięk" // DE, IT, PL
    ];

    // --- CSS ---
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
        .avs-indicator.active {
            background-color: #1db954;
            box-shadow: 0 0 8px #1db954;
            opacity: 1;
            transform: scale(1);
        }
        .avs-indicator.inactive {
            background-color: #b3b3b3;
            box-shadow: none;
            opacity: 0.5;
            transform: scale(0.8);
        }
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
        @keyframes fadeIn { to { opacity: 1; } }
    `;
    document.head.appendChild(style);

    // --- HELPERS ---
    function manageCrossfade(shouldDisable) {
        try {
            if (shouldDisable && Spicetify.Platform?.PlayerAPI?.setCrossfadeDuration) {
                Spicetify.Platform.PlayerAPI.setCrossfadeDuration(0);
            }
        } catch (e) {}
    }

    function isTargetButton(element, type) {
        if (!element) return false;
        
        // Get all possible text sources
        const text = (element.ariaLabel || element.title || element.innerText || "").toLowerCase();
        
        // Safety: Ignore buttons with very long text (usually "Go to Song Radio" descriptions)
        if (text.length > 50) return false;

        if (type === 'video') {
            // For Video, we look for the keyword "video" (covers 90% of languages)
            // AND ensure it doesn't say "copy video link" or similar context menu items
            return VIDEO_KEYWORDS.some(key => text.includes(key)) && !text.includes("link") && !text.includes("url");
        } 
        
        if (type === 'audio') {
            // For Audio, we use strict phrases to avoid the "Radio" bug
            return AUDIO_PHRASES.some(phrase => text.includes(phrase));
        }
        
        return false;
    }

    function cleanupGhostIndicators(currentButton) {
        const allIndicators = document.querySelectorAll('.avs-indicator');
        allIndicators.forEach(dot => {
            if (dot.parentElement !== currentButton) {
                dot.remove();
            }
        });
    }

    function updateIndicator(button) {
        cleanupGhostIndicators(button);
        let dot = button.querySelector('.avs-indicator');
        if (!dot) {
            dot = document.createElement('span');
            dot.className = 'avs-indicator';
            button.appendChild(dot);
        }

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

    // --- MAIN LOOP ---
    setInterval(() => {
        // 1. Detect Song Change
        const currentURI = Spicetify.Player.data?.item?.uri;
        if (currentURI !== lastSongURI) {
            lastSongURI = currentURI;
            hasSwitchedForCurrentSong = false;
        }

        // 2. Find Switch Button
        const buttons = Array.from(document.querySelectorAll('button'));
        const switchBtn = buttons.find(b => 
            isTargetButton(b, 'video') || isTargetButton(b, 'audio')
        );

        // 3. Update UI
        if (switchBtn) {
            updateIndicator(switchBtn);

            // 4. Auto-Switch Logic
            if (isVideoModeEnabled && 
                isTargetButton(switchBtn, 'video') && 
                !hasSwitchedForCurrentSong) {
                
                switchBtn.click();
                hasSwitchedForCurrentSong = true;
            }
        } else {
            cleanupGhostIndicators(null);
        }
    }, 50);

    // --- INTERACTION HANDLER ---
    document.addEventListener("click", (e) => {
        const target = e.target.closest("button");
        if (!target) return;

        const isVideoBtn = isTargetButton(target, 'video');
        const isAudioBtn = isTargetButton(target, 'audio');

        if (isVideoBtn || isAudioBtn) {
            if (isVideoBtn) {
                if (!isVideoModeEnabled) {
                    isVideoModeEnabled = true;
                    localStorage.setItem("AlwaysVideoSequences_Enabled", "true");
                    manageCrossfade(true);
                }
                hasSwitchedForCurrentSong = true; 
                updateIndicator(target);
            }
            else if (isAudioBtn) {
                if (isVideoModeEnabled) {
                    isVideoModeEnabled = false;
                    localStorage.setItem("AlwaysVideoSequences_Enabled", "false");
                    updateIndicator(target);
                }
            }
        }
    }, true);

    if (isVideoModeEnabled) {
        setTimeout(() => manageCrossfade(true), 2000);
    }

})();