const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require("metro-config/src/defaults/exclusionList");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const srcRoot = path.resolve(workspaceRoot, "src");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver = {
  ...config.resolver,
  blockList: exclusionList([
    /.*\\\.cxx\\.*/,
    /.*\/\.cxx\/.*/,
    /.*\\android\\\.gradle\\.*/,
    /.*\/android\/\.gradle\/.*/,
  ]),
  nodeModulesPaths: [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
  ],
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName.startsWith("@web/")) {
      const target = path.join(srcRoot, moduleName.slice(5));
      return context.resolveRequest(context, target, platform);
    }

    if (moduleName.startsWith("@/")) {
      const origin = context.originModulePath ?? "";
      const normalized = origin.split(path.sep).join("/");
      const inMonorepoSrc = normalized.includes("/src/") || normalized.includes("/AI-Beauty/src/");
      const target = inMonorepoSrc
        ? path.join(srcRoot, moduleName.slice(2))
        : path.join(projectRoot, moduleName.slice(2));
      return context.resolveRequest(context, target, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
