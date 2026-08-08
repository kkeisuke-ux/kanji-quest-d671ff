// お手本ストローク（reference stroke）の読み込みと前処理。
// KanjiVG由来のSVGパスを点列化し、判定用の特徴量を事前計算してキャッシュする。
import { KANJIVG, KANJIVG_VIEWBOX } from '../data/kanjivg/strokes.gen'
import { flattenPath } from './svgPath'
import {
  type Pt,
  type BBox,
  type CharTransform,
  applyCharTransform,
  bboxOf,
  centroidOf,
  chordAngle,
  makeCharTransform,
  polylineLength,
  resample,
} from './geometry'

export interface RefStroke {
  /** 何画目か（0始まり） */
  index: number
  /** SVG path (d属性)。表示・アニメーション用 */
  d: string
  /** flatten後の点列（109座標系・密） */
  raw109: Pt[]
  /** resample後の点列（109座標系） */
  sampled109: Pt[]
  /** 文字正規化空間での点列 */
  norm: Pt[]
  normLen: number
  normStart: Pt
  normEnd: Pt
  normCentroid: Pt
  /** 始点→終点の弦の角度（書く方向） */
  normAngle: number
}

export interface RefKanji {
  char: string
  strokeCount: number
  viewBox: number
  strokes: RefStroke[]
  bbox109: BBox
  transform: CharTransform
  /** 縦横比（クランプ済み） */
  aspect: number
}

const cache = new Map<string, RefKanji>()

export function hasRefKanji(char: string): boolean {
  return char in KANJIVG
}

export function listRefKanji(): string[] {
  return Object.keys(KANJIVG)
}

export function clampedAspect(bbox: BBox): number {
  const m = Math.max(bbox.w, bbox.h, 1e-6)
  const w = Math.max(bbox.w, m * 0.2)
  const h = Math.max(bbox.h, m * 0.2)
  return w / h
}

export function getRefKanji(char: string, resampleN = 28): RefKanji {
  const key = `${char}:${resampleN}`
  const hit = cache.get(key)
  if (hit) return hit

  const paths = KANJIVG[char]
  if (!paths) throw new Error(`refdata: no stroke data for "${char}"`)

  const raws = paths.map((d) => flattenPath(d, 16))
  const bbox = bboxOf(raws)
  const transform = makeCharTransform(bbox)

  const strokes: RefStroke[] = paths.map((d, index) => {
    const raw109 = raws[index]
    const sampled109 = resample(raw109, resampleN)
    const norm = applyCharTransform(sampled109, transform)
    return {
      index,
      d,
      raw109,
      sampled109,
      norm,
      normLen: polylineLength(norm),
      normStart: norm[0],
      normEnd: norm[norm.length - 1],
      normCentroid: centroidOf(norm),
      normAngle: chordAngle(norm),
    }
  })

  const ref: RefKanji = {
    char,
    strokeCount: strokes.length,
    viewBox: KANJIVG_VIEWBOX,
    strokes,
    bbox109: bbox,
    transform,
    aspect: clampedAspect(bbox),
  }
  cache.set(key, ref)
  return ref
}
