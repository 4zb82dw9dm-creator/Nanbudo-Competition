export function applyMaiWarning(activeWarnings, warning) {
  const warnings = [...activeWarnings, warning];
  const sameAssaultWarnings = warnings.filter((item) => item.assaultIndex === warning.assaultIndex);

  if (sameAssaultWarnings.length === 2) {
    return {
      activeWarnings: [],
      conversion: { consumed: sameAssaultWarnings, rule: "same_assault" },
    };
  }

  const distinctAssaults = new Set(warnings.map((item) => item.assaultIndex));
  if (warnings.length === 3 && distinctAssaults.size === 3) {
    return {
      activeWarnings: [],
      conversion: { consumed: warnings, rule: "distinct_assaults" },
    };
  }

  return { activeWarnings: warnings, conversion: null };
}
