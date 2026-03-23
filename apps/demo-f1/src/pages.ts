/**
 * demo-f1 page registrations
 *
 * Registers all 9 F1 demo application pages via the workspace PageRegistry.
 * Pages appear in the sidebar, command palette, and page picker automatically
 * — zero configuration needed by the end user after seed.
 *
 * This file is loaded at app startup as a module side-effect. Import it in
 * your root layout or workspace page:
 *
 *   import '@demo-f1/src/pages';
 *
 * Templates used (one per template type, demonstrating all 6):
 *   table-listing      — Races, Drivers, Constructors
 *   summary-dashboard  — Championship
 *   multi-tab-detail   — Driver Profile
 *   data-explorer      — Lap Time Explorer
 *   form-page          — Race Report
 *   timeline-activity  — Race Weekend
 *   dashboard          — My Dashboard
 *
 * Cross-page navigation (configured via metadata.navigateTo):
 *   driver name        → Driver Profile (id: 'f1-driver-profile')
 *   race name          → Race Weekend   (id: 'f1-race-weekend')
 *   constructor name   → Constructors   (id: 'f1-constructors')
 *
 * All data sources use the generic Prisma data engine (US-202/203):
 *   dataSource.type  = 'prisma'
 *   dataSource.model = '<PrismaModelName>'
 *
 * Custom formatters from US-222 are referenced in metadata.fieldDisplayTypes
 * (keyed by field key) so VastuTable picks up the custom renderer.
 * The metadata.fieldDisplayTypes map is the canonical pattern used by the
 * BuilderPanel (FieldConfigSection) to store per-field display type overrides.
 *
 * Implements VASTU-2A-223.
 */

import { registerPage } from '@vastu/workspace';

// ---------------------------------------------------------------------------
// Public constants — exported for tests and external tooling
// ---------------------------------------------------------------------------

/** All registered F1 demo page IDs in sidebar order. */
export const F1_PAGE_IDS = [
  'f1-races',
  'f1-drivers',
  'f1-constructors',
  'f1-championship',
  'f1-driver-profile',
  'f1-lap-time-explorer',
  'f1-race-report',
  'f1-race-weekend',
  'f1-my-dashboard',
] as const;

/** Total number of F1 demo pages. */
export const F1_PAGES_COUNT = F1_PAGE_IDS.length;

// ---------------------------------------------------------------------------
// Guard — module-level side-effect registrations run once.
// Because this file may be imported multiple times across HMR cycles in
// development, we catch the duplicate-ID error gracefully instead of crashing.
// ---------------------------------------------------------------------------

function safeRegisterPage(...args: Parameters<typeof registerPage>): void {
  try {
    registerPage(...args);
  } catch {
    // Duplicate registration is expected during hot-module reload in dev.
    // In production the module only loads once.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[demo-f1] page already registered, skipping:', args[0].id);
    }
  }
}

/**
 * Register all F1 demo pages with the workspace PageRegistry.
 *
 * Safe to call multiple times — already-registered pages are silently skipped
 * in development (duplicate-ID error is caught internally by safeRegisterPage).
 *
 * This function is called automatically as a module side-effect when this
 * file is first imported. Tests can also call it explicitly after
 * clearPageRegistry() to reset state between test cases.
 */
