# Dungeon Treasure

> **人類失去了一個世界。一群孩子，向地心尋找第二次機會。**

A 16-bit turn-based browser roguelike about students remotely piloting exploration robots beyond an underground shelter.

## World premise

Generations after the surface became uninhabitable, young operators in a shelter send replaceable exploration units into abandoned transit systems, flooded infrastructure, military zones and eventually unknown natural layers below all human records.

Runs recover parts, resources and key modules. Completing key equipment sets unlocks deeper zones and new traversal abilities. The long-term goal is not to reclaim the ruined surface, but to discover a second habitable environment deep within Earth—and not repeat humanity's first mistake.

## M0.1 — Playable Foundation

- Phaser 3 + TypeScript + Vite
- Grid-based, turn-based movement and combat
- Procedural rooms and corridors
- Robot exploration unit
- Enemy turns
- Salvage, repair cells and key module fragments
- Extraction / destruction loop
- Five-floor first expedition
- Original procedural pixel-art placeholders (no copyrighted game assets)

## Controls

- Arrow keys / WASD: move
- Bump into an enemy: attack
- E: use extraction beacon when available
- R: restart after signal loss / expedition complete

## Local development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Direction

The first major zone is **ZONE I — 廢棄地下鐵**. Its key progression set is the **工程探索套件**. Later zones will introduce flooded infrastructure, heat, restricted military systems, deep geology and finally a living subterranean ecosystem.

This repository is the source of truth for the project.
