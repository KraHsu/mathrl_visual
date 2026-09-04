# MathRL Visual 发布、升级与回滚手册

本文是静态 GitHub Pages 站点的运维手册。普通学习预览无需审批：推送
`main` 即可由 Pages workflow 构建、检查并部署。文中“正式版本”部分是
可选的更严格流程，只有在需要正式出版记录或再分发上游素材时才使用。
站点不依赖后端、数据库或账号服务；所有构建、离线数据和回滚对象都是可保存的静态文件。

This runbook operates the static GitHub Pages site. It deliberately requires no backend, database, or account service: builds, offline data, and rollback targets are immutable static artifacts.

## 1. 版本身份 / Version identity

每个构建产物的根目录都应有 `version.json`。它同时记录：

- `appVersion`：站点版本，遵循 SemVer；预览可以使用 `0.x.y`，正式 v1 使用 `1.0.0` 及后续补丁版本；
- `contentVersion`：由内容与实验源文件计算的 SHA-256 前缀（也可由发布流水线显式指定）；
- `engineVersion`：Rust/Wasm workspace 版本；
- `gitCommit`：生成该产物的仓库提交；
- `sourceTreeSha256`：参与构建的内容、算法和元数据树摘要；
- `artifact.sha256` 与逐文件 SHA-256：不包含 `version.json` 自身，避免自引用；
- `channel`：`preview` 或 `production`；
- `storage.schemaVersion`：本地偏好迁移版本，目前为 `2`。

The generated `version.json` is the release ledger. `artifact.sha256` covers every other file in the artifact, so an archived artifact can be verified without trusting a deployment timestamp.

The VitePress build fixes `buildConcurrency: 1` so the built-in local-search
index is inserted in a stable page order. This keeps content-hashed search,
theme, and app chunks reproducible; do not replace hashed filenames with a
global fixed name. For an artifact reproducibility check, run two builds with
the same `BUILD_TIMESTAMP`, `CONTENT_VERSION`, `APP_VERSION`, `GITHUB_SHA`, and
`SITE_BASE`, then compare the complete file list and `artifact.sha256`.

VitePress 配置将 `buildConcurrency` 固定为 `1`，避免本地搜索索引的并发完成顺序
改变文档编号并连锁改变 chunk hash。发布前可在相同的身份、时间戳、内容版本和
挂载路径下重复构建两次，比较完整文件清单与 `artifact.sha256`；不要为了追求
文件名稳定而取消资源 hash。

构建时可显式传入身份：

```bash
APP_VERSION=1.0.0 \
CONTENT_VERSION=content-<reviewed-hash> \
ENGINE_VERSION=1.0.0 \
GITHUB_SHA=<immutable-commit> \
SOURCE_DATE_EPOCH=<unix-seconds> \
SITE_BASE=/mathrl_visual/ \
VITE_SITE_STAGE=production \
corepack pnpm build
```

若未传入 `CONTENT_VERSION`，生成器会对当前源树计算确定性摘要；不要在正式发布中使用未记录的工作树或未锁定的依赖。

本地脏工作树的预览制品会把 `version.json.gitCommit` 标为
`working-tree-dirty`，避免把未提交改动误认成某个历史 commit。生产阶段
则必须同时满足 1.x `appVersion`、完整 40 位 commit SHA、SHA 与 checked-out
`HEAD` 一致以及干净工作树；这些条件由 PWA 生成器和 production workflow
双重校验。

A preview built from a dirty worktree is labelled `working-tree-dirty` in
`version.json` instead of borrowing `HEAD`. A production build fails closed
unless it has a 1.x SemVer, a full 40-character commit SHA matching the
checked-out `HEAD`, and a clean worktree; both the PWA generator and the
production workflow enforce this identity contract.

## 2. 可选正式版本前置条件 / Optional formal-release gates

若要执行可选的正式版本流程，再满足以下门禁：

