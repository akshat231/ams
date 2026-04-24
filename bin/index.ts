#!/usr/bin/env node
import logger from "../utils/logger";
import createConfig from "./utils/init";
const args = process.argv.slice(2);

if (args.length === 0) {
  logger.info(
    'No arguments were provided. Valid argument is: "init"',
  );
} else {
  const argument = args[0];
  const directory = process.cwd();
  if (argument === "init") {
    createConfig(directory);
  } else {
    logger.info(`Unknown argument: "${argument}". Valid argument is: "init"`);
  }
}
