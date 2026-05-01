const sampleClips = [
  {
    kind: "TXT",
    title: "GitHub token setup command",
    preview: "export GITHUB_TOKEN=hidden && gh auth status",
    age: "2m",
    pinned: true
  },
  {
    kind: "URL",
    title: "CopClip onboarding checklist",
    preview: "https://copclip.app/docs/get-started",
    age: "9m"
  },
  {
    kind: "IMG",
    title: "Screenshot - permissions dialog",
    preview: "1,920 x 1,080 PNG copied from Preview",
    age: "17m"
  }
];

export function App() {
  const appInfo = window.copclip?.getAppInfo();

  return (
    <main className="stage" aria-label="CopClip app shell">
      <section className="desktop-shell" aria-label="Main CopClip window">
        <div className="window-bar">
          <div className="traffic" aria-label="macOS window controls">
            <span className="dot close" />
            <span className="dot min" />
            <span className="dot max" />
          </div>
          <div className="window-title">CopClip - Clipboard History</div>
          <div className="os-tabs" aria-label="Supported operating system">
            <span className="active">macOS</span>
          </div>
        </div>

        <div className="app-grid">
          <aside className="sidebar" aria-label="CopClip navigation">
            <div className="brand">
              <div className="mark">C</div>
              <div className="brand-text">
                <strong>CopClip</strong>
                <span>Clipboard, organized</span>
              </div>
            </div>

            <nav className="nav" aria-label="Primary">
              <button className="active" type="button">
                <span>History</span>
                <span className="count">0</span>
              </button>
              <button type="button">
                <span>Pinned</span>
                <span className="count">0</span>
              </button>
              <button type="button">
                <span>Settings</span>
              </button>
            </nav>

            <div className="privacy-card">
              <strong>
                <span className="status-dot" /> Private by default
              </strong>
              <p>History will stay local to this device. Clipboard capture is added in a later slice.</p>
            </div>
          </aside>

          <section className="history" aria-label="Clipboard popup placeholder">
            <div className="history-top">
              <div className="title-row">
                <h1>Clipboard history</h1>
                <span className="meta">{appInfo ? `${appInfo.name} ${appInfo.version}` : "App shell"}</span>
              </div>
              <p className="subtitle">Search, preview, pin, and paste recent copies from one focused utility window.</p>
              <label className="search">
                <span aria-hidden="true">/</span>
                <input aria-label="Search clipboard history" placeholder="Search clipboard history" disabled />
                <kbd>Cmd K</kbd>
              </label>
            </div>

            <div className="filters" aria-label="Clipboard filters">
              <button className="chip active" type="button">All</button>
              <button className="chip" type="button">Text</button>
              <button className="chip" type="button">Links</button>
              <button className="chip" type="button">Images</button>
            </div>

            <div className="list">
              {sampleClips.map((clip) => (
                <article className="clip" key={clip.title}>
                  <div className="clip-icon">{clip.kind}</div>
                  <div>
                    <div className="clip-title">
                      <strong>{clip.title}</strong>
                      {clip.pinned ? <span className="pill">Pinned</span> : null}
                    </div>
                    <p>{clip.preview}</p>
                  </div>
                  <span className="meta">{clip.age}</span>
                </article>
              ))}
            </div>
          </section>

          <aside className="settings" aria-label="Settings placeholder">
            <div className="preview-title">
              <h2>Settings</h2>
              <span>Placeholder</span>
            </div>
            <div className="preview-card">
              <h3>Ready for preferences</h3>
              <p>Hotkey, history limit, popup size, and theme controls will be implemented in a later issue.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
