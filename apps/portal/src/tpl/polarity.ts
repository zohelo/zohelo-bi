// Which direction of change is favourable for an indicator, so KPI cards can colour a change green or red.
// Only indicators with a direction most readers would agree on are listed (lower unemployment, higher healthy
// life years). Everything else — prices, exchange rates, population, interest rates, counts of activity —
// stays neutral (grey): colour must never suggest a judgement the data does not support.

export type Polarity = "up" | "down";

const POLARITY: Record<string, Polarity> = {
  gdp_real_growth: "up",
  gdp_per_capita_pps: "up",
  gfcf_rate: "up",
  current_account_gdp: "up",
  unemployment_lfs: "down",
  registered_unemployment: "down",
  avg_wage: "up",
  // labour (docs/domain-labour.md §4): wage growth and unit labour costs stay neutral
  employment_rate: "up",
  activity_rate: "up",
  registered_unemployed: "down",
  long_term_unemployment: "down",
  youth_unemployment: "down",
  neet_rate: "down",
  real_wage_growth: "up",
  median_wage: "up",
  arope_rate: "down",
  child_arope: "down",
  extreme_poverty: "down",
  gini: "down",
  disposable_income_pc: "up",
  gg_deficit_gdp: "up", // the balance: a rise means a smaller deficit
  gg_debt_gdp: "down",
  healthy_life_years: "up",
  vaccination_mmr: "up",
  preschool_rate: "up",
  matura_pass_rate: "up",
  gerd_gdp: "up",
  pm25_mean: "down",
  ghg_emissions: "down",
  municipal_waste_pc: "down",
  res_share: "up",
  water_network_access: "up",
  dwellings_completed: "up",
  broadband_households: "up",
  court_case_duration: "down",
  crimes_per_1000: "down",
  life_satisfaction: "up",
  turnout_parliament: "up",
  ecommerce_share: "up",
  firm_net_margin: "up",
  birth_rate: "up",
};

export function polarityOf(kpiKey: string): Polarity | undefined {
  return POLARITY[kpiKey];
}

/** "good", "bad" or "neutral" for a change of `delta` in an indicator. */
export function judge(kpiKey: string, delta: number | null | undefined): "good" | "bad" | "neutral" {
  const p = POLARITY[kpiKey];
  if (!p || delta === null || delta === undefined || Math.abs(delta) < 1e-9) return "neutral";
  return delta > 0 === (p === "up") ? "good" : "bad";
}
