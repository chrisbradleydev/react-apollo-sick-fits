module.exports = {
    root: true,
    env: {
        'browser': true,
        'node': true,
        'jest': true,
    },
    parser: 'babel-eslint',
    parserOptions: {
        'ecmaVersion': 8,
        'ecmaFeatures': {
            'jsx': true,
        },
    },
    extends: [
        'plugin:react/recommended',
        'react-app',
    ],
    rules: {
        'no-alert': process.env.PRE_COMMIT
            ? 2
            : 0,
        'no-console': process.env.PRE_COMMIT
            ? [
                2,
                {
                    allow: ['warn', 'error']
                }
            ]
            : 0,
        'no-debugger': process.env.PRE_COMMIT
            ? 2
            : 0,
        'semi': [2, 'never'],
    },
}
