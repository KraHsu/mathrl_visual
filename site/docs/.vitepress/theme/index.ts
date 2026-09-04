import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'

import BellmanLab from '../components/BellmanLab.vue'
import GridWorldLab from '../components/GridWorldLab.vue'
import GridPolicyEvaluationLab from '../components/GridPolicyEvaluationLab.vue'
import MonteCarloLab from '../components/MonteCarloLab.vue'
import OptimalityLab from '../components/OptimalityLab.vue'
import PlanningLab from '../components/PlanningLab.vue'
import ProgressPanel from '../components/ProgressPanel.vue'
import PreviewBanner from '../components/PreviewBanner.vue'
import PwaUpdatePrompt from '../components/PwaUpdatePrompt.vue'
import StochasticApproximationLab from '../components/StochasticApproximationLab.vue'
import TemporalDifferenceLab from '../components/TemporalDifferenceLab.vue'
import ValueFunctionLab from '../components/ValueFunctionLab.vue'
import PolicyGradientLab from '../components/PolicyGradientLab.vue'
import ActorCriticLab from '../components/ActorCriticLab.vue'
import PageEvidence from '../components/PageEvidence.vue'
import './custom.css'

const isPreview = import.meta.env.VITE_SITE_STAGE === 'preview'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(
      DefaultTheme.Layout,
      null,
      {
        // Keep the prompt in a dedicated top-level slot so it is visible in
        // both preview and production builds without changing page content.
        'layout-top': () => [
          ...(isPreview ? [h(PreviewBanner)] : []),
          h(PwaUpdatePrompt),
          h(PageEvidence, { homeOnly: true }),
        ],
        'doc-top': () => h(PageEvidence),
        'layout-bottom': () => h(ProgressPanel),
      },
    ),
  enhanceApp({ app }) {
    app.component('BellmanLab', BellmanLab)
    app.component('GridWorldLab', GridWorldLab)
    app.component('GridPolicyEvaluationLab', GridPolicyEvaluationLab)
    app.component('MonteCarloLab', MonteCarloLab)
    app.component('OptimalityLab', OptimalityLab)
    app.component('PlanningLab', PlanningLab)
    app.component('StochasticApproximationLab', StochasticApproximationLab)
    app.component('TemporalDifferenceLab', TemporalDifferenceLab)
    app.component('ValueFunctionLab', ValueFunctionLab)
    app.component('PolicyGradientLab', PolicyGradientLab)
    app.component('ActorCriticLab', ActorCriticLab)
    app.component('PwaUpdatePrompt', PwaUpdatePrompt)
  },
} satisfies Theme
