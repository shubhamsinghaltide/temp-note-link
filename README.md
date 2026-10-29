# Temp Note Link

Notepad-style page that turns your text into a temporary shareable link. No backend: the note is deflate-compressed and stored in the URL hash.

## Enable GitHub Pages
1. Push this folder to a repo's `main` branch.
2. Settings -> Pages -> Source: **GitHub Actions**.
3. After the workflow in the Actions tab finishes, the URL appears in Settings -> Pages (`https://<user>.github.io/<repo>/`).

## Notes
- Expiry is soft: the timestamp lives in the link and the page refuses to show expired notes. Anyone can edit the link to bypass it.
- Long notes make long URLs; some chat apps truncate beyond ~8k characters.