export function registerF1Pages(): void {
// ---------------------------------------------------------------------------
// 1. Races — table-listing (order 0)
//
// Shows every race across all seasons. Default sort: date descending so the
// most recent race appears first. Season and round provide calendar context.
// Row click navigates to Race Weekend (race detail timeline).
// The weather column uses the custom 'weather' formatter (US-222).
// ---------------------------------------------------------------------------

safeRegisterPage({
  id: 'f1-races',
  name: 'Races',
  icon: 'IconFlag',
  template: 'table-listing',
  section: 'pages',
  order: 0,
  config: {
    templateType: 'table-listing',
    dataSource: {
      type: 'prisma',
      model: 'Race',
    },
    fields: [
      {
        key: 'season.year',
        label: 'Season',
        type: 'number',
        sortable: true,
        filterable: true,
        width: 80,
      },
      {
        key: 'round',
        label: 'Round',
        type: 'number',
        sortable: true,
        width: 70,
      },
      {
        key: 'name',
        label: 'Race',
        type: 'text',
        sortable: true,
        filterable: true,
        width: 200,
      },
      {
        key: 'circuit.name',
        label: 'Circuit',
        type: 'relation',
        sortable: true,
        filterable: true,
        width: 180,
      },
      {
        key: 'date',
        label: 'Date',
        type: 'date',
        sortable: true,
        filterable: true,
        width: 110,
      },
      {
        key: 'weather',
        label: 'Weather',
        type: 'enum',
        sortable: true,
        filterable: true,
        width: 100,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        sortable: true,
        filterable: true,
        width: 110,
      },
      {
        key: 'laps_completed',
        label: 'Laps',
        type: 'number',
        sortable: true,
        width: 70,
      },
      {
        key: 'safety_car_laps',
        label: 'SC Laps',
        type: 'number',
        sortable: true,
        width: 80,
      },
    ],
    metadata: {
      // Per-field display type overrides (read by BuilderPanel + VastuTable integration)
      fieldDisplayTypes: {
        weather: 'weather',
      },
      summaryStrip: {
        enabled: true,
        metrics: [
          {
            id: 'total-races',
            label: 'Total Races',
            value: 0,
            dataSource: { type: 'prisma', model: 'Race' },
            aggregation: 'count',
          },
          {
            id: 'wet-races-pct',
            label: 'Wet Race %',
            value: 0,
            dataSource: { type: 'prisma', model: 'Race' },
            aggregation: 'count',
            filters: { weather: { in: ['Wet', 'Mixed'] } },
            format: 'percent',
          },
          {
            id: 'avg-safety-cars',
            label: 'Avg SC Laps',
            value: 0,
            dataSource: { type: 'prisma', model: 'Race' },
            aggregation: 'avg',
            field: 'safety_car_laps',
            format: 'decimal',
          },
        ],
      },
      defaultSort: [{ column: 'date', direction: 'desc' }],
      // Row click navigates to the Race Weekend timeline for that race
      rowNavigateTo: {
        targetPageId: 'f1-race-weekend',
        recordId: '{id}',
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 2. Drivers — table-listing (order 1)
//
// All drivers across the fictional F1 grid. Row click and name column both
// navigate to Driver Profile. Nationality uses the nationality-flag formatter.
// ---------------------------------------------------------------------------

safeRegisterPage({
  id: 'f1-drivers',
  name: 'Drivers',
  icon: 'IconUsers',
  template: 'table-listing',
  section: 'pages',
  order: 1,
  config: {
    templateType: 'table-listing',
    dataSource: {
      type: 'prisma',
      model: 'Driver',
    },
    fields: [
      {
        key: 'number',
        label: '#',
        type: 'number',
        sortable: true,
        width: 55,
      },
      {
        key: 'abbreviation',
        label: 'Code',
        type: 'text',
        width: 65,
      },
      {
        key: 'first_name',
        label: 'First Name',
        type: 'text',
        sortable: true,
        filterable: true,
        width: 130,
      },
      {
        key: 'last_name',
        label: 'Last Name',
        type: 'text',
        sortable: true,
        filterable: true,
        width: 130,
      },
      {
        key: 'nationality',
        label: 'Nationality',
        type: 'text',
        sortable: true,
        filterable: true,
        width: 120,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        sortable: true,
        filterable: true,
        width: 100,
      },
      {
        key: 'championships',
        label: 'Championships',
        type: 'number',
        sortable: true,
        width: 120,
      },
      {
        key: 'wins',
        label: 'Wins',
        type: 'number',
        sortable: true,
        width: 70,
      },
      {
        key: 'podiums',
        label: 'Podiums',
        type: 'number',
        sortable: true,
        width: 80,
      },
      {
        key: 'poles',
        label: 'Poles',
        type: 'number',
        sortable: true,
        width: 70,
      },
    ],
    metadata: {
      fieldDisplayTypes: {
        nationality: 'nationality-flag',
      },
      summaryStrip: { enabled: false },
      defaultSort: [{ column: 'last_name', direction: 'asc' }],
      // Clicking a row opens Driver Profile with this driver's record
      rowNavigateTo: {
        targetPageId: 'f1-driver-profile',
        recordId: '{id}',
      },
      // Column-level navigation: clicking last_name also navigates to Driver Profile
      columnNavigateTo: {
        last_name: {
          targetPageId: 'f1-driver-profile',
          recordId: '{id}',
        },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 3. Constructors — table-listing (order 2)
//
// All fictional constructors, sorted by championships descending.
// Nationality uses the nationality-flag formatter from US-222.
// ---------------------------------------------------------------------------

safeRegisterPage({
  id: 'f1-constructors',
  name: 'Constructors',
  icon: 'IconBuildingFactory2',
  template: 'table-listing',
  section: 'pages',
  order: 2,
  config: {
    templateType: 'table-listing',
    dataSource: {
      type: 'prisma',
      model: 'Constructor',
    },
    fields: [
      {
        key: 'name',
        label: 'Constructor',
        type: 'text',
        sortable: true,
        filterable: true,
        width: 180,
      },
      {
        key: 'full_name',
        label: 'Full Name',
        type: 'text',
        sortable: true,
        width: 240,
      },
      {
        key: 'nationality',
        label: 'Nationality',
        type: 'text',
        sortable: true,
        filterable: true,
        width: 120,
      },
      {
        key: 'base',
        label: 'Base',
        type: 'text',
        sortable: true,
        width: 150,
      },
      {
        key: 'team_principal',
        label: 'Principal',
        type: 'text',
        sortable: true,
        width: 150,
      },
      {
        key: 'engine_supplier',
        label: 'Engine',
        type: 'text',
        sortable: true,
        filterable: true,
        width: 120,
      },
      {
        key: 'championships',
        label: 'Championships',
        type: 'number',
        sortable: true,
        width: 120,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        sortable: true,
        filterable: true,
        width: 100,
      },
    ],
    metadata: {
      fieldDisplayTypes: {
        nationality: 'nationality-flag',
      },
      summaryStrip: { enabled: false },
      defaultSort: [{ column: 'championships', direction: 'desc' }],
    },
  },
});

// ---------------------------------------------------------------------------
// 4. Championship — summary-dashboard (order 3)
//
// Season championship overview with a season picker in the toolbar.
// KPI cards: championship leader, leader's points, races completed.
// Charts: driver points progression (line, top 5), constructor wins (donut),
// constructor points (bar). Mini table: latest race top 10 results.
// ---------------------------------------------------------------------------

safeRegisterPage({
  id: 'f1-championship',
  name: 'Championship',
  icon: 'IconTrophy',
  template: 'summary-dashboard',
  section: 'pages',
  order: 3,
  config: {
    templateType: 'summary-dashboard',
    dataSource: {
      type: 'prisma',
      model: 'DriverStanding',
    },
    metadata: {
      // Season picker — filters all data to a single season; defaults to latest
      seasonPicker: {
        enabled: true,
        dataSource: { type: 'prisma', model: 'Season' },
        labelField: 'year',
        valueField: 'id',
        sort: [{ column: 'year', direction: 'desc' }],
      },
      kpis: [
        {
          id: 'championship-leader',
          label: 'Championship Leader',
          dataSource: { type: 'prisma', model: 'DriverStanding' },
          aggregation: 'first',
          field: 'driver.last_name',
          filters: { position: 1 },
          sort: [{ column: 'points', direction: 'desc' }],
          navigateTo: { targetPageId: 'f1-driver-profile', recordId: '{driver_id}' },
        },
        {
          id: 'leader-points',
          label: 'Leader Points',
          dataSource: { type: 'prisma', model: 'DriverStanding' },
          aggregation: 'max',
          field: 'points',
        },
        {
          id: 'races-completed',
          label: 'Races Completed',
          dataSource: { type: 'prisma', model: 'Race' },
          aggregation: 'count',
          filters: { status: 'Completed' },
        },
        {
          id: 'next-race',
          label: 'Next Race',
          dataSource: { type: 'prisma', model: 'Race' },
          aggregation: 'first',
          field: 'name',
          filters: { status: 'Scheduled' },
          sort: [{ column: 'date', direction: 'asc' }],
        },
      ],
      charts: [
        {
          id: 'driver-points-progression',
          title: 'Driver Points Progression',
          type: 'line',
          dataSource: { type: 'prisma', model: 'DriverStanding' },
          xField: 'race.round',
          yField: 'points',
          seriesField: 'driver.abbreviation',
          sort: [{ column: 'points', direction: 'desc' }],
          // Show only top 5 drivers to avoid chart overcrowding
          limit: 5,
        },
        {
          id: 'constructor-wins',
          title: 'Constructor Wins',
          type: 'donut',
          dataSource: { type: 'prisma', model: 'ConstructorStanding' },
          labelField: 'constructor.name',
          valueField: 'wins',
          sort: [{ column: 'wins', direction: 'desc' }],
          limit: 10,
        },
        {
          id: 'constructor-points',
          title: 'Constructor Points',
          type: 'bar',
          dataSource: { type: 'prisma', model: 'ConstructorStanding' },
          xField: 'constructor.name',
          yField: 'points',
          sort: [{ column: 'points', direction: 'desc' }],
          limit: 10,
        },
      ],
      miniTable: {
        id: 'latest-race-top-10',
        title: 'Latest Race — Top 10',
        dataSource: { type: 'prisma', model: 'RaceResult' },
        fields: [
          { key: 'finish_position', label: 'Pos', type: 'number', width: 50 },
          { key: 'driver.last_name', label: 'Driver', type: 'relation', width: 140 },
          { key: 'constructor.name', label: 'Constructor', type: 'relation', width: 140 },
          { key: 'points', label: 'Pts', type: 'number', width: 60 },
          { key: 'status', label: 'Status', type: 'enum', width: 110 },
        ],
        fieldDisplayTypes: {
          status: 'race-status',
          'driver.last_name': 'link',
        },
        columnNavigateTo: {
          'driver.last_name': {
            targetPageId: 'f1-driver-profile',
            recordId: '{driver_id}',
          },
        },
        sort: [{ column: 'finish_position', direction: 'asc' }],
        limit: 10,
        // Scoped to the most recently completed race
        filters: { race: { status: 'Completed' } },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 5. Driver Profile — multi-tab-detail (order 4)
//
// Full driver profile, navigated to from Races and Drivers pages.
// The cross-page navigation system passes the driver ID as recordId.
// Tabs: Overview (career stats + points chart), Results (sub-table),
// Qualifying (sub-table with Q1/Q2/Q3 lap times), Penalties, Career timeline.
// ---------------------------------------------------------------------------

safeRegisterPage({
  id: 'f1-driver-profile',
  name: 'Driver Profile',
  icon: 'IconUser',
  template: 'multi-tab-detail',
  section: 'pages',
  order: 4,
  config: {
    templateType: 'multi-tab-detail',
    dataSource: {
      type: 'prisma',
      model: 'Driver',
    },
    metadata: {
      // EntityHeader: rendered at the top of every tab
      entityHeader: {
        titleField: 'last_name',
        subtitleField: 'first_name',
        badgeField: 'status',
        metaFields: [
          { key: 'number', label: '#', type: 'number' },
          { key: 'nationality', label: 'Nationality', type: 'text', displayType: 'nationality-flag' },
          { key: 'abbreviation', label: 'Code', type: 'text' },
          { key: 'championships', label: 'Championships', type: 'number' },
          { key: 'wins', label: 'Wins', type: 'number' },
          { key: 'podiums', label: 'Podiums', type: 'number' },
          { key: 'poles', label: 'Pole Positions', type: 'number' },
        ],
      },
      tabs: [
        {
          id: 'overview',
          label: 'Overview',
          type: 'overview',
          order: 0,
          content: {
            statsGrid: [
              { key: 'championships', label: 'Championships', type: 'number' },
              { key: 'wins', label: 'Race Wins', type: 'number' },
              { key: 'podiums', label: 'Podiums', type: 'number' },
              { key: 'poles', label: 'Pole Positions', type: 'number' },
            ],
            chart: {
              id: 'driver-points-chart',
              title: 'Points Per Season',
              type: 'line',
              dataSource: { type: 'prisma', model: 'DriverStanding' },
              xField: 'race.round',
              yField: 'points',
              // {id} is replaced at runtime with the current driver's ID
              filter: 'driver_id={id}',
            },
          },
        },
        {
          id: 'results',
          label: 'Results',
          type: 'sub-table',
          order: 1,
          content: {
            dataSource: { type: 'prisma', model: 'RaceResult' },
            filter: 'driver_id={id}',
            defaultSort: [{ column: 'race.date', direction: 'desc' }],
            fields: [
              { key: 'race.season.year', label: 'Season', type: 'number', width: 80 },
              { key: 'race.round', label: 'Rd', type: 'number', width: 55 },
              { key: 'race.name', label: 'Race', type: 'relation', width: 180 },
              { key: 'grid_position', label: 'Grid', type: 'number', width: 60 },
              { key: 'finish_position', label: 'Pos', type: 'number', width: 60 },
              { key: 'position_change', label: '+/-', type: 'number', width: 60 },
              { key: 'status', label: 'Status', type: 'enum', width: 110 },
              { key: 'points', label: 'Pts', type: 'number', width: 60 },
              { key: 'fastest_lap_time_ms', label: 'Fastest Lap', type: 'number', width: 110 },
            ],
            fieldDisplayTypes: {
              position_change: 'position-change',
              status: 'race-status',
              fastest_lap_time_ms: 'lap-time',
            },
            columnNavigateTo: {
              'race.name': {
                targetPageId: 'f1-race-weekend',
                recordId: '{race_id}',
              },
            },
          },
        },
        {
          id: 'qualifying',
          label: 'Qualifying',
          type: 'sub-table',
          order: 2,
          content: {
            dataSource: { type: 'prisma', model: 'QualifyingResult' },
            filter: 'driver_id={id}',
            defaultSort: [{ column: 'race.date', direction: 'desc' }],
            fields: [
              { key: 'race.season.year', label: 'Season', type: 'number', width: 80 },
              { key: 'race.round', label: 'Rd', type: 'number', width: 55 },
              { key: 'race.name', label: 'Race', type: 'relation', width: 180 },
              { key: 'position', label: 'Pos', type: 'number', width: 60 },
              { key: 'q1_time_ms', label: 'Q1', type: 'number', width: 100 },
              { key: 'q2_time_ms', label: 'Q2', type: 'number', width: 100 },
              { key: 'q3_time_ms', label: 'Q3', type: 'number', width: 100 },
            ],
            fieldDisplayTypes: {
              q1_time_ms: 'lap-time',
              q2_time_ms: 'lap-time',
              q3_time_ms: 'lap-time',
            },
          },
        },
        {
          id: 'penalties',
          label: 'Penalties',
          type: 'sub-table',
          order: 3,
          content: {
            dataSource: { type: 'prisma', model: 'Penalty' },
            filter: 'driver_id={id}',
            defaultSort: [{ column: 'race.date', direction: 'desc' }],
            fields: [
              { key: 'race.season.year', label: 'Season', type: 'number', width: 80 },
              { key: 'race.name', label: 'Race', type: 'relation', width: 180 },
              { key: 'lap', label: 'Lap', type: 'number', width: 60 },
              { key: 'type', label: 'Type', type: 'enum', width: 140 },
              { key: 'seconds', label: 'Seconds', type: 'number', width: 80 },
              { key: 'reason', label: 'Reason', type: 'text', width: 260 },
            ],
          },
        },
        {
          id: 'career-timeline',
          label: 'Career Timeline',
          type: 'timeline',
          order: 4,
          content: {
            dataSource: { type: 'prisma', model: 'RaceEvent' },
            filter: 'driver_id={id}',
            timestampField: 'timestamp',
            labelField: 'description',
            typeField: 'type',
          },
        },
      ],
    },
  },
});

// ---------------------------------------------------------------------------
// 6. Lap Time Explorer — data-explorer (order 5)
//
// Interactive chart explorer for lap time analysis. Default: average lap time
// by circuit for the most recent season, displayed as a line chart.
// Metrics: avg/fastest lap time (lap-time formatter), avg pit duration
// (pit-duration formatter). Group by: circuit, driver, constructor, tire.
// ---------------------------------------------------------------------------

safeRegisterPage({
  id: 'f1-lap-time-explorer',
  name: 'Lap Time Explorer',
  icon: 'IconClock',
  template: 'data-explorer',
  section: 'pages',
  order: 5,
  config: {
    templateType: 'data-explorer',
    dataSource: {
      type: 'prisma',
      model: 'LapTime',
    },
    metadata: {
      // Default state when the page is first opened
      defaultChartType: 'line',
      defaultMetric: 'avg',
      defaultMetricField: 'time_ms',
      defaultGroupBy: 'race.circuit.name',
      defaultTimeResolution: 'per-race',
      // Available metric options for the metric picker control
      metricOptions: [
        {
          value: 'avg-lap',
          label: 'Avg Lap Time',
          aggregation: 'avg',
          field: 'time_ms',
          dataSource: { type: 'prisma', model: 'LapTime' },
          displayType: 'lap-time',
        },
        {
          value: 'fastest-lap',
          label: 'Fastest Lap',
          aggregation: 'min',
          field: 'time_ms',
          dataSource: { type: 'prisma', model: 'LapTime' },
          displayType: 'lap-time',
        },
        {
          value: 'avg-pit',
          label: 'Avg Pit Duration',
          aggregation: 'avg',
          field: 'duration_ms',
          dataSource: { type: 'prisma', model: 'PitStop' },
          displayType: 'pit-duration',
        },
      ],
      // Available group-by options for the group picker control
      groupByOptions: [
        { value: 'race.circuit.name', label: 'Circuit', dataSource: { type: 'prisma', model: 'LapTime' } },
        { value: 'driver.abbreviation', label: 'Driver', dataSource: { type: 'prisma', model: 'LapTime' } },
        { value: 'race.round', label: 'Race Round', dataSource: { type: 'prisma', model: 'LapTime' } },
        {
          value: 'tire_compound',
          label: 'Tire Compound',
          dataSource: { type: 'prisma', model: 'PitStop' },
        },
      ],
      // Available time resolution options
      timeResolutionOptions: [
        { value: 'per-race', label: 'Per Race' },
        { value: 'per-season', label: 'Per Season' },
      ],
      // Supported chart types for this explorer
      chartTypeOptions: ['line', 'bar', 'area'],
    },
  },
});

// ---------------------------------------------------------------------------
// 7. Race Report — form-page (order 6)
//
// Multi-step form for entering race results into the system. Steps:
//   1. Select Race    — choose from scheduled races
//   2. Results Grid   — 20 driver rows (positions, status, points, fastest lap)
//   3. Incidents      — safety car laps, red flags, penalties
//   4. Review         — read-only summary before save
// ---------------------------------------------------------------------------

safeRegisterPage({
  id: 'f1-race-report',
  name: 'Race Report',
  icon: 'IconClipboard',
  template: 'form-page',
  section: 'pages',
  order: 6,
  config: {
    templateType: 'form-page',
    dataSource: {
      type: 'prisma',
      model: 'Race',
    },
    metadata: {
      wizard: {
        steps: [
          {
            id: 'select-race',
            label: 'Select Race',
            description: 'Choose the race to report results for',
            fields: [
              {
                key: 'race_id',
                label: 'Race',
                type: 'relation',
                required: true,
                dataSource: { type: 'prisma', model: 'Race' },
                labelField: 'name',
                valueField: 'id',
                filters: { status: 'Scheduled' },
                sort: [{ column: 'date', direction: 'asc' }],
              },
            ],
          },
          {
            id: 'results-grid',
            label: 'Results Grid',
            description: 'Enter finishing positions, status, and points for all drivers',
            fields: [
              {
                key: 'results',
                label: 'Results',
                type: 'sub-form-array',
                dataSource: { type: 'prisma', model: 'RaceResult' },
                rowFields: [
                  { key: 'finish_position', label: 'Pos', type: 'number', required: true },
                  {
                    key: 'driver_id',
                    label: 'Driver',
                    type: 'relation',
                    required: true,
                    dataSource: { type: 'prisma', model: 'Driver' },
                    labelField: 'last_name',
                    valueField: 'id',
                  },
                  {
                    key: 'constructor_id',
                    label: 'Constructor',
                    type: 'relation',
                    required: true,
                    dataSource: { type: 'prisma', model: 'Constructor' },
                    labelField: 'name',
                    valueField: 'id',
                  },
                  { key: 'grid_position', label: 'Grid', type: 'number', required: true },
                  {
                    key: 'status',
                    label: 'Status',
                    type: 'enum',
                    required: true,
                    options: ['Finished', 'DNF', 'DSQ', 'DNS'],
                  },
                  { key: 'points', label: 'Points', type: 'number', required: true },
                  {
                    key: 'fastest_lap_time_ms',
                    label: 'Fastest Lap',
                    type: 'number',
                    displayType: 'lap-time',
                    required: false,
                  },
                  { key: 'laps_completed', label: 'Laps', type: 'number', required: true },
                ],
              },
            ],
          },
          {
            id: 'incidents',
            label: 'Incidents & Penalties',
            description: 'Record safety car periods, red flags, and driver penalties',
            fields: [
              {
                key: 'safety_car_laps',
                label: 'Safety Car Laps',
                type: 'number',
                required: false,
              },
              {
                key: 'red_flag_count',
                label: 'Red Flags',
                type: 'number',
                required: false,
              },
              {
                key: 'penalties',
                label: 'Penalties',
                type: 'sub-form-array',
                required: false,
                rowFields: [
                  {
                    key: 'driver_id',
                    label: 'Driver',
                    type: 'relation',
                    required: true,
                    dataSource: { type: 'prisma', model: 'Driver' },
                    labelField: 'last_name',
                    valueField: 'id',
                  },
                  {
                    key: 'type',
                    label: 'Penalty Type',
                    type: 'enum',
                    required: true,
                    options: [
                      'TimePenalty',
                      'GridPenalty',
                      'DriveThrough',
                      'StopGo',
                      'Reprimand',
                      'Disqualification',
                    ],
                  },
                  { key: 'lap', label: 'Lap', type: 'number', required: false },
                  { key: 'seconds', label: 'Seconds', type: 'number', required: false },
                  {
                    key: 'grid_places',
                    label: 'Grid Places',
                    type: 'number',
                    required: false,
                  },
                  { key: 'reason', label: 'Reason', type: 'text', required: true },
                ],
              },
            ],
          },
          {
            id: 'review',
            label: 'Review & Submit',
            description: 'Confirm race results before saving',
            fields: [],
            reviewMode: true,
          },
        ],
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 8. Race Weekend — timeline-activity (order 7)
//
// Chronological event log for a single race weekend. Navigated to from the
// Races list. The cross-page navigation system passes the race ID as recordId.
// Event types shown as a filter sidebar: Start, PitStop, Overtake, Penalty,
// SafetyCar, RedFlag, Retirement, FastestLap, Finish.
// ---------------------------------------------------------------------------

safeRegisterPage({
  id: 'f1-race-weekend',
  name: 'Race Weekend',
  icon: 'IconCalendar',
  template: 'timeline-activity',
  section: 'pages',
  order: 7,
  config: {
    templateType: 'timeline-activity',
    dataSource: {
      type: 'prisma',
      model: 'RaceEvent',
    },
    metadata: {
      timestampField: 'timestamp',
      labelField: 'description',
      typeField: 'type',
      driverField: 'driver.last_name',
      lapField: 'lap',
      // Tabler icon name for each event type shown in the timeline
      eventTypeIcons: {
        Start: 'IconFlagFilled',
        PitStop: 'IconTool',
        Overtake: 'IconArrowsExchange',
        Penalty: 'IconAlertTriangle',
        SafetyCar: 'IconCar',
        RedFlag: 'IconFlag',
        Retirement: 'IconX',
        FastestLap: 'IconClock',
        Finish: 'IconTrophyFilled',
      },
      // Sidebar filter panel for event types
      typeFilter: {
        enabled: true,
        options: [
          'Start',
          'PitStop',
          'Overtake',
          'Penalty',
          'SafetyCar',
          'RedFlag',
          'Retirement',
          'FastestLap',
          'Finish',
        ],
      },
      defaultSort: [{ column: 'timestamp', direction: 'asc' }],
      // EntityHeader at top of page: race name + circuit
      entityHeader: {
        titleField: 'race.name',
        subtitleField: 'race.circuit.name',
        dateField: 'race.date',
      },
      // Driver name in events links to Driver Profile
      columnNavigateTo: {
        'driver.last_name': {
          targetPageId: 'f1-driver-profile',
          recordId: '{driver_id}',
        },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 9. My Dashboard — dashboard (order 8)
//
// Personalised dashboard with pinned widgets. Fixed layout out of the box;
// users can rearrange via builder mode. Widgets: next race KPI, championship
// leader KPI, season wins by constructor donut chart, latest race top 10 table.
// Both KPI widgets navigate to their respective detail pages on click.
// ---------------------------------------------------------------------------

safeRegisterPage({
  id: 'f1-my-dashboard',
  name: 'My Dashboard',
  icon: 'IconLayoutDashboard',
  template: 'dashboard',
  section: 'pages',
  order: 8,
  config: {
    templateType: 'dashboard',
    metadata: {
      widgets: [
        {
          id: 'next-race',
          type: 'kpi',
          title: 'Next Race',
          position: { x: 0, y: 0, w: 3, h: 2 },
          dataSource: { type: 'prisma', model: 'Race' },
          aggregation: 'first',
          field: 'name',
          filters: { status: 'Scheduled' },
          sort: [{ column: 'date', direction: 'asc' }],
          navigateTo: { targetPageId: 'f1-race-weekend', recordId: '{id}' },
        },
        {
          id: 'championship-leader',
          type: 'kpi',
          title: 'Championship Leader',
          position: { x: 3, y: 0, w: 3, h: 2 },
          dataSource: { type: 'prisma', model: 'DriverStanding' },
          aggregation: 'first',
          field: 'driver.last_name',
          filters: { position: 1 },
          sort: [{ column: 'points', direction: 'desc' }],
          navigateTo: { targetPageId: 'f1-driver-profile', recordId: '{driver_id}' },
        },
        {
          id: 'constructor-wins-chart',
          type: 'chart',
          title: 'Season Wins by Constructor',
          position: { x: 0, y: 2, w: 6, h: 4 },
          chartType: 'donut',
          dataSource: { type: 'prisma', model: 'ConstructorStanding' },
          labelField: 'constructor.name',
          valueField: 'wins',
          sort: [{ column: 'wins', direction: 'desc' }],
          limit: 10,
        },
        {
          id: 'latest-race-top-10',
          type: 'table',
          title: 'Latest Race — Top 10',
          position: { x: 6, y: 0, w: 6, h: 6 },
          dataSource: { type: 'prisma', model: 'RaceResult' },
          fields: [
            { key: 'finish_position', label: 'Pos', type: 'number', width: 50 },
            { key: 'driver.last_name', label: 'Driver', type: 'relation', width: 140 },
            { key: 'constructor.name', label: 'Constructor', type: 'relation', width: 140 },
            { key: 'points', label: 'Pts', type: 'number', width: 60 },
            { key: 'status', label: 'Status', type: 'enum', width: 110 },
          ],
          fieldDisplayTypes: {
            status: 'race-status',
          },
          sort: [{ column: 'finish_position', direction: 'asc' }],
          limit: 10,
          filters: { race: { status: 'Completed' } },
          columnNavigateTo: {
            'driver.last_name': {
              targetPageId: 'f1-driver-profile',
              recordId: '{driver_id}',
            },
          },
        },
      ],
    },
  },
});
} // end registerF1Pages

// ---------------------------------------------------------------------------
// Module side-effect — auto-register on first import.
// Tests that need isolation should call clearPageRegistry() + registerF1Pages()
// in a beforeEach hook.
// ---------------------------------------------------------------------------
registerF1Pages();
