/**
 * Public route/provenance manifest for the original mathematical appendix.
 *
 * The appendix is companion material written for this site.  The upstream
 * appendix is linked as a topic reference only; no PDF text or artwork is
 * copied into the generated site.
 */

export const APPENDIX_SOURCE_COMMIT = '0e348961c28496096d308f1066009266b3674c5a'
export const APPENDIX_SOURCE_PDF_BLOB = 'd500366336c85f7853db704c434a87715ea0b211'
export const APPENDIX_SOURCE_PDF_SHA256 =
  '46438b9eb8b866b308d6790fcaa5bb2edb0b8b6bddd38ef424bfc1299e4f86d3'
export const ERRATA_SOURCE_PDF_BLOB = 'd5276e927e30ba94f39752f3b99fe41cfdd66615'
export const ERRATA_SOURCE_PDF_SHA256 =
  '5f19f38d7f58ae6a9d66618f7846318d8a8b869db162c772ffd28da694bafec8'

const upstreamBase =
  `https://github.com/MathFoundationRL/Book-Mathematical-Foundation-of-Reinforcement-Learning/blob/${APPENDIX_SOURCE_COMMIT}/`

export const APPENDIX_SOURCE_URL = `${upstreamBase}4%20-%20Appendix.pdf`
export const ERRATA_SOURCE_URL = `${upstreamBase}5%20-%20Errata%20for%20the%20Springer%20version.pdf`

export const APPENDIX_PAGES = Object.freeze([
  Object.freeze({
    slug: '',
    id: 'appendix-overview',
    title: { en: 'Appendix · Mathematical toolbox', 'zh-Hans': '附录 · 数学工具箱' },
  }),
  Object.freeze({
    slug: 'probability',
    id: 'appendix-probability',
    title: { en: 'Probability and expectation', 'zh-Hans': '概率与期望' },
  }),
  Object.freeze({
    slug: 'convergence',
    id: 'appendix-convergence',
    title: { en: 'Random sequences and convergence', 'zh-Hans': '随机序列与收敛' },
  }),
  Object.freeze({
    slug: 'linear-algebra',
    id: 'appendix-linear-algebra',
    title: { en: 'Vectors, norms, and projections', 'zh-Hans': '向量、范数与投影' },
  }),
  Object.freeze({
    slug: 'optimization',
    id: 'appendix-optimization',
    title: { en: 'Gradient geometry and optimization', 'zh-Hans': '梯度几何与优化' },
  }),
  Object.freeze({
    slug: 'glossary',
    id: 'appendix-glossary',
    title: { en: 'Bilingual symbol glossary', 'zh-Hans': '中英符号术语表' },
  }),
])

export function appendixRoute(page) {
  return `learn/appendix${page.slug ? `/${page.slug}` : '/'}`
}

export function appendixSourceMetadata() {
  return {
    source_commit: APPENDIX_SOURCE_COMMIT,
    source_pdf_blob: APPENDIX_SOURCE_PDF_BLOB,
    source_pdf_sha256: APPENDIX_SOURCE_PDF_SHA256,
  }
}
