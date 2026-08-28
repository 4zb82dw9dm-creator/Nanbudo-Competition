export function currentRoute() {
  const value = window.location.hash.replace(/^#/, "") || "/";
  return value.startsWith("/") ? value : `/${value}`;
}

export function navigate(path) { window.location.hash = path; }

export function publicRegistrationSlug(route) {
  const match = route.match(/^\/inscription\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function publicRegistrationUrl(origin, basePath, slug) {
  const normalizedBasePath = `/${String(basePath || "/").replace(/^\/+|\/+$/g, "")}`;
  return `${origin}${normalizedBasePath === "/" ? "/" : `${normalizedBasePath}/`}#/inscription/${encodeURIComponent(slug)}`;
}

export function slugify(value) {
  return String(value || "competition").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
