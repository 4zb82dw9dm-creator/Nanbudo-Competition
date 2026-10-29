export function applyMaiWarning(activeWarnings, warning) {
  const warnings = [...activeWarnings, warning];
  const sameAssaultWarnings = warnings.filter((item) => item.assaultIndex === warning.assaultIndex);

  if (sameAssaultWarnings.length === 2) {
    return {
      activeWarnings: [],
      conversion: { consumed: sameAssaultWarnings, rule: "same_assault" },
    };
  }

  if (warnings.length >= 3) {
    return {
      activeWarnings: [],
      conversion: { consumed: warnings, rule: "three_mai" },
    };
  }

  return { activeWarnings: warnings, conversion: null };
}
