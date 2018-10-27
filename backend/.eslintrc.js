module.exports = {
    root: true,
    env: {
        'node': true,
        'jest': true,
    },
    parserOptions: {
        'ecmaVersion': 8,
    },
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
