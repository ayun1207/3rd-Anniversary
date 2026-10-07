# 內容與素材

最後核對：2026-10-07

## 正式／暫時文案

目前可視為已指定的開場與導覽文字：

- `霓影流轉 四時成章`
- `踏歲偕行續年華 來春共赴啟新篇`
- `入新章`
- 理時序、觀芳華、籌花事、繪春信、寄語、謝花人
- 四時流轉、作品展示、籌畫細節、繪師資訊、委託名單
- 理時序三行引文與 24 句 `solarTermNotes`
- 節氣環預設中央字：`歲·律`
- 24 張作品依序使用對應節氣名稱作為標題

仍是 placeholder：

- `<title>展示網站</title>`
- 24 張作品的通用敘述
- `圖片 N` 替代文字
- 三個資訊頁的實際內容
- 寄語卡片的正式留言、署名與最終卡片數量

不要自行創作或補齊 placeholder；由使用者提供或明確要求後再改。

## 作品圖片現況

| 檔案 | 專案內尺寸 | 用途／狀態 |
| --- | ---: | --- |
| `photo1.png` | 261×454 | 已引用，直式暫存素材 |
| `photo2.png` | 267×430 | 已引用，直式暫存素材 |
| `photo9.jpg` | 2400×1350 | 已引用，橫式；使用者表示原圖為 6000×3376 |
| `photo15.jpg` | 2800×1576 | 已引用，橫式 featured；使用者表示原圖為 7000×3939 |
| `photo22.jpg` | 2400×1350 | 已引用，橫式；使用者表示原圖為 6000×3376 |
| `photo3.jpg`–`photo8.jpg` | 缺少 | HTML 已引用 |
| `photo10.jpg`–`photo14.jpg` | 缺少 | HTML 已引用 |
| `photo16.jpg`–`photo21.jpg` | 缺少 | HTML 已引用 |
| `photo23.jpg`–`photo24.jpg` | 缺少 | HTML 已引用 |

檔案路徑區分大小寫風險雖在 Windows 不明顯，上線環境可能不同；命名與副檔名必須精確一致。

## 背景與未使用圖片

| 檔案 | 尺寸 | 狀態 |
| --- | ---: | --- |
| `intro-atmosphere-v2.png` | 1672×941 | 開場局部紙墨畫意，CSS 正在使用 |
| `intro-atmosphere-v1.png` | 1672×941 | 未引用的舊版本 |
| `191066.jpg` | 600×600 | 未引用 |
| `images/README.md` | 空白 | 尚未記錄素材來源或授權 |

不要假設未引用檔案可刪除；刪除前需由使用者確認。

## 字體

- LXGW WenKai TC：`lxgw-wenkai-tc-300.woff2`、`400.woff2`，用於開場、節氣名稱、中心文字與作品節氣標籤。
- Chiron Sung HK：由 `fonts/chiron/css/vf.css` 與分片 woff2 載入，中央節氣敘述使用。
- 一般回退包含 Noto Serif TC、Noto Serif CJK TC、Source Han Serif TC、Songti TC、PMingLiU、MingLiU、serif。
- 授權文件位於 `fonts/OFL-LXGW-WenKai-TC.txt` 與 `fonts/LICENSE-Chiron-Sung-HK.md`。

## 音樂

- `<audio id="backgroundMusic">` 無 `src`，沒有實際音檔。
- 若加入，建議使用清楚的本機路徑（例如 `audio/background.mp3`），並記錄來源、授權與署名要求。
- 有聲播放必須由使用者手勢觸發；現有程式已按此設計。

## 圖片交付建議

- 保留原始委託圖於專案外的安全位置；網站使用適合顯示尺寸的輸出版本。
- 上線前依畫質需求考慮 WebP／AVIF、JPEG 品質與 responsive image，而不是直接使用 6000–7000px 原圖。
- 每次替換後檢查方向、色彩、檔案大小、載入時間、透明背景及 `alt`。
- 若改副檔名，必須同步修改 HTML；不可只重新命名而不確認實際編碼格式。

## 更新此文件的時機

新增／替換／刪除圖片、字體、音樂，修改正式文案狀態，或完成素材授權與效能處理時更新。
