# Security policy

## Supported versions

Only the latest version on the `main` branch, which is what the live site serves, receives fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through GitHub instead: go to the repository's **Security** tab and choose **Report a vulnerability**. Include:

- what the problem is and what an attacker could do with it;
- steps or an input (or a share link) that reproduces it;
- the browser and version you tested in.

You should get an acknowledgement within a few days. Once a fix ships, the report can be disclosed, with credit to you if you'd like.

## Scope

The formatter runs entirely in the browser and makes no network requests. The most relevant issues are:

- script injection through pasted input, opened files, or share links (all three are untrusted);
- ways around the page's Content-Security-Policy;
- share links that can freeze or crash the page (decoded links are capped at 8 MB).
