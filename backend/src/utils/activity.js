const store = require('../data/store');

/**
 * Records an activity-feed entry. Mirrors the original frontend's
 * `pushActivity` helper, now living server-side so every client sees the
 * same feed instead of each browser tab keeping its own copy.
 */
function pushActivity({ kind, text, detail }) {
  return store.addActivity({
    id: store.genId(),
    kind,
    text,
    detail,
    time: 'Just now',
  });
}

/** "Krishna" (the seeded logged-in user) reads as "You" in feed text. */
function actorLabel(name) {
  return name === 'Krishna' ? 'You' : name;
}

module.exports = { pushActivity, actorLabel };
