# かんじクエスト

iPad + Apple Pencil 向けの手書き漢字学習PWA。小学生〜中学生が漢字を「実際に何度も書く」ことで習得し、仲間集め・育成の報酬システムで長期間継続できるように設計している。

- 対象環境: **iPad + Apple Pencil + Safari**（第一ターゲット）。PC + マウスでも開発検証できる
- React + TypeScript + Vite + PWA + IndexedDB + Canvas/SVG + Pointer Events
- ログイン・クラウド同期なし。データはすべて端末内（IndexedDB）
- 家族5人分のプロフィールを完全分離で管理

---

## 1. 使い方

### 開発・動作確認（PC）

```bash
npm install
npm run dev        # 開発サーバー（http://localhost:5173）
npm run build      # 型チェック + ビルド + Service Worker生成（dist/）
npm run preview    # ビルド済みを配信（http://localhost:4173、LAN公開 --host 付き）
```

PCではマウスでも書ける（開発用に pointerType 'mouse' を許可している。'touch' は既定で拒否）。

### iPadで使う

1. PC側で `npm run build && npm run preview` を実行（またはdist/を任意の静的サーバーへ配置）
2. iPadのSafariで `http://<PCのIPアドレス>:4173/` を開く
3. 共有ボタン →「ホーム画面に追加」でアプリのように起動できる（横向き推奨）

**Service Worker（完全オフライン化）についての注意**: Service WorkerはHTTPSまたはlocalhostでのみ有効。LAN上の `http://192.168.x.x` ではSWが登録されず、オフラインキャッシュだけが無効になる（**アプリ機能とIndexedDB保存はすべて動作する**）。完全なオフラインPWAにするには下記のGitHub Pages公開を使う。

### URLで公開する（GitHub Pages・推奨）

初回も更新も同じコマンド1つ:

```bash
npm run deploy   # = node scripts/deploy-pages.mjs
```

リポジトリ作成（public）→ main push → ビルド → gh-pagesへdist配置 → Pages有効化 → 公開URL確認まで自動で行う。
公開URL: `https://<GitHubアカウント名>.github.io/kanji-quest/`
HTTPSなのでService Workerが有効になり、iPadで「ホーム画面に追加」すれば完全なオフラインPWAとして動く。
アプリはサーバーにデータを送らない（学習データは各端末のIndexedDBのみ）。コードとKanjiVG由来データ（CC BY-SA 3.0）が公開リポジトリに置かれる。

### バックアップ

設定 →「バックアップを書き出す」で全プロフィールのJSONを保存。「読み込む」で復元（全置換・要確認）。iPad故障・Safariデータ削除に備えて定期的に書き出すこと。

---

## 2. 何より重要な4点の実装状況（仕様§37）

| 要件 | 実装 | 検証 |
|---|---|---|
| Apple Pencilで快適に書ける | Pointer Events + `getCoalescedEvents()`（非対応時フォールバック）、筆圧反映、desynchronized canvas | Pencil診断画面で実機確認可能 |
| 手のひら・指を誤認しない | `pointerType === 'touch'` はインク化せず拒否カウントのみ。penのみ（＋開発用mouse）受付 | ブラウザ自動テストで確認済（下記G/H） |
| 字形の高精度判定 | 1画ごとのDTW+フレシェ+始終点+方向+長さ+重心のコスト合成、文字正規化で子どもの字を許容 | 自己テストA/F/X 全20字合格 |
| 「形は合うが書き順が違う」判定 | 書いた順を無視したHungarianマッチング後、順序列を評価。方向（逆書き）も別判定 | 自己テストB/C 全字合格 |

**OCR画像認識は使用していない。** 必ず1画ごとのstroke情報（座標・timestamp・筆圧・pointerType・tilt）を保持・利用する。

### 自動検証の結果（仕様§33のA〜H）

判定デバッグ画面の「エンジン自己テスト」は、お手本ストロークに子どもの筆記を模したノイズ（回転・拡縮・オフセット・揺れ）を加えた合成データでA〜F+Xを全漢字に対して実行する。2026-08-08時点、既定しきい値で **134/134ケース合格**:

- A 正しい形＋正しい書き順 → 正解（20/20）
- B 書き順入れ替え → 「形は合っています」＋書き順エラー検出（19/19 ※1画の字は対象外）
- C 逆方向から書く → 「形は合っています」＋方向エラー検出（20/20）
- D 1画不足 → 不正解（19/19）
- E 余分な1画 → 不正解（20/20）
- F 子どもらしく雑な字 → 正解（20/20）
- X 同じ画数の別の漢字 → 不正解（16/16。しきい値の緩めすぎ検知用に追加）
- G 手のひらを置く → strokeにならない（ブラウザ自動テストで、touch接地中のpen筆記30点が完全記録・touchは拒否カウントのみ増加を確認）
- H 指でなぞる → strokeにならない（同上）

**注意: 合成データでの検証であり、実際の子どもの筆記データでのしきい値調整が必須**（後述の調整ワークフロー参照）。

---

## 3. アーキテクチャ

