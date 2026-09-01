---
id: ch01-transitions
translation_key: ch01-transitions
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_sections: "1.3"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: 状态转移
description: 区分确定性与随机转移，并验证转移概率分布。
---

# 状态转移

动作表达智能体的意图，状态转移描述环境的响应。二者之间不必是一一对应关系：同一个动作可能因为边界、风或其他动力学而产生不同结果。

<a id="transition-kernel"></a>

## 用条件概率描述下一步

一般情形下，转移模型写作

$$
p(s'\mid s,a)=\Pr(S_{t+1}=s'\mid S_t=s,A_t=a).
$$

对任意给定的 $(s,a)$，所有可能下一状态的概率必须满足

$$
p(s'\mid s,a)\ge 0,
\qquad
\sum_{s'\in\mathcal S}p(s'\mid s,a)=1.
$$

确定性转移是它的特殊情况：只有一个下一状态的概率为 1，其余均为 0。

<a id="lab-dynamics"></a>

## 本站实验的原创规则

4×4 实验采用以下规则：

- 没有风时，移动动作按指定方向前进一格；
- 请求越过边界时，下一状态等于当前状态；
- 危险格可以进入，它改变奖励而不阻挡转移；
- “等待”始终保持当前状态；
- 风扰动开启后，移动请求有一定概率被一个随机方向替换；
- 到达目标后，本回合结束。

这些规则只是众多合法环境之一。强化学习公式不会替你决定“墙是否可穿过”或“目标是否终止”；这些属于任务建模。

<a id="policy-versus-model"></a>

## 不要把策略和转移模型混在一起

比较两种条件概率：

| 对象 | 条件概率 | 回答的问题 | 归属 |
| --- | --- | --- | --- |
| 策略 | $\pi(a\mid s)$ | 在状态 $s$，智能体会选哪个动作？ | 智能体 |
| 转移模型 | $p(s'\mid s,a)$ | 动作 $a$ 执行后，环境会到哪个状态？ | 环境 |

随机策略可能在两个动作之间摇摆；随机环境则可能在同一动作下产生多个结果。实验中的按钮由你直接选动作，因此当前策略是人工控制；“风扰动”只改变环境转移。

::: tip 可复现实验
在 [Grid World 概念实验](/zh-Hans/labs/ch01-gridworld) 中把风扰动设为 40%，记录随机种子并执行一串动作。重置为相同种子后重复动作，Rust 的固定随机数生成器会产生相同轨迹。
:::
