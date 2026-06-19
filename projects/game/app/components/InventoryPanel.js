/**
 * components/InventoryPanel.js
 *
 * Side-panel item inventory — money, item list, inspection card.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'InventoryPanel',
  template: `
    <div class="side-panel-mask" v-if="showInventory" @click="showInventory = false"></div>
    <div class="side-panel inventory-panel" :class="{ 'panel-open': showInventory }">
      <h3>随身背包物资</h3>
      <div class="money-display">💰 拥有金币：<span>{{ gameState.money }}</span></div>
      <h4>持有物品清单</h4>
      <ul class="item-list">
        <li v-for="(item, i) in gameState.inventory" :key="i"
            class="clickable-item"
            :class="{ 'selected-item': selectedBagItemId === item }"
            @click.stop="selectItemForInspection(item)"
            @mouseenter="selectItemForInspection(item)">
          <span class="item-list-icon">
            <img v-if="queryItemImage(item)" :src="queryItemImage(item)"
                 class="item-list-img" @error="e => { e.target.style.display='none'; e.target.parentElement.innerText = queryItemIcon(item); }" />
            <span v-else>{{ queryItemIcon(item) }}</span>
          </span>
          {{ queryItemName(item) }}
        </li>
        <li v-if="gameState.inventory.length === 0" class="empty-hint">暂无物品</li>
      </ul>

      <div class="item-inspect-card" v-if="selectedBagItemId">
        <div class="item-inspect-icon">
          <img v-if="queryItemImage(selectedBagItemId)" :src="queryItemImage(selectedBagItemId)"
               class="item-inspect-img" @error="e => { e.target.style.display='none'; e.target.parentElement.innerText = queryItemIcon(selectedBagItemId); }" />
          <span v-else>{{ queryItemIcon(selectedBagItemId) }}</span>
        </div>
        <div class="item-inspect-detail">
          <h5>{{ queryItemName(selectedBagItemId) }}</h5>
          <p>{{ inspectedItemDynamicDescription }}</p>
        </div>
      </div>
    </div>
  `,
  setup() { return inject('game'); }
});
