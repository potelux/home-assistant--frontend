import { css } from "lit";

export const SAVANT_DEFAULT_HOME_IMAGE =
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80";

/** Shared Savant Pro–inspired visual language (dark glass on imagery). */
export const savantScreenStyles = css`
  :host {
    --savant-bg: #050505;
    --savant-glass: rgba(28, 28, 30, 0.72);
    --savant-glass-border: rgba(255, 255, 255, 0.12);
    --savant-text: #f5f5f7;
    --savant-text-muted: rgba(245, 245, 247, 0.62);
    --savant-accent: #c9a962;
    --savant-radius: 14px;
    --savant-font:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
      sans-serif;
    color: var(--savant-text);
    display: block;
    font-family: var(--savant-font);
    min-height: calc(100vh - var(--header-height, 0px));
    box-sizing: border-box;
  }

  * {
    box-sizing: border-box;
  }

  ha-card {
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .screen {
    display: flex;
    flex-direction: column;
    gap: 0;
    isolation: isolate;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 0 0 32px;
    position: relative;
  }

  .screen.has-backdrop::before {
    background-image: var(
      --savant-backdrop,
      linear-gradient(180deg, #1a1a1c 0%, #0a0a0b 100%)
    );
    background-position: center;
    background-size: cover;
    content: "";
    filter: brightness(0.55) saturate(1.05);
    inset: 0;
    position: fixed;
    z-index: -2;
  }

  .screen.has-backdrop::after {
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.35) 0%,
      rgba(0, 0, 0, 0.72) 100%
    );
    content: "";
    inset: 0;
    position: fixed;
    z-index: -1;
  }

  .top-nav {
    align-items: center;
    display: grid;
    font-size: 11px;
    font-weight: 500;
    grid-template-columns: 1fr 1fr 1fr;
    letter-spacing: 0.14em;
    padding: 20px 20px 8px;
    text-transform: uppercase;
  }

  .top-nav button {
    background: none;
    border: none;
    color: var(--savant-text-muted);
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.14em;
    padding: 8px 4px;
    text-transform: uppercase;
  }

  .top-nav button.active {
    color: var(--savant-text);
  }

  .top-nav .center {
    justify-self: center;
    text-align: center;
  }

  .top-nav .right {
    justify-self: end;
    text-align: right;
  }

  .top-nav .left {
    justify-self: start;
    text-align: left;
  }

  .hero {
    padding: 8px 24px 20px;
  }

  .hero h1 {
    font-size: 42px;
    font-weight: 300;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin: 0 0 8px;
  }

  .hero .status {
    color: var(--savant-text-muted);
    font-size: 15px;
    font-weight: 400;
    margin: 0;
  }

  .glass-tile {
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    background: var(--savant-glass);
    border: 1px solid var(--savant-glass-border);
    border-radius: var(--savant-radius);
    cursor: pointer;
    display: flex;
    gap: 14px;
    padding: 16px 18px;
    text-align: left;
    width: 100%;
  }

  .glass-tile:active {
    opacity: 0.9;
  }

  .tile-grid {
    display: grid;
    gap: 10px;
    padding: 0 20px 24px;
  }

  .tile-grid.two {
    grid-template-columns: 1fr 1fr;
  }

  .tile-icon {
    align-items: center;
    color: var(--savant-text);
    display: flex;
    flex-shrink: 0;
    height: 28px;
    justify-content: center;
    width: 28px;
  }

  .tile-icon ha-svg-icon {
    height: 26px;
    width: 26px;
  }

  .tile-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .tile-title {
    font-size: 16px;
    font-weight: 500;
    line-height: 1.2;
  }

  .tile-sub {
    color: var(--savant-text-muted);
    font-size: 13px;
    line-height: 1.3;
  }

  .section-label {
    color: var(--savant-text-muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    margin: 0 0 10px;
    padding: 0 20px;
    text-transform: uppercase;
  }

  .scene-strip {
    border: none;
    border-radius: 0;
    cursor: pointer;
    display: block;
    margin: 0;
    min-height: 132px;
    overflow: hidden;
    padding: 0;
    position: relative;
    text-align: center;
    width: 100%;
  }

  .scene-strip .overlay {
    align-items: center;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.15) 0%,
      rgba(0, 0, 0, 0.55) 100%
    );
    display: flex;
    flex-direction: column;
    inset: 0;
    justify-content: center;
    padding: 24px 20px;
    position: absolute;
  }

  .scene-strip .name {
    font-size: 26px;
    font-weight: 400;
    letter-spacing: 0.02em;
    margin: 0;
  }

  .scene-strip .meta {
    color: rgba(255, 255, 255, 0.75);
    font-size: 14px;
    margin: 6px 0 0;
  }

  .room-strip {
    border: none;
    border-radius: 0;
    cursor: pointer;
    display: block;
    margin: 0;
    min-height: 112px;
    overflow: hidden;
    padding: 0;
    position: relative;
    text-align: left;
    width: 100%;
  }

  .room-strip .overlay {
    align-items: flex-end;
    background: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.55) 0%,
      rgba(0, 0, 0, 0.2) 100%
    );
    display: flex;
    inset: 0;
    padding: 20px 24px;
    position: absolute;
  }

  .room-strip .name {
    font-size: 28px;
    font-weight: 400;
    margin: 0;
  }

  .service-dock {
    display: flex;
    gap: 8px;
    justify-content: space-around;
    margin-top: auto;
    padding: 28px 16px 8px;
  }

  .dock-item {
    align-items: center;
    background: none;
    border: none;
    color: var(--savant-text-muted);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    font-size: 11px;
    gap: 8px;
    letter-spacing: 0.04em;
    min-width: 64px;
    padding: 0;
  }

  .dock-item.active {
    color: var(--savant-text);
  }

  .dock-icon {
    align-items: center;
    backdrop-filter: blur(12px);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--savant-glass-border);
    border-radius: 50%;
    display: flex;
    height: 56px;
    justify-content: center;
    width: 56px;
  }

  .dock-item.active .dock-icon {
    border-color: rgba(201, 169, 98, 0.55);
    box-shadow: 0 0 0 1px rgba(201, 169, 98, 0.25);
  }

  .dock-icon ha-svg-icon {
    height: 26px;
    width: 26px;
  }

  .dock-value {
    color: var(--savant-text);
    font-size: 18px;
    font-weight: 400;
  }

  .header-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
    padding: 4px 20px 12px;
  }

  .header-row h2 {
    font-size: 15px;
    font-weight: 500;
    letter-spacing: 0.08em;
    margin: 0;
    text-transform: uppercase;
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

  .empty {
    color: var(--savant-text-muted);
    font-size: 15px;
    padding: 32px 24px;
    text-align: center;
  }

  .rooms-entry {
    align-items: center;
    background: none;
    border: none;
    color: var(--savant-text);
    cursor: pointer;
    display: flex;
    font-size: 11px;
    font-weight: 600;
    gap: 6px;
    justify-content: center;
    letter-spacing: 0.16em;
    margin: 0 auto 8px;
    padding: 12px 20px;
    text-transform: uppercase;
    width: 100%;
  }

  .rooms-entry ha-svg-icon {
    height: 18px;
    opacity: 0.7;
    width: 18px;
  }

  .activity-feed {
    background: none;
    border: none;
    color: var(--savant-text-muted);
    cursor: pointer;
    font-size: 15px;
    font-weight: 400;
    margin: 0;
    padding: 0;
    text-align: left;
    width: 100%;
  }

  .activity-feed:hover {
    color: var(--savant-text);
  }

  .scenes-title {
    font-size: 28px;
    font-weight: 300;
    letter-spacing: 0.06em;
    margin: 0;
    padding: 8px 20px 4px;
    text-transform: uppercase;
  }

  .scenes-count {
    color: var(--savant-text-muted);
    font-size: 14px;
    margin: 0;
    padding: 0 20px 16px;
  }

  .get-started {
    backdrop-filter: blur(18px);
    background: var(--savant-glass);
    border: 1px solid var(--savant-glass-border);
    border-radius: var(--savant-radius);
    color: var(--savant-text);
    cursor: pointer;
    display: block;
    font-size: 16px;
    font-weight: 500;
    margin: 24px 20px;
    padding: 18px 24px;
    text-align: center;
    width: calc(100% - 40px);
  }

  .room-row {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .room-row .room-strip {
    flex-shrink: 0;
  }

  .capture-options {
    display: grid;
    gap: 12px;
    padding: 8px 0;
  }

  .capture-option {
    backdrop-filter: blur(12px);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--savant-glass-border);
    border-radius: var(--savant-radius);
    cursor: pointer;
    padding: 20px;
    text-align: left;
    width: 100%;
  }

  .capture-option.recommended {
    border-color: rgba(201, 169, 98, 0.45);
  }

  .capture-option h4 {
    font-size: 17px;
    font-weight: 500;
    margin: 0 0 8px;
  }

  .capture-option p {
    color: var(--savant-text-muted);
    font-size: 14px;
    line-height: 1.45;
    margin: 0;
  }

  .capture-option .badge {
    color: var(--savant-accent);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  .room-check-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .room-check {
    align-items: center;
    backdrop-filter: blur(12px);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--savant-glass-border);
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    gap: 12px;
    padding: 14px 16px;
    text-align: left;
    width: 100%;
  }

  .room-check.selected {
    border-color: rgba(201, 169, 98, 0.5);
  }

  .room-check input {
    accent-color: var(--savant-accent);
  }
`;

