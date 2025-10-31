# Maitham Alrubaye
# u:account: alrubayem88
# VIS25W - Assignment 2 - Line Chart Visualization

## This line chart is built using D3.js v7.9.0 (https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js) to visualize global fertility rates (1960–2020) from the `data.csv` file.
- Multi-series lines showing fertility rate per country over time.
- Context (brushable) overview to select the visible year range.
- Hover to highlight a country and mirror the highlight in the brushable chart.
- Click to pin a country label at the series end (keeps label visible).
- Dynamic x-axis tick selection depending on the visible year span.
- Subtle grid lines, accessible chart title, and responsive scaling of viewBox.
- MARKS: Lines (focus & brushable), Labels, Axis text, Grid lines, Brush selection.
- CHANNELS: year position, value position, highlights, brush selection.
- ALMIGHTY LINK: https://wwwlab.cs.univie.ac.at/~alrubayem88/VIS25W/A2/

## Design Choices: 
- Line chart to show temporal trends across many countries without overplotting.
- Brushable context provides an easy way to zoom the main chart to a subset of years.
- Labels are positioned at the last visible point and pinned on click to help better observation.
- Colors and stroke widths highlight user interactions (hover/pin).

## Data Source: World fertility rate 1960-2020

## Run Locally:
python/python3 -m http.server OR python/python2 -m SimpleHTTPServer then open http://localhost:8000 in a browser unless using a different port.

## Online Access: https://wwwlab.cs.univie.ac.at/~alrubayem88/VIS25W/A2/

## Files: index.html, style.css, vis.js, data.csv, d3.min.js and this README.md.

## Github Repository: https://github.com/Maitham16/vda_exercise_2