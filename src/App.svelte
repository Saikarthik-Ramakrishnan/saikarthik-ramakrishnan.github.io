<script>
  import { onMount } from 'svelte';
  import { profile, featured, projects, research, experience, skills, awards } from './data.js';

  const nav = [['work', 'Projects'], ['research', 'Research'], ['experience', 'Experience'], ['skills', 'Skills']];
  let theme = $state('dark');

  function apply(t) {
    theme = t;
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('sr-theme', t); } catch {}
  }
  onMount(() => {
    let t = 'dark';
    try { t = localStorage.getItem('sr-theme') || 'dark'; } catch {}
    apply(t);
  });
</script>

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
        <h2>Get in touch</h2>
        <div class="actions">
          <a href="mailto:{profile.email}" class="btn solid">Email</a>
          <a href={profile.github} class="btn">GitHub</a>
          <a href={profile.linkedin} class="btn">LinkedIn</a>
        </div>
      </section>
    </section>

    <section id="work" class="work">
      <div class="head">
        <h2 class="headline">Projects</h2>
        <a href="{profile.github}?tab=repositories">All repositories ›</a>
      </div>
      <div class="featured">
        <h3>{featured.name}</h3>
        <p>{featured.desc}</p>
        <div class="foot">
          <a href={featured.url}>View on GitHub ›</a>
          <span class="meta">{featured.stack}</span>
        </div>
      </div>
      <div class="grid">
        {#each projects as p}
          <div class="item">
            <h3>{p.name}</h3>
            <p>{p.desc}</p>
            <span class="meta">{p.stack}</span>
            <a href={p.url}>View on GitHub ›</a>
          </div>
        {/each}
      </div>
    </section>

    <section id="research">
      <h2 class="headline">Research</h2>
      {#each research as r}
        <div class="item narrow">
          <span class="meta">{r.status}</span>
          <h3>{r.title}</h3>
          <p>{r.desc}</p>
        </div>
      {/each}
    </section>

    <section id="experience">
      <h2 class="headline">Experience and education</h2>
      <div class="stack">
        {#each experience as e}
          <div class="timeline">
            <span class="meta">{e.when}</span>
            <div class="item">
              <h3>{e.title}</h3>
              <p>{e.desc}</p>
            </div>
          </div>
        {/each}
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

<style>
  :global(html) {
    scroll-behavior: smooth;
    --bg: #000; --fg: #f5f5f7; --fg2: #f5f5f7; --fg3: #f5f5f7; --line: #2d2d2f; --link: #2997ff;
    --nav: rgba(22, 22, 23, .8); --inv-bg: #f5f5f7; --inv-fg: #1d1d1f; --inv-fg2: #6e6e73; --inv-line: #d2d2d7; --inv-link: #0066cc; --card: #161617;
  }
  :global(html[data-theme='light']) {
    --bg: #fff; --fg: #1d1d1f; --fg2: #1d1d1f; --fg3: #1d1d1f; --line: #d2d2d7; --link: #0066cc;
    --nav: rgba(255, 255, 255, .8); --inv-bg: #1d1d1f; --inv-fg: #f5f5f7; --inv-fg2: #a1a1a6; --inv-line: #424245; --inv-link: #2997ff; --card: #f5f5f7;
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
    position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
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

  h1 { font-size: 28px; line-height: 1.1; letter-spacing: 0; }
  .headline { font-size: 32px; line-height: 1.125; letter-spacing: 0.004em; }
  h1 { max-width: 760px; text-wrap: balance; }
  .meta { font-size: 17px; line-height: 1.23536; font-weight: 600; letter-spacing: -0.022em; color: var(--fg3); }
  .narrow { max-width: 692px; }

  .contact {
    flex-direction: column; align-items: center; text-align: center; gap: 20px;
    padding: 48px 32px; background: var(--card); color: var(--fg); border-radius: 18px;
    transition: background-color .3s, color .3s;
  }
  .contact h2 { font-size: 24px; line-height: 1.16667; letter-spacing: 0.009em; white-space: nowrap; }
  .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
  .btn { display: inline-flex; align-items: center; box-sizing: border-box; height: 44px; padding: 0 22px; border: 1px solid var(--link); border-radius: 980px; color: var(--link); font-size: 17px; }
  .btn:hover { text-decoration: none; background: var(--link); color: #fff; }
  .solid { background: #0071e3; color: #fff; border-color: #0071e3; }
  .solid:hover { background: #0077ed; border-color: #0077ed; }

  .work { gap: 64px; }
  .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 8px 16px; }
  .featured { display: flex; flex-direction: column; gap: 12px; max-width: 692px; }
  .featured h3 { font-size: 28px; line-height: 1.14286; letter-spacing: 0.007em; text-wrap: balance; }
  .featured p { font-size: 21px; line-height: 1.381; letter-spacing: 0.011em; color: var(--fg2); }
  .foot { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: baseline; margin-top: 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 56px 64px; }

  .item { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .item h3 { font-size: 28px; line-height: 1.14286; letter-spacing: 0.007em; }
  .item p { color: var(--fg2); }
  .item .small-h { font-size: 17px; line-height: 1.23536; letter-spacing: -0.022em; }

  .stack { display: flex; flex-direction: column; gap: 40px; }
  .timeline { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 4px 40px; }
  .timeline .meta { padding-top: 4px; }
  .skills { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px 40px; }

  footer {
    display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 20px max(22px, calc((100% - 1140px) / 2)) 40px;
    border-top: 1px solid var(--line); font-size: 12px; line-height: 1.33337; letter-spacing: -0.01em; color: var(--fg3);
  }
  footer a { color: var(--fg3); }

  @media (max-width: 640px) {
    h1, .headline { font-size: 32px; line-height: 1.125; }
    .timeline { grid-template-columns: 1fr; }
  }
</style>
