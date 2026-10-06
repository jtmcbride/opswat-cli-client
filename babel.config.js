/** Jest can't run native dynamic import(); in tests, turn it into require() so lazy-loaded data loads. */
function dynamicImportToRequire({ types: t }) {
  const replace = (path, args) =>
    path.replaceWith(
      t.callExpression(t.memberExpression(t.callExpression(t.memberExpression(t.identifier('Promise'), t.identifier('resolve')), []), t.identifier('then')), [
        t.arrowFunctionExpression([], t.callExpression(t.identifier('require'), args)),
      ]),
    );
  return {
    visitor: {
      CallExpression(path) {
        if (path.node.callee.type === 'Import') replace(path, path.node.arguments);
      },
      ImportExpression(path) {
        replace(path, [path.node.source]);
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: { test: { plugins: [dynamicImportToRequire] } },
  };
};
