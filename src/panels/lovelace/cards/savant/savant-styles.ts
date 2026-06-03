import { css } from "lit";

/** Styling for the Savant scenes card (uses theme tokens when available). */
export const savantSceneCardStyles = css`
  :host {
    --savant-accent: var(--accent-color, #c9a962);
    --savant-text: var(--primary-text-color, #f5f5f7);
    --savant-text-muted: var(--secondary-text-color, rgba(245, 245, 247, 0.62));
    --savant-glass: var(--card-background-color, rgba(28, 28, 30, 0.92));
    --savant-glass-border: var(--divider-color, rgba(255, 255, 255, 0.12));
    display: block;
  }

  ha-card {
    background: var(--savant-glass);
    border: 1px solid var(--savant-glass-border);
    border-radius: var(--ha-card-border-radius, 14px);
    color: var(--savant-text);
    overflow: hidden;
  }

  .header {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding: 16px 20px 8px;
  }

  .header h2 {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.1em;
    margin: 0;
    text-transform: uppercase;
  }

  .header-actions {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .icon-btn {
    align-items: center;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--savant-glass-border);
    border-radius: 50%;
    color: var(--savant-text);
    cursor: pointer;
    display: flex;
    height: 36px;
    justify-content: center;
    width: 36px;
  }

  .icon-btn.active {
    background: var(--savant-accent);
    border-color: var(--savant-accent);
    color: #1c1c1e;
  }

  .icon-btn:disabled {
    cursor: default;
    opacity: 0.4;
  }

  .scene-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    padding: 8px 16px 20px;
  }

  .scene-tile {
    min-height: 160px;
    overflow: visible;
    position: relative;
  }

  .scene-tile hui-card {
    display: block;
    height: 100%;
  }

  .scene-tile hui-card ha-card {
    height: 100%;
    margin: 0;
  }

  .scene-actions {
    bottom: 10px;
    display: flex;
    gap: 6px;
    pointer-events: auto;
    position: absolute;
    right: 10px;
    z-index: 10;
  }

  .scene-actions .icon-btn {
    backdrop-filter: blur(8px);
    background: rgba(0, 0, 0, 0.55);
    border-color: rgba(255, 255, 255, 0.2);
    color: #fff;
    height: 32px;
    width: 32px;
  }

  .section-label {
    color: var(--savant-text-muted);
    font-size: 11px;
    font-weight: 600;
    grid-column: 1 / -1;
    letter-spacing: 0.1em;
    margin: 8px 0 0;
    text-transform: uppercase;
  }

  .empty {
    color: var(--savant-text-muted);
    font-size: 14px;
    padding: 8px 20px 20px;
    text-align: center;
  }
`;

export const sceneBackground = (key: string): string => {
  const palettes = [
    "linear-gradient(135deg, #2c1810 0%, #5c3d2e 40%, #1a120e 100%)",
    "linear-gradient(135deg, #1a2332 0%, #3d5a73 45%, #0d1117 100%)",
    "linear-gradient(135deg, #1f2937 0%, #4b5563 50%, #111827 100%)",
    "linear-gradient(135deg, #312e1f 0%, #6b5d45 50%, #1c1912 100%)",
  ];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash + key.charCodeAt(i) * (i + 1)) % palettes.length;
  }
  return palettes[hash]!;
};
