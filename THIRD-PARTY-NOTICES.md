# 同梱している第三者データと、その出典・ライセンス

かんじクエストは、筆順・配当学年・読み・熟語・例文・ふりがなについて、
公開されている第三者データを利用しています。これらのデータおよびその加工物は
**元のライセンスのまま**であり、本アプリのライセンス（CC BY-NC-SA 4.0、LICENSE参照）の
非営利条件は適用されません。

| データ | 出典 | ライセンス | 本リポジトリで該当するファイル |
|---|---|---|---|
| 漢字の筆順ストローク | [KanjiVG](https://kanjivg.tagaini.net) © Ulrich Apel | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | `src/data/kanjivg/strokes.gen.ts`（および取得用キャッシュ `scripts/kanjivg-cache/`、リポジトリには含めていない） |
| 学年別漢字配当・読み・部首等 | [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) © [EDRDG](https://www.edrdg.org/) | [CC BY-SA 4.0（EDRDG licence）](https://www.edrdg.org/edrdg/licence.html) | `src/data/gen/curriculum.gen.json` |
| 熟語・語の読み | [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html) © EDRDG | CC BY-SA 4.0（EDRDG licence） | `src/data/gen/questions.gen.json` |
| 例文（日本語文） | [Tanaka Corpus](https://www.edrdg.org/wiki/index.php/Tanaka_Corpus)（EDRDGが配布する examples.utf） | CC BY-SA 4.0（EDRDG licence） | `src/data/gen/questions.gen.json` |
| 語のふりがな分割 | [JmdictFurigana](https://github.com/Doublevil/JmdictFurigana) | JMdictと同じ Creative Commons Attribution-ShareAlike | `src/data/gen/questions.gen.json` |

## 補足

- 上記データは `scripts/gen-content.mjs` / `scripts/fetch-kanjivg.mjs` が決定的に加工して
  `src/data/gen/` と `src/data/kanjivg/` を生成しています。生成物は加工物（Adapted Material）に
  あたるため、CC BY-SA の継承条件に従います。
- 出典はアプリ内（設定 → ライセンス・出典）にも表示しています。
- 手書きで作成した出題文（`src/data/hand/*.json`）、キャラクター、イラスト、UI、コードは
  本プロジェクトのオリジナルで、上表のデータには含まれません（LICENSE の 1 が適用されます）。
- 学年別漢字配当は文部科学省 学習指導要領の学年別漢字配当表（KANJIDIC2 の grade 値）に基づきます。
  中学生分は公式の学年配当が存在しないため、常用漢字の残りを頻度順に3分割した**独自編成**です。
- 既存アプリ・作品からの画像・音声の流用はありません。効果音とBGMは Web Audio による合成で、
  外部の音源ファイルは同梱していません。
