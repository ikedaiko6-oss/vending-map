# セットアップ手順

## 1. 環境変数の設定

`.env.local` に以下を記入：

```
NEXT_PUBLIC_SUPABASE_URL=     ← SupabaseダッシュボードのProject URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= ← anon/public キー
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY= ← Google Maps APIキー
```

---

## 2. Supabase の設定

### 2-1. vending_machines テーブルの確認・修正

Supabase ダッシュボード → **Table Editor** で `vending_machines` を開き、
以下のカラムがあることを確認（なければ追加）：

| カラム名 | 型 | その他 |
|---|---|---|
| id | uuid | PK, default: gen_random_uuid() |
| created_at | timestamptz | default: now() |
| name | text | not null |
| lat | float8 | not null |
| lng | float8 | not null |
| note | text | nullable |
| user_id | uuid | nullable, references auth.users(id) |

### 2-2. RLS（Row Level Security）の設定

**SQL Editor** で以下を実行：

```sql
-- RLS を有効化
ALTER TABLE vending_machines ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧できる
CREATE POLICY "誰でも閲覧可" ON vending_machines
  FOR SELECT USING (true);

-- ログイン済みユーザーだけ登録できる
CREATE POLICY "ログイン済みが登録可" ON vending_machines
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 自分が登録した自販機だけ削除・編集できる（任意）
CREATE POLICY "自分の自販機を編集可" ON vending_machines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "自分の自販機を削除可" ON vending_machines
  FOR DELETE USING (auth.uid() = user_id);
```

### 2-3. Google OAuth の設定

1. Supabase ダッシュボード → **Authentication** → **Providers** → **Google** をクリック
2. **Enable** をオン
3. 後述の Google Cloud Console から取得した値を入力：
   - Client ID
   - Client Secret
4. **Callback URL** をコピーしておく（次のステップで使う）

---

## 3. Google Cloud Console の設定

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. プロジェクトを選択（または新規作成）
3. **APIとサービス** → **認証情報** → **認証情報を作成** → **OAuth クライアントID**
4. アプリケーションの種類：**ウェブアプリケーション**
5. **承認済みのリダイレクトURI** に Supabase の Callback URL を追加
   - 例：`https://xxxxxx.supabase.co/auth/v1/callback`
6. 作成後に表示される **クライアントID** と **クライアントシークレット** を Supabase に入力

---

## 4. Google Maps API キーの取得

1. Google Cloud Console → **APIとサービス** → **ライブラリ**
2. **Maps JavaScript API** を有効化
3. **認証情報** → 既存のAPIキーを使うか新規作成
4. （推奨）APIキーに **HTTP リファラー制限** を設定
5. `.env.local` の `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` に設定

---

## 5. 起動

```bash
npm run dev
```

→ http://localhost:3000 で確認
