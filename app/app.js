/**
 * app/app.js
 *
 * Vue 3 应用入口 —— Galgame 的 UI 表现层。
 *
 * 架构：
 *   本文件仅负责 Vue 组件的组装与模板渲染。
 *   所有游戏逻辑由 GalEngine 内核处理（engine/），
 *   所有故事数据由 game/ 目录或资源包提供，
 *   composables/ 负责引擎 ↔ Vue 的桥接。
 *
 * 支持两种数据加载模式：
 *   1. 静态导入（默认） —— 直接 import game/ 数据
 *   2. 资源包加载 —— 通过 ResourceManager 从目录/ZIP 加载
 */

// 静态导入回退数据
import * as GameData from '../resource-packs/default/index.js';
import { useEngine } from './composables/use-engine.js';
import { useScale }  from './composables/use-scale.js';
import { useToast }  from './composables/use-toast.js';
import { useKeybindings } from './composables/use-keybindings.js';
import { useSettings }   from './composables/use-settings.js';
import { getDynamicItemDescription as getDynamicDesc, getItemIcon, getItemImage, getItemName } from '../engine/index.js';

const { createApp, ref, computed, watch, onMounted, onUnmounted, nextTick } = Vue;

// ── 版本信息 ──
const ENGINE_VERSION = '0.1.2';
const STORY_VERSION  = '1.0.0';

