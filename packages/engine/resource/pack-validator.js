/**
 * engine/resource/pack-validator.js
 *
 * 资源包验证器 —— 校验资源包结构和数据的完整性。
 */

/**
 * 验证 pack.json 清单结构
 * @param {Object} manifest - pack.json 解析后的对象
 * @returns {string[]} 错误信息列表（空数组表示无错误）
 */
export function validatePackStructure(manifest) {
    const errors = [];

    if (!manifest || typeof manifest !== 'object') {
        errors.push('pack.json 内容为空或格式错误');
        return errors;
    }

    // 必填字段
    if (!manifest.name || typeof manifest.name !== 'string') {
        errors.push('缺少必填字段 "name"（资源包名称）');
    }

    if (!manifest.title || typeof manifest.title !== 'string') {
        errors.push('缺少必填字段 "title"（资源包标题）');
    }

    // 版本号格式
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
        errors.push(`版本号格式无效: "${manifest.version}"（应为 semver 格式，如 1.0.0）`);
    }

    // 格式版本
    if (manifest.format && !/^\d+\.\d+/.test(manifest.format)) {
        errors.push(`格式版本无效: "${manifest.format}"（应为 x.y 格式）`);
    }

    // configs 字段
    if (manifest.configs) {
        if (typeof manifest.configs !== 'object') {
            errors.push('"configs" 字段应为对象');
        } else {
            const validConfigKeys = ['game', 'home', 'characters', 'scenes', 'cgLibrary', 'items', 'endings'];
            for (const key of Object.keys(manifest.configs)) {
                if (!validConfigKeys.includes(key)) {
                    errors.push(`未知配置键: "configs.${key}"（有效键: ${validConfigKeys.join(', ')}）`);
                }
                if (typeof manifest.configs[key] !== 'string') {
                    errors.push(`"configs.${key}" 应为字符串路径`);
                }
            }
        }
    }

    // chapters 字段
    if (!manifest.chapters || typeof manifest.chapters !== 'object' || Object.keys(manifest.chapters).length === 0) {
        errors.push('缺少 "chapters" 字段或章节列表为空');
    } else {
        for (const [chId, filePath] of Object.entries(manifest.chapters)) {
            if (typeof filePath !== 'string') {
                errors.push(`章节 "${chId}" 的文件路径应为字符串`);
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(chId)) {
                errors.push(`章节 ID "${chId}" 包含无效字符（仅允许字母、数字、下划线、连字符）`);
            }
        }
    }

    return errors;
}

/**
 * 验证已加载的资源包数据完整性
 * @param {Object} data - 组装后的完整数据对象
 * @returns {string[]} 警告信息列表
 */
