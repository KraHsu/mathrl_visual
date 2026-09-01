import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'

import GridWorldLab from '../components/GridWorldLab.vue'
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
    app.component('GridWorldLab', GridWorldLab)
  },
} satisfies Theme
