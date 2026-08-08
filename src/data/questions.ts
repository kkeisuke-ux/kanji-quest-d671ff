// 文脈・熟語問題バンクとQuestionProvider抽象層（仕様 §11, §12）。
// 1漢字につき5パターンの出題（読み/熟語/文の穴埋め/送り仮名/別の読み方）。
// 直近に出した問題は避けて出題する（recentVariantIdsをexcludeに渡す）。

export interface QuestionPart {
  text?: string
  /** textが漢字のときのふりがな（習っていない字でも読めるように。2026-08-08 第9回） */
  ruby?: string
  blank?: { reading: string }
}

export type QuestionKind = 'read' | 'word' | 'sentence' | 'okurigana' | 'altread'

export interface Question {
  id: string
  char: string
  kind: QuestionKind
  parts: QuestionPart[]
  /** ことばの意味（小学生向けのやさしい説明。手書き問題・マスター級で使用。第15回） */
  meaning?: string
}

function q(char: string, num: number, kind: QuestionKind, before: string, reading: string, after: string): Question {
  const parts: QuestionPart[] = []
  if (before) parts.push({ text: before })
  parts.push({ blank: { reading } })
  if (after) parts.push({ text: after })
  return { id: `${char}-${num}`, char, kind, parts }
}

// ルビ付きパーツで組む版（例文中に漢字が出るとき用）。meaningはことばの意味説明
function qp(char: string, num: number, kind: QuestionKind, parts: QuestionPart[], meaning?: string): Question {
  return { id: `${char}-${num}`, char, kind, parts, meaning }
}
const t = (text: string): QuestionPart => ({ text })
const r = (text: string, ruby: string): QuestionPart => ({ text, ruby })
const b = (reading: string): QuestionPart => ({ blank: { reading } })

