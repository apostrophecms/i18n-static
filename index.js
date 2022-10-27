module.exports = {
    extend: '@apostrophecms/piece-type',
    options: {
      label: 'apostrophe-i18n-static',
    },
    fields: {
      add: {
        locale: {
          label: 'Locale',
          type: 'select',
          choices: 'getLocales',
          required: true,
        },
        key: {
          label: 'Key',
          type: 'string',
          required: true,
          disabled: false,
        },
        namespace: {
          label: 'Namespace',
          type: 'string',
        },
        valueSingular: {
          label: 'Singular Value',
          type: 'string',
          required: true,
        },
        valuePlural: {
          label: 'Plural Value',
          type: 'string',
        },
        valueZero: {
          label: 'Zero Value',
          type: 'string',
        },
        trash: {
          type: 'boolean',
          label: 'Trash',
          contextual: true,
          def: false,
        },
      },
    },
    methods(self) {
      return {
        getLocales(req) {
          return Object.entries(self.apos.i18n?.locales).map(([key, val]) => ({ label: val.label, value: key })) || []
        }
      }
    }
};
