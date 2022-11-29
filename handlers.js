const isEqual = require('lodash.isequal');

module.exports = self => {
  return {
    'apostrophe:modulesRegistered': {
      async addMissingPieces() {
        return await self.apos.lock.withLock('i18n-static-lock', async () => {
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

            const i18nStaticPiecesByNamespace = await self.findPiecesAndGroupByNamespace(`${locale}:draft`);
            const i18nStaticResources = i18nStaticPiecesByNamespace.reduce((acc, cur) => {
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

        return i18nStaticId;
      }
    }
  };
};
