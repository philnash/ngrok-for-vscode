export const resolveNpmInvocation = ({
  nodePath = process.execPath,
  npmExecPath = process.env.npm_execpath,
} = {}) => {
  if (!npmExecPath) {
    throw new Error(
      "npm_execpath is not set; run this script through an npm script",
    );
  }
  return {
    command: nodePath,
    argsPrefix: [npmExecPath],
  };
};