export const QUESTION_BANK: Question[] = [
  // 一
  q('一', 1, 'read', 'すうじの ', 'いち', ''),
  q('一', 2, 'altread', 'りんごを ', 'ひと', 'つ たべる'),
  q('一', 3, 'word', '', 'いち', 'ねんせいに なる'),
  q('一', 4, 'sentence', 'かけっこで ', 'いち', 'ばんに なった'),
  q('一', 5, 'word', '', 'いち', 'がつの おしょうがつ'),
  // 二
  q('二', 1, 'read', 'すうじの ', 'に', ''),
  q('二', 2, 'word', 'くつしたを ', 'に', 'そく かう'),
  q('二', 3, 'word', '', 'に', 'ねんせいの おねえちゃん'),
  q('二', 4, 'altread', 'ケーキを ', 'ふた', 'つに わける'),
  q('二', 5, 'sentence', '', 'に', 'かいだての いえに すむ'),
  // 三
  q('三', 1, 'read', 'すうじの ', 'さん', ''),
  q('三', 2, 'altread', 'おだんごを ', 'みっ', 'つ たべる'),
  q('三', 3, 'sentence', '', 'さん', 'にんで きょうそうする'),
  q('三', 4, 'word', '', 'さん', 'かくの おにぎり'),
  q('三', 5, 'word', '', 'さん', 'がつの ひなまつり'),
  // 十
  q('十', 1, 'read', 'すうじの ', 'じゅう', ''),
  q('十', 2, 'sentence', '', 'じゅう', 'えんだまを ひろった'),
  q('十', 3, 'altread', '', 'とお', 'まで かぞえる'),
  q('十', 4, 'word', '', 'じゅう', 'にんの ともだち'),
  q('十', 5, 'word', '', 'じゅう', 'がつの うんどうかい'),
  // 人
  q('人', 1, 'read', '', 'ひと', 'が あるいて いる'),
  qp('人', 2, 'word', [r('三', 'さん'), b('にん'), t('で うたを うたう')]),
  q('人', 3, 'sentence', 'おとなの ', 'ひと', 'に みちを きく'),
  q('人', 4, 'altread', 'うちゅう', 'じん', 'の えを かく'),
  q('人', 5, 'word', '', 'にん', 'ぎょうで あそぶ'),
  // 大
  q('大', 1, 'okurigana', '', 'おお', 'きい こえで うたう'),
  q('大', 2, 'word', '', 'だい', 'すきな おやつ'),
  qp('大', 3, 'sentence', [b('おお'), t('きな '), r('木', 'き'), t('が ある')]),
  q('大', 4, 'word', '', 'だい', 'じな たからもの'),
  q('大', 5, 'sentence', '', 'だい', 'のじに なって ねる'),
  // 木
  q('木', 1, 'read', 'おおきな ', 'き', 'に のぼる'),
  q('木', 2, 'word', '', 'もく', 'ようびに プールへ いく'),
  q('木', 3, 'sentence', '', 'き', 'のはが ひらひら おちる'),
  q('木', 4, 'sentence', 'すずしい ','き', 'かげで やすむ'),
  q('木', 5, 'word', '', 'き', 'の つくえで べんきょうする'),
  // 本
  q('本', 1, 'read', '', 'ほん', 'を よむ'),
  q('本', 2, 'word', 'としょかんで え', 'ほん', 'を かりる'),
  qp('本', 3, 'altread', [t('えんぴつが '), r('一', 'いっ'), b('ぽん'), t('ある')]),
  qp('本', 4, 'word', [r('日', 'に'), b('ほん'), t('の ちずを みる')]),
  q('本', 5, 'sentence', '', 'ほん', 'やさんへ いく'),
  // 川
  q('川', 1, 'read', '', 'かわ', 'で さかなを とる'),
  q('川', 2, 'word', '', 'かわ', 'あそびを する'),
  q('川', 3, 'altread', 'ちいさな お', 'がわ', 'で ささぶねを ながす'),
  q('川', 4, 'word', 'あまの', 'がわ', 'を みあげる'),
  q('川', 5, 'sentence', '', 'かわ', 'に はしが かかる'),
  // 山
  q('山', 1, 'read', 'たかい ', 'やま', 'に のぼる'),
  q('山', 2, 'altread', 'ふじ', 'さん', 'に のぼって みたい'),
  q('山', 3, 'word', '', 'やま', 'みちを あるく'),
  q('山', 4, 'sentence', '', 'やま', 'の うえの おしろ'),
  q('山', 5, 'sentence', '', 'やま', 'で クワガタを さがす'),
  // 日
  q('日', 1, 'word', '', 'にち', 'ようびに こうえんへ いく'),
  q('日', 2, 'altread', 'あさ', 'ひ', 'が のぼる'),
  q('日', 3, 'word', 'たんじょう', 'び', 'の ケーキ'),
  q('日', 4, 'word', 'まい', 'にち', ' はを みがく'),
  qp('日', 5, 'altread', [r('三', 'みっ'), b('か'), t('かん れんしゅうする')]),
  // 田
  q('田', 1, 'read', '', 'た', 'んぼの かえるを さがす'),
  q('田', 2, 'word', '', 'た', 'うえを てつだう'),
  qp('田', 3, 'altread', [r('山', 'やま'), b('だ'), t('さんの いえに いく')]),
  q('田', 4, 'sentence', '', 'た', 'んぼに みずを ひく'),
  q('田', 5, 'sentence', 'いねかりの ', 'た', 'んぼを ながめる'),
  // 口
  q('口', 1, 'read', '', 'くち', 'を おおきく あける'),
  q('口', 2, 'altread', 'こうえんの いり', 'ぐち', 'で ならぶ'),
  q('口', 3, 'word', 'はや', 'くち', 'ことばを いう'),
  q('口', 4, 'word', '', 'くち', 'ぶえを ふく'),
  q('口', 5, 'sentence', 'かばの ', 'くち', 'は おおきい'),
  // 女
  qp('女', 1, 'read', [b('おんな'), t('の'), r('子', 'こ'), t('が わらう')]),
  q('女', 2, 'altread', '', 'じょ', 'おうさまの おしろ'),
  q('女', 3, 'sentence', '', 'おんな', 'のひとに みちを おしえてもらう'),
  q('女', 4, 'altread', 'てん', 'にょ', 'の はごろもの おはなし'),
  q('女', 5, 'word', '', 'じょ', 'しの チームで リレーを はしる'),
  // 子
  q('子', 1, 'read', '','こ', 'どもたちが あそぶ'),
  q('子', 2, 'word', 'おや', 'こ', 'で りょうりを つくる'),
  q('子', 3, 'sentence', '', 'こ', 'ねこが ないている'),
  q('子', 4, 'altread', 'あかい ぼう', 'し', 'を かぶる'),
  qp('子', 5, 'word', [r('女', 'おんな'), t('の'), b('こ'), t('が うたって いる')]),
  // 学
  qp('学', 1, 'word', [b('がっ'), r('校', 'こう'), t('へ いく')]),
  q('学', 2, 'word', '', 'がく', 'ねんが あがる'),
  q('学', 3, 'word', 'こうじょう けん', 'がく', 'に いく'),
  q('学', 4, 'okurigana', '', 'まな', 'ぶことは たのしい'),
  q('学', 5, 'word', 'にゅう', 'がく', 'しきの しゃしん'),
  // 校
  qp('校', 1, 'word', [r('学', 'がっ'), b('こう'), t('の うんどうじょうで あそぶ')]),
  q('校', 2, 'word', '', 'こう', 'ていで おにごっこを する'),
  q('校', 3, 'word', '', 'こう', 'ちょうせんせいの おはなし'),
  q('校', 4, 'sentence', 'ともだちが てん', 'こう', 'する'),
  qp('校', 5, 'word', [t('しょう'), r('学', 'がっ'), b('こう'), t('の '), r('一', 'いち'), t('ねんせい')]),
  // 森
  q('森', 1, 'read', '', 'もり', 'で どんぐりを ひろう'),
  q('森', 2, 'sentence', '', 'もり', 'の おくに いずみが ある'),
  q('森', 3, 'altread', 'あお', 'もり', 'けんの りんご'),
  q('森', 4, 'word', '', 'しん', 'りんの くうきを すう'),
  q('森', 5, 'sentence', '', 'もり', 'の どうぶつたちに あう'),
  // 右
  q('右', 1, 'read', '', 'みぎ', 'てを あげる'),
  q('右', 2, 'sentence', 'みちを ', 'みぎ', 'に まがる'),
  q('右', 3, 'word', '', 'みぎ', 'がわを あるく'),
  qp('右', 4, 'altread', [r('左', 'さ'), b('ゆう'), t('を よく みて わたる')]),
  q('右', 5, 'sentence', '', 'みぎ', 'あしで ボールを ける'),
  // 左
  q('左', 1, 'read', '', 'ひだり', 'てで つなを ひく'),
  q('左', 2, 'sentence', 'つぎの かどを ', 'ひだり', 'に まがる'),
  q('左', 3, 'word', '', 'ひだり', 'がわの せきに すわる'),
  q('左', 4, 'altread', '', 'さ', 'ゆうを かくにんする'),
  q('左', 5, 'sentence', '', 'ひだり', 'めを つぶる'),
]

