---
id: exp-ch04-planning-grid
translation_key: exp-ch04-planning-grid
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 6ad14567a8c992d36883147270150004775c198f68c75bb5bd991670fdaef402
source_sections: "4.1-4.5"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: Value 与 Policy Iteration 规划实验
description: 在共享 4×4 Grid World 上并排运行 Value Iteration、Policy Iteration 与 Truncated Policy Iteration。
aside: false
outline: deep
---

# Value 与 Policy Iteration 规划实验

本实验把第四章的调度比较变成可复现、可检查的浏览器过程。Rust/Wasm 在 Worker 中执行模型查询，Vue 同时展示网格、动作账本、策略轨迹、残差历史和数值表。

::: info 原创伴读实验
本页的环境预设、控件、轨迹格式、问题和静态回退计算均为原创伴读内容，只参照上游章节主题，不重新分发其正文、图、表、示例、问答或代码。
:::

::: warning 已知模型边界
实验直接得到完整的一步转移与奖励模型，不采样轨迹、不估计模型，也不从经验训练。“规划”在这里指使用已知模型的动态规划。
:::

<PlanningLab locale="zh-Hans" />

<noscript>
交互控件需要 JavaScript，但下文仍提供模型、算法定义、基线向量和手工审计步骤。
</noscript>

<a id="model"></a>

## 共享的 4×4 模型

状态按行优先从左上角的 $0$ 编号到右下角的 $15$。状态 $0$ 是起点，状态 $15$ 是终止目标，状态 $6$ 和 $9$ 是危险格。非终止动作是**上、右、下、左、等待**。基线配置为：

$$
\gamma=0.9,
\qquad
p_{\mathrm{slip}}=0,
\qquad
(r_{\mathrm{ordinary}},r_{\mathrm{boundary}},r_{\mathrm{hazard}},r_{\mathrm{goal}})
=(-0.04,-1,-1,+1)
$$

普通移动奖励为 $-0.04$，撞边界为 $-1$，进入危险格为 $-1$，进入目标为 $+1$。目标奖励在进入时计算；进入目标后的后续价值为零，目标没有动作行。所有请求动作都必须在滑移结果揭示前选定。

在默认的 20% 风预设中，意图方向的实际概率为 $0.85$，另外三个方向各为 $0.05$（先采样实际方向，再处理边界）。**等待**动作仍是显式动作；风规则只附着在方向请求上。

<a id="configuration"></a>

## 配置与复现

默认控件如下：

| 参数 | 基线 | 含义 |
| --- | ---: | --- |
| 折扣 $\gamma$ | $0.9$ | 后继价值权重，范围 $[0,0.99]$ |
| 风/滑移概率 | $0$ | 方向结果随机性，范围 $[0,1]$ |
| 价值容差 | $10^{-10}$ | 规划器使用的不动点阈值 |
| 外层/总扫描上限 | $100$ | 工作预算，达到后标记 truncated |
| 内层评估深度 $J$ | 深度预设为 $1$ | Truncated PI 的固定策略扫描次数 |
| 模型标识 | 共享固定 Grid World 模型 | 规划是确定性的；不会消耗或把随机种子写入运行轨迹 |

**基线**、**20% 风**、**短视域**和**长视域**预设各只改变文档化的一个因素。Vue 层和 Worker/Wasm 引擎会分别校验字段；无效输入可以在不刷新页面的情况下恢复。

表中的数值是浏览器为保持响应速度而设置的**基线预设**。Rust 原生 API 同样接受显式配置；Worker 会始终发送这里列出的预设，使分享链接的工作量稳定。

切换语言会保留算法、模型参数、计数器、策略、价值和当前轨迹。重置会清除运行结果，但保留已应用配置。

<a id="value-iteration"></a>

## 视图 A：Value Iteration

Value Iteration 从 $v_0=0$ 开始，重复同步最优备份：

