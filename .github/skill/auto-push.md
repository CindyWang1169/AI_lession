# Auto Push

這個 skill 檔案說明如何自動推送 commit 到遠端儲存庫。

建議流程：

1. 確認本地 commit 已經完成。
2. 使用 `git push` 將本地分支推送到遠端。
3. 如果遇到衝突，先拉取遠端變更 `git pull`，再解決衝突後重新 commit 並 push。

請注意：

- 推送前應該確認遠端分支名稱與本地分支一致。
- 若是第一次推送，可能需要使用 `git push -u origin <branch>`。
