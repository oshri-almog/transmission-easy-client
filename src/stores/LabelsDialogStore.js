import {getRoot, types} from "mobx-state-tree";

/**
 * @typedef {Object} LabelsDialogStore
 * @property {string} id
 * @property {string} type
 * @property {number[]} torrentIds
 * @property {string[]} commonLabels
 * @property {function} close
 */
const LabelsDialogStore = types.model('LabelsDialogStore', {
  id: types.identifier,
  type: types.literal('labels'),
  torrentIds: types.array(types.number),
  // tags every selected torrent had when the dialog was opened
  commonLabels: types.array(types.string),
}).views((self) => {
  return {
    close() {
      /**@type RootStore*/const rootStore = getRoot(self);
      rootStore.destroyDialog(self.id);
    }
  };
});

export default LabelsDialogStore;
