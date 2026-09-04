---
id: concept-map
translation_key: concept-map
locale: en
origin: companion-original
source_kind: site-navigation
rights: companion-original
review_content: draft
review_language: draft
review_math: not_applicable
review_accessibility: draft
title: Learning map
description: Navigate the mathematical foundations of reinforcement learning as one connected path.
outline: deep
---

# Learning map

The chapters form a dependency graph rather than a list of isolated recipes.
The map below is a compact orientation tool; each node links to a full chapter
path in the navigation sidebar. This is an independently authored textbook path:
you do not need to read the upstream book first, which is used only as a topic
reference.

<a id="graph"></a>

## From interaction to control

<svg class="learning-map" viewBox="0 0 900 430" role="img" aria-labelledby="learning-map-title learning-map-description">
  <title id="learning-map-title">Learning map from interaction to actor-critic methods</title>
  <desc id="learning-map-description">Ten chapter nodes form a left-to-right path. Chapter 1 supplies the decision model; Chapters 2 through 4 derive and solve Bellman equations; Chapters 5 through 10 move through sampled, approximate, policy-gradient, and actor-critic methods.</desc>
  <defs>
    <marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#map-arrow)">
    <path d="M145 80 H225" /><path d="M335 80 H415" /><path d="M525 80 H605" />
    <path d="M660 110 V180 H580" /><path d="M465 210 H385" />
    <path d="M275 240 V315 H350" /><path d="M465 345 H545" />
    <path d="M660 345 H740" />
  </g>
  <g font-family="system-ui, sans-serif" text-anchor="middle" fill="currentColor">
    <g><rect x="25" y="45" width="120" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="85" y="75" font-size="17">1 · MDP</text><text x="85" y="97" font-size="13">interaction</text></g>
    <g><rect x="225" y="45" width="110" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="280" y="75" font-size="17">2 · $v_π$</text><text x="280" y="97" font-size="13">expectation</text></g>
    <g><rect x="415" y="45" width="110" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="470" y="75" font-size="17">3 · $v_*$</text><text x="470" y="97" font-size="13">optimality</text></g>
    <g><rect x="605" y="45" width="110" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="660" y="75" font-size="17">4 · planning</text><text x="660" y="97" font-size="13">known model</text></g>
    <g><rect x="465" y="180" width="115" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="522" y="210" font-size="17">5 · MC</text><text x="522" y="232" font-size="13">episodes</text></g>
    <g><rect x="275" y="315" width="110" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="330" y="345" font-size="17">6 · SA</text><text x="330" y="367" font-size="13">samples</text></g>
    <g><rect x="545" y="315" width="115" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="602" y="345" font-size="17">7–8 · TD</text><text x="602" y="367" font-size="13">approximation</text></g>
    <g><rect x="740" y="315" width="115" height="70" rx="14" fill="var(--vp-c-bg-soft)" stroke="currentColor"/><text x="797" y="345" font-size="17">9–10 · π</text><text x="797" y="367" font-size="13">actor–critic</text></g>
  </g>
</svg>

<a id="routes"></a>

## Chapter routes

| Stage | Question | Route |
| --- | --- | --- |
| 1 · Basic concepts | What is a state, action, reward, return, and MDP? | [Chapter 1](./learn/ch01/) |
| 2 · Policy evaluation | What is the expected return of a fixed policy? | [Chapter 2](./learn/ch02/) |
| 3 · Optimality | How does action choice enter the Bellman equation? | [Chapter 3](./learn/ch03/) |
| 4 · Planning | How do value and policy iteration solve a known model? | [Chapter 4](./learn/ch04/) |
| 5 · Monte Carlo | What can complete sampled episodes tell us? | [Chapter 5](./learn/ch05/) |
| 6 · Stochastic approximation | How do noisy incremental updates behave? | [Chapter 6](./learn/ch06/) |
| 7 · TD methods | How can a bootstrap target use partial experience? | [Chapter 7](./learn/ch07/) |
| 8 · Value functions | How can features and replay represent values? | [Chapter 8](./learn/ch08/) |
| 9 · Policy gradients | How can a policy optimize expected return directly? | [Chapter 9](./learn/ch09/) |
| 10 · Actor–Critic | How can actor and critic share an update signal? | [Chapter 10](./learn/ch10/) |

The [symbol glossary](./symbols) fixes notation, while the [Markov property
concept](./concepts/markov-property) explains the state-sufficiency test used at
the beginning of the path.

<noscript>
The map is an inline SVG with a text table fallback. All chapter links and
explanations remain available without JavaScript.
</noscript>
