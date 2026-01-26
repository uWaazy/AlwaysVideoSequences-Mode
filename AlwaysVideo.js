(async function AlwaysVideo() {
    if (!Spicetify.Player) {
        setTimeout(AlwaysVideo, 1000);
        return;
    }

    // --- CONFIGURATION ---
    let isVideoModeEnabled = localStorage.getItem("AlwaysVideo_Enabled") === "true";
    
    const VIDEO_BTN_LABELS = ["switch to video", "video", "mudar para vídeo", "vídeo"];
    const AUDIO_BTN_LABELS = ["switch to audio", "audio", "mudar para áudio", "áudio"];

    // --- CSS STYLES ---
    const style = document.createElement('style');
    style.innerHTML = `
        .always-video-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-left: 8px;
            transition: all 0.3s ease;
            vertical-align: middle;
            pointer-events: none;
        }
        .always-video-indicator.active {
            background-color: #1db954;
            box-shadow: 0 0 10px #1db954;
            opacity: 1;
            transform: scale(1);
        }
        .always-video-indicator.inactive {
            background-color: #b3b3b3;
            box-shadow: none;
            opacity: 0.4;
            transform: scale(0.8);
        }
    `;
    document.head.appendChild(style);

    // --- CROSSFADE MANAGER ---
    // Video mode requires a clean cut (0s crossfade) to prevent cutting off the previous track early.
    function manageCrossfade(shouldDisable) {
        try {
            if (shouldDisable) {
                if (Spicetify.Platform?.PlayerAPI?.setCrossfadeDuration) {
                    Spicetify.Platform.PlayerAPI.setCrossfadeDuration(0);
                }
            } 
        } catch (e) {
            console.error("[AlwaysVideo] Could not adjust crossfade.", e);
        }
    }

    // --- HELPERS ---
    function isButton(element, labels) {
        if (!element) return false;
        const text = (element.ariaLabel || element.title || element.innerText || "").toLowerCase();
        return labels.some(label => text.includes(label));
    }

    function updateIndicator(button) {
        let dot = button.querySelector('.always-video-indicator');
        if (!dot) {
            dot = document.createElement('span');
            dot.className = 'always-video-indicator';
            button.appendChild(dot);
        }

        if (isVideoModeEnabled) {
            dot.classList.remove('inactive');
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
            dot.classList.add('inactive');
        }
    }

    // --- MAIN LOOP (High Frequency Scanner) ---
    setInterval(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const switchBtn = buttons.find(b => 
            isButton(b, VIDEO_BTN_LABELS) || isButton(b, AUDIO_BTN_LABELS)
        );

        if (switchBtn) {
            updateIndicator(switchBtn);

            if (isVideoModeEnabled && isButton(switchBtn, VIDEO_BTN_LABELS)) {
                switchBtn.click();
            }
        }
    }, 50);

    // --- INTERACTION HANDLER ---
    document.addEventListener("click", (e) => {
        const target = e.target.closest("button");
        if (!target) return;

        const isVideoBtn = isButton(target, VIDEO_BTN_LABELS);
        const isAudioBtn = isButton(target, AUDIO_BTN_LABELS);

        if (isVideoBtn || isAudioBtn) {
            if (isVideoBtn && !isVideoModeEnabled) {
                // ENABLE MODE
                isVideoModeEnabled = true;
                localStorage.setItem("AlwaysVideo_Enabled", "true");
                manageCrossfade(true); // Force 0s crossfade
                updateIndicator(target);
                Spicetify.showNotification("Always Video: Active (Crossfade disabled)", false);
            }
            else if (isAudioBtn && isVideoModeEnabled) {
                // DISABLE MODE
                isVideoModeEnabled = false;
                localStorage.setItem("AlwaysVideo_Enabled", "false");
                updateIndicator(target);
            }
        }
    }, true);

    // Initial check
    if (isVideoModeEnabled) {
        setTimeout(() => manageCrossfade(true), 2000);
    }

})();