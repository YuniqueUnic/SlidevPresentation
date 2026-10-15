import idl from './idl.grammar.mjs'

export default () => ({
  themes: { dark: 'vesper', light: 'vesper' },
  langs: ['ts', 'js', 'json', 'jsonc', 'python', 'rust', 'bash', 'diff', 'text', idl as any],
})