1. `cargo fmt --check`、workspace Clippy/test、Wasm 构建和严格依赖漏洞审计（`SECURITY_AUDIT_STRICT=1 corepack pnpm security:check`）通过；
2. `corepack pnpm --filter @mathrl/site typecheck`、Vitest、双语 parity、页面产物检查，以及 `corepack pnpm --filter @mathrl/site test:e2e:cross-browser` 的 Chromium/Firefox/WebKit 桌面与移动自动化矩阵通过；`corepack pnpm wasm:test:browser` 也必须通过；
3. 生产构建完成后运行 `RELEASE=1 corepack pnpm release:readiness`（或 `node scripts/check-release-readiness.mjs --strict`）。每个 `topic-reference` 页面必须有与 `scripts/source-manifest.mjs` 一致的 40 位 `source_commit`、40 位 Git `source_pdf_blob`、64 位 `source_pdf_sha256` 和 `source_sections`；`project-policy`/`site-navigation` 页面必须明确页面类型，不要求虚构 PDF 来源。所有页面的 `rights`、`review_content`、`review_language`、`review_math` 和 `review_accessibility` 均须达到适用的批准状态，并附有 `reviewer`、有效 `reviewed_at`、`review_evidence` 与 `rights_evidence`；
4. `corepack pnpm build` 会生成 VitePress、PWA 离线包、`release-manifest.json`、`sbom.cdx.json` 和 `licenses.json`；随后必须运行 `node scripts/check-pwa-artifact.mjs`、`node scripts/check-sbom.mjs` 和性能预算检查；
5. 保存 `version.json`、artifact SHA-256、SBOM/许可证清单、性能报告、CI run URL、自动化测试结果和人工审核/发布记录；生产 workflow 的 `release-evidence/release-context.json` 同时记录 immutable SHA、`workflowRunId` 和 `workflowRunUrl`，独立 smoke job 归档的 `release-evidence/deployment-smoke.json` 必须与同一 `gitCommit`/`appVersion` 关联；
6. 部署后使用 `scripts/smoke-deployed.mjs` 对根路径、两个 locale 首页、至少一个章节页、至少一个实验页、404、离线页、双语 manifest、SBOM 和许可证清单做 HTTPS smoke test，并记录 JSON 结果；脚本只接受目标 origin 与 Pages base 内的重定向，并记录每个 endpoint 的最终 URL。

截至 2026-09-04，仓库已有本地技术证据，但这不等同于生产批准：Rust/workspace、Wasm、TypeScript、Vitest、locale parity、Pages/PWA/SBOM、压缩体积和本地严格依赖审计门禁均通过；Axe 桌面矩阵在 Chromium、Firefox、WebKit 各覆盖 54 条中英路由，移动项目在三个引擎各遍历每个 locale 的 25 条路线（共 50 次 locale-route 检查），另有导航、风扰动和页面证据检查，Wasm 浏览器测试为 9/9。移动项目是浏览器仿真而非真实设备；严格依赖审计仍需在受保护生产环境中重跑并归档其 `pnpm audit`/`cargo-audit` 报告，上述结果也都需作为受保护生产流水线的可追溯证据保存。

当前树中的这些项目仍会阻塞“正式 v1”审计，但不会阻塞普通双语学习预览：`RIGHTS.md` 中的书面权利/许可证决定；人工数学、语言和可访问性审核；真实设备验收；受保护 CI 证据；生产回滚/同步演练；以及依赖和性能基线。机器 provenance 已由中央 source manifest 和 111 对 parity 覆盖；`RELEASE=1` 的失败只表示可选正式流程尚未完成。

The remaining formal-release tasks are written rights/licensing decisions,
human mathematics/language/accessibility reviews, manual WCAG checks with
assistive technology and real devices, protected CI evidence, production
rollback/upstream-sync rehearsals, and agreed dependency/performance evidence.
They are not prerequisites for the ordinary static preview.

The release gate must fail closed. Never change `RELEASE=1` to another value, remove draft metadata, or bypass the artifact checker merely to make a workflow green.

本地复现 Wasm 浏览器门禁时，Chrome 路径会先选择精确/同构建或同主版本的本地驱动；没有安全匹配时，normal 模式会从 Chrome for Testing 元数据选择同主版本驱动并缓存后传给 `wasm-pack`，不会把不匹配的最新驱动交给旧浏览器。离线或可复核环境可先检查工具，再显式传入驱动路径：

```bash
corepack pnpm wasm:test:browser --check-only
CHROMEDRIVER=/path/to/chromedriver \
corepack pnpm wasm:test:browser
```

