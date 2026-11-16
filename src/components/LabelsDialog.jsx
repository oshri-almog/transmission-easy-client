import React from "react";
import {observer} from "mobx-react";
import PropTypes from "prop-types";
import Dialog from "./Dialog";
import RootStoreCtx from "../tools/RootStoreCtx";
import getLabelHue from "../tools/getLabelHue";

const parseLabels = (value) => {
  const result = [];
  value.split(',').forEach((label) => {
    label = label.trim();
    if (label && result.indexOf(label) === -1) {
      result.push(label);
    }
  });
  return result;
};

@observer
class LabelsDialog extends React.PureComponent {
  static propTypes = {
    dialogStore: PropTypes.object.isRequired,
  };

  static contextType = RootStoreCtx;

  refInput = React.createRef();

  /**@return {RootStore}*/
  get rootStore() {
    return this.context;
  }

  /**@return {LabelsDialogStore}*/
  get dialogStore() {
    return this.props.dialogStore;
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    const entered = parseLabels(form.elements.labels.value);
    const initial = this.dialogStore.commonLabels.slice(0);
    const removed = initial.filter(label => entered.indexOf(label) === -1);
    const added = entered.filter(label => initial.indexOf(label) === -1);

    // Only touch the tags the user actually changed, so tags that just some of
    // the selected torrents have are kept. Group torrents by their new tag set
    // to send as few requests as possible.
    const groups = new Map();
    this.dialogStore.torrentIds.forEach((id) => {
      const torrent = this.rootStore.client.torrents.get(id);
      if (!torrent) return;

      const labels = torrent.labels.filter(label => removed.indexOf(label) === -1);
      added.forEach((label) => {
        if (labels.indexOf(label) === -1) {
          labels.push(label);
        }
      });

      const key = JSON.stringify(labels);
      if (key === JSON.stringify(torrent.labels.slice(0))) return;

      let group = groups.get(key);
      if (!group) {
        groups.set(key, group = {labels, ids: []});
      }
      group.ids.push(id);
    });

    groups.forEach(({labels, ids}) => {
      this.rootStore.client.setLabels(ids, labels);
    });

    this.dialogStore.close();
  };

  handleClose = (e) => {
    e && e.preventDefault();
    this.dialogStore.close();
  };

  handleAddKnown = (e) => {
    e.preventDefault();
    const label = e.currentTarget.dataset.label;
    const input = this.refInput.current;
    if (!input) return;

    const labels = parseLabels(input.value);
    const pos = labels.indexOf(label);
    if (pos === -1) {
      labels.push(label);
    } else {
      labels.splice(pos, 1);
    }
    input.value = labels.join(', ');
    input.focus();
  };

  render() {
    const knownLabels = this.rootStore.torrentList.allLabels;

    let known = null;
    if (knownLabels.length) {
      known = (
        <div className="nf-subItem known-tags">
          {knownLabels.map(label => (
            <span key={label} className="tag" data-label={label} title={label}
                  style={{'--tag-hue': String(getLabelHue(label))}}
                  onClick={this.handleAddKnown}>{label}</span>
          ))}
        </div>
      );
    }

    return (
      <Dialog onClose={this.handleClose}>
        <div className="nf-notifi">
          <form onSubmit={this.handleSubmit}>
            <div className="nf-subItem">
              <label>{chrome.i18n.getMessage('editTagsText')}</label>
              <input ref={this.refInput} type="text" name="labels" autoFocus={true}
                     defaultValue={this.dialogStore.commonLabels.join(', ')}/>
            </div>
            {known}
            <div className="nf-subItem">
              <input type="submit" value={chrome.i18n.getMessage('DLG_BTN_APPLY')}/>
              <input onClick={this.handleClose} type="button" value={chrome.i18n.getMessage('DLG_BTN_CANCEL')}/>
            </div>
          </form>
        </div>
      </Dialog>
    );
  }
}

export default LabelsDialog;
