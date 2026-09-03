---
id: ch07-unified
translation_key: ch07-unified
locale: zh-Hans
origin: companion-translation
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: ba7f37e77bdbbb679f084c45e1bf9aa7e9af0aab
source_pdf_sha256: ee409613be039e33ac3c8ac4e1bbfe68bd4f16c88bc139ba0da0182f4d4eb59d
source_sections: "7.5"
copied_text: false
copied_assets: false
rights: companion-original
review_content: draft
review_language: draft
title: TD 的统一视角
description: 将 MC、一步 TD、多步 TD、SARSA 与 Q-learning 放在同一目标谱系中。
outline: deep
---

# TD 的统一视角

<a id="spectrum"></a>
## 同一目标家族

四种方法都会把访问到的估计推向某个目标：可以是一步奖励加引导项（SARSA）、多步奖励加引导项（n 步）、完整回报（MC），或贪心引导项（Q-learning）。

| 方法 | 当前使用的数据 | 策略关系 |
| --- | --- | --- |
| TD(0) | 一次转移 | 固定状态价值策略 |
| SARSA | 转移 + 下一动作 | 同策略 |
| n 步 SARSA | 延迟奖励窗口 | 同策略 |
| Q-learning | 转移 + 贪心最大值 | 异策略 |

<a id="check"></a>
## 对比协议

固定种子、奖励、回合上限与学习率，只改变方法，保存前十个目标，再比较回报和覆盖率。这样可以把目标设计变化与随机流变化分开。
