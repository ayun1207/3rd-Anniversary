# Cloudflare Pages 發布

本專案由 GitHub 原始碼建置成靜態網站。Cloudflare Pages 應連接 `ayun1207/3rd-Anniversary`，讀取 `main` 分支。

## 建立專案時的設定

| 欄位 | 設定 |
| --- | --- |
| Framework preset | Vue |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 留空，使用儲存庫根目錄 |
| `VITE_BASE_PATH` | `/`，或不設定以使用現有預設值 |
| Node.js | 根目錄 `.node-version` 指定 `24.21.0`；若後台另外設定 `NODE_VERSION`，使用同一版本 |

GitHub Pages 的 `/3rd-Anniversary/` 只由既有 GitHub Actions 流程注入。Cloudflare 網址使用根路徑 `/`。

Cloudflare 的自動依賴安裝應保持開啟，讓建置環境依 `package-lock.json` 安裝依賴。連接 Git 後，後續推送至 `main` 會觸發新的正式建置。設定依據見 [Cloudflare 建置設定](https://developers.cloudflare.com/pages/configuration/build-configuration/)、[Node.js 版本設定](https://developers.cloudflare.com/pages/configuration/build-image/) 與 [Git 整合](https://developers.cloudflare.com/pages/configuration/git-integration/)。

## 本機更新與推送

1. 修改文字後執行 `npm.cmd run optimize:font`，同步網站字體子集。圖片依各素材處理腳本更新。
2. 執行 `npm.cmd run validate:release` 與 `npm.cmd run build`。
3. 檢查 VS Code 的來源控制差異，提交並推送至 `main`。
4. 在 GitHub 確認最新 commit，再到 Cloudflare 建立或查看部署，核對部署使用的 commit。

`artwork-originals/`、`作品圖排版/`、`node_modules/` 與 `dist/` 由 `.gitignore` 排除。需要推送的是原始碼、生成的網站版 WebP、字體子集、資料模組與 `package-lock.json`。Cloudflare 會自行產生 `dist`。

原始字體與授權文件仍保留於 GitHub，網站只載入字體子集。GitHub 另有歷史背景素材，並非目前的委託原圖；未引用的歷史素材不會被 Vite 發布。

## 2026-11-14 發布前檢查

- 以 Git 追蹤檔案加上本次待提交的 `.node-version` 建立乾淨副本，未帶入委託原圖、排版稿或原本的 `node_modules`。全新 `npm ci`、嚴格內容驗證與正式建置成功。
- 根路徑建置共 125 個檔案，約 11.6 MB，最大檔案 700,304 bytes。逐一 HTTP 檢查 125 個檔案，皆回應 200 且回應長度正確。
- 部署產物未包含 PNG／JPEG 原圖、完整 TTF、source map、開發技能或檢查截圖。
- 桌機與手機預覽的章節導覽、字體、作品與結語載入正常，未出現 JavaScript 錯誤或資源 404。完整手機操作驗收見 `responsive-accessibility.md`。
- 網頁 title 已使用「霓影流轉，四時成章」，24 張作品 alt 改為對應節氣的作品說明。嚴格內容驗證為 0 警告，`npm audit` 回報 0 項已知漏洞。
- `.bookmark-transparent-audit.png` 舊檢查截圖已移除，相關暫存截圖命名加入忽略規則。

## 取得正式網址後

本機預覽確認的是建置與資源完整性。Cloudflare 發布後，再以實際 `pages.dev` 網址確認冷載入、字體回應、快取、手機安全區與完整操作。CDN 延遲、流量容量及 iOS／Android 實機表現以部署後實測為準。
