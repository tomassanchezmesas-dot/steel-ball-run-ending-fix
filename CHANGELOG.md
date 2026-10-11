# Changelog

## [1.4.0] - 2026-10-11

### Added
- Support for arbitrary HTTP(S) websites enabled on a per-site opt-in basis.
- Optional site permissions and persistent, dynamically registered content scripts.
- Popup controls to enable or disable the current site.
- Floating manual replacement button on approved non-Netflix sites.
- Separate ending calibration thresholds for different websites.
- Dynamic YouTube overlay referrer parameters for the current site.

### Notes
- Automatic video timing is only possible when an accessible HTML5 video element is exposed.
- Cross-origin embedded or closed players may require manual playback.
- No automatic access to other websites is granted.

All notable changes to Steel Ball Run Ending Fix are documented here.

## [1.3.0] - 2026-09-28

### Added
- Ending picker in the extension popup.
- **A Horse With No Name** (YouTube: `oMiX8tZqswI`).
- **California Dreamin'** (YouTube: `j7J4IrIYQvY`).
- The selected ending is remembered through Chrome sync storage.
- The choice applies to overlay, new-tab and redirect modes.

## [1.2.0] - 2026-09-28

### Fixed
- Fixed YouTube Error 153 in overlay mode.
- The YouTube iframe is now inserted directly into the HTTPS Netflix page instead of being nested inside a `chrome-extension://` player page.
- Added `referrerpolicy="strict-origin-when-cross-origin"` plus YouTube `origin` and `widget_referrer` parameters.

### Kept
- Time-remaining detector for episodes where Netflix does not expose a Skip Credits button.
- One-click ending calibration.
- Optional automatic skip of the official ending after the alternate ending.
- Overlay, new-tab and redirect modes.

## [1.1.0] - 2026-09-28

### Added
- Time-based ending detection.
- One-click calibration using the current Netflix playback position.
- Live playback status in the popup.
- Optional automatic skip of the official ending.

## [1.0.0] - 2026-09-28

### Added
- Initial Manifest V3 extension.
- Steel Ball Run title detection.
- Skip Credits detection.
- Overlay, new-tab and redirect modes.
- Manual trigger shortcut.
