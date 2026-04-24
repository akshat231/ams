import { Client } from "@elastic/elasticsearch";
import logger from "./logger";
import { elasticConfig, logPayload } from "./typeDefinitions";

const connectElasticDB = async (config:elasticConfig) => {
  try {
    const client = new Client({
        node: config.node,
        auth: {
            username: config.username,
            password: config.password
        }
    })
    return client;
  } catch (error) {
    throw error;
  }
};
const ingestElastic = async (data: logPayload, client: Client, index: string) => {
  try {
    await client.index({
      index,
      document: data
    })
  } catch (error) {
    throw error
  }
}

export {
  connectElasticDB,
  ingestElastic
}