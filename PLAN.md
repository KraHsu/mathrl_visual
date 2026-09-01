# Mathematical Foundations of Reinforcement Learning 可视化站点实施计划

> 文档状态：Draft 2（中英双语为 v1 硬性要求）
> 编制日期：2026-09-02
> 项目类型：纯静态、交互式教材/伴读站点
> 核心技术栈：Rust + WebAssembly + Vue 3 + VitePress
> 当前实施状态：第一章 11 对双语页面与 8 视图 Grid World 工作台已完成技术实现；内容仍为 draft，G1 继续进行人工译审、跨浏览器覆盖和部署演练。

## 1. 执行摘要

本项目将《Mathematical Foundations of Reinforcement Learning》设计为一个可阅读、可实验、可复现、可离线使用的交互式数学强化学习站点。

v1 必须同时交付简体中文和英文，不把英文仅作为未来预留能力。两种语言共享同一套算法、实验状态和稳定内容 ID，但正文、界面、搜索索引、SEO 元数据与无障碍文案分别构建和审核。

推荐架构为：

> VitePress 预渲染教材 + Vue 交互组件 + Dedicated Web Worker 中运行的 Rust/Wasm 数值引擎

最终部署制品只包含 HTML、CSS、JavaScript、WebAssembly、JSON、字体和图片，不需要运行时服务器、数据库或后端 API，可部署至 GitHub Pages、Cloudflare Pages 或任意对象存储/CDN。

项目不能被设计成简单的 PDF 阅读器。核心产品价值来自：

- 公式、伪代码、环境和数值变化的同步展示；
- 可单步执行、暂停、重置和复现的强化学习实验；
- 贯穿全书的一致 Grid World 教学环境；
- 可在同一语义页面间无损切换的简体中文/英文双语体验；
- 从 Bellman 方程到 Actor-Critic 的统一算法追踪模型；
- 无 JavaScript 或 Wasm 加载失败时仍可阅读的静态正文；
- 本地进度、实验预设、离线章节和可分享配置。

当前最大的前置约束不是技术，而是内容授权。上游仓库未提供开放许可证和完整书稿源文件，因此项目在取得明确书面授权前，必须以“非官方原创交互式伴读”模式发布。

双语要求不改变这一边界：英文原文再发布权与中文翻译权需要分别确认；在授权未决时，中英文内容都必须按原创伴读模式生产，或只翻译项目自身明确允许翻译的原创内容。

## 2. 已确认的上游事实

截至 2026-09-01，上游仓库是成品资料分发仓库，而不是可继承的书稿或网站工程：

```text
Book-Mathematical-Foundation-of-Reinforcement-Learning/
├── Book-all-in-one.pdf
├── 按目录、前言、10 章、附录和勘误拆分的 PDF
├── Lecture slides/
│   ├── slidesContinuouslyUpdated/
│   └── slidesForMyLectureVideos/
├── Code for grid world/
│   ├── python_version/
│   └── matlab_version/
├── Readme_Images/
└── Readme.md
```

已确认：

- 正文、公式、证明和绝大多数插图只存在于 PDF 中；
- 没有书稿 `.tex`、章节 Markdown、独立公式源或书内插图源；
- 讲义也只有 PDF，README 仅说明可联系作者索取讲义 LaTeX；
- 官方代码仅提供 Python/MATLAB Grid World 环境和绘图脚手架；
- 官方明确没有提供全书算法实现；
- 没有 Cargo、npm、测试、构建、GitHub Pages 或发布流程；
- 仓库根目录没有 `LICENSE`，GitHub license API 返回 404；
- 出版页面标注本书为 2025 年出版物，版权信息指向清华大学出版社；
- 上游没有稳定的 tag/release 体系，应通过 commit、blob 和文件 hash 锁定版本。

参考资料：

