# Transmission easy client (with tags & dark mode)

A browser extension (Edge / Chrome) for controlling a [Transmission](https://transmissionbt.com/) BitTorrent daemon. It is a fork of [Feverqwe/Transmission](https://github.com/Feverqwe/Transmission) ("Transmission easy client" 2.2.2 by Anton), with these additions:

- **Dark mode.** Options → Main → *Theme*: Auto (follows the OS/browser), Light or Dark. The popup, file list, dialogs, menus and Options page are all themed.
- **Tags column.** Shows Transmission *labels* as colored chips. Click a chip to filter by that tag. You can sort by the column, and resize, move or hide it from the column header's right-click menu.
- **Filter by tag.** The filter dropdown in the top right has a **Tags** group listing every tag in use.
- **Edit tags.** Right-click one or more torrents → *Extra* → *Tags…*. Type the tags separated by commas, or click the known tags to toggle them. With several torrents selected, only the tags you add or remove change. Tags that only some of the torrents have are kept.

Tags need Transmission **3.00 or newer** (RPC `labels`, rpc-version 16+). With an older daemon the Tags menu item is hidden and the column stays empty.

## Build

Requires Node.js. webpack 4 needs the legacy OpenSSL provider on modern Node:

```bash
npm install
NODE_OPTIONS=--openssl-legacy-provider npx webpack --mode production --config webpack.config.js
```

The unpacked extension is written to `dist/chrome/src`.

## Install (unpacked)

1. Open `edge://extensions` (or `chrome://extensions`) and turn on **Developer mode**.
2. Click **Load unpacked** and choose `dist/chrome/src`.
3. After a rebuild, press **Reload** on the extension card.

`src/manifest.json` contains the original extension's `key`, so the build keeps the extension ID `cmkphjiphbjkffbcbnjiaidnjhahnned`. Loading it replaces an existing unpacked 2.2.2 and keeps its settings. An Edge app you created from that version ("Install this site as an app") then opens this build. Edge does not offer that menu item for newly loaded unpacked extensions. Remove the `key` if you want a separate extension ID.

The extension is Manifest V2, like the original.

## Test without a Transmission server

`dev-harness/` has a small Node server with a fake Transmission RPC (tagged sample torrents). It also provides a fake `chrome` API, so the built popup and Options pages run in a normal browser tab:

```bash
node dev-harness/server.js 4719
```

Open http://localhost:4719/. Add `?theme=dark` to force dark mode, or `?legacy=1` to start from a column layout saved by 2.2.2.

## Credits

Original extension by Anton ([Feverqwe/Transmission](https://github.com/Feverqwe/Transmission)). The upstream repository has no license file; this fork is published as a GitHub fork for that reason.
