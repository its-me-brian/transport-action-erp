// ============================================================================
// TEST_HELPERS.GS — Funciones auxiliares para testing
// ============================================================================

const TestResults = {
  passed: 0,
  failed: 0,
  errors: [],

  reset() {
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  },

  pass(name) {
    this.passed++;
    Logger.log('  ✅ ' + name);
  },

  fail(name, message) {
    this.failed++;
    this.errors.push({ name: name, message: message });
    Logger.log('  ❌ ' + name + ': ' + message);
  },

  summary() {
    var total = this.passed + this.failed;
    Logger.log('');
    Logger.log('═══════════════════════════════════════');
    Logger.log('  RESULTS: ' + this.passed + '/' + total + ' passed, ' + this.failed + ' failed');
    Logger.log('═══════════════════════════════════════');
    if (this.errors.length > 0) {
      Logger.log('');
      Logger.log('FAILURES:');
      this.errors.forEach(function(e) { Logger.log('  - ' + e.name + ': ' + e.message); });
    }
    return { passed: this.passed, failed: this.failed, total: total, errors: this.errors };
  }
};

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error((message || 'assertEquals') + ': expected "' + expected + '", got "' + actual + '"');
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error((message || 'assertTrue') + ': expected truthy, got ' + value);
  }
}

function assertFalse(value, message) {
  if (value) {
    throw new Error((message || 'assertFalse') + ': expected falsy, got ' + value);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    throw new Error((message || 'assertThrows') + ': expected error but none thrown');
  } catch (e) {
    if (e.message && e.message.indexOf('expected error but none thrown') !== -1) {
      throw e;
    }
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error((message || 'assertNotNull') + ': expected not null, got ' + value);
  }
}

function assertGreaterThan(actual, expected, message) {
  if (!(actual > expected)) {
    throw new Error((message || 'assertGreaterThan') + ': expected ' + actual + ' > ' + expected);
  }
}

function _runTest(name, fn) {
  try {
    fn();
    TestResults.pass(name);
    return true;
  } catch (e) {
    TestResults.fail(name, e.message);
    return false;
  }
}
