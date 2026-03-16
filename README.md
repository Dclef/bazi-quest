# BAZI-QUEST

基于传统八字口诀与盲派资料整理的静态调查问卷站点。

项目当前包含一个可直接发布到 GitHub Pages 的前端站点，目录位于 [survey](./survey)。站点会根据用户输入的出生信息自动排盘，并按八字特征动态匹配题目，用于收集学业、事业、婚姻、财运、健康、性格等维度的数据。

## 项目特点

- 自动排盘：基于 `lunar-javascript` 计算四柱、十神、五行、刑冲合害、格局、身强弱。
- 动态出题：按八字特征筛题，避免命局无财却大量问财、无印却反复问印。
- 题库来源：盲派资料、传统口诀与现有问卷题库整理。
- 结果统计：支持个人结果页和公共统计页。
- 静态部署：无需构建，可直接发布到 GitHub Pages。

## 目录结构

```text
.
├─ survey/                  # GitHub Pages 站点目录
│  ├─ index.html            # 首页
│  ├─ quiz.html             # 调查问卷页
│  ├─ result.html           # 结果页
│  ├─ stats.html            # 公共统计页
│  ├─ 404.html              # Pages 404 页面
│  ├─ robots.txt            # 搜索引擎抓取规则
│  ├─ .nojekyll             # 禁用 Jekyll 处理
│  ├─ css/
│  └─ js/
├─ .github/workflows/
│  └─ pages.yml             # GitHub Pages 自动发布工作流
└─ .gitignore
```

## 本地使用

本项目是纯静态页面，不需要构建。

直接打开 `survey/index.html` 即可预览



