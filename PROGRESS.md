# かんじクエスト 進捗

## 2026-08-08 初回実装完了（v0.1.0）

仕様書のPHASE 1〜16をすべて実装し、ビルド成功・ブラウザ自動テスト合格を確認済み。

### 完了
- Apple Pencil入力（Pointer Events + getCoalescedEvents + palm rejection）
- KanjiVGベースの判定エンジン（字形/書き順/方向を分離評価、Hungarianマッチング）
- 自己テスト 134/134合格（A〜F + X、20字。判定デバッグ画面から再実行可能）
- ブラウザE2E確認: palm rejection（G/H）/ 学習フロー（なぞり→3回→文脈5問）/ ステージテスト / 大型テスト途中保存・再開 / わからないリスト登録・テスト正解で自動解除 / ガチャ（新規・重複・はずれ）/ スター育成 / 進化（マスビー→マスダイオー）/ 図鑑シルエット
- スクリーンショット: docs/screenshots/
- README.md（セットアップ・iPad導入・ライセンス・調整ワークフロー・実装判断の記録）

### 次の一手（優先順）
1. **実機iPad + Apple Pencilでの確認**: 設定→Apple Pencil診断（pen認識・筆圧・coalesced・palm rejection）
2. 子どもに実際に書かせて、判定デバッグ画面で「本当は正解/不正解」ラベルを付けながらしきい値調整（src/config/judgeConfig.ts / 画面から保存も可）
3. 漢字の追加: `node scripts/fetch-kanjivg.mjs <漢字列>` → questions.ts に5問 → curriculum.ts に配置
4. 必要ならHTTPS静的ホスティングに dist/ を置いて完全オフラインPWA化（README参照）

### 起動方法
```bash
npm install   # 済み
npm run build # 済み（dist/生成済み）
npm run preview  # → http://localhost:4173 （LAN公開されるのでiPadから http://<PCのIP>:4173）
```
