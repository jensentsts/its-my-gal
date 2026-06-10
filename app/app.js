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
import { getDynamicItemDescription as getDynamicDesc, getItemIcon, getItemImage, getItemName } from '../engine/index.js';

const { createApp, ref, computed, watch, onMounted, onUnmounted, nextTick } = Vue;

// ── 版本信息 ──
const ENGINE_VERSION = '0.1.1';
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
            engineCtx.selectChoice(choice);
        }

        function rollbackToTimeline(logIndex) {
            const ok = engineCtx.rollbackToTimeline(logIndex);
            if (ok) toast.show('已成功返回至历史该剧情点', 'info');
        }

        function exitToMenu() {
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

        // ── 全局键盘快捷键 ──
        function isInputFocused() {
            const tag = document.activeElement?.tagName || '';
            const editable = document.activeElement?.getAttribute('contenteditable');
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable === 'true';
        }

        let _lastSpaceAdvance = 0;

        function onGlobalKeyDown(e) {
            const ctrl = e.ctrlKey || e.metaKey;
            const key = e.key;
            const inGame = engineCtx.currentView.value === 'game';

            // 输入框中不响应快捷键
            if (isInputFocused()) {
                // 但 ESC 和 Space 仍然在输入框外处理
                if (key === 'Escape' || key === ' ') return;
            }

            // ESC
            if (key === 'Escape') {
                if (engineCtx.lightboxUrl.value) { closeLightbox(); e.preventDefault(); return; }
                if (showInfoPanel.value) { closeInfoPanel(); e.preventDefault(); return; }
                if (engineCtx.showInventory.value) { engineCtx.showInventory.value = false; e.preventDefault(); return; }
                if (engineCtx.dialogState.show) { engineCtx.closeDialog(null); e.preventDefault(); return; }
                if (engineCtx.activeGamePanel.value) { engineCtx.activeGamePanel.value = null; e.preventDefault(); return; }
                if (engineCtx.activeMenuPanel.value) { engineCtx.activeMenuPanel.value = null; e.preventDefault(); return; }
                if (engineCtx.stageDisplayItem.value) { engineCtx.dismissItemStageToast(); e.preventDefault(); return; }
                return;
            }

            // 方向键/Enter → 分支选项导航
            const choices = availableChoices.value;
            if (choices.length > 0 && inGame) {
                if (key === 'ArrowUp') {
                    e.preventDefault();
                    highlightedChoiceIndex.value = (highlightedChoiceIndex.value - 1 + choices.length) % choices.length;
                    return;
                }
                if (key === 'ArrowDown') {
                    e.preventDefault();
                    highlightedChoiceIndex.value = (highlightedChoiceIndex.value + 1) % choices.length;
                    return;
                }
                if (key === 'Enter') {
                    e.preventDefault();
                    selectChoice(choices[highlightedChoiceIndex.value]);
                    return;
                }
            }

            // Space（非输入区域）→ 关闭物品提示 / 推进剧情（长按节流50ms）
            if (key === ' ' && inGame) {
                e.preventDefault();
                if (engineCtx.stageDisplayItem.value) { engineCtx.dismissItemStageToast(); return; }
                const now = Date.now();
                if (now - _lastSpaceAdvance < 50) return;
                _lastSpaceAdvance = now;
                globalAdvance();
                return;
            }

            if (!ctrl) return;

            // Ctrl+S → 快速存档
            if (key === 's') {
                e.preventDefault();
                if (inGame) {
                    // 找到第一个空槽位，或覆盖最旧的槽位
                    const slots = engineCtx.saveSlotsData.value;
                    let targetSlot = null;
                    for (let i = 1; i <= 16; i++) {
                        if (!slots[i]) { targetSlot = i; break; }
                    }
                    if (!targetSlot) targetSlot = 1; // 全满时覆盖第一格
                    const meta = {
                        chapterId: engineCtx.currentChapterId.value,
                        stepIndex: engineCtx.currentStepIndex.value,
                    };
                    engineCtx.saveGame(targetSlot, meta);
                    engineCtx.showDialog({
                        type: 'alert',
                        title: '快速存档',
                        message: `已保存至 SLOT ${String(targetSlot).padStart(2, '0')}`,
                        confirmText: '确定',
                    });
                }
                return;
            }

            // Ctrl+O → 快速读档
            if (key === 'o') {
                e.preventDefault();
                if (inGame) {
                    engineCtx.openArchiveSlotsPanel('load');
                    engineCtx.activeGamePanel.value = 'archiveSlots';
                } else {
                    engineCtx.openArchiveSlotsPanel('load');
                    engineCtx.activeMenuPanel.value = 'archiveSlots';
                }
                return;
            }

            // Ctrl+N → 新开游戏（主界面）
            if (key === 'n' && !inGame) {
                e.preventDefault();
                if (engineCtx.currentView.value === 'menu') {
                    startNewGame();
                }
                return;
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
            window.removeEventListener('beforeunload', onBeforeUnload);
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
        };
    }
}).mount('#app');