For a hermetic run set `WASM_NO_DRIVER_DOWNLOAD=1`; the command then fails instead of fetching an unpinned driver. The production workflow uses the same wrapper and archives its result.

The wrapper fails closed unless the exact `wasm-pack 0.15.0` build and
`wasm-bindgen-test-runner 0.2.127` are present.  Release operators may pin
`WASM_CHROMEDRIVER_VERSION` and the executable's
`WASM_CHROMEDRIVER_SHA256`; both pins are required together, and the digest is
verified for every selected driver.  The SHA is for the executable rather than
the ZIP archive; the wrapper records the source URL and archive digest in its
log.  `--check-only` performs no download or cache mutation.

The production dispatch makes those two values mandatory, resolves exactly
one matching Playwright Chromium binary, and passes a temporary
`goog:chromeOptions.binary` capability to the WebDriver runner.  A mismatch
between the pinned browser and driver therefore fails before the tests run.

`--no-driver-download` 与上述环境变量等价。Firefox 在 normal 模式仍可由
`wasm-pack` 处理缺失的 `geckodriver`；若要完全离线运行，请预装并显式传入
`GECKODRIVER`。

预览构建可以保持 `VITE_SITE_STAGE=preview`；预览页面会带 `noindex,nofollow`，但仍应生成完整 PWA 元数据，以便在发布前测试升级和离线流程。

## 2.1 审核包 / Review packet

审核开始前运行：

```bash
corepack pnpm review:packet
```

命令从两个 locale 的当前 Markdown frontmatter 生成
`release-evidence/review-packet.{json,md,csv}`。它列出 222 个页面文件、111
个双语对、适用的四个审核字段、来源 provenance 和每页未完成项。该目录被
`.gitignore` 忽略，生产 workflow 会把它作为发布证据归档；它只是由源码生成的
审核队列，不是批准记录。审核人必须把真实姓名/身份、日期、审核证据和权利
证据写回页面及 `RIGHTS.md`，不能直接编辑生成文件来放行。

Before review starts, run `corepack pnpm review:packet`. It generates
`release-evidence/review-packet.{json,md,csv}` from the two locales' current
frontmatter, covering 222 page files, 111 bilingual pairs, applicable review
fields, provenance, and open tasks. The production workflow archives the
ignored directory as evidence. The packet is a generated queue, not an approval:
reviewers must record their identity, date, review evidence, and rights evidence
in the source pages and `RIGHTS.md`.

## 3. PWA 与离线包 / PWA and offline packs

构建生成以下静态文件：

- `manifest.zh-Hans.webmanifest`、`manifest.en.webmanifest`：单语言安装入口；
- `manifest.webmanifest`：默认英文兼容入口；
- `offline-manifest.json`：中英文及 `all` 三个离线包的路由、文件列表和估算字节数；
- `sw.js`：带 `appVersion` 与 `contentVersion` 的版本化 Service Worker；
- `offline/zh-Hans/index.html`、`offline/en/index.html`：断网回退页；
- `pwa-register.js`：注册、更新提示、离线包下载和本地偏好迁移客户端；
- `sbom.cdx.json`、`licenses.json`：锁定依赖图及规范化许可证清单，随制品一起归档。

页面首次加载只缓存应用壳和两个离线页。联网后可在浏览器控制台或离线页按钮调用：

```js
await window.mathrlPwa.prefetch('zh-Hans') // 中文包
await window.mathrlPwa.prefetch('en')      // English pack
await window.mathrlPwa.prefetch('all')     // 双语包
await window.mathrlPwa.status('all')
await window.mathrlPwa.clear('zh-Hans')
```

下载按文件逐个提交并报告进度；中断后再次调用会复用已缓存文件，不要求从头下载。缓存只接受当前 origin 和当前 Pages `base` 下的 URL，避免把外部请求写入离线包。

The service worker uses network-first navigation and cache-first hashed assets. When a network request fails it tries both VitePress' clean route and its physical `.html` file, then falls back to the locale-specific offline page. An update never deletes an unrelated origin's cache; old MathRL caches are removed only after the new worker activates.

## 4. 本地数据升级 / Local-state migration

