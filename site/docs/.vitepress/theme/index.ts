import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'

import BellmanLab from '../components/BellmanLab.vue'
import GridWorldLab from '../components/GridWorldLab.vue'
import MonteCarloLab from '../components/MonteCarloLab.vue'
import OptimalityLab from '../components/OptimalityLab.vue'
import PlanningLab from '../components/PlanningLab.vue'
import PreviewBanner from '../components/PreviewBanner.vue'
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
  },
} satisfies Theme
