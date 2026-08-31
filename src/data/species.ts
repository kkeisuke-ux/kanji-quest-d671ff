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
  // レベル20/50/99の姿で使う「格が上がった」パーツ（第57回）
  | 'aura'
  | 'orbit'
  | 'bigWings'
  | 'cape'
  | 'mane'
  | 'flame'
  | 'thunder'
  | 'gem'

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
      { name: 'アラフデ', desc: 'ふとい せんを ばさりと ひく あばれんぼう。', look: { body: 'square', c1: '#5f4a3a', c2: '#efdcc0', eyes: 'happy', mouth: 'w', extras: ['brushTuft', 'scarf', 'cape'] } },
      { name: 'スズリノヌシ', desc: 'すずりの 海に すみ、すみを ねかせて まつ。', look: { body: 'mountain', c1: '#3b3540', c2: '#b9a888', eyes: 'sleepy', mouth: 'smile', extras: ['brushTuft', 'inkDrop', 'mane', 'gem', 'aura'] } },
      { name: 'アマツフデ', desc: '天から おりてきて、大空に じを かくという。', look: { body: 'star', c1: '#f4e3c4', c2: '#d8b45a', eyes: 'sleepy', mouth: 'open', extras: ['brushTuft', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'ハネズミ', desc: 'はねた しずくが つばさに なった。', look: { body: 'tear', c1: '#2f2f40', c2: '#7bb0d8', eyes: 'big', mouth: 'open', extras: ['inkDrop', 'wings', 'stripeBand'] } },
      { name: 'ヨルカキ', desc: 'よるの あいだに ものがたりを かきためる。', look: { body: 'cloud', c1: '#1f1f2c', c2: '#6f6fa0', eyes: 'dot', mouth: 'smile', extras: ['inkDrop', 'aura', 'mane', 'gem'] } },
      { name: 'スミノリュウセイ', desc: 'ひとすじの すみが よぞらを かける ながれぼしに なった。', look: { body: 'star', c1: '#4a4a6e', c2: '#cfd6ff', eyes: 'dot', mouth: 'open', extras: ['inkDrop', 'orbit', 'thunder', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'オリガミムシャ', desc: 'じぶんで じぶんを おりたたんで よろいに した。', look: { body: 'square', c1: '#e8e2d2', c2: '#b03a3a', eyes: 'happy', mouth: 'w', extras: ['foldCorner', 'horns', 'cape'] } },
      { name: 'センバヅル', desc: 'せんばの つるが ひとつに なった すがた。', look: { body: 'cloud', c1: '#ffffff', c2: '#d05a5a', eyes: 'sleepy', mouth: 'smile', extras: ['wings', 'bigWings', 'mane', 'gem'] } },
      { name: 'シラガミノオオトリ', desc: 'まっしろな つばさに、まだ だれも 読んでいない はなしが ある。', look: { body: 'star', c1: '#fff8ee', c2: '#e2b23c', eyes: 'star', mouth: 'open', extras: ['bigWings', 'orbit', 'rays', 'gem', 'sparkle'] } },
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
      { name: 'ケシツブテ', desc: 'まちがいに むかって とんでいく まるい つぶて。', look: { body: 'round', c1: '#c96a86', c2: '#ffe9f0', eyes: 'big', mouth: 'w', extras: ['stripeBand', 'rockBumps', 'cape'] } },
      { name: 'マッサラ', desc: 'さわった ものを まっしろに もどしてしまう。', look: { body: 'cloud', c1: '#f6e9ee', c2: '#d886a0', eyes: 'happy', mouth: 'smile', extras: ['stripeBand', 'aura', 'gem', 'wings'] } },
      { name: 'ハクシノカミ', desc: 'なんども やりなおせる、という ことを おしえに くる。', look: { body: 'star', c1: '#ffffff', c2: '#f0a8bf', eyes: 'happy', mouth: 'smile', extras: ['orbit', 'rays', 'gem', 'mane', 'sparkle'] } },
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
      { name: 'マスジュウジ', desc: 'たてよこの せんが つのに なった。', look: { body: 'square', c1: '#e6d4a0', c2: '#7c2626', eyes: 'dot', mouth: 'w', extras: ['gridLines', 'horns', 'cape'] } },
      { name: 'バンジョウ', desc: 'ばんの上で じの ゆがみを ひとつも ゆるさない。', look: { body: 'mountain', c1: '#d9c48a', c2: '#5f1d1d', eyes: 'sleepy', mouth: 'smile', extras: ['gridLines', 'mane', 'gem', 'rockBumps'] } },
      { name: 'センマスノジン', desc: '千の マスが そらに ならび、じが ととのっていく。', look: { body: 'star', c1: '#fff3cf', c2: '#c94f4f', eyes: 'dot', mouth: 'open', extras: ['gridLines', 'orbit', 'thunder', 'bigWings', 'gem'] } },
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
      { name: 'エダヅノ', desc: 'えだが つのに なり、小さな みどりを のせている。', look: { body: 'mountain', c1: '#3f7a3a', c2: '#6b4a33', eyes: 'big', mouth: 'open', extras: ['branch', 'horns', 'leaf'] } },
      { name: 'センネンジュ', desc: '千年 生きた 木。とりも むしも ここで やすむ。', look: { body: 'tall', c1: '#2f5f2c', c2: '#8fbf5a', eyes: 'sleepy', mouth: 'smile', extras: ['branch', 'leaf', 'mane', 'gem'] } },
      { name: 'モリノオオヌシ', desc: 'もりの ぜんぶと こころで はなす。あるくと 木が はえる。', look: { body: 'cloud', c1: '#6fc06a', c2: '#ffe08a', eyes: 'sleepy', mouth: 'smile', extras: ['branch', 'leaf', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'イワオヤマ', desc: 'いわを せおって どんどん 高く なっていく。', look: { body: 'mountain', c1: '#4a6d43', c2: '#cfd8e2', eyes: 'dot', mouth: 'w', extras: ['snowCap', 'rockBumps', 'cape'] } },
      { name: 'レイホウ', desc: 'だれも のぼれない、けれど みんなが 見あげる やま。', look: { body: 'mountain', c1: '#38553a', c2: '#ffffff', eyes: 'sleepy', mouth: 'smile', extras: ['snowCap', 'aura', 'gem', 'rays'] } },
      { name: 'テンクウザン', desc: 'くもの 上に うかんでいる やま。いただきは だれも 見たことがない。', look: { body: 'cloud', c1: '#7fb08a', c2: '#e9f6ff', eyes: 'sleepy', mouth: 'open', extras: ['snowCap', 'orbit', 'bigWings', 'gem', 'starHalo', 'sparkle'] } },
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
      { name: 'タキノボリ', desc: 'たきを さかのぼる ちからを てにいれた。', look: { body: 'tear', c1: '#3a7ba0', c2: '#dff2fb', eyes: 'big', mouth: 'open', extras: ['tail', 'horns', 'windCheeks'] } },
      { name: 'ミナモノヌシ', desc: 'みなもに うつる ものの 気もちが わかる。', look: { body: 'cloud', c1: '#2d6a8f', c2: '#9fe0ff', eyes: 'happy', mouth: 'smile', extras: ['tail', 'aura', 'gem', 'mane'] } },
      { name: 'オオカワノリュウ', desc: '山から うみまで、ひとつづきの みずに なった。', look: { body: 'star', c1: '#6fc6f0', c2: '#ffffff', eyes: 'star', mouth: 'open', extras: ['tail', 'orbit', 'bigWings', 'gem', 'rays', 'sparkle'] } },
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
      { name: 'ヒノコマ', desc: 'ほのおの たてがみを ゆらして かけていく。', look: { body: 'star', c1: '#d97516', c2: '#ffd98f', eyes: 'big', mouth: 'open', extras: ['rays', 'horns', 'flame'] } },
      { name: 'ヒノミヤコ', desc: 'この こが いる ところは、いつも あたたかい。', look: { body: 'round', c1: '#c96208', c2: '#ffe6b0', eyes: 'star', mouth: 'smile', extras: ['rays', 'flame', 'mane', 'gem'] } },
      { name: 'オオヒルメ', desc: 'あさが くるのは、この こが 目を さますから だという。', look: { body: 'star', c1: '#ffcf5c', c2: '#fff4d0', eyes: 'star', mouth: 'smile', extras: ['rays', 'orbit', 'flame', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'ヨイヅキ', desc: 'ゆうがたの そらに そっと あらわれる。', look: { body: 'tear', c1: '#e6d066', c2: '#fffbe6', eyes: 'sleepy', mouth: 'smile', extras: ['crescent', 'cape', 'starHalo'] } },
      { name: 'ツキヨミ', desc: 'しおの みちひきを、ゆびさき ひとつで うごかす。', look: { body: 'tall', c1: '#cbb64f', c2: '#fff9dd', eyes: 'star', mouth: 'w', extras: ['crescent', 'aura', 'gem', 'mane'] } },
      { name: 'ヨルノオオキミ', desc: 'よるが しずかなのは、この こが 見はっているから。', look: { body: 'star', c1: '#fff3a8', c2: '#ffffff', eyes: 'sleepy', mouth: 'smile', extras: ['crescent', 'orbit', 'starHalo', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'ナガレボシ', desc: 'ねがいを のせて いっきに かけぬける。', look: { body: 'tear', c1: '#d9a628', c2: '#fff8dd', eyes: 'big', mouth: 'open', extras: ['starHalo', 'wings', 'thunder'] } },
      { name: 'セイザヅカイ', desc: 'ほしを つないで えを かく あそびが とくい。', look: { body: 'round', c1: '#c69820', c2: '#ffeeb0', eyes: 'star', mouth: 'smile', extras: ['starHalo', 'aura', 'gem', 'cape'] } },
      { name: 'ギンガノハタオリ', desc: 'ぎんがは この こが おった ぬのだと いわれている。', look: { body: 'star', c1: '#ffe98a', c2: '#ffffff', eyes: 'star', mouth: 'open', extras: ['starHalo', 'orbit', 'bigWings', 'gem', 'rays', 'sparkle'] } },
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
      { name: 'ツムジ', desc: 'ぐるぐる まわりながら はっぱを まきあげる。', look: { body: 'tear', c1: '#8ec4b4', c2: '#4f9686', eyes: 'happy', mouth: 'w', extras: ['windCheeks', 'wings', 'cape'] } },
      { name: 'ノワキノヌシ', desc: 'あきの あらしを つれてくる。おこると こわい。', look: { body: 'cloud', c1: '#6fae9c', c2: '#d6f5ec', eyes: 'star', mouth: 'smile', extras: ['windCheeks', 'bigWings', 'gem', 'aura'] } },
      { name: 'ソラカケル', desc: 'かたちが ない。けれど そらじゅうに いる。', look: { body: 'star', c1: '#b9f0e0', c2: '#ffffff', eyes: 'happy', mouth: 'open', extras: ['windCheeks', 'orbit', 'bigWings', 'gem', 'thunder', 'sparkle'] } },
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
      { name: 'イワモノノフ', desc: 'われても われても 立ちあがる。', look: { body: 'square', c1: '#6a6560', c2: '#3d3935', eyes: 'dot', mouth: 'w', extras: ['rockBumps', 'horns', 'cape'] } },
      { name: 'オオイワグラ', desc: 'むかしから ここに ある。うごいた ことは 一どもない。', look: { body: 'mountain', c1: '#55504b', c2: '#9a9188', eyes: 'sleepy', mouth: 'smile', extras: ['rockBumps', 'mane', 'gem', 'aura'] } },
      { name: 'ダイチノホネ', desc: '大地を ささえている ほねの ひとつだと いわれる。', look: { body: 'mountain', c1: '#b0a79c', c2: '#ffe08a', eyes: 'dot', mouth: 'smile', extras: ['rockBumps', 'orbit', 'thunder', 'bigWings', 'gem'] } },
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
      { name: 'フブキマル', desc: 'まるまって ころがると ふぶきに なる。', look: { body: 'round', c1: '#c6e2f4', c2: '#7fb0d2', eyes: 'big', mouth: 'open', extras: ['snowCap', 'scarf', 'cape'] } },
      { name: 'ユキノマイヒメ', desc: 'まうと、けっしょうが ひとつずつ ちがう かたちに なる。', look: { body: 'tall', c1: '#e8f4ff', c2: '#9cc4e0', eyes: 'happy', mouth: 'smile', extras: ['snowCap', 'bigWings', 'gem', 'sparkle'] } },
      { name: 'シラユキノリュウ', desc: 'ふゆの はじめに 空を わたる、まっしろな りゅう。', look: { body: 'star', c1: '#ffffff', c2: '#a8dcff', eyes: 'star', mouth: 'open', extras: ['snowCap', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'アメアガリ', desc: 'あめが やんだ しゅんかんだけ あらわれる。', look: { body: 'cloud', c1: '#eaf6ff', c2: '#c0e2ff', eyes: 'happy', mouth: 'w', extras: ['rainbow', 'windCheeks', 'cape'] } },
      { name: 'ナナイロヒメ', desc: 'そらに 七つの いろを ぬりわける。', look: { body: 'tall', c1: '#ffffff', c2: '#ffc6e0', eyes: 'star', mouth: 'smile', extras: ['rainbow', 'bigWings', 'gem', 'aura'] } },
      { name: 'オーロラノカンムリ', desc: 'きたの そらに かかる ひかりの かんむり。', look: { body: 'star', c1: '#f0fbff', c2: '#9be8d0', eyes: 'happy', mouth: 'open', extras: ['rainbow', 'orbit', 'starHalo', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'クモガクレ', desc: 'くもの 中に かくれて、しっぽだけ 見える。', look: { body: 'cloud', c1: '#d9b23f', c2: '#f7ecc4', eyes: 'dot', mouth: 'w', extras: ['horns', 'wings', 'windCheeks'] } },
      { name: 'アマゴイノリュウ', desc: 'よばれると あめを つれてくる。畑の みかた。', look: { body: 'tall', c1: '#c9a02c', c2: '#fdf0c0', eyes: 'star', mouth: 'smile', extras: ['horns', 'bigWings', 'gem', 'thunder'] } },
      { name: 'テンショウリュウ', desc: '天へ のぼった すがた。うろこ 一まいが 日の光。', look: { body: 'star', c1: '#ffe07a', c2: '#fffbe8', eyes: 'star', mouth: 'open', extras: ['horns', 'orbit', 'bigWings', 'gem', 'rays', 'flame', 'sparkle'] } },
    ],
  },
  // ============================================================
  // 第25回で追加（+14系列42形態。ぶんぼうぐ6・しぜん5・でんせつ3）
  // ============================================================
  {
    id: 'enpitsupo',
    rarity: 'common',
    lineName: 'えんぴつのせいれい',
    stages: [
      { name: 'エンピツポ', desc: 'けずりたての えんぴつから うまれた こ。', look: { body: 'tall', c1: '#e8b04a', c2: '#f7dfae', eyes: 'dot', mouth: 'smile', blush: true, extras: ['stripeBand'] } },
      { name: 'エンピツン', desc: 'しんが おれても すぐ げんきに なる。', look: { body: 'tall', c1: '#d99f39', c2: '#f7dfae', eyes: 'big', mouth: 'open', blush: true, extras: ['stripeBand', 'scarf'] } },
      { name: 'エンピツハカセ', desc: 'なんでも かきとめる ものしり はかせ。', look: { body: 'tall', c1: '#c78f2e', c2: '#fdf0d0', eyes: 'sleepy', mouth: 'smile', extras: ['stripeBand', 'crown', 'sparkle'] } },
      { name: 'トガリボウ', desc: 'しんを とがらせすぎて、ちょっと あぶない。', look: { body: 'tall', c1: '#a8761f', c2: '#fdf0d0', eyes: 'big', mouth: 'w', extras: ['stripeBand', 'horns', 'cape'] } },
      { name: 'ヒトフデノシ', desc: 'ひとふでで まるを かく。しかも まんまるに なる。', look: { body: 'square', c1: '#8e6318', c2: '#ffe9b8', eyes: 'sleepy', mouth: 'smile', extras: ['stripeBand', 'mane', 'gem', 'gridLines'] } },
      { name: 'ハジマリノイチガク', desc: 'せかいで さいしょの 一かくを かいた、と つたわる。', look: { body: 'star', c1: '#f3d189', c2: '#fff6dd', eyes: 'big', mouth: 'open', extras: ['stripeBand', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
    ],
  },
  {
    id: 'hasamin',
    rarity: 'common',
    lineName: 'はさみのせいれい',
    stages: [
      { name: 'ハサミン', desc: 'ちょきちょき おとで あいさつする こ。', look: { body: 'square', c1: '#b9c2cc', c2: '#e06a6a', eyes: 'dot', mouth: 'w', extras: ['stripeBand'] } },
      { name: 'チョキリン', desc: 'まっすぐも ギザギザも じょうずに きれる。', look: { body: 'tall', c1: '#a7b1bd', c2: '#d95f5f', eyes: 'happy', mouth: 'open', extras: ['stripeBand', 'sparkle'] } },
      { name: 'チョキオー', desc: 'かみひこうきの はねも ととのえる はさみの おう。', look: { body: 'tall', c1: '#96a2b0', c2: '#c94f4f', eyes: 'star', mouth: 'smile', extras: ['stripeBand', 'crown', 'sparkle'] } },
      { name: 'ハガネバサミ', desc: 'はがねの 刃に なった。かたい かみも すぱり。', look: { body: 'square', c1: '#7f8a98', c2: '#b03a3a', eyes: 'dot', mouth: 'w', extras: ['stripeBand', 'horns', 'cape'] } },
      { name: 'キリヒラキ', desc: 'まよいごと まとめて きりひらいてくれる。', look: { body: 'tall', c1: '#6a7482', c2: '#d05a5a', eyes: 'star', mouth: 'smile', extras: ['stripeBand', 'bigWings', 'gem', 'aura'] } },
      { name: 'カゼキリノヤイバ', desc: 'かぜを きって とぶ。あとには まっすぐな 道が のこる。', look: { body: 'tall', c1: '#c6d2e0', c2: '#ff8a8a', eyes: 'dot', mouth: 'open', extras: ['stripeBand', 'orbit', 'thunder', 'bigWings', 'gem'] } },
    ],
  },
  {
    id: 'norippe',
    rarity: 'common',
    lineName: 'のりのせいれい',
    stages: [
      { name: 'ノリッペ', desc: 'ぺたぺた くっつくのが だいすきな こ。', look: { body: 'round', c1: '#f4f4ef', c2: '#8fc7ec', eyes: 'dot', mouth: 'smile', blush: true, extras: ['inkDrop'] } },
      { name: 'ペタリン', desc: 'はがれた こうさくを そっと なおしてくれる。', look: { body: 'round', c1: '#ecece4', c2: '#6fb5d8', eyes: 'happy', mouth: 'open', blush: true, extras: ['inkDrop', 'scarf'] } },
      { name: 'ペッタンオー', desc: 'どんな ものも くっつける のりの おうさま。', look: { body: 'cloud', c1: '#e4e4da', c2: '#5aa3c9', eyes: 'star', mouth: 'smile', extras: ['inkDrop', 'crown', 'sparkle'] } },
      { name: 'ペタリボウズ', desc: 'くっついたら まず はなれない。', look: { body: 'round', c1: '#d5d5c8', c2: '#4a90b8', eyes: 'happy', mouth: 'w', extras: ['inkDrop', 'scarf', 'cape'] } },
      { name: 'ツナギテ', desc: 'ちぎれた ものを、もとより じょうぶに つなぐ。', look: { body: 'square', c1: '#c4c4b6', c2: '#3a80a8', eyes: 'big', mouth: 'smile', extras: ['inkDrop', 'mane', 'gem', 'aura'] } },
      { name: 'ムスビノカミ', desc: '人と 人の あいだも つないでしまうらしい。', look: { body: 'star', c1: '#f2f2e6', c2: '#7fd0f0', eyes: 'happy', mouth: 'smile', extras: ['inkDrop', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
    ],
  },
  {
    id: 'jougin',
    rarity: 'common',
    lineName: 'じょうぎのせいれい',
    stages: [
      { name: 'ジョウギン', desc: 'まっすぐな せんが だいすきな まじめな こ。', look: { body: 'tall', c1: '#9fd0e8', c2: '#4b93bb', eyes: 'dot', mouth: 'smile', extras: ['gridLines'] } },
      { name: 'メモリン', desc: 'ながさを ぴたりと あてる めもりの たつじん。', look: { body: 'tall', c1: '#8cc3de', c2: '#3f84ab', eyes: 'big', mouth: 'open', extras: ['gridLines', 'sparkle'] } },
      { name: 'メジャーオー', desc: 'せかいの おおきさを はかりつくした じょうぎの おう。', look: { body: 'tall', c1: '#79b6d3', c2: '#33769c', eyes: 'sleepy', mouth: 'smile', extras: ['gridLines', 'crown', 'sparkle'] } },
      { name: 'マッスグマル', desc: 'どこを 見ても まっすぐ。まがるのが にがて。', look: { body: 'square', c1: '#5f9fc0', c2: '#2a6a90', eyes: 'dot', mouth: 'w', extras: ['gridLines', 'horns', 'cape'] } },
      { name: 'ハカリノテ', desc: '見ただけで ながさが わかる。ずれも 見のがさない。', look: { body: 'tall', c1: '#4a8cb0', c2: '#bfe4f5', eyes: 'sleepy', mouth: 'smile', extras: ['gridLines', 'mane', 'gem', 'aura'] } },
      { name: 'テンチノモノサシ', desc: '空の 高さも うみの ふかさも これで はかったという。', look: { body: 'tall', c1: '#a8dcf5', c2: '#ffffff', eyes: 'dot', mouth: 'open', extras: ['gridLines', 'orbit', 'thunder', 'bigWings', 'gem'] } },
    ],
  },
  {
    id: 'kureyopo',
    rarity: 'common',
    lineName: 'クレヨンのせいれい',
    stages: [
      { name: 'クレヨポ', desc: 'あかい クレヨンから うまれた げんきな こ。', look: { body: 'tall', c1: '#e06a6a', c2: '#f7c9c9', eyes: 'dot', mouth: 'open', blush: true, extras: ['stripeBand'] } },
      { name: 'クレリン', desc: 'ぬりえを はみださず ぬれるように なった。', look: { body: 'tall', c1: '#d95f5f', c2: '#f7c9c9', eyes: 'happy', mouth: 'smile', blush: true, extras: ['stripeBand', 'sparkle'] } },
      { name: 'クレヨンキング', desc: 'いろんな いろを つかいこなす おえかきの おう。', look: { body: 'tall', c1: '#c94f4f', c2: '#fde3ae', eyes: 'star', mouth: 'open', extras: ['stripeBand', 'crown', 'sparkle'] } },
      { name: 'イロヌリマル', desc: 'ころがった あとが ぜんぶ にじいろに なる。', look: { body: 'round', c1: '#b03a3a', c2: '#ffd9a0', eyes: 'big', mouth: 'open', extras: ['stripeBand', 'rainbow', 'cape'] } },
      { name: 'ニジヌリシ', desc: '見た ものと おなじ いろを かならず 出せる。', look: { body: 'cloud', c1: '#9c2f2f', c2: '#ffe0b8', eyes: 'happy', mouth: 'smile', extras: ['stripeBand', 'rainbow', 'mane', 'gem'] } },
      { name: 'イロノハジマリ', desc: 'せかいが しろかった ころ、さいしょに いろを おいた。', look: { body: 'star', c1: '#ff8f6a', c2: '#fff0d0', eyes: 'happy', mouth: 'open', extras: ['rainbow', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
    ],
  },
  {
    id: 'fusenpo',
    rarity: 'common',
    lineName: 'ふせんのせいれい',
    stages: [
      { name: 'フセンポ', desc: 'だいじな ページに ぺたっと とまる こ。', look: { body: 'square', c1: '#f7e26e', c2: '#f2b7c6', eyes: 'dot', mouth: 'smile', blush: true, extras: ['foldCorner'] } },
      { name: 'フセリン', desc: 'わすれものを おもいださせて くれる。', look: { body: 'square', c1: '#f4da55', c2: '#e79cb1', eyes: 'happy', mouth: 'open', extras: ['foldCorner', 'sparkle'] } },
      { name: 'フセンダイオー', desc: 'せかいじゅうの だいじを しるしている おうさま。', look: { body: 'square', c1: '#eecf3d', c2: '#d886a0', eyes: 'star', mouth: 'smile', extras: ['foldCorner', 'crown', 'sparkle'] } },
      { name: 'シオリバネ', desc: 'たいせつな ページに とんでいって とまる。', look: { body: 'tear', c1: '#d8bb2c', c2: '#d886a0', eyes: 'happy', mouth: 'w', extras: ['foldCorner', 'wings', 'scarf'] } },
      { name: 'オボエガキ', desc: 'わすれそうな ことを さきに 書いておいてくれる。', look: { body: 'cloud', c1: '#c4a91f', c2: '#f0a8bf', eyes: 'big', mouth: 'smile', extras: ['foldCorner', 'bigWings', 'gem', 'aura'] } },
      { name: 'トキワスレズ', desc: 'だいじな ことは、なん年 たっても 色あせない。', look: { body: 'star', c1: '#ffe97a', c2: '#ffc0d8', eyes: 'star', mouth: 'smile', extras: ['foldCorner', 'orbit', 'starHalo', 'bigWings', 'gem', 'sparkle'] } },
    ],
  },
  {
    id: 'hanappo',
    rarity: 'rare',
    lineName: 'はなのせいれい',
    stages: [
      { name: 'ハナッポ', desc: 'はるの つぼみから ぽんと うまれた こ。', look: { body: 'round', c1: '#f2a3b8', c2: '#fbe3e9', eyes: 'dot', mouth: 'smile', blush: true, extras: ['leaf'] } },
      { name: 'ハナリン', desc: 'あまい かおりで ちょうちょを よぶ。', look: { body: 'round', c1: '#ee92aa', c2: '#fbe3e9', eyes: 'happy', mouth: 'open', blush: true, extras: ['leaf', 'sparkle'] } },
      { name: 'オハナオー', desc: 'のはらいちめんに はなを さかせる おうさま。', look: { body: 'round', c1: '#e87f9b', c2: '#fdf0f4', eyes: 'star', mouth: 'smile', extras: ['leaf', 'crown', 'starHalo'] } },
      { name: 'ツボミヒメ', desc: 'まだ ひらかない。でも いい においが する。', look: { body: 'tear', c1: '#d96a88', c2: '#ffe0ea', eyes: 'happy', mouth: 'w', extras: ['leaf', 'cape', 'sparkle'] } },
      { name: 'マンカイノマイ', desc: 'まうたびに、まわりの つぼみが ひらいていく。', look: { body: 'cloud', c1: '#e87f9b', c2: '#fff0f4', eyes: 'star', mouth: 'smile', extras: ['leaf', 'bigWings', 'gem', 'aura'] } },
      { name: 'ハルヲヨブモノ', desc: 'この こが とおった 道から、はるが はじまる。', look: { body: 'star', c1: '#ffb0c8', c2: '#fff6f9', eyes: 'happy', mouth: 'open', extras: ['leaf', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
    ],
  },
  {
    id: 'umippo',
    rarity: 'rare',
    lineName: 'うみのせいれい',
    stages: [
      { name: 'ウミッポ', desc: 'なみうちぎわで ぱしゃんと うまれた こ。', look: { body: 'tear', c1: '#4f9fd8', c2: '#d2ecfb', eyes: 'dot', mouth: 'smile', blush: true, extras: [] } },
      { name: 'ナミリン', desc: 'おおきな なみに のって サーフィンする。', look: { body: 'tear', c1: '#428fc9', c2: '#c2e4f8', eyes: 'big', mouth: 'open', extras: ['tail', 'windCheeks'] } },
      { name: 'ウナバラオー', desc: 'ひろい うみを ぜんぶ しっている おうさま。', look: { body: 'cloud', c1: '#357fb8', c2: '#dff2fb', eyes: 'star', mouth: 'smile', extras: ['tail', 'crown', 'sparkle'] } },
      { name: 'オオナミマル', desc: 'せなかに 大きな なみを のせて およぐ。', look: { body: 'tear', c1: '#2a6f9f', c2: '#cfe9f8', eyes: 'big', mouth: 'open', extras: ['tail', 'windCheeks', 'cape'] } },
      { name: 'フカミノヌシ', desc: 'ひかりの とどかない ふかさで しずかに ねむる。', look: { body: 'mountain', c1: '#1f5a85', c2: '#7fc8ea', eyes: 'sleepy', mouth: 'smile', extras: ['tail', 'mane', 'gem', 'aura'] } },
      { name: 'ワダツミ', desc: '七つの うみは、この こが 見ている ゆめだという。', look: { body: 'cloud', c1: '#5fb8e0', c2: '#ffffff', eyes: 'sleepy', mouth: 'open', extras: ['tail', 'orbit', 'thunder', 'bigWings', 'gem', 'sparkle'] } },
    ],
  },
  {
    id: 'kumorin',
    rarity: 'rare',
    lineName: 'くものせいれい',
    stages: [
      { name: 'クモリン', desc: 'ひつじみたいに ふわふわの くもの こ。', look: { body: 'cloud', c1: '#f2f5f7', c2: '#cdd8e0', eyes: 'dot', mouth: 'smile', blush: true, extras: [] } },
      { name: 'モクモクン', desc: 'もくもく ふくらんで おおきく なった。', look: { body: 'cloud', c1: '#e8edf1', c2: '#bccad4', eyes: 'happy', mouth: 'open', extras: ['windCheeks'] } },
      { name: 'ニュウドウオー', desc: 'なつの そらに そびえる くもの おうさま。', look: { body: 'cloud', c1: '#dde5ea', c2: '#a9bac6', eyes: 'sleepy', mouth: 'smile', extras: ['windCheeks', 'crown', 'sparkle'] } },
      { name: 'アマグモ', desc: 'おなかが いっぱいに なると あめを ふらせる。', look: { body: 'cloud', c1: '#c8d4dc', c2: '#8fa5b4', eyes: 'sleepy', mouth: 'w', extras: ['windCheeks', 'thunder', 'cape'] } },
      { name: 'ニュウドウノセイ', desc: 'なつの ひるさがり、むくむくと そらに そびえる。', look: { body: 'mountain', c1: '#b0c0cc', c2: '#6f8898', eyes: 'big', mouth: 'smile', extras: ['windCheeks', 'mane', 'gem', 'aura'] } },
      { name: 'ソラヲオオウモノ', desc: 'はしから はしまで、そらぜんぶが この こ。', look: { body: 'cloud', c1: '#eaf2f8', c2: '#b0d8f0', eyes: 'sleepy', mouth: 'smile', extras: ['windCheeks', 'orbit', 'thunder', 'bigWings', 'gem', 'rays'] } },
    ],
  },
  {
    id: 'kaminarin',
    rarity: 'rare',
    lineName: 'かみなりのせいれい',
    stages: [
      { name: 'カミナリン', desc: 'ゴロゴロ おなかを ならす げんきな こ。', look: { body: 'star', c1: '#ffd23f', c2: '#8a76d8', eyes: 'dot', mouth: 'w', extras: ['horns'] } },
      { name: 'ゴロゴロン', desc: 'くもの うえで たいこの れんしゅうを する。', look: { body: 'star', c1: '#f7c62e', c2: '#7a66c8', eyes: 'big', mouth: 'open', extras: ['horns', 'rays'] } },
      { name: 'ライジンオー', desc: 'そらに いなずまを はしらせる かみなりの おう。', look: { body: 'star', c1: '#eeb91e', c2: '#6a56b8', eyes: 'star', mouth: 'open', extras: ['horns', 'rays', 'crown', 'sparkle'] } },
      { name: 'イカヅチマル', desc: 'つのの あいだで いなずまが ぱちぱち はねる。', look: { body: 'round', c1: '#d8a418', c2: '#5a48a0', eyes: 'big', mouth: 'open', extras: ['horns', 'thunder', 'cape'] } },
      { name: 'ナルカミ', desc: 'とおくで ごろごろ いうのは、この こが わらっているから。', look: { body: 'tall', c1: '#c29310', c2: '#7d68d0', eyes: 'star', mouth: 'w', extras: ['horns', 'thunder', 'mane', 'gem'] } },
      { name: 'アメノライジン', desc: 'たいこを ならすと、そらが まっしろに ひかる。', look: { body: 'star', c1: '#ffe25c', c2: '#b9a8ff', eyes: 'star', mouth: 'open', extras: ['horns', 'orbit', 'thunder', 'bigWings', 'gem', 'rays', 'sparkle'] } },
    ],
  },
  {
    id: 'hotarupo',
    rarity: 'rare',
    lineName: 'ほたるのせいれい',
    stages: [
      { name: 'ホタルポ', desc: 'よるの かわべで ぽうっと ひかる こ。', look: { body: 'round', c1: '#4a5870', c2: '#d8f77a', eyes: 'dot', mouth: 'smile', blush: true, extras: ['sparkle'] } },
      { name: 'ヒカリン', desc: 'なかまと あいずを おくりあって ひかる。', look: { body: 'round', c1: '#3d4a5c', c2: '#cdee6a', eyes: 'happy', mouth: 'open', extras: ['sparkle', 'wings'] } },
      { name: 'ホタルビオー', desc: 'なつの よるを いちばん きれいに てらす おう。', look: { body: 'round', c1: '#333f52', c2: '#e2ff8a', eyes: 'star', mouth: 'smile', extras: ['sparkle', 'wings', 'crown', 'starHalo'] } },
      { name: 'ヨルノトモシビ', desc: 'まいごに なった こを、ひかりで 家まで おくる。', look: { body: 'tear', c1: '#2c3648', c2: '#d8f77a', eyes: 'happy', mouth: 'w', extras: ['sparkle', 'wings', 'cape'] } },
      { name: 'ヒカリアツメ', desc: 'なかまの ひかりを あつめて、ひとつの 大きな ひに する。', look: { body: 'cloud', c1: '#232c3c', c2: '#e2ff8a', eyes: 'star', mouth: 'smile', extras: ['sparkle', 'bigWings', 'gem', 'aura'] } },
      { name: 'センマンノホタルビ', desc: 'なつの ひとばんだけ、川が ひかりで うまるという。', look: { body: 'star', c1: '#4a5a72', c2: '#eaffb0', eyes: 'star', mouth: 'open', extras: ['sparkle', 'orbit', 'starHalo', 'bigWings', 'gem'] } },
    ],
  },
  {
    id: 'tokein',
    rarity: 'epic',
    lineName: 'とけいのせいれい',
    stages: [
      { name: 'トケイン', desc: 'チクタクと じかんを きざむ ふしぎな こ。', look: { body: 'round', c1: '#fdfdf5', c2: '#c94f4f', eyes: 'dot', mouth: 'smile', extras: ['gridLines'] } },
      { name: 'チクタクオー', desc: 'じかんを たいせつに する こに ちからを くれる。', look: { body: 'round', c1: '#faf8ea', c2: '#b04343', eyes: 'big', mouth: 'smile', extras: ['gridLines', 'crown', 'sparkle'] } },
      { name: 'トキノオーサマ', desc: 'ながれる じかんを みまもる でんせつの せいれい。', look: { body: 'round', c1: '#f7f4de', c2: '#9c3535', eyes: 'star', mouth: 'smile', extras: ['gridLines', 'crown', 'starHalo', 'wings'] } },
      { name: 'トキノモノノフ', desc: 'はりを かたなの ように かまえている。', look: { body: 'square', c1: '#e8e2cc', c2: '#8c2f2f', eyes: 'dot', mouth: 'w', extras: ['gridLines', 'horns', 'cape'] } },
      { name: 'スナドケイノヌシ', desc: 'さかさに すると、きのうを 少しだけ 見せてくれる。', look: { body: 'tear', c1: '#dbd4bb', c2: '#7a2828', eyes: 'sleepy', mouth: 'smile', extras: ['gridLines', 'mane', 'gem', 'aura'] } },
      { name: 'エイエンノハリ', desc: 'はじまりから いままで、一どだけ とまった ことが ある。', look: { body: 'round', c1: '#fffbe8', c2: '#e07a7a', eyes: 'sleepy', mouth: 'open', extras: ['gridLines', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
    ],
  },
  {
    id: 'koorin',
    rarity: 'epic',
    lineName: 'こおりのせいれい',
    stages: [
      { name: 'コオリポ', desc: 'こおりの けっしょうから うまれた すきとおる こ。', look: { body: 'tear', c1: '#cfeafc', c2: '#8fc7ec', eyes: 'dot', mouth: 'smile', blush: true, extras: ['snowCap'] } },
      { name: 'ツラランオー', desc: 'つららの けんを もつ こおりの きし。', look: { body: 'tear', c1: '#bfe1f9', c2: '#79b6e0', eyes: 'sleepy', mouth: 'smile', extras: ['snowCap', 'sparkle', 'crown'] } },
      { name: 'ヒョウガオー', desc: 'なんまんねんの こおりを おさめる でんせつの おう。', look: { body: 'mountain', c1: '#aed6f4', c2: '#e8f5ff', eyes: 'star', mouth: 'smile', extras: ['snowCap', 'starHalo', 'crown', 'sparkle'] } },
      { name: 'ツララノキシ', desc: 'つららの けんを 二本 かまえる。', look: { body: 'tall', c1: '#9cc8e8', c2: '#eaf6ff', eyes: 'big', mouth: 'w', extras: ['snowCap', 'horns', 'cape'] } },
      { name: 'コオリノシロ', desc: 'いきを はくだけで、みずうみに 城が たつ。', look: { body: 'square', c1: '#86b8de', c2: '#ffffff', eyes: 'star', mouth: 'smile', extras: ['snowCap', 'mane', 'gem', 'aura'] } },
      { name: 'マンネンヒョウ', desc: 'なんまんねんも とけない こおり。中に 空が うつっている。', look: { body: 'mountain', c1: '#d0eaff', c2: '#ffffff', eyes: 'star', mouth: 'open', extras: ['snowCap', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
    ],
  },
  {
    id: 'mahopen',
    rarity: 'epic',
    lineName: 'まほうのペンのせいれい',
    stages: [
      { name: 'マホペポ', desc: 'かいた ものが うごきだす ふしぎな ペンの こ。', look: { body: 'tall', c1: '#7d6ae0', c2: '#f3e9ff', eyes: 'big', mouth: 'w', blush: true, extras: ['brushTuft'] } },
      { name: 'マホペリン', desc: 'ほしぞらに じを かける ように なった。', look: { body: 'tall', c1: '#6c59d0', c2: '#eadcff', eyes: 'star', mouth: 'open', extras: ['brushTuft', 'sparkle', 'wings'] } },
      { name: 'ペンデンセツ', desc: 'ゆめを げんじつに かきかえる でんせつの ペン。', look: { body: 'tall', c1: '#5b48c0', c2: '#f6efff', eyes: 'star', mouth: 'smile', extras: ['brushTuft', 'sparkle', 'wings', 'crown', 'rays'] } },
      { name: 'ユメガキ', desc: 'ねている あいだに、ゆめの つづきを かいてくれる。', look: { body: 'tear', c1: '#6a56c8', c2: '#f0e6ff', eyes: 'happy', mouth: 'w', extras: ['brushTuft', 'sparkle', 'cape'] } },
      { name: 'ホシヨミノペン', desc: 'よぞらを 読んで、これから おきる ことを 書く。', look: { body: 'cloud', c1: '#5a46b8', c2: '#e0d0ff', eyes: 'star', mouth: 'smile', extras: ['brushTuft', 'bigWings', 'gem', 'aura'] } },
      { name: 'セカイヲカクモノ', desc: 'この こが 書くのを やめたら、せかいは どうなるのだろう。', look: { body: 'star', c1: '#a890ff', c2: '#fff0ff', eyes: 'star', mouth: 'open', extras: ['brushTuft', 'orbit', 'rays', 'thunder', 'bigWings', 'gem', 'sparkle'] } },
    ],
  },
]

export function getSpecies(id: string): SpeciesDef | undefined {
  return SPECIES.find((s) => s.id === id)
}

// ============================================================
// レベル＝姿のシステム（2026-08-08 第4回フィードバック）
// L1=1形態 / L2=1形態+リボン / L3=2形態 / L4=2形態+リボン / L5=3形態 / L6=3形態+金のオーラ
// 第32回: レベル上限を99に拡張。
// 第57回: レベル20/50/99でさらに姿が変わるようにした（全6形態）。
//   L5〜19=3形態 / L20〜49=4形態 / L50〜98=5形態 / L99=6形態（さいごの姿）
// ============================================================
import { GAME_CONFIG } from '../config/gameConfig'

export const MAX_LEVEL: number = GAME_CONFIG.levels.maxLevel
/** 姿・かざりが完成するレベル（第32回: レベル上限99化にともない分離。L6=最終形態+金のオーラ） */
export const FINAL_FORM_LEVEL: number = GAME_CONFIG.levels.finalFormLevel

/**
 * 姿が変わるレベル（第57回でレベル20/50/99の姿を追加）。
 * 前半（1/3/5）は「育っている手ごたえ」をすぐ出すために短く、
 * 後半（20/50/99）は長く続けた人だけが見られるごほうびにしている。
 */
export const FORM_LEVELS = [1, 3, 5, 20, 50, 99]

/** さいごの姿になるレベル */
export const LAST_FORM_LEVEL = FORM_LEVELS[FORM_LEVELS.length - 1]

/** レベル→進化形態(0-5) */
export function stageForLevel(level: number): number {
  const lv = Math.max(1, level)
  let idx = 0
  for (let i = 0; i < FORM_LEVELS.length; i++) {
    if (lv >= FORM_LEVELS[i]) idx = i
  }
  return idx
}

/** つぎに姿が変わるレベル（もう無ければ null） */
export function nextFormLevel(level: number): number | null {
  return FORM_LEVELS.find((l) => l > level) ?? null
}

/** レベル→かざりの段階（0=なし, 1=リボン, 2=金のオーラ）。FINAL_FORM_LEVEL以降は金のオーラのまま */
export function decorForLevel(level: number): number {
  if (level >= FINAL_FORM_LEVEL) return 2
  return (level - 1) % 2
}

/** レベルN→N+1に必要なスター数（最大レベルならnull。表を超えたら一定値） */
export function starsNeededFor(level: number): number | null {
  if (level >= MAX_LEVEL) return null
  return GAME_CONFIG.levels.starsPerLevel[level - 1] ?? GAME_CONFIG.levels.starsBeyondTable
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
