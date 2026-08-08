// 仲間キャラクター（完全オリジナル。仕様 §19, §25, §26）。
// 「文房具と自然の国のせいれい」という独自世界観。既存作品のキャラクター・名称・
// デザインは使用しない。見た目はパラメトリックSVG（sprites.tsx）で描画し、
// 後から画像に差し替えられるよう speciesId + stage をキーにしている。

export type BodyKind = 'round' | 'tall' | 'tear' | 'square' | 'mountain' | 'star' | 'cloud'
export type EyeKind = 'dot' | 'big' | 'happy' | 'sleepy' | 'star'
export type MouthKind = 'smile' | 'open' | 'w'
export type ExtraKind =
  | 'brushTuft'
  | 'inkDrop'
  | 'foldCorner'
  | 'stripeBand'
  | 'gridLines'
  | 'leaf'
  | 'branch'
  | 'rays'
  | 'crescent'
  | 'starHalo'
  | 'windCheeks'
  | 'rockBumps'
  | 'snowCap'
  | 'rainbow'
  | 'horns'
  | 'wings'
  | 'crown'
  | 'scarf'
  | 'sparkle'
  | 'tail'

export interface Look {
  body: BodyKind
  /** 本体色 */
  c1: string
  /** アクセント色 */
  c2: string
  eyes: EyeKind
  mouth: MouthKind
  blush?: boolean
  extras: ExtraKind[]
}

export interface SpeciesStageDef {
  name: string
  desc: string
  look: Look
}

export type Rarity = 'common' | 'rare' | 'epic'

export interface SpeciesDef {
  id: string
  rarity: Rarity
  /** 系列名（図鑑のグループ表示用） */
  lineName: string
  stages: SpeciesStageDef[]
  /** 進化レベル（省略時は gameConfig.defaultEvolveLevels） */
  evolveLevels?: number[]
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'ノーマル',
  rare: 'レア',
  epic: 'スーパーレア',
}

