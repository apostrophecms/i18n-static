const isEqual = require('lodash.isequal');

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
        def: 'default',
        required: true // TODO: check if import CSV fails if no namespace
      },
      valueSingular: {
        label: 'aposI18nStatic:valueSingular',
        type: 'string',
        required: true,
        i18nValue: true
      },
      valuePlural: {
        label: 'aposI18nStatic:valuePlural',
        type: 'string',
        i18nValue: true
      },
      valueZero: {
        label: 'aposI18nStatic:valueZero',
        type: 'string',
        help: 'If applicable in this locale',
        i18nValue: true
      },
      valuePluralTwo: {
        label: 'aposI18nStatic:valuePluralTwo',
        type: 'string',
        help: 'If applicable in this locale',
        i18nValue: true
      },
      valuePluralFew: {
        label: 'aposI18nStatic:valuePluralFew',
        type: 'string',
        help: 'If applicable in this locale',
        i18nValue: true
      },
      valuePluralMany: {
        label: 'aposI18nStatic:valuePluralMany',
        type: 'string',
        help: 'If applicable in this locale',
        i18nValue: true
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
            ...(cur.valuePlural && { [`${cur.title}_plural`]: cur.valuePlural }),
            ...(cur.valueZero && { [`${cur.title}_zero`]: cur.valueZero }),
            ...(cur.valuePluralTwo && { [`${cur.title}_two`]: cur.valuePluralTwo }),
            ...(cur.valuePluralFew && { [`${cur.title}_few`]: cur.valuePluralFew }),
            ...(cur.valuePluralMany && { [`${cur.title}_many`]: cur.valuePluralMany })
          }),
          {}
        );
      },

      async findPiecesAndGroupByNamespace(aposLocale) {
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

        return self.apos.doc.db.aggregate(pipeline).toArray();
      }
    };
  },

  handlers(self) {
    return {
      'apostrophe:modulesRegistered': {
        async addMissingPieces() {
          const i18nextNamespaces = Object.keys(self.apos.i18n.namespaces)
            .filter(ns => !self.options.excludeNamespaces.includes(ns));

          const plurals = {
            plural: 'valuePlural',
            zero: 'valueZero',
            two: 'valuePluralTwo',
            few: 'valuePluralFew',
            many: 'valuePluralMany'
          };

          for (const locale of self.apos.i18n.i18next.options.languages) {
            const req = self.apos.task.getReq({
              locale,
              mode: 'draft'
            });
            const i18nextResources = i18nextNamespaces.reduce((acc, cur) => {
              const resources = self.apos.i18n.i18next.getResourceBundle(locale, cur);
              return {
                ...acc,
                ...(resources && { [cur]: resources })
              };
            },
            {});

            const i18nStaticPiecesByNamespace = await self.findPiecesAndGroupByNamespace(`${locale}:draft`);
            const i18nStaticResources = i18nStaticPiecesByNamespace.reduce((acc, cur) => {
              const ns = cur._id;
              const resources = self.formatPieces(cur.pieces);
              acc[ns] = resources;
              return acc;
            }, {});

            if (!isEqual(i18nextResources, i18nStaticResources)) {
              // eslint-disable-next-line no-console
              console.log(`Add missing pieces in i18n-static module for ${locale}...`);

              for (const [ namespace, resources ] of Object.entries(i18nextResources)) {
                for (const [ key, value ] of Object.entries(resources || {})) {
                  const formattedKey = key.split('_');
                  const valueToCheck = plurals[formattedKey[1]] || 'valueSingular';
                  const piece = await self
                    .find(req, {
                      title: formattedKey[0],
                      namespace
                    })
                    .toObject();

                  if (!piece) {
                    const draft = await self.insert(req, {
                      title: formattedKey[0],
                      namespace,
                      [valueToCheck]: value
                    });
                    await self.publish(req, draft);
                  } else if (!piece[valueToCheck]) {
                    const newPiece = {
                      ...piece,
                      [valueToCheck]: value
                    };
                    await self.update(req, newPiece);
                    await self.publish(req, newPiece);
                  }
                }
              }
            }
          }
        }
      },

      afterUpdate: {
        async generateNewGlobalId(req, piece) {
          const i18nFields = self.schema.filter(field => field.i18nValue);

          for (const field of i18nFields) {
            if (piece[field.name]) {
              self.apos.i18n.i18next.addResource(req.locale, piece.namespace, piece.title, piece[field.name]);
            }
          }

          const i18nStaticId = self.apos.util.generateId();
          req.data?.global && await self.apos.global.update(
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
          const namespaces = await self.findPiecesAndGroupByNamespace(aposLocale);

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
