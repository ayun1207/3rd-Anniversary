# 開場與背景

最後核對：2026-10-06

## 設計方向

整體以暖紙、低彩度四季色、淡墨、霧氣與柔光為主。裝飾集中於邊緣與角落，中央保留文案閱讀空間；避免過度鮮豔、硬邊、厚重陰影與「整張生成圖直接鋪底」的感覺。

## 開場封面

`#entrance` 是全螢幕原生 dialog，文案為：

- 主標：`霓影流轉 四時成章`
- 副標：`踏歲偕行續年華 來春共赴啟新篇`
- 入口：`入新章`

主、副標目前不含標點，不要自行補上。

背景採分層元素，而不是單一大圖：

| 元素 | 主要 hook | 內容 |
| --- | --- | --- |
| 紙與墨 | `.entrance`、`::before`、`::after` | 暖米漸層、SVG 雜訊紙紋、內緣墨暈 |
| 光與霓 | `.entrance-light`、`.entrance-iridescence` | 右上柔光與低彩度弧形霓光 |
| 局部畫意 | `.entrance-paint-*` | 使用 `intro-atmosphere-v2.png`，以 mask 只保留左上與左下局部 |
| 霧與連接 | `.entrance-mist-*`、`.entrance-cloud-bridge` | 橫向連接四季象限的柔霧 |
| 水紋 | `.entrance-water` | 只保留右下較不規則的淡波紋 |
| 春 | `.entrance-season-spring` | 左上枝條與 32 枚花形元素 |
| 夏 | `.entrance-season-summer` | 右上 7 道風線與 26 枚葉片 |
| 秋 | `.entrance-season-autumn`、`.entrance-bamboo` | 右下秋月、8 層雲霧與 16 株竹林 |
| 冬 | `.entrance-season-winter` | 左下 32 枚低彩度雪晶與冷色暈染 |

開場中央內容以 `translateY(clamp(24px, 5vh, 48px))` 稍向下配置。入口按鈕本體維持固定位置，JavaScript 只依指標距離改變文字強度與光暈。

## 防止重新整理閃頁

- HTML 初始帶 `html.entrance-pending`。
- 此狀態隱藏 `.site-header` 與 `main`，並使用與封面接近的底色。
- JavaScript 開啟 dialog 後，在下一個 animation frame 移除此 class。
- 不要提前移除 class，也不要只靠 script 載入後才新增，否則會再次短暫閃出理時序。

## 理時序背景

- 全站固定使用暖紙色與極淡纖維網格；`body.intro-page-active` 不再整頁更換一套大面積四季漸層。
- `.intro-page::before` 是緩慢漂移的霧光；`::after` 是底部淡青海波紋。
- `script.js` 動態建立 `.intro-breeze`，四季各 6 枚，共 24 枚。
- 指標 240px 範圍內會推動裝飾；停止約 280ms 後回復。離開理時序、頁面隱藏或 reduced-motion 時停止並清理狀態。

## 全站與作品背景

- `body` 以暖紙、極淡九像素網格與局部柔光作為所有章節的共同底層，避免捲動時像切換不同投影片。
- 作品頁顏色來自 `script.js` 的 `backgroundColors[24]`。
- 作品色只呈現在有邊界的 `.gallery-stage` 內。
- 繪春信、籌花事與謝花人各自在章節邊角保留一處低透明色暈；背景主體仍是共同暖紙，不使用整頁彩色漸層。

## 音樂入口

- `<audio id="backgroundMusic">` 目前沒有 `src`，所以播放、靜音進入與提示皆隱藏。
- 加入正式音檔後，播放必須由使用者點擊入場或音樂按鈕直接觸發。
- 現有程式將音量在 1.8 秒內淡入至 0.22，失敗時顯示非阻斷訊息。
- 正式採用音樂前要確認授權與署名要求。

## 修改檢查

- 背景元素不可攔截點擊或鍵盤焦點。
- 中央標題、副標與入口在常見尺寸保持清楚。
- 手機四季元素會縮小且部分理時序飄葉隱藏；修改後一併檢查。
- reduced-motion 下霧動畫與距離回應必須停止。

## 更新此文件的時機

修改開場、紙墨／霧／霓光、四季元素、全站背景、理時序飄葉或音樂入口時更新。
