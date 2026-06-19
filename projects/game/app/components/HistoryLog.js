/**
 * components/HistoryLog.js
 *
 * Side-panel conversation history log.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'HistoryLog',
  template: `
    <div class="side-panel-mask" v-if="showLog" @click="showLog = false"></div>
    <div class="side-panel log-panel" :class="{ 'panel-open': showLog }">
      <h3>历史剧情记录</h3>
      <div class="log-scroll-area">
        <div v-for="(log, idx) in historyLogs" :key="idx" class="log-row" @click="rollbackToTimeline(idx)">
          <div class="log-speaker" :style="{color: log.color}">{{ log.speaker }}</div>
          <div class="log-text">{{ log.text }}</div>
        </div>
      </div>
    </div>
  `,
  setup() { return inject('game'); }
});
