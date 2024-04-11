# Steel Plant Tracker

Project with [Global Energy Monitor](https://globalenergymonitor.org), based on previous trackers, specifically Fossil Tracker and Coal Tracker

Quickbooks: "CoalSwarm:Coal Trackers 2021"

* Point based with clustering (production method)
* Introduces view params for the first time, in large part, to support links to single company searches
* Multiple attribute filters (production method, status)
* A second map "view", with points drawn as proportional symbols

## Hosting

Unknown. Likely via an iframe embedded in a WordPress page    

GH pages link: https://greeninfo-network.github.io/steel-tracker/

## Development

Pre-requisites:
* Node (>=12.0.0), npm (>=6.14.9), nvm (>= 0.32.1), yarn (>= 1.22.4)

To match the development node version:
```bash
nvm use
```

To install required packages (first time only on a new machine):
```bash
yarn install
```

To start a development server on `localhost:8080` and watch for changes:
```bash
yarn start
```

## Production
```bash
# build to the docs directory and commit to `main`
yarn build
```
The app is hosted on GitHub pages (via the `docs/` folder).

## Data Management

There are two primary sources
* Country boundaries (see the `documentation/update_country_geojson` directory for details)
* A single Google spreadhsheet is used to manage pipeline and terminal data. Currently these are combined directly in Sheets for export from a single tab named `data_export`
https://docs.google.com/spreadsheets/d/1jtlSobWul4D8jvlqZfK_eouJymaS0bo5zEVsju7KJdw/edit#gid=138895620

## Data update

1. Typically the client will email a link to a spreadsheet with data. Manually copy that sheet onto a temporary sheet, check that the column headings match, and then copy over the `raw_data` sheet. From there, check the formulas in the first row of all cols in data_export tab to ensure that the data is being copied/incorporated correctly
1. Save the [data_export tab](https://docs.google.com/spreadsheets/d/1jtlSobWul4D8jvlqZfK_eouJymaS0bo5zEVsju7KJdw/edit#gid=138895620) as `data/data.csv`
2. On major updates, run `documentation/update_country_geojson/make_countries_json.py` to capture boundaries for new countries that may have been added.


