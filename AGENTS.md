# 專案協作規則

本專案是三周年二十四節氣作品展示網站，目前使用 **Vue 3 + Vite**，並採取漸進式遷移：既有主要畫面仍以 `index.html`、`style.css`、`script.js` 為基礎，新功能與適合拆分的區塊再逐步移入 `src/` 的 Vue 元件與資料模組。專案需要透過 Vite 開發與建置，不再以直接雙擊 `index.html` 作為正式預覽方式。

## 文件查詢

- 詳細專案資訊位於 `docs/`。當目前任務需要專案背景資訊時，先參考 `docs/INDEX.md`，再根據任務選擇需要的文件。除非任務需要完整的專案 review，否則不要讀取所有文件。
- 簡單且可直接從相關程式碼判斷的任務，不必先讀大量文件。
- 文件與程式碼衝突時，以目前的 `index.html`、`style.css`、`script.js`、`src/`、`package.json`、`vite.config.js` 與實際素材為準，並修正受影響的文件。
- 功能修改只更新直接受影響的文件；不要為小修改重掃或重寫整套 docs。
- 文件讀取數量不設固定上限；應優先讀取完成目前任務所需的最少文件，若任務跨越多個功能，再按需增加。

## 開發規則

- 修改前先定位相關 HTML、CSS、JavaScript、Vue 元件、資料模組與主題文件，只動任務需要的範圍。
- 保留使用者未要求變更的程式碼、文案、素材與工作區變更；不要自行補寫企劃文案。
- 維持現有古風、暖紙、低彩度、柔和光影與緩慢動態；避免強烈 3D、硬切、厚重陰影及過度飽和。
- Vue 3 與 Vite 已獲使用者同意並是目前既有技術棧。不要任意更換框架、引入 Tailwind、狀態管理或其他大型套件；若確有需要，先說明影響並取得同意。
- 遷移採漸進方式。除非使用者明確要求，不要一次重寫整站；將既有區塊移入 Vue 時，需保留其版面、文案、互動、無障礙與動畫最終狀態。
- 涉及既有互動區塊的較大修改時，應依 `docs/vue-upgrade.md` 判斷是否適合同步進行 Vue 漸進式遷移。
- `src/` 用於 Vue 元件與資料模組；根目錄既有 HTML、CSS、JavaScript 在完成對應遷移前仍是有效來源，不得因已安裝 Vue 就自行刪除。
- 不要直接修改 `node_modules/` 或 `dist/`。`node_modules/` 是安裝依賴，`dist/` 是建置產物，均應由 npm/Vite 產生。
- Windows PowerShell 若阻擋 `npm.ps1`，使用 `npm.cmd` 執行 npm 指令。
- 保留鍵盤操作、焦點樣式、觸控滑動、`aria-*`、`inert` 與 `prefers-reduced-motion` 行為。
- 修改輪播或切頁時，保留 `isAnimating`、`isPageSwitching`、動畫取消與最終狀態復原機制。
- 修改節氣資料時，同步核對目前仍在使用的 24 個 `.solar-term`、24 個 `.slide-item`、`solarTermNotes`、`backgroundColors`，以及 `src/data/seasons.js` 的數量和順序；若某一資料來源已正式完成遷移並移除，應同步更新此規則與相關文件。
- 新增或替換圖片時，確認實際檔名、副檔名、尺寸、容量與 HTML 路徑完全一致。

## 驗證原則

- 依改動風險檢查桌機、手機及 reduced-motion。
- JavaScript 或 Vue 修改至少執行語法／建置檢查；HTML／CSS 修改至少檢查引用、元素數量與差異範圍。
- 涉及導覽、輪播、開場或節氣環時，使用 `docs/INDEX.md` 找到對應驗證清單。
- 完成較大修改後，應依 `docs/vue-upgrade.md` 對本次涉及區域進行局部 cleanup／review，避免 dead code、重複狀態，或 Vue 與原生 JavaScript 重複控制同一功能。
- 一般本機預覽使用 `npm.cmd run dev`，並在 Chrome 開啟終端顯示的本機網址（通常是 `http://localhost:5173/`）；不要以 `file://` 或直接雙擊 `index.html` 驗證。
- 完成跨檔案、Vue、資產路徑或部署相關修改後，至少執行 `npm.cmd run build`；再依改動範圍檢查桌機、手機及 `prefers-reduced-motion`。

## GitHub 與部署

- 原始碼推送至 `main` 後，由 `.github/workflows/deploy-pages.yml` 使用 GitHub Actions 建置並發布 GitHub Pages。
- Vite 的 GitHub Pages 子路徑由部署流程提供；修改資產引用或 `vite.config.js` 時，需同時驗證本機根路徑與 `/3rd-Anniversary/` 正式路徑。
- 對外分享使用 GitHub Pages 正式網址；`localhost` 僅供本機開發，不能提供他人查看。
