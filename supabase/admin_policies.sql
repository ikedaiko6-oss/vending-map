-- 1) 既存ポリシーを更新
DROP POLICY IF EXISTS "自分の自販機を編集可" ON vending_machines;
DROP POLICY IF EXISTS "自分の自販機を削除可" ON vending_machines;
DROP POLICY IF EXISTS "自分または管理者が編集可" ON vending_machines;
DROP POLICY IF EXISTS "自分または管理者が削除可" ON vending_machines;

-- 2) 管理者メール（JWT claim）で判定
--    UUID確認不要。必要ならメールだけ差し替えて実行。
CREATE POLICY "自分または管理者が編集可" ON vending_machines
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR lower(auth.jwt() ->> 'email') IN (
      'ikedaiko1@gmail.com',
      'ikedaiko6@gmail.com'
    )
  );

CREATE POLICY "自分または管理者が削除可" ON vending_machines
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR lower(auth.jwt() ->> 'email') IN (
      'ikedaiko1@gmail.com',
      'ikedaiko6@gmail.com'
    )
  );