// ============================================================
// マスター級（エキストラ）の手書き問題（第15回）
// さかなの漢字・ことわざ・四字熟語。すべて意味説明つき。
// ============================================================
export const MASTER_BANK: Question[] = [
  // ---- さかな① ----
  qp('鮭', 1, 'sentence', [b('さけ'), t('の おにぎりを たべた。')], '鮭（さけ）: 川で うまれて 海で そだつ 魚。やき魚や おにぎりの具で おなじみ。'),
  qp('鮭', 2, 'sentence', [b('さけ'), t('が 川を のぼって いく。')], '鮭（さけ）: たまごを うむ ために、うまれた 川へ もどって くる。'),
  qp('鮪', 1, 'sentence', [t('おすしやさんで '), b('まぐろ'), t('を たのんだ。')], '鮪（まぐろ）: おすしで 大にんきの 大きな 魚。とても はやく およぐ。'),
  qp('鮪', 2, 'sentence', [b('まぐろ'), t('は とまらずに およぎつづける。')], '鮪（まぐろ）: ねている あいだも およいで いる 魚。'),
  qp('鯖', 1, 'sentence', [b('さば'), t('の みそ'), r('煮', 'に'), t('が おいしい。')], '鯖（さば）: せなかに しましまの ある 青い 魚。みそ煮が ゆうめい。'),
  qp('鯖', 2, 'sentence', [b('さば'), t('は 青(あお)ざかなの なかまだ。')], '鯖（さば）: 体に いい あぶらを たくさん もっている 魚。'),
  qp('鯛', 1, 'sentence', [t('おいわいの 日に '), b('たい'), t('を たべる。')], '鯛（たい）: 「めでたい」に つながる、おいわいの 魚。'),
  qp('鯛', 2, 'sentence', [t('くさっても '), b('たい'), t('、と いう。')], 'ことわざ「くさっても鯛」: 本当に よい ものは、古く なっても ねうちが ある。'),
  qp('鰯', 1, 'sentence', [b('いわし'), t('の 大きな むれが およぐ。')], '鰯（いわし）: むれで およぐ 小さな 魚。'),
  qp('鰯', 2, 'sentence', [b('いわし'), t('ぐもが 空に ひろがる。')], '鰯雲（いわしぐも）: いわしの むれの ように 見える、小さな くもの あつまり。'),
  // ---- さかな② ----
  qp('鰻', 1, 'sentence', [t('うしの 日に '), b('うなぎ'), t('を たべた。')], '鰻（うなぎ）: ほそながい 魚。かばやきが ゆうめい。'),
  qp('鰻', 2, 'sentence', [b('うなぎ'), t('は ぬるぬる して つかみにくい。')], '鰻（うなぎ）: 川や いけに すむ、へびの ように ほそながい 魚。'),
  qp('鮎', 1, 'sentence', [t('川で '), b('あゆ'), t('つりを した。')], '鮎（あゆ）: きれいな 川に すむ 魚。夏の つりで にんき。'),
  qp('鮎', 2, 'sentence', [b('あゆ'), t('の しおやきを たべた。')], '鮎（あゆ）: すいかの ような かおりが すると いわれる。'),
  qp('鯉', 1, 'sentence', [t('いけの '), b('こい'), t('に えさを やった。')], '鯉（こい）: いけや 川に すむ 大きな 魚。ながいき する。'),
  qp('鯉', 2, 'sentence', [b('こい'), t('のぼりが 空を およいで いる。')], '鯉のぼり: 子どもが 元気に そだつように、と かざる こいの はた。'),
  qp('鰹', 1, 'sentence', [b('かつお'), t('ぶしを ごはんに かけた。')], '鰹（かつお）: かつおぶしの もとに なる 魚。はるに 北へ およいで いく。'),
  qp('鰹', 2, 'sentence', [b('かつお'), t('の たたきを たべた。')], '鰹（かつお）: そとだけ あぶって たべる「たたき」が ゆうめい。'),
  qp('鱈', 1, 'sentence', [t('なべに '), b('たら'), t('を 入(い)れた。')], '鱈（たら）: さむい 海に すむ 白(しろ)みの 魚。なべりょうりに よく つかう。'),
  qp('鱈', 2, 'sentence', [b('たら'), t('こは この 魚の たまごだ。')], 'たらこ: 鱈（たら）の たまごを しおづけに した たべもの。'),
  // ---- ことわざ ----
  qp('兎', 1, 'sentence', [b('うさぎ'), t('が ぴょんと はねた。')], '兎（うさぎ）: 耳の ながい 動(どう)物(ぶつ)。'),
  qp(
    '兎',
    2,
    'sentence',
    [t('よくばって 二(に)'), b('と'), t('を おっては いけない。')],
    'ことわざ「二兎（にと）を追う者は一兎（いっと）をも得ず」: 二つ いっぺんに ねらうと、どちらも 手に 入らない。'
  ),
  qp('蛙', 1, 'sentence', [b('かえる'), t('が いけで ないて いる。')], '蛙（かえる）: 水べに すむ 生きもの。おたまじゃくしから そだつ。'),
  qp('蛙', 2, 'sentence', [b('かえる'), t('の 子は かえる、と いう。')], 'ことわざ「蛙の子は蛙」: 子どもは やっぱり おやに にる、と いう こと。'),
  qp('鳶', 1, 'sentence', [b('とび'), t('が 空を ゆっくり まわる。')], '鳶（とび・とんび）: ピーヒョロロと なく 大きな とり。'),
  qp('鳶', 2, 'sentence', [b('とんび'), t('に あぶらあげを さらわれた。')], 'ことわざ「鳶に油揚げをさらわれる」: 大切な ものを よこから ぱっと とられて しまう こと。'),
  qp('狸', 1, 'sentence', [t('夜(よる)の 道で '), b('たぬき'), t('を 見た。')], '狸（たぬき）: まるっこい 体の 動(どう)物(ぶつ)。'),
  qp('狸', 2, 'sentence', [b('たぬき'), t('ねいりを して しかられた。')], '狸寝入り（たぬきねいり）: ねた ふりを する こと。'),
  qp('亀', 1, 'sentence', [b('かめ'), t('は ゆっくり あるく。')], '亀（かめ）: かたい こうらを もつ 生きもの。ながいき する。'),
  qp('亀', 2, 'sentence', [t('つるは 千(せん)年(ねん)、'), b('かめ'), t('は 万(まん)年(ねん)。')], 'ながいきを おいわいする ことば。つるも かめも ながいきの しるし。'),
  // ---- よじじゅくご ----
  qp('石', 6, 'sentence', [t('それは 一(いっ)'), b('せき'), t('二(に)鳥(ちょう)の いい かんがえだ。')], '四字熟語「一石二鳥（いっせきにちょう）」: 一つの ことで 二つの とくを する こと。'),
  qp('心', 6, 'sentence', [t('しょ'), b('しん'), t('わするべからず。')], '「初心（しょしん）忘るべからず」: はじめた ときの 気もちを ずっと わすれるな、と いう ことば。'),
  qp('転', 6, 'sentence', [t('ななころび や おき。しっぱいしても '), b('ころ'), t('んでも おきあがろう。')], '「七転び八起き（ななころびやおき）」: 何ども しっぱいしても、その たびに 立ち上がる こと。'),
  qp('差', 6, 'sentence', [t('人の すきな ものは 千(せん)'), b('さ'), t('万(ばん)別(べつ)だ。')], '四字熟語「千差万別（せんさばんべつ）」: 人や ものは、それぞれ みんな ちがう と いう こと。'),
  qp('老', 6, 'sentence', [b('ろう'), t('若(にゃく)男(なん)女(にょ)が まつりに あつまった。')], '四字熟語「老若男女（ろうにゃくなんにょ）」: 年よりも わかい 人も、男も 女も、みんな。'),
]

