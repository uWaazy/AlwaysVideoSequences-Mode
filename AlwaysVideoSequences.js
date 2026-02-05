(async function AlwaysVideoSequences() {
    if (!Spicetify.Player) {
        setTimeout(AlwaysVideoSequences, 1000);
        return;
    }

    let isVideoModeEnabled = localStorage.getItem("AlwaysVideoSequences_Enabled") === "true";
    let lastSongURI = "";
    let hasSwitchedForCurrentSong = false;
    let isWarmingUp = true;

    setTimeout(() => {
        isWarmingUp = false;
    }, 2500);

    const VIDEO_KEYWORDS = ["video", "vídeo", "vidéo"];
    const AUDIO_PHRASES = [
        "switch to audio", "mudar para áudio", "cambiar a audio", "passer en audio",
        "zu audio wechseln", "passa all'audio", "przełącz na dźwięk"
    ];

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

    function manageCrossfade(shouldDisable) {
        try {
            if (shouldDisable && Spicetify.Platform?.PlayerAPI?.setCrossfadeDuration) {
                Spicetify.Platform.PlayerAPI.setCrossfadeDuration(0);
            }
        } catch (e) {}
    }

    function isTargetButton(element, type) {
        if (!element) return false;

        const text = (element.ariaLabel || element.title || element.innerText || "").toLowerCase();

        if (text.length > 50) return false;

        if (type === 'video') {
            return VIDEO_KEYWORDS.some(key => text.includes(key)) && !text.includes("link") && !text.includes("url");
        }

        if (type === 'audio') {
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

    setInterval(() => {
        if (isWarmingUp) return;

        const currentURI = Spicetify.Player.data?.item?.uri;
        if (!currentURI) return;

        if (currentURI !== lastSongURI) {
            lastSongURI = currentURI;
            hasSwitchedForCurrentSong = false;
        }

        const buttons = Array.from(document.querySelectorAll('button'));
        const switchBtn = buttons.find(b => 
            isTargetButton(b, 'video') || isTargetButton(b, 'audio')
        );

        if (switchBtn) {
            updateIndicator(switchBtn);

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

    document.addEventListener("click", (e) => {
        const target = e.target.closest("button");
        if (!target) return;

        const isVideoBtn = isTargetButton(target, 'video');
        const isAudioBtn = isTargetButton(target, 'audio');

        if (isVideoBtn || isAudioBtn) {
            isWarmingUp = false;

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