export const sceneBackground = (key: string): string => {
  const palettes = [
    "linear-gradient(135deg, #2c1810 0%, #5c3d2e 40%, #1a120e 100%)",
    "linear-gradient(135deg, #1a2332 0%, #3d5a73 45%, #0d1117 100%)",
    "linear-gradient(135deg, #1f2937 0%, #4b5563 50%, #111827 100%)",
    "linear-gradient(135deg, #312e1f 0%, #6b5d45 50%, #1c1912 100%)",
    "linear-gradient(135deg, #2d1f3d 0%, #5a4a6a 50%, #140f1a 100%)",
    "linear-gradient(135deg, #1e3a2f 0%, #3d6b55 50%, #0f1a14 100%)",
  ];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash + key.charCodeAt(i) * (i + 1)) % palettes.length;
  }
  return palettes[hash]!;
};

export const roomBackground = (areaId: string): string => {
  const palettes: Record<string, string> = {
    living_room:
      "linear-gradient(135deg, #3d2c24 0%, #6b4f42 50%, #1a1410 100%)",
    kitchen: "linear-gradient(135deg, #2a2a28 0%, #4a4844 50%, #121210 100%)",
    study: "linear-gradient(135deg, #1f2836 0%, #3a4a5c 50%, #0e1218 100%)",
    outdoor: "linear-gradient(135deg, #1a2e1f 0%, #3d5c45 50%, #0c140e 100%)",
  };
  return palettes[areaId] || sceneBackground(areaId);
};
