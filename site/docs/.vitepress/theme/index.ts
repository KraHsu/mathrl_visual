import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'

import BellmanLab from '../components/BellmanLab.vue'
import GridWorldLab from '../components/GridWorldLab.vue'
import MonteCarloLab from '../components/MonteCarloLab.vue'
import OptimalityLab from '../components/OptimalityLab.vue'
import PlanningLab from '../components/PlanningLab.vue'
import PreviewBanner from '../components/PreviewBanner.vue'
import StochasticApproximationLab from '../components/StochasticApproximationLab.vue'
import TemporalDifferenceLab from '../components/TemporalDifferenceLab.vue'
import ValueFunctionLab from '../components/ValueFunctionLab.vue'
import PolicyGradientLab from '../components/PolicyGradientLab.vue'
import ActorCriticLab from '../components/ActorCriticLab.vue'
import './custom.css'

const isPreview = import.meta.env.VITE_SITE_STAGE === 'preview'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(
      DefaultTheme.Layout,
      null,
      isPreview
        ? {
            'layout-top': () => h(PreviewBanner),
          }
        : {},
    ),
  enhanceApp({ app }) {
    app.component('BellmanLab', BellmanLab)
    app.component('GridWorldLab', GridWorldLab)
    app.component('MonteCarloLab', MonteCarloLab)
    app.component('OptimalityLab', OptimalityLab)
    app.component('PlanningLab', PlanningLab)
    app.component('StochasticApproximationLab', StochasticApproximationLab)
    app.component('TemporalDifferenceLab', TemporalDifferenceLab)
    app.component('ValueFunctionLab', ValueFunctionLab)
    app.component('PolicyGradientLab', PolicyGradientLab)
    app.component('ActorCriticLab', ActorCriticLab)
  },
} satisfies Theme
