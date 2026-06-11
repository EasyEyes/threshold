// Virtual mock for log4javascript (nested psychojs dependency)
module.exports = {
  getLogger: () => ({
    setLevel: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    trace: () => {},
    fatal: () => {},
  }),
  Level: {
    ALL: 0,
    TRACE: 1,
    DEBUG: 2,
    INFO: 3,
    WARN: 4,
    ERROR: 5,
    FATAL: 6,
    OFF: 7,
  },
  getDefaultLogger: () => ({ info: () => {} }),
  setEnabled: () => {},
  isEnabled: () => true,
};
