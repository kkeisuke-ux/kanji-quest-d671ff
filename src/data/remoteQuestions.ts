// ============================================================
// RemoteQuestionPackProvider（将来拡張の骨組み。仕様 §12）
//
// 設計上の制約（必ず守ること）:
// 1. フロントエンドにLLMのAPIキー等の秘密情報を保存・埋め込みしない。
// 2. AIが自由生成した未確認の問題をそのまま子どもに提示しない。
//    → 配信するパックは必ず人間がレビューした静的JSON（reviewedBy/reviewedAt必須）。
// 3. AI生成を使う場合はバックエンドまたは安全なproxyでレビュー済みパックを
//    生成・署名し、このProviderは「取得と検証」だけを行う。
// 4. オフラインでも全機能が動くこと（本Providerはfallback必須）。
//
// 現時点でアプリからは使用していない（LocalQuestionBankProviderのみ使用）。
// ============================================================
import type { Question, QuestionProvider } from './questions'

export interface QuestionPack {
  formatVersion: 1
  packId: string
  /** 人間レビューの記録（必須。無いパックは拒否する） */
  reviewedBy: string
  reviewedAt: string
  questions: Question[]
}

export function validateQuestionPack(data: unknown): QuestionPack {
  const pack = data as Partial<QuestionPack>
  if (!pack || typeof pack !== 'object') throw new Error('pack: not an object')
  if (pack.formatVersion !== 1) throw new Error('pack: unsupported formatVersion')
  if (typeof pack.packId !== 'string' || !pack.packId) throw new Error('pack: packId missing')
  if (typeof pack.reviewedBy !== 'string' || !pack.reviewedBy) throw new Error('pack: reviewedBy missing (未レビューのパックは使用できません)')
  if (typeof pack.reviewedAt !== 'string' || !pack.reviewedAt) throw new Error('pack: reviewedAt missing')
  if (!Array.isArray(pack.questions)) throw new Error('pack: questions missing')
  for (const item of pack.questions) {
    if (typeof item.id !== 'string' || typeof item.char !== 'string' || !Array.isArray(item.parts)) {
      throw new Error('pack: malformed question')
    }
  }
  return pack as QuestionPack
}

export class RemoteQuestionPackProvider implements QuestionProvider {
  id = 'remote-pack'
  private extra = new Map<string, Question[]>()

  constructor(
    private packUrl: string,
    private fallback: QuestionProvider
  ) {}

  /** パックの取得と検証。失敗してもfallbackで全機能が動く */
  async load(): Promise<void> {
    const res = await fetch(this.packUrl, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`pack fetch failed: HTTP ${res.status}`)
    const pack = validateQuestionPack(await res.json())
    this.extra.clear()
    for (const question of pack.questions) {
      const arr = this.extra.get(question.char) ?? []
      arr.push(question)
      this.extra.set(question.char, arr)
    }
  }

  async getVariants(char: string): Promise<Question[]> {
    const base = await this.fallback.getVariants(char)
    return [...base, ...(this.extra.get(char) ?? [])]
  }

  async pick(char: string, excludeIds: string[]): Promise<Question | null> {
    const all = await this.getVariants(char)
    if (all.length === 0) return null
    const fresh = all.filter((v) => !excludeIds.includes(v.id))
    const pool = fresh.length > 0 ? fresh : all
    return pool[Math.floor(Math.random() * pool.length)]
  }
}
