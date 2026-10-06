# Kenney GameBox Asset Library

This directory vendors the actual Kenney runtime game assets for reuse by GameBox projects.

- Original creator: Kenney — https://kenney.nl/
- Licence: Creative Commons Zero (CC0 1.0)
- Runtime library source: https://github.com/shorepine/kenney
- Pinned source commit: 3694c6879e487c108f55677be7dd2ca75b07cc3b
- Source repository states it was built from a Kenney all-in-one asset dump.

Imported runtime content:

- 2d/ — individual 2D sprite PNGs
- ui/ — individual UI element PNGs
- icons/ — individual icon PNGs
- 3d/ — glTF-binary models plus required textures
- index.tsv — searchable image index supplied by the source library
- 3d/kits.tsv — 3D kit index supplied by the source library

The source runtime library intentionally omits duplicate packaging/source formats such as
spritesheets, tilemaps and vectors where the individual runtime sprites are already present.
It also omits FBX-only skinned-character kits; those can be imported separately when needed.

Kenney states its game assets are CC0 and may be used in personal, educational and commercial
projects without attribution. Attribution is nevertheless appreciated.

## Additional itch.io catalogue pack

Kenney Animated Characters 3 is a CC0 rigged/animated pack shown on the requested
Kenney itch.io catalogue. The bulk runtime mirror excludes FBX-only skinned-character
kits, so this pack is imported separately from Kenney's original OpenGameArt upload:
https://opengameart.org/content/animated-characters-3
