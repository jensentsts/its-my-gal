// app.js
const { createApp, ref, computed, onMounted, onUnmounted, nextTick } = Vue;

createApp({
    setup() {
        const currentView = ref("menu");
        const activeMenuPanel = ref(null);
        const activeGamePanel = ref(null);
        const archiveMode = ref("save"); 
        const saveSlotsData = ref({}); 

        const activeInspectedCharId = ref(null);
        const activeSpriteIdForInspection = ref(null);
        const activeInspectedSpriteUrl = ref("");
        const lightboxUrl = ref(""); 
        
        const uiVisible = ref(true); 

        const toastMessage = ref("");
        const toastType = ref("success");
        let toastTimer = null;

        const triggerToast = (msg, type = "success") => {
            clearTimeout(toastTimer); toastMessage.value = msg; toastType.value = type;
            toastTimer = setTimeout(() => { toastMessage.value = ""; }, 2500);
        };

        const unlockedGalleries = ref({ old_photo: false, ancient_mural: false, boss_awaken: false, elysia_possession: false, redemption_light: false });
        
        const unlockedEndings = ref({});
        const fullEndingsList = window.ENDINGS;

        const assetsCharacters = window.CHARACTERS;
        const assetsCgLibrary = window.CG_LIBRARY;
        const scenes = window.SCENES;
        const chapters = window.STORY_CHAPTERS;
        const configTitle = window.GAME_CONFIG.title;
        const homeConfig = window.HOME_CONFIG;

        const viewportWidth = window.GAME_CONFIG.aspectRatio.width;
        const viewportHeight = window.GAME_CONFIG.aspectRatio.height;
        const scale = ref(1);
        const viewportDisplayWidth = ref(1280);
        const viewportDisplayHeight = ref(720);
        const isLandscape = ref(true);
        const isMobile = ref(false);
        let resizeDebounceTimer = null;
        const activeCG = ref(null);

        const currentChapterId = ref("main");
        const currentStepIndex = ref(0);
        const gameState = ref({ money: 100, inventory: [], flags: {} });
        const stageCharacters = ref({});
        const historyLogs = ref([]);
        const lastSpeakerId = ref(null);

        const showLog = ref(false);
        const showInventory = ref(false);
        const triggeredEnding = ref(null);
        const avatarLoadFail = ref(false);

        const selectedBagItemId = ref(null);
        
        const stageDisplayItem = ref(null); 
        const itemToastQueue = ref([]);
        const isShowingItemToast = ref(false);

        const typedText = ref("");
        const typingFinished = ref(true);
        let typingTimer = null;
        let autoAdvanceTimer = null; 
        let fxManager = null;
        let homeFxManager = null;

        const activeEffects = ref([]);
        const currentScreenEffect = ref("");

        // ---- 场景背景图片 fallback ----
        const currentSceneTestUrl = ref(null);
        const sceneBgFailed = ref(false);   // 当前背景是否加载失败

        const pendingEnding = ref(null);

        const currentStep = computed(() => {
            const pool = chapters[currentChapterId.value];
            if (!pool) return null;
            return pool[currentStepIndex.value] || null;
        });

        const inspectedChar = computed(() => {
            if (!activeInspectedCharId.value) return null;
            return assetsCharacters[activeInspectedCharId.value] || null;
        });

        const activeInspectedSpriteLabel = computed(() => {
            if (!inspectedChar.value || !activeSpriteIdForInspection.value) return "";
            return inspectedChar.value.sprites[activeSpriteIdForInspection.value]?.label || "";
        });

        const getArchiveEmoji = computed(() => {
            return activeInspectedSpriteLabel.value.split(" ")[0] || "👤";
        });

        const viewportStyle = computed(() => ({
            width: `${viewportWidth}px`,
            height: `${viewportHeight}px`,
            transform: `translate(-50%, -50%) scale(${scale.value})`,
            '--viewport-scale': scale.value,
            '--viewport-display-width': `${viewportDisplayWidth.value}px`,
            '--viewport-display-height': `${viewportDisplayHeight.value}px`
        }));

        // 场景背景样式，支持 fallback
        const backgroundStyle = computed(() => {
            if (!currentStep.value || !currentStep.value.sceneId) return { background: "#000" };
            const sc = scenes[currentStep.value.sceneId];
            if (!sc) return { background: "#000" };
            if (sc.url && !sceneBgFailed.value) {
                return { backgroundImage: `url(${sc.url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
            }
            return { background: sc.bgPlaceholder || "#111" };
        });

        const homeBackgroundStyle = computed(() => {
            if (homeConfig && homeConfig.backgroundUrl) {
                return { backgroundImage: `url(${homeConfig.backgroundUrl})` };
            }
            return { background: (homeConfig && homeConfig.placeholderGradient) ? homeConfig.placeholderGradient : "#0e0e14" };
        });

        const homeEffectMaskClasses = computed(() => {
            if (homeConfig && homeConfig.maskEffects) {
                return homeConfig.maskEffects.map(e => `fx-${e}`);
            }
            return [];
        });

        const effectMaskClasses = computed(() => activeEffects.value.map(e => `fx-${e}`));
        const currentSpeakerId = computed(() => currentStep.value ? (currentStep.value.characterId || null) : null);
        
        const currentSpeakerName = computed(() => {
            if (!currentSpeakerId.value) return "";
            return assetsCharacters[currentSpeakerId.value] ? assetsCharacters[currentSpeakerId.value].name : "";
        });

        const currentSpeakerColor = computed(() => {
            if (!currentSpeakerId.value) return "#fff";
            return assetsCharacters[currentSpeakerId.value] ? assetsCharacters[currentSpeakerId.value].color : "#fff";
        });
        
        const currentAvatarUrl = computed(() => {
            if (!currentSpeakerId.value) return "";
            const charObj = assetsCharacters[currentSpeakerId.value];
            if (!charObj) return "";
            const currentStageSprite = stageCharacters.value[currentSpeakerId.value]?.spriteId;
            return charObj.avatars?.[currentStageSprite] || charObj.avatars?.['normal'] || "";
        });

        const shouldShowAvatar = computed(() => currentSpeakerId.value && currentSpeakerId.value !== lastSpeakerId.value);
        const availableChoices = computed(() => currentStep.value ? (currentStep.value.choices || []) : []);

        const inspectedItemDynamicDescription = computed(() => {
            if (!selectedBagItemId.value) return "";
            return window.getDynamicItemDescription(selectedBagItemId.value, gameState.value.flags);
        });

        const loadAllMatrixSlots = () => {
            const raw = localStorage.getItem("gal_matrix_save_slots");
            if (raw) saveSlotsData.value = JSON.parse(raw);
            else saveSlotsData.value = {};
            
            const savedGallery = localStorage.getItem("gal_gallery_achievements");
            if (savedGallery) unlockedGalleries.value = JSON.parse(savedGallery);

            const savedEndings = localStorage.getItem("gal_endings_achievements");
            if (savedEndings) unlockedEndings.value = JSON.parse(savedEndings);
        };

        const openArchiveSlotsPanel = (mode) => {
            archiveMode.value = mode;
            loadAllMatrixSlots();
            if (currentView.value === 'menu') {
                activeMenuPanel.value = 'archiveSlots'; 
                activeGamePanel.value = null;
            } else {
                activeGamePanel.value = 'archiveSlots';
                activeMenuPanel.value = null;
            }
        };

        const executeSlotSave = (slotId) => {
            const now = new Date();
            const timeString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            
            let bgRender = "#111";
            let sceneBgUrl = null;
            if (currentStep.value && currentStep.value.sceneId) {
                const sc = scenes[currentStep.value.sceneId];
                if (sc) {
                    bgRender = sc.bgPlaceholder || "#111";
                    sceneBgUrl = sc.url || null;   // 存储场景图片 URL
                }
            }

            saveSlotsData.value[slotId] = {
                currentChapterId: currentChapterId.value,
                currentStepIndex: currentStepIndex.value,
                gameState: JSON.parse(JSON.stringify(gameState.value)),
                stageCharacters: JSON.parse(JSON.stringify(stageCharacters.value)),
                historyLogs: JSON.parse(JSON.stringify(historyLogs.value)),
                lastSpeakerId: lastSpeakerId.value,
                activeCG: JSON.parse(JSON.stringify(activeCG.value)),
                activeEffects: JSON.parse(JSON.stringify(activeEffects.value)),
                currentScreenEffect: currentScreenEffect.value,
                bgRenderStyle: bgRender,
                sceneBgUrl: sceneBgUrl,          // 新增：场景背景图片
                cgUrl: activeCG.value ? activeCG.value.url : null,
                textBrief: currentStep.value && currentStep.value.text ? currentStep.value.text.substring(0, 14) + '...' : '分支选择中',
                speaker: currentSpeakerName.value || null,
                saveTime: timeString
            };

            localStorage.setItem("gal_matrix_save_slots", JSON.stringify(saveSlotsData.value));
            triggerToast(`时空节点 SLOT-${slotId} 保存成功！`);
        };

        const executeSlotLoad = (slotId) => {
            const payload = saveSlotsData.value[slotId];
            if (!payload) return;

            clearTimeout(autoAdvanceTimer);
            if (homeFxManager) { homeFxManager.clear(); homeFxManager = null; }
            itemToastQueue.value = [];
            isShowingItemToast.value = false;
            stageDisplayItem.value = null;
            pendingEnding.value = null;
            sceneBgFailed.value = false;   // 重置背景失败标志

            currentChapterId.value = payload.currentChapterId;
            currentStepIndex.value = payload.currentStepIndex;
            gameState.value = JSON.parse(JSON.stringify(payload.gameState));
            stageCharacters.value = JSON.parse(JSON.stringify(payload.stageCharacters));
            historyLogs.value = JSON.parse(JSON.stringify(historyLogs.value)); // 注意：historyLogs 已存储，应使用 payload.historyLogs
            // 修正上面：应该使用 payload.historyLogs
            historyLogs.value = JSON.parse(JSON.stringify(payload.historyLogs));
            lastSpeakerId.value = payload.lastSpeakerId;
            activeCG.value = JSON.parse(JSON.stringify(payload.activeCG));
            activeEffects.value = payload.activeEffects;
            currentScreenEffect.value = payload.currentScreenEffect || "";

            currentView.value = "game";
            activeGamePanel.value = null;
            activeMenuPanel.value = null;
            uiVisible.value = true;

            nextTick(() => {
                updateScale();
                const el = document.getElementById('particles-container');
                if (el) {
                    fxManager = new GameEffectsManager(el);
                    if (currentScreenEffect.value) fxManager.play(currentScreenEffect.value);
                }
                // 触发场景背景预检测
                updateSceneBgTest();
                executeStep();
                triggerToast(`已成功跃迁至节点 SLOT-${slotId}`);
            });
        };

        const executeSlotClear = (slotId) => {
            delete saveSlotsData.value[slotId];
            localStorage.setItem("gal_matrix_save_slots", JSON.stringify(saveSlotsData.value));
            triggerToast(`时空文件 SLOT-${slotId} 已粉碎清空。`, "info");
        };

        const handleGameViewRightClick = (e) => {
            uiVisible.value = !uiVisible.value;
        };

        const clickGalleryItem = (id) => {
            if (unlockedGalleries.value[id]) {
                openLightbox(assetsCgLibrary[id].url);
            }
        };

        const openLightbox = (url) => { if (url) lightboxUrl.value = url; };
        const closeLightbox = () => { lightboxUrl.value = ""; };

        /**
         * 自适应分辨率缩放核心
         *
         * 策略：
         * 1. 以 1280×720 (16:9) 为设计基准
         * 2. 使用 CSS transform: scale() 等比缩放整个视口
         * 3. 保持宽高比，窗口超出部分显示黑色信箱背景
         * 4. 最小缩放 0.35，防止极窄窗口下视口完全不可见
         * 5. 考虑 devicePixelRatio 保证清晰度
         * 6. 移动端竖屏时自动提示旋转
         */
        const updateScale = () => {
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            // 计算缩放比例：取宽、高中较小的那个方向
            const scaleX = winW / viewportWidth;
            const scaleY = winH / viewportHeight;
            const rawScale = Math.min(scaleX, scaleY);

            // 限制最小缩放（极窄窗口保护）
            scale.value = Math.max(rawScale, 0.35);

            // 记录实际显示尺寸
            viewportDisplayWidth.value = Math.round(viewportWidth * scale.value);
            viewportDisplayHeight.value = Math.round(viewportHeight * scale.value);

            // 横竖屏检测
            isLandscape.value = winW >= winH;

            // 移动端检测
            isMobile.value = winW < 768 || winH < 768;

            // 将缩放比注入全局 CSS 自定义属性，供子元素按需使用
            const root = document.documentElement;
            root.style.setProperty('--game-scale', scale.value);
            root.style.setProperty('--game-scale-percent', `${(scale.value * 100).toFixed(1)}%`);
            root.style.setProperty('--game-win-w', `${winW}px`);
            root.style.setProperty('--game-win-h', `${winH}px`);
            root.style.setProperty('--game-is-landscape', isLandscape.value ? '1' : '0');
            root.style.setProperty('--game-is-mobile', isMobile.value ? '1' : '0');
        };

        /**
         * 带防抖的 resize 处理（避免频繁触发重计算）
         */
        const handleResize = () => {
            clearTimeout(resizeDebounceTimer);
            resizeDebounceTimer = setTimeout(() => {
                updateScale();
            }, 80);
        };

        /**
         * 处理设备方向变化（移动端）
         */
        const handleOrientationChange = () => {
            // 方向变化后延迟一点，等浏览器更新窗口尺寸
            setTimeout(() => {
                updateScale();
            }, 200);
        };

        const openCharactersPanel = () => {
            activeMenuPanel.value = 'characters';
            const firstCharId = Object.keys(assetsCharacters)[0] || null;
            switchInspectedCharacter(firstCharId);
        };

        const switchInspectedCharacter = (charId) => {
            activeInspectedCharId.value = charId;
            if (charId && assetsCharacters[charId]) {
                const firstSpriteId = Object.keys(assetsCharacters[charId].sprites)[0] || null;
                switchInspectedSprite(firstSpriteId);
            }
        };

        const switchInspectedSprite = (spriteId) => {
            activeSpriteIdForInspection.value = spriteId;
            if (inspectedChar.value && spriteId) {
                activeInspectedSpriteUrl.value = inspectedChar.value.sprites[spriteId]?.url || "";
            } else {
                activeInspectedSpriteUrl.value = "";
            }
        };

        const handleArchiveSpriteError = () => { activeInspectedSpriteUrl.value = ""; };

        const initHomeEffects = () => {
            nextTick(() => {
                const homeEl = document.getElementById('home-particles-container');
                if (homeEl && homeConfig && homeConfig.screenEffect) {
                    homeFxManager = new GameEffectsManager(homeEl);
                    homeFxManager.play(homeConfig.screenEffect);
                }
            });
        };

        const startNewGame = () => {
            clearTimeout(autoAdvanceTimer);
            if (homeFxManager) { homeFxManager.clear(); homeFxManager = null; }

            currentChapterId.value = "main"; 
            currentStepIndex.value = 0;
            gameState.value = { money: 100, inventory: ["log", "amulet"], flags: {} };
            stageCharacters.value = {}; 
            historyLogs.value = [];
            lastSpeakerId.value = null; 
            triggeredEnding.value = null;
            activeEffects.value = []; 
            currentScreenEffect.value = "";
            activeCG.value = null;
            uiVisible.value = true;
            itemToastQueue.value = [];
            isShowingItemToast.value = false;
            stageDisplayItem.value = null;
            selectedBagItemId.value = null;
            pendingEnding.value = null;
            sceneBgFailed.value = false;
            currentView.value = "game";
            
            nextTick(() => {
                updateScale();
                const el = document.getElementById('particles-container');
                if (el) fxManager = new GameEffectsManager(el);
                updateSceneBgTest();
                executeStep();
            });
        };

        // 检测当前场景背景图片是否加载失败
        const updateSceneBgTest = () => {
            if (!currentStep.value || !currentStep.value.sceneId) {
                currentSceneTestUrl.value = null;
                return;
            }
            const sc = scenes[currentStep.value.sceneId];
            if (sc && sc.url) {
                currentSceneTestUrl.value = sc.url;
                // 重置失败标志，因为新的场景可能会成功
                sceneBgFailed.value = false;
                // 使用 Image 对象预加载，若失败则标记
                const img = new Image();
                img.onload = () => { 
                    if (currentSceneTestUrl.value === sc.url) sceneBgFailed.value = false; 
                };
                img.onerror = () => { 
                    if (currentSceneTestUrl.value === sc.url) sceneBgFailed.value = true; 
                };
                img.src = sc.url;
            } else {
                currentSceneTestUrl.value = null;
                sceneBgFailed.value = true;
            }
        };

        const onSceneBgError = () => {
            sceneBgFailed.value = true;
        };

        const clearFutureHistoryLog = (currentIndex) => {
            if (historyLogs.value.length > currentIndex) {
                historyLogs.value = historyLogs.value.slice(0, currentIndex + 1);
            }
        };

        const processItemToastQueue = () => {
            if (isShowingItemToast.value || itemToastQueue.value.length === 0) return;
            
            isShowingItemToast.value = true;
            const itemTask = itemToastQueue.value.shift();
            
            const preset = window.ITEM_ANIMATION_PRESETS[itemTask.mode]?.[itemTask.approach] || { class: "fx-item-find", title: "物品更新" };
            stageDisplayItem.value = {
                name: window.getItemName(itemTask.itemId),
                icon: window.getItemIcon(itemTask.itemId),
                titleLabel: preset.title,
                animClass: preset.class,
                description: window.getDynamicItemDescription(itemTask.itemId, gameState.value.flags)
            };
        };

        const triggerItemStageToast = (itemId, mode = "gain", approach = "find") => {
            itemToastQueue.value.push({ itemId, mode, approach });
            processItemToastQueue();
        };

        const dismissItemStageToast = () => {
            stageDisplayItem.value = null;
            setTimeout(() => {
                isShowingItemToast.value = false;
                processItemToastQueue();
            }, 300);
        };

        const openInventoryPanel = () => {
            showInventory.value = true;
            if (gameState.value.inventory.length > 0) {
                selectedBagItemId.value = gameState.value.inventory[0];
            } else {
                selectedBagItemId.value = null;
            }
        };

        const selectItemForInspection = (itemId) => {
            selectedBagItemId.value = itemId;
        };

        const queryItemIcon = (itemId) => window.getItemIcon(itemId);
        const queryItemName = (itemId) => window.getItemName(itemId);

        // ========= 核心执行步骤 =========
        const executeStep = () => {
            clearTimeout(autoAdvanceTimer);
            avatarLoadFail.value = false;
            const step = currentStep.value;
            if (!step) { autoMatchEnding(); return; }

            // 每进入新步骤，重新检测场景背景
            updateSceneBgTest();

            if (step.gainItem) {
                const itemId = step.gainItem;
                const approach = step.gainApproach || "find";
                if (!gameState.value.inventory.includes(itemId)) {
                    gameState.value.inventory.push(itemId);
                    triggerItemStageToast(itemId, "gain", approach);
                }
            }

            if (step.loseItem) {
                const itemId = step.loseItem;
                const approach = step.loseApproach || "use"; 
                const index = gameState.value.inventory.indexOf(itemId);
                if (index > -1) {
                    gameState.value.inventory.splice(index, 1);
                    triggerItemStageToast(itemId, "lose", approach);
                    if (selectedBagItemId.value === itemId) selectedBagItemId.value = null;
                }
            }

            if (step.updateItem) {
                const updatePayload = step.updateItem;
                if (updatePayload.flag) {
                    gameState.value.flags[updatePayload.flag] = true;
                }
                triggerItemStageToast(updatePayload.id, "update", "change");
            }

            if (step.flag) gameState.value.flags[step.flag] = true;

            if (step.cgChanges) {
                const cg = step.cgChanges;
                if (cg.action === "enter") {
                    const assetCg = assetsCgLibrary[cg.id];
                    activeCG.value = {
                        id: cg.id, 
                        url: assetCg ? assetCg.url : "",
                        animation: cg.animation || "scaleIn",
                        effectClass: cg.effect ? `fx-${cg.effect}` : ""
                    };
                    unlockedGalleries.value[cg.id] = true;
                    localStorage.setItem("gal_gallery_achievements", JSON.stringify(unlockedGalleries.value));
                } else if (cg.action === "update" && activeCG.value) {
                    activeCG.value.animation = cg.animation || "pulse";
                    if (cg.effect) activeCG.value.effectClass = `fx-${cg.effect}`;
                } else if (cg.action === "leave" && activeCG.value) {
                    activeCG.value.animation = cg.animation || "fadeOut";
                    setTimeout(() => { activeCG.value = null; }, 550);
                }
            }

            if (step.effects !== undefined) {
                activeEffects.value = step.effects;
            }
            if (step.screenEffect !== undefined) {
                if (step.screenEffect !== currentScreenEffect.value) {
                    currentScreenEffect.value = step.screenEffect;
                    if (fxManager) fxManager.play(currentScreenEffect.value);
                }
            }

            if (step.characterChanges) {
                step.characterChanges.forEach(ch => {
                    if (ch.action === "enter" || ch.action === "update") {
                        stageCharacters.value[ch.id] = {
                            id: ch.id, spriteId: ch.spriteId,
                            url: assetsCharacters[ch.id]?.sprites[ch.spriteId]?.url || "",
                            animation: ch.animation || ""
                        };
                    }
                });
            }

            if (step.type === "ending") {
                const endingObj = window.ENDINGS.find(e => e.id === step.endingId);
                if (endingObj) {
                    pendingEnding.value = endingObj;
                    const fakeStep = {
                        type: "dialogue",
                        characterId: null,
                        text: endingObj.description,
                        speed: 25,
                        autoAdvance: false
                    };
                    startTypewriter(fakeStep.text, fakeStep.speed);
                    return;
                } else {
                    triggerEnding(step.endingId);
                }
                return;
            }

            if (step.type === "dialogue") {
                let calculatedSpeed = window.GAME_CONFIG.textSpeed; 
                if (step.characterId && assetsCharacters[step.characterId]?.defaultSpeed !== undefined) {
                    calculatedSpeed = assetsCharacters[step.characterId].defaultSpeed;
                }
                if (step.speed !== undefined) {
                    calculatedSpeed = step.speed;
                }

                startTypewriter(step.text, calculatedSpeed);
                
                const logMeta = {
                    chapterId: currentChapterId.value,
                    stepIndex: currentStepIndex.value,
                    speaker: currentSpeakerName.value,
                    color: currentSpeakerColor.value,
                    text: step.text,
                    snap: JSON.parse(JSON.stringify({
                        gameState: gameState.value,
                        stageCharacters: stageCharacters.value,
                        activeCG: activeCG.value,
                        activeEffects: activeEffects.value,
                        currentScreenEffect: currentScreenEffect.value,
                        lastSpeakerId: lastSpeakerId.value
                    }))
                };
                
                const isExist = historyLogs.value.some(l => l.chapterId === logMeta.chapterId && l.stepIndex === logMeta.stepIndex);
                if (!isExist) historyLogs.value.push(logMeta);
            } else if (step.type === "choice") {
                clearInterval(typingTimer);
                typingFinished.value = true;
            }
        };

        const startTypewriter = (text, speed) => {
            clearInterval(typingTimer); typedText.value = ""; typingFinished.value = false;
            let index = 0;
            typingTimer = setInterval(() => {
                if (index < text.length) typedText.value += text[index++];
                else { 
                    clearInterval(typingTimer); 
                    typingFinished.value = true; 
                    if (!pendingEnding.value && currentStep.value && currentStep.value.autoAdvance) {
                        const delay = currentStep.value.autoDelay || 1500;
                        autoAdvanceTimer = setTimeout(() => {
                            advanceStory();
                        }, delay);
                    }
                }
            }, speed);
        };

        // 全局点击推进（适用于任何空白区域）
        const globalAdvance = () => {
            // 只在游戏视图、且界面可见、且没有分支选项阻塞时，且当前步骤为对话或结局等待时，才推进
            if (currentView.value !== 'game') return;
            if (!uiVisible.value) return;
            if (stageDisplayItem.value) return; // 物品展示时不能推进
            if (currentStep.value && currentStep.value.type === 'choice') return; // 分支选项时不能点击空白推进
            if (triggeredEnding.value) return;   // 结局画面时不能推进
            
            // 如果正在打字中，则强制完成打字（调用 advanceStory 内部会处理）
            if (!typingFinished.value) {
                // 直接调用 advanceStory，它会完成打字
                advanceStory();
            } else {
                // 已完成打字，也可以推进（如果当前是对话或结局等待）
                advanceStory();
            }
        };

        const advanceStory = () => {
            if (!uiVisible.value) return; 
            if (stageDisplayItem.value) { dismissItemStageToast(); return; } 
            if (!typingFinished.value) {
                clearInterval(typingTimer); typedText.value = currentStep.value.text; typingFinished.value = true; 
                if (!pendingEnding.value && currentStep.value && currentStep.value.autoAdvance) {
                    const delay = currentStep.value.autoDelay || 1500;
                    autoAdvanceTimer = setTimeout(() => { advanceStory(); }, delay);
                }
                return;
            }

            if (pendingEnding.value) {
                triggerEnding(pendingEnding.value.id);
                pendingEnding.value = null;
                return;
            }

            lastSpeakerId.value = currentSpeakerId.value;
            
            if (currentStep.value && currentStep.value.jumpChapter) {
                clearFutureHistoryLog(historyLogs.value.length - 1);
                currentChapterId.value = currentStep.value.jumpChapter;
                currentStepIndex.value = 0;
                lastSpeakerId.value = null;
            } else {
                currentStepIndex.value++; 
            }
            
            executeStep();
        };

        const selectChoice = (choice) => {
            clearFutureHistoryLog(historyLogs.value.length - 1);
            
            itemToastQueue.value = [];
            isShowingItemToast.value = false;
            stageDisplayItem.value = null;

            if (choice.flag) gameState.value.flags[choice.flag] = true;
            if (choice.loseMoney) gameState.value.money -= choice.loseMoney;
            
            if (choice.gainItem) {
                const itemId = choice.gainItem;
                const approach = choice.gainApproach || "find";
                if (!gameState.value.inventory.includes(itemId)) {
                    gameState.value.inventory.push(itemId);
                    triggerItemStageToast(itemId, "gain", approach);
                }
            }
            if (choice.loseItem) {
                const itemId = choice.loseItem;
                const approach = choice.loseApproach || "use";
                const index = gameState.value.inventory.indexOf(itemId);
                if (index > -1) {
                    gameState.value.inventory.splice(index, 1);
                    triggerItemStageToast(itemId, "lose", approach);
                    if (selectedBagItemId.value === itemId) selectedBagItemId.value = null;
                }
            }
            if (choice.updateItem) {
                const updatePayload = choice.updateItem;
                if (updatePayload.flag) gameState.value.flags[updatePayload.flag] = true;
                triggerItemStageToast(updatePayload.id, "update", "change");
            }

            if (choice.jumpChapter) {
                currentChapterId.value = choice.jumpChapter; 
                currentStepIndex.value = 0; 
                lastSpeakerId.value = null; 
            } else {
                currentStepIndex.value++; 
            }
            executeStep();
        };

        const rollbackToTimeline = (logIndex) => {
            const targetLog = historyLogs.value[logIndex];
            if (!targetLog || !targetLog.snap) return;

            clearTimeout(autoAdvanceTimer);
            itemToastQueue.value = [];
            isShowingItemToast.value = false;
            stageDisplayItem.value = null;
            pendingEnding.value = null;
            
            historyLogs.value = historyLogs.value.slice(0, logIndex + 1);
            currentChapterId.value = targetLog.chapterId;
            currentStepIndex.value = targetLog.stepIndex;

            const snap = targetLog.snap;
            gameState.value = JSON.parse(JSON.stringify(snap.gameState));
            stageCharacters.value = JSON.parse(JSON.stringify(snap.stageCharacters));
            activeCG.value = JSON.parse(JSON.stringify(snap.activeCG));
            activeEffects.value = snap.activeEffects;
            lastSpeakerId.value = snap.lastSpeakerId;

            if (snap.currentScreenEffect !== currentScreenEffect.value) {
                currentScreenEffect.value = snap.currentScreenEffect;
                if (fxManager) fxManager.play(currentScreenEffect.value);
            }

            showLog.value = false;
            executeStep();
            triggerToast("已成功返回至历史该剧情点", "info");
        };

        const safelyExitToMenu = () => {
            clearTimeout(autoAdvanceTimer);
            if (fxManager) fxManager.clear();
            currentView.value = "menu";
            activeGamePanel.value = null;
            activeMenuPanel.value = null;
            loadAllMatrixSlots();
            initHomeEffects();
        };

        const autoMatchEnding = () => triggerEnding("bad_end");
        
        const triggerEnding = (id) => {
            const ed = window.ENDINGS.find(e => e.id === id);
            triggeredEnding.value = ed || { title: "未知终局", description: "斩断的时空线。" };
            
            unlockedEndings.value[id] = true;
            localStorage.setItem("gal_endings_achievements", JSON.stringify(unlockedEndings.value));
        };

        const exitToMenu = () => { 
            clearTimeout(autoAdvanceTimer);
            if (fxManager) fxManager.clear(); 
            currentView.value = "menu"; 
            loadAllMatrixSlots(); 
            initHomeEffects();
        };
        
        const handleSpriteError = (charId) => { 
            if (stageCharacters.value[charId]) stageCharacters.value[charId].url = ""; 
        };

        const getCharName = (id) => assetsCharacters[id]?.name || id;
        const getCharColor = (id) => assetsCharacters[id]?.color || "#fff";
        const getCharMeta = (id) => `${assetsCharacters[id]?.race || '人类'} · ${assetsCharacters[id]?.gender || '?'}`;
        const getCharEmoji = (id, sid) => assetsCharacters[id]?.sprites[sid]?.label?.split(" ")[0] || "👤";
        
        const hexToRgb = (hex) => {
            let c = hex.substring(1);
            if(c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
            const x = parseInt(c, 16);
            return `${(x >> 16) & 255}, ${(x >> 8) & 255}, ${x & 255}`;
        };

        onMounted(() => {
            updateScale();
            window.addEventListener('resize', handleResize);
            window.addEventListener('orientationchange', handleOrientationChange);
            if (window.matchMedia) {
                const mq = window.matchMedia('(orientation: portrait)');
                if (mq.addEventListener) {
                    mq.addEventListener('change', handleOrientationChange);
                }
            }
            loadAllMatrixSlots();
            initHomeEffects();
        });

        onUnmounted(() => {
            clearTimeout(autoAdvanceTimer);
            clearTimeout(resizeDebounceTimer);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleOrientationChange);
        });

        return {
            currentView, activeMenuPanel, activeGamePanel, archiveMode, saveSlotsData, activeInspectedCharId, activeSpriteIdForInspection, unlockedGalleries, configTitle, assetsCharacters, assetsCgLibrary, homeConfig,
            viewportStyle, gameState, stageCharacters, currentStep, typedText, typingFinished, availableChoices,
            currentSpeakerName, currentSpeakerColor, shouldShowAvatar, currentAvatarUrl, avatarLoadFail, activeCG,
            backgroundStyle, homeBackgroundStyle, homeEffectMaskClasses, effectMaskClasses, showLog, showInventory, historyLogs, triggeredEnding, currentSpeakerId,
            inspectedChar, toastMessage, toastType, activeInspectedSpriteUrl, activeInspectedSpriteLabel, lightboxUrl, uiVisible,
            unlockedEndings, fullEndingsList, selectedBagItemId, stageDisplayItem, inspectedItemDynamicDescription,
            startNewGame, advanceStory, selectChoice, handleSpriteError, exitToMenu, rollbackToTimeline,
            safelyExitToMenu, openCharactersPanel, switchInspectedCharacter, switchInspectedSprite, handleArchiveSpriteError,
            openArchiveSlotsPanel, executeSlotSave, executeSlotLoad, executeSlotClear, handleGameViewRightClick, clickGalleryItem, openLightbox, closeLightbox,
            getCharName, getCharColor, getCharMeta, getCharEmoji, hexToRgb, getArchiveEmoji,
            queryItemIcon, queryItemName, openInventoryPanel, selectItemForInspection, dismissItemStageToast,
            globalAdvance, onSceneBgError, currentSceneTestUrl   // 暴露给模板
        };
    }
}).mount('#app');