createApp({
    setup() {
        // ================================================================
        //  引擎桥接
        // ================================================================
        const engineCtx = useEngine();

        // 初始化引擎 —— 优先使用编辑器同步数据，回退到静态导入
        const editorData = engineCtx.loadEditorData();
        let engineInputData = GameData;
        if (editorData && editorData.chapters) {
            console.log('[App] 检测到编辑器同步数据，合并到引擎输入...');
            engineInputData = {
                ...GameData,
                STORY_CHAPTERS: editorData.chapters,
                CHARACTERS: editorData.characters || GameData.CHARACTERS,
                SCENES: editorData.scenes || GameData.SCENES,
                CG_LIBRARY: editorData.cgLibrary || GameData.CG_LIBRARY,
                ITEMS: editorData.items || GameData.ITEMS,
                ENDINGS: editorData.endings || GameData.ENDINGS,
                GAME_CONFIG: editorData.config
                    ? { ...GameData.GAME_CONFIG, ...editorData.config }
                    : GameData.GAME_CONFIG,
            };
        }
        engineCtx.initEngine(engineInputData);

        // ── 按键绑定与设置系统 ──
        const keybindings = useKeybindings();
        const userSettings = useSettings();

        // 同步游戏标题到页面 title（从 package/game config 读取）
        document.title = engineInputData.GAME_CONFIG?.title || 'Galgame';

        // ---- 资源包加载状态 ----
        const packLoading = ref(false);
        const packLoadProgress = ref({ percent: 0, status: '', detail: '' });
        const packLoadError = ref('');
        const packMeta = ref(null);

        // ---- 辅助：从 engineCtx.gameData 获取当前活动数据源 ----
        // 当使用静态导入时，gameData 指向 GameData
        // 当从资源包加载时，gameData 指向资源包数据
        function resolveData(key) {
            return engineCtx.gameData.value?.[key] ?? GameData[key];
        }

        // ================================================================
        //  缩放 & Toast
        // ================================================================
        const { scale, displayW, displayH, isLandscape, isMobile,
                update: updateScale, onResize, onOrientationChange, cleanup: cleanupScale } = useScale(
            resolveData('GAME_CONFIG')?.aspectRatio?.width || 1280,
            resolveData('GAME_CONFIG')?.aspectRatio?.height || 720
        );

        const toast = useToast();

        // ================================================================
        //  派生计算属性（使用动态数据源）
        // ================================================================
        const currentStep = computed(() => {
            const pool = resolveData('STORY_CHAPTERS')[engineCtx.currentChapterId.value];
            if (!pool) return null;
            return pool[engineCtx.currentStepIndex.value] || null;
        });

        const currentSpeakerId = computed(() =>
            currentStep.value ? (currentStep.value.characterId || null) : null
        );

        const currentSpeakerName = computed(() => {
            if (!currentSpeakerId.value) return '';
            return resolveData('CHARACTERS')[currentSpeakerId.value]?.name || '';
        });

        const currentSpeakerColor = computed(() => {
            if (!currentSpeakerId.value) return '#fff';
            return resolveData('CHARACTERS')[currentSpeakerId.value]?.color || '#fff';
        });

        const currentAvatarUrl = computed(() => {
            if (!currentSpeakerId.value) return '';
            const char = resolveData('CHARACTERS')[currentSpeakerId.value];
            if (!char) return '';
            const spriteId = engineCtx.stageCharacters.value[currentSpeakerId.value]?.spriteId;
            return char.avatars?.[spriteId] || char.avatars?.['normal'] || '';
        });

        const shouldShowAvatar = computed(() =>
            currentSpeakerId.value && currentSpeakerId.value !== engineCtx.lastSpeakerId.value
        );

        const availableChoices = computed(() =>
            currentStep.value ? (currentStep.value.choices || []) : []
        );

        const highlightedChoiceIndex = ref(0);
        // 步骤/选项变化时重置高亮
        watch([currentStep, availableChoices], () => { highlightedChoiceIndex.value = 0; });

        // ── 主菜单键盘导航 ──
        const menuFocusIndex = ref(0);
        const menuItems = computed(() => {
            const items = [];
            if (engineCtx.hasExitSave.value) {
                items.push({ label: '▶ 继续游戏', action: continueFromExit, cls: 'btn-continue' });
            }
            items.push(
                { label: '从已有存档继续', action: () => openArchiveSlotsPanel('load'), cls: '' },
                { label: '新的旅程', action: confirmStartNewGame, cls: '' },
                { label: '角色名录', action: openCharactersPanel, cls: '' },
                { label: '画廊 CG 图鉴', action: () => { engineCtx.activeMenuPanel.value = 'gallery'; }, cls: '' },
            );
            return items;
        });
        // 菜单项变化时（如隐藏"继续游戏"）修正焦点索引
        watch(menuItems, (items) => {
            if (menuFocusIndex.value >= items.length) {
                menuFocusIndex.value = items.length - 1;
            }
        });
        // 进入主菜单时复位焦点
        watch(() => engineCtx.currentView.value, (view) => {
            if (view === 'menu') menuFocusIndex.value = 0;
        });

        // ── 设置面板 ──
        const showSettings = Vue.ref(false);
        const settingsTab = Vue.ref('keyboard'); // 'keyboard' | 'game'
        const capturingActionId = Vue.ref(null); // 正在捕获按键的动作 ID

        function openSettings() { showSettings.value = true; settingsTab.value = 'keyboard'; }
        function closeSettings() { keybindings.cancelCapture(); capturingActionId.value = null; showSettings.value = false; }

        // ── 画廊键盘导航 ──
        const galleryFocusIndex = Vue.ref(0);
        const galleryCgIds = Vue.computed(() => Object.keys(resolveData('CG_LIBRARY') || {}));
        watch(galleryCgIds, (ids) => { if (galleryFocusIndex.value >= ids.length) galleryFocusIndex.value = ids.length - 1; });
        // 画廊面板多区域导航：画廊网格 / 结局 / 章节 / 清除记忆
        const gallerySection = Vue.ref('gallery');
        const endingFocusIndex = Vue.ref(0);
        const chapterFocusIndex = Vue.ref(0);

        // ── 存档槽位键盘导航 ──
        const slotFocusIndex = Vue.ref(0);

        // ── 角色表情导航 ──
        const spriteFocusIndex = Vue.ref(0);

        // ── 背包物品导航 ──
        const inventoryFocusIndex = Vue.ref(0);
        watch(() => engineCtx.gameState.value.inventory, (inv) => {
            if (inventoryFocusIndex.value >= inv.length) inventoryFocusIndex.value = inv.length - 1;
        });

        const viewportStyle = computed(() => {
            const cfg = resolveData('GAME_CONFIG');
            return {
                width: `${cfg?.aspectRatio?.width || 1280}px`,
                height: `${cfg?.aspectRatio?.height || 720}px`,
                transform: `translate(-50%, -50%) scale(${scale.value})`,
                '--viewport-scale': scale.value,
                '--viewport-display-width': `${displayW.value}px`,
                '--viewport-display-height': `${displayH.value}px`,
            };
        });

        const backgroundStyle = computed(() => {
            if (!currentStep.value?.sceneId) return { background: '#000' };
            const sc = resolveData('SCENES')[currentStep.value.sceneId];
            if (!sc) return { background: '#000' };
            if (sc.url && !engineCtx.sceneBgFailed.value) {
                return { backgroundImage: `url(${sc.url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
            }
            return { background: sc.bgPlaceholder || '#111' };
        });

        const homeBackgroundStyle = computed(() => {
            const hc = resolveData('HOME_CONFIG');
            if (hc?.backgroundUrl) return { backgroundImage: `url(${hc.backgroundUrl})` };
            return { background: hc?.placeholderGradient || '#0e0e14' };
        });

        const panelBackgroundStyle = computed(() => {
            const hc = resolveData('HOME_CONFIG');
            const pb = hc?.panelBackground;
            if (!pb) return { background: 'rgba(4,4,10,0.98)' };
            const bg = pb.url
                ? { backgroundImage: `url(${pb.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: pb.overlayGradient || 'rgba(4,4,10,0.98)' };
            return {
                ...bg,
                // 用伪元素实现叠加遮罩无法通过 inline style 完成，直接用 background-blend
                ...(pb.url && pb.overlayColor ? {
                    backgroundImage: `linear-gradient(${pb.overlayColor}, ${pb.overlayColor}), url(${pb.url})`,
                    backgroundBlendMode: 'normal',
                } : {}),
            };
        });

        const homeEffectMaskClasses = computed(() => {
            const hc = resolveData('HOME_CONFIG');
            return hc?.maskEffects ? hc.maskEffects.map(e => `fx-${e}`) : [];
        });

        const effectMaskClasses = computed(() =>
            engineCtx.activeEffects.value.map(e => `fx-${e}`)
        );

        // 角色名录
        const inspectedChar = computed(() => {
            if (!engineCtx.activeInspectedCharId.value) return null;
            return resolveData('CHARACTERS')[engineCtx.activeInspectedCharId.value] || null;
        });

        const activeInspectedSpriteLabel = computed(() => {
            if (!inspectedChar.value || !engineCtx.activeSpriteIdForInspection.value) return '';
            return inspectedChar.value.sprites?.[engineCtx.activeSpriteIdForInspection.value]?.label || '';
        });

        const getArchiveEmoji = computed(() =>
            activeInspectedSpriteLabel.value.split(' ')[0] || '👤'
        );

        // 物品动态描述
        const inspectedItemDynamicDescription = computed(() => {
            if (!engineCtx.selectedBagItemId.value) return '';
            // 使用 engine 层的 getDynamicItemDescription（通过 gameData 中的 items）
            const items = resolveData('ITEMS');
            const flags = engineCtx.gameState.value.flags;
            return getDynamicDesc(engineCtx.selectedBagItemId.value, flags, items);
        });

        // ================================================================
        //  资源包加载
        // ================================================================
        async function loadResourcePack(packPath) {
            packLoading.value = true;
            packLoadError.value = '';
            packLoadProgress.value = { percent: 0, status: 'init', detail: '开始加载资源包...' };

            try {
                await engineCtx.loadPackFromPath(packPath, (progress) => {
                    packLoadProgress.value = progress;
                });
                packMeta.value = engineCtx.getPackMeta();
                toast.show(`资源包 "${packMeta.value?.packTitle || packMeta.value?.packName}" 加载成功！`);
            } catch (e) {
                packLoadError.value = e.message;
                toast.show(`资源包加载失败: ${e.message}`, 'info');
            } finally {
                packLoading.value = false;
            }
        }

        async function importResourcePack(zipFile) {
            packLoading.value = true;
            packLoadError.value = '';

            try {
                await engineCtx.importPackFromZip(zipFile);
                packMeta.value = engineCtx.getPackMeta();
                toast.show(`资源包 "${packMeta.value?.packTitle || packMeta.value?.packName}" 导入成功！`);
            } catch (e) {
                packLoadError.value = e.message;
                toast.show(`资源包导入失败: ${e.message}`, 'info');
            } finally {
                packLoading.value = false;
            }
        }

        // ================================================================
        //  操作方法
        // ================================================================

        function openArchiveSlotsPanel(mode) {
            engineCtx.archiveMode.value = mode;
            engineCtx.loadSaveSlots();
            if (engineCtx.currentView.value === 'menu') {
                engineCtx.activeMenuPanel.value = 'archiveSlots';
                engineCtx.activeGamePanel.value = null;
            } else {
                engineCtx.activeGamePanel.value = 'archiveSlots';
                engineCtx.activeMenuPanel.value = null;
            }
        }

        function executeSlotSave(slotId) {
            try {
                const now = new Date();
                const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

                const step = currentStep.value;
                let bgRender = '#111';
                let sceneUrl = null;
                if (step?.sceneId) {
                    const sc = resolveData('SCENES')[step.sceneId];
                    if (sc) { bgRender = sc.bgPlaceholder || '#111'; sceneUrl = sc.url || null; }
                }

                // 安全截断文本：防止超长文本导致存档数据过大
                let textBrief = '分支选择中';
                try {
                    if (step?.text) {
                        textBrief = String(step.text).substring(0, 14) + '...';
                    } else if (step?.type === 'choice') {
                        textBrief = '分支选择中';
                    }
                } catch (e) { /* ignore */ }

                const ok = engineCtx.saveGame(slotId, {
                    bgRenderStyle: bgRender,
                    sceneBgUrl: sceneUrl,
                    cgUrl: engineCtx.activeCG.value?.url || null,
                    textBrief,
                    speaker: currentSpeakerName.value || null,
                    saveTime: timeStr,
                });

                if (ok) toast.show(`时空节点 SLOT-${slotId} 保存成功！`);
                else toast.show('存档失败，请查看控制台日志', 'info');
            } catch (e) {
                console.error('[App] executeSlotSave 异常:', e);
                toast.show('存档异常: ' + e.message, 'info');
            }
        }

        function executeSlotLoad(slotId) {
            const ok = engineCtx.loadGame(slotId);
            if (ok) {
                toast.show(`已成功跃迁至节点 SLOT-${slotId}`);
            }
        }

        function executeSlotClear(slotId) {
            const ok = engineCtx.clearSaveSlot(slotId);
            if (ok) toast.show(`时空文件 SLOT-${slotId} 已粉碎清空。`, 'info');
        }

        function handleGameViewRightClick(e) {
            engineCtx.uiVisible.value = !engineCtx.uiVisible.value;
        }

        function startNewGame() {
            engineCtx.startNewGame();
            nextTick(() => updateScale());
        }

        function safelyExitToMenu() {
            engineCtx.saveExitState(); // 保存退出暂存
            engineCtx.clearGameEffects();
            engineCtx.currentView.value = 'menu';
            engineCtx.activeGamePanel.value = null;
            engineCtx.activeMenuPanel.value = null;
            engineCtx.loadSaveSlots();
            engineCtx.initHomeEffects(resolveData('HOME_CONFIG'));
        }

        function confirmStartNewGame() {
            // 检查是否存在剧情数据
            const chapters = resolveData('STORY_CHAPTERS');
            if (!chapters || Object.keys(chapters).length === 0) {
                engineCtx.showDialog({
                    type: 'alert',
                    title: '无法开始游戏',
                    message: '当前资源包中不存在任何剧情章节。\n请先通过编辑器创建剧情，或加载有效的资源包。',
                    confirmText: '确定',
                });
                return;
            }
            if (engineCtx.hasExitSave.value) {
                engineCtx.showDialog({
                    type: 'confirm',
                    title: '开始新旅程',
                    message: '当前存在退出暂存，开始新游戏将覆盖该进度。\n确定要继续吗？',
                    confirmText: '确定开始',
                    cancelText: '取消',
                }).then(result => {
                    if (result === true) startNewGame();
                });
            } else {
                startNewGame();
            }
        }

        function continueFromExit() {
            const ok = engineCtx.loadExitState();
            if (ok) {
                engineCtx.currentView.value = 'game';
                engineCtx.activeGamePanel.value = null;
                engineCtx.activeMenuPanel.value = null;
                engineCtx.uiVisible.value = true;
                nextTick(() => {
                    engineCtx.updateSceneBgTest();
                    updateScale();
                });
            }
        }

        function globalAdvance() {
            if (engineCtx.currentView.value !== 'game') return;
            if (!engineCtx.uiVisible.value) return;
            if (engineCtx.stageDisplayItem.value) return;
            if (currentStep.value?.type === 'choice') return;
            if (engineCtx.triggeredEnding.value) return;
            engineCtx.advanceStory();
        }

        function advanceStory() {
            engineCtx.advanceStory();
        }

        function selectChoice(choice) {
            cancelChoiceHold(); // 防止按键长按+鼠标点击双重触发
            engineCtx.selectChoice(choice);
        }

        function rollbackToTimeline(logIndex) {
            const ok = engineCtx.rollbackToTimeline(logIndex);
            if (ok) toast.show('已成功返回至历史该剧情点', 'info');
        }

        function exitToMenu() {
            cancelEndingHold(); // 防止按键长按+鼠标点击双重触发
            engineCtx.clearGameEffects();
            engineCtx.currentView.value = 'menu';
            engineCtx.loadSaveSlots();
            engineCtx.initHomeEffects(resolveData('HOME_CONFIG'));
        }

        function queryItemIcon(itemId) { return getItemIcon(itemId, resolveData('ITEMS')); }
        function queryItemImage(itemId) { return getItemImage(itemId, resolveData('ITEMS')); }
        function queryItemName(itemId) { return getItemName(itemId, resolveData('ITEMS')); }

        function dismissItemStageToast() {
            engineCtx.dismissItemStageToast();
        }

        // 角色名录
        function openCharactersPanel() {
            engineCtx.activeMenuPanel.value = 'characters';
            const firstId = Object.keys(resolveData('CHARACTERS'))[0] || null;
            switchInspectedCharacter(firstId);
        }

        // ── 关于面板 ──
        const showInfoPanel = ref(false);
        function openInfoPanel() { showInfoPanel.value = true; }
        function closeInfoPanel() { showInfoPanel.value = false; }

        function switchInspectedCharacter(charId) {
            engineCtx.activeInspectedCharId.value = charId;
            if (charId && resolveData('CHARACTERS')[charId]) {
                const firstSprite = Object.keys(resolveData('CHARACTERS')[charId].sprites)[0] || null;
                switchInspectedSprite(firstSprite);
            }
        }

        function switchInspectedSprite(spriteId) {
            engineCtx.activeSpriteIdForInspection.value = spriteId;
            if (inspectedChar.value && spriteId) {
                engineCtx.activeInspectedSpriteUrl.value = inspectedChar.value.sprites[spriteId]?.url || '';
            } else {
                engineCtx.activeInspectedSpriteUrl.value = '';
            }
        }

        function handleArchiveSpriteError() {
            engineCtx.activeInspectedSpriteUrl.value = '';
        }

        function clickGalleryItem(id) {
            if (engineCtx.unlockedGalleries.value[id]) {
                openLightbox(resolveData('CG_LIBRARY')[id]?.url);
            }
        }

        function openLightbox(url) { if (url) { engineCtx.lightboxUrl.value = url; engineCtx.lightboxError.value = false; } }
        function closeLightbox() { engineCtx.lightboxUrl.value = ''; engineCtx.lightboxError.value = false; }
        function onLightboxError() { engineCtx.lightboxError.value = true; }

        // ── 清除记忆长按按钮 ──
        const CLEAR_HOLD_MS = 3000;
        const clearProgress = Vue.ref(0);
        const clearHolding = Vue.ref(false);
        let clearHoldTimer = null;
        let clearHoldStart = 0;
        let clearAnimFrame = null;

        function startClearHold() {
            if (clearHolding.value) return;
            clearHolding.value = true;
            clearProgress.value = 0;
            clearHoldStart = Date.now();
            clearHoldTimer = setInterval(() => {
                const elapsed = Date.now() - clearHoldStart;
                clearProgress.value = Math.min(100, (elapsed / CLEAR_HOLD_MS) * 100);
                if (elapsed >= CLEAR_HOLD_MS) {
                    cancelClearHold();
                    // 长按完成 → 弹出确认
                    engineCtx.showDialog({
                        type: 'confirm',
                        title: '清除所有记忆',
                        message: '确定要清除所有画廊解锁、结局记录、章节进度和存档吗？\n\n此操作不可撤销。',
                        confirmText: '确认清除',
                        cancelText: '取消',
                    }).then(result => {
                        if (result === true) {
                            engineCtx.clearAllMemories();
                        }
                    });
                }
            }, 30);
        }

        function cancelClearHold() {
            if (clearHoldTimer) { clearInterval(clearHoldTimer); clearHoldTimer = null; }
            clearHolding.value = false;
            clearProgress.value = 0;
        }

        // ── ESC长按退出暂存 ──
        const ESC_HOLD_MS = 2000;
        const escHoldProgress = Vue.ref(0);
        const escHolding = Vue.ref(false);
        let escHoldTimer = null;
        let escHoldStart = 0;

        function startEscHold() {
            if (escHolding.value) return;
            escHolding.value = true;
            escHoldProgress.value = 0;
            escHoldStart = Date.now();
            escHoldTimer = setInterval(() => {
                const elapsed = Date.now() - escHoldStart;
                escHoldProgress.value = Math.min(100, (elapsed / ESC_HOLD_MS) * 100);
                if (elapsed >= ESC_HOLD_MS) {
                    cancelEscHold();
                    safelyExitToMenu();
                }
            }, 30);
        }

        function cancelEscHold() {
            if (escHoldTimer) { clearInterval(escHoldTimer); escHoldTimer = null; }
            escHolding.value = false;
            escHoldProgress.value = 0;
        }

        // ── 选项长按选择（防误触） ──
        const CHOICE_HOLD_MS = 1000;
        const choiceHoldProgress = Vue.ref(0);
        const choiceHolding = Vue.ref(false);
        let choiceHoldTimer = null;
        let choiceHoldStart = 0;
        let choiceHoldTarget = null;

        function startChoiceHold(choice) {
            if (choiceHolding.value) return;
            choiceHolding.value = true;
            choiceHoldProgress.value = 0;
            choiceHoldTarget = choice;
            choiceHoldStart = Date.now();
            choiceHoldTimer = setInterval(() => {
                const elapsed = Date.now() - choiceHoldStart;
                choiceHoldProgress.value = Math.min(100, (elapsed / CHOICE_HOLD_MS) * 100);
                if (elapsed >= CHOICE_HOLD_MS) {
                    const target = choiceHoldTarget;
                    cancelChoiceHold();
                    if (target) selectChoice(target);
                }
            }, 30);
        }

        function cancelChoiceHold() {
            if (choiceHoldTimer) { clearInterval(choiceHoldTimer); choiceHoldTimer = null; }
            choiceHolding.value = false;
            choiceHoldProgress.value = 0;
            choiceHoldTarget = null;
        }

        // ── 结局确认长按（防误触） ──
        const ENDING_HOLD_MS = 1000;
        const endingHoldProgress = Vue.ref(0);
        const endingHolding = Vue.ref(false);
        let endingHoldTimer = null;
        let endingHoldStart = 0;

        function startEndingHold() {
            if (endingHolding.value) return;
            endingHolding.value = true;
            endingHoldProgress.value = 0;
            endingHoldStart = Date.now();
            endingHoldTimer = setInterval(() => {
                const elapsed = Date.now() - endingHoldStart;
                endingHoldProgress.value = Math.min(100, (elapsed / ENDING_HOLD_MS) * 100);
                if (elapsed >= ENDING_HOLD_MS) {
                    cancelEndingHold();
                    exitToMenu();
                }
            }, 30);
        }

        function cancelEndingHold() {
            if (endingHoldTimer) { clearInterval(endingHoldTimer); endingHoldTimer = null; }
            endingHolding.value = false;
            endingHoldProgress.value = 0;
        }

        function openInventoryPanel() {
            engineCtx.showInventory.value = true;
            const inv = engineCtx.gameState.value.inventory;
            engineCtx.selectedBagItemId.value = inv.length > 0 ? inv[0] : null;
        }

        function selectItemForInspection(itemId) {
            engineCtx.selectedBagItemId.value = itemId;
        }

        // 辅助
        function getCharName(id)  { return resolveData('CHARACTERS')[id]?.name || id; }
        function getCharColor(id) { return resolveData('CHARACTERS')[id]?.color || '#fff'; }
        function getCharMeta(id)  { return `${resolveData('CHARACTERS')[id]?.race || '人类'} · ${resolveData('CHARACTERS')[id]?.gender || '?'}`; }
        function getCharEmoji(id, sid) { return resolveData('CHARACTERS')[id]?.sprites?.[sid]?.label?.split(' ')[0] || '👤'; }

        function hexToRgb(hex) {
            let c = hex.substring(1);
            if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
            const x = parseInt(c, 16);
            return `${(x >> 16) & 255}, ${(x >> 8) & 255}, ${x & 255}`;
        }

        function handleSpriteError(charId) {
            // 清除引擎中的角色精灵 URL，触发 UI 兜底占位图
            const eng = engineCtx.engine.value;
            if (eng && eng.state && eng.state.stageCharacters && eng.state.stageCharacters[charId]) {
                eng.state.stageCharacters[charId] = {
                    ...eng.state.stageCharacters[charId],
                    url: ''
                };
            }
            // 同时更新 Vue 响应式状态
            const s = engineCtx.stageCharacters.value;
            if (s[charId]) {
                s[charId] = { ...s[charId], url: '' };
            }
        }

        function onSceneBgError() {
            engineCtx.onSceneBgError();
        }

        function onCGError() {
            // CG 图片加载失败 → 清除 activeCG，触发 fallback 或让 UI 显示占位
            const eng = engineCtx.engine.value;
            if (eng && eng.state && eng.state.activeCG) {
                eng.state.activeCG = { ...eng.state.activeCG, url: '' };
            }
            engineCtx.activeCG.value = null;
        }

        // ── 全局键盘快捷键（基于动作 ID 的通用派发系统） ──
        function isInputFocused() {
            const tag = document.activeElement?.tagName || '';
            const editable = document.activeElement?.getAttribute('contenteditable');
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable === 'true';
        }

        let _lastSpaceAdvance = 0;

        // ── 焦点上下文：根据界面状态自动推导当前交互区域 ──
        const focusContext = computed(() => {
            if (engineCtx.lightboxUrl.value) return 'lightbox';
            if (engineCtx.dialogState.show) return 'dialog';

            if (engineCtx.currentView.value === 'game') {
                if (engineCtx.triggeredEnding.value) return 'ending';
                if (currentStep.value?.type === 'choice') return 'choice';
                if (engineCtx.stageDisplayItem.value) return 'item-toast';
                if (engineCtx.activeGamePanel.value) return 'game-panel';
                if (engineCtx.showInventory.value) return 'inventory';
                return 'game';
            }

            if (engineCtx.currentView.value === 'menu') {
                if (showSettings.value) return 'settings';
                if (showInfoPanel.value) return 'info-panel';
                if (engineCtx.activeMenuPanel.value) return 'menu-panel';
                return 'menu';
            }

            return null;
        });

        // ── 主入口：keydown → 匹配动作 → 派发 ──
        function onGlobalKeyDown(e) {
            // 输入框中不响应快捷键（ESC 放行）
            if (isInputFocused() && e.key !== 'Escape') return;

            // 按键捕获模式（设置界面重绑定用）
            if (keybindings.isCapturing.value) {
                keybindings.feedCapturedEvent(e);
                return;
            }

            const ctx = focusContext.value;
            if (!ctx) return;

            // 匹配按键 → 动作 ID
            const actionId = keybindings.matchAction(ctx, e);
            if (!actionId) return;

            e.preventDefault();
            e.stopPropagation();
            handleAction(actionId, e);
        }

        // ── 动作派发表 ──
        function handleAction(actionId, e) {
            switch (actionId) {

                // ════════ 全局 Ctrl 快捷键 ════════
                case 'global.quick-save':
                    quickSave(); break;
                case 'global.quick-load':
                    quickLoad(); break;
                case 'global.new-game':
                    confirmStartNewGame(); break;

                // ════════ 主菜单 ════════
                case 'menu.navigate-up':
                    navigateMenu(-1); break;
                case 'menu.navigate-down':
                    navigateMenu(1); break;
                case 'menu.activate':
                case 'menu.activate-alt':
                    activateMenuItem(); break;
                case 'menu.open-info':
                    openInfoPanel(); break;
                case 'menu.open-settings':
                    openSettings(); break;

                // ════════ 设置面板 ════════
                case 'settings.close':
                    closeSettings(); break;

                // ════════ 关于面板 ════════
                case 'info-panel.close':
                    closeInfoPanel(); break;

                // ════════ 菜单子面板（角色名录 / 画廊 / 存档） ════════
                case 'menu-panel.close':
                    engineCtx.activeMenuPanel.value = null; break;
                case 'menu-panel.navigate-up':
                    handleMenuPanelNav(-1, 0); break;
                case 'menu-panel.navigate-down':
                    handleMenuPanelNav(1, 0); break;
                case 'menu-panel.navigate-left':
                    handleMenuPanelNav(0, -1); break;
                case 'menu-panel.navigate-right':
                    handleMenuPanelNav(0, 1); break;
                case 'menu-panel.activate':
                case 'menu-panel.activate-alt':
                    handleMenuPanelActivate(); break;

                // ════════ 游戏主视图 ════════
                case 'game.advance': {
                    if (!engineCtx.uiVisible.value) break;
                    if (engineCtx.stageDisplayItem.value) { engineCtx.dismissItemStageToast(); break; }
                    const now = Date.now();
                    if (now - _lastSpaceAdvance < 50) break;
                    _lastSpaceAdvance = now;
                    globalAdvance();
                    break;
                }
                case 'game.exit-hold':
                    if (!e.repeat) startEscHold();
                    break;
                case 'game.toggle-log':
                    if (engineCtx.uiVisible.value) engineCtx.showLog.value = !engineCtx.showLog.value;
                    break;
                case 'game.open-inventory':
                    if (engineCtx.uiVisible.value) openInventoryPanel();
                    break;
                case 'game.open-save-panel':
                    if (engineCtx.uiVisible.value) openArchiveSlotsPanel('save');
                    break;
                case 'game.open-load-panel':
                    if (engineCtx.uiVisible.value) openArchiveSlotsPanel('load');
                    break;

                // ════════ 分支选项 ════════
                case 'choice.navigate-up':
                    navigateChoice(-1); break;
                case 'choice.navigate-down':
                    navigateChoice(1); break;
                case 'choice.confirm':
                case 'choice.confirm-alt':
                    startChoiceHold(availableChoices.value[highlightedChoiceIndex.value]); break;

                // ════════ 物品提示 ════════
                case 'item-toast.dismiss':
                case 'item-toast.dismiss-alt':
                    dismissItemStageToast(); break;

                // ════════ 背包 ════════
                case 'inventory.close':
                    engineCtx.showInventory.value = false; break;
                case 'inventory.navigate-up':
                    navigateInventory(-1); break;
                case 'inventory.navigate-down':
                    navigateInventory(1); break;
                case 'inventory.activate':
                    selectItemForInspection(engineCtx.selectedBagItemId.value);
                    break;

                // ════════ 游戏内面板（存档/读档） ════════
                case 'game-panel.close':
                    engineCtx.activeGamePanel.value = null; break;
                case 'game-panel.navigate-up':
                    navigateGamePanelSlots(-1, 0); break;
                case 'game-panel.navigate-down':
                    navigateGamePanelSlots(1, 0); break;
                case 'game-panel.navigate-left':
                    navigateGamePanelSlots(0, -1); break;
                case 'game-panel.navigate-right':
                    navigateGamePanelSlots(0, 1); break;
                case 'game-panel.activate':
                    activateGamePanelSlot(); break;

                // ════════ 灯箱 ════════
                case 'lightbox.close':
                    closeLightbox(); break;

                // ════════ 对话框 ════════
                case 'dialog.cancel':
                    engineCtx.closeDialog(null); break;

                // ════════ 结局画面 ════════
                case 'ending.return':
                case 'ending.return-alt':
                    startEndingHold(); break;
            }
        }

        // ── 上下文辅助函数 ──
        function navigateChoice(dir) {
            const choices = availableChoices.value;
            if (!choices.length) return;
            const len = choices.length;
            highlightedChoiceIndex.value = ((highlightedChoiceIndex.value + dir) % len + len) % len;
            scrollFocused('.choice-item.choice-highlighted');
        }

        function navigateMenu(dir) {
            const len = menuItems.value.length;
            if (!len) return;
            menuFocusIndex.value = ((menuFocusIndex.value + dir) % len + len) % len;
            scrollFocused('.btn.menu-focused');
        }

        function activateMenuItem() {
            const item = menuItems.value[menuFocusIndex.value];
            if (item) item.action();
        }

        // ── 键盘导航后自动滚动到焦点元素（确保可见） ──
        function scrollFocused(selector) {
            Vue.nextTick(() => {
                const el = document.querySelector(selector);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }

        // ════════════════════════════════════════════════
        //  菜单子面板通用导航（角色名录 / 画廊 / 存档）
        // ════════════════════════════════════════════════

        function handleMenuPanelNav(dy, dx) {
            const panel = engineCtx.activeMenuPanel.value;
            if (panel === 'characters') {
                if (dy !== 0) navigateCharList(dy);
                if (dx !== 0) navigateCharSprites(dx);
            } else if (panel === 'gallery') {
                navigateGalleryGrid(dy, dx);
            } else if (panel === 'archiveSlots') {
                navigateMenuSlots(dy, dx);
            }
        }

        function handleMenuPanelActivate() {
            const panel = engineCtx.activeMenuPanel.value;
            if (panel === 'gallery') {
                const sec = gallerySection.value;
                if (sec === 'clear') { startClearHold(); }
                else if (sec === 'endings') { /* 结局仅展示 */ }
                else if (sec === 'chapters') { /* 章节仅展示 */ }
                else { activateGalleryItem(); }
            } else if (panel === 'archiveSlots') activateMenuSlot();
            else if (panel === 'characters') openCharSpriteLightbox();
        }

        // ── 角色列表导航 ──
        function navigateCharList(dir) {
            const ids = Object.keys(resolveData('CHARACTERS'));
            if (!ids.length) return;
            const cur = ids.indexOf(engineCtx.activeInspectedCharId.value);
            const next = ((cur + dir) % ids.length + ids.length) % ids.length;
            if (next >= 0 && next < ids.length) {
                switchInspectedCharacter(ids[next]);
            }
            scrollFocused('.archive-nav-item.active');
        }

        // ── 角色表情导航（兼容数组/对象两种格式） ──
        function navigateCharSprites(dir) {
            const char = resolveData('CHARACTERS')[engineCtx.activeInspectedCharId.value];
            if (!char || !char.sprites) return;
            const spriteList = Array.isArray(char.sprites) ? char.sprites : Object.values(char.sprites);
            if (!spriteList.length) return;
            const cur = spriteList.findIndex(s => s.id === engineCtx.activeSpriteIdForInspection.value);
            const next = ((cur + dir) % spriteList.length + spriteList.length) % spriteList.length;
            if (next >= 0 && next < spriteList.length) {
                switchInspectedSprite(spriteList[next].id);
            }
            scrollFocused('.expression-chip.sprite-focused');
        }

        function openCharSpriteLightbox() {
            if (engineCtx.activeInspectedSpriteUrl.value) {
                openLightbox(engineCtx.activeInspectedSpriteUrl.value);
            }
        }

        // ── 画廊导航（多区域：CG 网格 / 结局 / 章节 / 清除记忆） ──
        function navigateGalleryGrid(dy, dx) {
            const section = gallerySection.value;
            const cols = 4;

            if (section === 'gallery') {
                const ids = galleryCgIds.value;
                if (!ids.length) return;
                let idx = galleryFocusIndex.value;
                if (dx !== 0) idx += dx;
                if (dy !== 0) {
                    const next = idx + dy * cols;
                    if (dy > 0 && next >= ids.length) {
                        gallerySection.value = 'endings';
                        endingFocusIndex.value = 0;
                        scrollFocused('.gallery-card-focused');
                        return;
                    }
                    if (dy < 0 && next < 0) { idx = 0; }
                    else { idx = next; }
                }
                idx = ((idx % ids.length) + ids.length) % ids.length;
                galleryFocusIndex.value = idx;
                scrollFocused('.gallery-item.gallery-focused');

            } else if (section === 'endings') {
                const list = fullEndingsList.value;
                if (!list || !list.length) return;
                let idx = endingFocusIndex.value;
                if (dx !== 0) idx += dx;
                if (dy !== 0) {
                    const next = idx + dy * cols;
                    if (dy > 0 && next >= list.length) {
                        gallerySection.value = 'chapters';
                        chapterFocusIndex.value = 0;
                        scrollFocused('.gallery-card-focused');
                        return;
                    }
                    if (dy < 0 && next < 0) {
                        gallerySection.value = 'gallery';
                        galleryFocusIndex.value = galleryCgIds.value.length - 1;
                        scrollFocused('.gallery-item.gallery-focused');
                        return;
                    }
                    idx = next;
                }
                idx = ((idx % list.length) + list.length) % list.length;
                endingFocusIndex.value = idx;
                scrollFocused('.gallery-card-focused');

            } else if (section === 'chapters') {
                const chs = Object.keys(chapterDescriptions.value || {});
                if (!chs.length) return;
                let idx = chapterFocusIndex.value;
                if (dx !== 0) idx += dx;
                if (dy !== 0) {
                    const next = idx + dy * cols;
                    if (dy > 0 && next >= chs.length) {
                        gallerySection.value = 'clear';
                        scrollFocused('.clear-memories-btn.gallery-card-focused');
                        return;
                    }
                    if (dy < 0 && next < 0) {
                        gallerySection.value = 'endings';
                        endingFocusIndex.value = (fullEndingsList.value || []).length - 1;
                        scrollFocused('.gallery-card-focused');
                        return;
                    }
                    idx = next;
                }
                idx = ((idx % chs.length) + chs.length) % chs.length;
                chapterFocusIndex.value = idx;
                scrollFocused('.gallery-card-focused');

            } else if (section === 'clear') {
                if (dy < 0) {
                    gallerySection.value = 'chapters';
                    const chs = Object.keys(chapterDescriptions.value || {});
                    chapterFocusIndex.value = Math.max(0, chs.length - 1);
                    scrollFocused('.gallery-card-focused');
                }
            }
        }

        function activateGalleryItem() {
            const ids = galleryCgIds.value;
            if (!ids.length) return;
            const id = ids[galleryFocusIndex.value];
            if (id && engineCtx.unlockedGalleries.value[id]) {
                clickGalleryItem(id);
            }
        }

        // ── 菜单存档槽位导航 ──
        function navigateMenuSlots(dy, dx) {
            const cols = 4;
            let idx = slotFocusIndex.value;
            if (dx !== 0) idx += dx;
            if (dy !== 0) idx += dy * cols;
            idx = Math.max(0, Math.min(15, idx));
            slotFocusIndex.value = idx;
            scrollFocused('.save-slot-card.slot-focused');
        }

        function activateMenuSlot() {
            const slotId = slotFocusIndex.value + 1;
            if (engineCtx.archiveMode.value === 'save') {
                executeSlotSave(slotId);
            } else if (engineCtx.saveSlotsData.value[slotId]) {
                executeSlotLoad(slotId);
            }
        }

        // ── 游戏内存档面板导航 ──
        const gamePanelSlotFocus = Vue.ref(0);

        function navigateGamePanelSlots(dy, dx) {
            const cols = 4;
            let idx = gamePanelSlotFocus.value;
            if (dx !== 0) idx += dx;
            if (dy !== 0) idx += dy * cols;
            idx = Math.max(0, Math.min(15, idx));
            gamePanelSlotFocus.value = idx;
            scrollFocused('.save-slot-card.slot-focused');
        }

        function activateGamePanelSlot() {
            const slotId = gamePanelSlotFocus.value + 1;
            if (engineCtx.archiveMode.value === 'save') {
                executeSlotSave(slotId);
            } else if (engineCtx.saveSlotsData.value[slotId]) {
                executeSlotLoad(slotId);
            }
        }

        // ── 背包物品导航 ──
        function navigateInventory(dir) {
            const inv = engineCtx.gameState.value.inventory;
            if (!inv.length) return;
            const len = inv.length;
            const cur = inv.indexOf(engineCtx.selectedBagItemId.value);
            let next = cur + dir;
            if (next < 0) next = len - 1;
            if (next >= len) next = 0;
            if (next >= 0 && next < len) {
                selectItemForInspection(inv[next]);
            }
            scrollFocused('.clickable-item.selected-item');
        }

        // ── keyup（先喂给捕获系统，再处理长按取消） ──
        function onGlobalKeyUp(e) {
            // 按键捕获中 → 喂给捕获系统
            if (keybindings.isCapturing.value) {
                keybindings.feedCapturedKeyUp(e);
                return;
            }
            // 清除记忆长按中断
            if ((e.key === 'Enter' || e.key === ' ') &&
                engineCtx.activeMenuPanel.value === 'gallery' &&
                gallerySection.value === 'clear') {
                cancelClearHold();
            }
            if (e.key === 'Escape') cancelEscHold();
            if (e.key === 'Enter' || e.key === ' ') {
                cancelChoiceHold();
                cancelEndingHold();
            }
        }

        // ── Ctrl 快捷键 ──
        function quickSave() {
            if (engineCtx.currentView.value !== 'game') return;
            const slots = engineCtx.saveSlotsData.value;
            let target = null;
            for (let i = 1; i <= 16; i++) { if (!slots[i]) { target = i; break; } }
            if (!target) target = 1;
            const meta = {
                chapterId: engineCtx.currentChapterId.value,
                stepIndex: engineCtx.currentStepIndex.value,
            };
            engineCtx.saveGame(target, meta);
            engineCtx.showDialog({
                type: 'alert',
                title: '快速存档',
                message: '已保存至 SLOT ' + String(target).padStart(2, '0'),
                confirmText: '确定',
            });
        }

        function quickLoad() {
            if (engineCtx.currentView.value !== 'game') {
                engineCtx.openArchiveSlotsPanel('load');
                engineCtx.activeMenuPanel.value = 'archiveSlots';
            } else {
                engineCtx.openArchiveSlotsPanel('load');
                engineCtx.activeGamePanel.value = 'archiveSlots';
            }
        }

        function onBeforeUnload() {
            if (engineCtx.currentView.value === 'game') {
                engineCtx.saveExitState();
            }
        }

        // ================================================================
        //  生命周期
        // ================================================================
        onMounted(() => {
            updateScale();
            window.addEventListener('resize', onResize);
            window.addEventListener('orientationchange', onOrientationChange);
            document.addEventListener('keydown', onGlobalKeyDown);
            document.addEventListener('keyup', onGlobalKeyUp);
            window.addEventListener('beforeunload', onBeforeUnload);
            if (window.matchMedia) {
                const mq = window.matchMedia('(orientation: portrait)');
                if (mq.addEventListener) mq.addEventListener('change', onOrientationChange);
            }
            engineCtx.loadSaveSlots();
            engineCtx.initHomeEffects(resolveData('HOME_CONFIG'));

            // 资源完整性校验（非阻塞，后台执行）
            nextTick(() => {
                engineCtx.validateResourceIntegrity().then(ok => {
                    if (!ok && engineCtx.resourceIssues.value.length > 0) {
                        const issues = engineCtx.resourceIssues.value;
                        const list = issues.map(i => `  · [${i.type}] ${i.path}`).join('\n');
                        engineCtx.showDialog({
                            type: 'confirm',
                            title: '资源文件缺失',
                            message: `发现 ${issues.length} 个资源文件无法加载，可能影响游戏体验。\n\n${list}\n\n是否继续游戏？`,
                            confirmText: '继续游戏',
                            cancelText: '返回检查',
                        }).then(result => {
                            if (result !== true) {
                                // 用户选择返回，留在此界面
                                console.warn('[资源校验] 用户选择返回检查');
                            }
                        });
                    }
                });
            });
        });

        onUnmounted(() => {
            cleanupScale();
            document.removeEventListener('keydown', onGlobalKeyDown);
            document.removeEventListener('keyup', onGlobalKeyUp);
            window.removeEventListener('beforeunload', onBeforeUnload);
            cancelEscHold();
            cancelChoiceHold();
            cancelEndingHold();
            engineCtx.destroy();
        });

        // ================================================================
        //  模板暴露
        // ================================================================
        return {
            // 引擎状态
            ...engineCtx,
            // 资源包状态
            packLoading, packLoadProgress, packLoadError, packMeta,
            loadResourcePack, importResourcePack,
            // Toast
            toastMessage: toast.message,
            toastType: toast.type,
            // 计算属性
            currentStep, currentSpeakerId, currentSpeakerName, currentSpeakerColor,
            currentAvatarUrl, shouldShowAvatar, availableChoices,
            highlightedChoiceIndex,
            viewportStyle, backgroundStyle, homeBackgroundStyle, panelBackgroundStyle,
            homeEffectMaskClasses, effectMaskClasses,
            inspectedChar, activeInspectedSpriteLabel, getArchiveEmoji,
            inspectedItemDynamicDescription,
            // 数据引用（动态）
            configTitle: computed(() => resolveData('GAME_CONFIG')?.title || ''),
            homeConfig: computed(() => resolveData('HOME_CONFIG')),
            assetsCharacters: computed(() => resolveData('CHARACTERS')),
            assetsCgLibrary: computed(() => resolveData('CG_LIBRARY')),
            fullEndingsList: computed(() => resolveData('ENDINGS')),
            chapterDescriptions: computed(() => resolveData('CHAPTER_DESCRIPTIONS')),
            // 方法（保持与原模板同名）
            ENGINE_VERSION, STORY_VERSION,
            showInfoPanel, closeInfoPanel, openInfoPanel,
            startNewGame, confirmStartNewGame, continueFromExit, advanceStory, selectChoice, rollbackToTimeline,
            exitToMenu, safelyExitToMenu, openCharactersPanel, switchInspectedCharacter,
            switchInspectedSprite, handleArchiveSpriteError,
            openArchiveSlotsPanel, executeSlotSave, executeSlotLoad, executeSlotClear,
            handleGameViewRightClick, clickGalleryItem, openLightbox, closeLightbox,
            getCharName, getCharColor, getCharMeta, getCharEmoji, hexToRgb,
            queryItemIcon, queryItemImage, queryItemName,
            openInventoryPanel, selectItemForInspection,
            globalAdvance, dismissItemStageToast, onSceneBgError, onCGError, onLightboxError,
            // 清除记忆
            clearProgress, clearHolding, startClearHold, cancelClearHold,
            // 长按ESC退出暂存
            escHoldProgress, escHolding,
            // 选项长按选择 / 结局长按确认
            choiceHoldProgress, choiceHolding,
            endingHoldProgress, endingHolding,
            // 主菜单键盘导航
            menuFocusIndex, menuItems,
            // ── 设置与按键绑定 ──
            keybindings, userSettings,
            showSettings, settingsTab, openSettings, closeSettings,
            capturingActionId,
            // 捕获预览（顶层 ref，模板自动解包）
            capturedPreview: computed(() => keybindings.capturedPreview.value),
            // ── 画廊/存档/角色键盘导航 ──
            galleryFocusIndex, galleryCgIds, gallerySection,
            endingFocusIndex, chapterFocusIndex,
            slotFocusIndex, spriteFocusIndex,
            gamePanelSlotFocus, inventoryFocusIndex,
            // ── 设置面板方法 ──
            textSpeed: computed(() => userSettings.settings.value.textSpeed),
            textSpeedPresets: userSettings.TEXT_SPEED_PRESETS,
            updateTextSpeed: (v) => userSettings.update('textSpeed', v),
            resetSettings: () => userSettings.resetToDefaults(),
            resetKeybindings: () => keybindings.resetToDefaults(),
            rebindAction: async (actionId) => {
                capturingActionId.value = actionId;
                const keyDef = await keybindings.startCapture();
                capturingActionId.value = null;
                if (!keyDef) return;
                // 检查冲突
                const ctx = keybindings.getBinding(actionId)?.context || 'global';
                const conflict = keybindings.findConflict(ctx, keyDef, actionId);
                if (conflict) {
                    // 冲突时自动覆盖
                    keybindings.removeBinding(conflict.actionId);
                }
                keybindings.setBinding(actionId, keyDef);
            },
            cancelRebind: () => {
                keybindings.cancelCapture();
                capturingActionId.value = null;
            },
        };
    }
}).mount('#app');
