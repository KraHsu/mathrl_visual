---
id: ch08-overview
translation_key: ch08-overview
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: 0274c3977ff3885ba5e991931c565a65614aa627
source_pdf_sha256: f130ef447c0eae07ed6ada6b4cb7cbaa219420562234232274808cb46794503c
source_sections: "8.1-8.6"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: "第八章：值函数方法"
description: 用显式特征替代表格，理解线性 TD、动作价值逼近与教学型 Deep-Q 边界。
outline: deep
---

# 第八章：值函数方法

表格为每个状态或状态—动作对分配一个数；函数逼近则保存参数向量并计算特征映射，在精确局部存储与泛化之间做权衡。

::: info 内容边界
本站是非官方原创伴读。页面只沿用固定上游章节的主题顺序，不复制正文、证明、图、示例或代码。请参阅[固定上游 PDF](https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/0e348961c28496096d308f1066009266b3674c5a/3%20-%20Chapter%208%20Value%20Function%20Methods.pdf)。
:::

<a id="learning-goals"></a>
## 学习目标

1. 计算 $\hat v(s,w)=\phi(s)^\top w$ 并检查特征向量；
2. 从引导式预测推导线性 TD 更新；
3. 解释共享参数如何让更新泛化到其他状态；
4. 区分线性 Q-learning 与带回放/目标网络的 Deep-Q 系统。

<a id="roadmap"></a>
## 章节路线

| 单元 | 重点 | 实验观察 |
| --- | --- | --- |
| [值表示](./value-representation) | 表格与函数 | 特征维度 |
| [TD 函数逼近](./td-function) | 投影备份 | 预测、目标、梯度 |
| [逼近器](./approximators) | 特征选择 | 坐标、多项式、独热 |
| [Q-learning](./q-learning) | 动作价值参数 | 贪心策略 |
| [深度 Q-learning](./deep-q-learning) | 回放与目标网络 | 缓冲区与同步 |

在[值函数实验](/zh-Hans/labs/ch08-value-function)中固定种子，只改变特征映射。

<a id="boundary"></a>
## 逼近边界

逼近器可能平滑、紧凑但仍然错误。实验显式展示特征和参数更新，让你看到泛化来自共享参数，而不是准确性保证。Deep-Q 模式是展示回放语义的受限线性替身，不是浏览器深度学习框架。

第八章页面：[导览](./) · [值表示](./value-representation) · [TD 函数](./td-function) · [逼近器](./approximators) · [Q-learning](./q-learning) · [深度 Q](./deep-q-learning) · [总结](./summary) · [问答](./q-and-a) · [检查点](./checkpoint) · [实验](/zh-Hans/labs/ch08-value-function)
