# Vue 升級路線

最後核對：2026-10-08

## 評估結論

採用漸進式 Vue 3／Vite 重構，不一次推翻目前已完成的古風版面與互動。現階段不加入 GSAP、ScrollTrigger 或 tsparticles；先用 Vue 響應式狀態與 CSS 動畫完成真正需要資料驅動的功能，再依效能與維護需求決定是否增加依賴。

規格中的「鎖定垂直捲動並橫向移動 24 件作品」與目前已確認的自然捲動方向衝突，因此不執行。觀芳華維持一般文件流，作品由箭頭、鍵盤與水平滑動切換。

參考站 `xtremedeepfieldproject.com` 在一般網頁擷取與本機 headless Chrome 中都未提供可讀內容，因此目前只採用使用者明確描述的質感方向，不宣稱複製其實際動畫或結構。

## 已完成的第一階段

- 新增 Vite、Vue 3 與 SFC 支援，production build 可完成。
- `src/data/seasons.js` 集中 24 節氣名稱、短句、圖片路徑、色調與橫式標記，作為後續替換重複 DOM 的資料來源。
- 寄語章節新增 Vue SFC 表單；寄語與署名送出後立即加入本次瀏覽的柔和流動訊息，重新整理後消失。
- reduced-motion 下停止寄語流動，改為靜態可捲動列表。
- 舊 `script.js` 已納入 Vite module bundle，並暫時公開既有 inline handler，確保漸進遷移期間功能不變。
- 建置時複製現有圖片、音訊目錄與 Chiron 字體分片，避免 production 缺少靜態素材。

## 後續階段

1. 將節氣環與作品 DOM 改由 `seasonsData` 的 `v-for` 產生，再刪除 JavaScript 中的重複資料。
2. 將開場、左側導覽、作品輪播與音樂控制分拆成 SFC，逐步移除 inline handler 與舊全域函式。
3. 用低密度 CSS 或 Canvas 氛圍層做四季變化；以 IntersectionObserver 驅動，不鎖捲動。
4. 正式音檔到位後再顯示毛玻璃播放器與播放旋轉狀態，保留使用者手勢與錯誤處理。
5. 補齊 19 張缺少的作品圖片與正式文案後，再做真實載入進度；目前不以假進度條誤導使用者。

## 指令

```text
npm install
npm run dev
npm run build
npm run preview
```

目前開發環境需要 Node.js 20.19+ 或 22.12+；本次驗證使用官方 Node 22 可攜版。

## GitHub Pages

- 新 repository 為 `ayun1207/3rd-Anniversary`。
- `.github/workflows/deploy-pages.yml` 會在 `main` 收到 push 後，以 `/3rd-Anniversary/` 為 Vite base 建置並部署 `dist`。
- 本機 `npm run dev` 仍使用 `/`，開發網址維持簡單的 localhost 根路徑。
- `node_modules/` 與 `dist/` 不提交；GitHub Actions 會重新安裝套件並產生部署成品。
