import {flow, types} from "mobx-state-tree";
import ConfigStore, {configKeys, normalizeColumnsConfig} from "./ConfigStore";
import getLogger from "../tools/getLogger";
import loadConfig from "../tools/loadConfig";
import ClientStore from "./ClientStore";

const logger = getLogger('BgStore');

/**
 * @typedef {Object} BgStore
 * @property {ConfigStore|undefined} config
 * @property {ClientStore} [client]
 * @property {function:Promise} fetchConfig
 * @property {function} flushClient
 * @property {function} afterCreate
 */
const BgStore = types.model('BgStore', {
  config: types.maybe(ConfigStore),
  client: types.optional(ClientStore, {}),
}).actions((self) => {
  return {
    fetchConfig: flow(function* () {
      try {
        const config = yield loadConfig(configKeys);

        normalizeColumnsConfig(config, (key, err) => {
          logger.error(`mergeColumns ${key} error, use default`, err);
        });

        self.config = {};
        Object.entries(config).forEach(([key, value]) => {
          try {
            self.config[key] = value;
          } catch (err) {
            logger.error(`fetchConfig key (${key}) error, use default value`, err);
          }
        });
      } catch (err) {
        logger.error('fetchConfig error, use default config', err);
      }
    }),
    flushClient() {
      self.client = undefined;
    }
  };
});

export default BgStore;