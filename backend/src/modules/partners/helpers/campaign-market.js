/** Same country / operator / campaign match the dashboard and postback list both use. */
export function campaignMatchesMarket(campaign, country, operator) {
  const countryFilter = String(country || '').trim().toUpperCase();
  const operatorFilter = String(operator || '').trim().toLowerCase();
  if (countryFilter) {
    const ok =
      String(campaign?.country || '').toUpperCase() === countryFilter ||
      String(campaign?.marketOperator?.country?.code || '').toUpperCase() === countryFilter ||
      String(campaign?.marketOperator?.country?.name || '').toUpperCase() === countryFilter;
    if (!ok) return false;
  }
  if (operatorFilter) {
    const ok =
      String(campaign?.operator || '').toLowerCase() === operatorFilter ||
      String(campaign?.marketOperator?.code || '').toLowerCase() === operatorFilter ||
      String(campaign?.marketOperator?.name || '').toLowerCase() === operatorFilter;
    if (!ok) return false;
  }
  return true;
}

export function filterCampaignsByMarket(campaigns, query = {}) {
  const country = String(query.country || '').trim();
  const operator = String(query.operator || '').trim();
  const campaignId = parseInt(query.campaignId, 10);
  let scoped = Array.isArray(campaigns) ? campaigns : [];
  if (country || operator) {
    scoped = scoped.filter((campaign) => campaignMatchesMarket(campaign, country, operator));
  }
  if (Number.isFinite(campaignId) && campaignId > 0) {
    scoped = scoped.filter((campaign) => Number(campaign.id) === campaignId);
  }
  return scoped;
}

export function parseMultiParam(value) {
  return [
    ...new Set(
      String(value || '')
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part && part.toLowerCase() !== 'all'),
    ),
  ];
}