- [上游仓库](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning)
- [固定版本完整文件树](https://api.github.com/repos/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/git/trees/0e348961c28496096d308f1066009266b3674c5a?recursive=1)
- [Grid World 说明](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/tree/main/Code%20for%20grid%20world)
- [许可证讨论](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/discussions/22)
- [GitHub 关于无许可证仓库的说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [Springer 书籍页](https://link.springer.com/book/10.1007/978-981-97-3944-8)

## 3. 产品模式与授权闸门

### 3.1 两种发布模式

| 模式 | 启用条件 | 可发布内容 |
| --- | --- | --- |
| 原创交互伴读 | 默认模式；授权尚未解决 | 中英文分别原创，或先创作一种语言再按自有许可证翻译；独立绘图、独立实现算法、章节/页码引用、上游 PDF 链接 |
| 完整在线版 | 作者及实际权利方书面授权，并取得可用源文件 | 正文、证明、公式排版、插图、翻译、离线内容包和交互组件 |

### 3.2 完整在线版授权清单

上线前应书面确认以下权利：

- 正文重新排版和公开托管；
- 公式、定理、证明、表格和练习的再现；
- 原始插图或改编插图的使用；
- 中英文翻译和其他衍生内容；
- 讲义内容及其 LaTeX 源文件；
- Grid World 代码的移植和再发布；
- PWA 离线缓存和离线内容包；
- 项目名称、封面和品牌元素的使用；
- 允许采用的内容许可证、署名格式和撤回机制。

项目代码和教材内容必须分开授权：

- 自研代码建议使用 `MIT OR Apache-2.0`；
- 原创伴读内容可单独选择 Creative Commons 许可证；
- 获授权的原书内容严格遵循权利方给出的许可证；
- 使用 `LICENSE-CODE`、`LICENSE-CONTENT`、`NOTICE` 和 `RIGHTS.md` 分别记录。

双语权利状态按 locale 记录。每个页面都要说明它是原书获授权再现、获授权翻译、项目原创，还是项目原创内容的翻译；不能因为某一语言可以发布，就推定另一语言自动拥有翻译或再发布权。

任何 `rights` 状态不明确的正文、图片或代码，都不得进入生产构建。该约束应由 CI 强制执行，而不是依赖人工记忆。

## 4. 目标与非目标

### 4.1 v1 目标

- 覆盖全书 10 章及附录的交互式学习路径；
- 简体中文与英文均为 v1 正式交付语言，章节、实验、导航和帮助内容保持功能对等；
- 两种语言分别完成数学、语言和可访问性审核，并支持同页语言切换；
- 每章至少一个高质量旗舰实验；
- 公式、伪代码、数值和图形同步；
- 所有随机实验支持固定种子复现；
- 两种语言分别具备静态 HTML 首屏、SEO、全文搜索和可打印页面；
- 纯静态部署，不依赖运行时后端；
- 阅读进度、收藏和实验预设本地保存；
- 当前语言与中英双语两种章节级离线能力；
- WCAG 2.2 AA 级别的可访问性目标；
- 明确显示内容版本、引擎版本和对应上游版本。

### 4.2 v1 非目标

- 不做未经授权的 PDF 全文转换和再发布；
- 不提供账号、服务端进度同步和评论系统；
- 不在浏览器内运行大型 DQN 或通用深度学习训练；
- 不执行用户输入的任意代码；
- 不默认使用 Wasm 共享内存多线程；
- 不复制未经授权的第三方算法实现；
- 不依赖运行时 CDN 下载字体、MathJax、Wasm 或图表库；
- 不自动发布上游 PDF 变化；
- v1 不承诺简体中文和英文之外的第三种语言，但架构不得阻止后续扩展。

## 5. 总体技术架构

```text
构建阶段
────────────────────────────────────────────────────────
中英 Markdown / 内容元数据 ──► VitePress ──► 双语静态 HTML/CSS/搜索索引
Rust Core ──► wasm-bindgen / wasm-pack ──► JS glue + .wasm
实验配置 / 静态图 / 版本清单 ───────────► dist/

浏览器运行阶段
────────────────────────────────────────────────────────
预渲染正文
    │
    └─ 用户打开实验
          ▼
       Vue 组件
          │ postMessage
          ▼
 Dedicated Web Worker
          │ wasm-bindgen JS glue
          ▼
      Rust/Wasm 引擎
          │ Snapshot + TraceEvent + TypedArray
          ▼
   Vue SVG / Canvas / HTML 可视化
          │
          └─ IndexedDB：进度、收藏、实验预设
```

### 5.1 内容和站点层

采用当前稳定版 VitePress、Vue 3 和 TypeScript：

- Markdown 在构建期生成真实静态 HTML；
- 每一节拥有独立、可索引、可分享的 URL；
- 简体中文与英文使用独立 locale 路由，并通过稳定内容 ID 建立一一映射；
- VitePress `locales` 负责路由、文档 `lang` 和主题导航，Vue I18n 的类型化消息目录负责自定义组件与实验 UI；
- Vue 组件可直接嵌入 Markdown；
- 仅包含实验的页面加载对应交互代码；
- 公式使用 `markdown-it-mathjax3`；
- 搜索使用 VitePress 本地 MiniSearch，按语言生成独立索引；
- UI 文案、实验文案、SEO 元数据和无障碍标签由 locale 资源分别提供；
- 浏览器 API、Worker 和 Wasm 只在组件挂载后初始化；
- 无 JavaScript 时仍保留正文、公式、静态图和链接。

生产环境锁定稳定版本及 lockfile，不直接追踪 alpha/next 版本。

参考：

- [VitePress 架构](https://vuejs.github.io/vitepress/v1/guide/what-is-vitepress)
- [在 Markdown 中使用 Vue](https://vuejs.github.io/vitepress/v1/guide/using-vue)
- [VitePress SSR 兼容性](https://vuejs.github.io/vitepress/v1/guide/ssr-compat)
- [VitePress 数学公式](https://vuejs.github.io/vitepress/v1/guide/markdown#math-equations)
- [VitePress 本地搜索](https://vuejs.github.io/vitepress/v1/reference/default-theme-search#local-search)

### 5.2 Rust/Wasm 层

采用 Rust stable、`wasm32-unknown-unknown`、`wasm-bindgen` 和 `wasm-pack --target web`。

原则：

- Rust 只负责数学模型、算法、随机过程和轨迹采样；
- Rust 不直接操作 DOM、SVG 或 Canvas；
- 核心 crate 不依赖浏览器 API；
- Wasm crate 仅负责稳定 ABI 和错误转换；
- 计算在 Dedicated Module Worker 中执行；
- JS/Wasm 边界使用批量调用，禁止逐状态高频跨边界调用。

参考：

- [wasm-bindgen](https://wasm-bindgen.github.io/wasm-bindgen/)
- [wasm-bindgen 部署目标](https://wasm-bindgen.github.io/wasm-bindgen/reference/deployment.html)
- [Vite Web Worker](https://vite.dev/guide/features#web-workers)
- [Web Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)

### 5.3 可视化层

- Grid World、策略箭头、转移关系和较小的图：SVG；
- 高频轨迹、散点和长收敛曲线：Canvas 2D；
- 公式解释、数值表格、控件和无障碍语义：Vue/HTML；
- 动画时钟由 `requestAnimationFrame` 驱动；
- Worker 只输出数据和语义事件，不控制动画；
- Canvas 图必须提供相同数据的表格或可复制摘要。

## 6. 推荐仓库结构

```text
mathrl-visual/
├── Cargo.toml
├── Cargo.lock
├── rust-toolchain.toml
├── crates/
│   ├── mathrl-core/
│   │   └── src/
│   │       ├── mdp/
│   │       ├── env/gridworld.rs
│   │       ├── policy/
│   │       ├── algorithms/
│   │       │   ├── bellman.rs
│   │       │   ├── dynamic_programming.rs
│   │       │   ├── monte_carlo.rs
│   │       │   ├── stochastic_approximation.rs
│   │       │   ├── temporal_difference.rs
│   │       │   ├── approximation.rs
│   │       │   ├── policy_gradient.rs
│   │       │   └── actor_critic.rs
│   │       ├── trace/
│   │       ├── rng.rs
│   │       └── validation.rs
│   ├── mathrl-wasm/
│   │   └── src/lib.rs
│   └── contentctl/
│       └── src/main.rs
├── site/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── docs/
│       ├── .vitepress/
│       │   ├── config.ts
│       │   ├── theme/
│       │   ├── components/
│       │   ├── composables/useExperiment.ts
│       │   ├── workers/rl.worker.ts
│       │   ├── protocol.ts
│       │   ├── i18n/
│       │   │   ├── ui.zh-Hans.json
│       │   │   ├── ui.en.json
│       │   │   └── glossary.yaml
│       │   └── generated/
│       │       ├── wasm/
│       │       └── locale-manifest.json
│       ├── zh-Hans/
│       │   ├── learn/
│       │   ├── labs/
│       │   └── concepts/
│       ├── en/
│       │   ├── learn/
│       │   ├── labs/
│       │   └── concepts/
│       ├── shared/lab-configs/
│       └── public/
├── schemas/
│   ├── lab.v1.schema.json
│   └── content.v1.schema.json
├── tests/
│   ├── golden/
│   ├── e2e/
│   └── accessibility/
└── .github/workflows/
```

职责边界：

- `mathrl-core`：纯 Rust 领域模型、算法、验证和事件追踪；
- `mathrl-wasm`：WebAssembly ABI、序列化和错误映射；
- `contentctl`：内容 ID、双语配对、引用、授权、版本、术语和资源校验；
- `site/docs`：VitePress 内容、主题、Vue 组件和 Worker；
- `site/docs/.vitepress/i18n`：中英文 UI 文案、术语表和搜索别名；
- `site/docs/shared/lab-configs`：与自然语言无关、被两个 locale 共用的实验默认配置；
- `schemas`：内容与实验配置契约；
- `tests/golden`：小型 MDP 的人工推导标准答案。

## 7. Rust 引擎设计

### 7.1 核心领域对象

- `Mdp`：状态、动作、转移概率、奖励和折扣因子；
- `GridWorld`：尺寸、起点、障碍、终止状态和奖励配置；
- `Policy`：确定性或随机策略；
- `Experiment`：算法、运行状态、种子和指标；
- `Snapshot`：给可视化层使用的数值快照；
- `TraceEvent`：给教学动画使用的语义事件；
- `ValidationError`：结构化输入错误；
- `EngineVersion`：协议和数值实现版本。

### 7.2 运行模型

算法统一支持两种模式：

- `trace`：逐步产生 `Transition`、`ValueUpdated`、`PolicyUpdated`、`EpisodeEnded` 等事件；
- `batch`：批量执行，按指定频率返回收敛指标和抽样快照。

建议核心抽象：

```rust
pub trait Steppable {
    fn advance(&mut self, work_budget: usize, trace: TraceLevel)
        -> Result<StepBatch, EngineError>;
    fn snapshot(&self) -> Snapshot;
    fn reset(&mut self, seed: Seed) -> Result<(), EngineError>;
}
```

Wasm 侧只暴露粗粒度 API：

```text
create(config)
advance(stepCount, traceLevel)
snapshot()
reset(seed)
dispose()
```

### 7.3 数值和存储选择

- 表格型 MDP 使用连续 `Vec<f64>`、`Vec<u32>` 和紧凑转移表；
- 默认使用 `f64` 保持残差和收敛展示的一致性；
- 小型 Bellman 线性方程可使用不依赖 BLAS 的 `nalgebra` LU 求解；
- 不默认引入 BLAS、LAPACK、Rayon 或大型深度学习框架；
- DQN 只实现教学型小网络，或使用预计算检查点辅助展示；
- 所有配置由 Rust 再次验证，不能只信任 Vue 表单校验。

### 7.4 随机性与复现

- 使用固定算法 RNG，例如 `ChaCha8Rng`；
- 不使用 `StdRng` 或 `Math.random()` 作为实验真值来源；
- 种子以十六进制字符串跨 JS/Rust 传输；
- 分享链接、导出文件和快照记录种子；
- 同时记录引擎版本、算法版本、参数和内容版本；
- 浮点结果以明确容差比较，不要求跨所有平台逐 bit 相同。

## 8. Worker 协议

### 8.1 为什么使用 Worker

Wasm 在主线程运行仍会阻塞 UI。默认将 Wasm 实例化在 Dedicated Module Worker 中，使计算和渲染隔离。

```ts
const worker = new Worker(
  new URL('./rl.worker.ts', import.meta.url),
  { type: 'module' },
)
```

### 8.2 取消与暂停

Worker 在一次同步 Wasm 调用返回前不能处理新消息。因此算法必须分块执行：

1. 执行固定数量工作；
2. 将控制权返回 Worker；
3. 让出事件循环；
4. 检查 pause/cancel；
5. 再开始下一块。

目标是将单块计算控制在约 5–10ms，并把进度消息控制在每秒约 10–20 次。

### 8.3 版本化消息示例

```ts
type WorkerRequest =
  | {
      v: 1
      runId: string
      kind: 'start'
      config: ExperimentConfig
    }
  | {
      v: 1
      runId: string
      kind: 'command'
      command: 'pause' | 'resume' | 'cancel' | 'reset'
    }

type WorkerResponse =
  | {
      v: 1
      kind: 'ready'
      engineVersion: string
      capabilities: { wasm: true; sharedMemoryThreads: boolean }
    }
  | {
      v: 1
      runId: string
      kind: 'progress'
      sequence: number
      iteration: number
      residual: number
      values?: Float64Array
      policy?: Uint16Array
      events?: TraceEvent[]
    }
  | {
      v: 1
      runId: string
      kind: 'complete'
      values: Float64Array
      policy: Uint16Array
    }
  | {
      v: 1
      runId?: string
      kind: 'error'
      code: string
      message: string
      recoverable: boolean
    }
```

约束：

- 控制面小对象使用 `serde-wasm-bindgen`；
- 数据面使用 TypedArray；
- Worker 先将结果从 WebAssembly 线性内存复制到独立的 JavaScript TypedArray，再 transfer 该数组的 backing `ArrayBuffer`；
- TypedArray 本身不是 transferable，指向 WebAssembly 线性内存的视图及其内存也不得直接 transfer；
- 每次 `start` 创建唯一 `runId`，后续命令和结果都用它指向同一次运行；
- 每个进度结果同时包含递增的 `sequence`；
- Vue 丢弃非当前 `runId` 或 `sequence` 小于等于已处理值的结果；
- 页面离开时终止 Worker，整体释放 Wasm 内存。

## 9. 内容生产管线

### 9.1 总流程

```text
固定上游 commit/blob/hash
  → 权利清单检查
  → 原创内容编写，或授权后的 LaTeX/人工迁移
  → 语义内容和稳定 ID
  → 源语言定稿与数学审核
  → 另一语言翻译或独立撰写
  → 双语语言审核与数学一致性审核
  → 绑定实验 ID
  → contentctl 校验权利、引用、术语和 locale parity
  → VitePress + Rust/Wasm 构建
  → 中英双语纯静态 dist 制品
```

### 9.2 获得 LaTeX 源文件时

- 使用 LaTeXML、Pandoc 或定制转换器生成中间内容；
- 保留 LaTeX label 作为优先稳定 ID；
- 自定义宏、TikZ、证明环境和交叉引用单独处理；
- 转换结果不能直接视为已审核正文；
- 人工编辑、翻译和实验绑定放在 overlay 中，避免同步时被覆盖；
- 图片优先转换为可访问的 SVG，并保存权利元数据。

### 9.3 只有 PDF 时

PDF 抽取只能作为取得授权后的编辑初稿：

- 抽取目录、文字和页码；
- 公式逐式重录或人工比对；
- 灰框、证明、表格和交叉引用人工恢复；
- 图表重新生成可访问的 SVG；
- 每节按 locale 进行 PDF/Web 或源内容/Web 并排签审，并再次核对两种语言中的公式、编号和实验引用一致。

未取得授权时，不运行“PDF → 全文 Web”发布管线，而是在 Markdown 中独立撰写伴读内容。

### 9.4 页面元数据

```yaml
---
id: ch02-s04-bellman-equation
translation_key: ch02-s04-bellman-equation
title: Bellman 方程
locale: zh-Hans
origin: companion-translation
seo:
  title: Bellman 方程｜强化学习数学基础
  description: 通过 Grid World 交互理解 Bellman 方程。
translation:
  source_locale: en
  source_content_hash: sha256:SOURCE_CONTENT_HASH
  status: approved
  translator: translator-id
  reviewer: language-reviewer-id
  reviewed_at: 2026-09-02
source:
  upstream_commit: 5cfaa01
  pdf_pages: [20, 22]
rights:
  status: cleared
  basis: project-original-translation
review:
  content: approved
  language: approved
  math: approved
  accessibility: approved
labs:
  - bellman-grid-v1
---
```

构建规则：

- 无稳定 ID、`translation_key`、来源、审核状态或当前 locale 权利状态时失败；
- 公式、定理、图、实验和术语拥有独立 ID；
- 勘误以结构化 overlay 展示；
- 每个内容 ID 在构建清单中同时记录 `zh-Hans` 与 `en` 页面路径；
- 非源语言页面必须记录源 locale、源内容 hash、译者、语言审核人、审核日期和译审状态；
- 源内容变化后译文自动标记为 `stale`；
- 生产构建不得发布 `missing`、`draft` 或 `stale` 的必需双语页面；
- 预览构建缺失译文时明确显示回退语言和状态，不静默混排。

## 10. 信息架构与页面设计

### 10.1 路由

```text
/{locale}/
/{locale}/learn/ch02/bellman-equation
/{locale}/labs/bellman-grid
/{locale}/concepts/markov-property
/{locale}/map
/{locale}/symbols
/{locale}/search
/{locale}/offline
/{locale}/about/source-version
/{locale}/about/license
/{locale}/accessibility
```

v1 的 `{locale}` 只允许 `zh-Hans` 和 `en`。根路径 `/` 提供可索引的双语入口，并可在客户端依据用户已保存偏好或 `navigator.languages` 建议语言，但不做无法撤销的强制跳转。

语言切换器按稳定内容 ID 定位另一语言的等价页面，保留实验参数、随机种子和可共享 URL 状态。正文标题可以翻译，但路径 slug 和显式段落锚点保持跨语言稳定；如果预览环境中的对应译文尚未通过审核，应显示状态并让用户确认是否回退，而不是跳到该语言首页。

### 10.2 章节页布局

桌面端：

- 顶部：常驻、键盘可达的“中文 / English”切换器；
- 左栏：章节和学习路径导航；
- 中栏：正文、公式、证明、例题；
- 右栏：本节目录、实验状态和关键指标；
- 实验进入聚焦模式后使用“世界—数学—算法”三视图布局。

移动端：

- 顶栏保留语言切换入口，不藏入多级菜单；
- 正文单栏；
- 章节导航为抽屉；
- 实验控制为底部面板；
- 图表与数值表可切换；
- 所有拖拽操作都有按钮或表单替代。

### 10.3 统一实验契约

每个实验都必须包含：

1. 学习目标和先修概念；
2. 与章节对应的默认配置；
3. 参数解释和合法范围；
4. 固定随机种子；
5. 单步、运行、暂停、重置和速度控制；
6. 伪代码或公式同步高亮；
7. 图形之外的数值表和文字摘要；
8. 引导观察问题；
9. 可复制实验结果；
10. 可分享 URL；
11. 来源版本和算法版本；
12. 降级状态和错误恢复操作；
13. 中英文完整的参数、公式、图例、表格、错误信息、分享摘要和无障碍文案；
14. 语言切换后不重置当前配置、种子、步骤或运行结果。

## 11. 各章旗舰可视化

| 章节 | 核心实验与视图 |
| --- | --- |
| 1 基本概念 | Grid World 编辑器；状态、动作、奖励；策略箭头；轨迹与折扣回报时间线；Markov 性对比 |
| 2 Bellman 方程 | 一步期望展开；依赖图；矩阵形式；迭代策略评估；状态值热图和 Bellman 残差 |
| 3 Bellman 最优方程 | greedy 选择；最优值传播；折扣因子影响；收缩映射动态演示 |
| 4 Value/Policy Iteration | Value Iteration、Policy Iteration、Truncated PI 并排执行；策略和值函数演化 |
| 5 Monte Carlo | 首次/每次访问；回报分布；样本数量与方差；Exploring Starts；ε-greedy |
| 6 随机逼近 | Robbins–Monro；步长序列；带噪均值估计；SGD 损失面和收敛轨迹 |
| 7 TD 方法 | MC/TD backup；SARSA、n-step SARSA、Q-learning；on/off-policy 对比 |
| 8 值函数方法 | 特征映射；线性逼近；曲线拟合；经验回放和目标网络更新节奏 |
| 9 策略梯度 | softmax 策略面；目标函数曲面；REINFORCE 轨迹；baseline 降方差 |
| 10 Actor-Critic | actor/critic 信息流；advantage；重要性采样；离策略权重和确定性梯度 |
| 附录 | 概率分布；随机序列收敛；向量投影；梯度下降几何解释 |

贯穿全书的共享组件：

- `GridWorldEditor`；
- `PolicyArrows`；
- `ValueHeatmap`；
- `TrajectoryPlayer`；
- `ConvergencePlot`；
- `EquationStepper`；
- `PseudoCodeTrace`；
- `ExperimentControls`；
- `AccessibleDataTable`；
- `SeedAndSharePanel`。

## 12. 示例运行链路：Bellman 策略评估

用户点击“执行一轮”后：

1. Vue 校验输入并构造版本化实验配置；
2. `WorkerClient` 创建或复用当前页面的 Dedicated Worker；
3. Worker 初始化 Wasm，并创建带固定种子的 `Experiment`；
4. Rust 完成一次 Bellman sweep；
5. Rust 返回新值函数、策略、残差和 `ValueUpdated` 事件；
6. Worker 将独立 TypedArray buffer 转移给主线程；
7. Vue 更新值热图、策略箭头、收敛曲线和公式高亮；
8. 无障碍数值表同步更新；
9. `aria-live` 仅播报节流后的阶段性摘要；
10. IndexedDB 保存配置、种子、完成状态和必要检查点。

快速运行时重复使用相同算法路径，但降低 `TraceEvent` 详细程度，并对曲线数据在线降采样。

## 13. 本地数据、分享和隐私

### 13.1 本地存储

IndexedDB 保存：

- 章节完成状态；
- 收藏和个人笔记；
- 实验参数预设；
- 固定种子；
- 轻量检查点；
- 离线章节清单；
- 数据 schema 版本。

进度、收藏、笔记和实验预设以稳定内容 ID/实验 ID 为主键，不绑定 locale；切换语言后继续使用同一学习状态。笔记额外记录创建时的 locale，避免把用户的中英文笔记误判为待翻译正文。

localStorage 仅保存：

- 主题；
- 语言；
- 字体和动画偏好；
- 最近访问位置。

### 13.2 导入导出

- 支持 JSON 导入/导出学习进度；
- 导出文件包含 schema、`contentSetVersion` 以及两个 locale 的内容 hash；
- 导出使用语言中立的内容 ID，因此可以从中文界面导出并在英文界面导入；
- 导入时执行 migration 和边界校验；
- 实验配置通过 URL hash 分享，服务端看不到配置；
- 分享链接保留当前 locale 路径，但 hash 中只存语言中立的实验状态；接收者切换语言后配置不变；
- URL 参数必须设置长度和规模限制。

### 13.3 隐私默认值

- 不部署自有用户跟踪；
- 不嵌入需要登录的第三方服务；
- 视频默认只展示链接或点击加载占位符；
- 不向远端上传实验数据和笔记；
- 如未来加入遥测，必须显式 opt-in，并单独更新隐私说明。

## 14. PWA 与离线策略

PWA 与完整单双语离线包放在 G3 实施；G1/G2 先验证静态部署、语言切换与无 JavaScript 阅读，不把离线包作为出口条件。

| 资源 | 缓存策略 |
| --- | --- |
| 带 hash 的 JS、CSS、Wasm、字体 | Cache First，长期 immutable |
| HTML、搜索索引、版本清单 | Network First 或重新验证 |
| 内容寻址的图片/SVG | Cache First 或 Stale While Revalidate |
| 用户数据 | IndexedDB，带 schema migration |
| PDF、视频 | 不自动预缓存；仅提供链接或用户主动下载 |

行为要求：

- 首次阅读访问只缓存应用壳、当前章节和离线页，不下载 Wasm；
- 首次进入某个实验时按需请求并缓存该实验所需 Wasm，用户主动下载离线包时才提前缓存对应 Wasm；
- 提供“下载本章”和“下载全部伴读”操作，并允许选择当前语言或中英双语包；
- 下载前显示预计大小和剩余空间；
- Service Worker 发现新版本后提示用户；
- 保存当前实验状态后再由用户确认刷新；
- 不无条件 `skipWaiting`；
- 缓存版本同时绑定 `appVersion`、`engineVersion`、`contentVersion` 和 schema；
- 中英文 HTML 与搜索索引分别版本化；切换到未下载的语言时清楚提示需要联网或先下载对应语言包；
- 为两个 locale 生成本地化的 Web App Manifest 与离线页，应用名称、描述和快捷方式使用当前语言；
- 双语包以同一 `contentSetVersion` 原子激活，禁止一门语言已更新而另一门仍引用旧实验或旧锚点；
- 测试 N-1 版本升级和缓存损坏恢复。

`file://` 可以阅读可重定位构建中的静态正文，但浏览器会阻止 JavaScript module，因此完整离线交互依赖 PWA 或本地静态服务器。

## 15. 可访问性与中英双语

### 15.1 可访问性目标

目标为 [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/)。

必须满足：

- 正确的 heading、landmark、skip link 和焦点顺序；
- 所有实验可完全键盘操作；
- 拖拽具有按钮或表单替代；
- 颜色之外使用形状、纹理、箭头和文字；
- SVG 提供标题、描述和必要的结构化标签；
- Canvas 提供相同数据的表格和文字总结；
- 动画支持暂停、单步、速度调整和 `prefers-reduced-motion`；
- `aria-live` 播报经过节流，不逐帧播报；
- 支持 400% 缩放和移动端重排；
- 数学公式保留可访问的 MathML/MathJax 输出；
- Wasm 或 JavaScript 失败时正文仍可阅读；
- 每个页面设置正确的 `<html lang="zh-Hans">` 或 `<html lang="en">`，行内异语使用对应 `lang`；
- ARIA 文案、SVG 描述、Canvas 摘要、数值表和无 JavaScript 正文均须在中英文页面分别验收。

### 15.2 双语交付范围

- `zh-Hans` 与 `en` 都是一等 locale，不存在功能缩水的次级语言；
- 10 章、附录、概念页、实验页、导航、帮助、错误提示、法律页、404、离线页和打印样式均提供两种语言；
- 实验参数说明、公式解释、伪代码标签、图例、数值表、复制摘要、分享页和 ARIA 文案全部双语；
- Rust 算法和语言中立实验配置只维护一份，所有用户可见字符串由 locale 资源或本地化内容提供；
- 切换语言时保留实验配置、种子、当前步骤、完成进度与 URL 分享状态；
- 生产构建要求所有 v1 内容 ID 在两个 locale 中均为 `approved` 且非 `stale`。

### 15.3 内容与翻译工作流

每个内容单元指定一个源 locale。流程为：

```text
源语言定稿
  → 数学审核
  → 另一语言翻译或独立撰写
  → 双语术语检查
  → 目标语言编辑审核
  → 跨语言数学/实验一致性审核
  → locale parity 门禁
  → 发布
```

- 内容 ID、公式 ID、定理 ID、实验 ID 和显式锚点跨语言稳定；
- 术语表维护英文、中文、符号、定义、禁用译法和搜索别名；
- UI 文案与长篇教材内容分别管理，禁止在 Vue 组件中硬编码用户可见文本；
- 翻译记录源内容 hash、译者、语言审核人和审核日期；
- 源文变化后，依赖该 hash 的目标语言页面自动标记为 `stale`；
- 数学公式通常共享，但公式周围的解释、读法、alt 和 long description 分别本地化；
- 如果没有原书翻译权，中文内容只能是独立撰写的伴读；如果两种语言互译的是项目原创内容，则在自有内容许可证中明确允许翻译。

### 15.4 语言选择、搜索与 SEO

- 路由固定使用 `/zh-Hans/` 与 `/en/`，语言切换通过内容清单寻找同 ID 页面；
- `/` 是 `x-default` 双语入口；用户显式选择优先于已保存偏好，已保存偏好优先于浏览器语言；
- 搜索索引按 locale 独立生成和按需加载，结果默认只来自当前语言；
- 英文索引使用大小写归一化和受控词形处理；中文索引采用 `Intl.Segmenter` 词切分并准备 CJK bigram 回退，索引端与查询端必须使用同一规则；
- 中文搜索必须验证分词、英文缩写、公式符号和中英术语别名，英文搜索验证词形和相关性；
- 每个页面输出本地化的 title、description 和 Open Graph locale；
- 每个本地化内容页使用自引用 canonical，并输出互返的 `hreflang="zh-Hans"` 与 `hreflang="en"`；只有双语首页集群把根入口 `/` 声明为 `hreflang="x-default"`，普通内容页不把站点根作为 x-default；
- sitemap 覆盖两个 locale，CI 校验每对 alternate URL 均真实存在；
- 数字、日期和百分比通过 `Intl` 按 locale 格式化，但算法输入输出的精度规则保持一致。

## 16. 性能计划

初始 CI 警戒线：

- 普通阅读页不加载 Wasm 和 Worker；
- 实验组件、Worker 和 Wasm 按页懒加载；
- 阅读壳初始 JavaScript 压缩后目标约 200 KiB 以内；
- 基础 Wasm 压缩后目标约 500 KiB 以内；
- Worker 单次计算块目标约 10ms；
- 进度事件不高于约 20Hz；
- 长曲线保留约 2,000 个可视点，使用在线降采样；
- 页面离开时终止 Worker；
- 不把大型实验数据内联进页面 bundle；
- 静态资产使用内容 hash；
- `.wasm` 使用 `application/wasm` MIME 类型；
- 对状态数、动作数、转移数、迭代数和轨迹长度设置上限。

Wasm release 配置起点：

```toml
[profile.release]
lto = true
codegen-units = 1
panic = "abort"
strip = "symbols"
opt-level = "s"
```

`opt-level = "s"`、`"z"` 或更激进优化应通过真实算法 benchmark 决定，不预先假定体积优先或速度优先。

## 17. 多线程策略

v1 使用：

- 一个 Dedicated Worker；
- Worker 内单线程 Wasm；
- 参数扫描可选择多个独立 Worker，每个 Worker 拥有独立 Wasm 实例。

v1 不使用共享内存 Wasm/Rayon，因为它通常还需要：

- `SharedArrayBuffer`；
- cross-origin isolation；
- COOP/COEP 响应头；
- threaded/non-threaded 两套制品；
- 对所有跨域图片、视频和 iframe 做额外审核。

GitHub Pages 始终使用非线程制品。未来确有 benchmark 证明的需求时，才在可配置响应头的托管平台上增加线程版，并通过 `crossOriginIsolated` 做能力检测。

参考：[SharedArrayBuffer 安全要求](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements)

## 18. 安全要求

- 前端和静态制品中不得包含任何密钥；
- 不执行用户输入代码，不使用 `eval`；
- Rust 对所有配置重新验证；
- 验证维度、概率和、有限数值、折扣因子、迭代上限和内存预算；
- 可恢复输入错误返回结构化 `Result`，不触发 panic；
- 不把导入 Markdown、实验名称或 URL 参数直接放入 `v-html`；
- 外部字体、脚本和数学资源尽量自托管；
- Worker 限制为同源；
- 对构建依赖生成 SBOM 和许可证清单；
- 固定 Cargo、pnpm 和 GitHub Actions 依赖；
- 定期运行依赖漏洞和许可证审计；
- Service Worker 更新必须避免新旧内容和引擎混用；
- 所有实验设置 CPU、内存和输出规模限制，防止页面资源耗尽。

如果部署 CSP，应使用最小权限策略，并针对 Wasm 使用比 `unsafe-eval` 更窄的策略能力；上线前先使用 Report-Only 验证。

## 19. 测试策略

| 层级 | 工具与验证内容 |
| --- | --- |
| Rust | `cargo fmt`、Clippy、单元测试、属性测试、概率归一化、Bellman 不变量、固定种子和数值容差 |
| Golden | 人工推导的小型 MDP；策略评估、VI、PI、MC、TD 等已知答案 |
| Wasm | `wasm-bindgen-test`；ABI、Worker 初始化、序列化、错误映射和内存释放 |
| Vue | Vitest + Vue Test Utils；组件、composable、表单边界和乱序消息 |
| E2E | Playwright；两个 locale 均覆盖 Chromium、Firefox、WebKit、移动视口、子路径部署、语言切换和禁用 JS |
| 双语内容 | locale 覆盖矩阵、稳定 ID/锚点/实验对等、术语、源 hash、语言审核、权利状态、missing/stale 门禁 |
| 搜索与 SEO | 中文分词、英文相关性、术语别名、索引隔离、localized metadata、canonical、hreflang、sitemap 和双语 404 |
| 可访问性 | 两个 locale 分别运行 axe；键盘、NVDA、VoiceOver、文档 `lang`、缩放和减弱动画人工测试 |
| PWA | 两种单语言包和双语包、离线语言切换、下载中断、空间不足、跨 locale 版本一致性、缓存损坏和 N-1 migration |
| 性能 | Lighthouse CI、Wasm 大小、长任务、Worker 消息频率和图形点数 |
| 发布 | 可重复构建、制品 hash、SBOM、版本清单和回滚演练 |

关键数值不变量示例：

- 每个策略分布之和为 1；
- 每个转移概率分布之和为 1；
- `gamma` 和迭代参数位于允许范围；
- Value Iteration 在有限折扣 MDP 上满足收缩相关检查；
- 相同种子和相同引擎版本产生可复现实验；
- 数值发散、NaN 和 Infinity 产生明确错误；
- trace 模式和 batch 模式最终结果在容差内一致。

## 20. CI/CD

### 20.1 Pull Request 流水线

```text
授权元数据检查
  → 内容 schema / 公式 / 引用 / 链接校验
  → 双语完整性 / 源 hash / stale / 术语 / locale 权利校验
  → localized SEO / canonical / hreflang / sitemap / 双语搜索索引校验
  → cargo fmt --check
  → cargo clippy --workspace --all-targets
  → cargo test --workspace
  → wasm-bindgen 浏览器测试
  → wasm-pack release build
  → vue-tsc --noEmit
  → Vitest
  → VitePress build
  → Playwright + axe
  → 资源预算检查
  → 中英静态预览制品、locale 覆盖矩阵和跨语言内容差异报告
```

### 20.2 发布流水线

- 仅从受保护主分支发布；
- 构建和部署任务分离；
- 发布环境可设置人工审批；
- 上传 `site/docs/.vitepress/dist`；
- 制品包含版本清单、校验和和 SBOM；
- 保留最近若干个发布制品；
- 回滚只重新部署旧制品，不重新转换内容；
- 部署后 smoke test 覆盖 `/`、`/zh-Hans/`、`/en/`、成对章节/实验路由、语言切换、双语搜索以及两种语言的 404/离线页。

必须固定：

- `rust-toolchain.toml`；
- `Cargo.lock`；
- `packageManager`；
- pnpm lockfile；
- wasm-pack/wasm-bindgen 版本；
- GitHub Actions 的稳定版本或完整 commit。

## 21. 部署方案

### 21.1 默认生产：GitHub Pages

适合作为第一版生产环境：

- 与源码和 Actions 位于同一平台；
- 零运行时运维；
- 支持自定义域名；
- 可直接部署 VitePress 静态制品；
- 采用非线程 Wasm，避免依赖自定义 COOP/COEP 响应头。

GitHub 项目页必须配置：

```ts
export default defineConfig({
  base: '/repository-name/',
})
```

自定义域名部署时使用 `/`。

参考：

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [VitePress 部署](https://vuejs.github.io/vitepress/v1/guide/deploy)

### 21.2 增强部署：Cloudflare Pages 或同类平台

仅在需要以下能力时引入：

- Pull Request 预览；
- 自定义响应头；
- 更细粒度缓存控制；
- 可选的 cross-origin isolated 线程制品；
- 多区域静态镜像。

### 21.3 可移植构建

同一份源码应能为不同挂载路径生成目标专用制品：

- GitHub Pages；
- Cloudflare Pages；
- S3/OSS/COS 类对象存储；
- 静态 nginx；
- 其他支持 `.wasm` MIME 类型的 CDN。

VitePress 的 `base` 会写入构建产物中的资源和路由 URL，因此 `/repository-name/` 与根路径 `/` 必须分别构建，不能把前者的同一个 `dist/` 原样部署到后者。CI 应以目标矩阵注入 `SITE_BASE`，输出例如 `dist/github-pages/` 和 `dist/root/`；同一目标制品可在具有相同挂载路径的托管平台之间复用。

如果主要读者位于中国大陆，应对目标网络环境做真实可用性测试，并保留对象存储/CDN 镜像能力。

## 22. 上游同步与版本策略

不能只监听上游 HEAD，因为 README 更新频率高于书稿更新频率。

每周同步任务检查：

- 全书 PDF blob/hash；
- 每章 PDF blob/hash；
- 勘误 PDF blob/hash；
- Grid World 代码目录 tree hash；
- 页数和目录摘要。

处理方式：

1. 固定当前上游 commit 和目标文件 hash；
2. 检测目标文件是否变化；
3. 生成页数、目录和文本差异报告；
4. 创建 issue 或同步 PR；
5. 数学编辑和翻译人员人工审核；
6. 更新内容 overlay 和来源元数据；
7. 通过完整 CI 后发布。

禁止：

- 自动覆盖线上正文；
- 通过提交数量判断书稿是否更新；
- 通过 README 更新时间判断 PDF 版本；
- 把未审核的 PDF 抽取结果合并到生产内容。

版本示例：

```text
site:    0.6.0
engine:  0.4.2
content: upstream-5cfaa01.review-3
locales:
  zh-Hans:
    content_hash: ZH_CONTENT_HASH
    source_locale: en
    source_content_hash: EN_CONTENT_HASH
    review: approved
  en:
    content_hash: EN_CONTENT_HASH
    source_locale: en
    review: approved
schema:  2
```

页面底部展示：

- 站点版本；
- 引擎版本；
- 内容版本；
- 当前 locale、两种语言的内容 hash 与审核状态；
- 上游 commit/blob；
- 对应 PDF 页码；
- 审核日期和状态；
- 是否应用勘误。

## 23. 里程碑

按 1 名 Rust 工程师、1 名 Vue/可视化工程师、1 名内容工程/数学编辑、1 名中英双语技术编辑/译审估算：

| 阶段 | 周期 | 主要交付物 | 出口条件 |
| --- | ---: | --- | --- |
| G0 授权与发现 | 1–2 周 | 权利清单、产品模式、源文件清单、架构决策 | 完整版或伴读版边界被书面确认 |
| G1 双语垂直切片 | 3–4 周 | 中英第一章概览、状态/动作、转移同页对，语言切换、双语搜索/SEO 基础、Grid World、Wasm Worker、静态部署 | 双语内容、基础 MDP 交互、部署和测试链路打通，并测得真实翻译吞吐量 |
| G2 双语 MVP | 5–7 周 | 补齐中英第一章策略、奖励、回合与 MDP 单元，交付中英第 2–4 章、3–5 个旗舰实验、双语搜索、本地进度 | 两种语言的核心学习路径均可公开试用 |
| G3 双语 Beta | 8–10 周 | 中英第 5–10 章与附录、知识图、PWA | 两种语言的所有章节具备一致实验体验 |
| G4 硬化 | 4–6 周 | 双语数学/语言审核、SEO、搜索、无障碍、性能、离线升级、回滚 | 两个 locale 均达到发布门禁和可访问性目标 |
| G5 上线 | 1–2 周 | 生产部署、维护手册、版本策略、监控方案 | 发布、回滚和同步流程演练通过 |

四人配置的阶段净工期约 22–31 周，计入返工和发布缓冲后按 24–34 周规划；最终应以 G1 测得的双语写作、翻译和译审吞吐量重估。单人完成更现实的周期是 8–12 个月。若只有 PDF 且要求迁移完整正文，公式和两种语言的人工审校会显著增加工期。

## 24. 当前第一垂直切片：第一章基本概念

> 当前状态：第一章内容与交互链路已完整落地；G1 仍需补齐 Firefox/WebKit 覆盖、GitHub Pages 自动部署与回滚演练，以及首批人工译审和吞吐量记录。

依据最新实施顺序，第一项交付调整为：

> 第一章基本概念中英双语页面对 + 原创 Grid World + Rust/Wasm 状态转移与回报计算 + 固定种子复现 + 双语静态部署

Bellman 方程、策略评估和值函数热图保留为第二章的首个算法型切片；第一章只建立状态、动作、转移、策略、奖励、轨迹、回报、回合与 MDP，不提前引入求解和最优性概念。

### 24.1 已实现内容与平台范围

- 第一章概览、状态与动作、状态转移、策略、奖励、轨迹与回报、回合与终止、MDP 与马尔可夫性质、章节检查点的中英文原创伴读页面；
- 常驻语言切换器，自动映射同页路由并保留实验配置、动作序列和结果；
- 一个独立设计的 4×4 Grid World，包含起点、目标和危险格；
- 上、右、下、左与等待动作；
- 可调环境滑移概率、折扣因子和固定种子；
- 单步状态转移、即时奖励、累计回报与折扣回报；
- Dedicated Worker 中的 Rust/Wasm 计算；
- 数值表格、键盘控制和屏幕阅读器状态播报；
- 跨语言保存并重放手工动作与策略采样命令，同时恢复策略和环境两条 RNG 流；
- 结构化模型错误在实验 UI 中映射为完整的中英文提示；无效配置后可在同一 Worker 中修正并恢复；
- 策略容差内归一化、固定种子 golden 轨迹、有限奖励幅度和 100 步截断共同约束数值与复现边界；
- 静态无 JS 降级内容；
- 中英文独立搜索索引、localized metadata、canonical 和 hreflang；
- 可部署到 GitHub Pages 子路径的纯静态构建。

### 24.2 已实现工作台范围

- 世界：检查状态、动作与可访问的 4×4 环境；
- 转移：由 Rust 枚举实际动作、下一状态、概率、奖励和边界结果；
- 策略：编辑并归一化 $\pi(a\mid s)$，再由 Rust 固定种子采样；
- 奖励：编辑普通、边界、危险和目标四类即时反馈；
- 回报：逐步展示奖励、$\gamma^t$ 权重、折扣贡献、普通回报和折扣回报；
- 回合：对比目标即终止、零奖励吸收和目标后继续三种语义；
- 马尔可夫：对比隐藏风模式造成的不同下一步分布并展示状态扩充；
- 审计：检查转移与策略归一化、折扣范围、有限奖励和特殊状态互斥；
- 所有视图沿用同一语言中立实验状态，并设置 100 步截断保护。

### 24.3 验收标准

- 同一引擎版本和种子可复现；
- 边界、危险格、目标状态和滑移转移与人工 golden 结果一致；
- 概率分布归一化，普通回报与折扣回报和手算值一致；
- 同一动作序列在语言切换前后产生相同轨迹；
- 页面计算期间控件和滚动保持响应；
- Chrome、Firefox 和 Safari/WebKit 路径通过；
- 键盘可以完成所有操作；
- 图表存在数值表格替代；
- 禁用 JavaScript 后正文仍可阅读；
- 中英文成对路由、稳定锚点和语言切换正确；
- 两种语言的 UI、公式解释、错误、表格、ARIA 和静态降级内容均完整；
- 中文搜索、英文搜索、双语 SEO 元数据和 alternate 链接通过校验；
- 从项目子路径直接访问和刷新页面正常；
- 未授权内容不会进入构建制品；
- 发布制品能够回滚。

该垂直切片先验证内容模型、版权边界、Rust 状态模型、Worker 协议、Vue 可视化、SSR/SSG、无障碍和部署，再在第二章复用同一模型实现 Bellman 算法，能减少内容与数值架构同时变化的风险。

## 25. 主要风险与缓解

| 风险 | 等级 | 缓解方案 |
| --- | --- | --- |
| 内容版权和许可证不清晰 | 最高 | 默认原创伴读；构建强制 rights metadata；获取书面授权 |
| PDF 数学抽取失真 | 高 | 优先获取 LaTeX；逐式校核；禁止自动发布 |
| 交互范围膨胀 | 高 | 每章先做一个旗舰实验；统一组件库和实验契约 |
| 数值正确但视觉误导 | 高 | 公式、伪代码、数值表和图形同步；数学编辑验收 |
| Wasm 包体过大 | 中 | 按实验拆包、懒加载、`wasm-opt`、真实体积预算 |
| Worker 无法及时取消 | 中 | 分块执行、事件循环让步、限制每块工作量 |
| DQN/Actor-Critic 浏览器性能不足 | 中 | 教学型小网络、参数上限、预计算检查点 |
| PWA 新旧资源混用 | 中 | 版本清单、显式更新、N-1 migration 测试 |
| 双语产能不足或翻译长期过期 | 高 | G1 测量吞吐量；配置双语技术编辑；源 hash、stale 门禁和人工译审 |
| 中英文数学术语或实验语义漂移 | 高 | 受版本控制的术语表；共享公式/实验 ID；跨语言数学一致性审核 |
| locale 页面、搜索或 SEO 覆盖不一致 | 中 | locale parity、双向 hreflang、索引和路由的 CI 硬门禁 |
| 中文搜索质量不足 | 中 | 真实查询集、术语别名、分词回归测试和相关性基准 |
| 上游静默替换 PDF | 中 | 比较 blob/hash，不依赖提交描述或 HEAD |
| 静态站缺少账号和同步 | 产品限制 | 本地存储、JSON 导入导出、URL 分享并明确非目标 |
| 第三方 iframe 破坏跨源隔离 | 低于 v1 | v1 不启用共享内存线程；视频默认外链 |

## 26. Definition of Done

项目 v1 只有同时满足以下条件才视为完成：

- 所有公开内容都有明确权利状态；
- 10 章及附录在 `zh-Hans` 与 `en` 中均有完整、对等的学习路径；
- 每章至少一个通过数学审核和双语语言审核的旗舰实验；
- 所有 v1 页面、实验 UI、导航、帮助、法律页、404 和离线页均已双语化，不存在 `missing`、`draft` 或 `stale` 的生产内容；
- 关键算法具有 native Rust 和 Wasm 测试；
- 固定种子实验可复现；
- 普通页面为预渲染静态 HTML；
- 无 JavaScript 时两种语言的正文仍可访问；
- 中英文搜索、打印、SEO、语言切换、共享进度和分享均可用；
- 两种语言的 WCAG 2.2 AA 自动门禁通过，人工关键流程验收完成；
- 两个 locale 的主流桌面和移动浏览器 E2E 通过；
- 性能预算无未审批回归；
- 两种单语言离线包、双语离线包、离线切换、PWA 更新和数据 migration 测试通过；
- 生产部署、回滚和上游同步演练完成；
- 页面能显示当前 locale、两个 locale 的审核状态、完整版本、来源和勘误信息；
- 维护者拥有内容、算法、发布和故障处理手册。

## 27. 下一步行动

1. 联系作者和权利方确认完整在线版、中文翻译、英文再发布及书稿源文件的授权范围；
2. 决定每类内容的源 locale，以及中英文分别原创或“源语言定稿后翻译”的工作方式；
3. 确定中英文数学编辑/译审责任人，并建立首版术语表；
4. 在授权未决期间按双语原创伴读模式启动技术垂直切片；
5. 初始化 Rust/Cargo 与 pnpm/VitePress monorepo；
6. 建立 `mathrl-core`、`mathrl-wasm`、Worker 协议、双语内容 schema 和 locale manifest；
7. 完成 Bellman 策略评估的人工 golden 数据；
8. 完成中英文第一节内容、双语 UI、Grid World 和三视图组件；
9. 建立双语搜索、SEO、GitHub Actions、GitHub Pages 和 locale parity 门禁；
10. 用双语垂直切片实测包体、Worker 延迟、可访问性、翻译/译审吞吐量和内容工作量；
11. 根据实测结果冻结 v1 技术基线、术语表和后续双语章节模板；
12. 进入中英文第 1–4 章 MVP 开发。
