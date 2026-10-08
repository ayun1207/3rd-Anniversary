# Vue 升級路線

最後核對：2026-10-08

## 評估結論

採用漸進式 Vue 3／Vite 重構，不一次推翻目前已完成的古風版面與互動。現階段不加入 GSAP、ScrollTrigger 或 tsparticles；先用 Vue 響應式狀態與 CSS 動畫完成真正需要資料驅動的功能，再依效能與維護需求決定是否增加依賴。

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
- `src/data/seasons.js` 集中 24 節氣名稱、短句、圖片路徑、色調與橫式標記，作為後續替換重複 DOM 的資料來源。
- 先前試作的寄語輸入表單已依需求完整移除；現有寄語只呈現事先收集並整理好的內容。
- 舊 `script.js` 已納入 Vite module bundle，並暫時公開既有 inline handler，確保漸進遷移期間功能不變。
- 建置時複製現有圖片與音訊目錄；不完整且會產生 404 的 Chiron 字體分片不再部署或載入。

## 後續階段

1. 將節氣環與作品 DOM 改由 `seasonsData` 的 `v-for` 產生，再刪除 JavaScript 中的重複資料。
2. 將開場、左側導覽、作品展示與音樂控制分拆成 SFC，逐步移除 inline handler 與舊全域函式。
3. 用低密度 CSS 或 Canvas 氛圍層做四季變化；以 IntersectionObserver 驅動，不鎖捲動。
4. 正式音檔到位後再顯示毛玻璃播放器與播放旋轉狀態，保留使用者手勢與錯誤處理。
5. 補齊 19 張缺少的作品圖片與正式文案後，再做真實載入進度；目前不以假進度條誤導使用者。

## 指令

```text
npm install
npm run dev
npm run optimize:images
npm run build
npm run preview
```

目前開發環境需要 Node.js 20.19+ 或 22.12+；本次驗證使用官方 Node 22 可攜版。

## GitHub Pages

- 新 repository 為 `ayun1207/3rd-Anniversary`。
- `.github/workflows/deploy-pages.yml` 會在 `main` 收到 push 後，以 `/3rd-Anniversary/` 為 Vite base 建置並部署 `dist`。
- 本機 `npm run dev` 仍使用 `/`，開發網址維持簡單的 localhost 根路徑。
- `node_modules/` 與 `dist/` 不提交；GitHub Actions 會重新安裝套件並產生部署成品。
