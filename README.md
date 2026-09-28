# Steel Ball Run Ending Fix 🐎

A small, open-source Chrome extension that detects the ending of **JoJo's Bizarre Adventure: Steel Ball Run** on Netflix and temporarily plays the fan edit **"A Horse With No Name"** hosted on the Lil Blv YouTube channel.

> Current version: **v1.2.0**

[Download the latest source ZIP](https://github.com/tomassanchezmesas-dot/steel-ball-run-ending-fix/archive/refs/heads/main.zip) · [Watch the alternate ending](https://www.youtube.com/watch?v=oMiX8tZqswI)

## What it does

- Detects Steel Ball Run on Netflix.
- Can detect the ending by **time remaining**, so it does not depend on Netflix showing a "Skip Credits" button.
- Includes one-click calibration: press the calibration button when the official ending starts and the extension remembers that timing.
- Pauses Netflix and plays the alternate YouTube ending in an overlay.
- Can automatically skip the official ending afterwards and continue Netflix.
- Includes fallback modes: open YouTube in a new tab, or redirect the current tab.
- Provides a manual shortcut: **Ctrl+Shift+E**.
- Stores settings locally through Chrome sync storage.
- Does **not** decrypt, download, modify, or bypass Netflix DRM.

## Install

1. Download the repository ZIP using the link above.
2. Extract it.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted `steel-ball-run-ending-fix-main` folder.
7. Reload any Netflix tab that was already open.

### First-time calibration

Netflix does not always show a "Skip Credits" button.

1. Start a Steel Ball Run episode.
2. When the **first frame of the official ending** appears, open the extension.
3. Click **"Marcar inicio AHORA + reemplazar 🐎"**.
4. The extension saves how many seconds were left and uses that timing for later episodes.

If the popup cannot identify the series, click **"Activar pestaña"** once.

## Modes

| Mode | Behaviour |
| --- | --- |
| Overlay | Pauses Netflix and places the alternate YouTube ending over the player. |
| New tab | Opens YouTube, waits for the configured ending duration, returns to Netflix and resumes. |
| Redirect | Navigates the Netflix tab directly to YouTube. |

## Privacy

No analytics, telemetry, tracking, ads, or external analytics services are included.

The extension only uses the permissions required for its local behaviour on Netflix/YouTube. See [PRIVACY.md](PRIVACY.md) for details.

## v1.2.0

- Fixed the YouTube **Error 153** problem in overlay mode by embedding YouTube directly in the HTTPS Netflix page context.
- Added an explicit referrer policy and YouTube origin/widget-referrer parameters.
- Keeps the time-based ending detector and calibration introduced in v1.1.
- Can skip the official ending after the alternate ending finishes.

See [CHANGELOG.md](CHANGELOG.md).

---

## Español 🇨🇱

**Steel Ball Run Ending Fix** detecta cuándo comienza el ending de Steel Ball Run en Netflix y reproduce temporalmente el edit alternativo de YouTube de Lil Blv con **"A Horse With No Name"**.

### Instalación rápida

1. Descarga el ZIP del repositorio.
2. Descomprímelo.
3. Ve a `chrome://extensions`.
4. Activa **Modo desarrollador**.
5. Pulsa **Cargar descomprimida**.
6. Selecciona la carpeta extraída.
7. Recarga Netflix.

Como Netflix no siempre muestra **"Omitir créditos"**, la forma recomendada es calibrarlo una vez: cuando comience el ending oficial, abre la extensión y pulsa **"Marcar inicio AHORA + reemplazar 🐎"**.

La extensión **no rompe, descarga ni modifica el DRM de Netflix**. Sólo observa el reproductor localmente y controla la reproducción de la pestaña.

---

## 한국어 🇰🇷

**Steel Ball Run Ending Fix**는 Netflix에서 *Steel Ball Run* 엔딩이 시작되는 시점을 감지한 뒤, Lil Blv의 YouTube 대체 엔딩 영상을 재생하는 Chrome 확장 프로그램입니다.

### 설치

1. 저장소 ZIP을 다운로드하고 압축을 풉니다.
2. Chrome에서 `chrome://extensions`를 엽니다.
3. **개발자 모드**를 켭니다.
4. **압축해제된 확장 프로그램을 로드합니다**를 선택합니다.
5. 압축을 푼 폴더를 선택합니다.
6. Netflix 탭을 새로고침합니다.

Netflix에 **크레딧 건너뛰기** 버튼이 표시되지 않아도 사용할 수 있습니다. 공식 엔딩이 시작되는 순간 확장 프로그램을 열고 **"Marcar inicio AHORA + reemplazar 🐎"** 버튼을 한 번 누르면 남은 시간을 저장하여 다음 에피소드에서도 사용합니다.

---

## Disclaimer

This is an **unofficial fan-made project**. It is not affiliated with, endorsed by, or sponsored by Netflix, YouTube/Google, Shueisha, David Production, the JoJo's Bizarre Adventure rights holders, America, or any music rights holder.

The extension does not redistribute the Netflix episode, the song, or the YouTube video. The alternate ending is streamed from YouTube using the linked video. All third-party names, media, music and trademarks belong to their respective owners.

## License

The extension's original source code in this repository is released under the [MIT License](LICENSE). This license does **not** grant rights to third-party audiovisual works, music, trademarks, or platform content.
