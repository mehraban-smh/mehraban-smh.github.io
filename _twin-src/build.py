"""Rebuild the "Explore the house" digital twin inside index.html, in place.

    python3 _twin-src/build.py            # regenerate the house in ./index.html (run from the repo root)
    python3 _twin-src/build.py --check    # rebuild in memory and report whether index.html is already up to date
    python3 _twin-src/build.py --out x.html   # write the result elsewhere (e.g. a preview) instead of index.html

The current index.html is stripped of the previously generated house first, so edits elsewhere on the page are kept."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'gen'))
import splice

args = sys.argv[1:]
src = os.path.join(os.path.dirname(HERE), 'index.html')
out = args[args.index('--out') + 1] if '--out' in args else src
cur = open(src, encoding='utf-8').read()
new, markers = splice.build(splice.strip(cur))
if '--check' in args:
    print('index.html is up to date' if new == cur else 'index.html differs from a fresh build (%d vs %d chars)' % (len(cur), len(new)))
    sys.exit(0 if new == cur else 1)
open(out, 'w', encoding='utf-8').write(new)
print('wrote', out, len(new), 'chars;', 'unchanged' if new == cur else 'changed')
for k, v in markers.items():
    print(' ', k, 'markers', v)
