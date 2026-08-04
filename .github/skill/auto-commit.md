# Auto Commit

這個 skill 檔案說明如何自動產生 commit 訊息，並提醒使用者在提交前檢查變更內容。

建議流程：

1. 使用 `git status` 確認已追蹤變更。
2. 使用 `git add .` 將變更加入暫存區。
3. 使用 `git commit -m "Auto commit: 說明此次變更"` 進行提交。

請注意：

- 自動 commit 應保留可讀的 commit 訊息。
- 避免提交未完成或錯誤的程式碼。
- 只對需要保存的變更進行 commit。
