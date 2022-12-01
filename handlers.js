const isEqual = require('lodash.isequal');

module.exports = self => {
  return {
    'apostrophe:modulesRegistered': {
      async addMissingPieces() {
        return self.apos.lock.withLock('i18n-static-lock', async () => {
          let modified = false;

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

            let cachedI18nStaticResources = await self.apos.cache.get(locale, 'i18n-static');
            if (!cachedI18nStaticResources) {
              cachedI18nStaticResources = await self.findPiecesAndGroupByNamespace(`${locale}:draft`);
              await self.apos.cache.set(req.locale, 'i18n-static', cachedI18nStaticResources);
            }
            const i18nStaticResources = cachedI18nStaticResources.reduce((acc, cur) => {
              const ns = cur._id;
              const resources = self.formatPieces(cur.pieces);
              acc[ns] = resources;
              return acc;
            }, {});

            if (!isEqual(i18nextResources, i18nStaticResources)) {
              modified = true;
              // eslint-disable-next-line no-console
              console.log(`Add missing pieces in i18n-static module for ${locale}...`);

              for (const [ namespace, resources ] of Object.entries(i18nextResources)) {
                for (const [ key, value ] of Object.entries(resources || {})) {
                  const [ title, pluralType ] = key.split('_');
                  const valueToCheck = plurals[pluralType] || 'valueSingular';
                  const props = {
                    title,
                    namespace
                  };

                  const existingPiece = await self.find(req, props).toObject();

                  if (!existingPiece) {
                    await self.insert(req, {
                      ...props,
                      [valueToCheck]: value
                    });
                  } else if (!existingPiece[valueToCheck]) {
                    const newPiece = {
                      ...existingPiece,
                      [valueToCheck]: value
                    };
                    await self.update(req, newPiece);
                  }
                }
              }
            }
          }

          return modified;
        });
      }

    },

    afterUpdate: {
      async generateNewGlobalId(req, piece) {
        let updatedField, updatedValue;
        const i18nFields = self.schema.filter(field => field.i18nValue);

        for (const field of i18nFields) {
          if (piece[field.name]) {
            updatedField = field.name;
            updatedValue = piece[field.name];
            self.apos.i18n.i18next.addResource(req.locale, piece.namespace, piece.title, updatedValue);
            break;
          }
        }

        const aposLocale = `${req.locale}:${req.mode}`;
        const i18nStaticPiecesByNamespace = await self.findPiecesAndGroupByNamespace(aposLocale);
        for (const namespace of i18nStaticPiecesByNamespace) {
          if (namespace._id === piece.namespace) {
            for (const i18nStaticPiece of namespace.pieces) {
              if (i18nStaticPiece._id === piece._id) {
                i18nStaticPiece[updatedField] = updatedValue;
                break;
              }
            }
            break;
          }
        }
        await self.apos.cache.set(req.locale, 'i18n-static', i18nStaticPiecesByNamespace);

        const i18nStaticId = self.apos.util.generateId();
        req.data?.global && await self.apos.global.update(
          req,
          {
            ...req.data.global,
            i18nStaticId
          }
        );

        return i18nStaticId;
      }
    }
  };
};
