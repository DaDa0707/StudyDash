const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");
const coreRoot = path.resolve(repoRoot, "core");

const config = getDefaultConfig(projectRoot);

// web と mobile で同じロジックを使うため、リポジトリ直下の core/ を監視対象に含める。
// これが無いと core/ を編集しても Fast Refresh が反応しない。
config.watchFolders = [coreRoot];

// node_modules は mobile 側を優先しつつ、ルートも辿れるようにする
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(repoRoot, "node_modules"),
];

/**
 * "@core/xxx" を core/xxx へ解決する。
 *
 * extraNodeModules は使えない。Metro は "@" で始まる名前をスコープ付きパッケージ
 * （"@scope/name" で1つの名前）として扱うため、"@core" の前方一致が効かない。
 */
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@core/")) {
    const target = path.resolve(coreRoot, moduleName.slice("@core/".length));
    return context.resolveRequest(context, target, platform);
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
