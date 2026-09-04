---
id: exp-ch10-actor-critic
translation_key: exp-ch10-actor-critic
locale: zh-Hans
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: b49bc01b80ff3bb300e167f8f7debfbbb7c11bb2
source_pdf_sha256: 6ec30f6eb855418abdb3434fb2a94ac29389e0238ca282e57268b2ade55fc08f
source_sections: "10.1-10.4"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Actor–Critic 实验
description: 在小型链式环境中追踪 actor 概率、critic TD 误差、优势和离策略比率。
aside: false
outline: deep
---

# Actor–Critic 实验

本原创伴随实验使用三状态、两次决策的链。Rust/Wasm 在 Worker 中运行 QAC、A2C、离策略或离散确定性类比；Vue 并排呈现 actor 与 critic 更新。

::: info 原创伴随实验
链式环境、控制、轨迹、问题和回退算术均为原创，引用第十章主题但不再发布原文、图表、例题、问题或代码。
:::

::: warning 有限运行边界
轨迹让信息流可审计，但不是一般 Actor–Critic 方法的收敛证明。
:::

<ActorCriticLab locale="zh-Hans" />

<noscript>
交互控件需要 JavaScript，但下面的链、TD 公式和手算审计仍可阅读。
</noscript>

<a id="experiment-question"></a>

## 实验问题

固定种子 `5eed`，比较 A2C 与离策略模式。传给 actor 的标量是 TD 误差本身，还是乘以 $\rho=\pi/\mu$ 后的 TD 误差？

<a id="environment"></a>

## 链式环境

从 $s_0$ 出发，动作 0 以奖励 0 移到 $s_1$，动作 1 以奖励 1 终止。在 $s_1$，动作 0 以奖励 2 终止，动作 1 以奖励 −1 终止。终止状态 bootstrap 为零。

<a id="equations"></a>

## 可审计公式

一步 critic 目标和误差为

$$
y_t=r_{t+1}+\gamma V(s_{t+1}),\qquad \delta_t=y_t-V(s_t)。
$$

A2C 用 $\widehat A_t=\delta_t$ 更新

$$
\Delta\theta=\alpha_\theta\,\widehat A_t\,\nabla_\theta\log\pi(a_t\mid s_t)。
$$

离策略模式将标量乘以 $\rho_t=\pi(a_t\mid s_t)/\mu(a_t\mid s_t)$；QAC 则把 $Q(s,a)$ 暴露为 actor 权重。

<a id="manual-fallback"></a>

## 无 JavaScript 手算

设终止转移 $r=2$、$\gamma=0.9$、当前 critic 值 $0.4$。则 $y=2$、$\delta=1.6$。actor 行为 $(0.6,0.4)$、选中动作 0、$\alpha_\theta=0.1$ 时，得分为 $(0.4,-0.4)$，actor 增量为 $(0.064,-0.064)$。若 $\pi=0.6$、$\mu=0.3$，离策略比率为 $2$。

<a id="questions"></a>

## 思考题

1. 所有模式的终止 bootstrap 都是零吗？
2. QAC 展示的是动作价值还是状态价值 critic？
3. 比率是否使用采样动作对应的概率？
4. 为什么确定性视图标为类比？

<a id="next"></a>

记录一行后，返回[第十章导览](../learn/ch10/)。
