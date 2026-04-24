import { clientNames, indexNames } from "./typeDefinitions";

let clients: clientNames = {
  elastic: null,
};
let indices: indexNames = {
  elasticIndex: "ams",
};

export { clients, indices };
