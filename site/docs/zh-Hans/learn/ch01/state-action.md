---
id: ch01-state-action
translation_key: ch01-state-action
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_sections: "1.1-1.2"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
title: 状态与动作
description: 学会定义状态空间、动作空间以及依赖状态的合法动作。
---

# 状态与动作

状态不是物理世界本身，而是智能体用来决策的**信息表示**。同一个房间，可以只用机器人位置表示，也可以用“位置 + 电量 + 门状态”表示。哪一种合适，取决于这些信息是否会改变未来。

<a id="state-space"></a>

## 状态空间

第一章实验使用一个原创 4×4 网格。按从左到右、从上到下的顺序编号：

$$
\mathcal S=\{s_0,s_1,\ldots,s_{15}\}.
$$

状态 $s_t$ 表示时刻 $t$ 智能体所在的格子。危险格仍然是可进入状态；“危险”通过奖励表达，而不是从状态空间里删除。

这揭示了一个重要建模选择：

- **墙**通常不属于可进入状态；
- **危险区域**可以是状态，只是进入后代价较高；
- **目标**可以是普通状态、终止状态或吸收状态，必须由任务规则明确说明。

<a id="action-space"></a>

## 动作空间

实验提供五个动作：上、右、下、左、等待。统一动作集合写作

$$
\mathcal A=\{\uparrow,\rightarrow,\downarrow,\leftarrow,\circ\}.
$$

如果所有状态都允许请求这五个动作，那么边界处的“向外移动”并不是非法输入，而是一次会被环境处理的动作。在本站实验中，它让智能体留在原状态并收到边界惩罚。

另一种建模方式是为每个状态定义不同的 $\mathcal A(s)$，直接移除会越界的动作。两种方式都可以成立，但会得到不同的 MDP；文档与代码必须选择同一种语义。

<a id="representation-check"></a>

## 表示是否足够？

假设网格里有一阵风，每隔一步改变方向。如果状态只有位置，那么相同位置在奇数步和偶数步可能产生不同的下一状态分布。此时“位置”不是充分状态。

可以有两种修正：

1. 把风向或时间相位加入状态；
2. 改变问题设定，使风的分布不依赖隐藏历史。

状态设计的目标不是保存全部历史，而是压缩出预测下一步所需的信息。

::: tip 动手验证
打开 [Grid World 概念实验](/zh-Hans/labs/ch01-gridworld)，先把风扰动设为 0。尝试在 $s_0$ 向上或向左移动，观察“动作已执行”与“状态发生改变”为什么不是同一件事。
:::