```
scripts/
  fetch-kanjivg.mjs   KanjiVGからstroke SVGを取得し strokes.gen.ts を生成（漢字追加はここ）
  gen-icons.mjs       PWAアイコンPNG生成（依存なし）
  gen-sw.mjs          ビルド後にdist/を走査してService Worker生成（全アセットprecache）
src/
  config/
    judgeConfig.ts    判定しきい値（§8。実機データで調整する対象）
    gameConfig.ts     コイン・EXP・ガチャ確率・SRS間隔・期の表示名 等
    judgeRuntime.ts   しきい値の端末上書き（判定デバッグ画面から保存）
    appFlags.ts       指入力許可フラグ等
  core/
    geometry.ts       resample（arc length）・bbox・文字正規化・角度
    svgPath.ts        SVGパスパーサ（M/L/H/V/C/S/Q/T/Z対応）
    refdata.ts        お手本ストロークの前処理・キャッシュ
    ink/InkCanvas.tsx 手書き入力（palm rejection・coalesced・筆圧）※最重要
    judge/
      metrics.ts      DTW・離散フレシェ・始終点・方向・長さ・重心
      hungarian.ts    Hungarian algorithm（O(n^3)）
      evaluate.ts     字形/書き順/方向の統合評価・なぞり1画判定
      selftest.ts     検証ケースA〜F+Xの自動実行
  data/
    kanjivg/strokes.gen.ts  自動生成（KanjiVG由来。手動編集しない）
    kanjiIndex.ts     小1配当80字と収録状況
    curriculum.ts     ステージ（5字）・期（3分割）定義
    questions.ts      問題バンク（20字×5問）+ QuestionProvider抽象層
    remoteQuestions.ts RemoteQuestionPackProviderの骨組み（将来拡張・安全制約明記）
    species.ts        仲間16系列38形態（完全オリジナル）
  game/
    logic.ts          ガチャ・EXP・レベル・進化・スター・マイルストーン
    sprites.tsx       パラメトリックSVGスプライト（後から画像に差し替え可能）
  storage/
    db.ts / models.ts / repo.ts / backup.ts   IndexedDB（12ストア）
  learn/
    TraceStep.tsx     書き順なぞり（始点●+方向アニメ）
    WritingPad.tsx    自由筆記（自動判定+できた！ボタン+undo）
    TestRunner.tsx    ステージ/大型テスト共通（途中保存・再開・わからない）
    QuestionPrompt.tsx 文脈問題表示
  screens/            各画面（ホーム・マップ・学習・テスト・復習・ガチャ・図鑑 等）
```

### 判定パイプライン（仕様§6〜§8）

1. 入力ストロークを109座標系へ変換、極小ゴミを除去
2. 文字全体のbboxで正規化（最大辺=1、中心0.5）→ 大きさ・位置ずれを許容
3. 各ストロークをarc lengthで28点に再サンプリング
4. User×Reference の全ペアについて順方向/逆方向のコストを計算
   （cost = w·DTW + w·フレシェ + w·始点 + w·終点 + w·角度 + w·長さ比 + w·重心）
5. min(順,逆)のコスト行列にHungarian法 → 書いた順序に依存しない対応付け
6. 対応が付いてから: 画数一致 / 各画の字形（短い画はしきい値緩和） / 書いた順序列 / 逆方向 / 縦横バランス を別々に評価
7. 判定: ◎perfect / ○形は合うが書き順・方向に注意 / ×不正解 ＋ 子ども向けメッセージ

テストの採点では「形は正しいが書き順が違う」は正解扱い＋書き順ミスとして別途記録・表示する（`judgeConfig.scoring.orderStrictInTests = true` で不正解扱いに変更可能）。

### しきい値調整ワークフロー（実機で必ずやること）

1. iPadで 設定 → Apple Pencil診断: pen認識・筆圧・coalesced・palm rejectionを確認
2. 設定 → 判定デバッグ: 子どもに実際に書かせ、判定がおかしい字に「本当は正解 / 本当は不正解」ラベルを付ける（筆記データ付きで保存される）
3. しきい値欄を調整 → 「いまの字を再判定」で即確認 → 「保存して適用」
4. 「エンジン自己テスト」でA〜F+Xが崩れていないか確認（回帰テスト）
5. 蓄積サンプルは「全サンプルをJSONで書き出す」でPCに回収できる（上限400件、ラベル付きは削除されない）

---

## 4. 学習コンテンツ

- 学習単位: 5漢字=1ステージ、STEP1なぞり → STEP2自分で3回 → STEP3文脈・熟語で5回（§10）
- 文脈問題: 1字につき5パターン（読み/熟語/穴埋め/送り仮名/別読み）。直近出題を記録し連続同一を回避（§11-12）
- ステージテスト5問 + 期の大型テスト（分割なし・途中自動保存・再開可能）（§13, §16）
- 「わからない」ボタン → 不正解扱い+リスト登録+即次へ。リスト解除は**次の正式テストで正解したときだけ**（§14-15）
- 復習: SRS（間隔 0/1/3/7/14/30日、config変更可）。子どもには「きょうのふくしゅう」とだけ表示（§17）
- 収録漢字: 検証用20字（一二三十人大木本川山日田口女子学校森右左）+ 小1配当80字の枠組み

