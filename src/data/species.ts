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
    ],
  },
  {
    id: 'masubee',
    rarity: 'common',
    lineName: 'マスめのせいれい',
    stages: [
      { name: 'マスビー', desc: 'げんこうようしの マスめに すんでいる。', look: { body: 'square', c1: '#fdf6e0', c2: '#c94f4f', eyes: 'dot', mouth: 'w', extras: ['gridLines'] } },
      { name: 'マスダイオー', desc: 'きれいに かかれた じが だいすきな マスめの おうさま。', look: { body: 'square', c1: '#faf0d4', c2: '#b04343', eyes: 'big', mouth: 'smile', extras: ['gridLines', 'crown'] } },
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
    ],
  },
  {
    id: 'hoshippo',
    rarity: 'rare',
    lineName: 'ほしのせいれい',
    stages: [
      { name: 'ホシッポ', desc: 'ながれぼしの かけらから うまれた。', look: { body: 'star', c1: '#f7d154', c2: '#fff3c2', eyes: 'dot', mouth: 'smile', blush: true, extras: [] } },
      { name: 'ホシゾラン', desc: 'よぞらいっぱいの ほしと おともだち。', look: { body: 'star', c1: '#f2c33c', c2: '#fff3c2', eyes: 'star', mouth: 'open', extras: ['starHalo'] } },
    ],
  },
  {
    id: 'kazeppo',
    rarity: 'rare',
    lineName: 'かぜのせいれい',
    stages: [
      { name: 'カゼッポ', desc: 'そよかぜに のって たびを している。', look: { body: 'cloud', c1: '#cfe6df', c2: '#9fccc0', eyes: 'dot', mouth: 'w', extras: ['windCheeks'] } },
      { name: 'カゼマルン', desc: 'おおきな かぜを おこして そらを かける。', look: { body: 'cloud', c1: '#b8dcd2', c2: '#86bcae', eyes: 'happy', mouth: 'open', extras: ['windCheeks', 'wings'] } },
    ],
  },
  {
    id: 'iwagoro',
    rarity: 'rare',
    lineName: 'いわのせいれい',
    stages: [
      { name: 'イワゴロ', desc: 'ごつごつ してるけど こころは やわらかい。', look: { body: 'square', c1: '#9a938a', c2: '#6e6862', eyes: 'dot', mouth: 'smile', extras: ['rockBumps'] } },
      { name: 'イワダイオー', desc: 'どんな ことにも びくとも しない いわの おう。', look: { body: 'square', c1: '#87817a', c2: '#5d5852', eyes: 'sleepy', mouth: 'smile', extras: ['rockBumps', 'crown'] } },
    ],
  },
  {
    id: 'yukippo',
    rarity: 'rare',
    lineName: 'ゆきのせいれい',
    stages: [
      { name: 'ユキッポ', desc: 'はつゆきの ひに うまれる つめたくて かわいい こ。', look: { body: 'round', c1: '#eef6fb', c2: '#cfe4f2', eyes: 'dot', mouth: 'smile', blush: true, extras: ['snowCap'] } },
      { name: 'ユキダルーン', desc: 'ころころ ころがって おおきく なった。', look: { body: 'cloud', c1: '#e6f2fa', c2: '#bcd9ec', eyes: 'happy', mouth: 'open', extras: ['snowCap', 'scarf'] } },
    ],
  },
  {
    id: 'nijipop',
    rarity: 'epic',
    lineName: 'にじのせいれい',
    stages: [
      { name: 'ニジポップ', desc: 'あめあがりの そらに あらわれる めずらしい こ。', look: { body: 'round', c1: '#f7f7f7', c2: '#e6e6e6', eyes: 'big', mouth: 'open', blush: true, extras: ['rainbow'] } },
      { name: 'ニジオウ', desc: 'ななつの いろを あやつる にじの おうさま。', look: { body: 'round', c1: '#ffffff', c2: '#efeaf7', eyes: 'star', mouth: 'smile', extras: ['rainbow', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'tatsupo',
    rarity: 'epic',
    lineName: 'りゅうのせいれい',
    stages: [
      { name: 'タツポ', desc: 'でんせつの りゅうの あかちゃん。まだ ちいさい。', look: { body: 'tear', c1: '#79c99a', c2: '#e5f7ec', eyes: 'big', mouth: 'w', blush: true, extras: ['horns'] } },
      { name: 'タツリュウオー', desc: 'そらへ のぼった でんせつの りゅうおう。', look: { body: 'tear', c1: '#57b381', c2: '#d2f0e0', eyes: 'star', mouth: 'open', extras: ['horns', 'wings', 'crown'] } },
    ],
  },
]

export function getSpecies(id: string): SpeciesDef | undefined {
  return SPECIES.find((s) => s.id === id)
}

export function totalDexStages(): number {
  return SPECIES.reduce((acc, s) => acc + s.stages.length, 0)
}

export function speciesByRarity(rarity: Rarity): SpeciesDef[] {
  return SPECIES.filter((s) => s.rarity === rarity)
}
