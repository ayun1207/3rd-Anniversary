const names = [
  '立春', '雨水', '驚蟄', '春分', '清明', '穀雨',
  '立夏', '小滿', '芒種', '夏至', '小暑', '大暑',
  '立秋', '處暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
]

const notes = [
  '風開始有了方向', '細雨輕輕落進春天', '雷聲喚醒沉睡的土地', '晝與夜在此刻平衡',
  '天光澄澈，萬物明淨', '雨水滋養新生的穀物', '日光漸長，夏意初醒', '萬物將滿，仍留一線餘地',
  '種子趕在盛夏前落土', '白晝走到一年最長', '熱意從風裡慢慢升起', '盛夏抵達最深之處',
  '第一縷涼意穿過長夏', '暑氣在日暮裡緩緩退去', '清晨開始凝結微光', '晝夜再次平分秋色',
  '露水帶來更深的涼意', '草木收起最後的秋色', '萬物開始向內收藏', '初雪尚輕，冬意漸濃',
  '天地逐漸歸於寂靜', '長夜走到盡頭，微光將返', '寒意停在歲末的風裡', '一年最冷，也最接近新生'
]

const tones = [
  '#EFECE6', '#E6EBE0', '#EDF2F4', '#F4EAD4', '#F0E6EF', '#E2ECE9',
  '#EAE4E9', '#FFF1E6', '#FDE2E4', '#DBE7E4', '#E4C1F9', '#D6E2E9',
  '#E9ECEF', '#F3E9DC', '#D8E2DC', '#FFE5D9', '#ECE4DB', '#E0E1DD',
  '#F1FAEE', '#E8D8CE', '#DFE7FD', '#F0F3F4', '#EAD7D7', '#DCE1E3'
]

const seasonKeys = ['spring', 'summer', 'autumn', 'winter']
const landscapeIds = new Set([9, 15, 22])
const optimizedImageIds = new Set([9, 15, 22])
const basePath = import.meta.env?.BASE_URL || '/'

export const seasonsData = names.map((name, index) => {
  const id = index + 1
  const extension = id <= 2 ? 'png' : 'jpg'
  const number = String(id).padStart(2, '0')
  const hasOptimizedImage = optimizedImageIds.has(id)

  return {
    id,
    number,
    name,
    season: seasonKeys[Math.floor(index / 6)],
    note: notes[index],
    story: '在這裡寫下這張作品的故事，或是一句想留給看見它的人的話。',
    image: hasOptimizedImage
      ? `${basePath}images/artworks/${number}.webp`
      : `${basePath}images/photo${id}.${extension}`,
    imageSmall: hasOptimizedImage && landscapeIds.has(id)
      ? `${basePath}images/artworks/${number}-960.webp`
      : null,
    alt: `圖片 ${id}`,
    tone: tones[index],
    landscape: landscapeIds.has(id),
    featured: id === 15
  }
})
