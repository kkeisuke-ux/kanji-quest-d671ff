// 文脈・熟語問題バンクとQuestionProvider抽象層（仕様 §11, §12）。
// 1漢字につき5パターンの出題（読み/熟語/文の穴埋め/送り仮名/別の読み方）。
// 直近に出した問題は避けて出題する（recentVariantIdsをexcludeに渡す）。

export interface QuestionPart {
  text?: string
  blank?: { reading: string }
}

export type QuestionKind = 'read' | 'word' | 'sentence' | 'okurigana' | 'altread'

export interface Question {
  id: string
  char: string
  kind: QuestionKind
  parts: QuestionPart[]
}

function q(char: string, num: number, kind: QuestionKind, before: string, reading: string, after: string): Question {
  const parts: QuestionPart[] = []
  if (before) parts.push({ text: before })
  parts.push({ blank: { reading } })
  if (after) parts.push({ text: after })
  return { id: `${char}-${num}`, char, kind, parts }
}

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
  q('人', 2, 'word', '三', 'にん', 'で うたを うたう'),
  q('人', 3, 'sentence', 'おとなの ', 'ひと', 'に みちを きく'),
  q('人', 4, 'altread', 'うちゅう', 'じん', 'の えを かく'),
  q('人', 5, 'word', '', 'にん', 'ぎょうで あそぶ'),
  // 大
  q('大', 1, 'okurigana', '', 'おお', 'きい こえで うたう'),
  q('大', 2, 'word', '', 'だい', 'すきな おやつ'),
  q('大', 3, 'sentence', '', 'おお', 'きな 木が ある'),
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
  q('本', 3, 'altread', 'えんぴつが 一', 'ぽん', 'ある'),
  q('本', 4, 'word', '日', 'ほん', 'の ちずを みる'),
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
  q('日', 5, 'altread', '三', 'か', 'かん れんしゅうする'),
  // 田
  q('田', 1, 'read', '', 'た', 'んぼの かえるを さがす'),
  q('田', 2, 'word', '', 'た', 'うえを てつだう'),
  q('田', 3, 'altread', '山', 'だ', 'さんの いえに いく'),
  q('田', 4, 'sentence', '', 'た', 'んぼに みずを ひく'),
  q('田', 5, 'sentence', 'いねかりの ', 'た', 'んぼを ながめる'),
  // 口
  q('口', 1, 'read', '', 'くち', 'を おおきく あける'),
  q('口', 2, 'altread', 'こうえんの いり', 'ぐち', 'で ならぶ'),
  q('口', 3, 'word', 'はや', 'くち', 'ことばを いう'),
  q('口', 4, 'word', '', 'くち', 'ぶえを ふく'),
  q('口', 5, 'sentence', 'かばの ', 'くち', 'は おおきい'),
  // 女
  q('女', 1, 'read', '', 'おんな', 'の子が わらう'),
  q('女', 2, 'altread', '', 'じょ', 'おうさまの おしろ'),
  q('女', 3, 'sentence', '', 'おんな', 'のひとに みちを おしえてもらう'),
  q('女', 4, 'altread', 'てん', 'にょ', 'の はごろもの おはなし'),
  q('女', 5, 'word', '', 'じょ', 'しの チームで リレーを はしる'),
  // 子
  q('子', 1, 'read', '','こ', 'どもたちが あそぶ'),
  q('子', 2, 'word', 'おや', 'こ', 'で りょうりを つくる'),
  q('子', 3, 'sentence', '', 'こ', 'ねこが ないている'),
  q('子', 4, 'altread', 'あかい ぼう', 'し', 'を かぶる'),
  q('子', 5, 'word', '女の', 'こ', 'が うたって いる'),
  // 学
  q('学', 1, 'word', '', 'がっ', '校へ いく'),
  q('学', 2, 'word', '', 'がく', 'ねんが あがる'),
  q('学', 3, 'word', 'こうじょう けん', 'がく', 'に いく'),
  q('学', 4, 'okurigana', '', 'まな', 'ぶことは たのしい'),
  q('学', 5, 'word', 'にゅう', 'がく', 'しきの しゃしん'),
  // 校
  q('校', 1, 'word', '学', 'こう', 'の うんどうじょうで あそぶ'),
  q('校', 2, 'word', '', 'こう', 'ていで おにごっこを する'),
  q('校', 3, 'word', '', 'こう', 'ちょうせんせいの おはなし'),
  q('校', 4, 'sentence', 'ともだちが てん', 'こう', 'する'),
  q('校', 5, 'word', 'しょう学', 'こう', 'の 一ねんせい'),
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
  q('右', 4, 'altread', '左', 'ゆう', 'を よく みて わたる'),
  q('右', 5, 'sentence', '', 'みぎ', 'あしで ボールを ける'),
  // 左
  q('左', 1, 'read', '', 'ひだり', 'てで つなを ひく'),
  q('左', 2, 'sentence', 'つぎの かどを ', 'ひだり', 'に まがる'),
  q('左', 3, 'word', '', 'ひだり', 'がわの せきに すわる'),
  q('左', 4, 'altread', '', 'さ', 'ゆうを かくにんする'),
  q('左', 5, 'sentence', '', 'ひだり', 'めを つぶる'),
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

export const questionProvider: QuestionProvider = new LocalQuestionBankProvider()

const CHARS_WITH_QUESTIONS = new Set(QUESTION_BANK.map((v) => v.char))

export function hasQuestions(char: string): boolean {
  return CHARS_WITH_QUESTIONS.has(char)
}
