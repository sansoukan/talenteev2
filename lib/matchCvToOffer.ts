/**
 * Compare un CV analysé et une Offre analysée pour calculer un score de matching.
 */
export function matchCvToOffer(cv: any, offer: any) {
  if (!cv || !offer) {
    return {
      score: 0,
      details: { role: 0, must_have: 0, nice_to_have: 0, responsibilities: 0 },
      matches: { must_have: [], nice_to_have: [], responsibilities: [] },
      missing: ["CV ou Offre non analysés"],
    };
  }

  const norm = (arr: any) =>
    Array.isArray(arr)
      ? arr.map((s) => String(s).toLowerCase().trim())
      : [];

  const cvStrengths = norm(cv.strengths);
  const cvRole = cv.role_detected?.toLowerCase() || "";

  const mustHave = norm(offer.must_have);
  const niceToHave = norm(offer.nice_to_have);
  const responsibilities = norm(offer.main_responsibilities);
  const offerRole = offer.role_detected?.toLowerCase() || "";

  // --- Rôle
  let roleScore = 0;
  if (cvRole && offerRole) {
    roleScore = cvRole.includes(offerRole) || offerRole.includes(cvRole) ? 1 : 0;
  }

  // --- Must-have
  let mustHaveMatches = mustHave.filter((m) =>
    cvStrengths.some((s) => s.includes(m))
  );
  let mustHaveScore = mustHave.length
    ? mustHaveMatches.length / mustHave.length
    : 0;

  // --- Nice-to-have
  let niceMatches = niceToHave.filter((n) =>
    cvStrengths.some((s) => s.includes(n))
  );
  let niceScore = niceToHave.length
    ? niceMatches.length / niceToHave.length
    : 0;

  // --- Responsabilités
  let respMatches = responsibilities.filter((r) =>
    cvStrengths.some((s) => s.includes(r))
  );
  let respScore = responsibilities.length
    ? respMatches.length / responsibilities.length
    : 0;

  // --- Pondération
  const globalScore =
    mustHaveScore * 0.5 +
    roleScore * 0.2 +
    niceScore * 0.15 +
    respScore * 0.15;

  const missingMust = mustHave.filter((m) => !mustHaveMatches.includes(m));
  const missingNice = niceToHave.filter((n) => !niceMatches.includes(n));

  return {
    score: Math.round(globalScore * 100),
    details: {
      role: Math.round(roleScore * 100),
      must_have: Math.round(mustHaveScore * 100),
      nice_to_have: Math.round(niceScore * 100),
      responsibilities: Math.round(respScore * 100),
    },
    matches: {
      must_have: mustHaveMatches,
      nice_to_have: niceMatches,
      responsibilities: respMatches,
    },
    missing: [...missingMust, ...missingNice],
  };
}
