# 零点交易所 V2 · 街区回声

2096 年，新京都地下街。你用 1000 ₡ 开了一间二手当铺：听顾客的故事，判断旧物价值，讨价还价，让招牌继续亮着。

原创、中文、单机经营游戏。原生 HTML/CSS/JavaScript；运行时没有外部依赖、账号系统、付费 API 或追踪服务。优先为 iPad Safari 触控设计。

**立即游玩：[零点交易所](https://pakhoz.github.io/zero-hour-exchange/)**

V2 延续原来的经营循环，增加会回访的街区剧情、收藏图鉴、可选合成音效和连续的店铺动画。V1 存档可以直接续玩。测试和部署结果见 [GitHub Actions](https://github.com/Pakhoz/zero-hour-exchange/actions)，更新详情见 [V2 更新说明](docs/V2.md)。iPad 真机安装与系统交互仍需实机验收。

## 开始游玩

1. 顾客出售时，你可以输入报价、接受对方报价，或拒绝。求购顾客则会购买你的库存。
2. 每天初始接待 6 位顾客。成交或离开后，点击「接待下一位」。
3. 收购低于合理市价的商品；在库存中查看详情、筛选排序，必要时快速出售换取现金。
4. 可疑商品可能是假货。市场估价未必是真实价格；购买光谱鉴定仪可揭示真伪。
5. 每 7 天打烊时收租，第一期 650 ₡，以后增加 8%。必须保留足够现金，库存不能自动抵租。
6. 「结束营业」显示收入、支出和已实现商品利润，确认后进入下一天。到期付不起租金则停业。
7. 点击顾客或「聊聊来历」可增加耐心并松动心理价；请热饮需要 10 ₡，每位顾客只能用一次。点击柜台商品进行观察。
8. 点击收音机或「街区故事」回应来访。某些决定会在后续日期得到回报，所有花费和效果都在选择前标明。
9. 图鉴自动记录见过、收购过、鉴定过的商品种类，出售后不会丢失记录。
10. 音效默认关闭。顶部点击「♪ 音效关」开启；设置中可调整音量、雨声和电流声。

## 本地运行

需要 Node.js 22+（建议 24）。无运行时依赖；构建和核心测试不需要 npm。

```sh
node scripts/build.mjs
node scripts/serve.mjs
```

打开 <http://127.0.0.1:4173/>。请用 HTTP 服务，不要直接双击 HTML（模块和 Service Worker 需要正常源）。修改源码后重新构建。已有 Service Worker 会继续使用旧缓存；关闭所有游戏窗口后重开，或在浏览器开发工具中注销本地 Service Worker。

完整开发与测试：

```sh
npm ci
npm test
npm run build
npx playwright install chromium webkit
npm run test:browser
npm run dev
```

在 Linux CI 中安装浏览器系统依赖：`npx playwright install --with-deps chromium webkit`。

## 已实现

- 五种顾客性格、两种交易目的、隐藏心理价、耐心、还价与接近底价时的接受概率。
- 交易唯一 ID 与同步状态转换；防重复结算、超额收购、满仓和正在议价商品被快速出售。
- 十种原创商品，五个类别；品质、真假、进货成本、行情估值、商品详情和真实价值 78% 的回收价格。
- 每日行情、现金账本、已实现利润、租金递增、停业与备份后重开。
- 扩展货架（每级 +6 格）、鉴定设备、柜台（每级 +2 位顾客与新顾客耐心 +1）。
- 自动存档、独立手动快照、导出/导入 JSON、重置备份与恢复、版本和数据校验、存储错误提示。
- Web Locks 避免多个标签页互相覆盖存档；不支持 Web Locks 的浏览器通过 storage 事件检测其他窗口写入并停止操作。
- 原创 CSS/SVG 像素店铺、五种顾客造型、商品图标、触控反馈、安全区域、横竖屏布局和减少动画偏好。
- 保持场景 DOM 的更新方式，避免报价时整页重绘；开门、走入、离场、摆放商品、交易转移、呼吸、眨眼、手势、热饮蒸汽和窗外交通。
- 六个主线街区事件和循环电台来信，信任与选择记录会影响后续回访；剧情现金变动计入账本。
- 十种商品的永久图鉴，含发现日期、收购记录、鉴定记录与最佳品质。
- 不依赖音频素材的 Web Audio 合成音效与环境声；默认静音，手动开启，后台暂停。
- PWA、PNG 图标、相对资源路径、构建哈希缓存版本和离线核心资源。

## 文件结构

```text
index.html / play.html       游戏入口（play.html 由构建同步）
styles.css                  响应式界面与原创像素场景
v2.css                      V2 动画、互动场景、图鉴与故事界面
src/core.js                 可独立测试的游戏状态和交易状态转换
src/app.js                  UI、交互、单标签页锁与存档操作
src/storage.js              存档读写和校验入口
src/art.js                  原创 SVG 顾客与商品
src/stories.js              剧情内容、分支、回访和限日效果
src/audio.js                手动开启的合成音效与环境声
src/motion.js               连续 DOM 更新和表现层动画
assets/                    SVG 和构建生成的 PNG 应用图标
manifest.webmanifest       PWA 应用元数据
sw.js                      核心资源缓存；构建时注入内容哈希
scripts/build.mjs          无依赖静态构建、PNG 编码和版本生成
scripts/serve.mjs          本地静态预览服务
tests/core.test.mjs        规则、保存、经济平衡和 14 天模拟
tests/v2.test.mjs          V1 迁移、互动、图鉴和剧情状态回归
tests/fixtures/v1-save.json 由真实 V1 引擎生成的待成交存档
tests/browser.mjs          Chromium/WebKit 真实浏览器交互和截图
.github/workflows/pages.yml 自动测试、构建与 GitHub Pages 部署
docs/AUTHENTICATION.md     认证边界、请求流程、凭据和令牌说明
```

`dist/` 是完整的正式静态产物，不包含测试、npm 包或凭据。`test-results/` 保存截图与浏览器报告，两者均不提交到 Git。

## 存档与离线

每次状态变化同步写入 `localStorage`。沿用 V1 的键 `zero-hour-exchange.v1`；独立手动快照为 `zero-hour-exchange.manual.v1`；重置前备份为 `zero-hour-exchange.before-reset.v1`。内容版本已升级为 2，保留原有日期、现金、商品、升级、租金、顾客谈判、市场、随机数状态、统计与账本，并新增图鉴、剧情与每位顾客的互动标记。

读取合法 V1 存档时先在内存中迁移，不改变随机数、日期或正在进行的谈判。第一次写回前，将原始 V1 字节备份到 `zero-hour-exchange.original-v1:<原存档键>`；备份失败则不覆盖旧档。自动存档、手动读取、重置备份读取与 JSON 导入均支持 V1。迁移只补回现存库存和当前顾客能证实的图鉴信息，V1 未记录的历史已售商品无法凭空恢复。音频偏好另存于 `zero-hour-exchange.audio.v2`。

损坏或不兼容存档不会被启动时自动覆盖；界面提示导出原存档。导入前检查 JSON、文件体积和状态结构。存储被拒绝或已满时游戏仍可运行，但必须导出当前进度防止刷新丢失。清理 Safari 网站数据会删除本地进度。

在 HTTPS 页面首次完成加载后，Service Worker 缓存全部核心资源。新构建用源码内容哈希隔离缓存；新 worker 等待旧页面关闭，不强制中途更新。激活后删除旧版本缓存，不修改存档。离线模式不提供云同步。

iPad：Safari 打开 HTTPS 地址 → 分享 → 添加到主屏幕。安装不是游玩的前提。Safari 的安装、存储回收、真实触控键盘与系统安全区域仍需要实机验收。

## 测试与边界

核心测试包含初始资金、买卖账目、议价失败、资金不足、满仓、日结、第 7 天租金、破产、双击等价动作、升级、市场、保存恢复、损坏数据、存储配额异常，以及 **30 个随机种子 × 14 天** 的可观察报价策略模拟。

浏览器脚本测试正式构建，并放在 `/zero-hour-exchange/` 子路径下，覆盖桌面 Chromium、WebKit 的 1366×1024 / 1024×1366 / 768×1024 触控视口，以及 390×844 Chromium 手机视口。执行真实点击、双击、存档刷新、详情弹窗、筛选排序、升级、日结、重置取消、旋转、第二标签页保护和无服务器缓存恢复，生成截图。V2 另验证旧档升级、场景节点持续存在、实际移动中的顾客、动画中刷新、点击场景道具、剧情结算、图鉴、音频上下文/静音/偏好以及减少动画模式，并录制桌面交互视频。自动化能验证音频节点运行，不能代替实际 iPad 扬声器听感验收。

WebKit 自动化存在 `setOffline(true)` 拒绝 Service Worker 响应的已知问题，因此测试会**真正停止本地服务器并断言网络请求失败**，再检查刷新由 Service Worker 响应。Chromium 同时开启网络离线模拟。参考 [Playwright #42775](https://github.com/microsoft/playwright/issues/42775)。这不是 iPad 真机 Safari 测试，不能替代实机安装和手势验收。

## GitHub Pages

目标仓库：<https://github.com/Pakhoz/zero-hour-exchange>。

工作流在 `main` 推送或手动触发时先测试，再发布 `dist/`；PR 只测试，不部署。首次启用需要仓库 **Settings → Pages → Build and deployment → Source: GitHub Actions**。工作流拥有最小权限：构建读取代码，部署获得 `pages: write` 和 `id-token: write`，无需在仓库中放 PAT。

发布地址由成功运行的 `deploy` job 输出；仅存在配置不代表已经上线。部署方式依据 [GitHub 官方自定义 Pages 工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

所有页面、模块、图标、manifest 和缓存路径均相对当前目录，支持 GitHub 仓库子路径。

## 后续候选

可以继续加入有姓名的常客关系、更多旧物和剧情、难度选项；云同步和账号应作为独立、可选功能设计。
