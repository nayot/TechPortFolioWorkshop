# Deep Mentor Training Workshop Handbook

Complete modular XeLaTeX project for the Maejo Mentor Pool handbook.

## Build

The project requires XeLaTeX and the `TH Sarabun New` font.

```sh
xelatex -interaction=nonstopmode -halt-on-error main.tex
xelatex -interaction=nonstopmode -halt-on-error main.tex
```

The compiled print-ready A4 document is `main.pdf`.

## Structure

- `main.tex`: document assembly
- `style.tex`: fonts, Maejo color palette, page layout, and custom boxes
- `frontmatter/`: cover, preface, and closing remarks
- `part1/` through `part6/`: sixteen handbook chapters
- `appendix/`: checklist, prompt cheat sheet, and glossary
