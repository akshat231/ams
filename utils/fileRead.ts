import fs from "fs";
import path from "path";
import logger from "./logger";


const readConfig = async (directory: string) => {
  try {
    const filePath = path.join(directory, "config", "ams.json");
    if (!fs.existsSync(filePath)) {
      logger.error("Error: file ams.json does not exist");
      throw new Error("File ams.json do not exist");
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    logger.info('Config file is read and parsed');
    return data;
  } catch (error) {
    logger.error("Initializing failed: ", error);
    throw error;
  }
};

export {
    readConfig
}