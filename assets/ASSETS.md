# Ảnh trong game

Giữ nguyên ảnh gốc người dùng cung cấp trong backgrounds/, characters/ và effects/.

- `backgrounds/village-day.png`: nền ban ngày.
- `backgrounds/village-night.png`: nền ban đêm.
- `characters/villeger-idle.png`: sheet nhân vật gốc (tên gốc được giữ nguyên).
- `effects/campfire.png`: sheet lửa gốc.
- `characters/villager-idle-transparent.png`: bản tách nền bằng công cụ imagegen tích hợp.
- `effects/campfire-transparent.png`: bản tách nền bằng công cụ imagegen tích hợp.
- `characters/villager-idle-game.png`: sheet dùng trong game, 4 ô 96 × 128 px.
- `effects/campfire-game.png`: sheet dùng trong game, 6 ô 96 × 96 px.

Hai sheet dùng trong game được cắt, căn chân và thu nhỏ bằng nearest-neighbor từ bản tách nền. Nhân vật hiện dùng chung một mẫu; chưa có sprite nhìn từ sau, hướng khác hoặc tư thế chết/ngủ riêng. Ngủ và bị loại được thể hiện bằng CSS và nhãn trạng thái.

## Prompt đã dùng với imagegen tích hợp

### Nhân vật

Use case: background-extraction. Edit target: the provided four-frame horizontal pixel-art villager sprite sheet. Remove ONLY the opaque gray/taupe background and the small sparkle in the lower-right background. Preserve all four existing villager figures, outfits, colors, pixel-art outlines, their order, positions and foot baseline. Do not redesign or add any figures. Output a single horizontal row of exactly FOUR equal-width cells, each containing one complete figure with padding, matching the source sequence. Genuine transparent alpha everywhere outside the characters, including between legs and around hands. No ground, shadows, text, grid or decorative elements. Preserve the crisp pixel art and all four complete feet; no figure may touch or cross a cell boundary. This will be used as an animation sprite sheet in a game; consistent character scale and frame alignment are essential.

### Lửa

Use case: background-extraction. Edit the provided six-frame campfire sprite sheet. Remove the opaque gray background, preserve all SIX existing pixel-art campfires with logs and flames, remove only the tiny pale sparkle symbol outside the fire at far right. Output exactly six complete fires in ONE horizontal row, evenly spaced in equal cells, transparent background with real alpha including spaces around logs and between flames. Keep the source's consistent flame colors, scale, log shape and elevated view. No redesign, no extra fires, no ground, no glow backdrop, no text, no grid. All logs must sit on the same baseline, all flames and sparks stay inside their respective frame. Keep enough transparent margin at all sides. This is a six-frame looping game animation sheet.
