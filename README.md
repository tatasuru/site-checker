# サイトチェッカー

ウェブサイトの自動クローリングとサイトマップ作成、SEO 分析機能を備えたフルスタック Web アプリケーションです。ユーザーはクローリング対象のウェブサイトを登録し、リアルタイムでクローリング進捗を監視し、インタラクティブなダッシュボードでサイト構造を可視化できます。

## 機能

- **自動ウェブクローリング** - Playwright を使用した包括的なサイトマップ作成
- **リアルタイム進捗追跡** - ライブステータス更新によるクローリングジョブの監視
- **インタラクティブサイト可視化** - Vue Flow ダイアグラムでサイト構造を探索
- **SEO 分析** - Webhook 統合による自動 SEO チェック
- **マルチユーザーサポート** - Supabase Auth と Google OAuth による安全な認証
- **レスポンシブダッシュボード** - ダーク/ライトテーマ対応のモダン UI

## アーキテクチャ

アプリケーションは 3 つの主要コンポーネントで構成されています：

### バックエンドサービス

#### クローラーバックエンド (`crawler-backend/`)

- **フレームワーク**: Supabase ベースのカスタムジョブキューを使用した Fastify Web サーバー
- **エンジン**: ブラウザ自動化のための Crawlee と Playwright
- **ポート**: 8080
- **機能**: 並行ジョブ処理、リアルタイム進捗追跡、自動リンク発見

#### SEO チェッカーバックエンド (`seo-checker-backend/`)

- **フレームワーク**: Webhook 処理用の Fastify Web サーバー
- **ポート**: 5050
- **機能**: 重複検出機能付き SEO 分析ジョブキュー、Webhook 処理

### フロントエンド (`frontend/`)

- **フレームワーク**: Vue 3 と TypeScript を使用した Nuxt.js 3
- **UI**: Tailwind CSS v4 を使用した Shadcn/ui コンポーネント
- **ポート**: 3000
- **機能**: リアルタイムダッシュボード、インタラクティブサイトマップ、プロジェクト管理

## 技術スタック

- **バックエンド**: Node.js、TypeScript、Fastify、Crawlee、Playwright
- **フロントエンド**: Nuxt.js 3、Vue 3、TypeScript、Tailwind CSS v4、Vue Flow
- **データベース**: Supabase (PostgreSQL)
- **認証**: Google OAuth を使用した Supabase Auth
- **ジョブキュー**: Supabase ベースのカスタム実装

## 前提条件

- Node.js 18+
- npm または yarn
- Supabase アカウントとプロジェクト

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd site-checker
```

### 2. 環境設定

各ディレクトリに`.env.local`ファイルを作成：

#### クローラーバックエンド

```bash
cd crawler-backend
cp .env.example .env.local
```

`.env.local`を編集：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

#### SEO チェッカーバックエンド

```bash
cd seo-checker-backend
cp .env.example .env.local
```

`.env.local`を編集：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

#### フロントエンド

```bash
cd frontend
cp .env.example .env.local
```

`.env.local`を編集：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 依存関係のインストール

```bash
# 全サービスの依存関係をインストール
cd crawler-backend && npm install
cd ../seo-checker-backend && npm install
cd ../frontend && npm install
```

### 4. データベースセットアップ

`CLAUDE.md`に記載の SQL を使用して Supabase プロジェクトにデータベーススキーマを設定してください。

## 開発

### 全サービスの起動

3 つのターミナルウィンドウを開いて実行：

```bash
# ターミナル1: クローラーバックエンド
cd crawler-backend && npm run start

# ターミナル2: SEOチェッカーバックエンド
cd seo-checker-backend && npm run start

# ターミナル3: フロントエンド
cd frontend && npm run dev

# ターミナル4: webhook用のngrok
ngrok http --domain=comic-greatly-flamingo.ngrok-free.app 5050

