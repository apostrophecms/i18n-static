const fs = require('fs-extra')

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
    editRole: 'admin',
    publishRole: 'admin',
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
  columns: {
    add: {
      namespace: {
        label: 'i18nStatic:namespace',
      },
    },
  },
  methods(self) {
    return {
      getNamespaces() {
        return (
          Object.keys(self.apos.i18n.namespaces).map(ns => ({ label: ns, value: ns })) || [
            { label: 'default', value: 'default' },
          ]
        )
      },

      formatPieces(pieces) {
        return pieces.reduce(
          (acc, cur) => ({
            ...acc,
            [`${cur.title}`]: cur.valueSingular,
            [`${cur.title}_plural`]: cur.valuePlural || undefined,
            [`${cur.title}_zero`]: cur.valueZero || undefined,
          }),
          {},
        )
      },

      async writeFile(locale) {
        try {
          const localesDir = self.apos.i18n.options.directory || 'modules/@apostrophecms/i18n/i18n'
          const file = localesDir + '/' + locale + '.json'
          await fs.ensureFile(file)

          const req = self.apos.task.getAnonReq()
          const pieces = await self
            .find(req)
            .locale(`${locale}:published`)
            .project({
              type: 1,
              title: 1,
              namespace: 1,
              valueSingular: 1,
              valuePlural: 1,
              valueZero: 1,
            })
            .toArray()
          const translations = self.formatPieces(pieces)
          await fs.writeJson(file, translations, { spaces: 2 })
        } catch (error) {
          console.error(error.message)
        }
      },
    }
  },
  tasks(self) {
    return {
      'generate-one': {
        usage: 'Write JSON file',
        async task(argv) {
          if (argv.locale) {
            await self.writeFile(argv.locale)
          }
        },
      },
      'generate-all': {
        usage: 'Write JSON files',
        async task(argv) {
          for (const locale of Object.keys(self.apos.i18n.locales)) {
            await self.writeFile(locale)
          }
        },
      },
    }
  },
}
