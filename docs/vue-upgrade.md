# Vue 升級路線

最後核對：2026-11-04

## 評估結論

採用漸進式 Vue 3／Vite 重構。現行視覺動態已統一由 GSAP 核心管理，詳細邊界見 `animation.md`。Vue 導覽元件管理自己的 DOM 與動畫，既有章節狀態由 `script.js` 寫入共用 ref。本次動畫引擎遷移保留作品、寄語與節氣的既有資料及狀態管理，避免同時擴大為整個展廳的元件重寫。

規格中的「鎖定垂直捲動並橫向移動 24 件作品」與目前已確認的自然捲動方向衝突，因此不執行。觀芳華維持一般文件流，作品由箭頭、鍵盤與水平滑動切換。

參考站 `xtremedeepfieldproject.com` 在一般網頁擷取與本機 headless Chrome 中都未提供可讀內容，因此目前只採用使用者明確描述的質感方向，不宣稱複製其實際動畫或結構。

## 實作判斷原則

### 何時適合隨本次修改遷移

是否將既有區塊一併遷移為 Vue，應依該區塊的狀態、資料與維護成本判斷，不以「已經使用 Vue」作為唯一理由。符合越多下列情況，越適合在這次功能修改中優先完成遷移：

- 區塊具有明確且持續變化的 UI state，例如目前項目、開關、播放狀態、表單內容、載入狀態或錯誤狀態。
- 有大量結構相同的重複 DOM，適合改為資料陣列搭配 `v-for` 產生。
- 同一份資料同時影響多個畫面、標籤、進度或控制元件，需要保持同步。
- 現有實作依賴大量 `querySelector`、class 切換、屬性設定或其他手動 DOM 操作。
- 多個 event listener、inline handler 或 global function 彼此耦合，難以單獨修改與清理。
- 該區域本次正準備進行較大幅度的功能、結構或互動修改，遷移可避免同一區塊短期內重做兩次。
- 舊 JavaScript 已開始增加除錯、狀態同步或後續擴充的維護成本。

若本次需求只是小幅 CSS、文案、素材、間距或位置調整，應維持局部修改，不為了 Vue 強制擴大範圍。只有當既有結構已明顯妨礙這項小修改時，才重新評估是否遷移，並先確認遷移範圍與必要性。

### 決定遷移後的邊界

一旦決定遷移某個區塊，該區塊應形成清楚且完整的 Vue 管理邊界：

- 將該區塊的 state、event handler 與資料來源移入 Vue 元件或對應資料模組。
- 將重複 DOM 改成資料驅動渲染，避免只把原本的靜態 HTML 原樣搬進 SFC。
- 刪除 `script.js` 中已被 Vue 取代的舊邏輯、監聽器與全域函式。
- 避免 Vue 與原生 JavaScript 同時讀寫同一 DOM、class、屬性或 state；若遷移必須分階段，交界應明確且暫時相容層需註明用途。
- 完整保留現有 UI、動畫時序、RWD、鍵盤操作、觸控手勢、`prefers-reduced-motion` 與 accessibility 行為，不以框架遷移為由改變已確認的體驗。

### 完成後的局部 review

每次完成較大的功能修改或 Vue 遷移後，review 本次涉及的區域：

- 移除 dead code，以及不再使用的 selector、event listener、inline handler 與 global function。
- 合併重複邏輯，精簡因過渡期或多次修改而明顯過度複雜的程式碼。
- 檢查是否仍有重複資料來源、新舊 state 並存，或同一狀態由兩套程式控制。
- 確認文件、驗證清單與實際責任邊界同步更新。

cleanup／refactor 原則上只限本次修改涉及的區域。若發現問題需要跨區域的大型架構重構，先說明原因、影響範圍、遷移順序與風險，不直接擴大本次修改。

## 已完成的第一階段

- 新增 Vite、Vue 3 與 SFC 支援，production build 可完成。
- `src/data/seasons.js` 集中 24 節氣名稱、短句與色調；`script.js` 的短句、色調與圖片初始化已改由這份資料衍生。
- 圖片處理腳本會依 `artwork-originals/` 的實際檔案產生網站版 WebP 與 `src/data/artworks.js`，再由 `seasonsData` 合併作品路徑、尺寸與方向，避免 HTML、JavaScript 與素材資料各自維護一份清單。
- 先前試作的寄語輸入表單已依需求完整移除；現有寄語只呈現事先收集並整理好的內容。
- 舊 `script.js` 已納入 Vite module bundle，並暫時公開既有 inline handler，確保漸進遷移期間功能不變。
- 建置時複製現有圖片與音訊目錄；不完整且會產生 404 的 Chiron 字體分片不再部署或載入。

## 後續階段

1. 當作品展示開始進行較大幅度的版型或互動重構時，將作品展廳（必要時連同節氣環）作為完整 Vue 邊界，以 `seasonsData` 的 `v-for` 產生 DOM，並一次移除該區塊的原生 DOM 控制。
2. 將開場、左側導覽、作品展示與音樂控制分拆成 SFC，逐步移除 inline handler 與舊全域函式。
3. 用低密度 CSS 或 Canvas 氛圍層做四季變化；以 IntersectionObserver 驅動，不鎖捲動。
4. 正式音檔到位後再顯示毛玻璃播放器與播放旋轉狀態，保留使用者手勢與錯誤處理。
5. 補齊第 01–23 張作品圖片與正式文案後，再依真實素材評估載入進度；目前不以假進度條誤導使用者。

本次素材與檔案整理不同步遷移 Vue UI：圖片匯入、尺寸產生與清單建立屬於建置及資料層，先集中資料即可降低重複；若只為此改寫展廳，會不必要地擴大到鍵盤、觸控、換作防護、RWD 與 reduced-motion。作品展廳本身符合大量重複 DOM、共享資料與複雜互動等遷移條件，應在下一次實質改動展廳結構時完整遷移，而不是讓 Vue 與原生 JavaScript 同時控制同一區域。

## 指令

```text
npm install
npm run dev
npm run optimize:images
npm run validate
npm run validate:release
npm run check
npm run build
npm run preview
```

目前開發環境需要 Node.js 20.19+ 或 22.12+；本次驗證使用官方 Node 22 可攜版。

## GitHub Pages

- 新 repository 為 `ayun1207/3rd-Anniversary`。
- `.github/workflows/deploy-pages.yml` 會在 `main` 收到 push 後，以 `/3rd-Anniversary/` 為 Vite base 建置並部署 `dist`。
- 本機 `npm run dev` 仍使用 `/`，開發網址維持簡單的 localhost 根路徑。
- `node_modules/` 與 `dist/` 不提交；GitHub Actions 會重新安裝套件並產生部署成品。
