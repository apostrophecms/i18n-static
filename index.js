const fs = require('fs-extra');

module.exports = {
  extend: '@apostrophecms/piece-type',
  options: {
    label: 'i18nStatic:label',
    pluralLabel: 'i18nStatic:pluralLabel',
    i18n: {
      ns: 'i18nStatic',
      browser: true
    },
    seoFields: false,
    openGraph: false,
    editRole: 'admin',
    publishRole: 'admin',
    excludeNamespaces: [],
    export: true,
    import: true
  },
  fields: {
    add: {
      title: {
        label: 'i18nStatic:key',
        type: 'string',
        required: true
      },
      slug: {
        type: 'slug',
        label: 'apostrophe:slug',
        following: [ 'title', 'archived' ],
        required: true,
        readOnly: true
      },
      namespace: {
        label: 'i18nStatic:namespace',
        type: 'select',
        choices: 'getNamespaces'
      },
      valueSingular: {
        label: 'i18nStatic:valueSingular',
        type: 'string',
        required: true
      },
      valuePlural: {
        label: 'i18nStatic:valuePlural',
        type: 'string'
      },
      valueZero: {
        label: 'i18nStatic:valueZero',
        type: 'string',
        help: 'If applicable in this locale'
      },
      valuePluralTwo: {
        label: 'i18nStatic:valuePluralTwo',
        type: 'string',
        help: 'If applicable in this locale'
      },
      valuePluralFew: {
        label: 'i18nStatic:valuePluralFew',
        type: 'string',
        help: 'If applicable in this locale'
      },
      valuePluralMany: {
        label: 'i18nStatic:valuePluralMany',
        type: 'string',
        help: 'If applicable in this locale'
      }
    },
    group: {
      basics: {
        fields: [ 'key', 'namespace', 'valueSingular', 'valuePlural' ]
      },
      specifics: {
        label: 'i18nStatic:localeSpecificsForms',
        fields: [ 'valueZero', 'valuePluralTwo', 'valuePluralFew', 'valuePluralMany' ]
      }
    }
  },
  filters: {
    add: {
      namespace: {
        label: 'i18nStatic:namespace',
        def: null
      }
    }
  },
  columns: {
    add: {
      namespace: {
        label: 'i18nStatic:namespace'
      }
    }
  },
  queries(self, query) {
    return {
      builders: {
        namespace: {
          def: null,
          finalize() {
            const namespace = query.get('namespace');
            if (namespace === null) {
              return;
            }
            query.and({ namespace });
          },
          launder(value) {
            const choices = self.getNamespaces();
            return self.apos.launder.select(value, choices, null);
          },
          async choices() {
            const req = self.apos.task.getReq();
            const pieces = await self.find(req).toArray();

            return [ ...new Set(pieces.map(piece => JSON.stringify({
              label: piece.namespace,
              value: piece.namespace
            }))) ].map(JSON.parse);
          }
        }
      }
    };
  },
  methods(self) {
    return {
      getNamespaces() {
        return (
          Object.keys(self.apos.i18n.namespaces)
            .filter(ns => !self.options.excludeNamespaces.includes(ns))
            .map(ns => ({
              label: ns,
              value: ns
            })) || [ {
            label: 'default',
            value: 'default'
          } ]
        );
      },

      formatPieces(pieces) {
        return pieces.reduce(
          (acc, cur) => ({
            ...acc,
            [`${cur.title}`]: cur.valueSingular,
            [`${cur.title}_plural`]: cur.valuePlural || undefined,
            [`${cur.title}_zero`]: cur.valueZero || undefined,
            [`${cur.title}_two`]: cur.valuePluralTwo || undefined,
            [`${cur.title}_few`]: cur.valuePluralFew || undefined,
            [`${cur.title}_many`]: cur.valuePluralMany || undefined
          }),
          {}
        );
      },

      async writeFile(locale) {
        try {
          const localesDir = self.apos.i18n.options.directory || 'modules/@apostrophecms/i18n/i18n';
          const file = localesDir + '/' + locale + '.json';
          await fs.ensureFile(file);

          const req = self.apos.task.getAnonReq();
          const pieces = await self
            .find(req)
            .locale(`${locale}:published`)
            .project({
              type: 1,
              title: 1,
              namespace: 1,
              valueSingular: 1,
              valuePlural: 1,
              valueZero: 1
            })
            .toArray();
          const translations = self.formatPieces(pieces);
          await fs.writeJson(file, translations, { spaces: 2 });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error.message);
        }
      }
    };
  },

  handlers(self) {
    return {
      afterSave: {
        async regenerateFiles() {
          console.log('=================> PASSING HERE !! <=================');
        }
      }
    };
  },

  tasks(self) {
    return {
      'generate-one': {
        usage: 'Write JSON file',
        async task(argv) {
          if (argv.locale) {
            await self.writeFile(argv.locale);
          }
        }
      },
      'generate-all': {
        usage: 'Write JSON files',
        async task() {
          for (const locale of Object.keys(self.apos.i18n.locales)) {
            await self.writeFile(locale);
          }
        }
      }
    };
  }
};
