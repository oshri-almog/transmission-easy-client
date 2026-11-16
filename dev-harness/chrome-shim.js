// Minimal fake `chrome` extension API for running the built pages inside
// iframes of dev-harness/index.html. The top window owns storage and routes
// runtime messages to the background frame.
(function () {
  const hub = window.top.__hub;

  const messages = (() => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/ext/_locales/en/messages.json', false);
    xhr.send();
    return JSON.parse(xhr.responseText);
  })();

  const clone = (v) => v === undefined ? v : JSON.parse(JSON.stringify(v));
  const noop = () => {};
  const listenerSet = () => {
    const set = [];
    return {
      addListener: fn => set.push(fn),
      removeListener: fn => { const i = set.indexOf(fn); if (i !== -1) set.splice(i, 1); },
      hasListener: fn => set.includes(fn),
      _set: set,
    };
  };

  const onMessage = listenerSet();
  const onChanged = {
    addListener: fn => hub.storageListeners.push(fn),
    removeListener: fn => { const i = hub.storageListeners.indexOf(fn); if (i !== -1) hub.storageListeners.splice(i, 1); },
  };

  const local = {
    get(keys, cb) {
      const data = hub.storage;
      let result = {};
      if (keys == null) {
        result = clone(data);
      } else if (typeof keys === 'string') {
        if (keys in data) result[keys] = clone(data[keys]);
      } else if (Array.isArray(keys)) {
        keys.forEach(k => { if (k in data) result[k] = clone(data[k]); });
      } else {
        Object.keys(keys).forEach(k => { result[k] = k in data ? clone(data[k]) : keys[k]; });
      }
      setTimeout(() => cb && cb(result));
    },
    set(obj, cb) {
      const changes = {};
      Object.keys(obj).forEach((k) => {
        changes[k] = {oldValue: clone(hub.storage[k]), newValue: clone(obj[k])};
        hub.storage[k] = clone(obj[k]);
      });
      setTimeout(() => {
        hub.storageListeners.slice(0).forEach(fn => { try { fn(clone(changes), 'local'); } catch (e) { console.error(e); } });
        cb && cb();
      });
    },
    remove(keys, cb) {
      [].concat(keys).forEach(k => delete hub.storage[k]);
      setTimeout(() => cb && cb());
    },
    clear(cb) { hub.storage = {}; setTimeout(() => cb && cb()); },
  };

  window.chrome = {
    i18n: {
      getMessage(key) { return messages[key] ? messages[key].message : ''; },
      getUILanguage() { return 'en'; },
    },
    runtime: {
      lastError: undefined,
      onMessage,
      getURL: p => '/ext/' + p,
      sendMessage(message, cb) {
        const bgListeners = hub.bgOnMessage ? hub.bgOnMessage._set : [];
        let done = false;
        const respond = (r) => { if (!done) { done = true; setTimeout(() => cb && cb(clone(r))); } };
        bgListeners.forEach(fn => fn(clone(message), {}, respond));
      },
    },
    storage: {local, sync: local, onChanged},
    browserAction: {setBadgeText: noop, setBadgeBackgroundColor: noop},
    contextMenus: {create: noop, removeAll: (cb) => cb && setTimeout(cb), onClicked: listenerSet()},
    notifications: {create: noop},
    tabs: {create: noop, executeScript: noop, sendMessage: noop},
  };

  if (window.__isBg) {
    hub.bgOnMessage = onMessage;
  }
})();
