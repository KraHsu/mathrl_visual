---
id: concept-markov-property
translation_key: concept-markov-property
locale: en
origin: companion-original
source_locale: en
source_kind: topic-reference
source_commit: 0e348961c28496096d308f1066009266b3674c5a
source_pdf_blob: e437a038a72f11ee453cb3099866bfb0d9c140af
source_pdf_sha256: 38eb0a063c5879f1efa4f0291fbd5ff36bd3bdbd077c66f2db2c43c514d6589f
source_sections: "1.7"
copied_text: false
copied_assets: false
copied_code: false
rights: companion-original
review_content: draft
review_language: draft
review_math: draft
review_accessibility: draft
title: Markov property
description: A visual, checkable test for whether the current state contains enough history.
outline: deep
---

# Markov property

The Markov question is a test about information, not a label attached to an
algorithm:

> Once the current state and action are known, does any additional history
> change the distribution of the next state and reward?

If the answer is no, the state is sufficient for the one-step prediction. If
the answer is yes, the representation has hidden memory and the model needs a
larger state (or an explicit memory mechanism).

<a id="test"></a>

## A two-row test

Imagine two histories that arrive at the same visible position. Keep the
current action fixed and compare the conditional next-step laws:

| Test | History A | History B | Conclusion |
| --- | --- | --- | --- |
| Same state, same action | $S_t=s$, $A_t=a$ | $S_t=s$, $A_t=a$ | The visible input agrees |
| Different hidden history | an unopened door was seen | the door was opened earlier | Extra history may matter |
| Compare $P(S_{t+1},R_{t+1}\mid\text{history},a)$ | same law | same law | Markov representation |
| Compare the two laws | different law | different law | Add the missing fact to the state |

The state need not remember every past event. It must retain exactly the
information that changes future predictions under the available actions.

<a id="diagram"></a>

## Make the conditioning visible

<svg class="markov-diagram" viewBox="0 0 760 190" role="img" aria-labelledby="markov-diagram-title markov-diagram-description">
  <title id="markov-diagram-title">Markov conditioning diagram</title>
  <desc id="markov-diagram-description">Two histories enter the same state box. The state and action determine one next-state and reward distribution only when the histories have no hidden difference.</desc>
  <defs>
    <marker id="markov-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#markov-arrow)">
    <path d="M145 55 C210 55 220 88 275 88" />
    <path d="M145 135 C210 135 220 102 275 102" />
    <path d="M485 95 H635" />
  </g>
  <g fill="currentColor" text-anchor="middle" font-family="system-ui, sans-serif">
    <text x="78" y="50" font-size="16">history A</text>
    <text x="78" y="70" font-size="13">历史 A</text>
    <text x="78" y="130" font-size="16">history B</text>
    <text x="78" y="150" font-size="13">历史 B</text>
    <rect x="275" y="65" width="210" height="60" rx="12" fill="var(--vp-c-bg-soft)" stroke="currentColor" />
    <text x="380" y="91" font-size="16">state s + action a</text>
    <text x="380" y="111" font-size="13">状态 s + 动作 a</text>
    <text x="680" y="91" font-size="16">next law</text>
    <text x="680" y="111" font-size="13">下一步联合分布</text>
  </g>
</svg>

The diagram is a reasoning aid, not a claim that two arbitrary histories are
equivalent. The equality to check is

$$
P(S_{t+1}=s',R_{t+1}=r\mid S_t=s,A_t=a,H_t=h)
=P(S_{t+1}=s',R_{t+1}=r\mid S_t=s,A_t=a).
$$

<a id="practice"></a>

## Try it in the companion

- The [MDP lesson](../learn/ch01/mdp) contrasts sufficient and insufficient
  state descriptions.
- The [Grid World lab](../labs/ch01-gridworld) lets you inspect the Markov
  view, the transition distribution, and the model audit side by side.
- In the lab, first inspect the deterministic row. Then use the guided control
  to enable the 20% wind condition and observe how the transition law changes
  while the conditioning variables stay explicit.

<noscript>
This page is fully readable without JavaScript. The lab link remains useful as
a static explanation even when its interactive worker is unavailable.
</noscript>