// ============================================================
// QuestionProvider 抽象層（仕様 §12）
// 初期実装: LocalQuestionBankProvider（オフライン完結）
// 将来: RemoteQuestionPackProvider（remoteQuestions.ts参照）を追加可能
// ============================================================
export interface QuestionProvider {
  id: string
  getVariants(char: string): Promise<Question[]>
  /** excludeIds（直近に出題した問題）以外から選ぶ。全部除外されるなら全体から選ぶ */
  pick(char: string, excludeIds: string[]): Promise<Question | null>
}

export class LocalQuestionBankProvider implements QuestionProvider {
  id = 'local-bank'
  private byChar = new Map<string, Question[]>()

  constructor(bank: Question[] = QUESTION_BANK) {
    for (const item of bank) {
      const arr = this.byChar.get(item.char) ?? []
      arr.push(item)
      this.byChar.set(item.char, arr)
    }
  }

  async getVariants(char: string): Promise<Question[]> {
    return this.byChar.get(char) ?? []
  }

  async pick(char: string, excludeIds: string[]): Promise<Question | null> {
    const all = this.byChar.get(char) ?? []
    if (all.length === 0) return null
    const fresh = all.filter((v) => !excludeIds.includes(v.id))
    const pool = fresh.length > 0 ? fresh : all
    return pool[Math.floor(Math.random() * pool.length)]
  }
}

// 自動生成問題（頻出単語の穴埋め。scripts/gen-content.mjs 参照）と手書き問題を併用。
// 手書き（QUESTION_BANK）が先＝小1検証用20字は上質な手書き問題も出る。
import genQuestionsJson from './gen/questions.gen.json'

const GENERATED_BANK = genQuestionsJson as Question[]

export const FULL_BANK: Question[] = [...QUESTION_BANK, ...MASTER_BANK, ...GENERATED_BANK]

export const questionProvider: QuestionProvider = new LocalQuestionBankProvider(FULL_BANK)

const CHARS_WITH_QUESTIONS = new Set(FULL_BANK.map((v) => v.char))

export function hasQuestions(char: string): boolean {
  return CHARS_WITH_QUESTIONS.has(char)
}
