import {getRoot, types} from "mobx-state-tree";
import ListSelectStore from "./ListSelectStore";

const customLabels = ['ALL', 'DL', 'SEEDING', 'COMPL', 'ACTIVE', 'INACTIVE'];

const byColumnMap = {
  done: 'progress',
  downspd: 'downloadSpeed',
  upspd: 'uploadSpeed',
  upped: 'uploaded',
  added: 'addedTime',
  completed: 'completedTime',
  status: 'statusCode',
  labels: 'labelsStr',
};

/**
 * @typedef {ListSelectStore} TorrentListStore
 * @property {*} filters
 * @property {*} filteredTorrents
 * @property {*} sortedTorrents
 * @property {*} sortedTorrentIds
 * @property {*} _sortedIds
 * @property {function} afterCreate
 * @property {function} beforeDestroy
 */
const TorrentListStore = types.compose('TorrentListStore', ListSelectStore, types.model({

})).views((self) => {
  return {
    get allLabels() {
      /**@type RootStore*/const rootStore = getRoot(self);
      const labels = new Set();
      for (const torrent of rootStore.client.torrents.values()) {
        torrent.labels.forEach(label => labels.add(label));
      }
      return Array.from(labels).sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
    },
    get filters() {
      /**@type RootStore*/const rootStore = getRoot(self);
      const result = [];
      customLabels.forEach(label => result.push({label, custom: true}));

      const labels = self.allLabels.slice(0);
      // keep the selected tag in the list even if no torrent has it right now
      const selectedLabel = rootStore.config.selectedLabel;
      if (!selectedLabel.custom && labels.indexOf(selectedLabel.label) === -1) {
        labels.push(selectedLabel.label);
      }
      labels.forEach(label => result.push({label, custom: false}));
      return result;
    },
    get filteredTorrents() {
      /**@type RootStore*/const rootStore = getRoot(self);
      const filter = rootStore.config.selectedLabel;

      const result = [];
      for (const torrent of rootStore.client.torrents.values()) {
        if (!filter.custom) {
          if (torrent.labels.indexOf(filter.label) !== -1) {
            result.push(torrent);
          }
        } else {
          switch (filter.label) {
            case 'ALL': {
              result.push(torrent);
              break;
            }
            case 'DL': {
              if (torrent.isDownloading){
                result.push(torrent);
              }
              break;
            }
            case 'SEEDING': {
              if (torrent.isSeeding){
                result.push(torrent);
              }
              break;
            }
            case 'COMPL': {
              if (torrent.isCompleted){
                result.push(torrent);
              }
              break;
            }
            case 'ACTIVE': {
              if (torrent.isActive){
                result.push(torrent);
              }
              break;
            }
            case 'INACTIVE': {
              if (!torrent.isActive){
                result.push(torrent);
              }
              break;
            }
          }
        }
      }

      const {hideSeedingTorrents, hideFinishedTorrents} = rootStore.config;
      if (hideSeedingTorrents || hideFinishedTorrents) {
        return result.filter((torrent) => {
          if (hideSeedingTorrents && torrent.isSeeding) {
            return false;
          }
          if (hideFinishedTorrents && torrent.isFinished) {
            return false;
          }
          return true;
        });
      } else {
        return result;
      }
    },
    get sortedTorrents() {
      /**@type RootStore*/const rootStore = getRoot(self);
      const {by, direction} = rootStore.config.torrentsSort;
      const torrents = self.filteredTorrents.slice(0);

      const byColumn = byColumnMap[by] || by;

      const upDown = [-1, 1];
      if (direction === 1) {
        upDown.reverse();
      }

      torrents.sort((aa, bb) => {
        let a = aa[byColumn];
        let b = bb[byColumn];
        const [up, down] = upDown;

        if (byColumn === 'eta') {
          if (a === -1) {
            a = Infinity;
          }
          if (b === -1) {
            b = Infinity;
          }
        }

        if (byColumn === 'added' || byColumn === 'completed') {
          if (!a) {
            a = Infinity;
          }
          if (!b) {
            b = Infinity;
          }
        }

        if (a === b) {
          return 0;
        }
        if (a > b) {
          return up;
        }
        return down;
      });

      return torrents;
    },
    get sortedTorrentIds() {
      return self.sortedTorrents.map(torrent => torrent.id);
    },
    get _sortedIds() {
      return self.sortedTorrentIds;
    },
    afterCreate() {
      self.startSortedIdsWatcher();
    },
    beforeDestroy() {
      self.stopSortedIdsWatcher();
    }
  };
});

export default TorrentListStore;