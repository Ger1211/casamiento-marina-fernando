/**
 * Backend selection: cloud primary, home PC fallback.
 *
 * One fast health probe decides which backend serves the page. The decision is
 * cached for the page session; a network failure mid-session triggers a single
 * re-probe and a retry on the other backend.
 *
 * Exposed as window.PhotoBackend so it can be tested outside the browser.
 */
(function (root) {
  'use strict';

  function create(options) {
    const cloudUrl = options.cloudUrl;
    const pcUrl = options.pcUrl;
    const timeoutMs = options.timeoutMs || 2000;
    const onSelect = options.onSelect || function () {};

    let base = cloudUrl;
    let pending = null;

    // Resolves false on timeout, network error or any non-2xx, so a broken
    // backend is treated the same as a dead one.
    function probe(url) {
      return new Promise(function (resolve) {
        const controller = new AbortController();
        const timer = setTimeout(function () {
          controller.abort();
          resolve(false);
        }, timeoutMs);

        fetch(url + '/api/health?t=' + Date.now(), {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        })
          .then(function (resp) {
            clearTimeout(timer);
            resolve(resp.ok);
          })
          .catch(function () {
            clearTimeout(timer);
            resolve(false);
          });
      });
    }

    function select(force) {
      if (pending && !force) return pending;

      pending = probe(cloudUrl).then(function (cloudUp) {
        base = cloudUp ? cloudUrl : pcUrl;
        onSelect(base);
        return base;
      });
      return pending;
    }

    // Only network-level failures reject fetch, so a validation error from the
    // server never triggers a retry on the other backend.
    async function withBackend(run) {
      await select();
      try {
        return await run(base);
      } catch (err) {
        const fallback = base === cloudUrl ? pcUrl : cloudUrl;
        if (!(await probe(fallback))) throw err;
        base = fallback;
        pending = Promise.resolve(fallback);
        onSelect(base);
        return run(base);
      }
    }

    return {
      select: select,
      withBackend: withBackend,
      getBase: function () {
        return base;
      }
    };
  }

  root.PhotoBackend = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);