跨页面偏好使用 `mathrl:pwa:state`，schema `2`。`site/docs/.vitepress/pwaMigration.ts` 是纯函数实现，浏览器中的 `pwa-register.js` 使用同一规则：

- v1（`v` 或 `schemaVersion`）迁移到 v2；
- 只保留 locale、主题、reduced-motion、同源路由和有界实验偏好；
- 无法解析或超过大小上限时丢弃损坏值，不影响正文阅读；
- 发现未来 schema 时保持原值不覆盖，等待新版本理解它；
- 迁移不触碰各实验自己的 replay key，实验仍在其 Worker/组件边界验证。

Before changing this schema, add a fixture for the previous version, update the pure migration tests, and document a forward and backward path. A service-worker rollback must be able to open the site even if a newer preference envelope is present.

## 5. 发布与回滚 / Deploy and rollback

### 正常发布 / Normal release

1. 从已审阅的 immutable commit 取得完整 40 位 SHA（生产 workflow 只接受该 SHA；分支或 tag 必须先解析并固定）。手动 dispatch 时，workflow 的运行 ref（GitHub 的 “Use workflow from”）也必须选择同一个完整 SHA，否则构建会在入口处 fail closed；
2. 在干净工作树执行完整检查和 PWA artifact check；
3. 将 `version.json`、artifact 摘要和 CI run 保存到发布记录；
4. 使用该 SHA 手动 dispatch 受保护的 production workflow，等待 build/deploy/smoke jobs 成功，并下载 `release-evidence/deployment-smoke.json`；
5. 记录 GitHub Pages deployment URL，并运行部署后 smoke test；
6. 保留至少最近两个成功产物，直到新版本完成观察期。

Preview and any later production deployment share one repository Pages URL.
Normal pushes to `main` keep the ordinary learning preview current; a formal
production cutover is an explicit operational choice.

When dispatching from the GitHub UI/API, choose an immutable tag (or a
protected branch) that points to the reviewed commit, and set the `inputs.ref`
value to that same 40-character commit SHA.  For example, with the GitHub CLI
use `gh workflow run release.yml --ref <immutable-tag> -f ref=<sha> ...`.
The workflow rejects a moving/different event ref.  This is intentional: the
Pages deployment action uses the workflow event SHA as its
`pages_build_version`, so allowing a different event ref would break the
immutable identity recorded in `version.json` and in the deployment smoke
report.

### 回滚 / Rollback

回滚目标是“重新部署已验证的旧制品”，而不是重新生成一份可能使用新依赖或新上游内容的近似版本。

1. 冻结 `main` 的新发布，记录当前故障、时间和受影响的 `appVersion`；
2. 从 GitHub Actions 找到最近一个成功的 Pages build，核对其 `gitCommit` 与 `artifact.sha256`；
3. 使用仓库的手动部署入口，以目标完整 SHA 重新构建（或从保存的 artifact 直接部署）；
4. 部署后检查 `version.json` 必须等于目标版本，并确认旧版本的中英文页面、Worker/Wasm 和离线回退可用；
5. 观察 Service Worker：新旧 cache 名称应按版本隔离，若客户端仍在旧页面中，等待 `controllerchange` 后刷新；
6. 将事件、根因、恢复时间、目标 SHA 和后续修复提交写入 incident 记录，再解除发布冻结。

如果手动部署入口不可用，最小可审计回退是从目标提交创建一个只包含回退的合并提交并让现有 Pages workflow 发布；不得使用 `git reset --hard` 改写共享历史。

If the latest worker is broken before it can activate, browsers keep the previous active worker. If it has already activated, a deployment of the previous immutable artifact creates a distinct cache name and the old worker is removed only after the replacement has installed successfully.

## 6. 上游同步 / Upstream synchronization

上游书稿只作为主题和来源链接；同步时必须重新核对固定 commit、PDF blob 和 SHA-256。`corepack pnpm upstream:check`（以及每周的 `upstream-sync.yml`）只读检查上游 `main` 是否漂移并保存 JSON 报告，不会自动改正文或 manifest。任何来源变化先走内容 diff、数学审核和双语审核，再更新 `contentVersion`，不能静默替换线上文件。详见 [RIGHTS.md](./RIGHTS.md) 与 [PLAN.md](./PLAN.md)。
