# Steel Ball Run Ending Fix 🐎🌴

An open-source Chrome extension to play alternate endings for **JoJo's Bizarre Adventure: Steel Ball Run**. Works on Netflix and on other video websites **you enable individually**.

**v1.4.0 — Multi-site support (beta)**

[Download the current code (ZIP)](https://github.com/tomassanchezmesas-dot/steel-ball-run-ending-fix/archive/refs/heads/main.zip)

## Select your ending

- 🐎 [A Horse With No Name — Lil Blv](https://www.youtube.com/watch?v=oMiX8tZqswI)
- 🌴 [California Dreamin' — Lil Blv](https://www.youtube.com/watch?v=j7J4IrIYQvY)

Choose your preferred ending in the extension popup. Your selection is saved automatically.

## Install

1. Download and extract the ZIP above.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted project folder.
5. Reload any Netflix tab you already had open.

## Enable other websites

1. Open a website with a video player.
2. Click the extension icon and press **Enable on this website**.
3. Chrome asks you to allow access **only to this website**. Accept if you trust it.
4. If the page does not display the *Steel Ball Run* title, click **Armar pestaña** (arm this tab) so the extension knows you're watching the correct episode.
5. At the beginning of the official ending, choose **Calibrar este sitio + reproducir**. The extension stores the remaining seconds for **that website**, separately from Netflix.
6. If the website does not expose the video duration, use **Reproducir ahora** in the popup or the floating control.

To revoke access, use **Disable on this website**. Your previously installed Netflix detection remains enabled.

## Playback modes

| Mode | Behavior |
| --- | --- |
| **Overlay** | Pauses accessible HTML5 playback and overlays the selected YouTube ending. |
| **New tab** | Opens the selected YouTube video in a new tab and optionally returns after a preset time. |
| **Redirect** | Replaces the current webpage with the selected YouTube URL. |

## Important compatibility limitations

**Not every website will support automatic detection or pause/resume.** Video players may be inside cross-origin iframes, use closed shadow DOM, expose no `<video>` element, or block embedded YouTube playback. The floating manual playback button is a fallback, not a guarantee that playback can be paused automatically.

The extension does **not** bypass paywalls, DRM or other access controls, and does not provide links to episodes. Use it only on websites and with content you are authorized to access.

No browsing history, credentials, or viewing statistics are collected by the extension. See [PRIVACY.md](PRIVACY.md).

## Español 🇨🇱

Esta versión permite usar el reemplazo del ending **fuera de Netflix**, en sitios que habilites manualmente. Abre el sitio, pulsa el icono de la extensión y selecciona **Enable on this website**. Si no aparece el nombre de Steel Ball Run, arma la pestaña. Cuando comience el ending, calibra el tiempo restante. Si el reproductor no expone su duración, usa **Reproducir ahora**.

## 한국어 🇰🇷

**Netflix 이외의 동영상 사이트도 사이트별로 활성화할 수 있습니다.** 동영상 사이트에서 확장 프로그램을 열고 **Enable on this website**를 누른 뒤 해당 사이트 권한을 허용하세요. 작품 제목이 감지되지 않으면 **Armar pestaña** 버튼으로 활성화한 다음, 엔딩 시작 시 시간을 보정하세요. 플레이어의 시간을 읽지 못하는 경우 **Reproducir ahora** 버튼으로 수동 재생할 수 있습니다.

## Credits and license

Original extension code © 2026 Tom / ReyHuachimingo. [MIT License](LICENSE).

Unofficial fan-made project, not affiliated with Netflix, YouTube, the JoJo's Bizarre Adventure rights holders, America, or other music rights holders. Videos and music remain hosted by their original providers.
