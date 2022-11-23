module.exports = {
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
};
