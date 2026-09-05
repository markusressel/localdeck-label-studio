# TODO

## Bugs

- Changing the icon doesn't immediately update the UI, changing its color also doesn't. Neither the LocalDeck preview nor the Label Library.
- The buttons on the print preview overlap each other
- When clicking on "Print Now", the print preview has huge margins on the sides of the A4 page, which is wasted real estate. The print preview should fill almost the entire page,
  only leaving a small margin to avoid printing on the edge of the paper sheet.
- When refreshing the page, the current entry selection is not remembered

## Icon Selection

Icon selection is horrendous, we need a full-fledged picker that allows manual input, search and browsing through the entire icon set. We should also not only show the mdi set but
also
the standard browser emoji set, and whatever other icon sets we can find. The user should be able to select an icon and then change its color, size and position on the label.

## Icons in Label Text

We also want the user to be able to use icons in the label text field! We can do it like Discord with `:icon-name:` syntax.

## Label positioning

The automatic positioning is great right now, but sometimes manual adjustment is needed. Ideally we have a label box and an icon box, which can be snapped to center lines, but
freely adjusted when holding down "Ctrl" or something like that.
We should take inspiration from Figma and other design tools for this.

## Light Mode

### Paper looks still wrong

Even in Light Mode the backlight should be _somewhat_ visible through thin paper. With the current implementation
even light paper blocks the backlight pretty much completely, at least visually. Paper diffuses light as well, that should be taken into account.

## Dark Mode

### The color of the RGB lighting doesn't affect which colors of the things on the label are actually visible

A green backlight should show red text on the label as black, but it should still be visible. The current implementation makes it look red instead, which would not be possible in
real life. EDIT: Ah actually it _is_ working for the paper materials, but it is not working for the transparent film material. While it is true that the transparent film is transparent,
the color on it is still printed and only visible when its illuminated by external sources.

At this point I wonder if we should do a full 3D rendering of the hole keycaps using a library that allows this in the browser, with realistic lighting and all. The CSS hackery 
we use right now is probably not very sustainable. If we can use a real 3D rendering engine we can actually simulate the deck, the switch base with its base and stem, the white
keycap, the transparent cap on top, and the printed label with its selected material. This would allow us to simulate the RGB backlight more accurately, and also allow us
to simulate the label in different lighting conditions, like sunlight, room light, etc. I have no idea how difficult it would be to actually implement this though, if this is a
crazy rabbit hole we might still be better off with what we have right now, but I think it is worth investigating. Maybe we can even utilize ray tracing, for the ultimate realism.

## RGB Backlight Simulation

Besides a static color, we should support simple effects as well, like breathing, rainbow, etc. so the user can more accurately preview how colors on a lable will look like
in scenarios they will encounter in the real-world.

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

## Export/Import

We should provide an export and import functionality, so users can backup their entire configurations and load them in at a
later time.

## Configure multiple LocalDecks

We should allow the user to configure multiple LocalDecks. We would need a "Deck Manager" which allows the user to add, remove and select a LocalDeck configuration. 
Each LocalDeck should have its own configuration, but utilize the same global Label library.
