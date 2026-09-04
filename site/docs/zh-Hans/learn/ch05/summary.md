---
id: ch05-summary
translation_key: ch05-summary
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: acdd6aff8046fe7ed7e45b4d4cd2a89ead30aac8
source_pdf_sha256: 77a4369d31c82b1d5ab58a833d6190771daa2905eb7e27372114b4fb493f2245
source_sections: "5.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: "第五章总结"
description: 用一张可审计的地图记住 Monte Carlo 估计链、访问策略、覆盖条件与 epsilon 权衡。
outline: deep
---

# 第五章总结

Monte Carlo 方法用采样回报的平均值替代不可用的期望。章中的三个控制算法共享这一统计原语，但在记入哪些访问以及如何维持覆盖方面不同。

::: info 原创伴读说明
本总结为原创伴读材料。它压缩上游主题顺序，但不复制原书正文、图、表、示例、问答或代码。
:::

<a id="core-chain"></a>

## 核心链条

$$
\text{回合}
\longrightarrow
\text{回报 }G_t
\longrightarrow
\text{按访问过滤的样本均值 }\widehat q(s,a)
\longrightarrow
\text{策略改进}.
$$

回报是随机变量。有限均值是估计，即使策略箭头看起来稳定也如此。所谓模型无关，是指学习器读取的是实际奖励与后继状态，而不是给定的转移分布。

<a id="comparison"></a>

## 比较三种 MC 控制调度

| 算法 | 起点规则 | 访问规则 | 改进规则 | 主要负担 |
| --- | --- | --- | --- | --- |
| MC Basic | 本实验确定性字典序 75 对扫描 | 默认初始访问 | 每个完整回合后贪心 | 每回合记入一个样本 |
| MC Exploring Starts | 带种子排列，显式强制起点对 | 首次或每次访问 | 每个完整回合后贪心 | 强制起点和覆盖 |
| MC $\varepsilon$-greedy | 普通状态起点 | 通常每次访问 | 固定 ε 族中最佳分布 | 持续探索的代价 |

这些名称描述的是调度，而不是实现语言。运行还必须说明折扣因子、终止/截断规则、种子、回合预算和并列策略。

<a id="estimators"></a>

## 应保留的估计事实

若 $G_1,\ldots,G_n$ 是同一对被记入的回报，则

$$
\widehat q_n=\frac1n\sum_{i=1}^{n}G_i,
\qquad
\widehat q_{n+1}=\widehat q_n+\frac{G_{n+1}-\widehat q_n}{n+1}.
$$

在独立同分布且方差有限的假设下，样本均值无偏，方差按 $1/n$ 缩放。单条轨迹的访问可能相关，策略变化也可能改变回报分布；因此 iid 公式不能无条件地当作置信区间。

<a id="epsilon"></a>

## epsilon 权衡

有 $m$ 个合法动作时，按标准均匀探索约定，唯一贪心代表的概率为

$$
1-\varepsilon+\frac{\varepsilon}{m},
$$

其他每个动作的概率为 $\varepsilon/m$。增大 ε 会提高发现替代动作的机会，却降低即时利用质量。固定正 ε 只能在受约束的柔性策略族中谈“最优”；退火调度同时改变策略与数据生成过程。

<a id="audit"></a>

## 可迁移的审计清单

接受结果前，确认：

1. 每个记入样本都有明确的状态—动作键和后缀回报；
2. 访问策略与记录的计数一致；
3. 未访问对标记为缺失，而不是悄悄赋值为零；
4. 区分自然终止与时间上限截断；
5. 记录起点分布或探索性起点调度器；
6. 每次策略更新都记录 ε 与并列处理；
7. 种子和重放元数据能复现有限轨迹；
8. “收敛”带有样本预算和策略族限定。

<a id="chapter-bridge"></a>

## 与后续章节的桥梁

第四章从已知模型计算精确期望；第五章从回合估计回报。后续随机逼近和时序差分方法会改变更新权重或引入自举，但不会消除说明“哪些数据进入估计”的需要。

[Monte Carlo 实验](/zh-Hans/labs/ch05-monte-carlo) 把三种调度并排展示。先运行无风并保存带种子的基线，再开启可选风扰动预设。风会改变实际样本，但不能让智能体观察结果后再选动作。

<a id="quick-recall"></a>

## 快速回忆

| 术语 | 精确含义 |
| --- | --- |
| model-free（模型无关） | 更新不要求提供转移模型 |
| Monte Carlo | 使用完整采样回报（或明确标记的截断回报） |
| exploring starts（探索性起点） | 每个状态—动作对都能以正覆盖概率作为回合起点 |
| first-visit（首次访问） | 回合中每个对的第一次出现 |
| every-visit（每次访问） | 每个对的每次出现 |
| soft policy（柔性策略） | 每个合法动作都有正概率 |
| ε-greedy | 偏好贪心代表的一种指定柔性策略构造 |

<a id="read-next"></a>

## 继续

用[问答](./q-and-a)做简短概念检查，再完成[检查点](./checkpoint)；在打开答案前，先让计数和回报账本彼此吻合。
