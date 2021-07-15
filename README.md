This is a nodejs project that can download Kaltura and Zoom videos that are linked within iframes on Brightspace. It is powered by [Puppeteer](https://pptr.dev/) for web scraping.

# Project status

Mostly working but incomplete. See [notes.txt](notes/notes.txt) for todos.

# Installing dependencies

## macOS or Linux: with Nix

1. Install [Nix](https://nixos.org/download.html) (requires macOS or Linux).
2. Run `nix-shell` in the project root. This will download nodejs. Proceed with this shell for the steps under [Running](#running).

## Any OS: without Nix

Without using Nix, such as on Windows, you can install [Node.js](https://nodejs.org/en/download/) manually to be able to run `node` on the command line.

Alternatively, use a package manager of your choice.

# Running

1. <a name="running">To download dependencies, run `npm install` in the project root.</a>
2. For each Brightspace course from which you want to save videos, copy the URL of the page that shows a listing of all videos (within Kaltura or Zoom) and paste it into the variable at the top of [index.js](index.js).

	- This page on Brightspace is usually reached by clicking the headings "Zoom" or "Media Gallery", so copy that URL. Place all these URLs in the file [index.js](index.js) under `// All pages to download` near the top of the file (replace the existing entries with your own), setting the corresponding `type:` field to either `"kaltura"` or `"zoom"` depending on which type that URL contains in its webpage. Also, note that you can skip entries by setting `skip:` to `true` instead of `false`. This is useful if you already downloaded them.
3. Run `node index.js` to run the downloader. Files will be saved to the `download` folder in the project root -- you can make this a symlink to any location if you want to change where the downloads go.
4. A Chromium window should open. It will ask you to log into Brightspace. Log in, then switch back to the terminal window and press enter.
5. The downloading will begin. If needed you can interrupt/stop it anytime and resume later -- it will skip files that were not downloaded in the current downloading session *and* whose file names already exist. (To change this behavior, you can change `skipDownloadsIfSameName = true;` to `false` in [index.js](index.js), which will make downloads overwrite existing files.)
