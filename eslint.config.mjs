import nextConfig from 'eslint-config-next'
import reactHooks from 'eslint-plugin-react-hooks'

/**
 * Local ESLint plugin: no-raw-heading-tag
 *
 * Disallows direct use of <h1>–<h6> in JSX.
 * Use <Heading level={N}> instead.
 */
const noRawHeadingTag = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow raw <h1>–<h6> JSX elements; use <Heading level={N}> instead.',
      recommended: true,
    },
    schema: [],
    messages: {
      noRawHeading:
        'Raw <{{tag}}> is not allowed. Use <Heading level={{level}}> from @/components/ui/typography/Heading instead.',
    },
  },
  create(context) {
    const RAW_HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

    return {
      JSXOpeningElement(node) {
        const name = node.name
        if (name.type !== 'JSXIdentifier') return
        const tag = name.name
        if (!RAW_HEADING_TAGS.has(tag)) return
        const level = tag.slice(1) // 'h1' → '1'
        context.report({
          node,
          messageId: 'noRawHeading',
          data: { tag, level },
        })
      },
    }
  },
}

const localPlugin = {
  rules: {
    'no-raw-heading-tag': noRawHeadingTag,
  },
}

/**
 * Filter out eslint-config-next entries that use eslint-plugin-react@7.
 * react@7 is incompatible with ESLint v10 (removed getFilename API).
 * We keep @next/eslint-plugin-next, react-hooks, jsx-a11y, and typescript entries.
 */
const filteredNextConfig = nextConfig.filter((entry) => {
  if (!entry.plugins) return true
  // Drop any entry whose plugins include 'react' (eslint-plugin-react@7)
  return !Object.prototype.hasOwnProperty.call(entry.plugins, 'react')
})

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Use filtered Next.js config (without incompatible react plugin)
  ...filteredNextConfig,

  // Re-register react-hooks plugin + rules.
  // eslint-config-next bundles react-hooks into the same flat-config entry as
  // eslint-plugin-react@7 (entry 0), which filteredNextConfig drops wholesale to
  // stay ESLint v10 compatible. That left `react-hooks/*` rules undefined, so inline
  // `eslint-disable react-hooks/exhaustive-deps` comments errored as "rule not found".
  // We re-register react-hooks here (direct devDep) and restore Next.js defaults
  // (rules-of-hooks: error, exhaustive-deps: warn) so the disable directives resolve.
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Register local plugin and enable rule globally
  {
    plugins: {
      local: localPlugin,
    },
    rules: {
      'local/no-raw-heading-tag': 'error',
    },
  },

  // Exception: allow raw heading tags inside the Heading component itself
  {
    files: ['src/components/ui/typography/Heading.tsx'],
    rules: {
      'local/no-raw-heading-tag': 'off',
    },
  },
]
