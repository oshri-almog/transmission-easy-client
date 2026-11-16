const cache = new Map();

/**
 * Stable color hue (0-359) for a tag name, so the same tag always gets the same color.
 * @param {string} label
 * @return {number}
 */
const getLabelHue = (label) => {
  let hue = cache.get(label);
  if (hue === undefined) {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = (hash * 31 + label.charCodeAt(i)) | 0;
    }
    hue = Math.abs(hash) % 360;
    cache.set(label, hue);
  }
  return hue;
};

export default getLabelHue;
