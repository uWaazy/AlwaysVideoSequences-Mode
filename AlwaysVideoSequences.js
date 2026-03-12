(async function AlwaysVideoSequences() {
    if (!Spicetify.Player || !Spicetify.Player.addEventListener) {
        setTimeout(AlwaysVideoSequences, 1000);
        return;
    }

    let isVideoModeEnabled = localStorage.getItem("AlwaysVideoSequences_Enabled") === "true";
    let isProcessing = false;

    const VIDEO_KEYWORDS = ["switch to video", "mudar para vídeo", "passer à la vidéo", "przełącz na wideo", "Zum Video wechseln", "skift til video"];
    const AUDIO_PHRASES = ["switch to audio", "mudar para áudio", "cambiar a audio", "passer en audio", "zum audio umschalten", "przełącz na dźwięk", "skift til lyd"];

    const style = document.createElement('style');
    style.innerHTML = `
        .avs-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-left: 8px; transition: all 0.3s ease; vertical-align: middle; position: relative; cursor: help; }
        .avs-indicator.active { background-color: #1db954; box-shadow: 0 0 8px #1db954; opacity: 1; transform: scale(1); }
        .avs-indicator.inactive { background-color: #b3b3b3; box-shadow: none; opacity: 0.5; transform: scale(0.8); }
        .avs-indicator:hover::after { content: attr(data-tooltip); position: absolute; bottom: 150%; left: 50%; transform: translateX(-50%); background-color: #2e2e2e; color: #ffffff; padding: 5px 10px; border-radius: 4px; font-size: 12px; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.3); pointer-events: none; z-index: 9999; opacity: 0; animation: fadeIn 0.2s forwards; }
        @keyframes fadeIn { to { opacity: 1; } }
    `;
    document.head.appendChild(style);

    function manageCrossfade(shouldDisable) {
        try {
            if (shouldDisable) {
                if (localStorage.getItem("AVS_Crossfade_Saved") === null) {
                    localStorage.setItem("AVS_Crossfade_Saved", "true");
                }
                if (Spicetify.Platform?.PlayerAPI?.setCrossfade) {
                    Spicetify.Platform.PlayerAPI.setCrossfade(false);
                }
                if (Spicetify.Platform?.PlayerAPI?.setCrossfadeDuration) {
                    Spicetify.Platform.PlayerAPI.setCrossfadeDuration(0);
                }
            } else {
                if (localStorage.getItem("AVS_Crossfade_Saved") === "true") {
                    if (Spicetify.Platform?.PlayerAPI?.setCrossfade) {
                        Spicetify.Platform.PlayerAPI.setCrossfade(true);
                    }
                    localStorage.removeItem("AVS_Crossfade_Saved");
                }
            }
        } catch (e) {}
    }

    function isTargetButton(element, type) {
        if (!element) return false;
        const text = (element.ariaLabel || element.title || element.innerText || "").toLowerCase();
        if (text.length > 50) return false;
        
        if (type === 'video') return VIDEO_KEYWORDS.some(key => text.includes(key)) && !text.includes("link") && !text.includes("url");
        if (type === 'audio') return AUDIO_PHRASES.some(phrase => text.includes(phrase));
        return false;
    }

    function updateUI() {
        const buttons = Array.from(document.querySelectorAll('button'));
        const switchBtn = buttons.find(b => isTargetButton(b, 'video') || isTargetButton(b, 'audio'));
        
        if (!switchBtn) return;

        document.querySelectorAll('.avs-indicator').forEach(dot => {
            if (dot.parentElement !== switchBtn) dot.remove();
        });

        let dot = switchBtn.querySelector('.avs-indicator');
        if (!dot) {
            dot = document.createElement('span');
            dot.className = 'avs-indicator';
            switchBtn.appendChild(dot);
        }

        if (isVideoModeEnabled) {
            dot.className = 'avs-indicator active';
            dot.setAttribute('data-tooltip', 'Always Video Sequences: Active');
        } else {
            dot.className = 'avs-indicator inactive';
            dot.setAttribute('data-tooltip', 'Always Video Sequences: Disabled');
        }
    }

    function attemptVideoSwitch() {
        if (!isVideoModeEnabled || isProcessing) return;
        
        isProcessing = true;
        
        setTimeout(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const videoBtn = buttons.find(b => isTargetButton(b, 'video'));
            
            if (videoBtn) {
                videoBtn.click();
            }
            isProcessing = false;
        }, 1500);
    }

    Spicetify.Player.addEventListener("songchange", attemptVideoSwitch);

    const observer = new MutationObserver(() => {
        updateUI();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", (e) => {
        const target = e.target.closest("button");
        if (!target) return;

        const isVideoBtn = isTargetButton(target, 'video');
        const isAudioBtn = isTargetButton(target, 'audio');

        if (isVideoBtn || isAudioBtn) {
            if (isVideoBtn && !isVideoModeEnabled) {
                isVideoModeEnabled = true;
                localStorage.setItem("AlwaysVideoSequences_Enabled", "true");
                manageCrossfade(true);
            } else if (isAudioBtn && isVideoModeEnabled) {
                isVideoModeEnabled = false;
                localStorage.setItem("AlwaysVideoSequences_Enabled", "false");
                manageCrossfade(false);
            }
            updateUI();
        }
    }, true);

    if (isVideoModeEnabled) {
        manageCrossfade(true);
        setTimeout(attemptVideoSwitch, 2000);
    }

})();