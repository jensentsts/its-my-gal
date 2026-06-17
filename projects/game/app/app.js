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
import * as GameData from '../../../resource-packs/default/index.js';
import { useEngine } from './composables/use-engine.js';
import { useScale }  from './composables/use-scale.js';
import { useToast }  from './composables/use-toast.js';
import { useKeybindings } from './composables/use-keybindings.js';
import { useSettings }   from './composables/use-settings.js';
import { useVueFocus } from './composables/use-vue-focus.js';
import { getDynamicItemDescription as getDynamicDesc, getItemIcon, getItemImage, getItemName } from '@galgame/engine';

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

        // ── 统一焦点管理系统（基于 Vue 的 v-for 自然顺序） ──
        const focus = useVueFocus();
        // 预定义所有焦点区域（只需配置列数和循环选项）
        focus.add('main-menu',            { cols: 1, loop: true });
        focus.add('settings-keybindings', { cols: 1, loop: true });
        focus.add('settings-game-presets',{ cols: 1, loop: true });
        focus.add('info-panel',           { cols: 1, loop: false, wrap: false });
        focus.add('character-sprites',    { cols: 10, loop: true });
        focus.add('gallery-grid',         { cols: 4, loop: true });
        focus.add('endings-grid',         { cols: 4, loop: true });
        focus.add('chapters-grid',        { cols: 4, loop: true });
        focus.add('archive-slots-menu',   { cols: 4, loop: true });
        focus.add('archive-slots-game',   { cols: 4, loop: true });
        focus.add('inventory',            { cols: 1, loop: true });
        focus.add('choices',              { cols: 1, loop: true });
        focus.add('dialog-buttons',       { cols: 2, loop: false, wrap: false });
        focus.add('game-dock',            { cols: 3, loop: false, wrap: false });
        focus.add('game-floating',        { cols: 2, loop: false, wrap: false });

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

        // ── 分支选项焦点（每次选择触发的 index 由模板 @mouseenter 同步） ──
        // 无额外操作，焦点 index 通过 focus.go() 驱动

        // ── 主菜单键盘导航（通过 focus 管理） ──
        const menuItems = computed(() => {
            const raw = [];
            if (engineCtx.hasExitSave.value) {
                raw.push({ label: '▶ 继续游戏', action: continueFromExit, cls: 'btn-continue' });
            }
            raw.push(
                { label: '从已有存档继续', action: () => openArchiveSlotsPanel('load'), cls: '' },
                { label: '新的旅程', action: confirmStartNewGame, cls: '' },
                { label: '角色名录', action: openCharactersPanel, cls: '' },
                { label: '画廊 CG 图鉴', action: () => { engineCtx.activeMenuPanel.value = 'gallery'; }, cls: '' },
            );
            return raw;
        });
        // 菜单内容变化时复位焦点到第一个选项
        watch(menuItems, () => {
            focus.to('main-menu', 0);
        }, { immediate: true });

        // ── 设置面板 ──
        const showSettings = Vue.ref(false);
        const settingsTab = Vue.ref('keyboard'); // 'keyboard' | 'game'
        const capturingActionId = Vue.ref(null); // 正在捕获按键的动作 ID
        const showInfoPanel = ref(false);

        function openSettings() { showSettings.value = true; settingsTab.value = 'keyboard'; }
        function closeSettings() { keybindings.cancelCapture(); capturingActionId.value = null; showSettings.value = false; }
        function openInfoPanel() { showInfoPanel.value = true; }
        function closeInfoPanel() { showInfoPanel.value = false; }

        // ── 画廊键盘导航（多区域：CG 网格 / 结局 / 章节 / 清除记忆） ──
        const fullEndingsList = Vue.computed(() => resolveData('ENDINGS'));
        const chapterDescriptions = Vue.computed(() => resolveData('CHAPTER_DESCRIPTIONS'));
        const galleryCgIds = Vue.computed(() => Object.keys(resolveData('CG_LIBRARY') || {}));
        const gallerySection = Vue.ref('gallery');
        // 进入画廊区域时复位焦点
        watch(() => engineCtx.activeMenuPanel.value, (panel) => {
            if (panel === 'gallery') focus.to('gallery-grid', 0);
        });

        // ── 存档槽位键盘导航（焦点 index 由模板 @mouseenter 同步） ──
        // 存档数据变化时复位焦点
        watch(() => engineCtx.saveSlotsData.value, () => {
            focus.to('archive-slots-menu', 0);
            focus.to('archive-slots-game', 0);
        }, { immediate: true });

        // ── 角色表情导航（焦点 index 由模板 @mouseenter 同步） ──

        // ── 背包物品导航（焦点 index 由模板 @mouseenter 同步） ──

        // ── 对话框按钮导航 ──
        watch(() => engineCtx.dialogState, (d) => {
            if (d.show) focus.to('dialog-buttons', 0);
        }, { deep: true, immediate: true });

        // ── 设置内容区导航 ──
        // 切换标签时复位焦点
        watch(() => settingsTab.value, (tab) => {
            if (showSettings.value) {
                if (tab === 'keyboard') focus.to('settings-keybindings', 0);
                else focus.to('settings-game-presets', 0);
            }
        });
        // 打开设置面板时复位焦点
        watch(() => showSettings.value, (v) => {
            if (v) {
                if (settingsTab.value === 'keyboard') focus.to('settings-keybindings', 0);
                else focus.to('settings-game-presets', 0);
            }
        });

        // ── 关于面板 ──
        watch(() => showInfoPanel.value, (v) => {
            if (v) focus.to('info-panel', 0);
        });

        // ── 游戏顶部导航栏（直接使用固定索引激活） ──
        // game-dock: [退出暂存, 存入节点, 读取节点]
        // game-floating: [历史记录, 背包]
        // 以上区域由模板 @mouseenter 同步焦点

        // ── 灯箱（关灯箱按钮直接由 @click 处理，无需焦点管理） ──

        // ── 角色列表导航（在 navigateCharList 中直接使用数组索引） ──

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

        // ================================================================
        //  增强角色渲染辅助函数
        // ================================================================

        /** 按 z-order 排序的舞台角色列表 */
        const sortedStageCharacters = computed(() => {
            const chars = engineCtx.stageCharacters.value;
            if (!chars || typeof chars !== 'object') return [];
            return Object.values(chars)
                .filter(Boolean)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        });

        /**
         * 位置映射表：角色预设位置 → CSS left 百分比
         * 全部使用 translateX(-50%) 统一居中锚定，避免左右锚定不一致导致的视觉偏移。
         * 间距均匀分布（~13% gap），外层角色不溢出屏幕。
         */
        const POSITION_MAP = {
            'left-far':     { left: '12%' },
            'left':         { left: '24%' },
            'center-left':  { left: '37%' },
            'center':       { left: '50%' },
            'center-right': { left: '63%' },
            'right':        { left: '76%' },
            'right-far':    { left: '88%' },
        };

        /** 缓存动画类名，避免重复 split */
        const POSITION_CENTER = 'center';

        /**
         * 外层定位样式 —— 仅设置 left + translateX(-50%)，不被动画 keyframes 覆盖
         * 动画的 transform 在内层 .character-anim-layer 上播放，互不干扰
         */
        function getCharacterPositionStyle(state) {
            if (!state || !state.visible) return { display: 'none' };

            const pos = POSITION_MAP[state.position] || POSITION_MAP[POSITION_CENTER];
            let transform = 'translateX(-50%)';

            // 偏移量（gather 微调）放在外层
            if (state.offsetX || state.offsetY) {
                transform += ` translate(${state.offsetX || 0}px, ${state.offsetY || 0}px)`;
            }

            return {
                left: pos.left,
                transform: transform,
                zIndex: (state.order ?? 0) + 10,
            };
        }

        /**
         * 内层动画 + 视觉样式 —— filter/opacity/scale 在这里，不被定位影响
         */
        function getCharacterAnimStyle(state) {
            if (!state) return {};

            let filter = '';
            if (state.filters) {
                const f = state.filters;
                filter = [
                    f.brightness !== undefined ? `brightness(${f.brightness})` : '',
                    f.saturation !== undefined ? `saturate(${f.saturation})` : '',
                    f.contrast !== undefined ? `contrast(${f.contrast})` : '',
                ].filter(Boolean).join(' ');
            }

            const style = {
                filter: filter || undefined,
                opacity: state.opacity ?? 1,
            };

            // 缩放放在内层（不影响外层定位）
            if (state.scale && state.scale !== 1) {
                style.transform = `scale(${state.scale})`;
            }

            return Object.keys(style).length ? style : undefined;
        }

        /**
         * animationend 回调 —— 非循环动画播放完毕后自动清除 animation 状态。
         *
         * 原理：
         * - CSS 入场/退场动画（fade-in / stumble-in 等）在完成后其 forwards transform
         *   会持续锁定内层元素，导致后续 scale/filter 等内联样式失效，进而使角色消失。
         * - 监听 animationend，匹配到已知瞬时动画的 keyframe 名称后，从引擎状态中
         *   清除 animation class，让内层元素回到纯内联样式控制。
         * - 循环动画（glow/float/pulse/dizzy 等 infinite）从不触发 animationend，安全。
         * - 引擎中 action/effect 的 setTimeout 清理也安全（幂等）。
         */
        const TRANSIENT_KEYFRAMES = new Set([
            'charFadeIn', 'charFadeOut',
            'charSlideInLeft', 'charSlideInRight', 'charSlideInUp', 'charSlideInDown',
            'charSlideOutLeft', 'charSlideOutRight', 'charSlideOutUp', 'charSlideOutDown',
            'charBounceIn', 'charBounceOut',
            'charZoomIn', 'charZoomOut',
            'charFlipIn', 'charFlipOut',
            'charDropIn', 'charFloatIn', 'charStumbleIn', 'charSwingIn',
            'charShrinkOut', 'charVanish',
            'charSwap',
            'charSlideLeft', 'charSlideRight', 'charFlipMove',
        ]);

        function onCharacterAnimationEnd(state, event) {
            if (!state || !event) return;
            if (!TRANSIENT_KEYFRAMES.has(event.animationName)) return;

            const eng = engineCtx.engine.value;
            if (!eng || !eng.state) return;
            const cur = eng.state.stageCharacters[state.id];
            if (cur) {
                cur.animation = '';
                engineCtx.stageCharacters.value = { ...eng.state.stageCharacters };
            }
        }

        /**
         * 内层动画 CSS 类 —— 纯动画/状态类，不含定位
         */
        function getCharacterAnimationClasses(state) {
            if (!state || !state.visible) return [];
            const classes = [];

            // 动画类（fade-in, shake, action-wave 等）
            if (state.animation) classes.push(state.animation);
            if (state.actionState) classes.push(`action-${state.actionState}`);

            // 说话/沉默状态
            if (state.isSpeaking) {
                classes.push('character-speaking');
                classes.push(`speech-weight-${Math.round((state.speechWeight || 1) * 10)}`);
            } else if (currentSpeakerId.value && currentSpeakerId.value !== state.id) {
                // 非当前说话的角色变暗
                classes.push('inactive-mask');
            }

            // 退场中
            if (state._leaving) classes.push('character-leaving');

            // 多角色同时说话时，非说话角色变暗
            const hasMultiSpeak = Object.values(engineCtx.stageCharacters.value || {})
                .filter(c => c && c.isSpeaking).length > 1;
            if (!state.isSpeaking && hasMultiSpeak && currentSpeakerId.value !== state.id) {
                classes.push('inactive-mask');
            }

            return classes;
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

        // ── 当前焦点区域 ID：根据上下文 + 面板状态推导 ──
        const activeZoneId = computed(() => {
            if (engineCtx.dialogState.show) return 'dialog-buttons';
            if (engineCtx.currentView.value === 'game') {
                if (currentStep.value?.type === 'choice') return 'choices';
                if (engineCtx.showInventory.value) return 'inventory';
                if (engineCtx.activeGamePanel.value) return 'archive-slots-game';
                return null;
            }
            if (engineCtx.currentView.value === 'menu') {
                if (showSettings.value) {
                    return settingsTab.value === 'keyboard'
                        ? 'settings-keybindings'
                        : 'settings-game-presets';
                }
                if (showInfoPanel.value) return 'info-panel';
                if (engineCtx.activeMenuPanel.value) {
                    const panel = engineCtx.activeMenuPanel.value;
                    if (panel === 'gallery') {
                        const sec = gallerySection.value;
                        if (sec === 'gallery') return 'gallery-grid';
                        if (sec === 'endings') return 'endings-grid';
                        if (sec === 'chapters') return 'chapters-grid';
                    }
                    if (panel === 'archiveSlots') return 'archive-slots-menu';
                }
                return 'main-menu';
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

                // ════════ 主菜单（通过 zone 顺序导航） ════════
                case 'menu.navigate-up':
                    keyNavigate('up'); break;
                case 'menu.navigate-down':
                    keyNavigate('down'); break;
                case 'menu.activate':
                case 'menu.activate-alt':
                    keyActivate(); break;
                case 'menu.open-info':
                    openInfoPanel(); break;
                case 'menu.open-settings':
                    openSettings(); break;

                // ════════ 设置面板 ════════
                case 'settings.close':
                    closeSettings(); break;
                case 'settings.navigate-up':
                    keyNavigate('up'); break;
                case 'settings.navigate-down':
                    keyNavigate('down'); break;
                case 'settings.navigate-left':
                    keyNavigate('left'); break;
                case 'settings.navigate-right':
                    keyNavigate('right'); break;
                case 'settings.activate':
                case 'settings.activate-alt':
                    keyActivate(); break;

                // ════════ 关于面板 ════════
                case 'info-panel.close':
                    closeInfoPanel(); break;
                case 'info-panel.activate':
                case 'info-panel.activate-alt':
                    keyActivate(); break;

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
                    focus.go('choices', 'up', availableChoices.value.length); break;
                case 'choice.navigate-down':
                    focus.go('choices', 'down', availableChoices.value.length); break;
                case 'choice.confirm':
                case 'choice.confirm-alt': {
                    const ci = focus.idx('choices');
                    if (ci >= 0 && ci < availableChoices.value.length) {
                        startChoiceHold(availableChoices.value[ci]);
                    }
                    break;
                }

                // ════════ 物品提示 ════════
                case 'item-toast.dismiss':
                case 'item-toast.dismiss-alt':
                    dismissItemStageToast(); break;

                // ════════ 背包 ════════
                case 'inventory.close':
                    engineCtx.showInventory.value = false; break;
                case 'inventory.navigate-up':
                    focus.go('inventory', 'up', (engineCtx.gameState.value.inventory || []).length); break;
                case 'inventory.navigate-down':
                    focus.go('inventory', 'down', (engineCtx.gameState.value.inventory || []).length); break;
                case 'inventory.activate':
                    selectItemForInspection(engineCtx.selectedBagItemId.value);
                    break;

                // ════════ 游戏内面板（存档/读档） ════════
                case 'game-panel.close':
                    engineCtx.activeGamePanel.value = null; break;
                case 'game-panel.navigate-up':
                    focus.go('archive-slots-game', 'up', 16); break;
                case 'game-panel.navigate-down':
                    focus.go('archive-slots-game', 'down', 16); break;
                case 'game-panel.navigate-left':
                    focus.go('archive-slots-game', 'left', 16); break;
                case 'game-panel.navigate-right':
                    focus.go('archive-slots-game', 'right', 16); break;
                case 'game-panel.activate':
                    activateGamePanelSlot(); break;

                // ════════ 灯箱 ════════
                case 'lightbox.close':
                    closeLightbox(); break;

                // ════════ 对话框 ════════
                case 'dialog.cancel':
                    engineCtx.closeDialog(null); break;
                case 'dialog.navigate-left':
                    keyNavigate('left'); break;
                case 'dialog.navigate-right':
                    keyNavigate('right'); break;
                case 'dialog.activate':
                case 'dialog.activate-alt':
                    keyActivate(); break;

                // ════════ 结局画面 ════════
                case 'ending.return':
                case 'ending.return-alt':
                    startEndingHold(); break;
            }
        }

        // ── 上下文辅助函数（通过 focus 管理） ──
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
                if (dy < 0) focus.go('archive-slots-menu', 'up', 16);
                if (dy > 0) focus.go('archive-slots-menu', 'down', 16);
                if (dx < 0) focus.go('archive-slots-menu', 'left', 16);
                if (dx > 0) focus.go('archive-slots-menu', 'right', 16);
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

        /**
         * 统一导航：使用 Vue 自然顺序导航
         *   - 左右按键 → 按 index +/- 1 移动
         *   - 上下按键 → 按 cols 列数跨行移动（+cols/-cols）
         *   - 跨区跨越由 activeZoneId 逻辑和容器代码处理
         */
        function keyNavigate(dir) {
            const zone = activeZoneId.value;
            if (!zone) return;

            // 根据当前 zone 获取 v-for 数组长度
            const total = _getZoneTotal(zone);
            if (total > 0) focus.go(zone, dir, total);
        }

        /**
         * 统一激活：激活当前 zone 的焦点项
         * 不再依赖 zone 存储的 item action，而是直接根据 zone 类型和 index 派发
         */
        function keyActivate() {
            const zone = activeZoneId.value;
            if (!zone) return;

            const total = _getZoneTotal(zone);
            if (total <= 0) return;

            const idx = focus.idx(zone);

            // ── 各区域激活派发 ──
            switch (zone) {
                case 'main-menu': {
                    const items = menuItems.value;
                    if (idx >= 0 && idx < items.length) items[idx].action();
                    break;
                }
                case 'choices': {
                    if (idx >= 0 && idx < availableChoices.value.length) {
                        startChoiceHold(availableChoices.value[idx]);
                    }
                    break;
                }
                case 'dialog-buttons': {
                    const d = engineCtx.dialogState;
                    if (d.type !== 'alert' && idx === 0) {
                        engineCtx.closeDialog(null);
                    } else {
                        const val = d.type === 'prompt' ? d.promptValue : true;
                        engineCtx.closeDialog(val);
                    }
                    break;
                }
                case 'settings-keybindings': {
                    const flat = _getSettingsActionsFlat();
                    if (idx >= 0 && idx < flat.length) {
                        const action = flat[idx];
                        capturingActionId.value = action.id;
                        keybindings.startCapture().then(keyDef => {
                            capturingActionId.value = null;
                            if (!keyDef) return;
                            const ctx2 = keybindings.getBinding(action.id)?.context || 'global';
                            const conflict = keybindings.findConflict(ctx2, keyDef, action.id);
                            if (conflict) keybindings.removeBinding(conflict.actionId);
                            keybindings.setBinding(action.id, keyDef);
                            nextTick(() => focus.to('settings-keybindings', idx));
                        });
                    }
                    break;
                }
                case 'settings-game-presets': {
                    const presets = userSettings.TEXT_SPEED_PRESETS || [];
                    if (idx >= 0 && idx < presets.length) {
                        userSettings.update('textSpeed', presets[idx].value);
                    } else if (idx === presets.length) {
                        userSettings.resetToDefaults();
                    }
                    break;
                }
                case 'info-panel':
                    closeInfoPanel();
                    break;
                case 'gallery-grid':
                    activateGalleryItem();
                    break;
                case 'archive-slots-menu':
                    activateMenuSlot();
                    break;
                case 'archive-slots-game':
                    activateGamePanelSlot();
                    break;
                case 'game-dock': {
                    if (idx === 0) safelyExitToMenu();
                    else if (idx === 1) openArchiveSlotsPanel('save');
                    else if (idx === 2) openArchiveSlotsPanel('load');
                    break;
                }
                case 'game-floating': {
                    if (idx === 0) engineCtx.showLog.value = !engineCtx.showLog.value;
                    else if (idx === 1) openInventoryPanel();
                    break;
                }
            }
        }

        /** 获取设置面板按键绑定区域的扁平动作列表 */
        function _getSettingsActionsFlat() {
            const groups = keybindings.getActionsByGroup();
            const flat = [];
            for (const ctx of Object.keys(groups)) {
                for (const action of groups[ctx].actions) {
                    flat.push(action);
                }
            }
            return flat;
        }

        /** 获取当前聚焦区域的 v-for 数组长度 */
        function _getZoneTotal(zone) {
            switch (zone) {
                case 'main-menu': return menuItems.value.length;
                case 'choices': return availableChoices.value.length;
                case 'dialog-buttons': return engineCtx.dialogState.type !== 'alert' ? 2 : 1;
                case 'settings-keybindings':
                    return _getSettingsActionsFlat().length;
                case 'settings-game-presets': return (userSettings.TEXT_SPEED_PRESETS || []).length + 1; // +1 for reset btn
                case 'info-panel': return 1;
                case 'gallery-grid': return galleryCgIds.value.length;
                case 'endings-grid': return (fullEndingsList.value || []).length;
                case 'chapters-grid': return Object.keys(chapterDescriptions.value || {}).length;
                case 'archive-slots-menu': return 16;
                case 'archive-slots-game': return 16;
                case 'inventory': return (engineCtx.gameState.value.inventory || []).length;
                case 'game-dock': return 3;
                case 'game-floating': return 2;
                case 'character-sprites': {
                    const char = resolveData('CHARACTERS')[engineCtx.activeInspectedCharId.value];
                    if (!char || !char.sprites) return 0;
                    const list = Array.isArray(char.sprites) ? char.sprites : Object.values(char.sprites);
                    return list.length;
                }
                default: return 0;
            }
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

        // ── 角色表情导航（基于 Vue 顺序） ──
        function navigateCharSprites(dir) {
            const char = resolveData('CHARACTERS')[engineCtx.activeInspectedCharId.value];
            if (!char || !char.sprites) return;
            const spriteList = Array.isArray(char.sprites) ? char.sprites : Object.values(char.sprites);
            const dirMap = dir < 0 ? 'left' : 'right';
            focus.go('character-sprites', dirMap, spriteList.length);
            const idx = focus.idx('character-sprites');
            if (idx >= 0 && idx < spriteList.length) {
                const sid = spriteList[idx].id;
                if (sid && sid !== engineCtx.activeSpriteIdForInspection.value) {
                    switchInspectedSprite(sid);
                }
            }
            scrollFocused('.expression-chip.sprite-focused');
        }

        function openCharSpriteLightbox() {
            if (engineCtx.activeInspectedSpriteUrl.value) {
                openLightbox(engineCtx.activeInspectedSpriteUrl.value);
            }
        }

        // ── 画廊导航（多区域跨越：CG 网格 → 结局 → 章节 → 清除记忆） ──
        function navigateGalleryGrid(dy, dx) {
            const section = gallerySection.value;
            const dirX = dx < 0 ? 'left' : dx > 0 ? 'right' : null;
            const dirY = dy < 0 ? 'up' : dy > 0 ? 'down' : null;

            if (section === 'gallery') {
                const ids = galleryCgIds.value;
                if (!ids.length) return;
                if (dirX) { focus.go('gallery-grid', dirX, ids.length); return; }
                if (dirY === 'down') {
                    const old = focus.idx('gallery-grid');
                    focus.go('gallery-grid', 'down', ids.length);
                    if (focus.idx('gallery-grid') === old && old >= 0) {
                        // 触底 → 跨越到结局区
                        gallerySection.value = 'endings';
                        focus.to('endings-grid', 0);
                        scrollFocused('.gallery-card-focused');
                        return;
                    }
                } else if (dirY === 'up') {
                    focus.go('gallery-grid', 'up', ids.length);
                }
                scrollFocused('.gallery-item.gallery-focused');

            } else if (section === 'endings') {
                const list = fullEndingsList.value;
                if (!list || !list.length) return;
                if (dirX) { focus.go('endings-grid', dirX, list.length); scrollFocused('.gallery-card-focused'); return; }
                if (dirY === 'down') {
                    const old = focus.idx('endings-grid');
                    focus.go('endings-grid', 'down', list.length);
                    if (focus.idx('endings-grid') === old && old >= 0) {
                        gallerySection.value = 'chapters';
                        focus.to('chapters-grid', 0);
                        scrollFocused('.gallery-card-focused');
                        return;
                    }
                } else if (dirY === 'up') {
                    const old = focus.idx('endings-grid');
                    focus.go('endings-grid', 'up', list.length);
                    if (focus.idx('endings-grid') === old && old >= 0) {
                        gallerySection.value = 'gallery';
                        focus.to('gallery-grid', Math.max(0, galleryCgIds.value.length - 1));
                        scrollFocused('.gallery-item.gallery-focused');
                        return;
                    }
                }
                scrollFocused('.gallery-card-focused');

            } else if (section === 'chapters') {
                const chs = Object.keys(chapterDescriptions.value || {});
                if (!chs.length) return;
                if (dirX) { focus.go('chapters-grid', dirX, chs.length); scrollFocused('.gallery-card-focused'); return; }
                if (dirY === 'down') {
                    const old = focus.idx('chapters-grid');
                    focus.go('chapters-grid', 'down', chs.length);
                    if (focus.idx('chapters-grid') === old && old >= 0) {
                        gallerySection.value = 'clear';
                        scrollFocused('.clear-memories-btn');
                        return;
                    }
                } else if (dirY === 'up') {
                    const old = focus.idx('chapters-grid');
                    focus.go('chapters-grid', 'up', chs.length);
                    if (focus.idx('chapters-grid') === old && old >= 0) {
                        gallerySection.value = 'endings';
                        focus.to('endings-grid', Math.max(0, (fullEndingsList.value || []).length - 1));
                        scrollFocused('.gallery-card-focused');
                        return;
                    }
                }
                scrollFocused('.gallery-card-focused');

            } else if (section === 'clear') {
                if (dy < 0) {
                    gallerySection.value = 'chapters';
                    const chs = Object.keys(chapterDescriptions.value || {});
                    focus.to('chapters-grid', Math.max(0, chs.length - 1));
                    scrollFocused('.gallery-card-focused');
                }
            }
        }

        function activateGalleryItem() {
            const ids = galleryCgIds.value;
            if (!ids.length) return;
            const idx = focus.idx('gallery-grid');
            if (idx < 0 || idx >= ids.length) return;
            const id = ids[idx];
            if (id && engineCtx.unlockedGalleries.value[id]) {
                clickGalleryItem(id);
            }
        }

        // ── 菜单存档槽位导航 ──
        function activateMenuSlot() {
            const idx = focus.idx('archive-slots-menu');
            if (idx < 0) return;
            const slotId = idx + 1;
            if (engineCtx.archiveMode.value === 'save') {
                executeSlotSave(slotId);
            } else if (engineCtx.saveSlotsData.value[slotId]) {
                executeSlotLoad(slotId);
            }
        }

        // ── 游戏内存档面板导航 ──
        function activateGamePanelSlot() {
            const idx = focus.idx('archive-slots-game');
            if (idx < 0) return;
            const slotId = idx + 1;
            if (engineCtx.archiveMode.value === 'save') {
                executeSlotSave(slotId);
            } else if (engineCtx.saveSlotsData.value[slotId]) {
                executeSlotLoad(slotId);
            }
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
            viewportStyle, backgroundStyle, homeBackgroundStyle, panelBackgroundStyle,
            homeEffectMaskClasses, effectMaskClasses,
            inspectedChar, activeInspectedSpriteLabel, getArchiveEmoji,
            inspectedItemDynamicDescription,
            // 角色增强渲染（两层架构：定位层 + 动画层）
            sortedStageCharacters, getCharacterPositionStyle, getCharacterAnimationClasses, getCharacterAnimStyle,
            onCharacterAnimationEnd,
            // 数据引用（动态）
            configTitle: computed(() => resolveData('GAME_CONFIG')?.title || ''),
            homeConfig: computed(() => resolveData('HOME_CONFIG')),
            assetsCharacters: computed(() => resolveData('CHARACTERS')),
            assetsCgLibrary: computed(() => resolveData('CG_LIBRARY')),
            fullEndingsList,
            chapterDescriptions,
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
            // ════ 焦点管理系统（基于 Vue 自然顺序） ════
            focus,
            activeZoneId,
            menuItems,
            galleryCgIds, gallerySection,
            // ── 设置与按键绑定 ──
            keybindings, userSettings,
            showSettings, settingsTab, openSettings, closeSettings,
            capturingActionId,
            // 捕获预览（顶层 ref，模板自动解包）
            capturedPreview: computed(() => keybindings.capturedPreview.value),
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
