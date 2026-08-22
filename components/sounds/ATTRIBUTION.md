# components/sounds attribution

- `dog-bark.mp3` — "Barking of a dog" by Amada44, CC BY-SA 3.0.
  Source: https://commons.wikimedia.org/wiki/File:Barking_of_a_dog.ogg
  Trimmed to 1.2 s, mono 22.05 kHz, 64 kbps.
- `reading-page-flip.mp3` — pre-existing (see git history).

`dog-bark.ts` is generated from `dog-bark.mp3` (base64 data URI — the
website webpack pipeline has no .mp3 loader). Regenerate:
`base64 -i dog-bark.mp3 | tr -d '\n'`
