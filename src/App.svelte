<script>
  import { onMount } from 'svelte';
  import Sims from './sims.js';
  import { profile, featured, projects, research, experience, skills, awards } from './data.js';

  const nav = [['work', 'Projects'], ['research', 'Research'], ['experience', 'Experience'], ['skills', 'Skills']];
  let theme = $state('dark');
  let modal = $state(null);
  let modalOpen = $state(false);
  let atStart = $state(true);
  let atEnd = $state(false);
  let rail;
  const canvases = {};
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function apply(t) {
    theme = t;
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('sr-theme', t); } catch {}
  }

  function openModal(m) {
    modal = m;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => (modalOpen = true)));
  }
  function closeModal() {
    modalOpen = false;
    document.body.style.overflow = '';
  }
  const openProject = (p) => openModal({ eyebrow: p.stack, title: p.name, body: p.desc, url: p.url });
  const openExp = (e) => openModal({ eyebrow: e.when, title: e.title, body: e.desc });
  const onKey = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  const activate = (fn) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
  };

  function onRailScroll() {
    if (!rail) return;
    atStart = rail.scrollLeft < 8;
    atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8;
  }
  const scrollRail = (dir) => rail?.scrollBy({ left: dir * 360, behavior: 'smooth' });

  function reveal(node) {
    if (reduced || !('IntersectionObserver' in window) || node.getBoundingClientRect().top < window.innerHeight) return;
    node.style.opacity = '0';
    node.style.transform = 'translateY(48px) scale(0.985)';
    node.style.transition = 'opacity .9s cubic-bezier(.2,.8,.2,1), transform .9s cubic-bezier(.2,.8,.2,1), background-color .3s';
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { node.style.opacity = '1'; node.style.transform = 'none'; io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  function immerse(node) {
    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;border-radius:inherit;z-index:-1';
    node.style.isolation = 'isolate';
    if (getComputedStyle(node).position === 'static') node.style.position = 'relative';
    node.prepend(c);
    const sim = Sims.mount(c, Sims.contactGlow(), { reduced });
    return { destroy() { sim.stop(); c.remove(); } };
  }

  onMount(() => {
    let t = 'dark';
    try { t = localStorage.getItem('sr-theme') || 'dark'; } catch {}
    apply(t);
    onRailScroll();
    const sims = Object.entries(canvases)
      .filter(([k, c]) => c && Sims[k])
      .map(([k, c]) => Sims.mount(c, Sims[k](), { reduced }));
    return () => { sims.forEach((s) => s.stop()); document.body.style.overflow = ''; };
  });
</script>

<svelte:window onkeydown={onKey} />

<header>
  <a href="#top" class="brand">{profile.name}</a>
  <nav>
    {#each nav as [id, label]}<a href="#{id}">{label}</a>{/each}
    <button
      class="theme"
      onclick={() => apply(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
      </svg>
    </button>
  </nav>
</header>

<div class="wrap">
  <main id="top">
    <section class="intro">
      <h1>Electrical and Computer Engineering at Shiv Nadar Institution of Eminence</h1>
      <section id="contact" class="contact">
        <canvas class="field" bind:this={canvases.contactGlow} aria-hidden="true"></canvas>
        <h2>Get in touch</h2>
        <div class="actions">
          <a href="mailto:{profile.email}" class="btn solid">Email</a>
          <a href={profile.github} class="btn">GitHub</a>
          <a href={profile.linkedin} class="btn">LinkedIn</a>
        </div>
      </section>
    </section>

    <section id="work" class="block">
      <div class="head">
        <h2 class="headline">Projects</h2>
        <a href="{profile.github}?tab=repositories">All repositories ›</a>
      </div>

      <div
        class="tile featured"
        role="button"
        tabindex="0"
        use:reveal
        use:immerse
        onclick={() => openProject(featured)}
        onkeydown={activate(() => openProject(featured))}
      >
        <span class="eyebrow">Featured</span>
        <h3>{featured.name}</h3>
        <p class="tagline">{featured.tagline}</p>
        <div class="links">
          <span class="more">Learn more ›</span>
          <a href={featured.url} onclick={(e) => e.stopPropagation()}>View on GitHub ›</a>
        </div>
        <div class="simwrap feat"><canvas bind:this={canvases.forestFire} aria-hidden="true"></canvas></div>
        <span class="stack-meta">{featured.stack}</span>
      </div>

      <div class="tiles">
        {#each projects as p}
          <div
            class="tile"
            role="button"
            tabindex="0"
            use:reveal
            use:immerse
            onclick={() => openProject(p)}
            onkeydown={activate(() => openProject(p))}
          >
            <h3>{p.name}</h3>
            <p class="tagline">{p.tagline}</p>
            <div class="links">
              <span class="more">Learn more ›</span>
              <a href={p.url} onclick={(e) => e.stopPropagation()}>View on GitHub ›</a>
            </div>
            {#if p.sim}<div class="simwrap"><canvas bind:this={canvases[p.sim]} aria-hidden="true"></canvas></div>{/if}
            <span class="stack-meta bottom">{p.stack}</span>
          </div>
        {/each}
      </div>
    </section>

    <section id="research" class="block">
      <h2 class="headline">Research</h2>
      {#each research as r}
        <div class="tile research" use:reveal use:immerse>
          <span class="eyebrow">{r.status}</span>
          <h3>{r.title}</h3>
          <p>{r.desc}</p>
        </div>
      {/each}
    </section>

    <section id="experience" class="block">
      <h2 class="headline">Experience and education</h2>
      <div class="rail" bind:this={rail} onscroll={onRailScroll}>
        {#each experience as e}
          <div
            class="card"
            role="button"
            tabindex="0"
            use:reveal
            use:immerse
            onclick={() => openExp(e)}
            onkeydown={activate(() => openExp(e))}
          >
            <span class="eyebrow">{e.when}</span>
            <h3>{e.title}</h3>
            <p>{e.short}</p>
            <span class="plus" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5v11M1.5 7h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
            </span>
          </div>
        {/each}
      </div>
      <div class="controls">
        <button class="ctrl" aria-label="Previous" style:opacity={atStart ? 0.36 : 1} onclick={() => scrollRail(-1)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <button class="ctrl" aria-label="Next" style:opacity={atEnd ? 0.36 : 1} onclick={() => scrollRail(1)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </section>

    <section id="skills">
      <h2 class="headline">Skills</h2>
      <div class="skills">
        {#each skills as s}
          <div class="item"><h3 class="small-h">{s.group}</h3><p>{s.items}</p></div>
        {/each}
      </div>
      <p class="meta narrow">{awards}</p>
    </section>
  </main>
</div>

<footer>
  <span>Copyright © 2026 {profile.name}</span>
  <a href="mailto:{profile.email}">{profile.email}</a>
</footer>

{#if modal}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="scrim" class:open={modalOpen} onclick={closeModal}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="dialog" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
      <button class="ctrl close" aria-label="Close" onclick={closeModal}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      </button>
      <span class="eyebrow">{modal.eyebrow}</span>
      <h3>{modal.title}</h3>
      <p>{modal.body}</p>
      {#if modal.url}<a href={modal.url}>View on GitHub ›</a>{/if}
    </div>
  </div>
{/if}

<style>
  :global(html) {
    scroll-behavior: smooth;
    --bg: #000; --fg: #f5f5f7; --fg2: #f5f5f7; --fg3: #f5f5f7; --line: #2d2d2f; --link: #2997ff;
    --nav: rgba(22, 22, 23, .8); --card: #161617; --modal: #1d1d1f;
    --ctrl: rgba(66, 66, 69, .72); --ctrl-hover: rgba(86, 86, 90, .8); --scrim: rgba(0, 0, 0, .6);
  }
  :global(html[data-theme='light']) {
    --bg: #fff; --fg: #1d1d1f; --fg2: #1d1d1f; --fg3: #1d1d1f; --line: #d2d2d7; --link: #0066cc;
    --nav: rgba(255, 255, 255, .8); --card: #f5f5f7; --modal: #fff;
    --ctrl: rgba(210, 210, 215, .64); --ctrl-hover: rgba(190, 190, 196, .8); --scrim: rgba(0, 0, 0, .32);
  }
  :global(body) {
    margin: 0; background: var(--bg); color: var(--fg);
    font-family: 'SF Pro Text', 'SF Pro Icons', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 17px; line-height: 1.47059; font-weight: 400; letter-spacing: -0.022em;
    -webkit-font-smoothing: antialiased; transition: background-color .3s, color .3s;
  }
  :global(h1), :global(h2), :global(h3) {
    font-family: 'SF Pro Display', 'SF Pro Icons', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    margin: 0; font-weight: 600;
  }
  :global(a) { color: var(--link); text-decoration: none; }
  :global(a:hover) { text-decoration: underline; }
  p { margin: 0; text-wrap: pretty; }

  .wrap { max-width: 1140px; margin: 0 auto; padding: 0 22px; }
  header {
    position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
    gap: 8px 24px; min-height: 48px; border-bottom: 1px solid var(--line);
    padding: 0 max(22px, calc((100% - 1140px) / 2));
    background: var(--nav); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px);
  }
  .brand { font-size: 12px; font-weight: 600; letter-spacing: -0.01em; color: var(--fg); }
  .brand:hover { text-decoration: none; }
  nav { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 28px; font-size: 12px; letter-spacing: -0.01em; }
  nav a, nav button { color: var(--fg); }
  nav a:hover, nav button:hover { text-decoration: none; opacity: .7; }
  nav button { background: none; border: 0; padding: 0; margin: 0; cursor: pointer; }
  .theme { display: flex; align-items: center; justify-content: center; width: 32px; height: 44px; }
  .theme svg { display: block; }

  main { display: flex; flex-direction: column; gap: 120px; padding: 96px 0 80px; }
  section { display: flex; flex-direction: column; gap: 40px; scroll-margin-top: 80px; }
  .block { gap: 28px; }

  h1 { font-size: 28px; line-height: 1.1; letter-spacing: 0; max-width: 760px; text-wrap: balance; }
  .headline { font-size: 32px; line-height: 1.125; letter-spacing: 0.004em; }
  .meta { font-size: 17px; line-height: 1.23536; font-weight: 600; letter-spacing: -0.022em; color: var(--fg3); }
  .narrow { max-width: 692px; }
  .eyebrow { font-size: 17px; line-height: 1.23536; font-weight: 600; letter-spacing: -0.022em; }

  .contact {
    position: relative; overflow: hidden; flex-direction: column; align-items: center; text-align: center; gap: 28px;
    padding: clamp(72px, 10vw, 120px) 32px; background: var(--card); color: var(--fg); border-radius: 28px;
    transition: background-color .3s, color .3s;
  }
  .contact h2 { position: relative; font-size: clamp(36px, 5.6vw, 64px); line-height: 1.0625; letter-spacing: -0.009em; white-space: nowrap; }
  .contact canvas.field { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
  .actions { position: relative; display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
  .btn { display: inline-flex; align-items: center; box-sizing: border-box; height: 48px; padding: 0 26px; border: 1px solid var(--link); border-radius: 980px; color: var(--link); background: var(--card); font-size: 17px; }
  .btn:hover { text-decoration: none; background: var(--link); color: #fff; }
  .solid { background: #0071e3; color: #fff; border-color: #0071e3; }
  .solid:hover { background: #0077ed; border-color: #0077ed; }

  .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 8px 16px; }

  .tile {
    display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px;
    box-sizing: border-box; min-width: 0; padding: 56px 32px 40px;
    background: var(--card); border-radius: 28px; cursor: pointer; transition: background-color .3s;
  }
  .tile h3 { font-size: clamp(28px, 3.4vw, 40px); line-height: 1.1; letter-spacing: 0; text-wrap: balance; }
  .tagline { font-size: clamp(17px, 1.8vw, 21px); line-height: 1.381; letter-spacing: 0.011em; max-width: 420px; text-wrap: balance; }
  .links { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 28px; margin-top: 12px; font-size: 17px; }
  .more { color: var(--link); }
  .stack-meta { font-size: 14px; line-height: 1.42859; font-weight: 600; letter-spacing: -0.016em; margin-top: 16px; }
  .stack-meta.bottom { margin-top: auto; padding-top: 32px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 12px; }

  .featured { padding: 72px 40px 40px; overflow: hidden; }
  .featured h3 { font-size: clamp(34px, 5vw, 56px); line-height: 1.07143; letter-spacing: -0.005em; max-width: 820px; }
  .featured .tagline { font-size: clamp(19px, 2.2vw, 24px); line-height: 1.16667; letter-spacing: 0.009em; max-width: 640px; }
  .featured .links { gap: 8px 32px; margin-top: 14px; }
  .simwrap { position: relative; width: 100%; min-width: 0; height: 240px; margin-top: 32px; }
  .simwrap.feat { max-width: 920px; height: 220px; margin-top: 40px; }
  .simwrap canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

  .research { cursor: default; min-height: 0; gap: 14px; padding: 88px clamp(24px, 6vw, 96px); }
  .research h3 { font-size: clamp(30px, 4.2vw, 48px); line-height: 1.08349; letter-spacing: -0.003em; max-width: 820px; }
  .research p { margin-top: 6px; font-size: clamp(17px, 1.8vw, 21px); line-height: 1.381; letter-spacing: 0.011em; max-width: 680px; }

  .rail { display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding-bottom: 4px; }
  .rail::-webkit-scrollbar { display: none; }
  .card {
    position: relative; flex: 0 0 min(78vw, 340px); height: 420px; box-sizing: border-box; scroll-snap-align: start;
    display: flex; flex-direction: column; gap: 10px; padding: 32px 30px;
    background: var(--card); border-radius: 28px; cursor: pointer; transition: background-color .3s;
  }
  .card h3 { font-size: 28px; line-height: 1.14286; letter-spacing: 0.007em; text-wrap: balance; }
  .plus {
    position: absolute; right: 22px; bottom: 22px; width: 36px; height: 36px; border-radius: 50%;
    background: var(--ctrl); color: var(--fg); display: flex; align-items: center; justify-content: center;
  }
  .controls { display: flex; justify-content: flex-end; gap: 14px; }
  .ctrl {
    width: 36px; height: 36px; border-radius: 50%; border: 0; padding: 0; background: var(--ctrl); color: var(--fg);
    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: opacity .3s, background-color .2s;
  }
  .ctrl:hover { background: var(--ctrl-hover); }

  .item { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .item .small-h { font-size: 17px; line-height: 1.23536; letter-spacing: -0.022em; }
  .skills { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px 40px; }

  .scrim {
    position: fixed; inset: 0; z-index: 20; background: var(--scrim);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    display: flex; justify-content: center; align-items: flex-start; overflow-y: auto;
    padding: min(10vh, 96px) 16px 48px; box-sizing: border-box;
    opacity: 0; visibility: hidden; transition: opacity .35s ease, visibility .35s;
  }
  .scrim.open { opacity: 1; visibility: visible; }
  .dialog {
    position: relative; width: 100%; max-width: 880px; box-sizing: border-box;
    padding: clamp(56px, 8vw, 88px) clamp(24px, 7vw, 80px);
    background: var(--modal); color: var(--fg); border-radius: 28px;
    display: flex; flex-direction: column; gap: 14px;
    transform: translateY(40px) scale(.97); transition: transform .5s cubic-bezier(.2, .8, .2, 1);
  }
  .scrim.open .dialog { transform: none; }
  .dialog h3 { font-size: clamp(32px, 4.4vw, 48px); line-height: 1.08349; letter-spacing: -0.003em; text-wrap: balance; }
  .dialog p { margin-top: 12px; font-size: clamp(19px, 2vw, 24px); line-height: 1.33; letter-spacing: 0.009em; }
  .dialog a { font-size: 17px; margin-top: 20px; }
  .close { position: absolute; top: 18px; right: 18px; }

  footer {
    display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 20px max(22px, calc((100% - 1140px) / 2)) 40px;
    border-top: 1px solid var(--line); font-size: 12px; line-height: 1.33337; letter-spacing: -0.01em; color: var(--fg3);
  }
  footer a { color: var(--fg3); }

  @media (prefers-reduced-motion: reduce) {
    .scrim, .dialog { transition: none; }
  }
</style>
