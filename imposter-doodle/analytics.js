/* Website-only GA4 stream. No advertising signals; load only after consent. */
(() => {
  'use strict';
  const measurementId = 'G-LZHC3HZ6XX';
  const choiceKey = 'imposter-site-analytics-v1';
  const panel = document.getElementById('analytics-choice');
  const settings = document.getElementById('analytics-settings');
  const privacySignal = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  let enabled = false;
  let started = false;
  let pageSent = false;
  let previousFocus;

  // Only our campaign parameters go to GA. Drop click IDs, unknown queries and hashes.
  const pageUrl = new URL(location.origin + location.pathname);
  const query = new URLSearchParams(location.search);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const value = query.get(key);
    if (value && /^[a-zA-Z0-9_-]{1,100}$/.test(value)) pageUrl.searchParams.set(key, value);
  }
  let referrer = '';
  try { referrer = new URL(document.referrer).origin; } catch { /* Direct visit. */ }

  function readChoice() {
    try { return localStorage.getItem(choiceKey); } catch { return null; }
  }

  function gtag() { window.dataLayer.push(arguments); }

  function showChoice() {
    previousFocus = document.activeElement;
    panel.hidden = false;
    settings.setAttribute('aria-expanded', 'true');
  }

  function hideChoice() {
    panel.hidden = true;
    settings.setAttribute('aria-expanded', 'false');
    if (previousFocus === settings) settings.focus();
  }

  function clearCookies() {
    for (const item of document.cookie.split(';')) {
      const name = item.trim().split('=')[0];
      if (name !== '_ga' && !name.startsWith('_ga_')) continue;
      const suffixes = location.hostname.split('.');
      const domains = ['', location.hostname];
      while (suffixes.length > 1) {
        domains.push('.' + suffixes.join('.'));
        suffixes.shift();
      }
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; path=/${domain ? '; domain=' + domain : ''}; SameSite=Lax`;
      }
    }
  }

  function start() {
    enabled = true;
    window['ga-disable-' + measurementId] = false;
    if (!started) {
      started = true;
      window.dataLayer = window.dataLayer || [];
      gtag('consent', 'default', {
        analytics_storage: 'denied', ad_storage: 'denied',
        ad_user_data: 'denied', ad_personalization: 'denied',
      });
      gtag('consent', 'update', { analytics_storage: 'granted' });
      gtag('js', new Date());
      gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_expires: 60 * 60 * 24 * 30,
        cookie_update: false,
        page_location: pageUrl.href,
        page_referrer: referrer,
      });
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
      document.head.appendChild(script);
    } else {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    if (!pageSent) {
      pageSent = true;
      gtag('event', 'page_view', { send_to: measurementId });
    }
  }

  function choose(allow) {
    try { localStorage.setItem(choiceKey, allow ? 'granted' : 'denied'); } catch { /* Session choice still works. */ }
    if (allow && !privacySignal) {
      start();
    } else {
      enabled = false;
      window['ga-disable-' + measurementId] = true;
      if (started) gtag('consent', 'update', { analytics_storage: 'denied' });
      clearCookies();
    }
    hideChoice();
  }

  settings.hidden = false;
  settings.addEventListener('click', () => {
    showChoice();
    document.getElementById('analytics-decline').focus();
  });
  document.getElementById('analytics-accept').addEventListener('click', () => choose(true));
  document.getElementById('analytics-decline').addEventListener('click', () => choose(false));
  if (privacySignal) {
    document.getElementById('analytics-message').textContent = 'Your browser has requested no tracking. Website analytics stays off.';
    document.getElementById('analytics-accept').hidden = true;
    choose(false);
  } else if (readChoice() === 'granted') {
    start();
  } else if (readChoice() !== 'denied') {
    showChoice();
  }

  for (const [id, event, store] of [
    ['badge-appstore', 'app_store_click', 'app_store'],
    ['badge-play', 'play_store_click', 'google_play'],
  ]) {
    document.getElementById(id).addEventListener('click', (e) => {
      if (!enabled || e.defaultPrevented) return;
      const link = e.currentTarget;
      const normalNavigation = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !link.target;
      const params = { send_to: measurementId, store, link_url: link.href };
      if (normalNavigation) {
        e.preventDefault();
        let navigated = false;
        const go = () => {
          if (navigated) return;
          navigated = true;
          location.assign(link.href);
        };
        // Navigation always proceeds, including with a blocked/slow Google tag.
        setTimeout(go, 700);
        params.event_callback = go;
        params.event_timeout = 600;
      }
      gtag('event', event, params);
    });
  }
})();
