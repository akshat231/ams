import logger from "./logger";
import { connectElasticDB } from "./elastic";
import { elasticConfig, clientNames, indexNames } from "./typeDefinitions";
import { readConfig } from "./fileRead";

const connectElastic = async (config: elasticConfig) => {
  try {
    const client = await connectElasticDB(config);
    logger.info("Elastic Client Connected Successfully");
    return client;
  } catch (error) {
    throw error;
  }
};

const getAllClients = async () => {
  const clientObject: clientNames = {
    elastic: null,
  };
  const indexObject: indexNames = {
    elasticIndex: "ams",
  };
  try {
    const directory = process.cwd();
    const configData = await readConfig(directory);
    if (configData["elastic"]["enable"]) {
      logger.info("Elastic Client is enabled");
      const client = await connectElastic(configData["elastic"]);
      const index = configData["elastic"]["index"] || "ams";
      indexObject.elasticIndex = index;
      clientObject.elastic = client;
    }
    return { clientObject, indexObject };
  } catch (error) {
    logger.error("Error in starting clients: ", error);
    return  { clientObject, indexObject }
  }
};

export { getAllClients };
