/**
 * editor/ui/terminal.js —— 内置终端面板
 *
 * 在编辑器内直接模拟命令行界面，调用已有 editor 函数。
 * 无需打开系统终端 / Node.js。
 */

export function createTerminal(ctx, ops) {
    const { ref, reactive, computed, nextTick } = Vue;

    // ═══ 状态 ═══
    const terminalVisible = ref(false);
    const terminalLines = reactive([]);       // { text: string, type: 'input'|'output'|'error'|'system' }
    const terminalInput = ref('');
    const terminalHistory = reactive([]);     // 输入历史（向上键恢复）
    const terminalFullscreen = ref(false);
    let historyIndex = -1;

    // 终端高度（可拖拽调节），默认 240px
    const terminalHeight = ref(240);

    /** 计算面板 class（用于模板绑定） */
    const terminalPanelClass = computed(() => ({
        'terminal-collapsed': !terminalVisible.value,
        'terminal-fullscreen': terminalFullscreen.value,
    }));

    /** 切换全屏模式 */
    function toggleFullscreen() {
        terminalFullscreen.value = !terminalFullscreen.value;
        if (terminalFullscreen.value) {
            nextTick(() => {
                const el = document.querySelector('.terminal-input');
                if (el) el.focus();
            });
        }
    }

    /** 追加一行输出 */
    function termOut(text, type = 'output') {
        terminalLines.push({ text, type });
    }

    /** 清屏 */
    function termClear() {
        terminalLines.splice(0, terminalLines.length);
    }

    /** 显示欢迎信息 */
    function termWelcome() {
        const title = ctx.gameConfig?.title || 'Galgame Editor';
        termOut(`╭────────────────────────────────╮`, 'system');
        termOut(`│  ${title.padEnd(30)}│`, 'system');
        termOut(`│  内置终端 v1.1                  │`, 'system');
        termOut(`│  输入 help 查看可用命令          │`, 'system');
        termOut(`╰────────────────────────────────╯`, 'system');
        termOut('', 'system');
    }

    // ═══ 拖拽调整大小 ═══
    let _resizeStartY = 0;
    let _resizeStartH = 240;

    function onResizeStart(e) {
        e.preventDefault();
        const panel = document.querySelector('.terminal-panel');
        if (!panel || terminalFullscreen.value) return;
        // 记录当前高度和鼠标起始位置
        const rect = panel.getBoundingClientRect();
        _resizeStartY = e.clientY;
        _resizeStartH = rect.height;
        document.addEventListener('mousemove', _onResizeMove);
        document.addEventListener('mouseup', _onResizeEnd);
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    }

    function _onResizeMove(e) {
        const delta = _resizeStartY - e.clientY;  // 向上拖 = 增大
        const newH = Math.min(70 * window.innerHeight / 100, Math.max(60, _resizeStartH + delta));
        const panel = document.querySelector('.terminal-panel');
        if (panel) {
            panel.style.height = newH + 'px';
            terminalHeight.value = newH;
        }
    }

    function _onResizeEnd() {
        document.removeEventListener('mousemove', _onResizeMove);
        document.removeEventListener('mouseup', _onResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    // ═══ 命令表 ═══
    const COMMANDS = {
        help: {
            desc: '显示此帮助信息',
            run: () => {
                termOut('── 可用命令 ──────────────────────────', 'system');
                const entries = Object.entries(COMMANDS);
                const maxLen = Math.max(...entries.map(([k]) => k.length));
                for (const [name, cmd] of entries) {
                    if (name === 'help') continue;
                    termOut(`  ${name.padEnd(maxLen + 1)}${cmd.desc}`);
                }
                termOut('── 使用上下箭头键浏览历史 ────────────', 'system');
            }
        },

        clear: {
            desc: '清空终端屏幕',
            run: () => { termClear(); termWelcome(); }
        },

        validate: {
            desc: '资源完整性校验',
            run: () => {
                termOut('🔍 运行数据完整性校验...', 'system');
                if (typeof ops.validateEditorResources === 'function') {
                    ops.validateEditorResources();
                    termOut('✅ 校验完成（详见弹窗/Toast）');
                } else {
                    // 手动校验
                    _runInlineValidate();
                }
            }
        },

        'export-json': {
            desc: '导出 JSON 格式数据',
            run: () => {
                if (typeof ops.exportJSON === 'function') {
                    ops.exportJSON();
                    termOut('✅ 导出 JSON 弹窗已打开');
                } else {
                    termOut('❌ exportJSON 函数不可用', 'error');
                }
            }
        },

        'export-js': {
            desc: '导出 JS 模块代码',
            run: () => {
                if (typeof ops.exportAll === 'function') {
                    ops.exportAll();
                    termOut('✅ 导出 JS 弹窗已打开');
                } else {
                    termOut('❌ exportAll 函数不可用', 'error');
                }
            }
        },

        'export-zip': {
            desc: '导出资源包 ZIP',
            run: () => {
                if (typeof ops.exportPackZip === 'function') {
                    ops.exportPackZip();
                    termOut('✅ 资源包 ZIP 已下载');
                } else {
                    termOut('❌ exportPackZip 函数不可用', 'error');
                }
            }
        },

        list: {
            desc: '列出资源 (chapters|characters|scenes|cg|items|endings)',
            run: (arg) => {
                if (!arg) {
                    termOut('请指定资源类型: chapters, characters, scenes, cg, items, endings', 'error');
                    return;
                }
                _cmdList(arg);
            }
        },

        stats: {
            desc: '显示剧情统计数据',
            run: () => { _cmdStats(); }
        },

        info: {
            desc: '显示项目概览',
            run: () => { _cmdInfo(); }
        },

        locate: {
            desc: '定位并聚焦某章节 locate <chapterId>',
            run: (arg) => {
                if (!arg) { termOut('请指定章节 ID，如: locate main', 'error'); return; }
                if (typeof ops.locateTo === 'function') {
                    ops.locateTo('chapter', arg);
                    termOut(`📍 已定位到章节: ${arg}`);
                } else {
                    termOut('❌ locateTo 函数不可用', 'error');
                }
            }
        },

        sync: {
            desc: '同步到游戏引擎',
            run: () => {
                if (typeof ops.syncToGame === 'function') {
                    ops.syncToGame();
                    termOut('✅ 已同步到游戏引擎');
                } else {
                    termOut('❌ syncToGame 函数不可用', 'error');
                }
            }
        },

        'auto-layout': {
            desc: '运行自动布局',
            run: () => {
                if (typeof ops.autoLayout === 'function') {
                    ops.autoLayout();
                    termOut('✅ 自动布局完成');
                } else {
                    termOut('❌ autoLayout 函数不可用', 'error');
                }
            }
        },
    };

    // ═══ 命令实现 ═══

    function _runInlineValidate() {
        const { chapters, gameScenes, gameCharacters, gameItems, gameCgLibrary, gameEndings } = ctx;
        let warnings = 0;

        for (const [chId, steps] of Object.entries(chapters || {})) {
            for (let i = 0; i < steps.length; i++) {
                const s = steps[i];
                if (s.sceneId && gameScenes && !gameScenes[s.sceneId]) {
                    termOut(`⚠ [${chId}]#${i + 1} 场景 "${s.sceneId}" 不存在`, 'error');
                    warnings++;
                }
                if (s.characterId && gameCharacters && !gameCharacters[s.characterId]) {
                    termOut(`⚠ [${chId}]#${i + 1} 角色 "${s.characterId}" 不存在`, 'error');
                    warnings++;
                }
                if (s.type === 'choice' && s.choices) {
                    for (const c of s.choices) {
                        if (c.jumpChapter && !chapters[c.jumpChapter] && !c.jumpChapter.startsWith('_end_')) {
                            termOut(`⚠ [${chId}]#${i + 1} 选项跳转到不存在章节 "${c.jumpChapter}"`, 'error');
                            warnings++;
                        }
                    }
                }
            }
        }
        if (warnings === 0) {
            termOut('✅ 数据完整，未发现问题');
        } else {
            termOut(`⚠ 发现 ${warnings} 个问题`);
        }
    }

    function _cmdList(type) {
        const { chapters, gameCharacters, gameScenes, gameCgLibrary, gameItems, gameEndings } = ctx;
        switch (type) {
            case 'chapters': {
                const ids = Object.keys(chapters || {});
                termOut(`📜 章节 (${ids.length})`);
                termOut('──'.repeat(25), 'system');
                for (const id of ids) {
                    const steps = chapters[id];
                    const c = steps.filter(s => s.type === 'choice').length;
                    const j = steps.filter(s => s.type === 'jump').length;
                    const e = steps.filter(s => s.type === 'ending').length;
                    const tags = [`步:${steps.length}`];
                    if (c) tags.push(`分:${c}`);
                    if (j) tags.push(`跳:${j}`);
                    if (e) tags.push(`结:${e}`);
                    termOut(`  ${id}  (${tags.join(' ')})`);
                }
                break;
            }
            case 'characters': {
                const chars = gameCharacters || {};
                termOut(`👤 角色 (${Object.keys(chars).length})`);
                termOut('──'.repeat(25), 'system');
                for (const [id, ch] of Object.entries(chars)) {
                    const sp = Object.keys(ch.sprites || {}).length;
                    termOut(`  ${id}  ${ch.name || '?'}  (立绘:${sp})`);
                }
                break;
            }
            case 'scenes': {
                const scenes = gameScenes || {};
                termOut(`🏞️ 场景 (${Object.keys(scenes).length})`);
                termOut('──'.repeat(25), 'system');
                for (const [id, sc] of Object.entries(scenes)) {
                    termOut(`  ${id}  ${sc.title || ''}`);
                }
                break;
            }
            case 'cg': {
                const cgLib = gameCgLibrary || {};
                termOut(`🖼️ CG (${Object.keys(cgLib).length})`);
                termOut('──'.repeat(25), 'system');
                for (const [id, cg] of Object.entries(cgLib)) {
                    termOut(`  ${id}  ${cg.title || ''}`);
                }
                break;
            }
            case 'items': {
                const items = gameItems || {};
                termOut(`🎒 物品 (${Object.keys(items).length})`);
                termOut('──'.repeat(25), 'system');
                for (const [id, it] of Object.entries(items)) {
                    termOut(`  ${id}  ${it.name || ''} ${it.icon || ''}`);
                }
                break;
            }
            case 'endings': {
                const ends = gameEndings || [];
                termOut(`🎬 结局 (${ends.length})`);
                termOut('──'.repeat(25), 'system');
                for (const end of ends) {
                    termOut(`  ${end.id}  ${end.title || ''}`);
                }
                break;
            }
            default:
                termOut(`未知类型: ${type}，可用: chapters|characters|scenes|cg|items|endings`, 'error');
        }
    }

    function _cmdStats() {
        const { chapters, gameCharacters, gameScenes, gameCgLibrary, gameItems, gameEndings } = ctx;
        const chIds = Object.keys(chapters || {});
        let totalSteps = 0, totalDialogue = 0, totalChoices = 0, totalJumps = 0, totalEndings = 0;
        let totalChars = 0, totalOptions = 0;

        for (const steps of Object.values(chapters || {})) {
            totalSteps += steps.length;
            for (const s of steps) {
                if (s.type === 'dialogue' || !s.type) totalDialogue++;
                else if (s.type === 'choice') { totalChoices++; if (s.choices) totalOptions += s.choices.length; }
                else if (s.type === 'jump') totalJumps++;
                else if (s.type === 'ending') totalEndings++;
                if (s.text) totalChars += s.text.length;
                if (s.texts) for (const t of s.texts) totalChars += t.length;
            }
        }

        termOut('📊 剧情统计');
        termOut(`章节: ${chIds.length}`);
        termOut(`步骤: ${totalSteps} (对话${totalDialogue} 分支${totalChoices} 跳转${totalJumps} 结局${totalEndings})`);
        termOut(`分支选项: ${totalOptions}`);
        termOut(`总字数: ${totalChars}`);
        termOut(`角色: ${Object.keys(gameCharacters || {}).length}`);
        termOut(`场景: ${Object.keys(gameScenes || {}).length}`);
        termOut(`CG: ${Object.keys(gameCgLibrary || {}).length}`);
        termOut(`物品: ${Object.keys(gameItems || {}).length}`);
        termOut(`结局: ${(gameEndings || []).length}`);
    }

    function _cmdInfo() {
        const { gameConfig, chapters, gameCharacters, gameScenes, gameCgLibrary, gameItems, gameEndings } = ctx;
        termOut(`📖 ${gameConfig?.title || '未命名游戏'}`);
        termOut(`画面: ${gameConfig?.aspectRatio?.width || 1280}×${gameConfig?.aspectRatio?.height || 720}`);
        termOut(`章节: ${Object.keys(chapters || {}).length}`);
        termOut(`角色: ${Object.keys(gameCharacters || {}).length}`);
        termOut(`场景: ${Object.keys(gameScenes || {}).length}`);
        termOut(`CG: ${Object.keys(gameCgLibrary || {}).length}`);
        termOut(`物品: ${Object.keys(gameItems || {}).length}`);
        termOut(`结局: ${(gameEndings || []).length}`);
    }

    // ═══ 执行命令 ═══
    function executeTerminalCommand(input) {
        const trimmed = input.trim();
        if (!trimmed) return;

        // 记录到历史
        terminalHistory.push(trimmed);
        historyIndex = terminalHistory.length;

        // 显示输入回显
        termOut(`$ ${trimmed}`, 'input');

        // 解析命令
        const parts = trimmed.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const arg = parts.slice(1).join(' ');

        const command = COMMANDS[cmd];
        if (command) {
            try {
                command.run(arg);
            } catch (e) {
                termOut(`❌ 命令执行出错: ${e.message}`, 'error');
                console.error('[Terminal]', e);
            }
        } else {
            termOut(`❌ 未知命令: ${cmd}。输入 help 查看可用命令`, 'error');
        }
    }

    /** 处理输入框键盘事件（回车执行 + 上下翻历史） */
    function onTerminalKeydown(e) {
        if (e.key === 'Enter') {
            executeTerminalCommand(terminalInput.value);
            terminalInput.value = '';
            // 滚动到底部
            nextTick(() => {
                const el = document.querySelector('.terminal-output');
                if (el) el.scrollTop = el.scrollHeight;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (terminalHistory.length === 0) return;
            historyIndex = Math.max(0, historyIndex - 1);
            terminalInput.value = terminalHistory[historyIndex];
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex >= terminalHistory.length - 1) {
                historyIndex = terminalHistory.length;
                terminalInput.value = '';
            } else {
                historyIndex++;
                terminalInput.value = terminalHistory[historyIndex];
            }
        }
    }

    /** 切换终端面板显示 */
    function toggleTerminal() {
        terminalVisible.value = !terminalVisible.value;
        if (terminalVisible.value) {
            nextTick(() => {
                const el = document.querySelector('.terminal-input');
                if (el) el.focus();
                const out = document.querySelector('.terminal-output');
                if (out) out.scrollTop = out.scrollHeight;
            });
        }
    }

    // ═══ 键盘快捷键绑定（Ctrl+` 切换） ═══
    function onTerminalGlobalKeydown(e) {
        if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            toggleTerminal();
        }
    }

    // 注册全局快捷键（在 onMounted 回调外，由调用方管理）

    return {
        terminalVisible,
        terminalLines,
        terminalInput,
        terminalFullscreen,
        terminalHeight,
        terminalPanelClass,
        toggleTerminal,
        toggleFullscreen,
        onResizeStart,
        executeTerminalCommand,
        onTerminalKeydown,
        onTerminalGlobalKeydown,
        termWelcome,
        termClear,
        termOut,
    };
}
