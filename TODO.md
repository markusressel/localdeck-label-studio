# TODO

## Icon Selection

Icon selection is horrendous, we need a full-fledged picker that allows manual input, search and browsing through the entire icon set. We should also not only show the mdi set but
also
the standard browser emoji set, and whatever other icon sets we can find. The user should be able to select an icon and then change its color, size and position on the label.

## Label positioning

The automatic positioning is great right now, but sometimes manual adjustment is needed. Ideally we have a label box and an icon box, which can be snapped to center lines, but
freely adjusted when holding down "Ctrl" or something like that.
We should take inspiration from Figma and other design tools for this.

## Print Preview

The current print preview is ok, but it fills the entire screen which is very bad, it feels out of place, flashbangs the user, and it doesn't take the material choice into account.
It should also have a format selection, which defaults to vertical A4.

It should be possible to reposition items in the print preview, so the user can print multiple times on the same transparent sheet in different places.
To be able to align with previous printed labels, we should also have a grid and a ruler in the print preview.

The "cutting line" looks unnecessarily thick. We want to design it in a way that it is visible but not overly big. It should be spaced in a way that by cutting it off entirely the
full inner size of the cap is completely filled with the label. I am not 100% sure the 14x14mm size we currently have is the inner or the outter diameter of the transparent cap on the
white keycap itself.

The "Print" view should have a more fleshed out UI, which allows the user to select entries to print, defaulting to the ones which were in the LocalDeck Preview when clicking on "Print".
This should improve the "Include this label when printing" checkbox we have right now, which is not very intuitive.

## Configure multiple LocalDecks

We should allow the user to configure multiple LocalDecks. We would need a "Deck Manager" which allows the user to add, remove and select a LocalDeck configuration. 
Each LocalDeck should have its own configuration, but utilize the same global Label library.

## 3D Rendering (Experimental)

At this point I wonder if we should do a full 3D rendering of the hole keycaps using a library that allows this in the browser, with realistic lighting and all. The CSS hackery 
we use right now is probably not very sustainable. If we can use a real 3D rendering engine we can actually simulate the deck, the switch base with its base and stem, the white
keycap, the transparent cap on top, and the printed label with its selected material. This would allow us to simulate the RGB backlight more accurately, and also allow us
to simulate the label in different lighting conditions, like sunlight, room light, etc. I have no idea how difficult it would be to actually implement this though, if this is a
crazy rabbit hole we might still be better off with what we have right now, but I think it is worth investigating. Maybe we can even utilize ray tracing, for the ultimate realism.
