module.exports = {
  extend: '@apostrophecms/piece-type',
  options: {
    label: 'i18nStatic:label',
    pluralLabel: 'i18nStatic:pluralLabel',
    i18n: {
      ns: 'i18nStatic',
      browser: true,
    },
    seoFields: false,
    openGraph: false,
  },
  fields: {
    add: {
      title: {
        label: 'i18nStatic:key',
        type: 'string',
        required: true,
        disabled: false,
      },
      namespace: {
        label: 'i18nStatic:namespace',
        type: 'select',
        choices: 'getNamespaces',
      },
      valueSingular: {
        label: 'i18nStatic:valueSingular',
        type: 'string',
        required: true,
      },
      valuePlural: {
        label: 'i18nStatic:valuePlural',
        type: 'string',
      },
      valueZero: {
        label: 'i18nStatic:valueZero',
        type: 'string',
      },
    },
    group: {
      basics: {
        fields: ['key', 'namespace', 'valueSingular', 'valuePlural', 'valueZero'],
      },
    },
  },
  filters: {
    add: {
      namespace: {
        label: 'i18nStatic:namespace',
        def: null,
      },
    },
  },
  methods(self) {
    return {
      getNamespaces(req) {
        return (
          Object.keys(self.apos.i18n.namespaces).map(ns => ({ label: ns, value: ns })) || [
            { label: 'default', value: 'default' },
          ]
        )
      },
    }
  },
}
