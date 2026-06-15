/**
 * editor/ui/preview.js —— 特效预览 / 角色变更预览
 */
import { clone } from '../helpers.js';
import { builtinCharEffects, builtinEffects, POSITION_MAP_FOR_PREVIEW } from '../step-utils.js';
import { EffectsManager } from '../../engine/index.js';

const { watch: _watch } = Vue;

export function createPreview(ctx, ops) {
    const { customEffects, effectPreviewRef, effectPreviewActive, editingCharEffect, charEffectPreviewRef, charEffectPreviewActive, customCharEffects, showResourceManager, resourceTab, showFileMenu } = ctx;
    const { showToast } = ops;

    let _effectManager = null;
    let effectTimer = null;
    let charTimer = null;

    function getEffectManager() {
        if (!_effectManager && effectPreviewRef.value) _effectManager = new EffectsManager(effectPreviewRef.value);
        return _effectManager;
    }

    function getEffectIcon(name) {
        const map = { rain:'🌧️', snow:'❄️', sakura:'🌸', fire:'🔥', stardust:'✨', bloodmoon:'🩸', corruption:'🌑' };
        return map[name] || '✨';
    }

    function openEffectsManager() { ctx.showResourceManager.value = true; ctx.resourceTab.value = 'effects'; ctx.selectedResourceId.value = null; stopEffectPreview(); }

    function stopEffectPreview() {
        effectPreviewActive.value = false;
        clearInterval(effectTimer);
        const fx = getEffectManager();
        if (fx) fx.clear(true);
        if (effectPreviewRef.value) effectPreviewRef.value.innerHTML = '<div class="effect-preview-bg"><span>预览已停止</span></div>';
    }

    function toggleEffectPreview(effectId) {
        if (effectPreviewActive.value) { stopEffectPreview(); return; }
        const el = effectPreviewRef.value;
        if (!el) return;
        el.innerHTML = '';
        effectPreviewActive.value = true;

        const cfg = customEffects[effectId];
        let config;
        if (!cfg) config = { type: effectId, density: 30, speed: 50 };
        else if (cfg.effectType === 'template') config = { type:'template', emoji:cfg.emoji||'✨', animation:cfg.animation||'fall', density:cfg.density||30, speed:cfg.speed||50, sizeMin:cfg.sizeMin||12, sizeMax:cfg.sizeMax||28, color:cfg.color||'' };
        else if (cfg.effectType === 'builtin') config = { type: cfg.type || effectId, density: cfg.density || 30, speed: cfg.speed || 50 };
        else config = { type: cfg.jsEffectId || effectId, density: cfg.density || 30 };

        const fx = getEffectManager();
        if (fx) { fx.container = el; fx.play(config); }
        else {
            const spawn = () => {
                if (!effectPreviewActive.value) return;
                const p = document.createElement('div');
                p.innerHTML = getEffectIcon(config.type || effectId);
                p.style.cssText = `position:absolute;top:${Math.random()*80}%;left:${Math.random()*90}%;font-size:${Math.random()*20+10}px;opacity:0.7;pointer-events:none;transition:all 2s ease-out;`;
                el.appendChild(p);
                setTimeout(() => { p.style.opacity = '0'; p.style.transform = 'scale(1.5)'; }, 50);
                setTimeout(() => p.remove(), 2000);
            };
            effectTimer = setInterval(spawn, 1000 / (config.density || 30));
        }
    }

    // ═══ 角色变更预览 ═══
    function stopCharEffectPreview() {
        charEffectPreviewActive.value = false;
        clearTimeout(charTimer);
        if (charEffectPreviewRef.value) charEffectPreviewRef.value.innerHTML = '<div class="effect-preview-bg"><span>点击「预览」查看角色变更效果</span></div>';
    }

    function toggleCharEffectPreview() {
        if (charEffectPreviewActive.value) { stopCharEffectPreview(); return; }
        const el = charEffectPreviewRef.value;
        if (!el) return;
        const preset = editingCharEffect;
        if (!preset.action) return;

        el.innerHTML = '';
        charEffectPreviewActive.value = true;
        const stage = document.createElement('div');
        stage.className = 'char-effect-stage';
        stage.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:var(--bg-primary, #0a0a0f);';
        el.appendChild(stage);

        function mkChar(id, pos, emoji = '👤') {
            const wrap = document.createElement('div');
            wrap.className = 'char-effect-preview-char';
            const pp = POSITION_MAP_FOR_PREVIEW[pos] || '50%';
            wrap.style.cssText = `position:absolute;bottom:0;left:${pp};transform:translateX(-50%);width:70px;height:110px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;`;
            const h = document.createElement('div');
            h.style.cssText = 'width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:18px;';
            h.textContent = emoji; wrap.appendChild(h);
            const b = document.createElement('div');
            b.style.cssText = 'width:3px;height:30px;background:rgba(255,255,255,0.2);margin:2px 0;'; wrap.appendChild(b);
            const lb = document.createElement('div');
            lb.style.cssText = 'color:rgba(255,255,255,0.4);font-size:8px;text-align:center;white-space:nowrap;';
            lb.textContent = id.startsWith('_') ? '角色' : id; wrap.appendChild(lb);
            const sp = document.createElement('div');
            sp.style.cssText = 'display:none;position:absolute;top:-15px;left:50%;transform:translateX(-50%);gap:2px;';
            sp.innerHTML = '<span style="width:3px;height:10px;background:rgba(255,255,255,0.6);border-radius:2px;display:inline-block;animation:charSpeakWave 0.4s infinite alternate"></span>'.repeat(2);
            wrap.appendChild(sp); stage.appendChild(wrap);
            return { wrap, sp };
        }

        const action = preset.action, animName = preset.animation || preset.effect || preset.actionId || '', posKey = preset.position || 'center', dur = preset.duration || 0.5;
        const normIds = v => v ? (Array.isArray(v) ? v : String(v).split(',').map(s => s.trim()).filter(Boolean)) : [];
        const ids = normIds(preset.ids);
        let chars = [];

        if (action === 'enter') { chars.push(mkChar('_a', posKey)); _playEnterAnim(chars[0].wrap, animName, dur); }
        else if (action === 'update') {
            chars.push(mkChar('_a', 'center')); chars[0].wrap.style.transition = 'transform 0.3s ease-out';
            requestAnimationFrame(() => chars[0].wrap.style.transform = 'translateX(-50%) scale(1.15)');
            charTimer = setTimeout(() => { chars[0].wrap.style.transform = 'translateX(-50%) scale(1)'; chars[0].wrap.style.transition = ''; }, 400);
        }
        else if (action === 'leave') { chars.push(mkChar('_a', posKey)); _playLeaveAnim(chars[0].wrap, animName, dur); }
        else if (action === 'move') {
            chars.push(mkChar('_a', 'center'));
            const toPos = POSITION_MAP_FOR_PREVIEW[posKey] || '50%';
            chars[0].wrap.style.transition = `left ${dur}s ease-out`; _playMoveAnim(chars[0].wrap, animName);
            requestAnimationFrame(() => chars[0].wrap.style.left = toPos);
            charTimer = setTimeout(() => { chars[0].wrap.style.animation = ''; }, 600);
        }
        else if (action === 'speak') { chars.push(mkChar('_a', 'center')); chars[0].sp.style.display = 'flex'; }
        else if (action === 'silence') {
            chars.push(mkChar('_a', 'center')); chars[0].sp.style.display = 'flex';
            charTimer = setTimeout(() => { chars[0].sp.style.display = 'none'; }, 500);
        }
        else if (action === 'speakAll') {
            for (let i = 0; i < ids.length; i++) { chars.push(mkChar(ids[i], 'center')); chars[i].sp.style.display = 'flex'; }
            _scatterChars(chars.map(c => c.wrap), ids.length);
        }
        else if (action === 'silenceAll') {
            for (let i = 0; i < 2; i++) { chars.push(mkChar('_x' + i, 'center')); chars[i].sp.style.display = 'flex'; }
            _scatterChars(chars.map(c => c.wrap), 2);
            charTimer = setTimeout(() => chars.forEach(c => c.sp.style.display = 'none'), 500);
        }
        else if (action === 'action') {
            chars.push(mkChar('_a', 'center'));
            const an = animName || 'wave';
            chars[0].wrap.style.animation = `charAction${an.charAt(0).toUpperCase()+an.slice(1)} ${dur}s ease-out`;
            charTimer = setTimeout(() => { chars[0].wrap.style.animation = ''; }, dur * 1000 + 100);
        }
        else if (action === 'effect') { chars.push(mkChar('_a', 'center')); _playEffectAnim(chars[0].wrap, animName, dur); }
        else if (action === 'filter') {
            chars.push(mkChar('_a', 'center'));
            const f = preset.filters || {};
            chars[0].wrap.style.filter = [f.brightness !== undefined ? `brightness(${f.brightness})` : '', f.saturation !== undefined ? `saturate(${f.saturation})` : '', f.contrast !== undefined ? `contrast(${f.contrast})` : ''].filter(Boolean).join(' ');
            chars[0].wrap.style.transition = 'filter 0.5s ease-out';
        }
        else if (action === 'resetFilter') { chars.push(mkChar('_a', 'center')); chars[0].wrap.style.filter = 'brightness(1) saturate(1) contrast(1)'; chars[0].wrap.style.transition = 'filter 0.4s ease-out'; }
        else if (action === 'scale') { chars.push(mkChar('_a', 'center')); chars[0].wrap.style.transition = 'transform 0.4s ease-out'; requestAnimationFrame(() => chars[0].wrap.style.transform = `translateX(-50%) scale(${preset.scale || 1})`); }
        else if (action === 'opacity') { chars.push(mkChar('_a', 'center')); chars[0].wrap.style.opacity = preset.opacity != null ? preset.opacity : 1; }
        else if (action === 'swap') {
            chars.push(mkChar('_a', 'left', '👤'), mkChar('_b', 'right', '👥'));
            const pA = POSITION_MAP_FOR_PREVIEW.right || '76%', pB = POSITION_MAP_FOR_PREVIEW.left || '24%';
            chars.forEach(el => { el.wrap.style.transition = 'left 0.5s ease-out'; });
            requestAnimationFrame(() => { chars[0].wrap.style.left = pA; chars[1].wrap.style.left = pB; });
            charTimer = setTimeout(() => chars.forEach(c => c.wrap.style.animation = ''), 600);
        }
        else if (action === 'gather') {
            const n = ids.length || 2;
            for (let i = 0; i < n; i++) chars.push(mkChar(ids[i] || '_g' + i, 'left'));
            const baseP = POSITION_MAP_FOR_PREVIEW[posKey] || '50%';
            requestAnimationFrame(() => chars.forEach((c, i) => { c.wrap.style.transition = 'left 0.6s ease-out'; c.wrap.style.left = `calc(${baseP} + ${(i-(n-1)/2)*((preset.spread||0.15)*100)}%)`; _playEnterAnim(c.wrap, animName, 0.6); }));
            charTimer = setTimeout(() => chars.forEach(c => c.wrap.style.animation = ''), 700);
        }
        else if (action === 'scatter') {
            const n = ids.length || 2;
            for (let i = 0; i < n; i++) chars.push(mkChar(ids[i] || '_s' + i, 'center'));
            _scatterChars(chars.map(c => c.wrap), n);
            chars.forEach(c => c.wrap.style.transition = 'left 0.5s ease-out');
            charTimer = setTimeout(() => chars.forEach(c => c.wrap.style.animation = ''), 600);
        }
        else if (action === 'order') {
            chars.push(mkChar('_a', 'center', '👤'), mkChar('_b', 'center', '👥'));
            chars[1].wrap.style.left = 'calc(50% + 30px)'; chars[1].wrap.style.zIndex = '0'; chars[1].wrap.style.opacity = '0.6';
            charTimer = setTimeout(() => { chars[1].wrap.style.zIndex = '2'; chars[1].wrap.style.opacity = '1'; }, 300);
        }
        else if (action === 'clearAll') {
            for (let i = 0; i < 3; i++) chars.push(mkChar('_c' + i, ['left','center','right'][i], ['👤','👥','🤖'][i]));
            chars.forEach(c => _playLeaveAnim(c.wrap, animName, dur));
        }
    }

    // 预览动画辅助
    function _playEnterAnim(el, anim, d) {
        el.style.opacity = '0';
        requestAnimationFrame(() => {
            const kf = { 'fade-in':'charFadeIn','slide-in-left':'charSlideInLeft','slide-in-right':'charSlideInRight','slide-in-up':'charSlideInUp','slide-in-down':'charSlideInDown','bounce-in':'charBounceIn','zoom-in':'charZoomIn','flip-in':'charFlipIn','drop-in':'charDropIn','float-in':'charFloatIn','stumble-in':'charStumbleIn','swing-in':'charSwingIn' }[anim] || 'charFadeIn';
            el.style.animation = `${kf} ${d}s ease-out`; el.style.opacity = '1';
        });
    }
    function _playLeaveAnim(el, anim, d) {
        const kf = { 'fade-out':'charFadeOut','slide-out-left':'charSlideOutLeft','slide-out-right':'charSlideOutRight','slide-out-up':'charSlideOutUp','slide-out-down':'charSlideOutDown','bounce-out':'charBounceOut','zoom-out':'charZoomOut','flip-out':'charFlipOut','shrink-out':'charShrinkOut','vanish':'charVanish' }[anim] || 'charFadeOut';
        el.style.animation = `${kf} ${d}s ease-in forwards`;
    }
    function _playMoveAnim(el, anim) {
        const kf = { 'slide-left':'charSlideLeft','slide-right':'charSlideRight','flip-move':'charFlipMove' }[anim] || '';
        if (kf) el.style.animation = `${kf} 0.5s ease-out`;
    }
    function _playEffectAnim(el, anim, d) {
        el.style.animation = `${_effectKF(anim)} ${d === 0 ? '2s infinite' : d + 's ease-out'}`;
    }
    function _effectKF(name) {
        return { shake:'charShake',flash:'charFlash',glow:'charGlow',float:'charFloat',pulse:'charPulse',tremble:'charTremble',blur:'charBlur',highlight:'charHighlight',shine:'charShine',dizzy:'charDizzy' }[name] || `char${name.charAt(0).toUpperCase()+name.slice(1)}`;
    }
    function _scatterChars(els, n) {
        const presets = ['left-far','left','center-left','center','center-right','right','right-far'];
        const start = Math.floor((presets.length - n) / 2);
        els.forEach((el, i) => { el.style.left = POSITION_MAP_FOR_PREVIEW[presets[start + i]] || '50%'; });
    }

    // 资源管理/标签切换时停止预览
    _watch(showResourceManager, v => { if (!v) { stopEffectPreview(); stopCharEffectPreview(); } });
    _watch(resourceTab, v => { if (v !== 'effects') stopEffectPreview(); if (v !== 'charEffects') stopCharEffectPreview(); });

    return { openEffectsManager, addCustomEffect: () => ops.addResource?.('effects'), deleteCustomEffect: eid => ops.deleteResource?.('effects', eid), getEffectIcon, toggleEffectPreview, stopEffectPreview, toggleCharEffectPreview, stopCharEffectPreview };
}
