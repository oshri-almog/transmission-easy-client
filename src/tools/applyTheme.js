import {autorun} from "mobx";

const STORAGE_KEY = 'transmissionEasyClient.theme';
const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

let currentTheme = 'auto';

const readCachedTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'auto';
  } catch (err) {
    return 'auto';
  }
};

const writeCachedTheme = (theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (err) {
    // ignore, the cache only avoids a light flash on open
  }
};

const resolveTheme = (theme) => {
  if (theme === 'dark' || theme === 'light') {
    return theme;
  }
  return darkQuery && darkQuery.matches ? 'dark' : 'light';
};

const render = () => {
  const resolved = resolveTheme(currentTheme);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
};

const setTheme = (theme) => {
  currentTheme = theme || 'auto';
  writeCachedTheme(currentTheme);
  render();
};

if (darkQuery) {
  const onChange = () => {
    if (currentTheme === 'auto') {
      render();
    }
  };
  if (darkQuery.addEventListener) {
    darkQuery.addEventListener('change', onChange);
  } else if (darkQuery.addListener) {
    darkQuery.addListener(onChange);
  }
}

/**
 * Apply the last used theme right away (before the config is loaded),
 * then keep the page in sync with rootStore.config.theme.
 * @param {RootStore} rootStore
 * @return {function} dispose
 */
const applyTheme = (rootStore) => {
  currentTheme = readCachedTheme();
  render();

  return autorun(() => {
    if (rootStore.config) {
      setTheme(rootStore.config.theme);
    }
  });
};

export default applyTheme;
