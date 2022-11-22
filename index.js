module.exports = {
  extend: '@apostrophecms/piece-type',

  options: {
    label: 'aposI18nStatic:label',
    pluralLabel: 'aposI18nStatic:pluralLabel',
    i18n: {
      ns: 'aposI18nStatic',
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
        label: 'aposI18nStatic:key',
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
        label: 'aposI18nStatic:namespace',
        type: 'select',
        choices: 'getNamespaces',
        required: true // TODO: check if import CSV fails if no namespace
      },
      valueSingular: {
        label: 'aposI18nStatic:valueSingular',
        type: 'string',
        required: true
      },
      valuePlural: {
        label: 'aposI18nStatic:valuePlural',
        type: 'string'
      },
      valueZero: {
        label: 'aposI18nStatic:valueZero',
        type: 'string',
        help: 'If applicable in this locale'
      },
      valuePluralTwo: {
        label: 'aposI18nStatic:valuePluralTwo',
        type: 'string',
        help: 'If applicable in this locale'
      },
      valuePluralFew: {
        label: 'aposI18nStatic:valuePluralFew',
        type: 'string',
        help: 'If applicable in this locale'
      },
      valuePluralMany: {
        label: 'aposI18nStatic:valuePluralMany',
        type: 'string',
        help: 'If applicable in this locale'
      }
    },
    group: {
      basics: {
        fields: [ 'key', 'namespace', 'valueSingular', 'valuePlural' ]
      },
      specifics: {
        label: 'aposI18nStatic:localeSpecificsForms',
        fields: [ 'valueZero', 'valuePluralTwo', 'valuePluralFew', 'valuePluralMany' ]
      }
    }
  },

  filters: {
    add: {
      namespace: {
        label: 'aposI18nStatic:namespace',
        def: null
      }
    }
  },

  columns: {
    add: {
      namespace: {
        label: 'aposI18nStatic:namespace'
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
      }

    };
  },

  handlers(self) {
    return {
      afterSave: {
        async generateNewGlobalId(req, piece) {
          self.apos.i18n.i18next.addResource(req.locale, piece.namespace, piece.title, piece.valueSingular);
          const i18nStaticId = self.apos.util.generateId();
          await self.apos.global.update(
            req,
            {
              ...req.data.global,
              i18nStaticId
            }
          );
        }
      }
    };
  },

  middleware(self) {
    return {
      async updateI18Next(req, res, next) {
        const aposLocale = `${req.locale}:${req.mode}`;
        self.i18nStaticIds = self.i18nStaticIds || {};

        if (self.i18nStaticIds[aposLocale] !== req.data.global.i18nStaticId) {
          // query i18n-static pieces and group them by namespace bc i18next handles resources this way
          const pipeline = [
            {
              $match: {
                aposLocale,
                type: '@apostrophecms/i18n-static'
              }
            },
            {
              $project: {
                _id: 0,
                title: 1,
                namespace: 1,
                valueZero: 1,
                valuePlural: 1,
                valueSingular: 1,
                valuePluralTwo: 1,
                valuePluralFew: 1,
                valuePluralMany: 1
              }
            },
            {
              $group: {
                _id: '$namespace',
                pieces: {
                  $push: '$$ROOT'
                }
              }
            }
          ];

          const namespaces = await self.apos.doc.db.aggregate(pipeline).toArray();

          for (const namespace of namespaces) {
            const ns = namespace._id;
            const resources = self.formatPieces(namespace.pieces);
            self.apos.i18n.i18next.addResourceBundle(req.locale, ns, resources, true, true);
          }
        }

        self.i18nStaticIds[aposLocale] = req.data.global.i18nStaticId;

        return next();
      }
    };
  }
};
