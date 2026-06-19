/**
 * components/TerminalPanel.js
 *
 * Terminal output + input — used inside dock areas and the floating window.
 * Encapsulated here so it can be reused in multiple locations.
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'TerminalPanel',
  template: `
    <div class="terminal-window-body" style="flex:1">
      <div class="terminal-output">
        <div v-for="(line, i) in terminalLines" :key="i"
             class="terminal-line" :class="'term-' + line.type">{{ line.text }}</div>
      </div>
      <div class="terminal-input-row">
        <span class="terminal-prompt">$</span>
        <textarea class="terminal-input" v-model="terminalInput"
               @keydown="onTerminalKeydown"
               placeholder="输入 help 查看命令…"
               spellcheck="false" autocomplete="off" rows="1"></textarea>
      </div>
    </div>
  `,
  setup() {
    return inject('editor');
  }
});
