/**
 * components/inject-key.js
 *
 * Provide/inject key for sharing editor state between components.
 */
export const EDITOR_KEY = 'editor';

/**
 * Composable helper — inject the editor state and return it.
 * Component setup() can do: `return useEditor()` to expose all state/methods to the template.
 */
export function useEditor() {
  return Vue.inject(EDITOR_KEY);
}
