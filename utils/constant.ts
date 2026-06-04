import { clientNames, indexNames, trackingConfig } from "./typeDefinitions";

let clients: clientNames = {
  elastic: null,
};
let indices: indexNames = {
  elasticIndex: "ams",
};
let trackingSettings: trackingConfig = {
  batchSize: 100,
  failureThreshold: 10,
};

export { clients, indices, trackingSettings };