export const SPECIES: SpeciesDef[] = [
  {
    id: 'fudepo',
    rarity: 'common',
    lineName: 'ふでのせいれい',
    stages: [
      { name: 'フデポ', desc: 'ふでの きれはしから うまれた ちいさな せいれい。', look: { body: 'round', c1: '#a8795a', c2: '#f3e3c8', eyes: 'dot', mouth: 'smile', blush: true, extras: ['brushTuft'] } },
      { name: 'フデリン', desc: 'じょうずな じを みると うれしくて はねまわる。', look: { body: 'round', c1: '#96684b', c2: '#f3e3c8', eyes: 'big', mouth: 'open', blush: true, extras: ['brushTuft', 'scarf'] } },
      { name: 'フデセンセイ', desc: 'みんなの じを みまもる ふでの おおせんせい。', look: { body: 'tall', c1: '#7d573e', c2: '#f6ead2', eyes: 'sleepy', mouth: 'smile', extras: ['brushTuft', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'sumippo',
    rarity: 'common',
    lineName: 'すみのせいれい',
    stages: [
      { name: 'スミッポ', desc: 'すみの しずくが ぽとんと おちて うまれた。', look: { body: 'round', c1: '#454552', c2: '#8a8a9c', eyes: 'big', mouth: 'w', extras: ['inkDrop'] } },
      { name: 'スミゴロン', desc: 'ころがりながら りっぱな せんを ひいてくれる。', look: { body: 'square', c1: '#38384a', c2: '#8a8a9c', eyes: 'dot', mouth: 'smile', extras: ['inkDrop', 'stripeBand'] } },
      { name: 'スミオウ', desc: 'ひとふでで やまも うみも かける すみの おうさま。', look: { body: 'square', c1: '#2b2b3c', c2: '#b9b9d0', eyes: 'star', mouth: 'smile', extras: ['inkDrop', 'stripeBand', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'kamippe',
    rarity: 'common',
    lineName: 'かみのせいれい',
    stages: [
      { name: 'カミッペ', desc: 'まっしろな かみから うまれた ぺらぺらの こ。', look: { body: 'square', c1: '#f7f5ec', c2: '#d9d2c0', eyes: 'dot', mouth: 'smile', blush: true, extras: ['foldCorner'] } },
      { name: 'カミルン', desc: 'かぜに のって ふわふわ とぶのが とくい。', look: { body: 'tall', c1: '#f4f1e6', c2: '#cfc7b2', eyes: 'happy', mouth: 'open', extras: ['foldCorner', 'wings'] } },
      { name: 'カミヅル', desc: 'おりがみの つるに にた すがたに しんかした。', look: { body: 'tear', c1: '#f2eee1', c2: '#c94f4f', eyes: 'sleepy', mouth: 'smile', extras: ['wings', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'keshipo',
    rarity: 'common',
    lineName: 'けしゴムのせいれい',
    stages: [
      { name: 'ケシポ', desc: 'まちがいを けして くれる やさしい こ。', look: { body: 'square', c1: '#f2b7c6', c2: '#ffffff', eyes: 'dot', mouth: 'smile', blush: true, extras: ['stripeBand'] } },
      { name: 'ケシゴロ', desc: 'どんな まちがいも ぴかぴかに けす たつじん。', look: { body: 'square', c1: '#e79cb1', c2: '#ffffff', eyes: 'happy', mouth: 'open', extras: ['stripeBand', 'sparkle'] } },
      { name: 'ケシマスター', desc: 'せかいじゅうの まちがいを みまもる でんせつの けしゴム。', look: { body: 'square', c1: '#d886a0', c2: '#fff3f7', eyes: 'star', mouth: 'smile', extras: ['stripeBand', 'sparkle', 'crown', 'wings'] } },
    ],
  },
  {
    id: 'masubee',
    rarity: 'common',
    lineName: 'マスめのせいれい',
    stages: [
      { name: 'マスビー', desc: 'げんこうようしの マスめに すんでいる。', look: { body: 'square', c1: '#fdf6e0', c2: '#c94f4f', eyes: 'dot', mouth: 'w', extras: ['gridLines'] } },
      { name: 'マスダイオー', desc: 'きれいに かかれた じが だいすきな マスめの おうさま。', look: { body: 'square', c1: '#faf0d4', c2: '#b04343', eyes: 'big', mouth: 'smile', extras: ['gridLines', 'crown'] } },
      { name: 'マスダイテイオー', desc: 'げんこうようし 1まんまいを おさめる だいていおう。', look: { body: 'square', c1: '#f7e9bd', c2: '#9c3535', eyes: 'star', mouth: 'open', extras: ['gridLines', 'crown', 'wings', 'sparkle'] } },
    ],
  },
  {
    id: 'mokupo',
    rarity: 'common',
    lineName: 'このきのせいれい',
    stages: [
      { name: 'モクポ', desc: 'ちいさな きのみから うまれた もりの こ。', look: { body: 'round', c1: '#a2764f', c2: '#63a35c', eyes: 'dot', mouth: 'smile', blush: true, extras: ['leaf'] } },
      { name: 'モクリン', desc: 'えだが ぐんぐん のびて せが たかくなった。', look: { body: 'tall', c1: '#8d6543', c2: '#4f8f49', eyes: 'happy', mouth: 'open', extras: ['leaf', 'branch'] } },
      { name: 'モリノヌシ', desc: 'もりじゅうの きを まもる おおきな ぬし。', look: { body: 'cloud', c1: '#4f8f49', c2: '#7d573e', eyes: 'sleepy', mouth: 'smile', extras: ['branch', 'crown'] } },
    ],
  },
  {
    id: 'yamakko',
    rarity: 'rare',
    lineName: 'やまのせいれい',
    stages: [
      { name: 'ヤマッコ', desc: 'ちいさな おやまの せいれい。どっしり すわる。', look: { body: 'mountain', c1: '#7fa76b', c2: '#e8f0da', eyes: 'dot', mouth: 'smile', blush: true, extras: [] } },
      { name: 'ヤマゴン', desc: 'いわを まとって つよく なった。', look: { body: 'mountain', c1: '#6d9459', c2: '#d9e6c4', eyes: 'big', mouth: 'open', extras: ['rockBumps'] } },
      { name: 'ヤマタイオー', desc: 'ゆきの ぼうしを かぶった やまの おうさま。', look: { body: 'mountain', c1: '#5c8451', c2: '#f4f9ff', eyes: 'sleepy', mouth: 'smile', extras: ['snowCap', 'crown'] } },
    ],
  },
  {
    id: 'kawapon',
    rarity: 'rare',
    lineName: 'かわのせいれい',
    stages: [
      { name: 'カワポン', desc: 'さらさら ながれる おがわの しずくの こ。', look: { body: 'tear', c1: '#6fb5d8', c2: '#dff2fb', eyes: 'dot', mouth: 'smile', blush: true, extras: [] } },
      { name: 'カワリュン', desc: 'ながれに のって どこまでも およいでいく。', look: { body: 'tear', c1: '#5aa3c9', c2: '#cdeaf8', eyes: 'big', mouth: 'open', extras: ['tail'] } },
      { name: 'カワタキオー', desc: 'たきを のぼりきった みずの おうさま。', look: { body: 'cloud', c1: '#4b93bb', c2: '#e8f6fd', eyes: 'happy', mouth: 'smile', extras: ['tail', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'hinopo',
    rarity: 'rare',
    lineName: 'たいようのせいれい',
    stages: [
      { name: 'ヒノポ', desc: 'あさひの ひかりから うまれた あったかい こ。', look: { body: 'round', c1: '#f6b042', c2: '#fde8bd', eyes: 'dot', mouth: 'smile', blush: true, extras: ['rays'] } },
      { name: 'ヒノルン', desc: 'ぽかぽかの ひかりで みんなを げんきに する。', look: { body: 'round', c1: '#f29d2c', c2: '#fde3ae', eyes: 'happy', mouth: 'open', blush: true, extras: ['rays'] } },
      { name: 'タイヨウオー', desc: 'そらを てらす たいようの おうさま。', look: { body: 'round', c1: '#ec8a1e', c2: '#ffd98f', eyes: 'star', mouth: 'smile', extras: ['rays', 'crown'] } },
    ],
  },
  {
    id: 'tsukimin',
    rarity: 'rare',
    lineName: 'つきのせいれい',
    stages: [
      { name: 'ツキミン', desc: 'よるの そらから おりてきた ねむそうな こ。', look: { body: 'round', c1: '#f4e26e', c2: '#fdf7d8', eyes: 'sleepy', mouth: 'smile', extras: ['crescent'] } },
      { name: 'ミカヅキオー', desc: 'みかづきの よるに ねがいを きいてくれる。', look: { body: 'round', c1: '#eed44f', c2: '#fdf7d8', eyes: 'sleepy', mouth: 'open', extras: ['crescent', 'crown', 'sparkle'] } },
      { name: 'マンゲツオー', desc: 'まんまるに かがやく まんげつの おうさま。', look: { body: 'round', c1: '#f9e784', c2: '#fffbe6', eyes: 'star', mouth: 'smile', extras: ['rays', 'crown', 'starHalo'] } },
    ],
  },
  {
    id: 'hoshippo',
    rarity: 'rare',
    lineName: 'ほしのせいれい',
    stages: [
      { name: 'ホシッポ', desc: 'ながれぼしの かけらから うまれた。', look: { body: 'star', c1: '#f7d154', c2: '#fff3c2', eyes: 'dot', mouth: 'smile', blush: true, extras: [] } },
      { name: 'ホシゾラン', desc: 'よぞらいっぱいの ほしと おともだち。', look: { body: 'star', c1: '#f2c33c', c2: '#fff3c2', eyes: 'star', mouth: 'open', extras: ['starHalo'] } },
      { name: 'ギンガオー', desc: 'ぎんがを ぐるりと まわって かえってきた ほしの おう。', look: { body: 'star', c1: '#e9b52f', c2: '#fff8dd', eyes: 'star', mouth: 'smile', extras: ['starHalo', 'crown', 'wings'] } },
    ],
  },
  {
    id: 'kazeppo',
    rarity: 'rare',
    lineName: 'かぜのせいれい',
    stages: [
      { name: 'カゼッポ', desc: 'そよかぜに のって たびを している。', look: { body: 'cloud', c1: '#cfe6df', c2: '#9fccc0', eyes: 'dot', mouth: 'w', extras: ['windCheeks'] } },
      { name: 'カゼマルン', desc: 'おおきな かぜを おこして そらを かける。', look: { body: 'cloud', c1: '#b8dcd2', c2: '#86bcae', eyes: 'happy', mouth: 'open', extras: ['windCheeks', 'wings'] } },
      { name: 'タツマキオー', desc: 'そらを じゆうに かけまわる かぜの おうさま。', look: { body: 'cloud', c1: '#9fd0c2', c2: '#5fa693', eyes: 'star', mouth: 'open', extras: ['windCheeks', 'wings', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'iwagoro',
    rarity: 'rare',
    lineName: 'いわのせいれい',
    stages: [
      { name: 'イワゴロ', desc: 'ごつごつ してるけど こころは やわらかい。', look: { body: 'square', c1: '#9a938a', c2: '#6e6862', eyes: 'dot', mouth: 'smile', extras: ['rockBumps'] } },
      { name: 'イワダイオー', desc: 'どんな ことにも びくとも しない いわの おう。', look: { body: 'square', c1: '#87817a', c2: '#5d5852', eyes: 'sleepy', mouth: 'smile', extras: ['rockBumps', 'crown'] } },
      { name: 'ガンセキオー', desc: 'やまも ささえる でんせつの おおいわ。', look: { body: 'mountain', c1: '#7b756d', c2: '#4c4742', eyes: 'star', mouth: 'smile', extras: ['rockBumps', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'yukippo',
    rarity: 'rare',
    lineName: 'ゆきのせいれい',
    stages: [
      { name: 'ユキッポ', desc: 'はつゆきの ひに うまれる つめたくて かわいい こ。', look: { body: 'round', c1: '#eef6fb', c2: '#cfe4f2', eyes: 'dot', mouth: 'smile', blush: true, extras: ['snowCap'] } },
      { name: 'ユキダルーン', desc: 'ころころ ころがって おおきく なった。', look: { body: 'cloud', c1: '#e6f2fa', c2: '#bcd9ec', eyes: 'happy', mouth: 'open', extras: ['snowCap', 'scarf'] } },
      { name: 'フブキオー', desc: 'ふゆの そらを おさめる ゆきの おうさま。', look: { body: 'cloud', c1: '#dbedf9', c2: '#9cc4e0', eyes: 'star', mouth: 'smile', extras: ['snowCap', 'scarf', 'crown', 'starHalo'] } },
    ],
  },
  {
    id: 'nijipop',
    rarity: 'epic',
    lineName: 'にじのせいれい',
    stages: [
      { name: 'ニジポップ', desc: 'あめあがりの そらに あらわれる めずらしい こ。', look: { body: 'round', c1: '#f7f7f7', c2: '#e6e6e6', eyes: 'big', mouth: 'open', blush: true, extras: ['rainbow'] } },
      { name: 'ニジオウ', desc: 'ななつの いろを あやつる にじの おうさま。', look: { body: 'round', c1: '#ffffff', c2: '#efeaf7', eyes: 'star', mouth: 'smile', extras: ['rainbow', 'crown', 'sparkle'] } },
      { name: 'オーロラオー', desc: 'よぞらに ひかりの カーテンを かける でんせつの せいれい。', look: { body: 'round', c1: '#f4fbff', c2: '#d8ecff', eyes: 'star', mouth: 'open', extras: ['rainbow', 'crown', 'starHalo', 'wings'] } },
    ],
  },
  {
    id: 'tatsupo',
    rarity: 'epic',
    lineName: 'りゅうのせいれい',
    stages: [
      { name: 'タツポ', desc: 'でんせつの りゅうの あかちゃん。まだ ちいさい。', look: { body: 'tear', c1: '#79c99a', c2: '#e5f7ec', eyes: 'big', mouth: 'w', blush: true, extras: ['horns'] } },
      { name: 'タツリュウオー', desc: 'そらへ のぼった でんせつの りゅうおう。', look: { body: 'tear', c1: '#57b381', c2: '#d2f0e0', eyes: 'star', mouth: 'open', extras: ['horns', 'wings', 'crown'] } },
      { name: 'キンリュウオー', desc: 'きんいろに かがやく さいきょうの りゅうおう。', look: { body: 'tear', c1: '#e8c04a', c2: '#fdf0c0', eyes: 'star', mouth: 'open', extras: ['horns', 'wings', 'crown', 'sparkle', 'rays'] } },
    ],
  },
]

export function getSpecies(id: string): SpeciesDef | undefined {
  return SPECIES.find((s) => s.id === id)
}

// ============================================================
// レベル＝姿のシステム（2026-08-08 第4回フィードバック）
// レベル1〜6。上がるたびに見た目が変わる:
//   L1=1形態 / L2=1形態+リボン / L3=2形態(大変化) / L4=2形態+リボン /
//   L5=3形態(大変化) / L6=3形態+金のオーラ（最終）
// ============================================================
import { GAME_CONFIG } from '../config/gameConfig'

export const MAX_LEVEL: number = GAME_CONFIG.levels.maxLevel

/** レベル→進化形態(0-2) */
export function stageForLevel(level: number): number {
  return Math.min(2, Math.floor((Math.min(MAX_LEVEL, Math.max(1, level)) - 1) / 2))
}

/** レベル→かざりの段階（0=なし, 1=リボン, 2=金のオーラ） */
export function decorForLevel(level: number): number {
  if (level >= MAX_LEVEL) return 2
  return (level - 1) % 2
}

/** レベルN→N+1に必要なスター数（最大レベルならnull） */
export function starsNeededFor(level: number): number | null {
  if (level >= MAX_LEVEL) return null
  return GAME_CONFIG.levels.starsPerLevel[level - 1] ?? null
}

/** そのレベルでの表示名（形態の名前） */
export function nameForLevel(speciesId: string, level: number): string {
  const sp = getSpecies(speciesId)
  if (!sp) return '?'
  return sp.stages[stageForLevel(level)]?.name ?? sp.stages[0].name
}

export function totalDexStages(): number {
  return SPECIES.reduce((acc, s) => acc + s.stages.length, 0)
}

export function speciesByRarity(rarity: Rarity): SpeciesDef[] {
  return SPECIES.filter((s) => s.rarity === rarity)
}