export function validatePackData(data) {
    const warnings = [];

    if (!data) {
        warnings.push('资源包数据为空');
        return warnings;
    }

    // 检查 GAME_CONFIG
    if (!data.GAME_CONFIG || typeof data.GAME_CONFIG !== 'object') {
        warnings.push('缺少 GAME_CONFIG（游戏全局配置）');
    } else {
        const gc = data.GAME_CONFIG;
        if (!gc.title) warnings.push('GAME_CONFIG.title（游戏标题）未设置');
        if (!gc.aspectRatio) {
            warnings.push('GAME_CONFIG.aspectRatio（画面比例）未设置，使用默认 1280×720');
        }
    }

    // 检查 HOME_CONFIG
    if (!data.HOME_CONFIG || typeof data.HOME_CONFIG !== 'object') {
        warnings.push('缺少 HOME_CONFIG（首页配置）');
    }

    // 检查 CHARACTERS
    if (!data.CHARACTERS || typeof data.CHARACTERS !== 'object') {
        warnings.push('缺少 CHARACTERS（角色库），游戏将无可用角色');
    } else {
        const charCount = Object.keys(data.CHARACTERS).length;
        if (charCount === 0) {
            warnings.push('CHARACTERS（角色库）为空');
        }
        // 检查角色结构
        for (const [chId, char] of Object.entries(data.CHARACTERS)) {
            if (!char.name) warnings.push(`角色 "${chId}" 缺少 name（名称）`);
            if (!char.sprites || Object.keys(char.sprites || {}).length === 0) {
                warnings.push(`角色 "${chId}" 缺少 sprites（立绘）`);
            }
        }
    }

    // 检查 SCENES
    if (!data.SCENES || typeof data.SCENES !== 'object') {
        warnings.push('缺少 SCENES（场景库）');
    } else if (Object.keys(data.SCENES).length === 0) {
        warnings.push('SCENES（场景库）为空');
    }

    // 检查 STORY_CHAPTERS
    if (!data.STORY_CHAPTERS || typeof data.STORY_CHAPTERS !== 'object') {
        warnings.push('缺少 STORY_CHAPTERS（故事章节），游戏无剧情内容');
    } else {
        const chCount = Object.keys(data.STORY_CHAPTERS).length;
        let totalSteps = 0;
        let hasMain = false;
        for (const [chId, steps] of Object.entries(data.STORY_CHAPTERS)) {
            if (!Array.isArray(steps)) {
                warnings.push(`章节 "${chId}" 格式错误：应为步骤数组`);
                continue;
            }
            totalSteps += steps.length;
            if (chId === 'main') hasMain = true;

            // 检查各步骤引用的资源是否存在
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                if (step.sceneId && data.SCENES && !data.SCENES[step.sceneId]) {
                    warnings.push(`章节 "${chId}" 步骤 #${i + 1} 引用不存在的场景 "${step.sceneId}"`);
                }
                if (step.characterId && data.CHARACTERS && !data.CHARACTERS[step.characterId]) {
                    warnings.push(`章节 "${chId}" 步骤 #${i + 1} 引用不存在的角色 "${step.characterId}"`);
                }
                if (step.type === 'choice' && step.choices) {
                    for (const choice of step.choices) {
                        if (choice.jumpChapter && !data.STORY_CHAPTERS[choice.jumpChapter]) {
                            warnings.push(`章节 "${chId}" 步骤 #${i + 1} 的分支跳转到不存在的章节 "${choice.jumpChapter}"`);
                        }
                    }
                }
                if (step.jumpChapter && !data.STORY_CHAPTERS[step.jumpChapter]) {
                    warnings.push(`章节 "${chId}" 步骤 #${i + 1} 跳转到不存在的章节 "${step.jumpChapter}"`);
                }
            }
        }
        if (!hasMain) {
            warnings.push('STORY_CHAPTERS 中缺少 "main" 起始章节');
        }
        if (totalSteps === 0) {
            warnings.push('所有章节的总步骤数为 0');
        }
    }

    // 检查 CG_LIBRARY
    if (!data.CG_LIBRARY || typeof data.CG_LIBRARY !== 'object') {
        warnings.push('缺少 CG_LIBRARY（CG 图鉴库）');
    }

    // 检查 ITEMS
    if (!data.ITEMS || typeof data.ITEMS !== 'object') {
        warnings.push('缺少 ITEMS（物品库）');
    }

    // 检查 ENDINGS
    if (!data.ENDINGS || !Array.isArray(data.ENDINGS)) {
        warnings.push('缺少 ENDINGS（结局列表）');
    } else if (data.ENDINGS.length === 0) {
        warnings.push('ENDINGS（结局列表）为空，游戏将无法正常结束');
    }

    // 交叉引用检查
    _validateCrossReferences(data, warnings);

    return warnings;
}

/**
 * 交叉引用验证
 */
function _validateCrossReferences(data, warnings) {
    // CG_LIBRARY 与章节引用的一致性
    if (data.CG_LIBRARY && data.STORY_CHAPTERS) {
        const cgUsed = new Set();
        for (const steps of Object.values(data.STORY_CHAPTERS)) {
            if (!Array.isArray(steps)) continue;
            for (const step of steps) {
                if (step.cgChanges?.id) cgUsed.add(step.cgChanges.id);
            }
        }
        for (const cgId of cgUsed) {
            if (!data.CG_LIBRARY[cgId]) {
                warnings.push(`章节中引用了不存在的 CG "${cgId}"`);
            }
        }
    }

    // ITEMS 与章节引用的一致性
    if (data.ITEMS && data.STORY_CHAPTERS) {
        const itemsUsed = new Set();
        for (const steps of Object.values(data.STORY_CHAPTERS)) {
            if (!Array.isArray(steps)) continue;
            for (const step of steps) {
                if (step.gainItem) itemsUsed.add(step.gainItem);
                if (step.loseItem) itemsUsed.add(step.loseItem);
                if (step.updateItem?.id) itemsUsed.add(step.updateItem.id);
                if (step.type === 'choice' && step.choices) {
                    for (const ch of step.choices) {
                        if (ch.gainItem) itemsUsed.add(ch.gainItem);
                        if (ch.loseItem) itemsUsed.add(ch.loseItem);
                    }
                }
            }
        }
        for (const itemId of itemsUsed) {
            if (!data.ITEMS[itemId]) {
                warnings.push(`章节中引用了不存在的物品 "${itemId}"`);
            }
        }
    }

    // ENDINGS 与章节 ending 类型引用的一致性
    if (data.ENDINGS && data.STORY_CHAPTERS) {
        const endingIds = new Set(data.ENDINGS.map(e => e.id));
        for (const steps of Object.values(data.STORY_CHAPTERS)) {
            if (!Array.isArray(steps)) continue;
            for (const step of steps) {
                if (step.type === 'ending' && step.endingId && !endingIds.has(step.endingId)) {
                    warnings.push(`章节中引用了不存在的结局 "${step.endingId}"`);
                }
            }
        }
    }
}

export default { validatePackStructure, validatePackData };