$$
q_k(s,a)=\sum_{s',r}p(s',r\mid s,a)[r+\gamma v_k(s')],
\qquad
v_{k+1}(s)=\max_a q_k(s,a)
$$

轨迹同时公开完整动作账本和贪心掩码。基线首轮向量应为

$$
v_1=(-0.04,-0.04,-0.04,-0.04,
-0.04,-0.04,-0.04,-0.04,
-0.04,-0.04,-0.04,1,
-0.04,-0.04,1,0)
$$

当前残差报告 $\|T_*v_k-v_k\|_\infty$，更新量另行报告。不能因为显示了贪心箭头，就把当前向量称为“贪心策略的状态价值”。

<a id="policy-iteration"></a>

## 视图 B：Policy Iteration

Policy Iteration 从零向量贪心集合中选出的可见确定性代表开始（每个非终止状态采用文档化动作编码中最小者）。每个外层轮次：

1. 用同步 $T_\pi$ 扫描评估固定策略，直到内层容差或上限；
2. 针对评估向量计算全部动作备份；
3. 记录所有最大动作；
4. 按文档化并列规则安装一个确定性代表。

轨迹分开显示外层策略轮和内层评估轮。只有内层评估状态合格且没有严格贪心变化时，策略才算稳定。若并列集合不变但代表动作变化，应报告“并列策略变化”，不能虚构价值提升。

<a id="truncated"></a>

## 视图 C：Truncated Policy Iteration

Truncated PI 保持有限的策略评估。选择内层深度 $J$，每次贪心改进前恰好做 $J$ 次同步 $T_\pi$ 扫描。本实验没有自适应提前停止模式；显式深度属于轨迹的一部分。

实验提供 $J=1$、$J=2$、$J=8$ 等深度预设。固定模型、初始策略和容差后进行比较。轨迹报告：

- 外层策略轮；
- 内层扫描索引与深度；
- 价值向量与内层残差；
- 策略变化/并列掩码；
- 总模型备份数；
- stable、inner-truncated 或 outer-truncated 状态。

只有初始化和时序匹配时，深度一才类似 Value Iteration。实验把调度元数据保留下来，供用户检验这句话。

<a id="comparison"></a>

## 公平比较调度

用同一基线配置重置后运行每个视图，记录：

| 指标 | Value Iteration | Policy Iteration | Truncated PI |
| --- | ---: | ---: | ---: |
| 外层轮数 |  |  |  |
| 固定策略内层扫描 | 按定义为 0 |  |  |
| 总模型备份数 |  |  |  |
| 第一个非零向量 |  |  |  |
| 最终残差 |  |  |  |
| 策略是否稳定 |  |  |  |

只比较外层轮数可能得出相反结论：Policy Iteration 的一轮可能包含许多内层模型查询。数值表和工作量计数才是主要比较依据，颜色、箭头长度和动画速度只是表现形式。

<a id="wind-audit"></a>

## 用风审计动力学

先运行无风基线，检查一整行请求动作结果，再开启 **20% 风**。对方向请求，验证四个实际动作概率和为 1，并确认先求期望再取动作最大值。可以把选中备份与非法表达式 $\mathbb E[\max_a(\cdot)]$ 对照；在不同结果偏好不同动作的状态，两者应不同。

入门的[转移分布/马尔可夫实验](/zh-Hans/labs/ch01-gridworld)有单独的引导提示：先理解确定性分布，再开启风。那里适合第一次接触随机转移；本规划实验假定用户已经准备比较算法调度。

<a id="audit"></a>

## 模型与算法审计

用审计面板和数值表确认：

1. 每个非终止请求动作行的概率都在 $[0,1]$ 且和为 1；
2. 状态 15 的后续价值为零且没有策略行；
3. 每次同步更新期间旧向量保持冻结；
4. 显示的贪心掩码包含容差内的全部动作；
5. 同一模型下参考解的残差很小；
6. 工作上限标记为 truncated，而不是 converged；
7. 无效折扣、风、奖励、容差和扫描输入返回稳定提示；
8. Worker/Wasm 重试无需整页刷新即可恢复。

参考解只是有限模型的诊断 oracle，不替代对算法的理解。对估计模型的小残差也只能证实估计模型。

<a id="manual-check"></a>

## 无 JavaScript 的手工检查

禁用 JavaScript 时，把所有后续价值设为零即可复现基线首轮。普通自环/边界转移按奖励规则贡献 $-0.04$ 或 $-1$；进入危险格 6 或 9 贡献 $-1$；进入目标 15 贡献 $+1$；目标行保持零。结果就是上面给出的 $v_1$ golden。

下一轮使用冻结的 $v_1$ 计算每个动作备份，在每个非终止状态写入最大值，并保持目标为零。重复到残差低于所选容差，再与上面的静态算法定义核对；不需要颜色或动画。

<a id="questions"></a>

## 带着问题阅读轨迹

- 哪个计数器表示内层评估深度，哪个表示外层策略轮？
- 当前向量是 $T_*$ 迭代点、已评估策略价值，还是有限深度近似？
- 策略改变是因为出现了真正更好的动作，还是只有并列打破代表改变？
- 开启风后究竟改变了什么：动作时机，还是结果分布？
- 如果模型来自轨迹估计，哪个残差和最优性结论需要加限定语？

<a id="read-next"></a>

## 继续阅读

阅读轨迹时可返回[Value Iteration](../learn/ch04/value-iteration)、[Policy Iteration](../learn/ch04/policy-iteration)和 [Truncated PI](../learn/ch04/truncated-policy-iteration)。[第一章转移/马尔可夫实验](/zh-Hans/labs/ch01-gridworld)仍是理解“风属于一步分布内部”的推荐起点。
