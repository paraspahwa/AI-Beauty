const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require("metro-config/src/defaults/exclusionList");

const config = getDefaultConfig(__dirname);

config.resolver = {
	...config.resolver,
	blockList: exclusionList([
		/.*\\\.cxx\\.*/,
		/.*\/\.cxx\/.*/,
		/.*\\android\\\.gradle\\.*/,
		/.*\/android\/\.gradle\/.*/,
	]),
};

module.exports = config;