### 漢字の追加方法

```bash
node scripts/fetch-kanjivg.mjs 花火草  # 追加したい漢字を引数に
```

で `strokes.gen.ts` に追記生成される（キャッシュ済SVGは再取得しない）。あとは
1. `data/questions.ts` に5問追加
2. `data/curriculum.ts` のステージに配置
するだけで新しい漢字が遊べる。ロジック変更は不要（データとロジックを分離済み。§31）。

---

## 5. ゲーム（報酬システム）

- ループ: 勉強 → コイン+バディEXP → ガチャ or スター育成 or 貯金（上限・期限なし）（§18）
- ガチャ: 出会えないこともある（既定72%）。初回は必ず出会える・3連続はずれ後は保証（すべてconfig）
- 重複: なかよしEXPに変換（§22）。課金要素なし
- 仲間: 16系列38形態のオリジナルキャラクター（文房具・自然の精霊）。2〜3段階進化、進化先は図鑑でシルエット表示（§25-27）
- みんな画面: 兄弟の「できごと」を順位なしで表示（§30）

---

## 6. データ保存（IndexedDB 12ストア）

profiles / kanjiProgress / strokeSamples / testResults / testSessions / unknownKanji / coinHistory / ownedCharacters / dexEntries / gachaHistory / activityFeed / settings

仕様§35のエンティティ対応は `src/storage/models.ts` 冒頭のコメントに記載（ReviewScheduleはkanjiProgress内のSRS項目、CoinBalanceはprofiles.coins、CharacterマスタはコードのSPECIES定義、CharacterLevelはownedCharacters内）。

---

## 7. ライセンス・出典

- **KanjiVG**: 筆順ストロークデータ（`src/data/kanjivg/strokes.gen.ts` と `scripts/kanjivg-cache/`）は
  [KanjiVG](https://kanjivg.tagaini.net)（Copyright © Ulrich Apel）由来。
  ライセンス: [Creative Commons Attribution-Share Alike 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
  このため当該データファイルおよびその改変物はCC BY-SA 3.0の継承条件に従う。アプリ内の設定画面にも出典を表示している。
- 学年別漢字配当（小1の80字）: 文部科学省 学習指導要領の学年別漢字配当表に基づく
- キャラクター・アイコン・UIはすべて本プロジェクトのオリジナル。既存アプリ・作品からの画像流用はない

---

## 8. 実装上の判断（仕様にない点の補完記録）

1. **マウス入力を開発用に許可**: 仕様§3は「pen以外をインクにしない」が主旨のためtouchのみ拒否し、PC開発用にmouseを許可した。指入力は設定の「指でも書けるようにする（検証用）」でのみ有効化できる（既定オフ）
2. **書き順違いのテスト採点**: 学校の紙テスト同様「形が正しければ正解」とし、書き順・方向ミスは別カテゴリで記録・結果表示・注意喚起する（configで厳格化可能）
3. **ステージ構成**: 検証用20字を4ステージ×5字に編成し、1学期=ステージ1-2（10字）、2学期=ステージ3-4（10字）、3学期=準備中とした。期の表示名は`gameConfig.termLabels`で変更可能
4. **復習正解のSRS反映**: 「わからなかった漢字の復習」でも間隔反復は進める（リスト解除だけはテスト限定）
5. **画数違いは常に不正解**（D/E準拠）。1画を2ストロークに分けて書いた場合も画数過多になる。結合検出は将来課題
6. **筆記サンプル保存**: しきい値調整用に判定結果+32点/画へ間引いた軌跡を最大400件保存（ラベル付きは保護）。生の筆圧・tiltはセッション中のみ保持し、保存版では容量削減のため座標のみ
7. **プロフィール削除**: アプリ内データのため「仮削除」ではなく二重確認のうえ完全削除とした
8. **みんな画面のカード表示**: 順位付け禁止（§30）のため作成順に並べ、比較を煽る数値の強調はしない
9. **初回ブースト**: プロフィール作成時60コイン+初回ガチャ確定で、最初のセッションで必ず仲間に出会える（§21の「出会いの喜び」を最初に体験させるため）
10. **保存先フォルダ**: 配置ルールに該当項目がないため `06_業務横断ツール/06-05_アプリ開発/` を新設して配置（フォルダ移動してもアプリは動作する）

## 9. 既知の制限・今後

- 収録は20字（+小1の80字枠）。残りはKanjiVG取得スクリプトと問題データ追加で拡張
- しきい値は合成データ基準。**実機のApple Pencilデータでの調整が必須**（判定デバッグ画面のラベル機能を使う）
- 1画を途中で離して2画で書いた場合は画数過多として不正解（結合リカバリ未実装）
- 音・効果音なし。中学生向けコース（教科書順等の差し替え）は構造のみ
- RemoteQuestionPackProviderは骨組みのみ（人間レビュー済みパック必須・APIキーのフロント保存禁止・オフライン動作維持の制約をコードコメントに明記）