```

### 個別サービスコマンド

#### クローラーバックエンド

```bash
cd crawler-backend
npm run dev      # スタンドアロンクローラーの実行（テスト用）
npm run start    # ジョブキュー付きAPIサーバーの起動
npm run build    # TypeScriptコンパイル
npm run watch    # TypeScriptの監視と再コンパイル
npm run typecheck # 型チェック
```

#### SEO チェッカーバックエンド

```bash
cd seo-checker-backend
npm run start    # SEO分析サーバーの起動
npm run build    # TypeScriptコンパイル
npm run typecheck # 型チェック
```

#### フロントエンド

```bash
cd frontend
npm run dev      # 開発サーバー
npm run build    # プロダクションビルド
npm run preview  # プロダクションビルドのプレビュー
npm run generate # 静的サイト生成
```

### TypeScript 型生成

Supabase からの TypeScript 型を生成するには、フロントエンドディレクトリで以下を実行：

```bash
cd frontend

# Supabase CLIのインストール（まだインストールしていない場合）
npm install -g supabase

# Supabaseプロジェクトにログイン
supabase login

# 型を生成
supabase gen types typescript --project-id your-project-id > database.types.ts

# または、.env.localのSUPABASE_URLを使用
supabase gen types typescript --project-id $(echo $SUPABASE_URL | grep -o 'https://[^.]*' | sed 's/https://') > database.types.ts
```

詳細については[Supabase公式ドキュメント](https://supabase.com/docs/guides/api/rest/generating-types)を参照してください。

## 使用方法

1. **アプリケーションにアクセス**: http://localhost:3000 に移動
2. **サインイン**: Google OAuth で認証
3. **プロジェクト作成**: クローリング対象のウェブサイトを登録
4. **進捗監視**: ダッシュボードでリアルタイムクローリング進捗を確認
5. **結果表示**: インタラクティブサイトマップと SEO 分析を探索

## API エンドポイント

### クローラーバックエンド (ポート 8080)

- `POST /create-crawl-data` - 新しいクローリングジョブの開始
- `GET /health` - ヘルスチェック

### SEO チェッカーバックエンド (ポート 5050)

- `POST /completed-crawler` - 完了したクローリングの Webhook
- `GET /health` - ヘルスチェック

## データストレージ

クローラーデータの保存場所：

- `crawler-backend/storage/datasets/` - 個別ページデータ
- `crawler-backend/storage/request_queues/` - リクエスト管理
- `crawler-backend/storage/key_value_stores/` - クローラー統計
- `crawler-backend/storage/merged-crawl-data.json` - 統合結果
- `crawler-backend/storage/vueflow-data.json` - 可視化データ

## データベーススキーマ

アプリケーションは以下の主要テーブルを使用：

- `projects` - プロジェクト管理
- `crawl_jobs` - ジョブ追跡
- `crawl_results` - 結果保存
- `crawl_data` - 個別ページデータ
- `seo_check_jobs` - SEO 分析ジョブ
- `profiles` - ユーザープロファイル

## 設定

- **最大同時ジョブ数**: 1（キュー実装で設定可能）
- **クローラー設定**: 最大リクエスト数 20、リトライ 2 回、最大同時実行数 10
- **CORS**: localhost:3000 で有効

## トラブルシューティング

### よくある問題

1. **ポート競合**: ポート 3000、5050、8080 が利用可能であることを確認
2. **Supabase 接続**: 環境変数が正しく設定されていることを確認
3. **認証問題**: Supabase Auth と Google OAuth 設定を確認

### ログ

デバッグ用のサービスログを確認：

- クローラーバックエンド: Fastify サーバーのコンソール出力
- SEO チェッカー: Webhook 処理のコンソール出力
- フロントエンド: ブラウザコンソールと Nuxt.js ログ

## 貢献

1. リポジトリをフォーク
2. フィーチャーブランチを作成
3. 変更を実装
4. 型チェックを実行: 各ディレクトリで`npm run typecheck`
5. プルリクエストを提出

## ライセンス

[Your License Here]
