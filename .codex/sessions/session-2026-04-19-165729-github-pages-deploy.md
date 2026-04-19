# 會話紀錄

- 時間：`2026-04-19 16:57:29 +0800`
- 主題：GitHub Pages 部署後白畫面，瀏覽器請求 `/src/pages/overview/main.jsx` 404
- Todo：
  - 確認 GitHub Pages 發佈來源是否指向 GitHub Actions
  - 確認 Vite `base` 與 repo 名稱是否一致
  - 視需要補強部署說明文件
- 影響檔案：
  - `.codex/sessions/session-state.md`
  - `.codex/sessions/session-2026-04-19-165729-github-pages-deploy.md`
  - `src/pages/advice/AdvicePage.jsx`
- 目前狀態：
  - 已確認 `.github/workflows/deploy.yml` 與 `vite.config.js` 設定正確
  - 目前根因指向 GitHub Pages 後台仍在直接發佈原始碼分支，而不是 Actions 建置產物
  - GitHub Pages 已重新部署成功
  - 已新增建議頁右上角外部連結，指向 `https://mzoxo.github.io/price-compare/`
  - 已新增建議頁日幣金額快速清除按鈕，點擊可清空輸入值
