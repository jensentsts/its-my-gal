/**
 * components/ExportModal.js
 *
 * Export dialog modal — displays generated JS/JSON export text.
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'ExportModal',
  template: `
    <div class="modal-overlay" v-if="showExportModal" @click.self="showExportModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ exportModalTitle }}</h3>
          <button class="close-btn" @click="showExportModal = false">✕</button>
        </div>
        <div class="modal-body">
          <textarea class="export-textarea" readonly v-model="exportContent" rows="20"></textarea>
        </div>
        <div class="modal-footer">
          <button class="tb-btn" @click="copyExport">📋 复制到剪贴板</button>
          <button class="tb-btn" @click="downloadExport">💾 下载文件</button>
          <button class="tb-btn" @click="showExportModal = false">关闭</button>
        </div>
      </div>
    </div>
  `,
  setup() {
    return inject('editor');
  }
});
