/**
 * editor/ui/terminal.js —— 内置终端面板
 *
 * 在编辑器内直接模拟命令行界面，调用已有 editor 函数。
 * 无需打开系统终端 / Node.js。
 */

export function createTerminal(ctx, ops) {
    const { ref, reactive, computed, nextTick } = Vue;

    // 尽早注入终端全局样式（user-select、textarea 等，不依赖下拉菜单）
    _injectTerminalCSS();

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
        termOut(`│  内置终端 v2.0                  │`, 'system');
        termOut(`│  输入 help 查看可用命令  按 / 打开│`, 'system');
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
        const rect = panel.getBoundingClientRect();
        _resizeStartY = e.clientY;
        _resizeStartH = rect.height;
        document.addEventListener('mousemove', _onResizeMove);
        document.addEventListener('mouseup', _onResizeEnd);
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    }

    function _onResizeMove(e) {
        const delta = _resizeStartY - e.clientY;
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

    // ═══ 深度路径辅助 ═══

    function deepGet(obj, path) {
        if (!path) return obj;
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current == null || typeof current !== 'object') return undefined;
            if (Array.isArray(current)) {
                current = /^\d+$/.test(part)
                    ? current[parseInt(part)]
                    : current.find(item => item && item.id === part);
            } else {
                current = current[part];
            }
        }
        return current;
    }

    function deepSet(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (current == null || typeof current !== 'object') return false;
            const nextIsNum = /^\d+$/.test(parts[i + 1]);
            if (!(parts[i] in current)) {
                current[parts[i]] = nextIsNum ? [] : {};
            }
            current = current[parts[i]];
        }
        if (current == null || typeof current !== 'object') return false;
        current[parts[parts.length - 1]] = value;
        return true;
    }

    function parseValue(str) {
        if (str === undefined || str === null) return str;
        try { return JSON.parse(str); } catch {}
        if (/^-?\d+(\.\d+)?$/.test(str)) return Number(str);
        return str;
    }

    /** 判断当前焦点是否在输入框中 */
    function isInputFocused() {
        const tag = document.activeElement?.tagName || '';
        const editable = document.activeElement?.getAttribute('contenteditable');
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable === 'true';
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
                    _runInlineValidate();
                }
            }
        },

        export: {
            desc: '导出数据 (export json|js|zip)',
            run: (arg) => {
                const sub = (arg || '').trim().toLowerCase();
                switch (sub) {
                    case 'json':
                        if (typeof ops.exportJSON === 'function') {
                            ops.exportJSON();
                            termOut('✅ 导出 JSON 弹窗已打开');
                        } else {
                            termOut('❌ exportJSON 函数不可用', 'error');
                        }
                        break;
                    case 'js':
                        if (typeof ops.exportAll === 'function') {
                            ops.exportAll();
                            termOut('✅ 导出 JS 弹窗已打开');
                        } else {
                            termOut('❌ exportAll 函数不可用', 'error');
                        }
                        break;
                    case 'zip':
                        if (typeof ops.exportPackZip === 'function') {
                            ops.exportPackZip();
                            termOut('✅ 资源包 ZIP 已下载');
                        } else {
                            termOut('❌ exportPackZip 函数不可用', 'error');
                        }
                        break;
                    default:
                        termOut('用法: export json | js | zip', 'system');
                        break;
                }
            }
        },

        info: {
            desc: '显示项目信息 (info stats|chapters|resources)',
            run: (arg) => {
                const sub = (arg || '').trim().toLowerCase();
                switch (sub) {
                    case 'stats':     _cmdInfoStats(); break;
                    case 'chapters':  _cmdInfoChapters(); break;
                    case 'resources': _cmdInfoResources(); break;
                    default:          _cmdInfoOverview();
                }
            }
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

        resource: {
            desc: '资源管理 (add|delete|set|get|list|rename)',
            run: (arg) => {
                if (!arg) {
                    termOut('用法: resource <action> <type> [id] [path] [value]', 'system');
                    termOut('操作: add, delete, set, get, list, rename', 'system');
                    termOut('示例: resource list chapters', 'system');
                    termOut('示例: resource get characters hero', 'system');
                    termOut('示例: resource set characters hero name "新名称"', 'system');
                    termOut('示例: resource add scenes my_scene', 'system');
                    return;
                }
                const parts = arg.split(/\s+/);
                const action = parts[0].toLowerCase();
                switch (action) {
                    case 'add':    _cmdResourceAdd(parts.slice(1)); break;
                    case 'delete': _cmdResourceDelete(parts.slice(1)); break;
                    case 'set':    _cmdResourceSet(parts.slice(1), arg); break;
                    case 'get':    _cmdResourceGet(parts.slice(1)); break;
                    case 'list':   _cmdResourceList(parts[1]); break;
                    case 'rename': _cmdResourceRename(parts.slice(1)); break;
                    default:
                        termOut(`❌ 未知资源操作: ${action}`, 'error');
                        termOut('有效操作: add, delete, set, get, list, rename', 'system');
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

    // ─── info 子命令 ───

    function _cmdInfoOverview() {
        const { gameConfig, chapters, gameCharacters, gameScenes, gameCgLibrary, gameItems, gameEndings } = ctx;
        termOut(`📖 ${gameConfig?.title || '未命名游戏'}`);
        termOut(`画面: ${gameConfig?.aspectRatio?.width || 1280}×${gameConfig?.aspectRatio?.height || 720}`);
        termOut(`打字速度: ${gameConfig?.textSpeed || 25}ms/字`);
        termOut(`章节: ${Object.keys(chapters || {}).length}`);
        termOut(`步骤: ${Object.values(chapters || {}).reduce((a, s) => a + s.length, 0)}`);
        termOut(`角色: ${Object.keys(gameCharacters || {}).length}`);
        termOut(`场景: ${Object.keys(gameScenes || {}).length}`);
        termOut(`CG: ${Object.keys(gameCgLibrary || {}).length}`);
        termOut(`物品: ${Object.keys(gameItems || {}).length}`);
        termOut(`结局: ${(gameEndings || []).length}`);
        termOut('──', 'system');
        termOut('使用 info stats 查看详细统计', 'system');
        termOut('使用 info chapters 查看章节列表', 'system');
    }

    function _cmdInfoStats() {
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

        termOut('📊 详细剧情统计');
        termOut(`章节: ${chIds.length}`);
        termOut(`步骤: ${totalSteps} (对话${totalDialogue} 分支${totalChoices} 跳转${totalJumps} 结局${totalEndings})`);
        termOut(`分支选项: ${totalOptions}`);
        termOut(`总字数: ${totalChars}`);
        termOut(`平均每章步数: ${chIds.length > 0 ? (totalSteps / chIds.length).toFixed(1) : '0'}`);
        termOut(`角色: ${Object.keys(gameCharacters || {}).length}`);
        termOut(`场景: ${Object.keys(gameScenes || {}).length}`);
        termOut(`CG: ${Object.keys(gameCgLibrary || {}).length}`);
        termOut(`物品: ${Object.keys(gameItems || {}).length}`);
        termOut(`结局: ${(gameEndings || []).length}`);
    }

    function _cmdInfoChapters() {
        const { chapters, chapterDescriptions } = ctx;
        const ids = Object.keys(chapters || {});
        termOut(`📜 章节列表 (${ids.length})`);
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
            const desc = chapterDescriptions?.[id];
            if (desc) termOut(`    ${desc.substring(0, 60)}`, 'system');
        }
    }

    function _cmdInfoResources() {
        const { gameCharacters, gameScenes, gameCgLibrary, gameItems, gameEndings } = ctx;
        const chars = gameCharacters || {};
        termOut(`👤 角色 (${Object.keys(chars).length})`);
        for (const [id, ch] of Object.entries(chars)) {
            termOut(`  ${id}  ${ch.name || '?'}  (立绘:${Object.keys(ch.sprites || {}).length})`);
        }
        const scenes = gameScenes || {};
        termOut(`🏞️ 场景 (${Object.keys(scenes).length})`);
        for (const [id, sc] of Object.entries(scenes)) {
            termOut(`  ${id}  ${sc.title || ''}`);
        }
        const cgs = gameCgLibrary || {};
        termOut(`🖼️ CG (${Object.keys(cgs).length})`);
        for (const [id, cg] of Object.entries(cgs)) {
            termOut(`  ${id}  ${cg.title || ''}`);
        }
        const items = gameItems || {};
        termOut(`🎒 物品 (${Object.keys(items).length})`);
        for (const [id, it] of Object.entries(items)) {
            termOut(`  ${id}  ${it.name || ''} ${it.icon || ''}`);
        }
        const ends = gameEndings || [];
        termOut(`🎬 结局 (${ends.length})`);
        for (const end of ends) {
            termOut(`  ${end.id}  ${end.title || ''}`);
        }
    }

    // ─── resource 子命令 ───

    function _getResourceMeta(type) {
        const map = {
            chapters:   { data: ctx.chapters,        label:'章节', isObject:true },
            characters: { data: ctx.gameCharacters,  label:'角色', isObject:true },
            scenes:     { data: ctx.gameScenes,      label:'场景', isObject:true },
            cg:         { data: ctx.gameCgLibrary,   label:'CG 图鉴', isObject:true },
            items:      { data: ctx.gameItems,       label:'物品', isObject:true },
            endings:    { data: ctx.gameEndings,     label:'结局', isObject:false },
        };
        return map[type] || null;
    }

    function _cmdResourceList(type) {
        if (!type) { termOut('请指定资源类型: chapters, characters, scenes, cg, items, endings', 'error'); return; }
        const meta = _getResourceMeta(type);
        if (!meta) { termOut(`未知类型: ${type}，可用: chapters|characters|scenes|cg|items|endings`, 'error'); return; }

        const chapters = ctx.chapters || {};
        if (type === 'chapters') {
            const ids = Object.keys(chapters);
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
        } else if (type === 'characters') {
            const chars = ctx.gameCharacters || {};
            termOut(`👤 角色 (${Object.keys(chars).length})`);
            termOut('──'.repeat(25), 'system');
            for (const [id, ch] of Object.entries(chars)) {
                const sp = Object.keys(ch.sprites || {}).length;
                termOut(`  ${id}  ${ch.name || '?'}  (立绘:${sp})`);
            }
        } else if (type === 'scenes') {
            const scenes = ctx.gameScenes || {};
            termOut(`🏞️ 场景 (${Object.keys(scenes).length})`);
            termOut('──'.repeat(25), 'system');
            for (const [id, sc] of Object.entries(scenes)) {
                termOut(`  ${id}  ${sc.title || ''}`);
            }
        } else if (type === 'cg') {
            const cgLib = ctx.gameCgLibrary || {};
            termOut(`🖼️ CG (${Object.keys(cgLib).length})`);
            termOut('──'.repeat(25), 'system');
            for (const [id, cg] of Object.entries(cgLib)) {
                termOut(`  ${id}  ${cg.title || ''}`);
            }
        } else if (type === 'items') {
            const items = ctx.gameItems || {};
            termOut(`🎒 物品 (${Object.keys(items).length})`);
            termOut('──'.repeat(25), 'system');
            for (const [id, it] of Object.entries(items)) {
                termOut(`  ${id}  ${it.name || ''} ${it.icon || ''}`);
            }
        } else if (type === 'endings') {
            const ends = ctx.gameEndings || [];
            termOut(`🎬 结局 (${ends.length})`);
            termOut('──'.repeat(25), 'system');
            for (let i = 0; i < ends.length; i++) {
                const end = ends[i];
                termOut(`  [${i}] ${end.id}  ${end.title || ''}`);
            }
        }
    }

    function _cmdResourceAdd(args) {
        const type = args[0];
        const customId = args[1];
        if (!type) { termOut('请指定资源类型: chapters, characters, scenes, cg, items, endings', 'error'); return; }

        // 直接用编辑器已有的 addResource 函数
        if (typeof ops.addResource === 'function') {
            // 如果是章节，需要特殊处理
            if (type === 'chapters') {
                ops.saveUndoSnapshot?.();
                const newId = customId || ('chapter_' + Date.now().toString(36));
                if (ctx.chapters[newId]) { termOut(`❌ "${newId}" 已存在`, 'error'); return; }
                ctx.chapters[newId] = [
                    { sceneId:'', type:'dialogue', characterId:null, text:'新对话段落...', effects:[] },
                    { sceneId:'', type:'jump', jumpChapter:'' }
                ];
                if (!ctx.nodePositions) ctx.nodePositions = {};
                ctx.nodePositions[newId] = { x: 400, y: 300 };
                termOut(`✅ 已创建章节：${newId}`);
                return;
            }

            // 对于非章节资源，设置 resourceTab 然后调用 addResource
            const savedTab = ctx.resourceTab?.value;
            if (ctx.resourceTab) ctx.resourceTab.value = type;
            ops.addResource(type);
            if (savedTab && ctx.resourceTab) ctx.resourceTab.value = savedTab;
            termOut(`✅ 已创建新${_getResourceMeta(type)?.label || type}`);
        } else {
            // 后备：直接操作数据
            const meta = _getResourceMeta(type);
            if (!meta) { termOut(`❌ 未知资源类型: ${type}`, 'error'); return; }
            const newId = customId || (type + '_' + Date.now().toString(36));

            if (meta.isObject) {
                if (meta.data[newId]) { termOut(`❌ "${newId}" 已存在`, 'error'); return; }
                const defaults = {
                    characters: { name:'新角色', color:'#ffffff', race:'', gender:'', role:'', defaultSpeed:25, description:'', avatars:{}, sprites:{ default:{ id:'default', label:'👤 默认', url:'' } } },
                    scenes: { title:'新场景', url:'', bgPlaceholder:'#111111' },
                    cg: { title:'新 CG', subtitle:'', url:'' },
                    items: { name:'新物品', icon:'📦', image:'', description:'' },
                };
                meta.data[newId] = defaults[type] || {};
            } else {
                if (meta.data.some(e => e.id === newId)) { termOut(`❌ "${newId}" 已存在`, 'error'); return; }
                meta.data.push({ id:newId, title:'新结局', description:'' });
            }
            termOut(`✅ 已创建${meta.label}：${newId}`);
        }
    }

    function _cmdResourceDelete(args) {
        const type = args[0];
        const id = args[1];
        if (!type || !id) { termOut('用法: resource delete <type> <id>', 'error'); return; }
        const meta = _getResourceMeta(type);
        if (!meta) { termOut(`❌ 未知资源类型: ${type}`, 'error'); return; }

        if (typeof ops.deleteResource === 'function') {
            ops.deleteResource(type, id);
            termOut(`✅ 已删除${meta.label}：${id}`);
        } else {
            // 后备
            if (meta.isObject) {
                if (!(id in meta.data)) { termOut(`❌ "${id}" 不存在`, 'error'); return; }
                delete meta.data[id];
            } else {
                const idx = meta.data.findIndex(e => e.id === id);
                if (idx === -1) { termOut(`❌ "${id}" 不存在`, 'error'); return; }
                meta.data.splice(idx, 1);
            }
            termOut(`✅ 已删除${meta.label}：${id}`);
        }
    }

    function _cmdResourceSet(args, rawArg) {
        const type = args[0];
        const id = args[1];
        const path = args[2];
        const valueRaw = args.slice(3).join(' ');

        if (!type || !id || !path) {
            termOut('用法: resource set <type> <id> <path> <value>', 'error');
            termOut('示例: resource set characters hero name "新名称"', 'system');
            termOut('示例: resource set chapters main 0.text "新对话"', 'system');
            return;
        }

        const meta = _getResourceMeta(type);
        if (!meta) { termOut(`❌ 未知资源类型: ${type}`, 'error'); return; }

        let target;
        if (meta.isObject) {
            target = meta.data[id];
        } else {
            target = meta.data.find(e => e.id === id);
        }
        if (!target) { termOut(`❌ "${id}" 不存在`, 'error'); return; }

        const value = parseValue(valueRaw);
        const oldVal = deepGet(target, path);
        const ok = deepSet(target, path, value);
        if (!ok) { termOut(`❌ 无法设置路径 "${path}"`, 'error'); return; }

        const displayVal = JSON.stringify(value);
        const displayOld = oldVal !== undefined ? JSON.stringify(oldVal) : '(无)';
        termOut(`✅ 已设置 ${type}.${id}.${path}`);
        termOut(`  ${displayOld} → ${displayVal}`);
    }

    function _cmdResourceGet(args) {
        const type = args[0];
        const id = args[1];
        const path = args[2];

        if (!type || !id) {
            termOut('用法: resource get <type> <id> [path]', 'error');
            termOut('示例: resource get characters hero', 'system');
            termOut('示例: resource get characters hero name', 'system');
            return;
        }

        const meta = _getResourceMeta(type);
        if (!meta) { termOut(`❌ 未知资源类型: ${type}`, 'error'); return; }

        let target;
        if (meta.isObject) {
            target = meta.data[id];
        } else {
            target = meta.data.find(e => e.id === id);
        }
        if (!target) { termOut(`❌ "${id}" 不存在`, 'error'); return; }

        const result = path ? deepGet(target, path) : target;
        if (result === undefined) {
            termOut(`❌ 路径 "${path}" 不存在于 ${type}.${id}`, 'error');
            return;
        }

        if (typeof result === 'string') {
            termOut(result);
        } else {
            termOut(JSON.stringify(result, null, 2));
        }
    }

    function _cmdResourceRename(args) {
        const type = args[0];
        const oldId = args[1];
        const newId = args[2];
        if (!type || !oldId || !newId) {
            termOut('用法: resource rename <type> <oldId> <newId>', 'error');
            return;
        }
        const meta = _getResourceMeta(type);
        if (!meta) { termOut(`❌ 未知资源类型: ${type}`, 'error'); return; }

        if (meta.isObject) {
            if (!(oldId in meta.data)) { termOut(`❌ "${oldId}" 不存在`, 'error'); return; }
            if (newId in meta.data) { termOut(`❌ "${newId}" 已存在`, 'error'); return; }
            meta.data[newId] = meta.data[oldId];
            delete meta.data[oldId];
        } else {
            const item = meta.data.find(e => e.id === oldId);
            if (!item) { termOut(`❌ "${oldId}" 不存在`, 'error'); return; }
            if (meta.data.some(e => e.id === newId)) { termOut(`❌ "${newId}" 已存在`, 'error'); return; }
            item.id = newId;
        }

        // 更新引用（简化版——仅处理章节跳转）
        if (type === 'chapters') {
            for (const steps of Object.values(ctx.chapters || {})) {
                for (const step of steps) {
                    if (step.jumpChapter === oldId) step.jumpChapter = newId;
                    if (step.type === 'choice' && step.choices) {
                        for (const ch of step.choices) {
                            if (ch.jumpChapter === oldId) ch.jumpChapter = newId;
                        }
                    }
                }
            }
        }
        if (type === 'characters') {
            for (const steps of Object.values(ctx.chapters || {})) {
                for (const step of steps) {
                    if (step.characterId === oldId) step.characterId = newId;
                }
            }
        }
        if (type === 'scenes') {
            for (const steps of Object.values(ctx.chapters || {})) {
                for (const step of steps) {
                    if (step.sceneId === oldId) step.sceneId = newId;
                }
            }
        }

        termOut(`✅ 已重命名${meta.label}：${oldId} → ${newId}`);
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

    /** 处理输入框键盘事件 */
    function onTerminalKeydown(e) {
        // ─── 下拉菜单 / 历史搜索 打开时的特殊处理 ───
        if (_compOpen || _histSearchActive) {
            switch (e.key) {
                case 'Tab':
                    e.preventDefault();
                    if (_histSearchActive) { _compNext(); return; }
                    _compAccept();
                    return;
                case 'Enter':
                    e.preventDefault();
                    if (_histSearchActive) { _execHistSearch(); return; }
                    _compAccept();
                    // 接受补全后自动执行命令
                    nextTick(() => {
                        const val = terminalInput.value.trim();
                        if (val) {
                            executeTerminalCommand(val);
                            terminalInput.value = '';
                            nextTick(_scrollTermOutput);
                        }
                    });
                    return;
                case 'ArrowUp':
                    e.preventDefault();
                    if (_histSearchActive) { _compPrev(); return; }
                    _compPrev();
                    return;
                case 'ArrowDown':
                    e.preventDefault();
                    if (_histSearchActive) { _compNext(); return; }
                    _compNext();
                    return;
                case 'Escape':
                    e.preventDefault();
                    if (_histSearchActive) { _cancelHistSearch(); return; }
                    _compHide();
                    return;
                default:
                    // 打字时实时过滤
                    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                        nextTick(() => {
                            if (_histSearchActive) {
                                _updateHistSearch(terminalInput.value);
                            } else {
                                const cand = _getCompletions(terminalInput.value);
                                if (cand.length > 0) {
                                    _compShow(cand, terminalInput.value);
                                } else {
                                    _compHide();
                                }
                            }
                        });
                    }
                    return;
            }
        }

        // ─── 常规模式 ───
        switch (e.key) {
            case 'Enter': {
                // textarea：Shift+Enter 换行，Enter 提交
                if (e.shiftKey) return; // 允许默认换行
                e.preventDefault();
                _compHide();
                const val = terminalInput.value;
                if (!val.trim()) break;
                executeTerminalCommand(val);
                terminalInput.value = '';
                nextTick(() => {
                    _autoResizeInput();
                    _scrollTermOutput();
                });
                break;
            }
            case 'ArrowUp':
                e.preventDefault();
                if (terminalHistory.length === 0) break;
                historyIndex = Math.max(0, historyIndex - 1);
                terminalInput.value = terminalHistory[historyIndex];
                _autoResizeInput();
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (historyIndex >= terminalHistory.length - 1) {
                    historyIndex = terminalHistory.length;
                    terminalInput.value = '';
                } else {
                    historyIndex++;
                    terminalInput.value = terminalHistory[historyIndex];
                }
                _autoResizeInput();
                break;
            case 'Tab':
                e.preventDefault();
                _doTabComplete();
                break;
            case 'Escape':
                if (_compOpen || _histSearchActive) {
                    if (_histSearchActive) _cancelHistSearch();
                    else _compHide();
                } else {
                    e.preventDefault();
                    toggleTerminal();
                }
                break;
        }

        // Ctrl+R / Ctrl+E 历史搜索
        if ((e.key === 'r' || e.key === 'R') && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            _startHistSearch();
        }
    }

    function _scrollTermOutput() {
        const el = document.querySelector('.terminal-output');
        if (el) el.scrollTop = el.scrollHeight;
    }

    // ═══ IDE 风格补全 + 下拉菜单 ═══

    /** 顶层命令列表 */
    const _TOP_COMMANDS = Object.keys(COMMANDS).sort();

    /** 资源类型列表 */
    const _RESOURCE_TYPES = ['chapters', 'characters', 'scenes', 'cg', 'items', 'endings'];

    /** 资源操作列表 */
    const _RESOURCE_ACTIONS = ['add', 'delete', 'set', 'get', 'list', 'rename'];

    /** 静态子命令映射 */
    const _SUB_COMMANDS = {
        info:    ['stats', 'chapters', 'resources'],
    };

    // ─── 下拉菜单 DOM ───

    let _compEl = null;          // 下拉菜单 DOM 元素
    let _compCSS = false;        // CSS 已注入标记
    let _compItems = [];         // 当前候选项列表 {label, type}
    let _compSel = 0;            // 选中索引
    let _compOrigin = '';        // 打开时的原始输入
    let _compOpen = false;       // 菜单是否打开
    let _compInputFrozen = false;// 防止键盘事件冲突

    /** 注入终端全局样式（仅一次，尽早执行） */
    function _injectTerminalCSS() {
        if (document.getElementById('term-global-css')) return;
        const s = document.createElement('style');
        s.id = 'term-global-css';
        s.textContent = `
.terminal-output, .terminal-line { user-select: text !important; -webkit-user-select: text !important; }
.terminal-input { resize: none; overflow: hidden; white-space: pre-wrap; word-break: break-all; min-height: 1.2em; }
.terminal-panel.terminal-collapsed.terminal-fullscreen { height: 0 !important; min-height: 0 !important; overflow: hidden !important; border-top: none !important; }
`;
        document.head.appendChild(s);
    }

    /** 注入下拉菜单样式（首次打开补全时执行） */
    function _injectCompCSS() {
        if (_compCSS) return;
        _compCSS = true;
        const s = document.createElement('style');
        s.id = 'term-comp-css';
        s.textContent = `
.term-comp {
  position: absolute; left: 0; right: 0; bottom: 100%; z-index: 2000;
  background: #181825; border: 1px solid #45475a; border-radius: 8px 8px 0 0;
  border-bottom: none;
  font: 13px/1.5 'Cascadia Code','Fira Code','JetBrains Mono',Consolas,monospace;
  box-shadow: 0 -6px 20px rgba(0,0,0,.45);
  max-height: 280px; overflow-y: auto; display: none;
}
.term-comp .tc-item {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 14px; cursor: pointer; color: #cdd6f4;
  transition: none;
}
.term-comp .tc-item:first-child { padding-top: 7px; }
.term-comp .tc-item:last-child { padding-bottom: 7px; }
.term-comp .tc-item .tc-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.term-comp .tc-item .tc-label .hl { color: #89b4fa; font-weight: 700; }
.term-comp .tc-item .tc-type {
  font-size: 10.5px; padding: 1px 7px; border-radius: 4px;
  background: #313244; color: #a6adc8; white-space: nowrap; flex-shrink: 0;
}
.term-comp .tc-item.sel, .term-comp .tc-item:hover { background: #313244; }
.term-comp .tc-item.sel { background: #1e2a4a; }
.term-comp .tc-item.sel .tc-type { background: #1e66f5; color: #fff; }
.term-comp .tc-empty { padding: 8px 14px; color: #6c7086; font-style: italic; }
.term-comp .tc-footer { padding: 3px 14px; border-top: 1px solid #313244; font-size: 11px; color: #6c7086; display: flex; justify-content: space-between; flex-shrink: 0; }
.term-comp::-webkit-scrollbar { width: 6px; }
.term-comp::-webkit-scrollbar-track { background: transparent; }
.term-comp::-webkit-scrollbar-thumb { background: #45475a; border-radius: 3px; }
.terminal-input-row { position: relative; align-items: stretch; }
`;
        document.head.appendChild(s);
    }

    /** 创建 / 获取下拉菜单 DOM */
    function _compElEnsure() {
        if (_compEl) return _compEl;
        _injectCompCSS();
        _compEl = document.createElement('div');
        _compEl.className = 'term-comp';
        _compEl.addEventListener('mousedown', e => e.preventDefault());
        _compEl.addEventListener('click', e => {
            const item = e.target.closest('.tc-item');
            if (item) _compAccept(parseInt(item.dataset.idx));
        });
        // 追加到输入行内部作为子元素（bottom:100% 使其紧贴输入框上方）
        const row = document.querySelector('.terminal-input-row');
        if (row) {
            row.appendChild(_compEl);
        }
        return _compEl;
    }

    /** 渲染下拉菜单 */
    function _compRender() {
        const el = _compElEnsure();
        if (!_compItems.length) {
            el.style.display = 'none';
            _compOpen = false;
            return;
        }
        el.innerHTML = '';
        for (let i = 0; i < _compItems.length; i++) {
            const { label, type } = _compItems[i];
            const div = document.createElement('div');
            div.className = 'tc-item' + (i === _compSel ? ' sel' : '');
            div.dataset.idx = i;

            // 高亮匹配字符
            const originLast = _compOrigin.trimEnd().split(/\s+/).pop() || '';
            let html = '';
            if (originLast && label.toLowerCase().startsWith(originLast.toLowerCase())) {
                html = `<span class="hl">${label.slice(0, originLast.length)}</span>${_escapeHTML(label.slice(originLast.length))}`;
            } else {
                html = _escapeHTML(label);
            }

            div.innerHTML = `<span class="tc-label">${html}</span><span class="tc-type">${_escapeHTML(type)}</span>`;
            el.appendChild(div);
        }

        // 底部计数器
        const footer = document.createElement('div');
        footer.className = 'tc-footer';
        footer.innerHTML = `<span>${_compSel + 1}/${_compItems.length} 匹配</span><span>Tab 补全 · ↑↓ 导航 · Enter 确认 · Esc 关闭</span>`;
        el.appendChild(footer);

        el.style.display = 'block';
        el.scrollTop = 0;
        // 保证选中项可见
        const selEl = el.querySelector('.tc-item.sel');
        if (selEl) selEl.scrollIntoView({ block: 'nearest' });
        _compOpen = true;
    }

    /** 显示下拉菜单 */
    function _compShow(candidates, origin, preserveIndex) {
        _compItems = candidates;
        _compOrigin = origin;
        _compSel = preserveIndex !== undefined ? Math.min(preserveIndex, candidates.length - 1) : 0;
        _compRender();
    }

    /** 隐藏下拉菜单 */
    function _compHide() {
        _compOpen = false;
        _compInputFrozen = false;
        if (_compEl) _compEl.style.display = 'none';
    }

    /** 选中下一项 */
    function _compNext() {
        if (!_compOpen || !_compItems.length) return;
        _compSel = (_compSel + 1) % _compItems.length;
        _compRender();
    }

    /** 选中上一项 */
    function _compPrev() {
        if (!_compOpen || !_compItems.length) return;
        _compSel = (_compSel - 1 + _compItems.length) % _compItems.length;
        _compRender();
    }

    /** 接受选中补全 */
    function _compAccept(idx) {
        const i = idx !== undefined ? idx : _compSel;
        if (i < 0 || i >= _compItems.length) return;
        terminalInput.value = _completeLine(_compOrigin, _compItems[i].label);
        _compHide();
        _autoResizeInput();
        nextTick(() => {
            const el = document.querySelector('.terminal-input');
            if (el) el.focus();
        });
    }

    /** HTML 转义 */
    function _escapeHTML(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ─── 补全逻辑 ───

    /** fuzzy match：query 中的字符按顺序出现在 text 中 */
    function _fuzzyMatch(query, text) {
        if (!query) return true;
        const q = query.toLowerCase(), t = text.toLowerCase();
        let qi = 0;
        for (let ti = 0; ti < t.length && qi < q.length; ti++) {
            if (q[qi] === t[ti]) qi++;
        }
        return qi >= q.length;
    }

    /** 获取指定资源类型的所有可用 ID */
    function _getResourceIdsForType(type) {
        const meta = _getResourceMeta(type);
        if (!meta) return [];
        if (meta.isObject) return Object.keys(meta.data || {});
        return (meta.data || []).map(e => e.id);
    }

    /** 为候选项打 type 标签 */
    function _tag(label, type) {
        return { label, type };
    }

    /**
     * 获取补全候选项（带模糊匹配 + type 标签）
     */
    function _getCompletions(line) {
        const trimmed = line.trimStart();
        const parts = trimmed.split(/\s+/);
        const isEndSpace = line.endsWith(' ');
        const tokenCount = parts.length;
        const partial = (parts[tokenCount - 1] || '').toLowerCase();

        // 空行 → 所有顶层命令
        if (tokenCount === 0 || (tokenCount === 1 && !isEndSpace && parts[0] === '')) {
            return _TOP_COMMANDS.map(c => _tag(c, '命令'));
        }

        const cmd = parts[0].toLowerCase();

        // 正在输入第一个 token → 模糊匹配顶层命令
        if (tokenCount === 1 && !isEndSpace) {
            return _TOP_COMMANDS
                .filter(c => c.startsWith(cmd) || _fuzzyMatch(partial, c))
                .map(c => _tag(c, '命令'));
        }

        const raw = _getRawCompletions(cmd, parts, isEndSpace);
        return raw.map(r => _tag(r.label, r.type));
    }

    /**
     * 获取原始（未打标签）的补全候选项
     */
    function _getRawCompletions(cmd, parts, isEndSpace) {
        const partial = parts[parts.length - 1] || '';
        const staticSubs = _SUB_COMMANDS[cmd];

        // 没有更多参数 → 静态子命令
        if (staticSubs && parts.length <= 2) {
            return staticSubs.map(s => ({ label: s, type: '子命令' }));
        }

        // resource 子命令系统
        if (cmd === 'resource') {
            const tokenIdx = parts.length - 1;
            const typing = (parts[tokenIdx] || '').toLowerCase();

            // token 0 = "resource", token 1 = action
            if (tokenIdx === 1) {
                return _RESOURCE_ACTIONS
                    .filter(a => a.startsWith(typing) || _fuzzyMatch(typing, a))
                    .map(a => ({ label: a, type: '操作' }));
            }

            const action = (parts[1] || '').toLowerCase();

            // token 2 = type
            if (tokenIdx === 2) {
                return _RESOURCE_TYPES
                    .filter(t => t.startsWith(typing) || _fuzzyMatch(typing, t))
                    .map(t => ({ label: t, type: '类型' }));
            }

            // token 3+ = resource ID
            if ((action === 'get' || action === 'delete' || action === 'set' || action === 'rename') && tokenIdx >= 3) {
                const type = parts[2];
                const ids = _getResourceIdsForType(type);
                const typingId = (parts[tokenIdx] || '').toLowerCase();
                return ids
                    .filter(id => id.toLowerCase().startsWith(typingId) || _fuzzyMatch(typingId, id))
                    .map(id => ({ label: id, type: type === 'chapters' ? '章节' : type === 'characters' ? '角色' : 'ID' }));
            }
        }

        return [];
    }

    /**
     * 将当前行用补全词替换最后一个 token
     */
    function _completeLine(line, completion) {
        const trimmed = line.trimEnd();
        if (trimmed === '' || line.endsWith(' ')) {
            return line + completion + ' ';
        }
        const lastSpace = trimmed.lastIndexOf(' ');
        const prefix = lastSpace >= 0 ? trimmed.slice(0, lastSpace + 1) : '';
        return prefix + completion + ' ';
    }

    /** 最长公共前缀 */
    function _commonPrefix(strings) {
        if (!strings || strings.length === 0) return '';
        if (strings.length === 1) return strings[0];
        let prefix = strings[0];
        for (let i = 1; i < strings.length; i++) {
            while (strings[i].indexOf(prefix) !== 0) {
                prefix = prefix.slice(0, -1);
                if (!prefix) return '';
            }
        }
        return prefix;
    }

    /** 执行 Tab 补全 */
    function _doTabComplete() {
        const current = terminalInput.value;

        // 如果下拉菜单已打开 → 接受当前选中
        if (_compOpen) {
            _compAccept();
            return;
        }

        const candidates = _getCompletions(current);
        if (candidates.length === 0) return;

        // 唯一候选 → 直接补全
        if (candidates.length === 1) {
            terminalInput.value = _completeLine(current, candidates[0].label);
            _autoResizeInput();
            return;
        }

        // 尝试公共前缀
        const labels = candidates.map(c => c.label);
        const common = _commonPrefix(labels);
        const lastToken = current.trimEnd().split(/\s+/).pop() || '';
        if (common && common.length > lastToken.length) {
            terminalInput.value = _completeLine(current, common);
            _autoResizeInput();
            // 重检是否仍需菜单
            const after = _getCompletions(terminalInput.value);
            if (after.length > 1) {
                _compShow(after, current);
            }
            return;
        }

        // 显示下拉菜单
        _compShow(candidates, current);
    }

    // ─── 历史搜索 (Ctrl+R) ───

    let _histSearchActive = false;
    let _histSearchQuery = '';
    let _histSearchResults = [];
    let _histSearchSavedInput = '';

    function _startHistSearch() {
        if (terminalHistory.length === 0) return;
        _histSearchActive = true;
        _histSearchQuery = '';
        _histSearchSavedInput = terminalInput.value;
        terminalInput.value = '';
        _histSearchResults = [...terminalHistory];
        _renderHistSearch();
    }

    function _renderHistSearch() {
        const el = _compElEnsure();
        el.style.borderColor = '#40a02b'; // 绿色边框标识搜索模式
        _compItems = _histSearchResults.slice(0, 20).map(h => ({
            label: h.length > 80 ? h.slice(0, 80) + '…' : h,
            type: '⌕ 历史'
        }));
        _compSel = 0;
        _compOrigin = '';
        _compRender();
        // 重写 footer
        const footer = el.querySelector('.tc-footer');
        if (footer) {
            footer.innerHTML = `<span style="color:#a6e3a1">⌕ ${_escapeHTML(_histSearchQuery || '(全部历史)')}</span><span>↑↓ 浏览 · Enter 执行 · Esc 取消</span>`;
        }
        _compInputFrozen = true;
    }

    function _updateHistSearch(query) {
        _histSearchQuery = query;
        if (!query) {
            _histSearchResults = [...terminalHistory];
        } else {
            const q = query.toLowerCase();
            _histSearchResults = terminalHistory.filter(h =>
                h.toLowerCase().includes(q)
            );
        }
        _renderHistSearch();
    }

    function _execHistSearch() {
        _compHide();
        _histSearchActive = false;
        _compInputFrozen = false;
        if (_histSearchResults.length > 0) {
            const idx = Math.min(_compSel, _histSearchResults.length - 1);
            const cmd = _histSearchResults[idx];
            terminalInput.value = cmd;
            executeTerminalCommand(cmd);
            terminalInput.value = '';
            nextTick(() => {
                const el = document.querySelector('.terminal-input');
                if (el) el.focus();
                _scrollTermOutput();
            });
        }
    }

    function _cancelHistSearch() {
        _compHide();
        _histSearchActive = false;
        _compInputFrozen = false;
        terminalInput.value = _histSearchSavedInput;
        _histSearchSavedInput = '';
    }

    function _autoResizeInput() {
        nextTick(() => {
            const el = document.querySelector('.terminal-input');
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 200) + 'px';
        });
    }

    // 监听 textarea 输入自动调整高度
    document.addEventListener('input', (e) => {
        if (e.target && e.target.matches('.terminal-input')) {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
        }
    }, true);

    /** 切换终端面板显示 */
    function toggleTerminal() {
        _compHide();
        if (_histSearchActive) _cancelHistSearch();
        terminalVisible.value = !terminalVisible.value;
        // 关闭时同步退出全屏，避免 CSS 冲突导致面板无法隐藏
        if (!terminalVisible.value) {
            terminalFullscreen.value = false;
        }
        if (terminalVisible.value) {
            nextTick(() => {
                const el = document.querySelector('.terminal-input');
                if (el) el.focus();
                const out = document.querySelector('.terminal-output');
                if (out) out.scrollTop = out.scrollHeight;
                _autoResizeInput();
            });
        }
    }

    // 点击终端外关闭下拉菜单
    function _onDocMouseDown(e) {
        if (!_compOpen) return;
        const panel = e.target.closest('.terminal-panel');
        if (!panel) _compHide();
    }
    document.addEventListener('mousedown', _onDocMouseDown);

    // ═══ 键盘快捷键绑定 ═══
    function onTerminalGlobalKeydown(e) {
        // Ctrl+` 切换终端
        if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            toggleTerminal();
        }
        // ESC 关闭终端
        if (e.key === 'Escape' && terminalVisible.value && !_compOpen && !_histSearchActive) {
            e.preventDefault();
            toggleTerminal();
            return;
        }
        // 按 / 打开终端（仅在非输入框状态）
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isInputFocused()) {
            e.preventDefault();
            if (!terminalVisible.value) {
                toggleTerminal();
            }
            // 聚焦输入框
            nextTick(() => {
                const el = document.querySelector('.terminal-input');
                if (el) el.focus();
            });
        }
    }

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
